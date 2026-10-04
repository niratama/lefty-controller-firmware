import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from key_mapper import parse_key, parse_keys, Keycode

class TestKeyMapper(unittest.TestCase):
    def test_parse_single_keys(self):
        self.assertEqual(parse_key("W"), Keycode.W)
        self.assertEqual(parse_key("w"), Keycode.W)
        self.assertEqual(parse_key("Shift"), Keycode.LEFT_SHIFT)
        self.assertEqual(parse_key("LCtrl"), Keycode.LEFT_CONTROL)
        self.assertEqual(parse_key("Space"), Keycode.SPACEBAR)
        self.assertEqual(parse_key("Tab"), Keycode.TAB)
        self.assertEqual(parse_key("1"), Keycode.ONE)

    def test_parse_keys_list(self):
        self.assertEqual(parse_keys(["Shift", "W"]), [Keycode.LEFT_SHIFT, Keycode.W])
        self.assertEqual(parse_keys("W"), [Keycode.W])
        self.assertEqual(parse_keys([]), [])

if __name__ == '__main__':
    unittest.main()
