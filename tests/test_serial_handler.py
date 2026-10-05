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
        self.assertEqual(resp["version"], "1.2.0")
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

    def test_set_config_callback(self):
        called_with = []
        self.handler.on_config_updated = lambda cfg: called_with.append(cfg)

        cfg_with_profiles = {
            "active_profile": 1,
            "profiles": [
                {"name": "P1", "joystick": {"deadzone": 4000}},
                {"name": "P2", "joystick": {"deadzone": 6000}}
            ]
        }
        self.handler.handle_line(json.dumps({"cmd": "set_config", "config": cfg_with_profiles}))
        self.assertEqual(len(called_with), 1)
        self.assertEqual(called_with[0]["active_profile"], 1)

    def test_reset_config(self):
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            self.handler.handle_line(json.dumps({"cmd": "reset_config"}))
        finally:
            sys.stdout = old_stdout

        resp = json.loads(buffer.getvalue().strip())
        self.assertEqual(resp["status"], "ok")
        self.assertEqual(resp["cmd"], "reset_config")
        self.assertIn("profiles", resp["config"])
        self.assertEqual(len(resp["config"]["profiles"]), 3)

    def test_process_incoming_text_chunked(self):
        # チャンク分割されたシリアル入力が一括で正しく結合・処理されるかを検証
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            full_msg = json.dumps({"cmd": "ping"}) + "\n"
            # 2分割して送信
            chunk1 = full_msg[:5]
            chunk2 = full_msg[5:]
            self.handler.process_incoming_text(chunk1)
            self.handler.process_incoming_text(chunk2)
        finally:
            sys.stdout = old_stdout

        resp = json.loads(buffer.getvalue().strip())
        self.assertEqual(resp["status"], "ok")
        self.assertEqual(resp["cmd"], "pong")
        self.assertEqual(resp["version"], "1.2.0")

    def test_version_command(self):
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            self.handler.handle_line(json.dumps({"cmd": "version"}))
        finally:
            sys.stdout = old_stdout

        resp = json.loads(buffer.getvalue().strip())
        self.assertEqual(resp["status"], "ok")
        self.assertEqual(resp["cmd"], "version")
        self.assertEqual(resp["version"], "1.2.0")

    def test_garbage_prefixed_json(self):
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            # 接続過渡ノイズ等で先頭にゴミが付いたJSONの解析を検証
            self.handler.handle_line("\x00\x00noise! {\"cmd\": \"ping\"} trailing_noise\r\n")
        finally:
            sys.stdout = old_stdout

        resp = json.loads(buffer.getvalue().strip())
        self.assertEqual(resp["status"], "ok")
        self.assertEqual(resp["cmd"], "pong")

if __name__ == '__main__':
    unittest.main()
