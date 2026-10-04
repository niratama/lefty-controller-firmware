import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from debouncer import DebouncedPin, ButtonManager

class TestDebouncer(unittest.TestCase):
    def test_single_button_debounce(self):
        btn = DebouncedPin(pin_id=0, debounce_ms=10)
        t = 0.0

        # 初期状態: 離されている (HIGH = True)
        self.assertFalse(btn.update(True, t))
        self.assertFalse(btn.just_pressed)
        self.assertFalse(btn.just_released)

        # 押下 (LOW = False)
        t = 10.0
        self.assertTrue(btn.update(False, t))
        self.assertTrue(btn.just_pressed)
        self.assertFalse(btn.just_released)

        # チャタリング: 2ms後に一瞬HIGHに戻るがデバウンス時間(10ms)内なので無視されるべき
        t = 12.0
        self.assertTrue(btn.update(True, t))
        self.assertFalse(btn.just_pressed)
        self.assertFalse(btn.just_released)

        # 5ms後にLOW
        t = 15.0
        self.assertTrue(btn.update(False, t))

        # 25ms後(前回変化から15ms後)に正規の解放 (HIGH)
        t = 25.0
        self.assertFalse(btn.update(True, t))
        self.assertFalse(btn.just_pressed)
        self.assertTrue(btn.just_released)

    def test_button_manager(self):
        pins = [0, 1, 2]
        mgr = ButtonManager(pin_ids=pins, debounce_ms=10)

        # 全ピン解放 (Active Low -> True)
        raw_vals = {0: True, 1: True, 2: True}
        pressed, jp, jr = mgr.update(raw_vals, 0.0)
        self.assertEqual(pressed, [])
        self.assertEqual(jp, [])
        self.assertEqual(jr, [])

        # ピン0と2を押下 (False)
        raw_vals = {0: False, 1: True, 2: False}
        pressed, jp, jr = mgr.update(raw_vals, 10.0)
        self.assertEqual(sorted(pressed), [0, 2])
        self.assertEqual(sorted(jp), [0, 2])
        self.assertEqual(jr, [])

        # ピン0を解放
        raw_vals = {0: True, 1: True, 2: False}
        pressed, jp, jr = mgr.update(raw_vals, 25.0)
        self.assertEqual(pressed, [2])
        self.assertEqual(jp, [])
        self.assertEqual(jr, [0])

if __name__ == '__main__':
    unittest.main()
