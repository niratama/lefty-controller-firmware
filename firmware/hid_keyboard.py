"""
hid_keyboard.py: 外部ライブラリ依存ゼロのビルトイン USB HID キーボードドライバ
CircuitPython 8.x / 9.x / 10.x の標準ビルトイン usb_hid モジュールのみで動作します。
adafruit_hid フォルダが無くても単体で動作します。
"""

try:
    import usb_hid
except ImportError:
    usb_hid = None

class NativeKeyboard:
    """
    adafruit_hid.keyboard.Keyboard と互換のAPIを提供する軽量ドライバ
    標準 8バイト USB HID キーボードレポートを直接生成・送信します。
    """
    def __init__(self, devices=None):
        if devices is None and usb_hid is not None:
            devices = usb_hid.devices

        self._device = None
        if devices:
            for dev in devices:
                # Generic Desktop (0x01) / Keyboard (0x06)
                if getattr(dev, "usage_page", None) == 0x01 and getattr(dev, "usage", None) == 0x06:
                    self._device = dev
                    break

        if self._device is None and usb_hid is not None:
            raise ValueError("USB HID Keyboard device not found (boot.pyの変更後にUSB抜差しが必要です)")

        self.report = bytearray(8)
        self._pressed_keys = set()

    def press(self, *keycodes):
        """指定されたキーコードを押下状態にする"""
        for k in keycodes:
            self._pressed_keys.add(k)
        self._send()

    def release(self, *keycodes):
        """指定されたキーコードを解放する"""
        for k in keycodes:
            self._pressed_keys.discard(k)
        self._send()

    def release_all(self):
        """全キーを解放する"""
        self._pressed_keys.clear()
        self._send()

    def _send(self):
        if self._device is None:
            return

        # レポートバッファをクリア
        for i in range(8):
            self.report[i] = 0

        modifier_byte = 0
        regular_keys = []

        for code in self._pressed_keys:
            # 修飾キー (0xE0: LCtrl 〜 0xE7: RGUI)
            if 0xE0 <= code <= 0xE7:
                modifier_byte |= (1 << (code - 0xE0))
            else:
                regular_keys.append(code)

        self.report[0] = modifier_byte
        # 通常キーは最大6個 (bytes 2〜7)
        for idx, k in enumerate(regular_keys[:6]):
            self.report[2 + idx] = k

        try:
            self._device.send_report(self.report)
        except Exception:
            pass
