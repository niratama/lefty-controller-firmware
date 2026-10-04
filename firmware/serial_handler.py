"""
serial_handler.py: Web Serial API 連携およびCLIプロトコルハンドラ
改行区切りのJSONメッセージを送受信し、設定のホットリロード、
テレメトリ（ADC・ボタン・判定状態）のストリーミング、およびキャリブレーションを実行します。
"""

import sys
import json
import config_store

FIRMWARE_VERSION = "1.1.0"

class SerialHandler:
    def __init__(self, stick_engine, button_manager, config_path="config.json", on_config_updated=None):
        self.stick_engine = stick_engine
        self.button_manager = button_manager
        self.config_path = config_path
        self.on_config_updated = on_config_updated
        self.monitor_enabled = False
        self.buffer = ""

    def process_incoming_char(self, ch):
        """シリアルから1文字受信したときのバッファリング処理（下位互換性用）"""
        return self.process_incoming_text(ch)

    def process_incoming_text(self, text):
        """シリアルから受信したテキストチャンクを一括処理"""
        if not text:
            return None

        self.buffer += text
        if len(self.buffer) > 32768:  # 32KBバッファ溢れ防止
            self.buffer = ""
            return None

        last_res = None
        if '\n' in self.buffer or '\r' in self.buffer:
            lines = self.buffer.replace('\r', '\n').split('\n')
            self.buffer = lines[-1]  # 最後の未完了文字列をバッファに残す
            for line in lines[:-1]:
                line = line.strip()
                if line:
                    res = self.handle_line(line)
                    if res is not None:
                        last_res = res
        return last_res

    def handle_line(self, line):
        """1行のコマンド（JSONまたはプレーンテキスト）を解析して実行"""
        if not line:
            return None
        line = line.strip().strip('\x00').strip()
        if not line:
            return None

        msg = None
        try:
            msg = json.loads(line)
        except Exception:
            # 先頭や末尾にシリアル接続時のゴミ文字が付着していた場合、'{' 〜 '}' の抽出を試行
            s = line.find('{')
            e = line.rfind('}')
            if s != -1 and e != -1 and e > s:
                try:
                    msg = json.loads(line[s:e + 1])
                except Exception:
                    msg = None

        if msg is None:
            # プレーンテキストコマンドのサポート
            cmd = line.strip().lower()
            if cmd == "help":
                self.send_response({"status": "ok", "help": ["get_config", "set_config", "version", "calibrate", "monitor_on", "monitor_off"]})
            elif cmd == "version":
                self.send_response({"status": "ok", "cmd": "version", "version": FIRMWARE_VERSION})
            elif cmd == "calibrate":
                return self._cmd_calibrate()
            elif cmd == "monitor_on":
                self.monitor_enabled = True
                self.send_response({"status": "ok", "monitor": True})
            elif cmd == "monitor_off":
                self.monitor_enabled = False
                self.send_response({"status": "ok", "monitor": False})
            return None

        cmd = msg.get("cmd")
        if cmd == "get_config":
            return self._cmd_get_config()
        elif cmd == "set_config":
            return self._cmd_set_config(msg.get("config", {}))
        elif cmd == "version":
            self.send_response({"status": "ok", "cmd": "version", "version": FIRMWARE_VERSION})
        elif cmd == "calibrate":
            return self._cmd_calibrate()
        elif cmd == "monitor":
            self.monitor_enabled = bool(msg.get("enable", False))
            self.send_response({"status": "ok", "cmd": "monitor", "enabled": self.monitor_enabled})
        elif cmd == "reset_config":
            return self._cmd_reset_config()
        elif cmd == "ping":
            self.send_response({"status": "ok", "cmd": "pong", "version": FIRMWARE_VERSION})
        else:
            self.send_response({"status": "error", "message": f"Unknown command: {cmd}"})

    def _cmd_get_config(self):
        try:
            cfg = config_store.load_config(self.config_path)
            self.send_response({"status": "ok", "cmd": "get_config", "version": FIRMWARE_VERSION, "config": cfg})
        except Exception as e:
            self.send_response({"status": "error", "cmd": "get_config", "message": str(e)})

    def _cmd_set_config(self, new_config):
        # 1. スティックエンジンおよびキーマップ設定をホットリロード
        if self.on_config_updated:
            try:
                self.on_config_updated(new_config)
            except Exception as e:
                print(f"[WARN] on_config_updated failed: {e}")
                self.stick_engine.load_config(new_config)
        else:
            self.stick_engine.load_config(new_config)

        # 2. ストレージ & NVM (Flash) への永続保存
        saved_to_file, saved_to_nvm, warning_msg = config_store.save_config(new_config, self.config_path)

        resp = {
            "status": "ok",
            "cmd": "set_config",
            "version": FIRMWARE_VERSION,
            "saved_to_file": saved_to_file,
            "saved_to_nvm": saved_to_nvm
        }
        if warning_msg:
            resp["warning"] = warning_msg
        self.send_response(resp)

    def _cmd_calibrate(self):
        # 現在のADC値（未指定の場合は現在のセンター）を報告
        self.send_response({
            "status": "ok",
            "cmd": "calibrate",
            "center": [self.stick_engine.center_x, self.stick_engine.center_y]
        })

    def _cmd_reset_config(self):
        config_store.clear_nvm()
        default_cfg = {
            "active_profile": 0,
            "profiles": [
                {
                    "name": "プロファイル 1 (FPS/汎用)",
                    "keymap": {
                        "buttons": ["1", "2", "x", "e", "Tab", "f", "q", "4", "3", "Space", "z", "LCtrl", "LAlt"]
                    },
                    "joystick": {
                        "mode": "keyboard",
                        "mouse_speed": 12,
                        "deadzone": 2500,
                        "hysteresis": 1500,
                        "invert_x": False,
                        "invert_y": False,
                        "rotation": 90,
                        "directions": {
                            "up":    {"th_walk": 3000, "th_run": 26000, "key_walk": "W", "key_run": ["Shift", "W"]},
                            "down":  {"th_walk": 3000, "th_run": 26000, "key_walk": "S", "key_run": ["Shift", "S"]},
                            "left":  {"th_walk": 3000, "th_run": 26000, "key_walk": "A", "key_run": ["Shift", "A"]},
                            "right": {"th_walk": 3000, "th_run": 26000, "key_walk": "D", "key_run": ["Shift", "D"]}
                        }
                    }
                },
                {
                    "name": "プロファイル 2 (ゲームパッド)",
                    "keymap": {
                        "buttons": [
                            "Gamepad_1", "Gamepad_2", "Gamepad_3", "Gamepad_4",
                            "Gamepad_5", "Gamepad_6", "Gamepad_7", "Gamepad_8",
                            "Gamepad_9", "Gamepad_10", "Gamepad_11", "Gamepad_12", "Gamepad_13"
                        ]
                    },
                    "joystick": {
                        "mode": "gamepad",
                        "mouse_speed": 12,
                        "deadzone": 2500,
                        "hysteresis": 1500,
                        "invert_x": False,
                        "invert_y": False,
                        "rotation": 90,
                        "directions": {
                            "up":    {"th_walk": 3000, "th_run": 26000, "key_walk": "W", "key_run": ["Shift", "W"]},
                            "down":  {"th_walk": 3000, "th_run": 26000, "key_walk": "S", "key_run": ["Shift", "S"]},
                            "left":  {"th_walk": 3000, "th_run": 26000, "key_walk": "A", "key_run": ["Shift", "A"]},
                            "right": {"th_walk": 3000, "th_run": 26000, "key_walk": "D", "key_run": ["Shift", "D"]}
                        }
                    }
                },
                {
                    "name": "プロファイル 3 (マウス & 作業用)",
                    "keymap": {
                        "buttons": [
                            "Mouse_Left", "Mouse_Right", "Mouse_Middle", "Wheel_Up", "Wheel_Down",
                            ["LCtrl", "z"], ["LCtrl", "y"], ["LCtrl", "c"], ["LCtrl", "v"],
                            "Space", "Tab", "LCtrl", "LAlt"
                        ]
                    },
                    "joystick": {
                        "mode": "mouse",
                        "mouse_speed": 12,
                        "deadzone": 2500,
                        "hysteresis": 1500,
                        "invert_x": False,
                        "invert_y": False,
                        "rotation": 90,
                        "directions": {
                            "up":    {"th_walk": 3000, "th_run": 26000, "key_walk": "Up", "key_run": ["Shift", "Up"]},
                            "down":  {"th_walk": 3000, "th_run": 26000, "key_walk": "Down", "key_run": ["Shift", "Down"]},
                            "left":  {"th_walk": 3000, "th_run": 26000, "key_walk": "Left", "key_run": ["Shift", "Left"]},
                            "right": {"th_walk": 3000, "th_run": 26000, "key_walk": "Right", "key_run": ["Shift", "Right"]}
                        }
                    }
                }
            ],
            "keymap": {
                "buttons": ["1", "2", "x", "e", "Tab", "f", "q", "4", "3", "Space", "z", "LCtrl", "LAlt"]
            },
            "joystick": {
                "mode": "keyboard",
                "mouse_speed": 12,
                "deadzone": 2500,
                "hysteresis": 1500,
                "invert_x": False,
                "invert_y": False,
                "rotation": 90,
                "directions": {
                    "up":    {"th_walk": 3000, "th_run": 26000, "key_walk": "W", "key_run": ["Shift", "W"]},
                    "down":  {"th_walk": 3000, "th_run": 26000, "key_walk": "S", "key_run": ["Shift", "S"]},
                    "left":  {"th_walk": 3000, "th_run": 26000, "key_walk": "A", "key_run": ["Shift", "A"]},
                    "right": {"th_walk": 3000, "th_run": 26000, "key_walk": "D", "key_run": ["Shift", "D"]}
                }
            },
            "pins": {
                "buttons": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                "adc_x": 26,
                "adc_y": 27
            }
        }
        if self.on_config_updated:
            try:
                self.on_config_updated(default_cfg)
            except Exception:
                self.stick_engine.load_config(default_cfg)
        else:
            self.stick_engine.load_config(default_cfg)
        self.send_response({"status": "ok", "cmd": "reset_config", "version": FIRMWARE_VERSION, "config": default_cfg})

    def send_response(self, obj):
        try:
            line = json.dumps(obj)
            # USB CDC TX バッファのオーバーフローを防ぐため、128バイトごとに分割送信し flush
            chunk_size = 128
            for i in range(0, len(line), chunk_size):
                sys.stdout.write(line[i:i + chunk_size])
            sys.stdout.write("\n")
            if hasattr(sys.stdout, "flush"):
                sys.stdout.flush()
        except Exception as e:
            try:
                sys.stdout.write(f'{{"status":"error","message":"{e}"}}\n')
                if hasattr(sys.stdout, "flush"):
                    sys.stdout.flush()
            except Exception:
                pass

    def send_telemetry(self, raw_x, raw_y, debug_info, pressed_buttons):
        """モニタモード有効時にリアルタイムテレメトリを送信"""
        if not self.monitor_enabled:
            return
        payload = {
            "type": "telemetry",
            "raw": [raw_x, raw_y],
            "dx": debug_info["dx"],
            "dy": debug_info["dy"],
            "states": debug_info["states"],
            "keys": debug_info["active_keys"],
            "btns": pressed_buttons,
            "mode": debug_info.get("mode", "keyboard"),
            "gamepad": debug_info.get("gamepad", (0, 0)),
            "mouse": debug_info.get("mouse", (0, 0))
        }
        self.send_response(payload)
