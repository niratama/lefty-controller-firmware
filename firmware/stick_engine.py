"""
StickEngine: 2軸アナログスティックの多段階キー判定エンジン
ヒステリシス付きステートマシン、自動ゼロ点キャリブレーション、
デッドゾーン処理、およびキー競合回避ロジックを提供します。
"""

class DirectionState:
    NEUTRAL = 0
    WALK = 1
    RUN = 2

class StickEngine:
    def __init__(self, config=None):
        self.center_x = 32768
        self.center_y = 32768
        self.is_calibrated = False

        # デフォルトパラメータ
        self.deadzone = 4000
        self.hysteresis = 1500
        self.invert_x = False
        self.invert_y = True  # 一般的なADCでは上倒しで電圧低下する場合があるため

        self.dir_configs = {
            "up": {
                "th_walk": 12000,
                "th_run": 26000,
                "key_walk": ["W"],
                "key_run": ["Shift", "W"]
            },
            "down": {
                "th_walk": 12000,
                "th_run": 26000,
                "key_walk": ["S"],
                "key_run": ["Shift", "S"]
            },
            "left": {
                "th_walk": 12000,
                "th_run": 26000,
                "key_walk": ["A"],
                "key_run": ["Shift", "A"]
            },
            "right": {
                "th_walk": 12000,
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
        self.deadzone = joy_cfg.get("deadzone", self.deadzone)
        self.hysteresis = joy_cfg.get("hysteresis", self.hysteresis)
        self.invert_x = joy_cfg.get("invert_x", self.invert_x)
        self.invert_y = joy_cfg.get("invert_y", self.invert_y)

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

    def process(self, raw_x, raw_y):
        """
        1フレームのADC入力を評価し、押すべきキーセット、押下イベント、解放イベントを返します。
        戻り値:
            active_keys: 現在押下中であるべきキーのセット (set)
            to_press: 今回新たに押下すべきキー (set)
            to_release: 今回解放すべきキー (set)
            debug_info: 各方向の大きさやステートを含む辞書
        """
        dx, dy = self.calculate_deltas(raw_x, raw_y)

        # 4方向の倒しこみ量 (正の値)
        # 上(+dy), 下(-dy), 右(+dx), 左(-dx)
        mag_up = max(0, dy)
        mag_down = max(0, -dy)
        mag_right = max(0, dx)
        mag_left = max(0, -dx)

        # 各方向のステートを更新
        st_up = self._update_axis_state("up", mag_up)
        st_down = self._update_axis_state("down", mag_down)
        st_left = self._update_axis_state("left", mag_left)
        st_right = self._update_axis_state("right", mag_right)

        # 全方向のアクティブキーを収集（合成）
        new_active_keys = set()
        for d, st in [("up", st_up), ("down", st_down), ("left", st_left), ("right", st_right)]:
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
