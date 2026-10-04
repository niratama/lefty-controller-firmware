"""
diagnostic.py: ハードウェア検証 & ADCプロファイリングモジュール (Phase 1)
RP2040-Zero に書き込んでシリアルコンソール（またはWebUI）から実行します。
"""

import time
import math

try:
    import board
    import digitalio
    import analogio
    IS_CIRCUITPYTHON = True
except ImportError:
    IS_CIRCUITPYTHON = False

PIN_MAPPINGS = {
    0: "SW1 (GP0)",
    1: "SW2 (GP1)",
    2: "SW3 (GP2)",
    3: "SW4 (GP3)",
    4: "SW5 (GP4)",
    5: "SW6 (GP5)",
    6: "SW7 (GP6)",
    7: "SW8 (GP7)",
    8: "SW9 (GP8)",
    9: "SW10/Trigger1 (GP9)",
    10: "SW11/Trigger2 (GP10)",
    11: "SW12/Trigger3 (GP11)",
    12: "SW_STK/StickClick (GP12)",
}

def get_pin_object(pin_num):
    if not IS_CIRCUITPYTHON:
        return None
    name = f"GP{pin_num}"
    return getattr(board, name, None)

class HardwareTester:
    def __init__(self):
        self.buttons = {}
        self.adc_x = None
        self.adc_y = None

        if IS_CIRCUITPYTHON:
            # 13個のボタンスイッチ初期化 (Active Low / Pull-up)
            for p in PIN_MAPPINGS.keys():
                pin_obj = get_pin_object(p)
                if pin_obj:
                    dio = digitalio.DigitalInOut(pin_obj)
                    dio.direction = digitalio.Direction.INPUT
                    dio.pull = digitalio.Pull.UP
                    self.buttons[p] = dio

            # アナログスティック初期化
            pin_x = get_pin_object(26)
            pin_y = get_pin_object(27)
            if pin_x and pin_y:
                self.adc_x = analogio.AnalogIn(pin_x)
                self.adc_y = analogio.AnalogIn(pin_y)

    def read_buttons(self):
        """全ボタンの状態を辞書で取得 {pin: is_pressed} (押下時True)"""
        states = {}
        for p, dio in self.buttons.items():
            states[p] = not dio.value  # Active Low
        return states

    def read_adc(self):
        """ADC生値を取得 (0〜65535)"""
        val_x = self.adc_x.value if self.adc_x else 32768
        val_y = self.adc_y.value if self.adc_y else 32768
        return val_x, val_y

    def run_button_test(self):
        """スイッチ導通テスト: 各ボタンの押下を検知し、全ボタン押下完了まで監視"""
        print("\n=== [1] スイッチ導通テスト (GP0〜GP12) ===")
        print("各ボタンを順番に押してください。全て検知されると完了します。")
        tested = set()
        prev_states = {p: False for p in PIN_MAPPINGS}

        while len(tested) < len(PIN_MAPPINGS):
            curr_states = self.read_buttons()
            for p, pressed in curr_states.items():
                if pressed and not prev_states[p]:
                    tested.add(p)
                    print(f" [PASS] {PIN_MAPPINGS[p]} 押下検知! ({len(tested)}/{len(PIN_MAPPINGS)})")
            prev_states = curr_states
            time.sleep(0.01)

        print("\n>>> 全13個のスイッチ導通テストが正常に完了しました! <<<\n")

    def profile_adc(self, duration_sec=5.0):
        """
        ADCプロファイリング:
        1. 静止時の中心値とノイズ幅 (Peak-to-Peak) を計測
        2. スティックを全周回転させた際の最小・最大値を記録
        """
        print("\n=== [2] スティック静止時ノイズ・中心値計測 ===")
        print("スティックに手を触れずに静止させてください (3秒間)...")
        time.sleep(1.0)

        samples_x = []
        samples_y = []
        start_t = time.monotonic()
        while time.monotonic() - start_t < 3.0:
            rx, ry = self.read_adc()
            samples_x.append(rx)
            samples_y.append(ry)
            time.sleep(0.005)

        avg_x = sum(samples_x) / len(samples_x)
        avg_y = sum(samples_y) / len(samples_y)
        noise_x = max(samples_x) - min(samples_x)
        noise_y = max(samples_y) - min(samples_y)

        print(f"静止時中心値: X={avg_x:.1f}, Y={avg_y:.1f}")
        print(f"ノイズ幅(P-P): X={noise_x} counts, Y={noise_y} counts")
        recommended_deadzone = max(noise_x, noise_y) * 4 + 1000
        print(f"推奨デッドゾーン(目安): {recommended_deadzone} counts以上")

        print("\n=== [3] スティック可動範囲計測 ===")
        print(f"{duration_sec}秒間のあいだ、スティックを大きく全方向にぐるぐる回してください...")
        min_x, max_x = 65535, 0
        min_y, max_y = 65535, 0

        start_t = time.monotonic()
        while time.monotonic() - start_t < duration_sec:
            rx, ry = self.read_adc()
            if rx < min_x: min_x = rx
            if rx > max_x: max_x = rx
            if ry < min_y: min_y = ry
            if ry > max_y: max_y = ry
            time.sleep(0.005)

        print(f"X軸 範囲: min={min_x}, max={max_x}, スパン={max_x - min_x}")
        print(f"Y軸 範囲: min={min_y}, max={max_y}, スパン={max_y - min_y}")
        print("\nプロファイリング完了。\n")

    def run_stream(self):
        """シリアルプロッタやWebUI向けのJSON連続ストリーム"""
        print("\n=== RAWストリーム開始 (Ctrl+Cで停止) ===")
        try:
            while True:
                rx, ry = self.read_adc()
                btns = self.read_buttons()
                pressed = [p for p, v in btns.items() if v]
                # コンパクトなJSON行
                print(f'{{"adc":[{rx},{ry}],"btns":{pressed}}}')
                time.sleep(0.02)  # 50Hz
        except KeyboardInterrupt:
            print("\nストリーム停止")

if __name__ == "__main__":
    tester = HardwareTester()
    print("Waveshare RP2040-Zero ハードウェア診断ツール")
    if not IS_CIRCUITPYTHON:
        print("(※PC環境で実行中のためハードウェアアクセスはスキップされます)")
    else:
        tester.profile_adc(5.0)
        tester.run_button_test()
