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
from key_mapper import parse_keys, parse_key
from serial_handler import SerialHandler

try:
    import board
    import digitalio
    import analogio
    import usb_hid
    from adafruit_hid.keyboard import Keyboard
    import supervisor
    IS_CIRCUITPYTHON = True
except ImportError:
    IS_CIRCUITPYTHON = False

CONFIG_FILE = "config.json"

DEFAULT_CONFIG = {
    "keymap": {
        "buttons": [
            "1", "2", "x", "e", "Tab", "f", "q", "4", "3",
            "Space", "z", "LCtrl", "LAlt"
        ]
    },
    "joystick": {
        "deadzone": 4000,
        "hysteresis": 1500,
        "invert_x": False,
        "invert_y": True,
        "directions": {
            "up":    {"th_walk": 12000, "th_run": 26000, "key_walk": "W", "key_run": ["Shift", "W"]},
            "down":  {"th_walk": 12000, "th_run": 26000, "key_walk": "S", "key_run": ["Shift", "S"]},
            "left":  {"th_walk": 12000, "th_run": 26000, "key_walk": "A", "key_run": ["Shift", "A"]},
            "right": {"th_walk": 12000, "th_run": 26000, "key_walk": "D", "key_run": ["Shift", "D"]}
        }
    },
    "pins": {
        "buttons": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        "adc_x": 26,
        "adc_y": 27
    }
}

class LeftyController:
    def __init__(self):
        self.config = self.load_config()
        self.button_pins_def = self.config.get("pins", {}).get("buttons", list(range(13)))
        self.button_keymap = self.config.get("keymap", {}).get("buttons", [])

        # モジュール初期化
        self.stick_engine = StickEngine(self.config)
        self.button_manager = ButtonManager(self.button_pins_def, debounce_ms=10)
        self.serial_handler = SerialHandler(self.stick_engine, self.button_manager, CONFIG_FILE)

        # ハードウェアオブジェクト
        self.buttons_io = {}
        self.adc_x_io = None
        self.adc_y_io = None
        self.keyboard = None

        # 状態追跡用
        self.active_hid_keycodes = set()
        self.last_telemetry_time = 0.0

        self.init_hardware()

    def load_config(self):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return DEFAULT_CONFIG

    def init_hardware(self):
        if not IS_CIRCUITPYTHON:
            print("[INFO] PCシミュレーション環境で初期化しました。")
            return

        # 1. USB HID キーボード初期化
        try:
            self.keyboard = Keyboard(usb_hid.devices)
            print("[INFO] USB HID Keyboard 初期化完了")
        except Exception as e:
            print(f"[WARN] USB HID 初期化失敗: {e}")

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

        # 3. アナログスティックADC初期化 (GP26, GP27)
        adc_x_num = self.config.get("pins", {}).get("adc_x", 26)
        adc_y_num = self.config.get("pins", {}).get("adc_y", 27)
        px = getattr(board, f"GP{adc_x_num}", None)
        py = getattr(board, f"GP{adc_y_num}", None)
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
        """シリアルからの受信をノンブロッキングで処理"""
        if IS_CIRCUITPYTHON:
            try:
                if supervisor.runtime.serial_bytes_available:
                    ch = sys.stdin.read(1)
                    if ch:
                        self.serial_handler.process_incoming_char(ch)
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

        # 5. キーコードの合成
        desired_keycodes = set()

        # スティックキー (文字列 "W", "Shift" 等 -> Keycode)
        for k_str in stick_active_str_keys:
            c = parse_key(k_str)
            if c is not None:
                desired_keycodes.add(c)

        # ボタンキー
        # self.button_keymap はリスト ["1", "2", ..., "Space", ...]
        for idx, pin in enumerate(self.button_pins_def):
            if pin in pressed_pins and idx < len(self.button_keymap):
                key_def = self.button_keymap[idx]
                codes = parse_keys(key_def)
                for c in codes:
                    desired_keycodes.add(c)

        # 6. USB HID レポート送信
        self.update_hid_keys(desired_keycodes)

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
