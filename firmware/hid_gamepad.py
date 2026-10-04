"""
hid_gamepad.py: 外部ライブラリ依存ゼロのビルトイン USB HID ゲームパッドドライバ
16個のボタン (1〜16) と 4軸ジョイスティック (X, Y, Z, Rz: -127〜127) をサポートします。
"""

try:
    import usb_hid
except ImportError:
    usb_hid = None


class NativeGamepad:
    """
    標準 6バイト USB HID ゲームパッドレポートを直接生成・送信する軽量ドライバ
    レポート構成:
      Byte 0: ボタン 1〜8 (bit 0〜7)
      Byte 1: ボタン 9〜16 (bit 0〜7)
      Byte 2: X軸 (-127 〜 127)
      Byte 3: Y軸 (-127 〜 127)
      Byte 4: Z軸 (-127 〜 127)
      Byte 5: Rz軸 (-127 〜 127)
    """

    def __init__(self, devices=None):
        if devices is None and usb_hid is not None:
            devices = usb_hid.devices

        self._device = None
        if devices:
            for dev in devices:
                # Generic Desktop (0x01) / Gamepad (0x05)
                if getattr(dev, "usage_page", None) == 0x01 and getattr(dev, "usage", None) == 0x05:
                    self._device = dev
                    break

        self.report = bytearray(6)
        self._buttons = 0  # 16bit整数 (bit 0: Btn 1 ... bit 15: Btn 16)
        self._joy_x = 0
        self._joy_y = 0
        self._joy_z = 0
        self._joy_rz = 0

    @staticmethod
    def _clamp(v):
        if v < -127:
            return -127
        if v > 127:
            return 127
        return int(v)

    def press_buttons(self, *buttons):
        """1〜16のボタンを押下"""
        for b in buttons:
            if 1 <= b <= 16:
                self._buttons |= (1 << (b - 1))
        self._send()

    def release_buttons(self, *buttons):
        """1〜16のボタンを解放"""
        for b in buttons:
            if 1 <= b <= 16:
                self._buttons &= ~(1 << (b - 1))
        self._send()

    def release_all_buttons(self):
        """全ボタンを解放"""
        self._buttons = 0
        self._send()

    def move_joysticks(self, x=None, y=None, z=None, rz=None):
        """アナログ軸値を更新 (-127 〜 127)"""
        changed = False
        if x is not None:
            cx = self._clamp(x)
            if cx != self._joy_x:
                self._joy_x = cx
                changed = True
        if y is not None:
            cy = self._clamp(y)
            if cy != self._joy_y:
                self._joy_y = cy
                changed = True
        if z is not None:
            cz = self._clamp(z)
            if cz != self._joy_z:
                self._joy_z = cz
                changed = True
        if rz is not None:
            crz = self._clamp(rz)
            if crz != self._joy_rz:
                self._joy_rz = crz
                changed = True

        if changed:
            self._send()

    def update(self, desired_buttons, x=0, y=0, z=0, rz=0):
        """ボタン状態と各軸をまとめて更新（変更があった場合のみレポート送信）"""
        cx = self._clamp(x)
        cy = self._clamp(y)
        cz = self._clamp(z)
        crz = self._clamp(rz)

        if (self._buttons != desired_buttons or
            self._joy_x != cx or
            self._joy_y != cy or
            self._joy_z != cz or
            self._joy_rz != crz):
            self._buttons = desired_buttons
            self._joy_x = cx
            self._joy_y = cy
            self._joy_z = cz
            self._joy_rz = crz
            self._send()

    def reset_all(self):
        """全ボタン解放および全軸ニュートラル(0)復帰"""
        self._buttons = 0
        self._joy_x = 0
        self._joy_y = 0
        self._joy_z = 0
        self._joy_rz = 0
        self._send()

    def _send(self):
        if self._device is None:
            return

        self.report[0] = self._buttons & 0xFF
        self.report[1] = (self._buttons >> 8) & 0xFF
        self.report[2] = self._joy_x & 0xFF
        self.report[3] = self._joy_y & 0xFF
        self.report[4] = self._joy_z & 0xFF
        self.report[5] = self._joy_rz & 0xFF

        try:
            self._device.send_report(self.report)
        except Exception:
            pass
