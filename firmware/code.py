"""
code.py: 左手デバイス近代化改修ファームウェア メインプログラム (CircuitPython)
- 13個のボタンスイッチ (GP0〜GP12)
- 2軸アナログスティック (GP26, GP27) の多段階キー入力
- Web Serial API 連携 (設定変更・モニタリング)
- 自己診断 & ステータスLED (GP16 NeoPixel) 対応
"""

import time
import json
import sys

# 自作モジュール
from stick_engine import StickEngine
from debouncer import ButtonManager
from key_mapper import parse_keys, parse_key
from serial_handler import SerialHandler

# 実行環境の判定
IS_CIRCUITPYTHON = (getattr(sys, "implementation", None) is not None and 
                    getattr(sys.implementation, "name", "") == "circuitpython")

# --- 外部ライブラリ依存ゼロの内蔵ネイティブHIDキーボードドライバ ---
class NativeKeyboard:
    """
    標準 8バイト USB HID キーボードレポートを直接送信する軽量ドライバ。
    adafruit_hid フォルダが無くても CircuitPython 標準の usb_hid だけで動作します。
    """
    def __init__(self, devices=None):
        if devices is None and IS_CIRCUITPYTHON:
            devices = getattr(usb_hid, "devices", ())

        self._device = None
        if devices:
            for dev in devices:
                # Generic Desktop (0x01) / Keyboard (0x06)
                if getattr(dev, "usage_page", None) == 0x01 and getattr(dev, "usage", None) == 0x06:
                    self._device = dev
                    break

        if self._device is None and IS_CIRCUITPYTHON:
            raise ValueError("キーボードデバイスが未検出です。USB抜差しが必要です。")

        self.report = bytearray(8)
        self._pressed_keys = set()

    def press(self, *keycodes):
        for k in keycodes:
            self._pressed_keys.add(k)
        self._send()

    def release(self, *keycodes):
        for k in keycodes:
            self._pressed_keys.discard(k)
        self._send()

    def release_all(self):
        self._pressed_keys.clear()
        self._send()

    def _send(self):
        if self._device is None:
            return

        for i in range(8):
            self.report[i] = 0

        modifier_byte = 0
        regular_keys = []

        for code in self._pressed_keys:
            if 0xE0 <= code <= 0xE7:
                modifier_byte |= (1 << (code - 0xE0))
            else:
                regular_keys.append(code)

        self.report[0] = modifier_byte
        for idx, k in enumerate(regular_keys[:6]):
            self.report[2 + idx] = k

        try:
            self._device.send_report(self.report)
        except Exception:
            pass


KeyboardClass = NativeKeyboard

# CircuitPython モジュールのインポート
if IS_CIRCUITPYTHON:
    import board
    import digitalio
    import analogio
    import usb_hid

    try:
        import usb_cdc
    except ImportError:
        usb_cdc = None

    # adafruit_hid が利用可能ならそちらを優先、なければ NativeKeyboard を使用
    try:
        from adafruit_hid.keyboard import Keyboard as _Kbd
        KeyboardClass = _Kbd
    except Exception:
        KeyboardClass = NativeKeyboard

    try:
        import neopixel
        pixel = neopixel.NeoPixel(board.GP16, 1, brightness=0.2)
    except Exception:
        pixel = None
else:
    pixel = None
    usb_cdc = None

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

def set_led(color):
    """オンボードRGB LED (GP16) の色を設定 (R, G, B)"""
    if pixel:
        try:
            pixel[0] = color
        except Exception:
            pass

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
        except Exception as e:
            print(f"[WARN] config.json 読み込み失敗、デフォルト値を使用: {e}")
            return DEFAULT_CONFIG

    def init_hardware(self):
        if not IS_CIRCUITPYTHON:
            print("[INFO] PCシミュレーション環境で初期化しました。")
            return

        print("\n==========================================")
        print("  Lefty Controller Firmware (RP2040-Zero) ")
        print("==========================================")

        # 1. USB HID キーボード初期化
        if KeyboardClass is None:
            print("[ERROR] キーボードドライバをロードできませんでした。")
            set_led((255, 0, 0))  # 赤点灯
            return

        try:
            self.keyboard = KeyboardClass(usb_hid.devices)
            print("[INFO] USB HID Keyboard 初期化成功！キー入力が有効です。")
            set_led((0, 255, 0))  # 緑点灯 (正常稼働)
        except Exception as e:
            print(f"[WARN] USB HID Keyboard 初期化待ち: {e}")
            print("       【重要】boot.pyのHID有効化を反映するため、")
            print("       USBケーブルを一度PCから抜いて挿し直してください！")
            set_led((255, 120, 0))  # オレンジ点灯 (USB抜差し待ち)

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
                print(f"[INFO] ADC初期化成功: X=GP{adc_x_num}, Y=GP{adc_y_num}")
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
        """シリアルからの受信を完全ノンブロッキングで処理"""
        if not IS_CIRCUITPYTHON:
            return

        # 1. usb_cdc によるノンブロッキング受信 (推奨)
        if usb_cdc and usb_cdc.console:
            try:
                n = usb_cdc.console.in_waiting
                if n > 0:
                    data = usb_cdc.console.read(n)
                    for b in data:
                        self.serial_handler.process_incoming_char(chr(b))
            except Exception:
                pass
            return

        # 2. supervisor によるフォールバック
        try:
            import supervisor
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
        print("[INFO] Lefty Controller メインループを開始しました。")
        while True:
            self.run_cycle()
            time.sleep(0.002)  # 約500Hzポーリング


if __name__ == "__main__":
    controller = LeftyController()
    if IS_CIRCUITPYTHON:
        controller.run_forever()
    else:
        # PC上でのテスト実行（数サイクル実行してエラーがないか検証）
        print("[TEST] 10サイクルのシミュレーション実行を行います...")
        for _ in range(10):
            controller.run_cycle()
        print("[TEST] シミュレーション実行 正常終了")
