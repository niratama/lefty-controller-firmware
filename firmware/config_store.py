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

        if total_len > len(microcontroller.nvm):
            print(f"[WARN] NVM容量不足: 必要 {total_len} bytes / 空き {len(microcontroller.nvm)} bytes")
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

def load_config(config_path="config.json", default_config=None):
    """
    設定を読み込む。
    1. config.json から基本設定を読み込み
    2. NVM (内蔵Flash) に新しい保存データがあればそれを優先適用
    """
    cfg = None

    # 1. ファイルから読込
    try:
        with open(config_path, "r") as f:
            cfg = json.load(f)
    except Exception:
        cfg = default_config

    # 2. NVMから読込 (Flash保存データがあれば上書き)
    nvm_cfg = load_from_nvm()
    if nvm_cfg:
        cfg = nvm_cfg

    return cfg

def save_config(config_dict, config_path="config.json"):
    """
    設定を保存する。
    1. microcontroller.nvm (Flash) への保存を試行 (USB接続中も常に成功)
    2. config.json への保存を試行 (可能であれば)
    戻り値: (saved_to_file, saved_to_nvm, warning_msg)
    """
    saved_to_nvm = save_to_nvm(config_dict)
    saved_to_file = False
    warning_msg = None

    try:
        with open(config_path, "w") as f:
            json.dump(config_dict, f, indent=2)
        saved_to_file = True
    except OSError as e:
        # USB接続中でRead-onlyストレージの場合
        if saved_to_nvm:
            warning_msg = "ストレージはPC接続中(Read-Only)ですが、RP2040内蔵Flash(NVM)に安全に永続保存されました！電源を切っても維持されます。"
        else:
            warning_msg = f"ファイル書き込み失敗: {e}"
    except Exception as e:
        warning_msg = str(e)

    return saved_to_file, saved_to_nvm, warning_msg
