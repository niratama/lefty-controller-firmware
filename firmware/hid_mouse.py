"""
hid_mouse.py: 外部ライブラリ依存ゼロのビルトイン USB HID マウスドライバ
CircuitPython の標準 usb_hid モジュールのみで動作します。
"""

try:
    import usb_hid
except ImportError:
    usb_hid = None


class NativeMouse:
    """
    標準 4バイト USB HID マウスレポートを直接生成・送信する軽量ドライバ
    レポート構成:
      Byte 0: ボタンビットマスク (bit 0: 左, bit 1: 右, bit 2: 中, bit 3: 戻る, bit 4: 進む)
      Byte 1: X相対移動量 (-127 〜 127)
      Byte 2: Y相対移動量 (-127 〜 127)
      Byte 3: ホイール回転量 (-127 〜 127)
    """

    LEFT_BUTTON = 1       # 0x01
    RIGHT_BUTTON = 2      # 0x02
    MIDDLE_BUTTON = 4     # 0x04
    BACK_BUTTON = 8       # 0x08
    FORWARD_BUTTON = 16   # 0x10

    def __init__(self, devices=None):
        if devices is None and usb_hid is not None:
            devices = usb_hid.devices

        self._device = None
        if devices:
            for dev in devices:
                # Generic Desktop (0x01) / Mouse (0x02)
                if getattr(dev, "usage_page", None) == 0x01 and getattr(dev, "usage", None) == 0x02:
                    self._device = dev
                    break

        self.report = bytearray(4)
        self._buttons = 0

    @staticmethod
    def _clamp(v):
        if v < -127:
            return -127
        if v > 127:
            return 127
        return int(v)

    def press(self, buttons):
        """指定ビットマスクのボタンを押下"""
        self._buttons |= buttons
        self._send(0, 0, 0)

    def release(self, buttons):
        """指定ビットマスクのボタンを解放"""
        self._buttons &= ~buttons
        self._send(0, 0, 0)

    def release_all(self):
        """全マウスボタンを解放"""
        self._buttons = 0
        self._send(0, 0, 0)

    def move(self, x=0, y=0, wheel=0):
        """相対移動量およびホイール回転を送信"""
        self._send(x, y, wheel)

    def update(self, desired_buttons, x=0, y=0, wheel=0):
        """ボタン状態と相対移動量をまとめて更新・送信"""
        buttons_changed = (self._buttons != desired_buttons)
        has_movement = (x != 0 or y != 0 or wheel != 0)

        if buttons_changed or has_movement:
            self._buttons = desired_buttons
            self._send(x, y, wheel)

    def _send(self, x, y, wheel):
        if self._device is None:
            return

        cx = self._clamp(x)
        cy = self._clamp(y)
        cw = self._clamp(wheel)

        self.report[0] = self._buttons & 0xFF
        self.report[1] = cx & 0xFF
        self.report[2] = cy & 0xFF
        self.report[3] = cw & 0xFF

        try:
            self._device.send_report(self.report)
        except Exception:
            pass

        # 相対移動量は送信後にリセット
        self.report[1] = 0
        self.report[2] = 0
        self.report[3] = 0
