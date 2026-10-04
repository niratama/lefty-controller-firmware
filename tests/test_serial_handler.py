import unittest
import json
import sys
import os
import tempfile
import io

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from stick_engine import StickEngine
from debouncer import ButtonManager
from serial_handler import SerialHandler

class TestSerialHandler(unittest.TestCase):
    def setUp(self):
        self.tmp_config = tempfile.NamedTemporaryFile(mode="w+", delete=False)
        self.config_data = {
            "joystick": {
                "deadzone": 3500,
                "hysteresis": 1200,
                "directions": {
                    "up": {"th_walk": 10000, "th_run": 25000, "key_walk": "W", "key_run": ["Shift", "W"]}
                }
            }
        }
        json.dump(self.config_data, self.tmp_config)
        self.tmp_config.close()

        self.engine = StickEngine()
        self.btn_mgr = ButtonManager(pin_ids=[0, 1])
        self.handler = SerialHandler(self.engine, self.btn_mgr, config_path=self.tmp_config.name)

    def tearDown(self):
        if os.path.exists(self.tmp_config.name):
            os.remove(self.tmp_config.name)

    def test_get_config(self):
        # stdout をキャプチャ
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            self.handler.handle_line(json.dumps({"cmd": "get_config"}))
        finally:
            sys.stdout = old_stdout

        out = buffer.getvalue().strip()
        resp = json.loads(out)
        self.assertEqual(resp["status"], "ok")
        self.assertEqual(resp["cmd"], "get_config")
        self.assertEqual(resp["config"]["joystick"]["deadzone"], 3500)

    def test_set_config(self):
        new_cfg = {
            "joystick": {
                "deadzone": 5555,
                "hysteresis": 2222
            }
        }
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            self.handler.handle_line(json.dumps({"cmd": "set_config", "config": new_cfg}))
        finally:
            sys.stdout = old_stdout

        resp = json.loads(buffer.getvalue().strip())
        self.assertEqual(resp["status"], "ok")
        self.assertEqual(self.engine.deadzone, 5555)
        self.assertEqual(self.engine.hysteresis, 2222)

    def test_monitor_toggle(self):
        self.assertFalse(self.handler.monitor_enabled)
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            self.handler.handle_line(json.dumps({"cmd": "monitor", "enable": True}))
        finally:
            sys.stdout = old_stdout

        self.assertTrue(self.handler.monitor_enabled)

if __name__ == '__main__':
    unittest.main()
