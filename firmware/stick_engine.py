"""
StickEngine: 2軸アナログスティックの多段階キー判定エンジン
ヒステリシス付きステートマシン、自動ゼロ点キャリブレーション、
デッドゾーン処理、およびキー競合回避ロジックを提供します。
"""

import math

class DirectionState:
    NEUTRAL = 0
    WALK = 1
    RUN = 2

class StickEngine:
    def __init__(self, config=None):
        self.center_x = 32768
        self.center_y = 32768
        self.is_calibrated = False

        # 動作モード ("keyboard" | "gamepad" | "mouse")
        self.mode = "keyboard"
        self.mouse_speed = 12  # マウスモード時の最高速度 (px/frame)

        # 方向制限モード ("8way" | "4way_snap" | "4way_strict")
        self.direction_mode = "8way"
        self.current_4way_dir = None

        # デフォルトパラメータ
        self.deadzone = 2500
        self.hysteresis = 1500
        self.invert_x = False
        self.invert_y = True  # デフォルト: Y軸反転
        self.rotation = 0     # 取付角度回転補正 (度数: 0, 90, 180, 270)

        self.dir_configs = {
            "up": {
                "th_walk": 3000,
                "th_run": 26000,
                "key_walk": ["W"],
                "key_run": ["Shift", "W"]
            },
            "down": {
                "th_walk": 3000,
                "th_run": 26000,
                "key_walk": ["S"],
                "key_run": ["Shift", "S"]
            },
            "left": {
                "th_walk": 3000,
                "th_run": 26000,
                "key_walk": ["A"],
                "key_run": ["Shift", "A"]
            },
            "right": {
                "th_walk": 3000,
                "th_run": 26000,
                "key_walk": ["D"],
                "key_run": ["Shift", "D"]
            }
        }

        # 現在の各方向ステート (NEUTRAL / WALK / RUN)
        self.states = {
            "up": DirectionState.NEUTRAL,
            "down": DirectionState.NEUTRAL,
            "left": DirectionState.NEUTRAL,
            "right": DirectionState.NEUTRAL
        }

        # 前回送信したアクティブキーセット
        self.active_keys = set()

        if config:
            self.load_config(config)

    def load_config(self, config):
        """設定辞書（joystick部分）からパラメータを更新"""
        joy_cfg = config.get("joystick", {}) if "joystick" in config else config
        self.mode = joy_cfg.get("mode", self.mode)
        self.direction_mode = joy_cfg.get("direction_mode", self.direction_mode)
        self.mouse_speed = joy_cfg.get("mouse_speed", self.mouse_speed)
        self.deadzone = joy_cfg.get("deadzone", self.deadzone)
        self.hysteresis = joy_cfg.get("hysteresis", self.hysteresis)
        self.invert_x = joy_cfg.get("invert_x", self.invert_x)
        self.invert_y = joy_cfg.get("invert_y", self.invert_y)
        self.rotation = joy_cfg.get("rotation", self.rotation)

        dirs = joy_cfg.get("directions", {})
        for d in ["up", "down", "left", "right"]:
            if d in dirs:
                cfg = dirs[d]
                kw = cfg.get("key_walk", [])
                kr = cfg.get("key_run", [])
                self.dir_configs[d] = {
                    "th_walk": cfg.get("th_walk", self.dir_configs[d]["th_walk"]),
                    "th_run": cfg.get("th_run", self.dir_configs[d]["th_run"]),
                    "key_walk": [kw] if isinstance(kw, str) else list(kw),
                    "key_run": [kr] if isinstance(kr, str) else list(kr)
                }

    def calibrate(self, samples_x, samples_y):
        """
        起動時キャリブレーション:
        静止状態のADCサンプルリストから平均値を算出してセンターに設定
        """
        if samples_x and samples_y:
            self.center_x = int(sum(samples_x) / len(samples_x))
            self.center_y = int(sum(samples_y) / len(samples_y))
            self.is_calibrated = True
        return self.center_x, self.center_y

    def set_center(self, cx, cy):
        """外部からセンター値を直接設定"""
        self.center_x = int(cx)
        self.center_y = int(cy)
        self.is_calibrated = True

    def calculate_deltas(self, raw_x, raw_y):
        """生ADC値 (0〜65535) からセンター相対の符号付き偏差 (dx, dy) を計算"""
        dx = raw_x - self.center_x
        dy = raw_y - self.center_y

        # 1. まず物理的な取付角度の回転補正を適用 (90度が左90度取付の基準)
        rot = self.rotation % 360
        if rot == 90:
            dx, dy = dy, dx
        elif rot == 180:
            dx, dy = -dx, dy
        elif rot == 270:
            dx, dy = -dy, -dx
        else:  # rot == 0
            dx, dy = dx, -dy

        # 2. 回転後の論理軸（X=左右, Y=上下）に対して反転を適用
        if self.invert_x:
            dx = -dx
        if self.invert_y:
            dy = -dy

        return dx, dy

    def _update_axis_state(self, direction, magnitude):
        """
        ヒステリシス付きステートマシン更新ロジック
        direction: 'up', 'down', 'left', 'right'
        magnitude: その方向への正の倒しこみ量 (0〜32768程度)
        """
        cfg = self.dir_configs[direction]
        th_walk = cfg["th_walk"]
        th_run = cfg["th_run"]
        hyst = self.hysteresis
        dz = self.deadzone

        current = self.states[direction]
        new_state = current

        # 完全にデッドゾーン未満の場合はNeutralへ
        effective_dz = max(dz, th_walk - hyst)

        if current == DirectionState.NEUTRAL:
            if magnitude >= th_run:
                new_state = DirectionState.RUN
            elif magnitude >= th_walk:
                new_state = DirectionState.WALK
            else:
                new_state = DirectionState.NEUTRAL

        elif current == DirectionState.WALK:
            if magnitude >= th_run:
                new_state = DirectionState.RUN
            elif magnitude < (th_walk - hyst) or magnitude < dz:
                new_state = DirectionState.NEUTRAL
            else:
                new_state = DirectionState.WALK

        elif current == DirectionState.RUN:
            if magnitude < (th_walk - hyst) or magnitude < dz:
                new_state = DirectionState.NEUTRAL
            elif magnitude < (th_run - hyst):
                new_state = DirectionState.WALK
            else:
                new_state = DirectionState.RUN

        self.states[direction] = new_state
        return new_state

    def _determine_4way_direction(self, dx, dy, dist):
        """
        4方向モードにおけるアクティブ方向 (up, down, left, right または None) を判定。
        軸遷移ヒステリシス (HYST_FACTOR = 1.15) により45°境界付近のチャタリングを防止。
        """
        if dist < self.deadzone:
            self.current_4way_dir = None
            return None

        abs_x = abs(dx)
        abs_y = abs(dy)

        # 4way_strict (斜め不感帯方式): 45°付近 (比率 0.70 〜 1.43, 約35°〜55°) はNeutral
        if self.direction_mode == "4way_strict":
            if abs_x > 0 and abs_y > 0:
                ratio = abs_x / abs_y
                if 0.70 <= ratio <= 1.43:
                    self.current_4way_dir = None
                    return None

        cur = self.current_4way_dir
        HYST = 1.15

        if cur == "up":
            if dy > 0 and (abs_y * HYST >= abs_x):
                return "up"
        elif cur == "down":
            if dy < 0 and (abs_y * HYST >= abs_x):
                return "down"
        elif cur == "right":
            if dx > 0 and (abs_x * HYST >= abs_y):
                return "right"
        elif cur == "left":
            if dx < 0 and (abs_x * HYST >= abs_y):
                return "left"

        # 現在の方向が維持条件を満たさない場合、または未決定 (None) の場合、最大軸を選択
        if abs_y >= abs_x:
            target = "up" if dy >= 0 else "down"
        else:
            target = "right" if dx >= 0 else "left"

        self.current_4way_dir = target
        return target

    def process(self, raw_x, raw_y):
        """
        1フレームのADC入力を評価し、押すべきキーセット、押下イベント、解放イベント、およびデバッグ情報を返します。
        戻り値:
            active_keys: 現在押下中であるべきキーのセット (set)
            to_press: 今回新たに押下すべきキー (set)
            to_release: 今回解放すべきキー (set)
            debug_info: モード、各方向の大きさ、ステート、ゲームパッド値、マウス移動量を含む辞書
        """
        dx, dy = self.calculate_deltas(raw_x, raw_y)

        # 4方向の倒しこみ量 (正の値)
        # 上(+dy), 下(-dy), 右(+dx), 左(-dx)
        mag_up = max(0, dy)
        mag_down = max(0, -dy)
        mag_right = max(0, dx)
        mag_left = max(0, -dx)

        dist = math.sqrt(dx * dx + dy * dy)

        if self.mode == "gamepad":
            if dist < self.deadzone:
                joy_x = 0
                joy_y = 0
            else:
                max_range = max(1.0, 32767.0 - self.deadzone)
                clamped_dist = min(32767.0, dist)
                ratio = (clamped_dist - self.deadzone) / max_range
                norm_val = ratio * 127.0
                joy_x = int((dx / dist) * norm_val)
                # DirectInput / Gamepad: 上は負(-127)、下は正(+127)
                joy_y = int((-dy / dist) * norm_val)
                joy_x = max(-127, min(127, joy_x))
                joy_y = max(-127, min(127, joy_y))

            if self.direction_mode in ("4way_snap", "4way_strict"):
                target_dir = self._determine_4way_direction(dx, dy, dist)
                if target_dir == "up":
                    joy_x = 0
                    joy_y = int(-norm_val)
                elif target_dir == "down":
                    joy_x = 0
                    joy_y = int(norm_val)
                elif target_dir == "left":
                    joy_x = int(-norm_val)
                    joy_y = 0
                elif target_dir == "right":
                    joy_x = int(norm_val)
                    joy_y = 0
                else:
                    joy_x = 0
                    joy_y = 0
                joy_x = max(-127, min(127, joy_x))
                joy_y = max(-127, min(127, joy_y))
            else:
                self.current_4way_dir = None

            to_press = set()
            to_release = set(self.active_keys)
            self.active_keys = set()
            for d in self.states:
                self.states[d] = DirectionState.NEUTRAL

            debug_info = {
                "dx": dx,
                "dy": dy,
                "dist": dist,
                "mode": "gamepad",
                "direction_mode": self.direction_mode,
                "current_4way_dir": self.current_4way_dir,
                "gamepad": (joy_x, joy_y),
                "mouse": (0, 0),
                "magnitudes": {
                    "up": mag_up,
                    "down": mag_down,
                    "left": mag_left,
                    "right": mag_right
                },
                "states": dict(self.states),
                "active_keys": []
            }
            return self.active_keys, to_press, to_release, debug_info

        elif self.mode == "mouse":
            if dist < self.deadzone:
                mouse_dx = 0
                mouse_dy = 0
            else:
                max_range = max(1.0, 32767.0 - self.deadzone)
                clamped_dist = min(32767.0, dist)
                ratio = (clamped_dist - self.deadzone) / max_range
                # 倒しこみ量に応じた加速度カーブ (1.4乗)
                speed = (ratio ** 1.4) * self.mouse_speed
                mouse_dx = int((dx / dist) * speed)
                # 画面座標系: 上は負(-mouse_dy)
                mouse_dy = int((-dy / dist) * speed)
                mouse_dx = max(-127, min(127, mouse_dx))
                mouse_dy = max(-127, min(127, mouse_dy))

            if self.direction_mode in ("4way_snap", "4way_strict"):
                target_dir = self._determine_4way_direction(dx, dy, dist)
                if target_dir == "up":
                    mouse_dx = 0
                    mouse_dy = int(-speed)
                elif target_dir == "down":
                    mouse_dx = 0
                    mouse_dy = int(speed)
                elif target_dir == "left":
                    mouse_dx = int(-speed)
                    mouse_dy = 0
                elif target_dir == "right":
                    mouse_dx = int(speed)
                    mouse_dy = 0
                else:
                    mouse_dx = 0
                    mouse_dy = 0
                mouse_dx = max(-127, min(127, mouse_dx))
                mouse_dy = max(-127, min(127, mouse_dy))
            else:
                self.current_4way_dir = None

            to_press = set()
            to_release = set(self.active_keys)
            self.active_keys = set()
            for d in self.states:
                self.states[d] = DirectionState.NEUTRAL

            debug_info = {
                "dx": dx,
                "dy": dy,
                "dist": dist,
                "mode": "mouse",
                "direction_mode": self.direction_mode,
                "current_4way_dir": self.current_4way_dir,
                "gamepad": (0, 0),
                "mouse": (mouse_dx, mouse_dy),
                "magnitudes": {
                    "up": mag_up,
                    "down": mag_down,
                    "left": mag_left,
                    "right": mag_right
                },
                "states": dict(self.states),
                "active_keys": []
            }
            return self.active_keys, to_press, to_release, debug_info

        # デフォルト: "keyboard" モード
        if self.direction_mode in ("4way_snap", "4way_strict"):
            target_dir = self._determine_4way_direction(dx, dy, dist)
            for d in ["up", "down", "left", "right"]:
                if d == target_dir:
                    self._update_axis_state(d, dist)
                else:
                    self._update_axis_state(d, 0)
        else:
            self.current_4way_dir = None
            # 各方向のステートを更新 (8方向独立判定)
            self._update_axis_state("up", mag_up)
            self._update_axis_state("down", mag_down)
            self._update_axis_state("left", mag_left)
            self._update_axis_state("right", mag_right)

        # 全方向のアクティブキーを収集（合成）
        new_active_keys = set()
        for d in ["up", "down", "left", "right"]:
            st = self.states[d]
            cfg = self.dir_configs[d]
            if st == DirectionState.RUN:
                for k in cfg["key_run"]:
                    new_active_keys.add(k)
            elif st == DirectionState.WALK:
                for k in cfg["key_walk"]:
                    new_active_keys.add(k)

        # 前回フレームとの差分を検出
        to_press = new_active_keys - self.active_keys
        to_release = self.active_keys - new_active_keys

        self.active_keys = new_active_keys

        debug_info = {
            "dx": dx,
            "dy": dy,
            "dist": dist,
            "mode": "keyboard",
            "direction_mode": self.direction_mode,
            "current_4way_dir": self.current_4way_dir,
            "gamepad": (0, 0),
            "mouse": (0, 0),
            "magnitudes": {
                "up": mag_up,
                "down": mag_down,
                "left": mag_left,
                "right": mag_right
            },
            "states": dict(self.states),
            "active_keys": list(self.active_keys)
        }

        return new_active_keys, to_press, to_release, debug_info
