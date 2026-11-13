#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = [
#   "pyserial>=3.5",
# ]
# ///
"""
deploy_firmware.py: Lefty Controller ファームウェア CLI デプロイツール (エージェント / 自動化向け)

シリアル経由でメンテナンスモードへ移行し、CIRCUITPY マウントへファイルを転送して
通常モードへ再起動・疎通確認までをハンズフリーで実行します。

使用例:
  uv run tools/deploy_firmware.py --json
  uv run tools/deploy_firmware.py --dry-run --json
  uv run tools/deploy_firmware.py --list-ports --json
  uv run tools/deploy_firmware.py --check --json
  uv run tools/deploy_firmware.py --with-config --backup-dir ./backup
"""

import argparse
import base64
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

try:
    import serial
    from serial.tools import list_ports
except ImportError:
    serial = None
    list_ports = None


DEFAULT_BAUDRATE = 115200
TARGET_VOLUME_NAME = "CIRCUITPY"
RP2_VOLUME_NAME = "RPI-RP2"
IGNORE_DIRS = {"__pycache__", ".git", ".vscode", ".idea"}
IGNORE_SUFFIXES = {".pyc", ".pyo"}
IGNORE_FILES = {".DS_Store", "Thumbs.db"}


class DeployError(Exception):
    """デプロイ処理中の構造化エラー"""
    def __init__(self, stage, message):
        super().__init__(message)
        self.stage = stage
        self.message = message


def _require_pyserial():
    if serial is None or list_ports is None:
        raise DeployError(
            "dependency",
            "pyserial が見つかりません。`uv run tools/deploy_firmware.py` で実行するか、`pip install pyserial` を実行してください。"
        )


def _find_powershell():
    """WSL 環境から呼び出せる powershell.exe のパスを返す"""
    ps_candidates = [
        shutil.which("powershell.exe"),
        "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe",
    ]
    return next((p for p in ps_candidates if p and Path(p).is_file()), None)


