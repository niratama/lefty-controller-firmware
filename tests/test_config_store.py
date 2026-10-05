import unittest
import sys
import os
import tempfile
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

import config_store

class MockMicrocontroller:
    def __init__(self, size=4096):
        self.nvm = bytearray(size)

class TestConfigStore(unittest.TestCase):
    def setUp(self):
        self.mock_mc = MockMicrocontroller()
        config_store.microcontroller = self.mock_mc
        self.test_cfg = {
            "joystick": {
                "deadzone": 4500,
                "rotation": 90,
                "invert_x": False,
                "invert_y": True
            }
        }

    def tearDown(self):
        config_store.microcontroller = None

    def test_nvm_save_and_load(self):
        # NVM保存
        ok = config_store.save_to_nvm(self.test_cfg)
        self.assertTrue(ok)

        # NVM読出
        loaded = config_store.load_from_nvm()
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded["joystick"]["deadzone"], 4500)
        self.assertEqual(loaded["joystick"]["rotation"], 90)

    def test_nvm_magic_mismatch(self):
        # NVMが初期化（未書き込み）状態
        self.mock_mc.nvm = bytearray(4096)
        loaded = config_store.load_from_nvm()
        self.assertIsNone(loaded)

    def test_save_config_with_ro_filesystem(self):
        # 存在しないパスでファイル書き込みエラーをシミュレート
        saved_file, saved_nvm, warn = config_store.save_config(self.test_cfg, "/nonexistent_dir/config.json")
        self.assertFalse(saved_file)
        self.assertTrue(saved_nvm)  # NVMには保存成功
        self.assertIn("NVM", warn)

    def test_sanitize_config_strips_pins(self):
        # 旧形式のピン情報が含まれる設定データ
        old_cfg = {
            "version": "1.1.0",
            "profiles": [
                {
                    "name": "Custom Profile",
                    "keymap": {"buttons": ["Space", "z", "LCtrl"]}
                }
            ],
            "pins": {
                "buttons": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                "adc_x": 26,
                "adc_y": 27
            }
        }
        sanitized_cfg, had_pins = config_store.sanitize_config(old_cfg)
        self.assertTrue(had_pins)
        self.assertNotIn("pins", sanitized_cfg)
        # ユーザーの既存プロファイル設定は完全に維持
        self.assertEqual(sanitized_cfg["profiles"][0]["keymap"]["buttons"], ["Space", "z", "LCtrl"])

    def test_load_config_strips_pins_and_cleans_nvm(self):
        # NVMに旧設定（pins入り）が保存されている状態
        old_cfg = {
            "version": "1.1.0",
            "profiles": [{"name": "P1"}],
            "pins": {
                "buttons": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                "adc_x": 26,
                "adc_y": 27
            }
        }
        config_store.save_to_nvm(old_cfg)

        # load_config 実行
        loaded = config_store.load_config(config_path="/nonexistent_file.json")
        self.assertIsNotNone(loaded)
        self.assertNotIn("pins", loaded)
        self.assertEqual(loaded["profiles"][0]["name"], "P1")

        # NVM内からも pins が除去されて再保存されていること
        nvm_reloaded = config_store.load_from_nvm()
        self.assertNotIn("pins", nvm_reloaded)
        self.assertEqual(nvm_reloaded["profiles"][0]["name"], "P1")

if __name__ == '__main__':
    unittest.main()
