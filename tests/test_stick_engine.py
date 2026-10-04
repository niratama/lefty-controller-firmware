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

    def test_gamepad_mode(self):
        self.engine.mode = "gamepad"
        self.engine.rotation = 90
        self.engine.invert_x = False
        self.engine.invert_y = False

        # 1. デッドゾーン内 (中心 30000, 偏差 1000 < 2500)
        active, press, release, info = self.engine.process(31000, 30000)
        self.assertEqual(active, set())
        self.assertEqual(info["mode"], "gamepad")
        self.assertEqual(info["gamepad"], (0, 0))

        # 2. 右に倒す (raw_x=30000, raw_y=45000 => dx=+15000, dy=0)
        active, press, release, info = self.engine.process(30000, 45000)
        self.assertEqual(active, set())
        joy_x, joy_y = info["gamepad"]
        self.assertGreater(joy_x, 0)
        self.assertEqual(joy_y, 0)

        # 3. 上に倒す (raw_x=45000, raw_y=30000 => dx=0, dy=+15000 => DirectInput Yは負)
        active, press, release, info = self.engine.process(45000, 30000)
        self.assertEqual(active, set())
        joy_x, joy_y = info["gamepad"]
        self.assertEqual(joy_x, 0)
        self.assertLess(joy_y, 0)

    def test_mouse_mode(self):
        self.engine.mode = "mouse"
        self.engine.rotation = 90
        self.engine.invert_x = False
        self.engine.invert_y = False

        # 1. デッドゾーン内
        active, press, release, info = self.engine.process(31000, 30000)
        self.assertEqual(active, set())
        self.assertEqual(info["mode"], "mouse")
        self.assertEqual(info["mouse"], (0, 0))

        # 2. 右に倒す => mouse_dx > 0, mouse_dy == 0
        active, press, release, info = self.engine.process(30000, 45000)
        self.assertEqual(active, set())
        mdx, mdy = info["mouse"]
        self.assertGreater(mdx, 0)
        self.assertEqual(mdy, 0)

        # 3. 上に倒す => mouse_dx == 0, mouse_dy < 0 (画面座標系)
        active, press, release, info = self.engine.process(45000, 30000)
        self.assertEqual(active, set())
        mdx, mdy = info["mouse"]
        self.assertEqual(mdx, 0)
        self.assertLess(mdy, 0)

    def test_4way_snap_single_direction(self):
        # 4方向スナップモード: 斜め入力時でも最大1方向のみが出力され、同時押しが絶対に起きない
        self.engine.direction_mode = "4way_snap"
        self.engine.rotation = 90
        self.engine.invert_x = False
        self.engine.invert_y = False

        # 1. 右斜め上 (上成分が強い: dy=+20000, dx=+10000 => 生値 raw_x=50000, raw_y=40000)
        # raw_x=50000 -> dy=+20000, raw_y=40000 -> dx=+10000
        active, press, release, info = self.engine.process(50000, 40000)
        self.assertEqual(active, {"W"})
        self.assertEqual(self.engine.states["up"], DirectionState.WALK)
        self.assertEqual(self.engine.states["right"], DirectionState.NEUTRAL)
        self.assertEqual(info["current_4way_dir"], "up")

        # ニュートラルへ戻す
        self.engine.process(30000, 30000)

        # 2. 上斜め右 (右成分が強い: dy=+10000, dx=+20000 => 生値 raw_x=40000, raw_y=50000)
        active, press, release, info = self.engine.process(40000, 50000)
        self.assertEqual(active, {"D"})
        self.assertEqual(self.engine.states["right"], DirectionState.WALK)
        self.assertEqual(self.engine.states["up"], DirectionState.NEUTRAL)
        self.assertEqual(info["current_4way_dir"], "right")

    def test_4way_axis_hysteresis(self):
        # 45°境界付近での手のブレによるチャタリングをヒステリシスで防止
        self.engine.direction_mode = "4way_snap"
        self.engine.rotation = 90
        self.engine.invert_x = False
        self.engine.invert_y = False

        # 1. まず「上」に倒す (dy=+12000, dx=+8000 => raw_x=42000, raw_y=38000, dist≈14422)
        active, _, _, info = self.engine.process(42000, 38000)
        self.assertEqual(active, {"W"})
        self.assertEqual(info["current_4way_dir"], "up")

        # 2. 右成分が少し増えて 45°付近になる (dy=+12000, dx=+13000 => raw_x=42000, raw_y=43000)
        # dx は dy よりわずかに大きいが、hysteresis 1.15 (12000 * 1.15 = 13800) 未満なので「上」を維持
        active, _, _, info = self.engine.process(42000, 43000)
        self.assertEqual(active, {"W"})
        self.assertEqual(info["current_4way_dir"], "up")

        # 3. 明確に右に倒れこむ (dy=+12000, dx=+15000 > 13800 => raw_x=42000, raw_y=45000)
        active, press, release, info = self.engine.process(42000, 45000)
        self.assertEqual(active, {"D"})
        self.assertEqual(press, {"D"})
        self.assertEqual(release, {"W"})
        self.assertEqual(info["current_4way_dir"], "right")

    def test_4way_walk_and_run(self):
        # 4方向モードで斜め45°に全開で倒し込んだ場合 (dist >= th_run)
        # 個別の dx, dy 成分は 26000 未満でも、合成半径 dist が 26000 以上なら確実に RUN が成立
        self.engine.direction_mode = "4way_snap"
        self.engine.rotation = 90
        self.engine.invert_x = False
        self.engine.invert_y = False

        # 斜め45°全開 (dy = +21500, dx = +21000 => dist = sqrt(21500^2 + 21000^2) ≈ 30054 >= 26000)
        # 生値: raw_x=51500, raw_y=51000
        active, press, release, _ = self.engine.process(51500, 51000)
        # dy >= dx なので UP が選択され、RUN ('Shift', 'W') になる
        self.assertEqual(active, {"Shift", "W"})
        self.assertEqual(self.engine.states["up"], DirectionState.RUN)
        self.assertEqual(self.engine.states["right"], DirectionState.NEUTRAL)

    def test_4way_strict_deadzone(self):
        # 4方向厳格モード: 斜め45°付近の領域 (35°〜55°) は無効化 (Neutral)
        self.engine.direction_mode = "4way_strict"
        self.engine.rotation = 90
        self.engine.invert_x = False
        self.engine.invert_y = False

        # 1. ほぼ真上 (dy=+20000, dx=+2000 => raw_x=50000, raw_y=32000) -> 'W'
        active, _, _, info = self.engine.process(50000, 32000)
        self.assertEqual(active, {"W"})
        self.assertEqual(info["current_4way_dir"], "up")

        # 2. 斜め45° (dy=+20000, dx=+20000 => raw_x=50000, raw_y=50000) -> 斜め不感帯で Neutral
        active, _, release, info = self.engine.process(50000, 50000)
        self.assertEqual(active, set())
        self.assertEqual(release, {"W"})
        self.assertIsNone(info["current_4way_dir"])

        # 3. ほぼ真右 (dy=+2000, dx=+20000 => raw_x=32000, raw_y=50000) -> 'D'
        active, press, _, info = self.engine.process(32000, 50000)
        self.assertEqual(active, {"D"})
        self.assertEqual(press, {"D"})
        self.assertEqual(info["current_4way_dir"], "right")

    def test_4way_gamepad_mode(self):
        # ゲームパッドモード時の4方向スナップ: 非アクティブ軸が 0 にクランプされる
        self.engine.mode = "gamepad"
        self.engine.direction_mode = "4way_snap"
        self.engine.rotation = 90
        self.engine.invert_x = False
        self.engine.invert_y = False

        # 右斜め上 (dy=+25000, dx=+12000 => 上がアクティブ)
        active, _, _, info = self.engine.process(55000, 42000)
        self.assertEqual(active, set())
        joy_x, joy_y = info["gamepad"]
        self.assertEqual(joy_x, 0)
        self.assertLess(joy_y, 0)

if __name__ == '__main__':
    unittest.main()