def _run_powershell(script, timeout=8.0):
    """UTF-16LE Base64 (-EncodedCommand) で PowerShell スクリプトを安全に実行する"""
    ps_exe = _find_powershell()
    if not ps_exe:
        raise DeployError("wsl_powershell", "powershell.exe が見つかりません。")

    wrapped = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\n" + script
    encoded = base64.b64encode(wrapped.encode("utf-16le")).decode("ascii")
    try:
        proc = subprocess.run(
            [ps_exe, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        return proc
    except subprocess.TimeoutExpired:
        raise DeployError("wsl_powershell_timeout", f"powershell.exe の実行がタイムアウトしました ({timeout}s)")
    except Exception as e:
        raise DeployError("wsl_powershell", f"powershell.exe 実行エラー: {e}")


def _is_windows_com_port(port):
    return bool(port and re.match(r"^COM\d+$", str(port).strip(), re.IGNORECASE))


def _parse_vid_pid_from_pnp(pnp_id):
    if not pnp_id:
        return None, None
    vid_m = re.search(r"VID_([0-9A-Fa-f]{4})", pnp_id)
    pid_m = re.search(r"PID_([0-9A-Fa-f]{4})", pnp_id)
    vid = int(vid_m.group(1), 16) if vid_m else None
    pid = int(pid_m.group(1), 16) if pid_m else None
    return vid, pid


def list_windows_serial_ports():
    """WSL 環境から powershell.exe 経由で Windows 側の COM ポート一覧を取得する"""
    ps_script = r"""
$items = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '\(COM\d+\)' } |
    ForEach-Object {
        $m = [regex]::Match($_.Name, '\((COM\d+)\)')
        [PSCustomObject]@{
            device = $m.Groups[1].Value
            description = [string]$_.Description
            manufacturer = [string]$_.Manufacturer
            product = [string]$_.Name
            pnp_id = [string]$_.PNPDeviceID
        }
    }
@($items) | ConvertTo-Json -Compress
"""
    proc = _run_powershell(ps_script, timeout=8.0)
    raw = (proc.stdout or "").strip()
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except ValueError:
        return []
    if isinstance(parsed, dict):
        parsed = [parsed]

    ports = []
    for item in parsed:
        if not isinstance(item, dict) or not item.get("device"):
            continue
        vid, pid = _parse_vid_pid_from_pnp(item.get("pnp_id", ""))
        ports.append({
            "device": item["device"].upper(),
            "description": item.get("description") or "",
            "manufacturer": item.get("manufacturer") or "",
            "product": item.get("product") or "",
            "interface": "",
            "vid": vid,
            "pid": pid,
            "serial_number": "",
            "backend": "wsl_powershell",
        })
    return ports


def list_serial_ports():
    """接続中のシリアルポート情報を辞書リストで返す（WSL 時は Windows 側 COM ポートも統合）"""
    ports = []
    seen = set()

    if serial is not None and list_ports is not None:
        for p in list_ports.comports():
            ports.append({
                "device": p.device,
                "description": p.description or "",
                "manufacturer": getattr(p, "manufacturer", None) or "",
                "product": getattr(p, "product", None) or "",
                "interface": getattr(p, "interface", None) or "",
                "vid": p.vid,
                "pid": p.pid,
                "serial_number": getattr(p, "serial_number", None) or "",
                "backend": "pyserial",
            })
            seen.add(p.device)
    elif not (_is_wsl() and _find_powershell()):
        _require_pyserial()

    if _is_wsl() and _find_powershell():
        try:
            for wp in list_windows_serial_ports():
                if wp["device"] not in seen:
                    ports.append(wp)
                    seen.add(wp["device"])
        except DeployError:
            pass
    return ports


def _port_score(port_info):
    """Lefty Controller らしさのスコアを計算"""
    text = " ".join([
        port_info.get("product", ""),
        port_info.get("manufacturer", ""),
        port_info.get("description", ""),
        port_info.get("interface", ""),
    ]).lower()

    score = 0
    if "lefty controller" in text:
        score += 100
    if "config port" in text:
        score += 50
    if "niratama" in text:
        score += 40
    if "circuitpython" in text or "rp2040" in text or "pico" in text:
        score += 10
    # Raspberry Pi / CircuitPython VID (0x239A: Adafruit, 0x2E8A: Raspberry Pi)
    if port_info.get("vid") in (0x239A, 0x2E8A):
        score += 5
    return score


def detect_port(explicit_port=None):
    """対象デバイスのシリアルポートを決定する"""
    if explicit_port:
        return explicit_port

    ports = list_serial_ports()
    if not ports:
        raise DeployError("port_detect", "利用可能なシリアルポートが見つかりません。")

    scored = sorted(ports, key=_port_score, reverse=True)
    best = scored[0]
    if _port_score(best) <= 0:
        devices = ", ".join(p["device"] for p in ports)
        raise DeployError(
            "port_detect",
            f"Lefty Controller のポートを自動特定できませんでした。--port で指定してください (候補: {devices})"
        )
    return best["device"]


def _is_wsl():
    """WSL 環境で動作しているかを判定する"""
    if os.environ.get("WSL_DISTRO_NAME") or os.environ.get("WSL_INTEROP"):
        return True
    try:
        ver = Path("/proc/version").read_text(encoding="utf-8", errors="ignore").lower()
        return "microsoft" in ver or "wsl" in ver
    except Exception:
        return False


def _looks_like_volume_dir(path, volume_name=TARGET_VOLUME_NAME):
    """ディレクトリが対象ボリューム (CIRCUITPY / RPI-RP2) らしいか判定する"""
    if volume_name.upper() == RP2_VOLUME_NAME:
        return (path / "INFO_UF2.TXT").is_file()
    boot_out = path / "boot_out.txt"
    if boot_out.is_file():
        try:
            text = boot_out.read_text(encoding="utf-8", errors="ignore")
            if "circuitpython" in text.lower():
                return True
        except Exception:
            return True
    if (path / "code.py").is_file() and (path / "boot.py").is_file():
        return True
    return False


def _looks_like_circuitpy_dir(path):
    return _looks_like_volume_dir(path, TARGET_VOLUME_NAME)


def _get_wsl_volume_drive_letter(volume_name=TARGET_VOLUME_NAME):
    """powershell.exe 経由で Windows 側の指定ボリュームのドライブレター (例: 'E') を取得する"""
    if not _find_powershell():
        return None
    try:
        proc = _run_powershell(
            f"(Get-Volume -FileSystemLabel '{volume_name}' -ErrorAction SilentlyContinue | "
            "Select-Object -First 1 -ExpandProperty DriveLetter)",
            timeout=4.0,
        )
        letter = (proc.stdout or "").strip()
        if len(letter) == 1 and letter.isalpha():
            return letter.upper()
    except Exception:
        pass
    return None


def _get_wsl_circuitpy_drive_letter():
    return _get_wsl_volume_drive_letter(TARGET_VOLUME_NAME)


def _find_wsl_volume_mount(volume_name=TARGET_VOLUME_NAME):
    """WSL 環境で /mnt/<drive> 形式の対象ボリュームマウント先を検出する"""
    letter = _get_wsl_volume_drive_letter(volume_name)
    if letter:
        mnt = Path(f"/mnt/{letter.lower()}")
        if mnt.is_dir():
            try:
                if any(mnt.iterdir()):
                    return mnt
            except Exception:
                pass
        # WSL 起動後に接続されたドライブで /mnt/<letter> が未マウントの場合、Windows ドライブパス ("E:\\") を返す
        return f"{letter}:\\"

    # フォールバック: /mnt/<single_letter> を走査してマーカーファイルで判定
    mnt_root = Path("/mnt")
    if mnt_root.is_dir():
        for entry in sorted(mnt_root.iterdir()):
            if len(entry.name) == 1 and entry.name.isalpha() and entry.is_dir():
                if _looks_like_volume_dir(entry, volume_name):
                    return entry
    return None


def _find_wsl_circuitpy_mount():
    return _find_wsl_volume_mount(TARGET_VOLUME_NAME)


def find_volume_mount(volume_name=TARGET_VOLUME_NAME, explicit_mount=None):
    """指定ボリューム (CIRCUITPY / RPI-RP2) のマウントポイントを検出する"""
    if explicit_mount:
        p = Path(explicit_mount)
        return p if p.is_dir() else None

    system = platform.system()
    candidates = []

    if system == "Linux":
        user = os.environ.get("USER") or os.environ.get("LOGNAME") or ""
        if user:
            candidates.append(Path(f"/media/{user}/{volume_name}"))
            candidates.append(Path(f"/run/media/{user}/{volume_name}"))
        candidates.append(Path(f"/mnt/{volume_name}"))
        for base in (Path("/media"), Path("/run/media")):
            if base.is_dir():
                for sub in base.iterdir():
                    if sub.is_dir():
                        c = sub / volume_name
                        if c not in candidates:
                            candidates.append(c)

        for c in candidates:
            if c.is_dir():
                return c

        if _is_wsl() or Path("/mnt").is_dir():
            wsl_mnt = _find_wsl_volume_mount(volume_name)
            if wsl_mnt is not None:
                return wsl_mnt
        return None
    elif system == "Darwin":
        candidates.append(Path(f"/Volumes/{volume_name}"))
    elif system == "Windows":
        import string
        for letter in string.ascii_uppercase:
            drive = Path(f"{letter}:\\")
            if drive.exists():
                try:
                    import ctypes
                    buf = ctypes.create_unicode_buffer(1024)
                    res = ctypes.windll.kernel32.GetVolumeInformationW(
                        f"{letter}:\\", buf, 1024, None, None, None, None, 0
                    )
                    if res and buf.value.upper() == volume_name.upper():
                        return drive
                except Exception:
                    marker = "INFO_UF2.TXT" if volume_name.upper() == RP2_VOLUME_NAME else "boot_out.txt"
                    if (drive / marker).exists():
                        return drive

    for c in candidates:
        if c.is_dir():
            return c
    return None


def find_circuitpy_mount(explicit_mount=None):
    """CIRCUITPY マウントポイントを検出する（見つからなければ None）"""
    return find_volume_mount(TARGET_VOLUME_NAME, explicit_mount=explicit_mount)


def _send_windows_serial_command(port, cmd_obj, timeout=3.0, expect_cmd=None, wait_response=True):
    """WSL 環境から powershell.exe 経由で Windows 側 COM ポートへ JSON コマンドを送信する"""
    payload_str = json.dumps(cmd_obj)
    target_cmd = expect_cmd or cmd_obj.get("cmd")
    timeout_ms = max(500, int(timeout * 1000))
    payload_b64 = base64.b64encode(payload_str.encode("utf-8")).decode("ascii")
    port_clean = str(port).strip().upper()

    ps_script = f"""
$ErrorActionPreference = 'Stop'
$portName = '{port_clean}'
$payload = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('{payload_b64}'))
$sp = New-Object System.IO.Ports.SerialPort $portName, {DEFAULT_BAUDRATE}, 'None', 8, 'One'
$sp.DtrEnable = $true
$sp.RtsEnable = $true
$sp.ReadTimeout = 200
$sp.WriteTimeout = 2000
try {{
    $sp.Open()
    $sp.DiscardInBuffer()
    $sp.WriteLine($payload)
    if ({'$true' if not wait_response else '$false'}) {{
        Write-Output ('{{"status":"ok","cmd":"' + '{target_cmd or ""}' + '"}}')
        exit 0
    }}
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.ElapsedMilliseconds -lt {timeout_ms}) {{
        try {{
            $line = $sp.ReadLine().Trim()
        }} catch [System.TimeoutException] {{
            continue
        }}
        if (-not $line.StartsWith('{{')) {{ continue }}
        try {{
            $obj = $line | ConvertFrom-Json
        }} catch {{
            continue
        }}
        if ($obj.type -eq 'telemetry') {{ continue }}
        if (($null -ne $obj.adc) -and ($null -ne $obj.btns) -and ($null -eq $obj.status)) {{ continue }}
        if ('{target_cmd or ""}' -and ($obj.cmd -eq '{target_cmd or ""}')) {{
            Write-Output $line
            exit 0
        }}
        if ($null -ne $obj.status) {{
            Write-Output $line
            exit 0
        }}
    }}
    exit 2
}} finally {{
    if ($sp -and $sp.IsOpen) {{
        $sp.Close()
    }}
}}
"""
    proc = _run_powershell(ps_script, timeout=timeout + 5.0)
    if proc.returncode == 2:
        raise DeployError("serial_timeout", f"コマンド '{target_cmd}' の応答がタイムアウトしました ({port_clean})")
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()
        raise DeployError("serial", f"Windows COM 通信エラー ({port_clean}): {err}")

    for line in (proc.stdout or "").splitlines():
        line = line.strip()
        if line.startswith("{"):
            try:
                return json.loads(line)
            except ValueError:
                continue
    raise DeployError("serial_timeout", f"コマンド '{target_cmd}' の有効な JSON 応答を取得できませんでした ({port_clean})")


def send_serial_command(port, cmd_obj, timeout=3.0, expect_cmd=None, wait_response=True):
    """
    シリアル経由で JSON コマンドを送信し、応答 JSON を返す。
    テレメトリ出力 ({"type": "telemetry", ...}) が混在してもスキップして対象応答を抽出する。
    """
    if platform.system() != "Windows" and _is_windows_com_port(port):
        return _send_windows_serial_command(port, cmd_obj, timeout=timeout, expect_cmd=expect_cmd, wait_response=wait_response)

    _require_pyserial()
    payload = (json.dumps(cmd_obj) + "\n").encode("utf-8")
    target_cmd = expect_cmd or cmd_obj.get("cmd")

    try:
        with serial.Serial(port, DEFAULT_BAUDRATE, timeout=0.2, write_timeout=2.0) as ser:
            ser.reset_input_buffer()
            ser.write(payload)
            ser.flush()

            if not wait_response:
                return {"status": "ok", "cmd": target_cmd}

            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                raw_line = ser.readline()
                if not raw_line:
                    continue
                line = raw_line.decode("utf-8", errors="ignore").strip()
                if not line.startswith("{"):
                    continue
                try:
                    data = json.loads(line)
                except ValueError:
                    continue

                if not isinstance(data, dict):
                    continue
                # モニタリング中のテレメトリ行は読み飛ばす
                if data.get("type") == "telemetry" or ("adc" in data and "btns" in data and "status" not in data):
                    continue
                if target_cmd and data.get("cmd") == target_cmd:
                    return data
                if "status" in data:
                    return data
    except DeployError:
        raise
    except Exception as e:
        raise DeployError("serial", f"シリアル通信エラー ({port}): {e}")

    raise DeployError("serial_timeout", f"コマンド '{target_cmd}' の応答がタイムアウトしました ({port})")


def collect_firmware_files(firmware_dir, include_config=False):
    """転送対象ファイルの相対パス一覧を返す"""
    fw_path = Path(firmware_dir)
    if not fw_path.is_dir():
        raise DeployError("firmware_dir", f"ファームウェアディレクトリが見つかりません: {fw_path}")

    files = []
    for root, dirs, filenames in os.walk(fw_path):
        dirs[:] = sorted(d for d in dirs if d not in IGNORE_DIRS)
        for name in sorted(filenames):
            if name in IGNORE_FILES:
                continue
            if Path(name).suffix in IGNORE_SUFFIXES:
                continue
            if not include_config and name == "config.json":
                continue
            full = Path(root) / name
            files.append(full.relative_to(fw_path))
    return files


def wait_for_mount(explicit_mount=None, timeout=20.0):
    """CIRCUITPY マウントが出現するまで待機"""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        mnt = find_circuitpy_mount(explicit_mount)
        if mnt is not None:
            # マウント直後は書き込み可能になるまで一瞬待つ
            time.sleep(0.3)
            return mnt
        time.sleep(0.3)
    raise DeployError(
        "mount_timeout",
        f"{TARGET_VOLUME_NAME} ドライブのマウントがタイムアウトしました ({timeout}s)。--mount で明示指定するか OS の自動マウントを確認してください。"
    )


def wait_for_serial_port(explicit_port=None, timeout=20.0):
    """再起動後にシリアルポートが再出現して ping に応答するまで待機"""
    deadline = time.monotonic() + timeout
    last_err = None
    while time.monotonic() < deadline:
        try:
            port = detect_port(explicit_port)
            res = send_serial_command(port, {"cmd": "ping"}, timeout=1.5, expect_cmd="ping")
            if res.get("status") == "ok":
                return port
        except Exception as e:
            last_err = e
        time.sleep(0.4)
    raise DeployError(
        "reconnect_timeout",
        f"再起動後のデバイス再接続がタイムアウトしました ({timeout}s): {last_err}"
    )


def _is_windows_drive_target(mount_target):
    return isinstance(mount_target, str) and bool(re.match(r"^[A-Za-z]:\\?$", mount_target))


def _wsl_to_windows_path(posix_path):
    """WSL パスを Windows パス (\\wsl.localhost\\... または D:\\...) に変換"""
    proc = subprocess.run(["wslpath", "-w", str(posix_path)], capture_output=True, text=True, check=True, timeout=5)
    return proc.stdout.strip()


def backup_target_files(mount_path, rel_files, backup_dir):
    """更新対象ファイルおよび config.json をバックアップ保存する"""
    bdir = Path(backup_dir)
    bdir.mkdir(parents=True, exist_ok=True)
    backed_up = []
    targets = list(rel_files)
    cfg_rel = Path("config.json")
    if cfg_rel not in targets:
        targets.append(cfg_rel)

    if _is_windows_drive_target(mount_path):
        win_drive = mount_path.rstrip("\\")
        win_bdir = _wsl_to_windows_path(bdir.resolve())
        items = [{"src": f"{win_drive}\\{rel.as_posix().replace('/', '\\')}", "dst": f"{win_bdir}\\{rel.as_posix().replace('/', '\\')}", "rel": rel.as_posix()} for rel in targets]
        items_b64 = base64.b64encode(json.dumps(items).encode("utf-8")).decode("ascii")
        ps_script = f"""
$items = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('{items_b64}')) | ConvertFrom-Json
$done = @()
foreach ($it in $items) {{
    if (Test-Path -LiteralPath $it.src -PathType Leaf) {{
        $parent = Split-Path -Parent $it.dst
        if (-not (Test-Path -LiteralPath $parent)) {{ New-Item -ItemType Directory -Path $parent -Force | Out-Null }}
        Copy-Item -LiteralPath $it.src -Destination $it.dst -Force
        $done += $it.rel
    }}
}}
@($done) | ConvertTo-Json -Compress
"""
        proc = _run_powershell(ps_script, timeout=15.0)
        raw = (proc.stdout or "").strip()
        if raw:
            parsed = json.loads(raw)
            return [parsed] if isinstance(parsed, str) else list(parsed)
        return []

    for rel in targets:
        src = mount_path / rel
        if src.is_file():
            dst = bdir / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            backed_up.append(rel.as_posix())
    return backed_up


def copy_firmware_files(mount_path, fw_dir, rel_files):
    """ファームウェアファイルをターゲットドライブへコピーする"""
    if _is_windows_drive_target(mount_path):
        win_drive = mount_path.rstrip("\\")
        win_fw = _wsl_to_windows_path(fw_dir)
        items = [
            {
                "src": f"{win_fw}\\{rel.as_posix().replace('/', '\\')}",
                "dst": f"{win_drive}\\{rel.as_posix().replace('/', '\\')}",
                "rel": rel.as_posix(),
            }
            for rel in rel_files
        ]
        items_b64 = base64.b64encode(json.dumps(items).encode("utf-8")).decode("ascii")
        ps_script = f"""
$ErrorActionPreference = 'Stop'
$items = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('{items_b64}')) | ConvertFrom-Json
foreach ($it in $items) {{
    $parent = Split-Path -Parent $it.dst
    if (-not (Test-Path -LiteralPath $parent)) {{ New-Item -ItemType Directory -Path $parent -Force | Out-Null }}
    Copy-Item -LiteralPath $it.src -Destination $it.dst -Force
}}
"""
        proc = _run_powershell(ps_script, timeout=20.0)
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "").strip()
            raise DeployError("copy", f"Windows ドライブへのファイルコピーに失敗しました: {err}")
        return [rel.as_posix() for rel in rel_files]

    copied = []
    for rel in rel_files:
        src = fw_dir / rel
        dst = mount_path / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        copied.append(rel.as_posix())
    return copied


def sync_filesystem(mount_path):
    """OS バッファをフラッシュしてフラッシュメモリ破損を防止"""
    if _is_windows_drive_target(mount_path):
        return
    if hasattr(os, "sync"):
        os.sync()
    if platform.system() == "Linux":
        try:
            subprocess.run(["sync", "-f", str(mount_path)], check=False, timeout=5)
        except Exception:
            pass


def target_file_exists(mount_path, rel_path):
    """ターゲットマウント上に指定ファイルが存在するか確認する"""
    rel = Path(rel_path)
    if _is_windows_drive_target(mount_path):
        win_drive = mount_path.rstrip("\\")
        win_target = f"{win_drive}\\{rel.as_posix().replace('/', '\\')}"
        proc = _run_powershell(f"if (Test-Path -LiteralPath '{win_target}' -PathType Leaf) {{ '1' }} else {{ '0' }}", timeout=5.0)
        return (proc.stdout or "").strip() == "1"
    return (Path(mount_path) / rel).is_file()


def send_repl_hard_reset(port):
    """
    初回書き込み時（serial_handler 未導入の素の CircuitPython）向けに
    シリアル REPL へ Ctrl-C + microcontroller.reset() を送信してハードリセットする。
    """
    reset_seq = "\x03\x03\r\nimport microcontroller; microcontroller.reset()\r\n"
    if platform.system() != "Windows" and _is_windows_com_port(port):
        port_clean = str(port).strip().upper()
        seq_b64 = base64.b64encode(reset_seq.encode("utf-8")).decode("ascii")
        ps_script = f"""
$ErrorActionPreference = 'Stop'
$sp = New-Object System.IO.Ports.SerialPort '{port_clean}', {DEFAULT_BAUDRATE}, 'None', 8, 'One'
$sp.DtrEnable = $true
$sp.RtsEnable = $true
$sp.WriteTimeout = 2000
try {{
    $sp.Open()
    $text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('{seq_b64}'))
    $sp.Write($text)
    Start-Sleep -Milliseconds 150
}} finally {{
    if ($sp -and $sp.IsOpen) {{ $sp.Close() }}
}}
"""
        proc = _run_powershell(ps_script, timeout=8.0)
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "").strip()
            raise DeployError("repl_reset", f"REPL リセット送信エラー ({port_clean}): {err}")
        return

    _require_pyserial()
    try:
        with serial.Serial(port, DEFAULT_BAUDRATE, timeout=0.5, write_timeout=2.0) as ser:
            ser.write(reset_seq.encode("utf-8"))
            ser.flush()
            time.sleep(0.15)
    except Exception as e:
        raise DeployError("repl_reset", f"REPL リセット送信エラー ({port}): {e}")


