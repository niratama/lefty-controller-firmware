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

def clear_nvm():
    """microcontroller.nvm の設定データを消去 (マジックナンバーをクリア)"""
    if microcontroller and hasattr(microcontroller, "nvm"):
        try:
            microcontroller.nvm[0:5] = b"\x00\x00\x00\x00\x00"
            return True
        except Exception:
            pass
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

DEFAULT_HARDWARE_PINS = {
    "buttons": [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 9, 10, 12],
    "adc_x": 27,
    "adc_y": 26
}

def migrate_config(cfg):
    """
    旧ハードウェア配線から新配線への自動マイグレーション。
    - 旧側面ボタン配線: GP9=上, GP10=中, GP11=下 (buttons: [0..12])
      -> 新側面ボタン配線: GP11=上, GP9=中, GP10=下 (buttons: [0..8, 11, 9, 10, 12])
    - 旧スティックADC配線: GP26=X, GP27=Y
      -> 新スティックADC配線: GP27=X, GP26=Y
    ユーザーのプロファイル・キー設定を維持したまま、ピン配線情報のみを補正します。
    """
    if not isinstance(cfg, dict):
        return cfg, False

    migrated = False

    pins = cfg.get("pins")
    if not isinstance(pins, dict):
        cfg["pins"] = {
            "buttons": list(DEFAULT_HARDWARE_PINS["buttons"]),
            "adc_x": DEFAULT_HARDWARE_PINS["adc_x"],
            "adc_y": DEFAULT_HARDWARE_PINS["adc_y"]
        }
        migrated = True
    else:
        btns = pins.get("buttons")
        if isinstance(btns, list):
            # 旧配線 [0, 1, ..., 8, 9, 10, 11, 12] の検知 (GP9=上, GP10=中, GP11=下)
            if len(btns) == 13 and btns[9] == 9 and btns[10] == 10 and btns[11] == 11:
                btns[9] = 11  # 側面上 -> GP11
                btns[10] = 9  # 側面中 -> GP9
                btns[11] = 10 # 側面下 -> GP10
                migrated = True
                print("[MIGRATION] 側面ボタン配線を新仕様(GP11=上, GP9=中, GP10=下)へ自動移行しました")
            elif len(btns) != 13:
                pins["buttons"] = list(DEFAULT_HARDWARE_PINS["buttons"])
                migrated = True
        else:
            pins["buttons"] = list(DEFAULT_HARDWARE_PINS["buttons"])
            migrated = True

        # 旧ADC配線の検知 (GP26=X, GP27=Y)
        if pins.get("adc_x") == 26 and pins.get("adc_y") == 27:
            pins["adc_x"] = 27
            pins["adc_y"] = 26
            migrated = True
            print("[MIGRATION] スティックADC配線を新仕様(GP27=X, GP26=Y)へ自動移行しました")
        elif "adc_x" not in pins or "adc_y" not in pins:
            pins["adc_x"] = DEFAULT_HARDWARE_PINS["adc_x"]
            pins["adc_y"] = DEFAULT_HARDWARE_PINS["adc_y"]
            migrated = True

    return cfg, migrated

def load_config(config_path="config.json", default_config=None):
    """
    設定を読み込む。
    1. config.json から基本設定を読み込み
    2. NVM (内蔵Flash) に新しい保存データがあればそれを優先適用
    3. 旧配線設定が含まれる場合は最新の配線仕様へ自動マイグレーション
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

    if cfg:
        cfg, migrated = migrate_config(cfg)
        if migrated:
            # マイグレーションされた設定をNVMに書き戻し (次回以降も新配線で起動)
            save_to_nvm(cfg)

    return cfg

def save_config(config_dict, config_path="config.json"):
    """
    設定を保存する。
    1. microcontroller.nvm (Flash) への保存を試行 (USB接続中も常に成功)
    2. config.json への保存を試行 (可能であれば)
    戻り値: (saved_to_file, saved_to_nvm, warning_msg)
    """
    if isinstance(config_dict, dict):
        config_dict, _ = migrate_config(config_dict)

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
