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

if __name__ == '__main__':
    unittest.main()
