import unittest
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from key_mapper import parse_button_def, parse_combos, Keycode

class MockKeyboard:
    def __init__(self):
        self.pressed = set()
        self.press_history = []
        self.release_history = []
        self.release_all_count = 0

    def press(self, *keys):
        for k in keys:
            self.pressed.add(k)
            self.press_history.append(k)

    def release(self, *keys):
        for k in keys:
            self.pressed.discard(k)
            self.release_history.append(k)

    def release_all(self):
        self.pressed.clear()
        self.release_all_count += 1


class MockMouse:
    def __init__(self):
        self.buttons = 0
        self.last_move = (0, 0, 0)
        self.press_history = []
        self.release_history = []
        self.release_all_count = 0

    def update(self, buttons, x=0, y=0, wheel=0):
        self.buttons = buttons
        self.last_move = (x, y, wheel)

    def press(self, buttons):
        self.buttons |= buttons
        self.press_history.append(buttons)

    def release(self, buttons):
        self.buttons &= ~buttons
        self.release_history.append(buttons)

    def move(self, x=0, y=0, wheel=0):
        self.last_move = (x, y, wheel)

    def release_all(self):
        self.buttons = 0
        self.release_all_count += 1


class MockGamepad:
    def __init__(self):
        self.buttons = 0
        self.axes = (0, 0, 0, 0, 0)
        self.press_history = []
        self.release_history = []
        self.reset_all_count = 0

    def update(self, buttons, x=0, y=0, z=0, rz=0, hat=0):
        self.buttons = buttons
        self.axes = (x, y, z, rz, hat)

    def press_buttons(self, *buttons):
        for b in buttons:
            self.buttons |= (1 << (b - 1))
            self.press_history.append(b)

    def release_buttons(self, *buttons):
        for b in buttons:
            self.buttons &= ~(1 << (b - 1))
            self.release_history.append(b)

    def reset_all(self):
        self.buttons = 0
        self.axes = (0, 0, 0, 0, 0)
        self.reset_all_count += 1


class TestAdvancedInputLogic(unittest.TestCase):
    def test_tap_hold_parsing(self):
        # 形式1: 通常
        b1 = parse_button_def("A")
        self.assertFalse(b1["is_tap_hold"])
        self.assertEqual(b1["actions"]["keyboard"], [Keycode.A])

        # 形式2: Tap-Hold 文字列
        b2 = parse_button_def("tap:Space|hold:LCtrl|ms:250")
        self.assertTrue(b2["is_tap_hold"])
        self.assertEqual(b2["hold_ms"], 250)
        self.assertEqual(b2["tap_actions"]["keyboard"], [Keycode.SPACEBAR])
        self.assertEqual(b2["hold_actions"]["keyboard"], [Keycode.LEFT_CONTROL])

        # 形式3: Tap-Hold 辞書
        b3 = parse_button_def({"tap": "E", "hold": "F", "hold_ms": 400})
        self.assertTrue(b3["is_tap_hold"])
        self.assertEqual(b3["hold_ms"], 400)
        self.assertEqual(b3["tap_actions"]["keyboard"], [Keycode.E])
        self.assertEqual(b3["hold_actions"]["keyboard"], [Keycode.F])

    def test_layer_fn_parsing(self):
        b1 = parse_button_def("layer:fn")
        self.assertFalse(b1["is_tap_hold"])
        self.assertEqual(b1["actions"]["layer_actions"], ["fn"])

        b2 = parse_button_def("fn")
        self.assertFalse(b2["is_tap_hold"])
        self.assertEqual(b2["actions"]["layer_actions"], ["fn"])

    def test_tap_hold_profile_action(self):
        b = parse_button_def("tap:1|hold:profile_next|ms:500")
        self.assertTrue(b["is_tap_hold"])
        self.assertEqual(b["hold_ms"], 500)
        self.assertEqual(b["tap_actions"]["keyboard"], [Keycode.ONE])
        self.assertEqual(b["hold_actions"]["profile_actions"], ["next"])

    def test_combo_parsing(self):
        combos = [
            {"buttons": [9, 11], "action": "profile_next", "hold_ms": 600},
            {"buttons": [0, 1], "action": "Escape", "hold_ms": 0},
            {"buttons": [2, 3], "action": "profile_switch:1"}
        ]
        parsed = parse_combos(combos)
        self.assertEqual(len(parsed), 3)
        self.assertEqual(parsed[0]["buttons"], [9, 11])
        self.assertEqual(parsed[0]["hold_ms"], 600)
        self.assertEqual(parsed[0]["actions"]["profile_actions"], ["next"])
        self.assertEqual(parsed[1]["buttons"], [0, 1])
        self.assertEqual(parsed[1]["actions"]["keyboard"], [Keycode.ESCAPE])
        self.assertEqual(parsed[2]["actions"]["profile_actions"], ["switch:1"])
        self.assertEqual(parsed[2]["hold_ms"], 0) # default hold_ms is 0 if omitted

    def test_invalid_combo(self):
        # Empty list or non-list
        self.assertEqual(parse_combos(None), [])
        self.assertEqual(parse_combos([]), [])
        # Malformed entries
        self.assertEqual(parse_combos([{"buttons": [1]}]), []) # buttons != 2
        self.assertEqual(parse_combos([{"action": "profile_next"}]), []) # no buttons
        # Out-of-range, negative, or non-integer button indices
        self.assertEqual(parse_combos([{"buttons": [-1, 5], "action": "Escape"}]), [])
        self.assertEqual(parse_combos([{"buttons": [0, 99], "action": "Escape"}]), [])
        self.assertEqual(parse_combos([{"buttons": ["bad", "idx"], "action": "Escape"}]), [])
        # Duplicate indices should be deduplicated and rejected if < 2 unique buttons
        self.assertEqual(parse_combos([{"buttons": [3, 3], "action": "Escape"}]), [])
        # Non-numeric hold_ms should fallback safely
        res = parse_combos([{"buttons": [0, 1], "action": "Escape", "hold_ms": "invalid"}])
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["hold_ms"], 0)
        b_th = parse_button_def({"tap": "A", "hold": "B", "hold_ms": "invalid"})
        self.assertTrue(b_th["is_tap_hold"])
        self.assertEqual(b_th["hold_ms"], 300)