def copy_uf2_to_rp2(rp2_mount, uf2_path):
    """RPI-RP2 ブートローダードライブへ CircuitPython .uf2 をコピーする"""
    uf2_file = Path(uf2_path).resolve()
    if not uf2_file.is_file():
        raise DeployError("uf2", f"UF2 ファイルが見つかりません: {uf2_file}")

    if _is_windows_drive_target(rp2_mount):
        win_drive = rp2_mount.rstrip("\\")
        win_src = _wsl_to_windows_path(uf2_file)
        win_dst = f"{win_drive}\\{uf2_file.name}"
        ps_script = f"Copy-Item -LiteralPath '{win_src}' -Destination '{win_dst}' -Force"
        proc = _run_powershell(ps_script, timeout=30.0)
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "").strip()
            raise DeployError("uf2", f"UF2 コピーに失敗しました: {err}")
        return

    dst = Path(rp2_mount) / uf2_file.name
    shutil.copy2(uf2_file, dst)
    sync_filesystem(rp2_mount)


def deploy_firmware(args):
    """メインのデプロイフローを実行し、結果辞書を返す"""
    start_time = time.monotonic()
    fw_dir = Path(args.firmware_dir).resolve()
    uf2_written = False

    # --uf2 指定時 (工場出荷 RPI-RP2 -> CircuitPython 導入)
    if getattr(args, "uf2", None) and not args.dry_run and not args.check:
        uf2_path = Path(args.uf2).resolve()
        if not uf2_path.is_file():
            raise DeployError("uf2", f"UF2 ファイルが見つかりません: {uf2_path}")
        rp2_mount = find_volume_mount(RP2_VOLUME_NAME)
        if rp2_mount is not None:
            copy_uf2_to_rp2(rp2_mount, uf2_path)
            uf2_written = True
            wait_for_mount(args.mount, timeout=max(args.timeout, 30.0))

    # 1. 現在接続中のポート・マウントを検出し、バージョン/初回状態を確認
    mount_path = find_circuitpy_mount(args.mount)
    is_initial = bool(getattr(args, "init", False))
    if mount_path is not None and not target_file_exists(mount_path, "serial_handler.py"):
        is_initial = True

    include_config = bool(args.with_config)
    if is_initial and not include_config:
        # 初回セットアップ時、デバイスに config.json がまだ無ければ配置する
        if mount_path is None or not target_file_exists(mount_path, "config.json"):
            include_config = True

    rel_files = collect_firmware_files(fw_dir, include_config=include_config)
    if not rel_files:
        raise DeployError("firmware_dir", f"転送対象ファイルがありません: {fw_dir}")

    port = None
    before_version = None

    try:
        port = detect_port(args.port)
        if not is_initial:
            ver_res = send_serial_command(port, {"cmd": "version"}, timeout=3.0, expect_cmd="version")
            before_version = ver_res.get("version")
    except DeployError:
        if mount_path is None and not is_initial:
            raise

    # --check モード: 状態取得のみで終了
    if args.check:
        storage_res = send_serial_command(port, {"cmd": "storage_status"}, timeout=3.0, expect_cmd="storage_status")
        return {
            "status": "ok",
            "mode": "check",
            "port": port,
            "mount": str(mount_path) if mount_path else None,
            "version": before_version,
            "storage": storage_res.get("storage"),
            "nvm": storage_res.get("nvm"),
        }

    # --dry-run モード
    if args.dry_run:
        return {
            "status": "ok",
            "mode": "dry_run",
            "port": port,
            "mount": str(mount_path) if mount_path else None,
            "initial_install": is_initial,
            "before_version": before_version,
            "firmware_dir": str(fw_dir),
            "protect_config": not include_config,
            "files": [p.as_posix() for p in rel_files],
        }

    # 2. メンテナンスモードへ移行 (まだマウントされていない場合)
    entered_maintenance = False
    if mount_path is None:
        send_serial_command(port, {"cmd": "enter_maintenance"}, timeout=2.0, expect_cmd="enter_maintenance")
        entered_maintenance = True
        mount_path = wait_for_mount(args.mount, timeout=args.timeout)

    # 初回判定の再確認 (マウント後に config.json / serial_handler.py 有無を確認)
    if not target_file_exists(mount_path, "serial_handler.py"):
        is_initial = True
    if is_initial and not args.with_config and not target_file_exists(mount_path, "config.json"):
        rel_files = collect_firmware_files(fw_dir, include_config=True)
        include_config = True

    # 3. バックアップ (指定時)
    backed_up = []
    if args.backup_dir:
        backed_up = backup_target_files(mount_path, rel_files, args.backup_dir)

    # 4. ファイルコピー
    copied = copy_firmware_files(mount_path, fw_dir, rel_files)

    sync_filesystem(mount_path)
    time.sleep(0.5)

    # 5. 通常モードへ再起動 & 疎通確認
    after_version = None
    final_port = None
    if not args.no_reboot:
        if is_initial:
            # 素の CircuitPython からの初回導入時は REPL 経由でハードリセットし boot.py を反映させる
            reset_port = port or detect_port(args.port)
            send_repl_hard_reset(reset_port)
        else:
            maint_port = wait_for_serial_port(args.port, timeout=args.timeout)
            send_serial_command(maint_port, {"cmd": "reboot"}, timeout=2.0, expect_cmd="reboot")
        # デバイスがリセットを開始するまで少し待ってから再出現を待つ
        time.sleep(1.5)
        final_port = wait_for_serial_port(args.port, timeout=args.timeout)
        ver_res = send_serial_command(final_port, {"cmd": "version"}, timeout=3.0, expect_cmd="version")
        after_version = ver_res.get("version")

    elapsed = round(time.monotonic() - start_time, 2)
    return {
        "status": "ok",
        "mode": "deploy",
        "port": final_port or port,
        "mount": str(mount_path),
        "initial_install": is_initial,
        "uf2_written": uf2_written,
        "entered_maintenance": entered_maintenance,
        "before_version": before_version,
        "after_version": after_version,
        "protect_config": not include_config,
        "copied_files": copied,
        "backed_up_files": backed_up,
        "rebooted": not args.no_reboot,
        "elapsed_sec": elapsed,
    }


