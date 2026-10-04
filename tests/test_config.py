import unittest
import json
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from key_mapper import parse_keys, parse_key

class TestConfigIntegrity(unittest.TestCase):
    def test_default_config_keymap(self):
        config_path = os.path.join(os.path.dirname(__file__), '..', 'firmware', 'config.json')
        with open(config_path, 'r') as f:
            cfg = json.load(f)

        buttons = cfg.get("keymap", {}).get("buttons", [])
        self.assertEqual(len(buttons), 13)

        expected = [
            "1", "2", "x", "e", "Tab", "f", "q", "4", "3",
            "Space", "z", "LCtrl", "LAlt"
        ]
        self.assertEqual(buttons, expected)

        # 全てのキーがHID Keycodeにパース可能か検証
        for b in buttons:
            code = parse_key(b)
            self.assertIsNotNone(code, f"Failed to parse key: {b}")

if __name__ == '__main__':
    unittest.main()
