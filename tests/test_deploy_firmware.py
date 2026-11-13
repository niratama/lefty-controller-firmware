import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "tools")))

import deploy_firmware


class TestDeployFirmware(unittest.TestCase):
    def test_collect_firmware_files_protects_config_by_default(self):
        with tempfile.TemporaryDirectory() as tmp:
            fw = Path(tmp)
            (fw / "code.py").write_text("print('hi')", encoding="utf-8")
            (fw / "config.json").write_text("{}", encoding="utf-8")
            (fw / "__pycache__").mkdir()
            (fw / "__pycache__" / "code.cpython-312.pyc").write_bytes(b"pyc")
            (fw / "extra.pyc").write_bytes(b"pyc")

            # デフォルト: config.json と __pycache__ / .pyc が除外される
            files_default = [p.as_posix() for p in deploy_firmware.collect_firmware_files(fw, include_config=False)]
            self.assertEqual(files_default, ["code.py"])

            # --with-config 指定時: config.json が含まれる
            files_with_cfg = [p.as_posix() for p in deploy_firmware.collect_firmware_files(fw, include_config=True)]
            self.assertEqual(files_with_cfg, ["code.py", "config.json"])

    def test_detect_port_prioritizes_lefty_controller(self):
        fake_ports = [
            {
                "device": "/dev/ttyUSB0",
                "description": "USB-Serial Controller",
                "manufacturer": "Prolific",
                "product": "",
                "interface": "",
                "vid": 0x067B,
                "pid": 0x2303,
                "serial_number": "",
            },
            {
                "device": "/dev/ttyACM0",
                "description": "Config Port",
                "manufacturer": "Niratama",
                "product": "Lefty Controller",
                "interface": "Config Port",
                "vid": 0x239A,
                "pid": 0x80F4,
                "serial_number": "1234",
            },
        ]
        with patch.object(deploy_firmware, "list_serial_ports", return_value=fake_ports):
            self.assertEqual(deploy_firmware.detect_port(), "/dev/ttyACM0")

    def test_send_serial_command_skips_telemetry_lines(self):
        lines = [
            b'{"type": "telemetry", "adc": [32768, 32768], "btns": []}\n',
            b'[INFO] debug log\n',
            b'{"status": "ok", "cmd": "version", "version": "1.10.0"}\n',
        ]
        mock_ser = MagicMock()
        mock_ser.__enter__.return_value = mock_ser
        mock_ser.readline.side_effect = lines

        with patch.object(deploy_firmware.serial, "Serial", return_value=mock_ser):
            res = deploy_firmware.send_serial_command("/dev/ttyACM0", {"cmd": "version"}, timeout=1.0)
            self.assertEqual(res["version"], "1.10.0")
            self.assertEqual(res["cmd"], "version")

    def test_dry_run_json_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            fw = Path(tmp) / "firmware"
            fw.mkdir()
            (fw / "code.py").write_text("v1", encoding="utf-8")
            (fw / "config.json").write_text('{"custom": false}', encoding="utf-8")

            stdout = io.StringIO()
            with patch.object(deploy_firmware, "detect_port", return_value="/dev/ttyACM0"), \
                 patch.object(deploy_firmware, "find_circuitpy_mount", return_value=None), \
                 patch.object(deploy_firmware, "send_serial_command", return_value={"status": "ok", "cmd": "version", "version": "1.9.0"}), \
                 patch("sys.stdout", stdout):
                rc = deploy_firmware.main(["--firmware-dir", str(fw), "--dry-run", "--json"])

            self.assertEqual(rc, 0)
            out = json.loads(stdout.getvalue())
            self.assertEqual(out["status"], "ok")
            self.assertEqual(out["mode"], "dry_run")
            self.assertTrue(out["protect_config"])
            self.assertEqual(out["files"], ["code.py"])
            self.assertEqual(out["before_version"], "1.9.0")

    def test_full_deploy_preserves_config_and_creates_backup(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fw = root / "firmware"
            fw.mkdir()
            (fw / "code.py").write_text("new_code", encoding="utf-8")
            (fw / "config.json").write_text('{"default": true}', encoding="utf-8")

            mount = root / "CIRCUITPY"
            mount.mkdir()
            (mount / "code.py").write_text("old_code", encoding="utf-8")
            (mount / "config.json").write_text('{"user_setting": 123}', encoding="utf-8")

            backup_dir = root / "backup"
            sent_cmds = []

            def fake_send(port, cmd_obj, timeout=3.0, expect_cmd=None, wait_response=True):
                cmd = cmd_obj["cmd"]
                sent_cmds.append(cmd)
                if cmd == "version":
                    # 初回は 1.9.0、再起動後は 1.10.0 を返す
                    ver = "1.9.0" if sent_cmds.count("version") == 1 else "1.10.0"
                    return {"status": "ok", "cmd": "version", "version": ver}
                return {"status": "ok", "cmd": cmd}

            stdout = io.StringIO()
            with patch.object(deploy_firmware, "detect_port", return_value="/dev/ttyACM0"), \
                 patch.object(deploy_firmware, "find_circuitpy_mount", side_effect=[None, mount]), \
                 patch.object(deploy_firmware, "wait_for_mount", return_value=mount), \
                 patch.object(deploy_firmware, "wait_for_serial_port", return_value="/dev/ttyACM0"), \
                 patch.object(deploy_firmware, "send_serial_command", side_effect=fake_send), \
                 patch.object(deploy_firmware, "sync_filesystem"), \
                 patch.object(deploy_firmware.time, "sleep"), \
                 patch("sys.stdout", stdout):
                rc = deploy_firmware.main([
                    "--firmware-dir", str(fw),
                    "--backup-dir", str(backup_dir),
                    "--json",
                ])

            self.assertEqual(rc, 0)
            out = json.loads(stdout.getvalue())
            self.assertEqual(out["status"], "ok")
            self.assertEqual(out["before_version"], "1.9.0")
            self.assertEqual(out["after_version"], "1.10.0")
            self.assertEqual(sent_cmds, ["version", "enter_maintenance", "reboot", "version"])

            # code.py は更新され、config.json はユーザー設定が保護されていること
            self.assertEqual((mount / "code.py").read_text(encoding="utf-8"), "new_code")
            self.assertEqual((mount / "config.json").read_text(encoding="utf-8"), '{"user_setting": 123}')

            # バックアップには更新前の code.py と config.json が保存されていること
            self.assertEqual((backup_dir / "code.py").read_text(encoding="utf-8"), "old_code")
            self.assertEqual((backup_dir / "config.json").read_text(encoding="utf-8"), '{"user_setting": 123}')

    def test_wsl_circuitpy_detection_via_boot_out_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            mnt_root = Path(tmp) / "mnt"
            (mnt_root / "c").mkdir(parents=True)  # Windows Cドライブ相当 (対象外)
            (mnt_root / "e").mkdir(parents=True)
            (mnt_root / "e" / "boot_out.txt").write_text(
                "Adafruit CircuitPython 9.2.0 on 2024-10-28; Raspberry Pi Pico with rp2040",
                encoding="utf-8",
            )

            orig_path = deploy_firmware.Path

            def fake_path(p):
                if p == "/mnt":
                    return mnt_root
                return orig_path(p)

            with patch.object(deploy_firmware, "_find_powershell", return_value=None), \
                 patch.object(deploy_firmware, "Path", side_effect=fake_path):
                detected = deploy_firmware._find_wsl_circuitpy_mount()
                self.assertEqual(detected, mnt_root / "e")

    def test_wsl_circuitpy_detection_via_powershell(self):
        with tempfile.TemporaryDirectory() as tmp:
            mnt_e = Path(tmp) / "e"
            mnt_e.mkdir(parents=True)
            (mnt_e / "code.py").write_text("print('ok')", encoding="utf-8")

            fake_proc = MagicMock()
            fake_proc.stdout = "E\n"

            orig_path = deploy_firmware.Path

            def fake_path(p):
                if p == "/mnt/e":
                    return mnt_e
                return orig_path(p)

            with patch.object(deploy_firmware, "_find_powershell", return_value="/usr/bin/powershell.exe"), \
                 patch.object(deploy_firmware, "_run_powershell", return_value=fake_proc), \
                 patch.object(deploy_firmware, "Path", side_effect=fake_path):
                detected = deploy_firmware._find_wsl_circuitpy_mount()
                self.assertEqual(detected, mnt_e)

    def test_wsl_circuitpy_unmounted_returns_windows_drive(self):
        fake_proc = MagicMock()
        fake_proc.stdout = "F\n"
        orig_path = deploy_firmware.Path

        def fake_path(p):
            if p == "/mnt/f":
                return orig_path("/nonexistent_mnt_f_for_test")
            return orig_path(p)

        with patch.object(deploy_firmware, "_find_powershell", return_value="/usr/bin/powershell.exe"), \
             patch.object(deploy_firmware, "_run_powershell", return_value=fake_proc), \
             patch.object(deploy_firmware, "Path", side_effect=fake_path):
            detected = deploy_firmware._find_wsl_circuitpy_mount()
            self.assertEqual(detected, "F:\\")

    def test_wsl_windows_com_port_detection_and_command(self):
        fake_ps_ports = MagicMock()
        fake_ps_ports.stdout = json.dumps([
            {
                "device": "COM4",
                "description": "USB Serial Device",
                "manufacturer": "Niratama",
                "product": "Lefty Controller (COM4)",
                "pnp_id": "USB\\VID_239A&PID_80F4\\1234",
            }
        ])
        with patch.object(deploy_firmware, "_is_wsl", return_value=True), \
             patch.object(deploy_firmware, "_find_powershell", return_value="/usr/bin/powershell.exe"), \
             patch.object(deploy_firmware, "_run_powershell", return_value=fake_ps_ports), \
             patch.object(deploy_firmware, "serial", None):
            ports = deploy_firmware.list_serial_ports()
            self.assertEqual(len(ports), 1)
            self.assertEqual(ports[0]["device"], "COM4")
            self.assertEqual(ports[0]["vid"], 0x239A)
            self.assertEqual(deploy_firmware.detect_port(), "COM4")

        fake_ps_cmd = MagicMock()
        fake_ps_cmd.returncode = 0
        fake_ps_cmd.stdout = '{"status": "ok", "cmd": "version", "version": "1.10.0"}\n'
        with patch.object(deploy_firmware.platform, "system", return_value="Linux"), \
             patch.object(deploy_firmware, "_run_powershell", return_value=fake_ps_cmd):
            res = deploy_firmware.send_serial_command("COM4", {"cmd": "version"}, timeout=2.0)
            self.assertEqual(res["version"], "1.10.0")


if __name__ == "__main__":
    unittest.main()