def build_parser():
    default_fw_dir = Path(__file__).resolve().parent.parent / "firmware"
    parser = argparse.ArgumentParser(
        description="Lefty Controller ファームウェア CLI デプロイツール (エージェント / 自動化向け)"
    )
    parser.add_argument("--port", help="シリアルポートを明示指定 (例: /dev/ttyACM0, COM3)")
    parser.add_argument("--mount", help=f"{TARGET_VOLUME_NAME} マウントパスを明示指定")
    parser.add_argument("--firmware-dir", default=str(default_fw_dir), help="転送元ファームウェアディレクトリ")
    parser.add_argument("--with-config", action="store_true", help="config.json も上書きする (デフォルトは保護)")
    parser.add_argument("--init", action="store_true", help="初回書き込みモード (config.json 未配置なら同梱し、REPL ハードリセットで boot.py を反映)")
    parser.add_argument("--uf2", help="RPI-RP2 モード時に CircuitPython .uf2 を先に書き込んでからデプロイする")
    parser.add_argument("--backup-dir", help="更新前にデバイス上のファイルをバックアップするディレクトリ")
    parser.add_argument("--timeout", type=float, default=20.0, help="マウント/再接続待機タイムアウト秒数 (既定: 20)")
    parser.add_argument("--dry-run", action="store_true", help="実際には書き換えず対象ファイルと検出状態のみ確認")
    parser.add_argument("--no-reboot", action="store_true", help="コピー後に通常モードへ再起動しない")
    parser.add_argument("--check", action="store_true", help="デバイスのバージョンとストレージ状態のみ確認")
    parser.add_argument("--list-ports", action="store_true", help="利用可能なシリアルポート一覧を表示")
    parser.add_argument("--json", action="store_true", help="結果を JSON 形式で出力 (エージェント向け)")
    return parser


