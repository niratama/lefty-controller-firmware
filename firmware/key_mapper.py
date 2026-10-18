"""
KeyMapper: 文字列形式のキー名 ("W", "Shift", "Space" など) および
マウス・ゲームパッドアクションと、HIDコード値を相互変換するモジュール。
"""

try:
    from adafruit_hid.keycode import Keycode
except ImportError:
    # CircuitPython環境外（PC上の単体テスト等）用のフォールバック定義
    class Keycode:
        A = 0x04; B = 0x05; C = 0x06; D = 0x07; E = 0x08; F = 0x09; G = 0x0A
        H = 0x0B; I = 0x0C; J = 0x0D; K = 0x0E; L = 0x0F; M = 0x10; N = 0x11
        O = 0x12; P = 0x13; Q = 0x14; R = 0x15; S = 0x16; T = 0x17; U = 0x18
        V = 0x19; W = 0x1A; X = 0x1B; Y = 0x1C; Z = 0x1D
        ONE = 0x1E; TWO = 0x1F; THREE = 0x20; FOUR = 0x21; FIVE = 0x22
        SIX = 0x23; SEVEN = 0x24; EIGHT = 0x25; NINE = 0x26; ZERO = 0x27
        ENTER = 0x28; RETURN = 0x28; ESCAPE = 0x29; BACKSPACE = 0x2A
        TAB = 0x2B; SPACEBAR = 0x2C; SPACE = 0x2C
        MINUS = 0x2D; EQUALS = 0x2E
        LEFT_BRACKET = 0x2F; RIGHT_BRACKET = 0x30; BACKSLASH = 0x31
        SEMICOLON = 0x33; QUOTE = 0x34; GRAVE_ACCENT = 0x35
        COMMA = 0x36; PERIOD = 0x37; FORWARD_SLASH = 0x38; SLASH = 0x38
        CAPS_LOCK = 0x39
        F1 = 0x3A; F2 = 0x3B; F3 = 0x3C; F4 = 0x3D; F5 = 0x3E; F6 = 0x3F
        F7 = 0x40; F8 = 0x41; F9 = 0x42; F10 = 0x43; F11 = 0x44; F12 = 0x45
        PRINT_SCREEN = 0x46; SCROLL_LOCK = 0x47; PAUSE = 0x48
        INSERT = 0x49; HOME = 0x4A; PAGE_UP = 0x4B
        DELETE = 0x4C; END = 0x4D; PAGE_DOWN = 0x4E
        RIGHT_ARROW = 0x4F; LEFT_ARROW = 0x50; DOWN_ARROW = 0x51; UP_ARROW = 0x52
        LEFT_CONTROL = 0xE0; CONTROL = 0xE0
        LEFT_SHIFT = 0xE1; SHIFT = 0xE1
        LEFT_ALT = 0xE2; ALT = 0xE2
        LEFT_GUI = 0xE3; GUI = 0xE3; WINDOWS = 0xE3; COMMAND = 0xE3
        RIGHT_CONTROL = 0xE4; RIGHT_SHIFT = 0xE5
        RIGHT_ALT = 0xE6; RIGHT_GUI = 0xE7

