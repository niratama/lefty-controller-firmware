import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from key_mapper import parse_key, parse_keys, parse_action, parse_actions, Keycode

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

    def test_parse_actions_composite(self):
        res = parse_actions(["LCtrl", "Mouse_Left", "Wheel_Up", "Gamepad_1"])
        self.assertEqual(res["keyboard"], [Keycode.LEFT_CONTROL])
        self.assertEqual(res["mouse_buttons"], 1)
        self.assertEqual(res["mouse_wheel"], 1)
        self.assertEqual(res["gamepad_buttons"], [1])

if __name__ == '__main__':
    unittest.main()