from unittest.mock import patch
import code as firmware_code


class TestLeftyControllerIntegration(unittest.TestCase):
    def setUp(self):
        self.current_time = 10.0
        self.raw_btns = {p: True for p in firmware_code.HARDWARE_BUTTON_PINS}
        self.rx = 32768
        self.ry = 32768

        self.time_patcher = patch("code.time.monotonic", side_effect=lambda: self.current_time)
        self.sleep_patcher = patch("code.time.sleep", side_effect=lambda s: None)
        self.time_patcher.start()
        self.sleep_patcher.start()

        self.ctrl = firmware_code.LeftyController()
        self.ctrl.keyboard = MockKeyboard()
        self.ctrl.mouse = MockMouse()
        self.ctrl.gamepad = MockGamepad()
        self.ctrl.read_raw_inputs = lambda: (dict(self.raw_btns), self.rx, self.ry)

    def tearDown(self):
        self.time_patcher.stop()
        self.sleep_patcher.stop()

    def _step(self, dt_sec=0.015):
        """デバウンス時間(10ms)を超えて1サイクル進めるヘルパー"""
        self.current_time += dt_sec
        self.ctrl.run_cycle()

    def _press_btn_idx(self, idx):
        pin = self.ctrl.button_pins_def[idx]
        self.raw_btns[pin] = False  # Active Low
        self._step(0.001)  # デバウンス開始
        self._step(0.015)  # デバウンス確定

    def _release_btn_idx(self, idx):
        pin = self.ctrl.button_pins_def[idx]
        self.raw_btns[pin] = True
        self._step(0.001)
        self._step(0.015)

    def test_normal_button_and_fn_layer_switching(self):
        cfg = {
            "active_profile": 0,
            "profiles": [
                {
                    "id": "p1",
                    "name": "P1",
                    "keymap": {
                        "buttons": ["A", "layer:fn"] + ["None"] * 11,
                        "fn_buttons": ["F1", "layer:fn"] + ["None"] * 11,
                    },
                    "joystick": {"mode": "keyboard"}
                }
            ]
        }
        self.ctrl.apply_config(cfg)

        # 1. 通常レイヤーでボタン0を押すと 'A' が押される
        self._press_btn_idx(0)
        self.assertIn(Keycode.A, self.ctrl.keyboard.pressed)
        self._release_btn_idx(0)
        self.assertEqual(self.ctrl.keyboard.pressed, set())

        # 2. ボタン1 (layer:fn) を押しながらボタン0を押すと Fnレイヤーの 'F1' が押される
        self._press_btn_idx(1)
        self._press_btn_idx(0)
        self.assertIn(Keycode.F1, self.ctrl.keyboard.pressed)
        self.assertNotIn(Keycode.A, self.ctrl.keyboard.pressed)

        self._release_btn_idx(0)
        self._release_btn_idx(1)
        self.assertEqual(self.ctrl.keyboard.pressed, set())

    def test_combo_masks_individual_buttons_and_triggers_after_hold(self):
        cfg = {
            "active_profile": 0,
            "profiles": [
                {
                    "id": "p1",
                    "name": "P1",
                    "keymap": {
                        "buttons": ["A", "B"] + ["None"] * 11,
                        "combos": [
                            {"buttons": [0, 1], "action": "Escape", "hold_ms": 200}
                        ]
                    },
                    "joystick": {"mode": "keyboard"}
                }
            ]
        }
        self.ctrl.apply_config(cfg)

        # ボタン0とボタン1を同時に押下
        pin0 = self.ctrl.button_pins_def[0]
        pin1 = self.ctrl.button_pins_def[1]
        self.raw_btns[pin0] = False
        self.raw_btns[pin1] = False
        self._step(0.001)
        self._step(0.015)

        # hold_ms (200ms) 未満の間は構成ピン(A, B)がマスクされ、Escapeもまだ発火しない
        self.assertEqual(self.ctrl.keyboard.pressed, set())

        # 250ms経過すると Escape が発火する
        self._step(0.250)
        self.assertEqual(self.ctrl.keyboard.pressed, {Keycode.ESCAPE})

        # リリースで解除
        self.raw_btns[pin0] = True
        self.raw_btns[pin1] = True
        self._step(0.001)
        self._step(0.015)
        self.assertEqual(self.ctrl.keyboard.pressed, set())

    def test_tap_hold_short_tap_vs_long_hold_and_no_conflict_release(self):
        cfg = {
            "active_profile": 0,
            "profiles": [
                {
                    "id": "p1",
                    "name": "P1",
                    "keymap": {
                        "buttons": [
                            "tap:Space|hold:LCtrl|ms:300",
                            "Space",
                            "tap:Gamepad_1|hold:Gamepad_2|ms:300"
                        ] + ["None"] * 10
                    },
                    "joystick": {"mode": "keyboard"}
                }
            ]
        }
        self.ctrl.apply_config(cfg)

        # 1. ボタン0を短押し (100ms < 300ms) して離すと Space が単発パルス送信される
        self._press_btn_idx(0)
        self.assertEqual(self.ctrl.keyboard.pressed, set())
        self._step(0.080)
        self._release_btn_idx(0)
        self.assertIn(Keycode.SPACEBAR, self.ctrl.keyboard.press_history)
        self.assertIn(Keycode.SPACEBAR, self.ctrl.keyboard.release_history)
        self.assertEqual(self.ctrl.keyboard.pressed, set())

        # 2. ボタン1で Space をホールド中に、ボタン0を短押ししても Space が勝手に離されないこと
        self.ctrl.keyboard.press_history.clear()
        self.ctrl.keyboard.release_history.clear()
        self._press_btn_idx(1)  # Space ホールド開始
        self.assertIn(Keycode.SPACEBAR, self.ctrl.keyboard.pressed)

        self._press_btn_idx(0)
        self._step(0.050)
        self._release_btn_idx(0)  # Tap成立だが Space はボタン1で押下中なので維持される
        self.assertIn(Keycode.SPACEBAR, self.ctrl.keyboard.pressed)
        self.assertNotIn(Keycode.SPACEBAR, self.ctrl.keyboard.release_history)
        self._release_btn_idx(1)

        # 3. ボタン2 (Gamepad Tap-Hold) の短押しで Gamepad_1 がパルス送信されること
        self._press_btn_idx(2)
        self._step(0.050)
        self._release_btn_idx(2)
        self.assertIn(1, self.ctrl.gamepad.press_history)
        self.assertIn(1, self.ctrl.gamepad.release_history)

        # 4. ボタン0を長押し (350ms >= 300ms) すると LCtrl がホールドされ、リリース時に Space は出ない
        self.ctrl.keyboard.press_history.clear()
        self._press_btn_idx(0)
        self._step(0.350)
        self.assertIn(Keycode.LEFT_CONTROL, self.ctrl.keyboard.pressed)
        self._release_btn_idx(0)
        self.assertEqual(self.ctrl.keyboard.pressed, set())
        self.assertNotIn(Keycode.SPACEBAR, self.ctrl.keyboard.press_history)

    def test_profile_switching_actions_and_hid_reset(self):
        cfg = {
            "active_profile": 0,
            "profiles": [
                {"id": "prof_a", "name": "Profile A", "keymap": {"buttons": ["A"] * 13}},
                {"id": "prof_b", "name": "Profile B", "keymap": {"buttons": ["B"] * 13}},
                {"id": "prof_c", "name": "Profile C", "keymap": {"buttons": ["C"] * 13}},
            ]
        }
        self.ctrl.apply_config(cfg)
        self.assertEqual(self.ctrl.config["active_profile"], 0)

        # next -> 1
        self.ctrl.handle_profile_action("next")
        self.assertEqual(self.ctrl.config["active_profile"], 1)
        self.assertGreater(self.ctrl.keyboard.release_all_count, 0)
        self.assertGreater(self.ctrl.mouse.release_all_count, 0)
        self.assertGreater(self.ctrl.gamepad.reset_all_count, 0)

        # prev -> 0
        self.ctrl.handle_profile_action("prev")
        self.assertEqual(self.ctrl.config["active_profile"], 0)

        # switch by id -> 2
        self.ctrl.handle_profile_action("switch:prof_c")
        self.assertEqual(self.ctrl.config["active_profile"], 2)

        # default -> 0
        self.ctrl.handle_profile_action("default")
        self.assertEqual(self.ctrl.config["active_profile"], 0)

        # non-existent profile id -> stays at 0
        self.ctrl.handle_profile_action("switch:nonexistent")
        self.assertEqual(self.ctrl.config["active_profile"], 0)

    def test_serial_input_ctrl_c_resilience(self):
        # IS_CIRCUITPYTHON 環境下で stdin.read が KeyboardInterrupt を投げてもクラッシュしないこと
        class MockRuntime:
            serial_bytes_available = 1

        class MockSupervisor:
            runtime = MockRuntime()

        with patch.object(firmware_code, "IS_CIRCUITPYTHON", True), \
             patch.object(firmware_code, "supervisor", MockSupervisor, create=True), \
             patch.object(firmware_code.sys.stdin, "read", side_effect=KeyboardInterrupt):
            # 例外が外部に漏れないことを検証
            self.ctrl.check_serial_input()

    def test_boot_held_button_ignored_until_released(self):
        # メンテナンスモード突入時のように、起動時点でボタン1(GP0 -> "1")が押しっぱなしのケース
        pin0 = self.ctrl.button_pins_def[0]
        self.raw_btns[pin0] = False  # 起動時から押下中
        self.ctrl.record_boot_held_pins()
        self.assertIn(pin0, self.ctrl.boot_held_pins)

        # 押しっぱなしのまま複数サイクル経過しても '1' キーは送信されないこと
        self._step(0.001)
        self._step(0.020)
        self._step(0.020)
        self.assertEqual(self.ctrl.keyboard.pressed, set())

        # 一度ボタン1を離すとロックが解除されること
        self.raw_btns[pin0] = True
        self._step(0.001)
        self._step(0.020)
        self.assertNotIn(pin0, self.ctrl.boot_held_pins)
        self.assertEqual(self.ctrl.keyboard.pressed, set())

        # 離した後に再度押下すれば、通常通り '1' キーが入力・解放されること
        self._press_btn_idx(0)
        self.assertIn(Keycode.ONE, self.ctrl.keyboard.pressed)
        self._release_btn_idx(0)
        self.assertEqual(self.ctrl.keyboard.pressed, set())

    def test_hid_key_release_retried_after_usb_busy_oserror(self):
        # ボタン1("1")を押下
        self._press_btn_idx(0)
        self.assertIn(Keycode.ONE, self.ctrl.keyboard.pressed)

        # ボタン1を離した瞬間に USB Mass Storage アクセス等で OSError (USB busy) が発生したと仮定
        orig_release = self.ctrl.keyboard.release
        fail_once = {"failed": False}

        def flaky_release(*keycodes):
            if not fail_once["failed"]:
                fail_once["failed"] = True
                raise OSError("USB busy")
            return orig_release(*keycodes)

        self.ctrl.keyboard.release = flaky_release

        # リリース1サイクル目: OSError が発生するが active_hid_keycodes は失われず保持される
        pin0 = self.ctrl.button_pins_def[0]
        self.raw_btns[pin0] = True
        self._step(0.002)
        self.assertTrue(fail_once["failed"])
        self.assertIn(Keycode.ONE, self.ctrl.active_hid_keycodes)
        self.assertIn(Keycode.ONE, self.ctrl.keyboard.pressed)

        # リリース2サイクル目: 自動的にリリースが再送され、キー押しっぱなしが解消される
        self._step(0.002)
        self.assertEqual(self.ctrl.active_hid_keycodes, set())
        self.assertEqual(self.ctrl.keyboard.pressed, set())


if __name__ == '__main__':
    unittest.main()