KEY_NAME_MAP = {
    # アルファベット
    "A": Keycode.A, "B": Keycode.B, "C": Keycode.C, "D": Keycode.D,
    "E": Keycode.E, "F": Keycode.F, "G": Keycode.G, "H": Keycode.H,
    "I": Keycode.I, "J": Keycode.J, "K": Keycode.K, "L": Keycode.L,
    "M": Keycode.M, "N": Keycode.N, "O": Keycode.O, "P": Keycode.P,
    "Q": Keycode.Q, "R": Keycode.R, "S": Keycode.S, "T": Keycode.T,
    "U": Keycode.U, "V": Keycode.V, "W": Keycode.W, "X": Keycode.X,
    "Y": Keycode.Y, "Z": Keycode.Z,

    # 数字
    "1": Keycode.ONE, "2": Keycode.TWO, "3": Keycode.THREE,
    "4": Keycode.FOUR, "5": Keycode.FIVE, "6": Keycode.SIX,
    "7": Keycode.SEVEN, "8": Keycode.EIGHT, "9": Keycode.NINE, "0": Keycode.ZERO,

    # 特殊キー
    "Space": Keycode.SPACEBAR, "Spacebar": Keycode.SPACEBAR, "SPACE": Keycode.SPACEBAR,
    "Tab": Keycode.TAB, "TAB": Keycode.TAB,
    "Enter": Keycode.ENTER, "Return": Keycode.RETURN,
    "Escape": Keycode.ESCAPE, "Esc": Keycode.ESCAPE,
    "Backspace": Keycode.BACKSPACE, "Delete": Keycode.DELETE, "Del": Keycode.DELETE,

    # 修飾キー
    "Shift": Keycode.LEFT_SHIFT, "LShift": Keycode.LEFT_SHIFT, "RShift": Keycode.RIGHT_SHIFT,
    "Ctrl": Keycode.LEFT_CONTROL, "LCtrl": Keycode.LEFT_CONTROL, "RCtrl": Keycode.RIGHT_CONTROL,
    "Alt": Keycode.LEFT_ALT, "LAlt": Keycode.LEFT_ALT, "RAlt": Keycode.RIGHT_ALT,
    "Gui": Keycode.LEFT_GUI, "Win": Keycode.LEFT_GUI, "LWin": Keycode.LEFT_GUI,

    # 矢印
    "Up": Keycode.UP_ARROW, "Down": Keycode.DOWN_ARROW,
    "Left": Keycode.LEFT_ARROW, "Right": Keycode.RIGHT_ARROW,

    # ファンクション
    "F1": Keycode.F1, "F2": Keycode.F2, "F3": Keycode.F3, "F4": Keycode.F4,
    "F5": Keycode.F5, "F6": Keycode.F6, "F7": Keycode.F7, "F8": Keycode.F8,
    "F9": Keycode.F9, "F10": Keycode.F10, "F11": Keycode.F11, "F12": Keycode.F12,

    # ナビゲーション・編集
    "Insert": Keycode.INSERT, "Ins": Keycode.INSERT,
    "Home": Keycode.HOME, "End": Keycode.END,
    "PageUp": Keycode.PAGE_UP, "PgUp": Keycode.PAGE_UP, "Page_Up": Keycode.PAGE_UP,
    "PageDown": Keycode.PAGE_DOWN, "PgDn": Keycode.PAGE_DOWN, "Page_Down": Keycode.PAGE_DOWN,
    "CapsLock": Keycode.CAPS_LOCK,

    # 記号
    "-": Keycode.MINUS, "Minus": Keycode.MINUS,
    "=": Keycode.EQUALS, "Equals": Keycode.EQUALS,
    "[": Keycode.LEFT_BRACKET, "LeftBracket": Keycode.LEFT_BRACKET,
    "]": Keycode.RIGHT_BRACKET, "RightBracket": Keycode.RIGHT_BRACKET,
    "\\": Keycode.BACKSLASH, "Backslash": Keycode.BACKSLASH,
    ";": Keycode.SEMICOLON, "Semicolon": Keycode.SEMICOLON,
    "'": Keycode.QUOTE, "Quote": Keycode.QUOTE,
    "`": Keycode.GRAVE_ACCENT, "Grave": Keycode.GRAVE_ACCENT,
    ",": Keycode.COMMA, "Comma": Keycode.COMMA,
    ".": Keycode.PERIOD, "Period": Keycode.PERIOD,
    "/": Keycode.FORWARD_SLASH, "Slash": Keycode.FORWARD_SLASH,
}

# マウスアクション定義
MOUSE_ACTION_MAP = {
    # ボタン (bitmask: 1=左, 2=右, 4=中, 8=戻る, 16=進む)
    "mouse_left": ("mouse_button", 1),
    "mouse_l": ("mouse_button", 1),
    "click_left": ("mouse_button", 1),
    "mouse_right": ("mouse_button", 2),
    "mouse_r": ("mouse_button", 2),
    "click_right": ("mouse_button", 2),
    "mouse_middle": ("mouse_button", 4),
    "mouse_m": ("mouse_button", 4),
    "click_middle": ("mouse_button", 4),
    "mouse_back": ("mouse_button", 8),
    "mouse_forward": ("mouse_button", 16),
    # ホイール (delta)
    "wheel_up": ("mouse_wheel", 1),
    "wheel_down": ("mouse_wheel", -1),
    "mouse_wheel_up": ("mouse_wheel", 1),
    "mouse_wheel_down": ("mouse_wheel", -1),
}

