"""
config_store.py: 設定の永続化管理モジュール
CircuitPython の USB マスストレージ接続時における Read-Only 制約を回避するため、
RP2040 内蔵 Flash メモリ (microcontroller.nvm) と config.json の両方を活用して
確実に設定を永続化保存します。
"""

import json

try:
    import microcontroller
except ImportError:
    microcontroller = None

NVM_MAGIC = b"LFTY1"  # 5バイトのマジックヘッダ

def save_to_nvm(config_dict):
    """microcontroller.nvm (内蔵Flash EEPROM領域) に設定を保存"""
    if not microcontroller or not hasattr(microcontroller, "nvm"):
        return False
    try:
        raw_json = json.dumps(config_dict).encode("utf-8")
        length = len(raw_json)
        total_len = len(NVM_MAGIC) + 2 + length

        # 末尾4バイトはブートフラグ (MAIT等) 用に予約
        max_nvm_len = len(microcontroller.nvm) - 4
        if total_len > max_nvm_len:
            print(f"[WARN] NVM容量不足: 必要 {total_len} bytes / 空き {max_nvm_len} bytes")
            return False

        buf = bytearray(total_len)
        buf[0:5] = NVM_MAGIC
        buf[5] = (length >> 8) & 0xFF
        buf[6] = length & 0xFF
        buf[7:7+length] = raw_json

        microcontroller.nvm[0:total_len] = buf
        return True
    except Exception as e:
        print(f"[WARN] NVM保存エラー: {e}")
        return False

def clear_nvm():
    """microcontroller.nvm の設定データを消去 (マジックナンバーをクリア)"""
    if microcontroller and hasattr(microcontroller, "nvm"):
        try:
            microcontroller.nvm[0:5] = b"\x00\x00\x00\x00\x00"
            return True
        except Exception:
            pass
    return False

def get_nvm_status():
    """
    microcontroller.nvm の総容量、使用量、空き容量、ステータスを返す。
    戻り値: dict
    {
        "total": 4096,
        "used": 2150,
        "free": 1946,
        "valid": True
    }
    """
    total = 4096
    if microcontroller and hasattr(microcontroller, "nvm"):
        try:
            total = len(microcontroller.nvm)
            if total >= 7 and bytes(microcontroller.nvm[0:5]) == NVM_MAGIC:
                length = (microcontroller.nvm[5] << 8) | microcontroller.nvm[6]
                if 0 <= length <= (total - 7):
                    used = 7 + length
                    return {
                        "total": total,
                        "used": used,
                        "free": max(0, total - used),
                        "valid": True
                    }
            return {
                "total": total,
                "used": 0,
                "free": total,
                "valid": False
            }
        except Exception as e:
            print(f"[WARN] get_nvm_status エラー: {e}")
    return {
        "total": total,
        "used": 0,
        "free": total,
        "valid": False
    }

def load_from_nvm():
    """microcontroller.nvm から保存された設定を読出"""
    if not microcontroller or not hasattr(microcontroller, "nvm"):
        return None
    try:
        # マジックナンバーを検証
        if bytes(microcontroller.nvm[0:5]) != NVM_MAGIC:
            return None

        length = (microcontroller.nvm[5] << 8) | microcontroller.nvm[6]
        if length <= 0 or (7 + length) > len(microcontroller.nvm):
            return None

        raw_json = bytes(microcontroller.nvm[7:7+length])
        return json.loads(raw_json.decode("utf-8"))
    except Exception as e:
        print(f"[WARN] NVM読出エラー: {e}")
        return None

def sanitize_config(cfg):
    """
    設定データからハードウェア配線情報 (pins) を完全分離・除去。
    プロファイルには純粋な論理キーマップおよびスティック設定のみを保持します。
    """
    if not isinstance(cfg, dict):
        return cfg, False

    had_pins = "pins" in cfg
    if had_pins:
        cfg.pop("pins", None)

    return cfg, had_pins

def get_storage_status(path="/"):
    """
    ファイルシステム (Flashストレージ) の総容量、使用量、空き容量を返す。
    戻り値: dict
    {
        "total": 1441792,
        "used": 153600,
        "free": 1288192,
        "valid": True
    }
    """
    try:
        import os
        stat = os.statvfs(path)
        block_size = stat[0]
        total_blocks = stat[2]
        free_blocks = stat[3]
        total = total_blocks * block_size
        free = free_blocks * block_size
        used = max(0, total - free)
        return {
            "total": total,
            "used": used,
            "free": free,
            "valid": True
        }
    except Exception as e:
        return {
            "total": 1441792,
            "used": 102400,
            "free": 1339392,
            "valid": False
        }

def load_config(config_path="config.json", default_config=None):
    """
    設定を読み込む。
    1. config.json (メイン保存先) から設定を読み込み (メンテナンスモードでの直接編集も反映)
    2. config.json が見つからない・破損している場合のみ NVM (内蔵Flash EEPROM) から読出
    3. どちらも存在しない場合は default_config を適用
    4. ピン定義等のハードウェア情報はプロファイルから分離・除外
    """
    cfg = None
    loaded_from_file = False

    # 1. メイン保存先: config.json から読込
    try:
        with open(config_path, "r") as f:
            cfg = json.load(f)
            loaded_from_file = True
    except Exception:
        pass

    # 2. ファイルが無い/壊れている場合は NVM (旧設定またはフォールバック) から読込
    if not loaded_from_file:
        nvm_cfg = load_from_nvm()
        if nvm_cfg:
            cfg = nvm_cfg
            # NVMから読込成功した場合は config.json への自動移行を試行
            try:
                with open(config_path, "w") as f:
                    json.dump(cfg, f)
            except Exception:
                pass

    if cfg is None:
        cfg = default_config

    if cfg:
        cfg, had_pins = sanitize_config(cfg)
        if had_pins:
            try:
                with open(config_path, "w") as f:
                    json.dump(cfg, f)
            except Exception:
                pass
            if microcontroller and hasattr(microcontroller, "nvm"):
                save_to_nvm(cfg)

    return cfg

def save_config(config_dict, config_path="config.json"):
    """
    設定を保存する。
    1. config.json (メインFlashストレージ) への保存 (容量制限なし / 1MB以上)
    2. microcontroller.nvm (内蔵Flash 4KB) へのサブ保存 (4KBに収まる場合のみバックアップ)
    戻り値: (saved_to_file, saved_to_nvm, warning_msg)
    """
    if isinstance(config_dict, dict):
        config_dict, _ = sanitize_config(config_dict)

    saved_to_file = False
    saved_to_nvm = False
    warning_msg = None

    # 1. メイン保存先: ファイルシステム上の config.json に保存
    try:
        with open(config_path, "w") as f:
            json.dump(config_dict, f)
            try:
                f.flush()
            except Exception:
                pass
        saved_to_file = True
    except OSError as e:
        warning_msg = f"ストレージ書き込み失敗 (PCマウント中の可能性): {e}"
    except Exception as e:
        warning_msg = str(e)

    # 2. サブ保存先: 4KBに収まる場合はNVMにもバックアップ保存
    try:
        saved_to_nvm = save_to_nvm(config_dict)
    except Exception:
        saved_to_nvm = False

    if not saved_to_file and saved_to_nvm:
        warning_msg = "ストレージはPC接続中(Read-Only)ですが、RP2040内蔵Flash(NVM)に安全に永続保存されました！"
    elif saved_to_file and not saved_to_nvm:
        # NVMの4KBを超過しているが、ファイル保存は正常完了
        pass

    return saved_to_file, saved_to_nvm, warning_msg