def _print_result(data, as_json):
    if as_json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return

    if data.get("status") == "error":
        print(f"[ERROR:{data.get('stage')}] {data.get('message')}", file=sys.stderr)
        return

    mode = data.get("mode")
    if mode == "list_ports":
        for p in data.get("ports", []):
            print(f"{p['device']}: {p['product'] or p['description']} ({p['manufacturer']})")
        return
    if mode == "check":
        print(f"Port: {data.get('port')} / Version: {data.get('version')} / Mount: {data.get('mount')}")
        return
    if mode == "dry_run":
        print(f"[DRY-RUN] Port: {data.get('port')}, Version: {data.get('before_version')}")
        print(f"Protect config.json: {data.get('protect_config')}")
        print("Files:", ", ".join(data.get("files", [])))
        return

    print(
        f"[OK] デプロイ完了 ({data.get('elapsed_sec')}s) | "
        f"Version: {data.get('before_version')} -> {data.get('after_version')} | "
        f"Files: {len(data.get('copied_files', []))} 件 | "
        f"config.json 保護: {data.get('protect_config')}"
    )


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        if args.list_ports:
            result = {
                "status": "ok",
                "mode": "list_ports",
                "ports": list_serial_ports(),
            }
        else:
            result = deploy_firmware(args)
        _print_result(result, args.json)
        return 0
    except DeployError as e:
        _print_result({"status": "error", "stage": e.stage, "message": e.message}, args.json)
        return 1
    except KeyboardInterrupt:
        _print_result({"status": "error", "stage": "interrupted", "message": "中断されました"}, args.json)
        return 130


if __name__ == "__main__":
    sys.exit(main())
