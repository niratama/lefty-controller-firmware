import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from key_mapper import parse_key, parse_keys, parse_action, parse_actions, parse_button_def, parse_combos, Keycode

class TestKeyMapper(unittest.TestCase):
    def test_parse_single_keys(self):
        self.assertEqual(parse_key("W"), Keycode.W)
        self.assertEqual(parse_key("w"), Keycode.W)
        self.assertEqual(parse_key("Shift"), Keycode.LEFT_SHIFT)
        self.assertEqual(parse_key("LCtrl"), Keycode.LEFT_CONTROL)
        self.assertEqual(parse_key("Space"), Keycode.SPACEBAR)
        self.assertEqual(parse_key("Tab"), Keycode.TAB)
        self.assertEqual(parse_key("1"), Keycode.ONE)
        self.assertEqual(parse_key("x"), Keycode.X)
        self.assertEqual(parse_key("e"), Keycode.E)
        self.assertEqual(parse_key("f"), Keycode.F)
        self.assertEqual(parse_key("q"), Keycode.Q)
        self.assertEqual(parse_key("z"), Keycode.Z)
        self.assertEqual(parse_key("3"), Keycode.THREE)
        self.assertEqual(parse_key("4"), Keycode.FOUR)
        self.assertEqual(parse_key("F1"), Keycode.F1)
        self.assertEqual(parse_key("F12"), Keycode.F12)
        self.assertEqual(parse_key("Home"), Keycode.HOME)
        self.assertEqual(parse_key("End"), Keycode.END)
        self.assertEqual(parse_key("PageUp"), Keycode.PAGE_UP)
        self.assertEqual(parse_key("PgDn"), Keycode.PAGE_DOWN)
        self.assertEqual(parse_key("Insert"), Keycode.INSERT)
        self.assertEqual(parse_key("CapsLock"), Keycode.CAPS_LOCK)
        self.assertEqual(parse_key("-"), Keycode.MINUS)
        self.assertEqual(parse_key("Minus"), Keycode.MINUS)
        self.assertEqual(parse_key(";"), Keycode.SEMICOLON)
        self.assertEqual(parse_key(","), Keycode.COMMA)

    def test_parse_keys_list(self):
        self.assertEqual(parse_keys(["Shift", "W"]), [Keycode.LEFT_SHIFT, Keycode.W])
        self.assertEqual(parse_keys("W"), [Keycode.W])
        self.assertEqual(parse_keys([]), [])

    def test_parse_mouse_actions(self):
        self.assertEqual(parse_action("Mouse_Left"), ("mouse_button", 1))
        self.assertEqual(parse_action("mouse_right"), ("mouse_button", 2))
        self.assertEqual(parse_action("Click_Middle"), ("mouse_button", 4))
        self.assertEqual(parse_action("Wheel_Up"), ("mouse_wheel", 1))
        self.assertEqual(parse_action("wheel_down"), ("mouse_wheel", -1))

    def test_parse_gamepad_actions(self):
        self.assertEqual(parse_action("Gamepad_1"), ("gamepad_button", 1))
        self.assertEqual(parse_action("gamepad_16"), ("gamepad_button", 16))
        self.assertEqual(parse_action("Gamepad_A"), ("gamepad_button", 1))
        self.assertEqual(parse_action("gamepad_b"), ("gamepad_button", 2))
        self.assertEqual(parse_action("Gamepad_LB"), ("gamepad_button", 5))
        self.assertEqual(parse_action("Gamepad_Start"), ("gamepad_button", 10))

    def test_parse_profile_actions(self):
        self.assertEqual(parse_action("profile_next"), ("profile_action", "next"))
        self.assertEqual(parse_action("Profile_Prev"), ("profile_action", "prev"))
        self.assertEqual(parse_action("profile_default"), ("profile_action", "default"))
        self.assertEqual(parse_action("profile_switch:prof_loot_123"), ("profile_action", "switch:prof_loot_123"))

        res = parse_actions(["profile_next", "profile_switch:custom_id"])
        self.assertEqual(res["profile_actions"], ["next", "switch:custom_id"])

    def test_parse_layer_actions(self):
        self.assertEqual(parse_action("fn"), ("layer_action", "fn"))
        self.assertEqual(parse_action("layer:fn"), ("layer_action", "fn"))
        self.assertEqual(parse_action("layer_hold:fn"), ("layer_action", "fn"))
        res = parse_actions("fn")
        self.assertEqual(res["layer_actions"], ["fn"])

    def test_parse_button_def(self):
        # 1. 通常
        b1 = parse_button_def("Space")
        self.assertFalse(b1["is_tap_hold"])
        self.assertEqual(b1["actions"]["keyboard"], [Keycode.SPACE])

        # 2. Tap-Hold 文字列
        b2 = parse_button_def("tap:E|hold:F|ms:350")
        self.assertTrue(b2["is_tap_hold"])
        self.assertEqual(b2["hold_ms"], 350)
        self.assertEqual(b2["tap_actions"]["keyboard"], [Keycode.E])
        self.assertEqual(b2["hold_actions"]["keyboard"], [Keycode.F])

        # 3. Tap-Hold 辞書
        b3 = parse_button_def({"tap": "LAlt", "hold": "profile_next", "hold_ms": 500})
        self.assertTrue(b3["is_tap_hold"])
        self.assertEqual(b3["hold_ms"], 500)
        self.assertEqual(b3["tap_actions"]["keyboard"], [Keycode.LEFT_ALT])
        self.assertEqual(b3["hold_actions"]["profile_actions"], ["next"])

    def test_parse_combos(self):
        combos = [
            {"buttons": [9, 11], "action": "profile_next", "hold_ms": 600},
            {"buttons": [1, 0], "action": "Escape", "hold_ms": 0}
        ]
        parsed = parse_combos(combos)
        self.assertEqual(len(parsed), 2)
        self.assertEqual(parsed[0]["buttons"], [9, 11])
        self.assertEqual(parsed[0]["hold_ms"], 600)
        self.assertEqual(parsed[0]["actions"]["profile_actions"], ["next"])

        self.assertEqual(parsed[1]["buttons"], [0, 1])
        self.assertEqual(parsed[1]["hold_ms"], 0)
        self.assertEqual(parsed[1]["actions"]["keyboard"], [Keycode.ESCAPE])

if __name__ == '__main__':
    unittest.main()
