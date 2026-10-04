import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from hid_keyboard import NativeKeyboard
from key_mapper import Keycode

class MockHIDDevice:
    def __init__(self):
        self.usage_page = 0x01
        self.usage = 0x06
        self.last_report = None

    def send_report(self, report):
        self.last_report = bytearray(report)

class TestNativeKeyboard(unittest.TestCase):
    def setUp(self):
        self.mock_dev = MockHIDDevice()
        self.kbd = NativeKeyboard(devices=[self.mock_dev])

    def test_single_key_press_release(self):
        # Aキー (0x04) を押下
        self.kbd.press(Keycode.A)
        self.assertEqual(self.mock_dev.last_report[0], 0x00)  # No modifier
        self.assertEqual(self.mock_dev.last_report[2], 0x04)  # Keycode.A

        # Aキーを解放
        self.kbd.release(Keycode.A)
        self.assertEqual(self.mock_dev.last_report[2], 0x00)

    def test_modifier_and_key(self):
        # Shift (0xE1 -> bit 1 -> 0x02) + W (0x1A)
        self.kbd.press(Keycode.LEFT_SHIFT, Keycode.W)
        self.assertEqual(self.mock_dev.last_report[0], 0x02)  # Shift bit
        self.assertEqual(self.mock_dev.last_report[2], 0x1A)  # W

        # Shiftを離してWを維持
        self.kbd.release(Keycode.LEFT_SHIFT)
        self.assertEqual(self.mock_dev.last_report[0], 0x00)
        self.assertEqual(self.mock_dev.last_report[2], 0x1A)

        # release_all
        self.kbd.release_all()
        self.assertEqual(self.mock_dev.last_report, bytearray(8))

if __name__ == '__main__':
    unittest.main()
