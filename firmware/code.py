"""
code.py: 左手デバイス近代化改修ファームウェア メインプログラム (CircuitPython)
- 13個のボタンスイッチ (GP0〜GP12)
- 2軸アナログスティック (GP26, GP27) の多段階キー入力
- Web Serial API 連携 (設定変更・モニタリング)
"""

import time
import json
import sys

# 自作モジュール
from stick_engine import StickEngine
from debouncer import ButtonManager
from key_mapper import parse_keys, parse_key, parse_actions
from serial_handler import SerialHandler
import config_store

try:
    from hid_keyboard import NativeKeyboard
    from hid_mouse import NativeMouse
    from hid_gamepad import NativeGamepad
except ImportError:
    NativeKeyboard = None
    NativeMouse = None
    NativeGamepad = None

try:
    import board
    import digitalio
    import analogio
    import usb_hid
    import supervisor
    IS_CIRCUITPYTHON = True
except ImportError:
    IS_CIRCUITPYTHON = False

CONFIG_FILE = "config.json"

DEFAULT_CONFIG = {
    "version": "1.2.0",
    "active_profile": 0,
    "profiles": [
        {
            "name": "プロファイル 1 (FPS/汎用)",
            "keymap": {
                "buttons": [
                    "1", "2", "x", "e", "Tab", "f", "q", "4", "3",
                    "Space", "z", "LCtrl", "LAlt"
                ]
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
        "buttons": [
            "1", "2", "x", "e", "Tab", "f", "q", "4", "3",
            "Space", "z", "LCtrl", "LAlt"
        ]
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
}

# ハードウェア固有の物理ピン定義 (基板固定仕様 / プロファイル非依存)
HARDWARE_BUTTON_PINS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 9, 10, 12]
HARDWARE_ADC_X = 27
HARDWARE_ADC_Y = 26

class LeftyController:
    def __init__(self):
        self.config = self.load_config()
        self.button_pins_def = HARDWARE_BUTTON_PINS
        self.adc_x_num = HARDWARE_ADC_X
        self.adc_y_num = HARDWARE_ADC_Y
        self.button_keymap = []

        # モジュール初期化
        self.stick_engine = StickEngine()
        self.button_manager = ButtonManager(self.button_pins_def, debounce_ms=10)
        self.serial_handler = SerialHandler(
            self.stick_engine,
            self.button_manager,
            CONFIG_FILE,
            on_config_updated=self.apply_config
        )

        # 状態追跡用
        self.active_hid_keycodes = set()
        self.last_telemetry_time = 0.0

        # ハードウェアオブジェクト
        self.buttons_io = {}
        self.adc_x_io = None
        self.adc_y_io = None
        self.keyboard = None
        self.mouse = None
        self.gamepad = None

        # 設定適用 (active_profile の反映)
        self.apply_config(self.config)
        self.init_hardware()

    def apply_config(self, cfg):
        """プロファイルおよび各種設定を反映（ピン定義等のハードウェア情報はプロファイルから分離・固定）"""
        cfg, _ = config_store.sanitize_config(cfg)
        self.config = cfg

        # プロファイル / スティックエンジン反映
        if "profiles" in cfg and isinstance(cfg["profiles"], list) and len(cfg["profiles"]) > 0:
            act_idx = cfg.get("active_profile", 0)
            if not isinstance(act_idx, int) or act_idx < 0 or act_idx >= len(cfg["profiles"]):
                act_idx = 0
            cur_prof = cfg["profiles"][act_idx]
            self.button_keymap = cur_prof.get("keymap", {}).get("buttons", [])
            self.stick_engine.load_config(cur_prof.get("joystick", {}))
        else:
            self.button_keymap = cfg.get("keymap", {}).get("buttons", [])
            self.stick_engine.load_config(cfg.get("joystick", {}))

        # プロファイル切替時の残存キー・ボタンを安全に全解放
        if self.keyboard:
            try:
                self.keyboard.release_all()
            except Exception:
                pass
        self.active_hid_keycodes.clear()
        if self.mouse:
            try:
                self.mouse.release_all()
            except Exception:
                pass
        if self.gamepad:
            try:
                self.gamepad.reset_all()
            except Exception:
                pass

    def load_config(self):
        try:
            return config_store.load_config(CONFIG_FILE, DEFAULT_CONFIG)
        except Exception:
            return DEFAULT_CONFIG

    def init_hardware(self):
        if not IS_CIRCUITPYTHON:
            print("[INFO] PCシミュレーション環境で初期化しました。")
            return

        # 1. USB HID デバイス初期化 (Keyboard, Mouse, Gamepad)
        try:
            self.keyboard = NativeKeyboard(usb_hid.devices) if NativeKeyboard else None
            print("[INFO] USB HID Keyboard 初期化完了")
        except Exception as e:
            print(f"[WARN] USB HID Keyboard 初期化失敗: {e}")

        try:
            self.mouse = NativeMouse(usb_hid.devices) if NativeMouse else None
            print("[INFO] USB HID Mouse 初期化完了")
        except Exception as e:
            print(f"[WARN] USB HID Mouse 初期化失敗: {e}")

        try:
            self.gamepad = NativeGamepad(usb_hid.devices) if NativeGamepad else None
            print("[INFO] USB HID Gamepad 初期化完了")
        except Exception as e:
            print(f"[WARN] USB HID Gamepad 初期化失敗: {e}")

        # 2. ボタンGPIO初期化 (GP0〜GP12: 内部プルアップ / Active Low)
        for p in self.button_pins_def:
            pin_name = f"GP{p}"
            pin_obj = getattr(board, pin_name, None)
            if pin_obj:
                try:
                    dio = digitalio.DigitalInOut(pin_obj)
                    dio.direction = digitalio.Direction.INPUT
                    dio.pull = digitalio.Pull.UP
                    self.buttons_io[p] = dio
                except Exception as ex:
                    print(f"[WARN] ボタン {pin_name} 初期化失敗: {ex}")

        # 3. アナログスティックADC初期化 (GP27: X, GP26: Y)
        px = getattr(board, f"GP{self.adc_x_num}", None)
        py = getattr(board, f"GP{self.adc_y_num}", None)
        if px and py:
            try:
                self.adc_x_io = analogio.AnalogIn(px)
                self.adc_y_io = analogio.AnalogIn(py)
            except Exception as ex:
                print(f"[WARN] ADC初期化失敗: {ex}")

        # 4. ゼロ点自動キャリブレーション (起動時数十ms静止サンプリング)
        self.auto_calibrate(num_samples=40, delay=0.002)

    def auto_calibrate(self, num_samples=40, delay=0.002):
        if not (self.adc_x_io and self.adc_y_io):
            return
        samples_x = []
        samples_y = []
        for _ in range(num_samples):
            samples_x.append(self.adc_x_io.value)
            samples_y.append(self.adc_y_io.value)
            time.sleep(delay)
        cx, cy = self.stick_engine.calibrate(samples_x, samples_y)
        print(f"[INFO] スティック自動キャリブレーション完了: Center=({cx}, {cy})")

    def read_raw_inputs(self):
        if not IS_CIRCUITPYTHON:
            return {p: True for p in self.button_pins_def}, 32768, 32768

        # ボタン入力の読み出し (Active Low -> True: 離されている, False: 押されている)
        raw_btns = {p: self.buttons_io[p].value for p in self.button_pins_def if p in self.buttons_io}

        # ADC読み出し
        rx = self.adc_x_io.value if self.adc_x_io else 32768
        ry = self.adc_y_io.value if self.adc_y_io else 32768

        return raw_btns, rx, ry

    def check_serial_input(self):
        """シリアルからの受信をノンブロッキングで一括処理"""
        if IS_CIRCUITPYTHON:
            try:
                while supervisor.runtime.serial_bytes_available:
                    avail = supervisor.runtime.serial_bytes_available
                    chunk = sys.stdin.read(avail)
                    if chunk:
                        self.serial_handler.process_incoming_text(chunk)
                    else:
                        break
            except Exception:
                pass

    def update_hid_keys(self, desired_keycodes):
        """現在押されるべきキーコードセットと前回の差分をとり、press/releaseを発行"""
        if not self.keyboard:
            return

        to_press = desired_keycodes - self.active_hid_keycodes
        to_release = self.active_hid_keycodes - desired_keycodes

        # 先にreleaseを実行
        for code in to_release:
            try:
                self.keyboard.release(code)
            except Exception:
                pass

        # 次にpressを実行
        for code in to_press:
            try:
                self.keyboard.press(code)
            except Exception:
                pass

        self.active_hid_keycodes = desired_keycodes

    def run_cycle(self):
        now = time.monotonic()
        now_ms = now * 1000.0

        # 1. シリアル通信処理
        self.check_serial_input()

        # 2. ハードウェア読み出し
        raw_btns, rx, ry = self.read_raw_inputs()

        # 3. ボタンのデバウンス処理
        pressed_pins, just_pressed, just_released = self.button_manager.update(raw_btns, now_ms)

        # 4. スティック多段判定エンジンの実行
        stick_active_str_keys, _, _, debug_info = self.stick_engine.process(rx, ry)

        # 5. 各デバイス用アクションの合成
        desired_keycodes = set()
        desired_mouse_buttons = 0
        desired_mouse_wheel = 0
        desired_gamepad_buttons = 0

        # スティックからの入力
        if self.stick_engine.mode == "keyboard":
            for k_str in stick_active_str_keys:
                c = parse_key(k_str)
                if c is not None:
                    desired_keycodes.add(c)

        # ボタン入力のパース
        for idx, pin in enumerate(self.button_pins_def):
            if pin in pressed_pins and idx < len(self.button_keymap):
                key_def = self.button_keymap[idx]
                actions = parse_actions(key_def)
                for c in actions["keyboard"]:
                    desired_keycodes.add(c)
                desired_mouse_buttons |= actions["mouse_buttons"]
                desired_mouse_wheel += actions["mouse_wheel"]
                for b_num in actions["gamepad_buttons"]:
                    if 1 <= b_num <= 16:
                        desired_gamepad_buttons |= (1 << (b_num - 1))

        # 6. USB HID レポート送信
        # 6.1 キーボード送信
        self.update_hid_keys(desired_keycodes)

        # 6.2 マウス送信
        if self.mouse:
            mdx, mdy = debug_info.get("mouse", (0, 0)) if self.stick_engine.mode == "mouse" else (0, 0)
            self.mouse.update(desired_mouse_buttons, x=mdx, y=mdy, wheel=desired_mouse_wheel)

        # 6.3 ゲームパッド送信
        if self.gamepad:
            joy_x, joy_y = debug_info.get("gamepad", (0, 0)) if self.stick_engine.mode == "gamepad" else (0, 0)
            self.gamepad.update(desired_gamepad_buttons, x=joy_x, y=joy_y)

        # 7. テレメトリ送信（モニタ有効時、最大30Hz程度に制限）
        if self.serial_handler.monitor_enabled and (now - self.last_telemetry_time) >= 0.033:
            self.last_telemetry_time = now
            self.serial_handler.send_telemetry(rx, ry, debug_info, pressed_pins)

    def run_forever(self):
        print("[INFO] Lefty Controller メインループを開始します。")
        while True:
            try:
                self.run_cycle()
            except Exception as e:
                print(f"[ERROR in loop] {e}")
            time.sleep(0.002)  # 約500Hzポーリング


if __name__ == "__main__":
    try:
        controller = LeftyController()
        if IS_CIRCUITPYTHON:
            controller.run_forever()
        else:
            # PC上でのテスト実行（数サイクル実行してエラーがないか検証）
            print("[TEST] 10サイクルのシミュレーション実行を行います...")
            for _ in range(10):
                controller.run_cycle()
            print("[TEST] シミュレーション実行 正常終了")
    except Exception as e:
        print(f"[FATAL ERROR] {e}")
        while True:
            time.sleep(1)
