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
from key_mapper import parse_keys, parse_key, parse_actions, parse_button_def, parse_combos
from serial_handler import SerialHandler
from led_indicator import LedIndicator
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
    "version": "1.6.0",
    "active_profile": 0,
    "profiles": [
        {
            "id": "prof_fps_default",
            "name": "プロファイル 1 (FPS/汎用)",
            "color": "#008cff",
            "keymap": {
                "buttons": [
                    "1", "2", "x", "e", "Tab", "f", "q", "4", "3",
                    "Space", "z", "LCtrl", "LAlt"
                ],
                "combos": [
                    {"buttons": [9, 11], "action": "profile_next", "hold_ms": 600}
                ]
            },
            "joystick": {
                "mode": "keyboard",
                "enable_run": True,
                "gamepad_target": "left_stick",
                "dpad_walk_btn": "",
                "dpad_run_btn": "Gamepad_2",
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
            "id": "prof_gamepad_default",
            "name": "プロファイル 2 (ゲームパッド)",
            "color": "#00ff3c",
            "keymap": {
                "buttons": [
                    "Gamepad_1", "Gamepad_2", "Gamepad_3", "Gamepad_4",
                    "Gamepad_5", "Gamepad_6", "Gamepad_7", "Gamepad_8",
                    "Gamepad_9", "Gamepad_10", "Gamepad_11", "Gamepad_12", "Gamepad_13"
                ]
            },
            "joystick": {
                "mode": "gamepad",
                "enable_run": True,
                "gamepad_target": "left_stick",
                "dpad_walk_btn": "",
                "dpad_run_btn": "Gamepad_2",
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
            "id": "prof_mouse_default",
            "name": "プロファイル 3 (マウス & 作業用)",
            "color": "#b400ff",
            "keymap": {
                "buttons": [
                    "Mouse_Left", "Mouse_Right", "Mouse_Middle", "Wheel_Up", "Wheel_Down",
                    ["LCtrl", "z"], ["LCtrl", "y"], ["LCtrl", "c"], ["LCtrl", "v"],
                    "Space", "Tab", "LCtrl", "LAlt"
                ]
            },
            "joystick": {
                "mode": "mouse",
                "enable_run": True,
                "gamepad_target": "left_stick",
                "dpad_walk_btn": "",
                "dpad_run_btn": "Gamepad_2",
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
        "enable_run": True,
        "gamepad_target": "left_stick",
        "dpad_walk_btn": "",
        "dpad_run_btn": "Gamepad_2",
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
        self.button_defs = []
        self.fn_button_defs = []
        self.combos = []
        self.tap_hold_states = {}
        self.combo_states = {}

        # モジュール初期化
        self.stick_engine = StickEngine()
        self.button_manager = ButtonManager(self.button_pins_def, debounce_ms=10)
        self.led = LedIndicator()
        self.serial_handler = SerialHandler(
            self.stick_engine,
            self.button_manager,
            CONFIG_FILE,
            on_config_updated=self.apply_config,
            on_calibrate=self.auto_calibrate
        )

        # 状態追跡用
        self.active_hid_keycodes = set()
        self.boot_held_pins = set()
        self.last_telemetry_time = 0.0

        # ハードウェアオブジェクト
        self.buttons_io = {}
        self.adc_x_io = None
        self.adc_y_io = None
        self.keyboard = None
        self.mouse = None
        self.gamepad = None

        # ハードウェア初期化 & 設定適用 (active_profile の反映)
        self.init_hardware()
        self.apply_config(self.config)

    def release_all_hid(self):
        """全HIDデバイス（キーボード・マウス・ゲームパッド）の押下状態を安全に全解放"""
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
            raw_buttons = cur_prof.get("keymap", {}).get("buttons", [])
            raw_fn = cur_prof.get("keymap", {}).get("fn_buttons", [])
            raw_combos = cur_prof.get("keymap", {}).get("combos", [])

            self.button_keymap = raw_buttons
            self.button_defs = [parse_button_def(b) for b in raw_buttons]
            self.fn_button_defs = [parse_button_def(b) for b in raw_fn]
            self.combos = parse_combos(raw_combos)

            self.stick_engine.load_config(cur_prof.get("joystick", {}))
            if hasattr(self, "led") and self.led:
                if "led_order" in cfg:
                    self.led.set_pixel_order(cfg["led_order"])
                self.led.set_profile(act_idx, cur_prof.get("color"), flash=True)
        else:
            raw_buttons = cfg.get("keymap", {}).get("buttons", [])
            raw_fn = cfg.get("keymap", {}).get("fn_buttons", [])
            raw_combos = cfg.get("keymap", {}).get("combos", [])

            self.button_keymap = raw_buttons
            self.button_defs = [parse_button_def(b) for b in raw_buttons]
            self.fn_button_defs = [parse_button_def(b) for b in raw_fn]
            self.combos = parse_combos(raw_combos)

            self.stick_engine.load_config(cfg.get("joystick", {}))
            if hasattr(self, "led") and self.led:
                self.led.set_profile(0, flash=True)

        self.tap_hold_states.clear()
        self.combo_states.clear()

        # プロファイル切替・初期化時の残存キー・ボタンを安全に全解放
        self.release_all_hid()

    def handle_profile_action(self, action_str):
        """プロファイル切り替えアクションの処理 (RAM上で即時切り替え、Flash書き込みなし)"""
        profiles = self.config.get("profiles", [])
        if not profiles or not isinstance(profiles, list) or len(profiles) <= 1:
            return

        cur_idx = self.config.get("active_profile", 0)
        target_idx = cur_idx

        if action_str == "next":
            target_idx = (cur_idx + 1) % len(profiles)
        elif action_str == "prev":
            target_idx = (cur_idx - 1 + len(profiles)) % len(profiles)
        elif action_str == "default":
            target_idx = 0
        elif action_str.startswith("switch:"):
            target_id = action_str.split(":", 1)[1]
            found = False
            for i, p in enumerate(profiles):
                if p.get("id") == target_id or p.get("name") == target_id:
                    target_idx = i
                    found = True
                    break
            if not found:
                print(f"[WARN] プロファイルID '{target_id}' がデバイス内に見つかりません")
                return

        if target_idx != cur_idx:
            self.switch_to_profile(target_idx)

    def switch_to_profile(self, target_idx):
        """RAM上でプロファイルを切り替え、LEDフラッシュ & シリアル通知"""
        profiles = self.config.get("profiles", [])
        if target_idx < 0 or target_idx >= len(profiles):
            return

        self.config["active_profile"] = target_idx
        self.apply_config(self.config)

        cur_prof = profiles[target_idx]
        prof_name = cur_prof.get("name", f"Profile {target_idx + 1}")
        prof_id = cur_prof.get("id", "")
        print(f"[INFO] プロファイル切替 -> [{target_idx}] {prof_name} (ID: {prof_id})")

        # シリアル接続があればイベント通知
        if hasattr(self, "serial_handler") and self.serial_handler:
            self.serial_handler.send_response({
                "type": "profile_switched",
                "active_profile": target_idx,
                "id": prof_id,
                "name": prof_name
            })

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

        # 起動・リロード直後に残存HID入力を即座に全解放
        self.release_all_hid()

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

        # 5. 起動直後のHID全解放 & 起動時押しっぱなしボタンのラッチ記録
        self.release_all_hid()
        self.record_boot_held_pins()

    def record_boot_held_pins(self):
        """起動時にすでに押下されているボタンを記録（一度離されるまで入力を無効化）"""
        raw_btns, _, _ = self.read_raw_inputs()
        self.boot_held_pins = {p for p, val in raw_btns.items() if not val}
        if self.boot_held_pins:
            print(f"[INFO] 起動時押下ボタンを検出 (一度離すまで出力抑制): {sorted(list(self.boot_held_pins))}")

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
        """シリアルからの受信をノンブロッキングで一括処理 (Ctrl-C による REPL 脱出を防止)"""
        if IS_CIRCUITPYTHON:
            try:
                while supervisor.runtime.serial_bytes_available:
                    avail = supervisor.runtime.serial_bytes_available
                    chunk = sys.stdin.read(avail)
                    if chunk:
                        self.serial_handler.process_incoming_text(chunk)
                    else:
                        break
            except (Exception, KeyboardInterrupt):
                pass

    def update_hid_keys(self, desired_keycodes):
        """現在押されるべきキーコードセットと前回の差分をとり、press/releaseを発行"""
        if not self.keyboard:
            return

        to_press = desired_keycodes - self.active_hid_keycodes
        to_release = self.active_hid_keycodes - desired_keycodes

        # 先にreleaseを一括実行（USB busy等で失敗した場合はactive_hid_keycodesを維持して次サイクルで再試行）
        if to_release:
            try:
                self.keyboard.release(*to_release)
                self.active_hid_keycodes -= to_release
            except Exception:
                return

        # 次にpressを一括実行
        if to_press:
            try:
                self.keyboard.press(*to_press)
                self.active_hid_keycodes |= to_press
            except Exception:
                return

    def run_cycle(self):
        now = time.monotonic()
        now_ms = now * 1000.0

        # 0. オンボードRGB LED更新 (非ブロッキングパルス点滅)
        if hasattr(self, "led") and self.led:
            self.led.update()

        # 1. シリアル通信処理
        self.check_serial_input()

        # 2. ハードウェア読み出し
        raw_btns, rx, ry = self.read_raw_inputs()

        # 2.1 起動時（メンテナンスモード突入時など）から押しっぱなしのボタンは一度離されるまで無視
        if self.boot_held_pins:
            for p in list(self.boot_held_pins):
                if raw_btns.get(p, True):
                    self.boot_held_pins.discard(p)
                else:
                    raw_btns[p] = True

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
        elif self.stick_engine.mode == "gamepad":
            # DPAD / Gamepad Walk/Run 連動ボタンの追加
            gp_stage = debug_info.get("gamepad_stage", "neutral")
            run_or_walk_btn = ""
            if gp_stage == "walk":
                run_or_walk_btn = getattr(self.stick_engine, "dpad_walk_btn", "")
            elif gp_stage == "run":
                run_or_walk_btn = getattr(self.stick_engine, "dpad_run_btn", "")

            if run_or_walk_btn:
                actions = parse_actions(run_or_walk_btn)
                for c in actions["keyboard"]:
                    desired_keycodes.add(c)
                desired_mouse_buttons |= actions["mouse_buttons"]
                desired_mouse_wheel += actions["mouse_wheel"]
                for b_num in actions["gamepad_buttons"]:
                    if 1 <= b_num <= 16:
                        desired_gamepad_buttons |= (1 << (b_num - 1))

        # 5. 高度入力エンジン (Combo / Fnレイヤー / Tap-Hold / 通常入力)
        masked_pins = set()

        # 5.1 Combo (同時押し) の判定
        for c_idx, combo in enumerate(self.combos):
            combo_pins = [
                self.button_pins_def[b]
                for b in combo["buttons"]
                if isinstance(b, int) and 0 <= b < len(self.button_pins_def)
            ]
            if len(combo_pins) < 2:
                continue

            all_pressed = all(p in pressed_pins for p in combo_pins)
            state = self.combo_states.get(c_idx, {"start": None, "triggered": False})

            if all_pressed:
                if state["start"] is None:
                    state["start"] = now
                    state["triggered"] = False

                duration_ms = (now - state["start"]) * 1000.0
                if duration_ms >= combo["hold_ms"]:
                    if not state["triggered"]:
                        state["triggered"] = True
                        for pact in combo["actions"].get("profile_actions", []):
                            self.handle_profile_action(pact)

                    for c in combo["actions"]["keyboard"]:
                        desired_keycodes.add(c)
                    desired_mouse_buttons |= combo["actions"]["mouse_buttons"]
                    desired_mouse_wheel += combo["actions"]["mouse_wheel"]
                    for b_num in combo["actions"]["gamepad_buttons"]:
                        if 1 <= b_num <= 16:
                            desired_gamepad_buttons |= (1 << (b_num - 1))

                # コンボ構成ピンの通常入力をマスク (誤爆防止)
                for p in combo_pins:
                    masked_pins.add(p)

                self.combo_states[c_idx] = state
            else:
                if c_idx in self.combo_states:
                    del self.combo_states[c_idx]

        # 5.2 Fn レイヤー (Layer) の判定
        is_fn_active = False
        for idx, pin in enumerate(self.button_pins_def):
            if pin in pressed_pins and pin not in masked_pins and idx < len(self.button_defs):
                b_def = self.button_defs[idx]
                layers = b_def["actions"].get("layer_actions", [])
                if "fn" in layers:
                    is_fn_active = True
                    masked_pins.add(pin)

        active_defs = self.fn_button_defs if (is_fn_active and self.fn_button_defs) else self.button_defs

        # 5.3 各ボタンの Tap-Hold & 通常入力のパース
        pending_tap_actions = []
        for idx, pin in enumerate(self.button_pins_def):
            if pin in masked_pins or idx >= len(active_defs):
                if pin in just_released and pin in self.tap_hold_states:
                    del self.tap_hold_states[pin]
                continue

            b_def = active_defs[idx]

            if not b_def["is_tap_hold"]:
                # --- 通常入力 (レイテンシ 0ms) ---
                if pin in just_pressed:
                    for pact in b_def["actions"].get("profile_actions", []):
                        self.handle_profile_action(pact)

                if pin in pressed_pins:
                    for c in b_def["actions"]["keyboard"]:
                        desired_keycodes.add(c)
                    desired_mouse_buttons |= b_def["actions"]["mouse_buttons"]
                    desired_mouse_wheel += b_def["actions"]["mouse_wheel"]
                    for b_num in b_def["actions"]["gamepad_buttons"]:
                        if 1 <= b_num <= 16:
                            desired_gamepad_buttons |= (1 << (b_num - 1))
            else:
                # --- Tap-Hold (短押し vs 長押し) ---
                th_state = self.tap_hold_states.get(pin, {"start": None, "held": False})

                if pin in just_pressed:
                    th_state["start"] = now
                    th_state["held"] = False
                    self.tap_hold_states[pin] = th_state

                if pin in pressed_pins and th_state["start"] is not None:
                    duration_ms = (now - th_state["start"]) * 1000.0
                    if duration_ms >= b_def["hold_ms"]:
                        if not th_state["held"]:
                            th_state["held"] = True
                            for pact in b_def["hold_actions"].get("profile_actions", []):
                                self.handle_profile_action(pact)

                        for c in b_def["hold_actions"]["keyboard"]:
                            desired_keycodes.add(c)
                        desired_mouse_buttons |= b_def["hold_actions"]["mouse_buttons"]
                        desired_mouse_wheel += b_def["hold_actions"]["mouse_wheel"]
                        for b_num in b_def["hold_actions"]["gamepad_buttons"]:
                            if 1 <= b_num <= 16:
                                desired_gamepad_buttons |= (1 << (b_num - 1))

                if pin in just_released:
                    if th_state["start"] is not None and not th_state["held"]:
                        # 短押し (Tap) 成立！
                        for pact in b_def["tap_actions"].get("profile_actions", []):
                            self.handle_profile_action(pact)
                        pending_tap_actions.append(b_def["tap_actions"])

                    if pin in self.tap_hold_states:
                        del self.tap_hold_states[pin]

        # 6. USB HID レポート送信
        # 6.1 キーボード送信
        self.update_hid_keys(desired_keycodes)

        # 6.2 マウス送信
        if self.mouse:
            mdx, mdy = debug_info.get("mouse", (0, 0)) if self.stick_engine.mode == "mouse" else (0, 0)
            self.mouse.update(desired_mouse_buttons, x=mdx, y=mdy, wheel=desired_mouse_wheel)

        # 6.3 ゲームパッド送信
        if self.gamepad:
            if self.stick_engine.mode == "gamepad":
                gp_data = debug_info.get("gamepad", (0, 0, 0, 0, 0))
                if len(gp_data) == 5:
                    gx, gy, gz, grz, ghat = gp_data
                else:
                    gx, gy = gp_data[0], gp_data[1]
                    gz, grz, ghat = 0, 0, 0
            else:
                gx, gy, gz, grz, ghat = 0, 0, 0, 0, 0
            self.gamepad.update(desired_gamepad_buttons, x=gx, y=gy, z=gz, rz=grz, hat=ghat)

        # 6.4 Tap-Hold 短押し成立アクションのパルス送出（他ボタンで押下中のキー・ボタンは維持）
        for tap_act in pending_tap_actions:
            tap_k = [k for k in tap_act["keyboard"] if k not in desired_keycodes]
            if tap_k and self.keyboard:
                try:
                    self.keyboard.press(*tap_k)
                    time.sleep(0.008)
                    self.keyboard.release(*tap_k)
                except Exception:
                    pass
            tap_m = tap_act["mouse_buttons"] & ~desired_mouse_buttons
            if tap_m and self.mouse:
                try:
                    self.mouse.press(tap_m)
                    time.sleep(0.008)
                    self.mouse.release(tap_m)
                except Exception:
                    pass
            if tap_act["mouse_wheel"] and self.mouse:
                try:
                    self.mouse.move(wheel=tap_act["mouse_wheel"])
                except Exception:
                    pass
            tap_gp = [
                b_num for b_num in tap_act["gamepad_buttons"]
                if 1 <= b_num <= 16 and not (desired_gamepad_buttons & (1 << (b_num - 1)))
            ]
            if tap_gp and self.gamepad:
                try:
                    self.gamepad.press_buttons(*tap_gp)
                    time.sleep(0.008)
                    self.gamepad.release_buttons(*tap_gp)
                except Exception:
                    pass

        # 7. テレメトリ送信（モニタ有効時、最大30Hz程度に制限）
        if self.serial_handler.monitor_enabled and (now - self.last_telemetry_time) >= 0.033:
            self.last_telemetry_time = now
            self.serial_handler.send_telemetry(rx, ry, debug_info, pressed_pins)

    def _is_autoreload_enabled(self):
        """メンテナンスモード等で自動リロードが有効かどうかを返す"""
        if not IS_CIRCUITPYTHON:
            return False
        try:
            return bool(getattr(supervisor.runtime, "autoreload", False))
        except Exception:
            return False

    def run_forever(self):
        print("[INFO] Lefty Controller メインループを開始します。")
        while True:
            try:
                self.run_cycle()
                time.sleep(0.002)  # 約500Hzポーリング
            except KeyboardInterrupt:
                self.release_all_hid()
                if self._is_autoreload_enabled():
                    print("[INFO] KeyboardInterrupt によりメインループを終了します。")
                    break
            except Exception as e:
                print(f"[ERROR in loop] {e}")
                try:
                    time.sleep(0.002)
                except KeyboardInterrupt:
                    self.release_all_hid()
                    if self._is_autoreload_enabled():
                        break


if __name__ == "__main__":
    controller = None
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
    except KeyboardInterrupt:
        if controller is not None:
            controller.release_all_hid()
        if IS_CIRCUITPYTHON and not getattr(supervisor.runtime, "autoreload", False):
            while True:
                try:
                    time.sleep(1)
                except KeyboardInterrupt:
                    pass
    except Exception as e:
        print(f"[FATAL ERROR] {e}")
        if controller is not None:
            controller.release_all_hid()
        while True:
            try:
                time.sleep(1)
            except KeyboardInterrupt:
                pass

