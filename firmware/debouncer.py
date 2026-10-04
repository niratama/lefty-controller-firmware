"""
Debouncer: デジタル入力のチャタリング除去およびエッジ検出モジュール
低遅延（即座発火）かつチャタリング無視のEager Debounce方式を採用。
"""

import time

class DebouncedPin:
    def __init__(self, pin_id, debounce_ms=10):
        self.pin_id = pin_id
        self.debounce_ms = debounce_ms
        self.raw_state = True       # Active Lowの場合: True=離されている, False=押されている
        self.stable_pressed = False # 論理的な押下状態: True=押下中, False=解放
        self.last_change_time = 0.0
        self.just_pressed = False
        self.just_released = False

    def update(self, current_raw_val, current_time_ms=None):
        """
        current_raw_val: True (HIGH / 離されている) or False (LOW / 押されている)
        current_time_ms: 現在時刻（ミリ秒）。省略時は time.monotonic() * 1000
        """
        if current_time_ms is None:
            current_time_ms = time.monotonic() * 1000.0

        self.just_pressed = False
        self.just_released = False
        self.raw_state = current_raw_val

        is_now_physically_pressed = not current_raw_val  # Active Low: False(0) -> 押下

        # 状態変化があり、かつ前回の変化からデバウンス時間を経過している場合
        if is_now_physically_pressed != self.stable_pressed:
            if (current_time_ms - self.last_change_time) >= self.debounce_ms:
                self.stable_pressed = is_now_physically_pressed
                self.last_change_time = current_time_ms
                if self.stable_pressed:
                    self.just_pressed = True
                else:
                    self.just_released = True

        return self.stable_pressed


class ButtonManager:
    """13個のボタンを一括管理するマネージャ"""
    def __init__(self, pin_ids, debounce_ms=10):
        self.pin_ids = pin_ids
        self.buttons = {pid: DebouncedPin(pid, debounce_ms) for pid in pin_ids}

    def update(self, pin_values_dict, current_time_ms=None):
        """
        pin_values_dict: {pin_id: raw_val (True/False)}
        戻り値:
            pressed_pins: 現在押されているpin_idのリスト
            just_pressed: 今回新たに押されたpin_idのリスト
            just_released: 今回離されたpin_idのリスト
        """
        if current_time_ms is None:
            current_time_ms = time.monotonic() * 1000.0

        pressed_pins = []
        just_pressed = []
        just_released = []

        for pid in self.pin_ids:
            if pid in pin_values_dict:
                btn = self.buttons[pid]
                is_pressed = btn.update(pin_values_dict[pid], current_time_ms)
                if is_pressed:
                    pressed_pins.append(pid)
                if btn.just_pressed:
                    just_pressed.append(pid)
                if btn.just_released:
                    just_released.append(pid)

        return pressed_pins, just_pressed, just_released
