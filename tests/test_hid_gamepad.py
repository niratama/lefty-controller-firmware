import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from hid_gamepad import NativeGamepad


class MockHIDGamepadDevice:
    def __init__(self):
        self.usage_page = 0x01
        self.usage = 0x05
        self.last_report = None
        self.report_count = 0

    def send_report(self, report):
        self.last_report = bytearray(report)
        self.report_count += 1


class TestNativeGamepad(unittest.TestCase):
    def setUp(self):
        self.mock_dev = MockHIDGamepadDevice()
        self.gamepad = NativeGamepad(devices=[self.mock_dev])

    def test_buttons_press_release(self):
        # ボタン 1 (byte 0: bit 0)
        self.gamepad.press_buttons(1)
        self.assertEqual(self.mock_dev.last_report[0], 0x01)
        self.assertEqual(self.mock_dev.last_report[1], 0x00)

        # ボタン 9 (byte 1: bit 0)
        self.gamepad.press_buttons(9)
        self.assertEqual(self.mock_dev.last_report[0], 0x01)
        self.assertEqual(self.mock_dev.last_report[1], 0x01)

        # ボタン 1 解放
        self.gamepad.release_buttons(1)
        self.assertEqual(self.mock_dev.last_report[0], 0x00)
        self.assertEqual(self.mock_dev.last_report[1], 0x01)

        # 全ボタン解放
        self.gamepad.release_all_buttons()
        self.assertEqual(self.mock_dev.last_report[0], 0x00)
        self.assertEqual(self.mock_dev.last_report[1], 0x00)

    def test_axes_move_and_clamp(self):
        # アナログ軸移動 (X=50, Y=-60)
        self.gamepad.move_joysticks(x=50, y=-60)
        self.assertEqual(self.mock_dev.last_report[2], 50)
        self.assertEqual(self.mock_dev.last_report[3], (-60) & 0xFF)

        # クランプ上限・下限 (-127 〜 127)
        self.gamepad.move_joysticks(x=300, y=-200)
        self.assertEqual(self.mock_dev.last_report[2], 127)
        self.assertEqual(self.mock_dev.last_report[3], (-127) & 0xFF)

    def test_gamepad_update(self):
        cnt = self.mock_dev.report_count
        # ボタン 1 (1) + ボタン 3 (4) = 5 (0x0005), X=20, Y=-30
        self.gamepad.update(desired_buttons=0x0005, x=20, y=-30)
        self.assertEqual(self.mock_dev.report_count, cnt + 1)
        self.assertEqual(self.mock_dev.last_report[0], 0x05)
        self.assertEqual(self.mock_dev.last_report[1], 0x00)
        self.assertEqual(self.mock_dev.last_report[2], 20)
        self.assertEqual(self.mock_dev.last_report[3], (-30) & 0xFF)

        # 同一状態ならレポート送信をスキップ
        cnt = self.mock_dev.report_count
        self.gamepad.update(desired_buttons=0x0005, x=20, y=-30)
        self.assertEqual(self.mock_dev.report_count, cnt)


if __name__ == '__main__':
    unittest.main()
