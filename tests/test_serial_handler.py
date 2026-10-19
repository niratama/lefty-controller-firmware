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
        self.assertEqual(resp["version"], "1.9.0")
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
        self.assertEqual(resp["version"], "1.9.0")

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
        self.assertEqual(resp["version"], "1.9.0")

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

    def test_nvm_status_command(self):
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            self.handler.handle_line(json.dumps({"cmd": "nvm_status"}))
        finally:
            sys.stdout = old_stdout

        resp = json.loads(buffer.getvalue().strip())
        self.assertEqual(resp["status"], "ok")
        self.assertEqual(resp["cmd"], "nvm_status")
        self.assertIn("nvm", resp)
        self.assertIn("total", resp["nvm"])
        self.assertIn("used", resp["nvm"])
        self.assertIn("free", resp["nvm"])

    def test_calibrate_callback(self):
        calibrated = []
        def mock_calibrate():
            self.engine.set_center(31111, 32222)
            calibrated.append(True)

        self.handler.on_calibrate = mock_calibrate
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            self.handler.handle_line(json.dumps({"cmd": "calibrate"}))
        finally:
            sys.stdout = old_stdout

        resp = json.loads(buffer.getvalue().strip())
        self.assertEqual(len(calibrated), 1)
        self.assertEqual(resp["status"], "ok")
        self.assertEqual(resp["cmd"], "calibrate")
        self.assertEqual(resp["center"], [31111, 32222])

    def test_buffer_overflow_protection(self):
        # 32KB (32768 bytes) を超える改行なしデータが送り込まれた場合、バッファがリセットされメモリ枯渇を防ぐこと
        huge_payload = "A" * 33000
        self.handler.process_incoming_text(huge_payload)
        self.assertEqual(self.handler.buffer, "")

        # リセット後も正常に次のJSONコマンドを処理できること
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            self.handler.process_incoming_text(json.dumps({"cmd": "ping"}) + "\n")
        finally:
            sys.stdout = old_stdout
        resp = json.loads(buffer.getvalue().strip())
        self.assertEqual(resp["cmd"], "pong")

    def test_plain_text_cli_commands_and_unknown_cmd(self):
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            self.handler.handle_line("help")
            self.handler.handle_line("monitor_on")
            self.assertTrue(self.handler.monitor_enabled)
            self.handler.handle_line("monitor_off")
            self.assertFalse(self.handler.monitor_enabled)
            self.handler.handle_line(json.dumps({"cmd": "unknown_cmd_xyz"}))
        finally:
            sys.stdout = old_stdout

        lines = [json.loads(line) for line in buffer.getvalue().strip().split("\n") if line.strip()]
        self.assertEqual(len(lines), 4)
        self.assertIn("help", lines[0])
        self.assertEqual(lines[1]["monitor"], True)
        self.assertEqual(lines[2]["monitor"], False)
        self.assertEqual(lines[3]["status"], "error")
        self.assertIn("Unknown command", lines[3]["message"])

    def test_send_telemetry_and_error_json_escaping(self):
        _, _, _, debug_info = self.engine.process(32768, 32768)
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            # monitor_enabled=False のときは何も出力されない
            self.handler.monitor_enabled = False
            self.handler.send_telemetry(32768, 32768, debug_info, [0])
            self.assertEqual(buffer.getvalue(), "")

            # monitor_enabled=True のときはテレメトリJSONが出力される
            self.handler.monitor_enabled = True
            self.handler.send_telemetry(32768, 32768, debug_info, [0])

            # シリアライズ不能オブジェクトを渡した際も、例外文字列が安全にJSONエスケープされて出力されること
            class BadObj:
                pass
            self.handler.send_response({"bad": BadObj()})
        finally:
            sys.stdout = old_stdout

        lines = [json.loads(line) for line in buffer.getvalue().strip().split("\n") if line.strip()]
        self.assertEqual(len(lines), 2)
        self.assertEqual(lines[0]["type"], "telemetry")
        self.assertEqual(lines[0]["btns"], [0])
        self.assertEqual(lines[1]["status"], "error")

    def test_enter_maintenance_command(self):
        reboot_called = []
        handler = SerialHandler(self.engine, self.btn_mgr, on_reboot=lambda: reboot_called.append(True))
        
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            handler.handle_line(json.dumps({"cmd": "enter_maintenance"}))
        finally:
            sys.stdout = old_stdout

        resp = json.loads(buffer.getvalue().strip())
        self.assertEqual(resp["status"], "ok")
        self.assertEqual(resp["cmd"], "enter_maintenance")
        self.assertEqual(resp["version"], "1.9.0")
        self.assertEqual(len(reboot_called), 1)

    def test_reboot_command(self):
        reboot_called = []
        handler = SerialHandler(self.engine, self.btn_mgr, on_reboot=lambda: reboot_called.append(True))

        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            handler.handle_line(json.dumps({"cmd": "reboot"}))
        finally:
            sys.stdout = old_stdout

        resp = json.loads(buffer.getvalue().strip())
        self.assertEqual(resp["status"], "ok")
        self.assertEqual(resp["cmd"], "reboot")
        self.assertEqual(resp["version"], "1.9.0")
        self.assertEqual(len(reboot_called), 1)

    def test_maintenance_plaintext_command(self):
        reboot_called = []
        handler = SerialHandler(self.engine, self.btn_mgr, on_reboot=lambda: reboot_called.append(True))

        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            handler.handle_line("enter_maintenance")
        finally:
            sys.stdout = old_stdout

        resp = json.loads(buffer.getvalue().strip())
        self.assertEqual(resp["status"], "ok")
        self.assertEqual(resp["cmd"], "enter_maintenance")
        self.assertEqual(len(reboot_called), 1)

    def test_maintenance_boot_flag_nvm(self):
        import serial_handler
        class MockMC:
            def __init__(self):
                self.nvm = bytearray(4096)

        mock = MockMC()
        orig = serial_handler.microcontroller
        try:
            serial_handler.microcontroller = mock
            self.assertTrue(serial_handler.set_maintenance_boot_flag(True))
            self.assertEqual(bytes(mock.nvm[-4:]), b"MAIT")

            self.assertTrue(serial_handler.set_maintenance_boot_flag(False))
            self.assertEqual(bytes(mock.nvm[-4:]), b"\x00\x00\x00\x00")
        finally:
            serial_handler.microcontroller = orig

if __name__ == '__main__':
    unittest.main()