# ゲームパッドボタンエイリアス定義 (1〜16)
GAMEPAD_ALIAS_MAP = {
    "gamepad_a": 1,
    "gamepad_b": 2,
    "gamepad_x": 3,
    "gamepad_y": 4,
    "gamepad_lb": 5, "gamepad_l1": 5,
    "gamepad_rb": 6, "gamepad_r1": 6,
    "gamepad_lt": 7, "gamepad_l2": 7,
    "gamepad_rt": 8, "gamepad_r2": 8,
    "gamepad_select": 9, "gamepad_back": 9,
    "gamepad_start": 10,
    "gamepad_l3": 11, "gamepad_ls": 11,
    "gamepad_r3": 12, "gamepad_rs": 12,
    "gamepad_13": 13, "gamepad_14": 14,
    "gamepad_15": 15, "gamepad_16": 16,
}


def parse_action(name):
    """
    アクション名文字列をパースし、(type, value) のタプルを返します。
    戻り値:
        ('keyboard', keycode_int)
        ('mouse_button', bitmask_int)
        ('mouse_wheel', delta_int)
        ('gamepad_button', button_idx_1_to_16)
        None (認識できない場合)
    """
    if not name or not isinstance(name, str):
        return None

    cleaned = name.strip()
    lower = cleaned.lower()

    # 1. マウスアクション
    if lower in MOUSE_ACTION_MAP:
        return MOUSE_ACTION_MAP[lower]

    # 2. ゲームパッドアクション (Gamepad_1 〜 Gamepad_16)
    if lower.startswith("gamepad_") or lower.startswith("btn_"):
        parts = lower.split("_", 1)
        if len(parts) == 2:
            sub = parts[1]
            if sub.isdigit():
                num = int(sub)
                if 1 <= num <= 16:
                    return ("gamepad_button", num)
        if lower in GAMEPAD_ALIAS_MAP:
            return ("gamepad_button", GAMEPAD_ALIAS_MAP[lower])

    # 3. プロファイル切替アクション
    if lower == "profile_next":
        return ("profile_action", "next")
    if lower == "profile_prev":
        return ("profile_action", "prev")
    if lower in ("profile_default", "profile_reset"):
        return ("profile_action", "default")
    if lower.startswith("profile_switch:"):
        target_id = cleaned.split(":", 1)[1].strip()
        return ("profile_action", f"switch:{target_id}")

    # 4. レイヤー (Fnキー) アクション
    if lower == "fn" or lower == "layer:fn":
        return ("layer_action", "fn")
    if lower.startswith("layer:") or lower.startswith("layer_hold:"):
        layer_id = cleaned.split(":", 1)[1].strip().lower()
        return ("layer_action", layer_id)

    # 5. キーボードキー
    if cleaned in KEY_NAME_MAP:
        return ("keyboard", KEY_NAME_MAP[cleaned])
    for k, v in KEY_NAME_MAP.items():
        if k.lower() == lower:
            return ("keyboard", v)

    return None


def parse_actions(actions_list_or_str):
    """
    単一文字列またはリストを受け取り、カテゴリ分けされた辞書を返します。
    戻り値:
        {
            "keyboard": [keycode_int, ...],
            "mouse_buttons": int (bitmask),
            "mouse_wheel": int (delta),
            "gamepad_buttons": [button_num_int, ...],
            "profile_actions": [str, ...],
            "layer_actions": [str, ...]
        }
    """
    if isinstance(actions_list_or_str, str):
        # カンマ区切りの複数アクション対応 (例: "LCtrl, c")
        if "," in actions_list_or_str and not actions_list_or_str.startswith("tap:"):
            actions_list_or_str = [s.strip() for s in actions_list_or_str.split(",") if s.strip()]
        else:
            actions_list_or_str = [actions_list_or_str]

    result = {
        "keyboard": [],
        "mouse_buttons": 0,
        "mouse_wheel": 0,
        "gamepad_buttons": [],
        "profile_actions": [],
        "layer_actions": []
    }

    for item in actions_list_or_str:
        parsed = parse_action(item)
        if parsed is None:
            continue
        atype, aval = parsed
        if atype == "keyboard":
            result["keyboard"].append(aval)
        elif atype == "mouse_button":
            result["mouse_buttons"] |= aval
        elif atype == "mouse_wheel":
            result["mouse_wheel"] += aval
        elif atype == "gamepad_button":
            result["gamepad_buttons"].append(aval)
        elif atype == "profile_action":
            result["profile_actions"].append(aval)
        elif atype == "layer_action":
            result["layer_actions"].append(aval)

    return result


