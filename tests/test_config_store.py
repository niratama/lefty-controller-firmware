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

    def test_migrate_config_old_pins(self):
        # 旧配線のピン設定を持つ設定データ
        old_cfg = {
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
        migrated_cfg, migrated = config_store.migrate_config(old_cfg)
        self.assertTrue(migrated)
        self.assertEqual(migrated_cfg["pins"]["buttons"], [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 9, 10, 12])
        self.assertEqual(migrated_cfg["pins"]["adc_x"], 27)
        self.assertEqual(migrated_cfg["pins"]["adc_y"], 26)
        # ユーザーの既存キー設定が維持されていること
        self.assertEqual(migrated_cfg["profiles"][0]["keymap"]["buttons"], ["Space", "z", "LCtrl"])

    def test_load_config_auto_migrates_nvm(self):
        # NVMに旧設定が保存されている状態
        old_cfg = {
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
        self.assertEqual(loaded["pins"]["buttons"], [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 9, 10, 12])
        self.assertEqual(loaded["pins"]["adc_x"], 27)
        self.assertEqual(loaded["pins"]["adc_y"], 26)

        # NVMにマイグレーション結果が書き戻されていること
        nvm_reloaded = config_store.load_from_nvm()
        self.assertEqual(nvm_reloaded["pins"]["buttons"], [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 9, 10, 12])

if __name__ == '__main__':
    unittest.main()
