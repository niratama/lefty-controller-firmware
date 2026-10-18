"""
led_indicator.py: Waveshare RP2040-Zero オンボード RGB LED (WS2812) 制御モジュール
- 外部ライブラリ依存ゼロ (CircuitPython内蔵の neopixel_write または neopixel を自動選択)
- プロファイルごとのカラー表示 & 切り替え時パルス点滅
- 非ブロッキング点滅制御 (メインループに遅延を与えない)
"""

import time

try:
    import board
    import digitalio
except ImportError:
    board = None
    digitalio = None

try:
    import neopixel_write
except ImportError:
    neopixel_write = None

try:
    import neopixel
except ImportError:
    neopixel = None

# プロファイル標準カラー (インデックス順: 青, 緑, 紫, 黄, シアン, 赤)
DEFAULT_PROFILE_COLORS = [
    (0, 140, 255),   # Profile 0 (FPS/汎用): シアン/ブルー
    (0, 255, 60),    # Profile 1 (Gamepad): グリーン
    (180, 0, 255),   # Profile 2 (Mouse): パープル
    (255, 180, 0),   # Profile 3: オレンジ/イエロー
    (0, 255, 230),   # Profile 4: ターコイズ
    (255, 40, 0),    # Profile 5: レッド
]

class LedIndicator:
    def __init__(self, pin_num=16, pixel_order="RGB"):
        self.pin_io = None
        self.pin_num = pin_num
        self.np = None
        self.pixel_order = pixel_order.upper() if isinstance(pixel_order, str) else "RGB"
        self.current_color = (0, 0, 0)
        self.base_color = (0, 140, 255)  # 通常点灯色
        self.brightness = 0.6            # 普段の明るさ (ケース内部からの漏れ光用)
        self.flash_brightness = 1.0      # フラッシュ時の最大輝度
        
        # 点滅ステートマシン
        self.flashing = False
        self.flash_color = (255, 255, 255)
        self.flash_count = 0
        self.flash_phase = 0  # 0: 点灯, 1: 消灯
        self.phase_end_time = 0.0
        self.on_duration = 0.08
        self.off_duration = 0.07

        self._init_hardware(pin_num)

    def set_pixel_order(self, order):
        if order and isinstance(order, str) and order.upper() in ("RGB", "GRB", "BGR"):
            if self.pixel_order != order.upper():
                self.pixel_order = order.upper()
                self._init_hardware(self.pin_num)
                self.set_base_color(self.base_color[0], self.base_color[1], self.base_color[2], apply_now=True)

    def _init_hardware(self, pin_num):
        if not board or not digitalio:
            return

        pin_obj = getattr(board, "NEOPIXEL", None)
        if not pin_obj:
            pin_obj = getattr(board, f"GP{pin_num}", None)

        if not pin_obj:
            return

        # 1. neopixel ライブラリがあれば利用
        if neopixel:
            try:
                # RP2040-Zero のオンボードLEDは RGB 配列
                order = getattr(neopixel, self.pixel_order, None)
                if not order:
                    order = (0, 1, 2) if self.pixel_order == "RGB" else (1, 0, 2)
                self.np = neopixel.NeoPixel(pin_obj, 1, brightness=self.brightness, auto_write=True, pixel_order=order)
                return
            except Exception:
                self.np = None

        # 2. neopixel_write (CircuitPythonコア組み込み) をフォールバック利用
        if neopixel_write:
            try:
                self.pin_io = digitalio.DigitalInOut(pin_obj)
                self.pin_io.direction = digitalio.Direction.OUTPUT
            except Exception as e:
                print(f"[WARN] LED pin init failed: {e}")
                self.pin_io = None

    def _write_color(self, r, g, b, brightness=None):
        if brightness is None:
            brightness = self.brightness
        r_val = int(max(0, min(255, r)) * brightness)
        g_val = int(max(0, min(255, g)) * brightness)
        b_val = int(max(0, min(255, b)) * brightness)

        if self.np:
            try:
                self.np[0] = (r_val, g_val, b_val)
            except Exception:
                pass
        elif self.pin_io and neopixel_write:
            try:
                # RP2040-Zero の内蔵LEDは RGB 順序
                if self.pixel_order == "GRB":
                    raw_bytes = bytearray([g_val, r_val, b_val])
                elif self.pixel_order == "BGR":
                    raw_bytes = bytearray([b_val, g_val, r_val])
                else:  # "RGB" (Waveshare RP2040-Zero 標準)
                    raw_bytes = bytearray([r_val, g_val, b_val])
                neopixel_write.neopixel_write(self.pin_io, raw_bytes)
            except Exception:
                pass
        self.current_color = (r, g, b)

    def set_base_color(self, r, g, b, apply_now=True):
        """プロファイル基本色を設定（フラッシュ終了後にこの色に戻る）"""
        self.base_color = (r, g, b)
        if apply_now and not self.flashing:
            self._write_color(r, g, b, self.brightness)

    def set_profile(self, profile_index, hex_color=None, flash=True):
        """プロファイルに応じた色設定 & フラッシュ切り替え"""
        if hex_color and isinstance(hex_color, str) and hex_color.startswith("#") and len(hex_color) == 7:
            try:
                r = int(hex_color[1:3], 16)
                g = int(hex_color[3:5], 16)
                b = int(hex_color[5:7], 16)
                color = (r, g, b)
            except ValueError:
                color = DEFAULT_PROFILE_COLORS[profile_index % len(DEFAULT_PROFILE_COLORS)]
        else:
            color = DEFAULT_PROFILE_COLORS[profile_index % len(DEFAULT_PROFILE_COLORS)]

        self.set_base_color(color[0], color[1], color[2], apply_now=not flash)

        if flash:
            # プロファイル番号+1 回点滅（例: Profile 0 -> 1回、Profile 1 -> 2回、Profile 2 -> 3回）
            flash_times = min(3, profile_index + 1)
            self.trigger_flash(color[0], color[1], color[2], count=flash_times)

    def trigger_flash(self, r, g, b, count=2, on_dur=0.08, off_dur=0.07):
        """非ブロッキングでパルス点滅を開始"""
        self.flashing = True
        self.flash_color = (r, g, b)
        self.flash_count = count
        self.flash_phase = 0  # 0: 点灯, 1: 消灯
        self.on_duration = on_dur
        self.off_duration = off_dur
        now = time.monotonic()
        self.phase_end_time = now + self.on_duration
        self._write_color(r, g, b, self.flash_brightness)

    def update(self):
        """メインループから毎フレーム呼ばれる更新処理 (非ブロッキング)"""
        if not self.flashing:
            return

        now = time.monotonic()
        if now >= self.phase_end_time:
            if self.flash_phase == 0:
                # 点灯終了 -> 消灯フェーズへ
                self.flash_count -= 1
                if self.flash_count <= 0:
                    # 全フラッシュ完了 -> 基本色に復帰
                    self.flashing = False
                    self._write_color(self.base_color[0], self.base_color[1], self.base_color[2], self.brightness)
                    return
                self.flash_phase = 1
                self.phase_end_time = now + self.off_duration
                self._write_color(0, 0, 0, 0)
            else:
                # 消灯終了 -> 次の点灯へ
                self.flash_phase = 0
                self.phase_end_time = now + self.on_duration
                self._write_color(self.flash_color[0], self.flash_color[1], self.flash_color[2], self.flash_brightness)

    def turn_off(self):
        self.flashing = False
        self._write_color(0, 0, 0, 0)
