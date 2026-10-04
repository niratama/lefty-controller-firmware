import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from hid_mouse import NativeMouse


class MockHIDMouseDevice:
    def __init__(self):
        self.usage_page = 0x01
        self.usage = 0x02
        self.last_report = None
        self.report_count = 0

    def send_report(self, report):
        self.last_report = bytearray(report)
        self.report_count += 1


class TestNativeMouse(unittest.TestCase):
    def setUp(self):
        self.mock_dev = MockHIDMouseDevice()
        self.mouse = NativeMouse(devices=[self.mock_dev])

    def test_mouse_press_release(self):
        # 左クリック (bit 0 = 0x01)
        self.mouse.press(NativeMouse.LEFT_BUTTON)
        self.assertEqual(self.mock_dev.last_report[0], 0x01)
        self.assertEqual(self.mock_dev.last_report[1], 0x00)

        # 右クリック追加 (bit 1 = 0x02 -> 0x03)
        self.mouse.press(NativeMouse.RIGHT_BUTTON)
        self.assertEqual(self.mock_dev.last_report[0], 0x03)

        # 左クリック解除
        self.mouse.release(NativeMouse.LEFT_BUTTON)
        self.assertEqual(self.mock_dev.last_report[0], 0x02)

        # 全解除
        self.mouse.release_all()
        self.assertEqual(self.mock_dev.last_report[0], 0x00)

    def test_mouse_move_and_clamp(self):
        # 正の移動とホイール
        self.mouse.move(x=15, y=-25, wheel=2)
        self.assertEqual(self.mock_dev.last_report[0], 0x00)
        self.assertEqual(self.mock_dev.last_report[1], 15)
        self.assertEqual(self.mock_dev.last_report[2], (-25) & 0xFF)
        self.assertEqual(self.mock_dev.last_report[3], 2)

        # クランプ上限・下限 (-127 〜 127)
        self.mouse.move(x=200, y=-300)
        self.assertEqual(self.mock_dev.last_report[1], 127)
        self.assertEqual(self.mock_dev.last_report[2], (-127) & 0xFF)

    def test_mouse_update(self):
        cnt = self.mock_dev.report_count
        # ボタン押下 + 移動
        self.mouse.update(NativeMouse.LEFT_BUTTON, x=5, y=10)
        self.assertEqual(self.mock_dev.report_count, cnt + 1)
        self.assertEqual(self.mock_dev.last_report[0], 0x01)
        self.assertEqual(self.mock_dev.last_report[1], 5)
        self.assertEqual(self.mock_dev.last_report[2], 10)

        # 変更なし・移動なしならレポート送信をスキップ
        cnt = self.mock_dev.report_count
        self.mouse.update(NativeMouse.LEFT_BUTTON, x=0, y=0)
        self.assertEqual(self.mock_dev.report_count, cnt)


if __name__ == '__main__':
    unittest.main()
