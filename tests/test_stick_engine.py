import unittest
import sys
import os

# プロジェクトルートとfirmwareディレクトリをパスに追加
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'firmware')))

from stick_engine import StickEngine, DirectionState

class TestStickEngine(unittest.TestCase):
    def setUp(self):
        self.engine = StickEngine()
        # center: (32768, 32768), invert_x=False, invert_y=True
        # Y軸: raw_y < 32768 => dy = -(raw_y - 32768) = 32768 - raw_y => UP
        # テストを分かりやすくするため、invert_y=False (raw_y > center => UP) でテスト
        self.engine.invert_y = False
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
        # 中心付近 (偏差 2000 < deadzone 4000)
        active, press, release, info = self.engine.process(32000, 32000)
        self.assertEqual(active, set())
        self.assertEqual(press, set())
        self.assertEqual(release, set())
        self.assertEqual(self.engine.states["up"], DirectionState.NEUTRAL)
        self.assertEqual(self.engine.states["right"], DirectionState.NEUTRAL)

    def test_walk_threshold_and_hysteresis_up(self):
        # th_walk = 12000, th_run = 26000, hysteresis = 1500
        # UP方向 (Y軸): center = 30000
        # 1. 偏差 11999 (raw_y = 41999) -> NEUTRAL
        active, press, release, _ = self.engine.process(30000, 41999)
        self.assertEqual(active, set())
        self.assertEqual(self.engine.states["up"], DirectionState.NEUTRAL)

        # 2. 偏差 12000 (raw_y = 42000) -> WALK ('W' press)
        active, press, release, _ = self.engine.process(30000, 42000)
        self.assertEqual(active, {"W"})
        self.assertEqual(press, {"W"})
        self.assertEqual(release, set())
        self.assertEqual(self.engine.states["up"], DirectionState.WALK)

        # 3. 偏差 11000 (raw_y = 41000) -> 12000 - 1500 = 10500 以上なので WALK 維持 (ヒステリシス効果)
        active, press, release, _ = self.engine.process(30000, 41000)
        self.assertEqual(active, {"W"})
        self.assertEqual(press, set())
        self.assertEqual(release, set())
        self.assertEqual(self.engine.states["up"], DirectionState.WALK)

        # 4. 偏差 10499 (raw_y = 40499) -> 10500 未満なので NEUTRAL 復帰 ('W' release)
        active, press, release, _ = self.engine.process(30000, 40499)
        self.assertEqual(active, set())
        self.assertEqual(press, set())
        self.assertEqual(release, {"W"})
        self.assertEqual(self.engine.states["up"], DirectionState.NEUTRAL)

    def test_run_threshold_and_transition(self):
        # 1. 一気に RUN (偏差 26000, raw_y = 56000) -> Shift + W
        active, press, release, _ = self.engine.process(30000, 56000)
        self.assertEqual(active, {"Shift", "W"})
        self.assertEqual(press, {"Shift", "W"})
        self.assertEqual(self.engine.states["up"], DirectionState.RUN)

        # 2. RUNから少し戻す: 偏差 25000 (th_run - 1500 = 24500 以上なので RUN 維持)
        active, press, release, _ = self.engine.process(30000, 55000)
        self.assertEqual(active, {"Shift", "W"})
        self.assertEqual(press, set())
        self.assertEqual(release, set())
        self.assertEqual(self.engine.states["up"], DirectionState.RUN)

        # 3. RUNから WALK に低下: 偏差 24400 (24500未満、かつ 10500 以上) -> WALK ('Shift' release, 'W' 維持)
        active, press, release, _ = self.engine.process(30000, 54400)
        self.assertEqual(active, {"W"})
        self.assertEqual(press, set())
        self.assertEqual(release, {"Shift"})
        self.assertEqual(self.engine.states["up"], DirectionState.WALK)

        # 4. WALKから再び RUN へ: 偏差 26000 -> RUN ('Shift' press, 'W' 維持)
        active, press, release, _ = self.engine.process(30000, 56000)
        self.assertEqual(active, {"Shift", "W"})
        self.assertEqual(press, {"Shift"})
        self.assertEqual(release, set())
        self.assertEqual(self.engine.states["up"], DirectionState.RUN)

    def test_diagonal_combination(self):
        # 斜め入力: UP (WALK: 'W') + RIGHT (RUN: 'Shift', 'D')
        # raw_y = 45000 (UP: WALK), raw_x = 57000 (RIGHT: RUN)
        active, press, release, _ = self.engine.process(57000, 45000)
        self.assertEqual(active, {"W", "D", "Shift"})
        self.assertEqual(press, {"W", "D", "Shift"})

        # 次フレーム: UPを解除 (raw_y = 30000)、RIGHTは維持 (raw_x = 57000)
        active, press, release, _ = self.engine.process(57000, 30000)
        self.assertEqual(active, {"D", "Shift"})
        self.assertEqual(press, set())
        self.assertEqual(release, {"W"})

if __name__ == '__main__':
    unittest.main()
