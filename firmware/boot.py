"""
boot.py: CircuitPython 起動時構成スクリプト
USB HID (Composite Device: Keyboard) の有効化およびUSBデバイス名の設定を行います。
"""

import usb_hid

# 標準キーボードデバイスを有効化
usb_hid.enable((usb_hid.Device.KEYBOARD,))
