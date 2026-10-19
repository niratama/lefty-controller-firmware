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
        self.mouse_curve = "smooth"  # マウス加速カーブ ("linear" | "smooth" | "aggressive" | float 1.0-3.0)
        self.mouse_walk_ratio = 0.55  # 通常域 (Walk) 最高速度比率 (0.10 - 0.90)
        self.mouse_remainder_x = 0.0  # サブピクセル蓄積用
        self.mouse_remainder_y = 0.0

        # 方向制限モード ("8way" | "4way_snap" | "4way_strict")
        self.direction_mode = "8way"
        self.current_4way_dir = None

        # デフォルトパラメータ
        self.deadzone = 2500
        self.hysteresis = 1500
        self.invert_x = False
        self.invert_y = False
        self.rotation = 90     # 取付角度回転補正 (度数: 0, 90, 180, 270)
        self.enable_run = True # Run (走り/2段階目入力) の有効化
        self.gamepad_target = "left_stick"  # "left_stick" | "right_stick" | "dpad" | "z_axis"
        self.dpad_walk_btn = ""             # DPAD Walk時の追加ボタン
        self.dpad_run_btn = "Gamepad_2"     # DPAD Run時の追加ボタン

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

    @staticmethod
    def _safe_int(val, default, min_val=None, max_val=None):
        if isinstance(val, bool):
            return default
        try:
            res = int(val)
        except (ValueError, TypeError):
            return default
        if min_val is not None and res < min_val:
            res = min_val
        if max_val is not None and res > max_val:
            res = max_val
        return res

    def load_config(self, config):
        """設定辞書（joystick部分）からパラメータを更新"""
        if not isinstance(config, dict):
            return
        joy_cfg = config.get("joystick", {}) if "joystick" in config else config
        if not isinstance(joy_cfg, dict):
            return

        mode = joy_cfg.get("mode", self.mode)
        if isinstance(mode, str) and mode in ("keyboard", "gamepad", "mouse"):
            self.mode = mode

        dir_mode = joy_cfg.get("direction_mode", self.direction_mode)
        if isinstance(dir_mode, str) and dir_mode in ("8way", "4way_snap", "4way_strict"):
            self.direction_mode = dir_mode

        self.mouse_speed = self._safe_int(joy_cfg.get("mouse_speed", self.mouse_speed), self.mouse_speed, 1, 127)
        curve = joy_cfg.get("mouse_curve", self.mouse_curve)
        if isinstance(curve, str) and curve in ("linear", "smooth", "aggressive"):
            self.mouse_curve = curve
        elif isinstance(curve, (int, float)):
            self.mouse_curve = max(0.5, min(3.0, float(curve)))
        elif isinstance(curve, str):
            try:
                self.mouse_curve = max(0.5, min(3.0, float(curve)))
            except ValueError:
                self.mouse_curve = "smooth"

        walk_ratio = joy_cfg.get("mouse_walk_ratio", self.mouse_walk_ratio)
        if isinstance(walk_ratio, (int, float)):
            self.mouse_walk_ratio = max(0.10, min(0.90, float(walk_ratio)))
        elif isinstance(walk_ratio, str):
            try:
                self.mouse_walk_ratio = max(0.10, min(0.90, float(walk_ratio)))
            except ValueError:
                self.mouse_walk_ratio = 0.55

        self.deadzone = self._safe_int(joy_cfg.get("deadzone", self.deadzone), self.deadzone, 0, 32767)
        self.hysteresis = self._safe_int(joy_cfg.get("hysteresis", self.hysteresis), self.hysteresis, 0, 32767)
        self.invert_x = bool(joy_cfg.get("invert_x", self.invert_x))
        self.invert_y = bool(joy_cfg.get("invert_y", self.invert_y))
        self.rotation = self._safe_int(joy_cfg.get("rotation", self.rotation), self.rotation) % 360
        self.enable_run = bool(joy_cfg.get("enable_run", self.enable_run))

        gp_target = joy_cfg.get("gamepad_target", self.gamepad_target)
        if isinstance(gp_target, str) and gp_target in ("left_stick", "right_stick", "dpad", "z_axis"):
            self.gamepad_target = gp_target

        dpad_walk = joy_cfg.get("dpad_walk_btn", self.dpad_walk_btn)
        if isinstance(dpad_walk, (str, list)):
            self.dpad_walk_btn = dpad_walk
        dpad_run = joy_cfg.get("dpad_run_btn", self.dpad_run_btn)
        if isinstance(dpad_run, (str, list)):
            self.dpad_run_btn = dpad_run

        dirs = joy_cfg.get("directions", {})
        if isinstance(dirs, dict):
            for d in ["up", "down", "left", "right"]:
                cfg = dirs.get(d)
                if isinstance(cfg, dict):
                    kw = cfg.get("key_walk", self.dir_configs[d]["key_walk"])
                    kr = cfg.get("key_run", self.dir_configs[d]["key_run"])
                    if isinstance(kw, str):
                        kw_list = [kw]
                    elif isinstance(kw, (list, tuple)):
                        kw_list = [str(x) for x in kw if isinstance(x, (str, int))]
                    else:
                        kw_list = list(self.dir_configs[d]["key_walk"])

                    if isinstance(kr, str):
                        kr_list = [kr]
                    elif isinstance(kr, (list, tuple)):
                        kr_list = [str(x) for x in kr if isinstance(x, (str, int))]
                    else:
                        kr_list = list(self.dir_configs[d]["key_run"])

                    self.dir_configs[d] = {
                        "th_walk": self._safe_int(cfg.get("th_walk"), self.dir_configs[d]["th_walk"], 0, 65535),
                        "th_run": self._safe_int(cfg.get("th_run"), self.dir_configs[d]["th_run"], 0, 65535),
                        "key_walk": kw_list,
                        "key_run": kr_list
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
            if self.enable_run and magnitude >= th_run:
                new_state = DirectionState.RUN
            elif magnitude >= th_walk:
                new_state = DirectionState.WALK
            else:
                new_state = DirectionState.NEUTRAL

        elif current == DirectionState.WALK:
            if self.enable_run and magnitude >= th_run:
                new_state = DirectionState.RUN
            elif magnitude < (th_walk - hyst) or magnitude < dz:
                new_state = DirectionState.NEUTRAL
            else:
                new_state = DirectionState.WALK

        elif current == DirectionState.RUN:
            if not self.enable_run:
                new_state = DirectionState.WALK if magnitude >= th_walk else DirectionState.NEUTRAL
            elif magnitude < (th_walk - hyst) or magnitude < dz:
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
            norm_val = 0
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

            # Walk / Run ステージ判定
            avg_th_walk = self.dir_configs["up"]["th_walk"]
            avg_th_run = self.dir_configs["up"]["th_run"]
            if dist < self.deadzone:
                gamepad_stage = "neutral"
            elif self.enable_run and dist >= avg_th_run:
                gamepad_stage = "run"
            elif dist >= avg_th_walk:
                gamepad_stage = "walk"
            else:
                gamepad_stage = "neutral"

            # ターゲット軸・ハットのディスパッチ
            out_x = 0
            out_y = 0
            out_z = 0
            out_rz = 0
            out_hat = 0

            target = getattr(self, "gamepad_target", "left_stick")
            if target == "right_stick":
                out_z = joy_x
                out_rz = joy_y
            elif target == "z_axis":
                out_z = joy_x
                out_rz = joy_y
            elif target == "dpad":
                if dist < self.deadzone:
                    out_hat = 0
                elif self.direction_mode in ("4way_snap", "4way_strict"):
                    td = self._determine_4way_direction(dx, dy, dist)
                    if td == "up": out_hat = 1
                    elif td == "right": out_hat = 3
                    elif td == "down": out_hat = 5
                    elif td == "left": out_hat = 7
                    else: out_hat = 0
                else:
                    ang = math.degrees(math.atan2(dx, dy)) % 360  # 0°=上, 90°=右, 180°=下, 270°=左
                    sector = int((ang + 22.5) / 45) % 8
                    out_hat = sector + 1
            else:  # "left_stick"
                out_x = joy_x
                out_y = joy_y

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
                "gamepad": (out_x, out_y, out_z, out_rz, out_hat),
                "gamepad_stage": gamepad_stage,
                "gamepad_target": target,
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
                self.mouse_remainder_x = 0.0
                self.mouse_remainder_y = 0.0
            else:
                max_range = max(1.0, 32767.0 - self.deadzone)
                clamped_dist = min(32767.0, dist)
                ratio = (clamped_dist - self.deadzone) / max_range

                # レスポンスカーブ指数の決定
                if self.mouse_curve == "linear":
                    curve_power = 1.0
                elif self.mouse_curve == "aggressive":
                    curve_power = 2.0
                elif isinstance(self.mouse_curve, (int, float)):
                    curve_power = max(0.5, min(3.0, float(self.mouse_curve)))
                else:  # "smooth" (デフォルト)
                    curve_power = 1.5

                # Run 有効・無効による二段階ギア（深倒しブースト）制御
                # キーボード設定の Run 閾値 (th_run) と連動してブースト開始深さを決定
                avg_th_run = (
                    self.dir_configs["up"]["th_run"]
                    + self.dir_configs["down"]["th_run"]
                    + self.dir_configs["left"]["th_run"]
                    + self.dir_configs["right"]["th_run"]
                ) / 4.0
                run_threshold = max(0.1, min(0.95, (avg_th_run - self.deadzone) / max_range))
                walk_ratio_cap = self.mouse_walk_ratio
                walk_max_speed = self.mouse_speed * walk_ratio_cap

                if self.enable_run:
                    if ratio <= run_threshold:
                        sub_ratio = ratio / run_threshold
                        speed = (sub_ratio ** curve_power) * walk_max_speed
                    else:
                        boost_progress = (ratio - run_threshold) / (1.0 - run_threshold)
                        boost_span = self.mouse_speed - walk_max_speed
                        speed = walk_max_speed + (boost_progress ** 1.3) * boost_span
                else:
                    # Run無効時: 全域でWalk速度上限 (55%) に制限
                    sub_ratio = min(1.0, ratio / run_threshold)
                    speed = (sub_ratio ** curve_power) * walk_max_speed

                if self.direction_mode in ("4way_snap", "4way_strict"):
                    target_dir = self._determine_4way_direction(dx, dy, dist)
                    if target_dir == "up":
                        raw_dx = 0.0
                        raw_dy = -speed
                    elif target_dir == "down":
                        raw_dx = 0.0
                        raw_dy = speed
                    elif target_dir == "left":
                        raw_dx = -speed
                        raw_dy = 0.0
                    elif target_dir == "right":
                        raw_dx = speed
                        raw_dy = 0.0
                    else:
                        raw_dx = 0.0
                        raw_dy = 0.0
                else:
                    self.current_4way_dir = None
                    raw_dx = (dx / dist) * speed
                    # 画面座標系: 上は負(-raw_dy)
                    raw_dy = (-dy / dist) * speed

                # サブピクセル端数蓄積により微小操作・低速エイムを滑らかに反映
                target_fx = raw_dx + self.mouse_remainder_x
                target_fy = raw_dy + self.mouse_remainder_y
                mouse_dx = int(target_fx)
                mouse_dy = int(target_fy)
                self.mouse_remainder_x = target_fx - mouse_dx
                self.mouse_remainder_y = target_fy - mouse_dy

                mouse_dx = max(-127, min(127, mouse_dx))
                mouse_dy = max(-127, min(127, mouse_dy))

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