def parse_button_def(btn_def):
    """
    ボタン設定を解析し、通常設定またはTap-Hold設定を返します。
    形式:
      1) 通常: "Space", ["LCtrl", "c"]
      2) Tap-Hold 文字列: "tap:E|hold:F|ms:300"
      3) Tap-Hold 辞書: {"tap": "E", "hold": "F", "hold_ms": 300}
    戻り値:
      {
          "is_tap_hold": bool,
          "hold_ms": int,
          "actions": dict,        # is_tap_hold=False 時の通常アクション
          "tap_actions": dict,    # is_tap_hold=True 時の短押しアクション
          "hold_actions": dict    # is_tap_hold=True 時の長押しアクション
      }
    """
    empty_actions = {
        "keyboard": [],
        "mouse_buttons": 0,
        "mouse_wheel": 0,
        "gamepad_buttons": [],
        "profile_actions": [],
        "layer_actions": []
    }

    if not btn_def:
        return {
            "is_tap_hold": False,
            "hold_ms": 300,
            "actions": empty_actions,
            "tap_actions": empty_actions,
            "hold_actions": empty_actions
        }

    # 形式 3: 辞書型
    if isinstance(btn_def, dict):
        if "tap" in btn_def or "hold" in btn_def:
            tap_str = btn_def.get("tap", "")
            hold_str = btn_def.get("hold", "")
            hold_ms = int(btn_def.get("hold_ms", 300))
            return {
                "is_tap_hold": True,
                "hold_ms": max(50, hold_ms),
                "actions": empty_actions,
                "tap_actions": parse_actions(tap_str),
                "hold_actions": parse_actions(hold_str)
            }
        else:
            return {
                "is_tap_hold": False,
                "hold_ms": 300,
                "actions": empty_actions,
                "tap_actions": empty_actions,
                "hold_actions": empty_actions
            }

    # 形式 2: 文字列型で "tap:..." を含む場合
    if isinstance(btn_def, str) and ("tap:" in btn_def or "hold:" in btn_def):
        tap_str = ""
        hold_str = ""
        hold_ms = 300
        parts = btn_def.split("|")
        for part in parts:
            part = part.strip()
            if part.startswith("tap:"):
                tap_str = part.split(":", 1)[1].strip()
            elif part.startswith("hold:"):
                hold_str = part.split(":", 1)[1].strip()
            elif part.startswith("ms:"):
                try:
                    hold_ms = int(part.split(":", 1)[1].strip())
                except ValueError:
                    hold_ms = 300

        return {
            "is_tap_hold": True,
            "hold_ms": max(50, hold_ms),
            "actions": empty_actions,
            "tap_actions": parse_actions(tap_str),
            "hold_actions": parse_actions(hold_str)
        }

    # 形式 1: 通常のキー・アクション設定
    return {
        "is_tap_hold": False,
        "hold_ms": 300,
        "actions": parse_actions(btn_def),
        "tap_actions": empty_actions,
        "hold_actions": empty_actions
    }


def parse_combos(combos_list):
    """
    コンボ設定のリストをパースして前処理済みリストを返します。
    combos_list: [
        { "buttons": [9, 11], "action": "profile_next", "hold_ms": 600 }, ...
    ]
    """
    if not combos_list or not isinstance(combos_list, list):
        return []

    parsed = []
    for item in combos_list:
        if not isinstance(item, dict):
            continue
        btns = item.get("buttons", [])
        if not isinstance(btns, list) or len(btns) < 2:
            continue
        act = item.get("action", "")
        hold_ms = int(item.get("hold_ms", 0))

        parsed.append({
            "buttons": sorted([int(b) for b in btns]),
            "hold_ms": max(0, hold_ms),
            "actions": parse_actions(act)
        })

    return parsed


def parse_key(key_name):
    """既存互換用: キー名文字列からHID Keycodeを取得（見つからない場合はNone）"""
    res = parse_action(key_name)
    if res and res[0] == "keyboard":
        return res[1]
    return None


def parse_keys(key_list_or_str):
    """既存互換用: 単一文字列または文字列リストを受け取り、Keycodeリストを返す"""
    res = parse_actions(key_list_or_str)
    return res["keyboard"]
