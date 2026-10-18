import unittest
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from key_mapper import parse_button_def, parse_combos, Keycode

class MockHID:
    def __init__(self):
        self.pressed = []
        self.released = []

    def press(self, *keys):
        self.pressed.extend(keys)

    def release(self, *keys):
        self.released.extend(keys)

    def release_all(self):
        self.pressed.clear()

class TestAdvancedInputLogic(unittest.TestCase):
    def test_tap_hold_parsing(self):
        # 形式1: 通常
        b1 = parse_button_def("A")
        self.assertFalse(b1["is_tap_hold"])
        self.assertEqual(b1["actions"]["keyboard"], [Keycode.A])

        # 形式2: Tap-Hold 文字列
        b2 = parse_button_def("tap:Space|hold:LCtrl|ms:250")
        self.assertTrue(b2["is_tap_hold"])
        self.assertEqual(b2["hold_ms"], 250)
        self.assertEqual(b2["tap_actions"]["keyboard"], [Keycode.SPACEBAR])
        self.assertEqual(b2["hold_actions"]["keyboard"], [Keycode.LEFT_CONTROL])

        # 形式3: Tap-Hold 辞書
        b3 = parse_button_def({"tap": "E", "hold": "F", "hold_ms": 400})
        self.assertTrue(b3["is_tap_hold"])
        self.assertEqual(b3["hold_ms"], 400)
        self.assertEqual(b3["tap_actions"]["keyboard"], [Keycode.E])
        self.assertEqual(b3["hold_actions"]["keyboard"], [Keycode.F])

    def test_layer_fn_parsing(self):
        b1 = parse_button_def("layer:fn")
        self.assertFalse(b1["is_tap_hold"])
        self.assertEqual(b1["actions"]["layer_actions"], ["fn"])

        b2 = parse_button_def("fn")
        self.assertFalse(b2["is_tap_hold"])
        self.assertEqual(b2["actions"]["layer_actions"], ["fn"])

    def test_tap_hold_profile_action(self):
        b = parse_button_def("tap:1|hold:profile_next|ms:500")
        self.assertTrue(b["is_tap_hold"])
        self.assertEqual(b["hold_ms"], 500)
        self.assertEqual(b["tap_actions"]["keyboard"], [Keycode.ONE])
        self.assertEqual(b["hold_actions"]["profile_actions"], ["next"])

    def test_combo_parsing(self):
        combos = [
            {"buttons": [9, 11], "action": "profile_next", "hold_ms": 600},
            {"buttons": [0, 1], "action": "Escape", "hold_ms": 0},
            {"buttons": [2, 3], "action": "profile_switch:1"}
        ]
        parsed = parse_combos(combos)
        self.assertEqual(len(parsed), 3)
        self.assertEqual(parsed[0]["buttons"], [9, 11])
        self.assertEqual(parsed[0]["hold_ms"], 600)
        self.assertEqual(parsed[0]["actions"]["profile_actions"], ["next"])
        self.assertEqual(parsed[1]["buttons"], [0, 1])
        self.assertEqual(parsed[1]["actions"]["keyboard"], [Keycode.ESCAPE])
        self.assertEqual(parsed[2]["actions"]["profile_actions"], ["switch:1"])
        self.assertEqual(parsed[2]["hold_ms"], 0) # default hold_ms is 0 if omitted

    def test_invalid_combo(self):
        # Empty list or non-list
        self.assertEqual(parse_combos(None), [])
        self.assertEqual(parse_combos([]), [])
        # Malformed entries
        self.assertEqual(parse_combos([{"buttons": [1]}]), []) # buttons != 2
        self.assertEqual(parse_combos([{"action": "profile_next"}]), []) # no buttons

if __name__ == '__main__':
    unittest.main()
