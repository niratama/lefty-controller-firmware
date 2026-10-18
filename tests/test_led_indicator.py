import unittest
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from led_indicator import LedIndicator, DEFAULT_PROFILE_COLORS

class TestLedIndicator(unittest.TestCase):
    def test_init_and_profile_colors(self):
        led = LedIndicator()
        # Mock/デスクトップ環境でエラーなく初期化できること
        self.assertIsNotNone(led)
        
        # Profile 0 設定
        led.set_profile(0, flash=False)
        self.assertEqual(led.base_color, DEFAULT_PROFILE_COLORS[0])
        
        # Profile 1 設定
        led.set_profile(1, flash=False)
        self.assertEqual(led.base_color, DEFAULT_PROFILE_COLORS[1])

        # カスタムHexカラー設定 (#ff00aa)
        led.set_profile(0, hex_color="#ff00aa", flash=False)
        self.assertEqual(led.base_color, (255, 0, 170))

    def test_flashing_statemachine(self):
        led = LedIndicator()
        # フラッシュ開始
        led.set_base_color(0, 100, 255)
        led.trigger_flash(255, 255, 0, count=2, on_dur=0.01, off_dur=0.01)
        self.assertTrue(led.flashing)
        self.assertEqual(led.flash_count, 2)
        
        # 時間経過でフェーズ遷移
        time.sleep(0.015)
        led.update()
        # 1回目の点灯終了 -> 消灯フェーズ
        self.assertEqual(led.flash_phase, 1)

        time.sleep(0.015)
        led.update()
        # 消灯終了 -> 2回目の点灯
        self.assertEqual(led.flash_phase, 0)

        time.sleep(0.015)
        led.update()
        # 2回目の点灯終了 -> 完了してbase_colorへ
        time.sleep(0.015)
        led.update()
        self.assertFalse(led.flashing)

    def test_pixel_order(self):
        led = LedIndicator(pixel_order="RGB")
        self.assertEqual(led.pixel_order, "RGB")
        led.set_pixel_order("GRB")
        self.assertEqual(led.pixel_order, "GRB")
        led.set_pixel_order("RGB")
        self.assertEqual(led.pixel_order, "RGB")

if __name__ == '__main__':
    unittest.main()
