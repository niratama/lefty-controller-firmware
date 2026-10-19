"""
boot.py: CircuitPython 起動時構成スクリプト

1. USB デバイス識別情報 (メーカー名: Niratama / 製品名: Lefty Controller) & シリアルポート命名
2. USB ドライブ (CIRCUITPY) のマウント制御 (メンテナンスモード判定):
   - 通常起動 (ボタンを押さずに接続): PCへのマスストレージマウントを無効化し、マイコンからの書込を許可。
   - メンテナンスモード (前面ボタン1 = GP0 を押しながら接続): CIRCUITPY ドライブをPCに表示。
3. USB HID Composite Device (Keyboard + Mouse + Gamepad) の有効化。
"""

# ==========================================
# 0. USB デバイス識別情報・シリアルポート名の設定
# ==========================================
try:
    import supervisor
    import usb_cdc

    # USB デバイスのメーカー名・製品名を設定
    supervisor.set_usb_identification(
        manufacturer="Niratama",
        product="Lefty Controller"
    )

    # シリアルポート (CDC) のインターフェース名を設定
    try:
        usb_cdc.set_names(
            console_control_interface_name="Config Port",
            console_data_interface_name="Config Port"
        )
    except Exception as e_cdc:
        print(f"[boot.py cdc INFO] {e_cdc}")
except Exception as e_id:
    print(f"[boot.py usb_id INFO] {e_id}")


# ==========================================
# 1. USB マスストレージ (CIRCUITPY ドライブ) のマウント制御
# ==========================================
try:
    import board
    import digitalio
    import storage

    # 前面ボタン1 (GP0 / SW1 / ラベル "1") の押下状態を確認
    # 回路仕様: 内部プルアップ / Active Low (押下時 GND / False)
    service_pin = digitalio.DigitalInOut(board.GP0)
    service_pin.direction = digitalio.Direction.INPUT
    service_pin.pull = digitalio.Pull.UP

    try:
        is_maintenance = not service_pin.value
    finally:
        service_pin.deinit()

    # シリアルコマンド等によるソフトウェアブートフラグ (NVM末尾4バイト) の確認
    # USB抜き差しを行わずにコマンドからメンテナンスモードへソフト再起動可能にする
    try:
        import microcontroller
        if microcontroller and hasattr(microcontroller, "nvm") and len(microcontroller.nvm) >= 4:
            nvm_len = len(microcontroller.nvm)
            if bytes(microcontroller.nvm[nvm_len - 4 : nvm_len]) == b"MAIT":
                is_maintenance = True
                # 次回起動時は通常モードに戻るようフラグをクリア
                microcontroller.nvm[nvm_len - 4 : nvm_len] = b"\x00\x00\x00\x00"
    except Exception as e_flag:
        print(f"[boot.py flag INFO] {e_flag}")

    if not is_maintenance:
        # 通常運用モード: ドライブを非表示にして余計なポップアップを防止
        # マイコン自身の Python スクリプトからのファイル書込 (config.json) を許可
        storage.disable_usb_drive()
        try:
            storage.remount("/", readonly=False)
        except Exception as e_remount:
            print(f"[boot.py] remount warning: {e_remount}")
        try:
            import supervisor
            supervisor.runtime.autoreload = False
        except Exception:
            pass
    else:
        # メンテナンスモード: 前面ボタン1を押しながら接続した場合はドライブをPCに表示
        print("[boot.py] メンテナンスモード: CIRCUITPY ドライブをマウントしました")

except Exception as e_storage:
    print(f"[boot.py storage INFO] {e_storage}")


# ==========================================
# 2. USB HID Composite Device 有効化
# ==========================================
try:
    import usb_hid

    # 16ボタン + 1ハットスイッチ (D-Pad) + 4軸 (X, Y, Z, Rz: -127〜127) 標準HIDゲームパッド
    GAMEPAD_REPORT_DESCRIPTOR = bytes((
        0x05, 0x01,        # Usage Page (Generic Desktop Ctrls)
        0x09, 0x05,        # Usage (Game Pad)
        0xA1, 0x01,        # Collection (Application)
        0x85, 0x04,        #   Report ID (4)
        # 16 Buttons (2 bytes)
        0x05, 0x09,        #   Usage Page (Button)
        0x19, 0x01,        #   Usage Minimum (Button 1)
        0x29, 0x10,        #   Usage Maximum (Button 16)
        0x15, 0x00,        #   Logical Minimum (0)
        0x25, 0x01,        #   Logical Maximum (1)
        0x75, 0x01,        #   Report Size (1)
        0x95, 0x10,        #   Report Count (16)
        0x81, 0x02,        #   Input (Data,Var,Abs)
        # 1 Hat Switch (D-Pad) (1 byte: 1〜8 direction, 0=neutral; 4-bit data + 4-bit padding)
        0x05, 0x01,        #   Usage Page (Generic Desktop Ctrls)
        0x09, 0x39,        #   Usage (Hat switch)
        0x15, 0x01,        #   Logical Minimum (1)
        0x25, 0x08,        #   Logical Maximum (8)
        0x35, 0x00,        #   Physical Minimum (0)
        0x46, 0x3B, 0x01,  #   Physical Maximum (315)
        0x65, 0x14,        #   Unit (Eng Rot:Degrees)
        0x75, 0x04,        #   Report Size (4)
        0x95, 0x01,        #   Report Count (1)
        0x81, 0x42,        #   Input (Data,Var,Abs,Null)
        0x65, 0x00,        #   Unit (None)
        0x75, 0x04,        #   Report Size (4)
        0x95, 0x01,        #   Report Count (1)
        0x81, 0x03,        #   Input (Const,Var,Abs)
        # 4 Axes: X, Y, Z, Rz (4 bytes: -127 〜 127)
        0x05, 0x01,        #   Usage Page (Generic Desktop Ctrls)
        0x15, 0x81,        #   Logical Minimum (-127)
        0x25, 0x7F,        #   Logical Maximum (127)
        0x09, 0x30,        #   Usage (X)
        0x09, 0x31,        #   Usage (Y)
        0x09, 0x32,        #   Usage (Z)
        0x09, 0x35,        #   Usage (Rz)
        0x75, 0x08,        #   Report Size (8)
        0x95, 0x04,        #   Report Count (4)
        0x81, 0x02,        #   Input (Data,Var,Abs)
        0xC0,              # End Collection
    ))

    gamepad_device = usb_hid.Device(
        report_descriptor=GAMEPAD_REPORT_DESCRIPTOR,
        usage_page=0x01,
        usage=0x05,
        report_ids=(4,),
        in_report_lengths=(7,),
        out_report_lengths=(0,),
    )

    # Keyboard, Mouse, Gamepad を複合デバイスとして同時有効化
    usb_hid.enable((
        usb_hid.Device.KEYBOARD,
        usb_hid.Device.MOUSE,
        gamepad_device,
    ))
except Exception as e:
    print(f"[boot.py ERROR] {e}")
