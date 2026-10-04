import unittest
import sys
import os

# プロジェクトルートとfirmwareディレクトリをパスに追加
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from stick_engine import StickEngine, DirectionState

class TestStickEngine(unittest.TestCase):
    def setUp(self):
        self.engine = StickEngine()
        # デフォルト: 左90度取付 (rotation=90), invert_x=False, invert_y=False
        # 物理配置: GP26(raw_x)が前後(UP/DOWN), GP27(raw_y)が左右(LEFT/RIGHT)
        # raw_x > center => UP, raw_y > center => RIGHT
        self.engine.invert_x = False
        self.engine.invert_y = False
        self.engine.rotation = 90
        self.engine.set_center(30000, 30000)

    def test_calibration(self):
        engine = StickEngine()
        samples_x = [30010, 30000, 29990]
        samples_y = [31010, 31000, 30990]
        cx, cy = engine.calibrate(samples_x, samples_y)
        self.assertEqual(cx, 30000)
        self.assertEqual(cy, 31000)
        self.assertTrue(engine.is_calibrated)

    def test_deadzone_and_neutral(self):
        # 中心付近 (偏差 2000 < deadzone 2500)
        active, press, release, info = self.engine.process(32000, 32000)
        self.assertEqual(active, set())
        self.assertEqual(press, set())
        self.assertEqual(release, set())
        self.assertEqual(self.engine.states["up"], DirectionState.NEUTRAL)
        self.assertEqual(self.engine.states["right"], DirectionState.NEUTRAL)

    def test_walk_threshold_and_hysteresis_up(self):
        # th_walk = 3000, th_run = 26000, hysteresis = 1500, deadzone = 2500
        # rotation=90: UP方向は raw_x
        # 1. 偏差 2999 (raw_x = 32999, raw_y = 30000) -> NEUTRAL
        active, press, release, _ = self.engine.process(32999, 30000)
        self.assertEqual(active, set())
        self.assertEqual(self.engine.states["up"], DirectionState.NEUTRAL)

        # 2. 偏差 3000 (raw_x = 33000, raw_y = 30000) -> WALK ('W' press)
        active, press, release, _ = self.engine.process(33000, 30000)
        self.assertEqual(active, {"W"})
        self.assertEqual(press, {"W"})
        self.assertEqual(release, set())
        self.assertEqual(self.engine.states["up"], DirectionState.WALK)

        # 3. 偏差 2600 (raw_x = 32600) -> max(deadzone 2500, 3000 - 1500 = 1500) = 2500 以上なので WALK 維持 (ヒステリシス効果)
        active, press, release, _ = self.engine.process(32600, 30000)
        self.assertEqual(active, {"W"})
        self.assertEqual(press, set())
        self.assertEqual(release, set())
        self.assertEqual(self.engine.states["up"], DirectionState.WALK)

        # 4. 偏差 2499 (raw_x = 32499) -> 2500 未満なので NEUTRAL 復帰 ('W' release)
        active, press, release, _ = self.engine.process(32499, 30000)
        self.assertEqual(active, set())
        self.assertEqual(press, set())
        self.assertEqual(release, {"W"})
        self.assertEqual(self.engine.states["up"], DirectionState.NEUTRAL)

    def test_run_threshold_and_transition(self):
        # 1. 一気に RUN (偏差 26000, raw_x = 56000, raw_y = 30000) -> Shift + W
        active, press, release, _ = self.engine.process(56000, 30000)
        self.assertEqual(active, {"Shift", "W"})
        self.assertEqual(press, {"Shift", "W"})
        self.assertEqual(self.engine.states["up"], DirectionState.RUN)

        # 2. RUNから少し戻す: 偏差 25000 (th_run - 1500 = 24500 以上なので RUN 維持)
        active, press, release, _ = self.engine.process(55000, 30000)
        self.assertEqual(active, {"Shift", "W"})
        self.assertEqual(press, set())
        self.assertEqual(release, set())
        self.assertEqual(self.engine.states["up"], DirectionState.RUN)

        # 3. RUNから WALK に低下: 偏差 24400 (24500未満、かつ 2500 以上) -> WALK ('Shift' release, 'W' 維持)
        active, press, release, _ = self.engine.process(54400, 30000)
        self.assertEqual(active, {"W"})
        self.assertEqual(press, set())
        self.assertEqual(release, {"Shift"})
        self.assertEqual(self.engine.states["up"], DirectionState.WALK)

        # 4. WALKから再び RUN へ: 偏差 26000 -> RUN ('Shift' press, 'W' 維持)
        active, press, release, _ = self.engine.process(56000, 30000)
        self.assertEqual(active, {"Shift", "W"})
        self.assertEqual(press, {"Shift"})
        self.assertEqual(release, set())
        self.assertEqual(self.engine.states["up"], DirectionState.RUN)

    def test_diagonal_combination(self):
        # 斜め入力: UP (WALK: 'W', raw_x = 45000) + RIGHT (RUN: 'Shift', 'D', raw_y = 57000)
        active, press, release, _ = self.engine.process(45000, 57000)
        self.assertEqual(active, {"W", "D", "Shift"})
        self.assertEqual(press, {"W", "D", "Shift"})

        # 次フレーム: UPを解除 (raw_x = 30000)、RIGHTは維持 (raw_y = 57000)
        active, press, release, _ = self.engine.process(30000, 57000)
        self.assertEqual(active, {"D", "Shift"})
        self.assertEqual(press, set())
        self.assertEqual(release, {"W"})

    def test_rotation_90(self):
        # ユーザーのハードウェア状況:
        # 左90度回転して取り付けられており、反転なし (invert_x=False, invert_y=False) の状態で
        # rotation=90 (dx, dy = dy, dx) により:
        # 左倒し (生値 dy=-15000, dx=0) -> dx=-15000 (LEFT: 'A'), dy=0
        # 下倒し (生値 dx=-15000, dy=0) -> dx=0, dy=-15000 (DOWN: 'S')
        # 上倒し (生値 dx=+15000, dy=0) -> dx=0, dy=+15000 (UP: 'W')
        # 右倒し (生値 dy=+15000, dx=0) -> dx=+15000 (RIGHT: 'D'), dy=0
        self.engine.rotation = 90
        self.engine.invert_x = False
        self.engine.invert_y = False

        # 1. ユーザーが左に倒す (raw_x=30000, raw_y=15000 => dx_raw=0, dy_raw=-15000)
        active, _, _, _ = self.engine.process(30000, 15000)
        self.assertEqual(active, {"A"})
        self.assertEqual(self.engine.states["left"], DirectionState.WALK)

        self.engine.process(30000, 30000)

        # 2. ユーザーが下に倒す (raw_x=15000, raw_y=30000 => dx_raw=-15000, dy_raw=0)
        active, _, _, _ = self.engine.process(15000, 30000)
        self.assertEqual(active, {"S"})
        self.assertEqual(self.engine.states["down"], DirectionState.WALK)

        self.engine.process(30000, 30000)

        # 3. ユーザーが上に倒す (raw_x=45000, raw_y=30000 => dx_raw=+15000, dy_raw=0)
        active, _, _, _ = self.engine.process(45000, 30000)
        self.assertEqual(active, {"W"})
        self.assertEqual(self.engine.states["up"], DirectionState.WALK)

        self.engine.process(30000, 30000)

        # 4. ユーザーが右に倒す (raw_x=30000, raw_y=45000 => dx_raw=0, dy_raw=+15000)
        active, _, _, _ = self.engine.process(30000, 45000)
        self.assertEqual(active, {"D"})
        self.assertEqual(self.engine.states["right"], DirectionState.WALK)

    def test_rotation_all_angles(self):
        # 全角度の回転補正が対称かつ意図通り動作することを検証
        self.engine.invert_x = False
        self.engine.invert_y = False

        # 0度: dx, dy = dx, -dy
        self.engine.rotation = 0
        active, _, _, _ = self.engine.process(45000, 30000)  # raw_x > center => dx=+15000 => RIGHT
        self.assertEqual(active, {"D"})
        self.engine.process(30000, 30000)
        active, _, _, _ = self.engine.process(30000, 15000)  # raw_y < center => dy=+15000 => UP
        self.assertEqual(active, {"W"})

        # 180度: dx, dy = -dx, dy
        self.engine.rotation = 180
        self.engine.process(30000, 30000)
        active, _, _, _ = self.engine.process(45000, 30000)  # raw_x > center => dx=-15000 => LEFT
        self.assertEqual(active, {"A"})
        self.engine.process(30000, 30000)
        active, _, _, _ = self.engine.process(30000, 45000)  # raw_y > center => dy=+15000 => UP
        self.assertEqual(active, {"W"})

        # 270度: dx, dy = -dy, -dx
        self.engine.rotation = 270
        self.engine.process(30000, 30000)
        active, _, _, _ = self.engine.process(45000, 30000)  # raw_x > center => dy=-15000 => DOWN
        self.assertEqual(active, {"S"})
        self.engine.process(30000, 30000)
        active, _, _, _ = self.engine.process(30000, 15000)  # raw_y < center => dx=+15000 => RIGHT
        self.assertEqual(active, {"D"})

    def test_rotation_and_invert_order(self):
        # rotation=90 の状態で、invert_y=True にしても X軸 (左右) に干渉しないことを検証
        self.engine.rotation = 90
        self.engine.invert_x = False
        self.engine.invert_y = True  # Y軸反転のみ有効化

        # 左に倒す (raw_x=30000, raw_y=15000) -> Y軸反転しても左右(X軸)は変わらず 'A' (LEFT) であるべき
        active, _, _, _ = self.engine.process(30000, 15000)
        self.assertEqual(active, {"A"})
        self.assertEqual(self.engine.states["left"], DirectionState.WALK)

        self.engine.process(30000, 30000)

        # 下に倒す (raw_x=15000, raw_y=30000) -> Y軸反転されているので 'W' (UP) に反転する
        active, _, _, _ = self.engine.process(15000, 30000)
        self.assertEqual(active, {"W"})
        self.assertEqual(self.engine.states["up"], DirectionState.WALK)

if __name__ == '__main__':
    unittest.main()
