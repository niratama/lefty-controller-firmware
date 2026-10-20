// Lefty Controller Configurator Client Script

const WEBUI_VERSION = "1.10.0";
const MIN_RECOMMENDED_FW_VERSION = "1.5.0";

// ハードウェア固有の物理ピン定義 (基板固定仕様 / プロファイル非依存)
const HARDWARE_PINS = {
  buttons: [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 9, 10, 12],
  adc_x: 27,
  adc_y: 26
};

// プロファイル標準LEDカラー (インデックス順: 青, 緑, 紫, 橙/黄, ターコイズ, 赤)
const DEFAULT_PROFILE_HEX_COLORS = [
  "#008cff", // Profile 0: シアン / ブルー
  "#00ff3c", // Profile 1: グリーン
  "#b400ff", // Profile 2: パープル
  "#ffb400", // Profile 3: オレンジ / イエロー
  "#00ffe6", // Profile 4: ターコイズ
  "#ff2800", // Profile 5: レッド
];

function getProfileColor(profile, index = 0) {
  if (profile && profile.color && typeof profile.color === "string" && /^#[0-9a-fA-F]{6}$/.test(profile.color)) {
    return profile.color.toLowerCase();
  }
  return DEFAULT_PROFILE_HEX_COLORS[index % DEFAULT_PROFILE_HEX_COLORS.length];
}

const PIN_NAMES = [
  "SW1 (1)",
  "SW2 (2)",
  "SW3 (X)",
  "SW4 (E)",
  "SW5 (Ta)",
  "SW6 (F)",
  "SW7 (Q)",
  "SW8 (4)",
  "SW9 (3)",
  "SW10 (側面 上)",
  "SW11 (側面 中)",
  "SW12 (側面 下)",
  "SW_STK (スティック押込)"
];

const BUTTON_LABELS = [
  "1", "2", "X", "E", "Ta", "F", "Q", "4", "3",
  "側面上", "側面中", "側面下", "STK"
];

// ==========================================
// 対応キー・アクションカタログ定義 & バリデーション
// ==========================================
const SUPPORTED_KEY_CATALOG = [
  {
    category: "kbd_alpha",
    name: "英数字",
    icon: "🔤",
    keys: [
      { id: "A", label: "A", desc: "キー A" },
      { id: "B", label: "B", desc: "キー B" },
      { id: "C", label: "C", desc: "キー C" },
      { id: "D", label: "D", desc: "キー D" },
      { id: "E", label: "E", desc: "キー E" },
      { id: "F", label: "F", desc: "キー F" },
      { id: "G", label: "G", desc: "キー G" },
      { id: "H", label: "H", desc: "キー H" },
      { id: "I", label: "I", desc: "キー I" },
      { id: "J", label: "J", desc: "キー J" },
      { id: "K", label: "K", desc: "キー K" },
      { id: "L", label: "L", desc: "キー L" },
      { id: "M", label: "M", desc: "キー M" },
      { id: "N", label: "N", desc: "キー N" },
      { id: "O", label: "O", desc: "キー O" },
      { id: "P", label: "P", desc: "キー P" },
      { id: "Q", label: "Q", desc: "キー Q" },
      { id: "R", label: "R", desc: "キー R" },
      { id: "S", label: "S", desc: "キー S" },
      { id: "T", label: "T", desc: "キー T" },
      { id: "U", label: "U", desc: "キー U" },
      { id: "V", label: "V", desc: "キー V" },
      { id: "W", label: "W", desc: "キー W" },
      { id: "X", label: "X", desc: "キー X" },
      { id: "Y", label: "Y", desc: "キー Y" },
      { id: "Z", label: "Z", desc: "キー Z" },
      { id: "1", label: "1", desc: "数字 1" },
      { id: "2", label: "2", desc: "数字 2" },
      { id: "3", label: "3", desc: "数字 3" },
      { id: "4", label: "4", desc: "数字 4" },
      { id: "5", label: "5", desc: "数字 5" },
      { id: "6", label: "6", desc: "数字 6" },
      { id: "7", label: "7", desc: "数字 7" },
      { id: "8", label: "8", desc: "数字 8" },
      { id: "9", label: "9", desc: "数字 9" },
      { id: "0", label: "0", desc: "数字 0" },
    ]
  },
  {
    category: "kbd_special",
    name: "特殊・制御",
    icon: "🎯",
    keys: [
      { id: "Space", label: "Space", desc: "スペースバー" },
      { id: "Enter", label: "Enter", desc: "決定 / リターン" },
      { id: "Tab", label: "Tab", desc: "タブ" },
      { id: "Escape", label: "Esc", desc: "エスケープ" },
      { id: "Backspace", label: "Backspace", desc: "後退 / 1文字削除" },
      { id: "Delete", label: "Delete", desc: "削除" },
      { id: "Insert", label: "Insert", desc: "挿入" },
      { id: "Home", label: "Home", desc: "先頭へ移動" },
      { id: "End", label: "End", desc: "末尾へ移動" },
      { id: "PageUp", label: "PageUp", desc: "前のページ" },
      { id: "PageDown", label: "PageDown", desc: "次のページ" },
      { id: "CapsLock", label: "CapsLock", desc: "キャプスロック" },
    ]
  },
  {
    category: "kbd_mod",
    name: "修飾キー",
    icon: "⚡",
    keys: [
      { id: "Shift", label: "Shift", desc: "シフト (左/共通)" },
      { id: "LCtrl", label: "Ctrl (左)", desc: "左コントロール" },
      { id: "RCtrl", label: "Ctrl (右)", desc: "右コントロール" },
      { id: "LAlt", label: "Alt (左)", desc: "左オルト" },
      { id: "RAlt", label: "Alt (右)", desc: "右オルト" },
      { id: "Win", label: "Win / Command", desc: "Windows / Command" },
    ]
  },
  {
    category: "kbd_symbols",
    name: "記号",
    icon: "🔣",
    keys: [
      { id: "-", label: "-", desc: "ハイフン / マイナス" },
      { id: "=", label: "=", desc: "イコール" },
      { id: "[", label: "[", desc: "左ブラケット" },
      { id: "]", label: "]", desc: "右ブラケット" },
      { id: "\\", label: "\\", desc: "バックスラッシュ" },
      { id: ";", label: ";", desc: "セミコロン" },
      { id: "'", label: "'", desc: "アポストロフィ / クォート" },
      { id: "`", label: "`", desc: "バッククォート" },
      { id: ",", label: ",", desc: "カンマ" },
      { id: ".", label: ".", desc: "ピリオド" },
      { id: "/", label: "/", desc: "スラッシュ" },
    ]
  },
  {
    category: "kbd_fn_arrow",
    name: "矢印・Fキー",
    icon: "🕹️",
    keys: [
      { id: "Up", label: "↑ Up", desc: "上矢印" },
      { id: "Down", label: "↓ Down", desc: "下矢印" },
      { id: "Left", label: "← Left", desc: "左矢印" },
      { id: "Right", label: "→ Right", desc: "右矢印" },
      { id: "F1", label: "F1", desc: "ファンクション 1" },
      { id: "F2", label: "F2", desc: "ファンクション 2" },
      { id: "F3", label: "F3", desc: "ファンクション 3" },
      { id: "F4", label: "F4", desc: "ファンクション 4" },
      { id: "F5", label: "F5", desc: "ファンクション 5" },
      { id: "F6", label: "F6", desc: "ファンクション 6" },
      { id: "F7", label: "F7", desc: "ファンクション 7" },
      { id: "F8", label: "F8", desc: "ファンクション 8" },
      { id: "F9", label: "F9", desc: "ファンクション 9" },
      { id: "F10", label: "F10", desc: "ファンクション 10" },
      { id: "F11", label: "F11", desc: "ファンクション 11" },
      { id: "F12", label: "F12", desc: "ファンクション 12" },
    ]
  },
  {
    category: "mouse",
    name: "マウス操作",
    icon: "🖱️",
    keys: [
      { id: "Mouse_Left", label: "左クリック", desc: "左ボタン クリック" },
      { id: "Mouse_Right", label: "右クリック", desc: "右ボタン クリック" },
      { id: "Mouse_Middle", label: "中クリック", desc: "ホイール押込 クリック" },
      { id: "Mouse_Back", label: "戻る", desc: "サイドボタン (手前)" },
      { id: "Mouse_Forward", label: "進む", desc: "サイドボタン (奥)" },
      { id: "Wheel_Up", label: "ホイール上", desc: "スクロール 上回転" },
      { id: "Wheel_Down", label: "ホイール下", desc: "スクロール 下回転" },
    ]
  },
  {
    category: "gamepad",
    name: "ゲームパッド",
    icon: "🎮",
    keys: [
      { id: "Gamepad_A", label: "A (1)", desc: "Aボタン / ×" },
      { id: "Gamepad_B", label: "B (2)", desc: "Bボタン / ◯" },
      { id: "Gamepad_X", label: "X (3)", desc: "Xボタン / □" },
      { id: "Gamepad_Y", label: "Y (4)", desc: "Yボタン / △" },
      { id: "Gamepad_LB", label: "LB / L1 (5)", desc: "左バンパー" },
      { id: "Gamepad_RB", label: "RB / R1 (6)", desc: "右バンパー" },
      { id: "Gamepad_LT", label: "LT / L2 (7)", desc: "左トリガー" },
      { id: "Gamepad_RT", label: "RT / R2 (8)", desc: "右トリガー" },
      { id: "Gamepad_Select", label: "Select (9)", desc: "セレクト / ビュー / Back" },
      { id: "Gamepad_Start", label: "Start (10)", desc: "スタート / メニュー" },
      { id: "Gamepad_L3", label: "L3 / LS (11)", desc: "左スティック 押し込み" },
      { id: "Gamepad_R3", label: "R3 / RS (12)", desc: "右スティック 押し込み" },
      { id: "Gamepad_13", label: "BTN 13", desc: "拡張ボタン 13" },
      { id: "Gamepad_14", label: "BTN 14", desc: "拡張ボタン 14" },
      { id: "Gamepad_15", label: "BTN 15", desc: "拡張ボタン 15" },
      { id: "Gamepad_16", label: "BTN 16", desc: "拡張ボタン 16" },
    ]
  },
  {
    category: "profile",
    name: "プロファイル切替",
    icon: "🔄",
    keys: [
      { id: "profile_next", label: "次のプロファイル", desc: "デバイス内の次のプロファイルへ循環切替" },
      { id: "profile_prev", label: "前のプロファイル", desc: "デバイス内の前のプロファイルへ循環切替" },
      { id: "profile_default", label: "デフォルトへ復帰", desc: "初期プロファイル (#1) へ即座に切り替え" },
    ]
  },
  {
    category: "layer",
    name: "レイヤー (Fn)",
    icon: "📑",
    keys: [
      { id: "layer:fn", label: "Fnキー (押下中レイヤー切替)", desc: "このボタンを押している間だけFn裏面レイヤーのキーマップが有効になります" },
    ]
  }
];

const ALL_VALID_KEYS_SET = new Set();
SUPPORTED_KEY_CATALOG.forEach(cat => {
  cat.keys.forEach(k => {
    ALL_VALID_KEYS_SET.add(k.id.toLowerCase());
  });
});
[
  "esc", "del", "ins", "return", "spacebar", "lshift", "rshift", "ctrl", "lctrl", "rctrl",
  "alt", "lalt", "ralt", "gui", "windows", "command", "pgup", "pgdn", "page_up", "page_down",
  "mouse_l", "click_left", "mouse_r", "click_right", "mouse_m", "click_middle",
  "mouse_wheel_up", "mouse_wheel_down", "gamepad_l1", "gamepad_r1", "gamepad_l2", "gamepad_r2",
  "gamepad_back", "gamepad_ls", "gamepad_rs", "minus", "equals", "leftbracket", "rightbracket",
  "backslash", "semicolon", "quote", "grave", "comma", "period", "slash",
  "profile_reset", "fn", "layer:fn", "layer_hold:fn"
].forEach(a => ALL_VALID_KEYS_SET.add(a));

function isValidActionName(name) {
  if (!name || typeof name !== "string") return false;
  const lower = name.trim().toLowerCase();
  if (ALL_VALID_KEYS_SET.has(lower)) return true;
  if (/^(gamepad|btn)_\d{1,2}$/.test(lower)) {
    const num = parseInt(lower.split("_")[1], 10);
    return num >= 1 && num <= 16;
  }
  if (/^profile_switch:[a-zA-Z0-9_\-]+$/.test(lower)) {
    return true;
  }
  if (/^layer(_hold)?:[a-zA-Z0-9_\-]+$/.test(lower)) {
    return true;
  }
  return false;
}

function validateKeyString(str) {
  if (!str || !str.trim()) return { valid: true, empty: true };
  const trimmed = str.trim();

  // Tap-Hold 表記 (例: "tap:E|hold:F|ms:300")
  if (trimmed.includes("tap:") || trimmed.includes("hold:")) {
    const parts = trimmed.split("|").map(s => s.trim());
    for (const part of parts) {
      if (part.startsWith("tap:") || part.startsWith("hold:")) {
        const act = part.slice(part.indexOf(":") + 1).trim();
        const subRes = validateKeyString(act);
        if (!subRes.valid) return subRes;
      } else if (part.startsWith("ms:")) {
        const ms = parseInt(part.slice(3).trim(), 10);
        if (isNaN(ms) || ms < 50 || ms > 2000) return { valid: false, invalidPart: part };
      }
    }
    return { valid: true, isTapHold: true };
  }

  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return { valid: true, empty: true };
  for (const part of parts) {
    if (!isValidActionName(part)) {
      return { valid: false, invalidPart: part };
    }
  }
  return { valid: true, parts };
}

function updateValidationBadge(input, badge) {
  if (!badge) return;
  const res = validateKeyString(input.value);
  if (res.empty) {
    badge.textContent = "";
    badge.className = "key-valid-badge";
    input.classList.remove("invalid-key");
  } else if (res.valid) {
    badge.textContent = "✓";
    badge.title = "有効なキー設定です";
    badge.className = "key-valid-badge valid";
    input.classList.remove("invalid-key");
  } else {
    badge.textContent = "⚠️";
    badge.title = `「${res.invalidPart}」は認識できないキー名です`;
    badge.className = "key-valid-badge invalid";
    input.classList.add("invalid-key");
  }
}

let lastFocusedInput = null;

// プロファイル固有ID (UUID / ユニークID) 生成
function generateProfileId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return "prof_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return "prof_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
}

const DEFAULT_CONFIG = {
  version: "1.9.0",
  active_profile: 0,
  profiles: [
    {
      id: "prof_fps_default",
      name: "プロファイル 1 (FPS/汎用)",
      color: "#008cff",
      keymap: {
        buttons: ["1", "2", "x", "e", "Tab", "f", "q", "4", "3", "Space", "z", "LCtrl", "LAlt"],
        fn_buttons: ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "Space", "z", "LCtrl", "LAlt"],
        combos: [
          { buttons: [9, 11], action: "profile_next", hold_ms: 600 }
        ]
      },
      joystick: {
        mode: "keyboard",
        direction_mode: "8way",
        enable_run: true,
        gamepad_target: "left_stick",
        dpad_walk_btn: "",
        dpad_run_btn: "Gamepad_2",
        mouse_speed: 12,
        mouse_curve_type: "power",
        mouse_curve: "smooth",
        mouse_curve_points: [0.15, 0.40, 0.75, 1.0],
        mouse_walk_ratio: 0.55,
        mouse_min_speed: 0.0,
        mouse_dynamic_accel: 0.0,
        mouse_aspect_ratio: 1.0,
        deadzone: 2500,
        hysteresis: 1500,
        invert_x: false,
        invert_y: false,
        rotation: 90,
        directions: {
          up: { th_walk: 3000, th_run: 26000, key_walk: "W", key_run: ["Shift", "W"] },
          down: { th_walk: 3000, th_run: 26000, key_walk: "S", key_run: ["Shift", "S"] },
          left: { th_walk: 3000, th_run: 26000, key_walk: "A", key_run: ["Shift", "A"] },
          right: { th_walk: 3000, th_run: 26000, key_walk: "D", key_run: ["Shift", "D"] }
        }
      }
    },
    {
      id: "prof_gamepad_default",
      name: "プロファイル 2 (ゲームパッド)",
      color: "#00ff3c",
      keymap: {
        buttons: [
          "Gamepad_1", "Gamepad_2", "Gamepad_3", "Gamepad_4",
          "Gamepad_5", "Gamepad_6", "Gamepad_7", "Gamepad_8",
          "Gamepad_9", "Gamepad_10", "Gamepad_11", "Gamepad_12", "Gamepad_13"
        ]
      },
      joystick: {
        mode: "gamepad",
        direction_mode: "8way",
        enable_run: true,
        gamepad_target: "left_stick",
        dpad_walk_btn: "",
        dpad_run_btn: "Gamepad_2",
        mouse_speed: 12,
        mouse_curve_type: "power",
        mouse_curve: "smooth",
        mouse_curve_points: [0.15, 0.40, 0.75, 1.0],
        mouse_walk_ratio: 0.55,
        mouse_min_speed: 0.0,
        mouse_dynamic_accel: 0.0,
        mouse_aspect_ratio: 1.0,
        deadzone: 2500,
        hysteresis: 1500,
        invert_x: false,
        invert_y: false,
        rotation: 90,
        directions: {
          up: { th_walk: 3000, th_run: 26000, key_walk: "W", key_run: ["Shift", "W"] },
          down: { th_walk: 3000, th_run: 26000, key_walk: "S", key_run: ["Shift", "S"] },
          left: { th_walk: 3000, th_run: 26000, key_walk: "A", key_run: ["Shift", "A"] },
          right: { th_walk: 3000, th_run: 26000, key_walk: "D", key_run: ["Shift", "D"] }
        }
      }
    },
    {
      id: "prof_mouse_default",
      name: "プロファイル 3 (マウス & 作業用)",
      color: "#b400ff",
      keymap: {
        buttons: [
          "Mouse_Left", "Mouse_Right", "Mouse_Middle", "Wheel_Up", "Wheel_Down",
          ["LCtrl", "z"], ["LCtrl", "y"], ["LCtrl", "c"], ["LCtrl", "v"],
          "Space", "Tab", "LCtrl", "LAlt"
        ]
      },
      joystick: {
        mode: "mouse",
        direction_mode: "8way",
        enable_run: true,
        gamepad_target: "left_stick",
        dpad_walk_btn: "",
        dpad_run_btn: "Gamepad_2",
        mouse_speed: 12,
        mouse_curve_type: "power",
        mouse_curve: "smooth",
        mouse_curve_points: [0.15, 0.40, 0.75, 1.0],
        mouse_walk_ratio: 0.55,
        mouse_min_speed: 0.0,
        mouse_dynamic_accel: 0.0,
        mouse_aspect_ratio: 1.0,
        deadzone: 2500,
        hysteresis: 1500,
        invert_x: false,
        invert_y: false,
        rotation: 90,
        directions: {
          up: { th_walk: 3000, th_run: 26000, key_walk: "Up", key_run: ["Shift", "Up"] },
          down: { th_walk: 3000, th_run: 26000, key_walk: "Down", key_run: ["Shift", "Down"] },
          left: { th_walk: 3000, th_run: 26000, key_walk: "Left", key_run: ["Shift", "Left"] },
          right: { th_walk: 3000, th_run: 26000, key_walk: "Right", key_run: ["Shift", "Right"] }
        }
      }
    }
  ],
  keymap: {
    buttons: ["1", "2", "x", "e", "Tab", "f", "q", "4", "3", "Space", "z", "LCtrl", "LAlt"],
    fn_buttons: ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "Space", "z", "LCtrl", "LAlt"],
    combos: [
      { buttons: [9, 11], action: "profile_next", hold_ms: 600 }
    ]
  },
  joystick: {
    mode: "keyboard",
    direction_mode: "8way",
    enable_run: true,
    gamepad_target: "left_stick",
    dpad_walk_btn: "",
    dpad_run_btn: "Gamepad_2",
    mouse_speed: 12,
    mouse_curve_type: "power",
    mouse_curve: "smooth",
    mouse_curve_points: [0.15, 0.40, 0.75, 1.0],
    mouse_walk_ratio: 0.55,
    mouse_min_speed: 0.0,
    mouse_dynamic_accel: 0.0,
    mouse_aspect_ratio: 1.0,
    deadzone: 2500,
    hysteresis: 1500,
    invert_x: false,
    invert_y: false,
    rotation: 90,
    directions: {
      up: { th_walk: 3000, th_run: 26000, key_walk: "W", key_run: ["Shift", "W"] },
      down: { th_walk: 3000, th_run: 26000, key_walk: "S", key_run: ["Shift", "S"] },
      left: { th_walk: 3000, th_run: 26000, key_walk: "A", key_run: ["Shift", "A"] },
      right: { th_walk: 3000, th_run: 26000, key_walk: "D", key_run: ["Shift", "D"] }
    }
  }
};

// プリセットプロファイル一覧
const PRESET_PROFILES = [
  {
    name: "FPS / 汎用 (WASD移動 + Run)",
    description: "キーボードWASD移動、Shift走り、13キーFPS標準レイアウト",
    keymap: {
      buttons: ["1", "2", "x", "e", "Tab", "f", "q", "4", "3", "Space", "z", "LCtrl", "LAlt"]
    },
    joystick: {
      mode: "keyboard",
      direction_mode: "8way",
      enable_run: true,
      gamepad_target: "left_stick",
      dpad_walk_btn: "",
      dpad_run_btn: "Gamepad_2",
      mouse_speed: 12,
      mouse_curve_type: "power",
      mouse_curve: "smooth",
      mouse_curve_points: [0.15, 0.40, 0.75, 1.0],
      mouse_walk_ratio: 0.55,
      mouse_min_speed: 0.0,
      mouse_dynamic_accel: 0.0,
      mouse_aspect_ratio: 1.0,
      deadzone: 2500,
      hysteresis: 1500,
      invert_x: false,
      invert_y: false,
      rotation: 90,
      directions: {
        up:    { th_walk: 3000, th_run: 26000, key_walk: "W", key_run: ["Shift", "W"] },
        down:  { th_walk: 3000, th_run: 26000, key_walk: "S", key_run: ["Shift", "S"] },
        left:  { th_walk: 3000, th_run: 26000, key_walk: "A", key_run: ["Shift", "A"] },
        right: { th_walk: 3000, th_run: 26000, key_walk: "D", key_run: ["Shift", "D"] }
      }
    }
  },
  {
    name: "左スティック (ゲームパッド XY)",
    description: "左スティック(X/Y軸)アナログ移動、ゲームパッド13ボタン",
    keymap: {
      buttons: ["Gamepad_1", "Gamepad_2", "Gamepad_3", "Gamepad_4", "Gamepad_5", "Gamepad_6", "Gamepad_7", "Gamepad_8", "Gamepad_9", "Gamepad_10", "Gamepad_11", "Gamepad_12", "Gamepad_13"]
    },
    joystick: {
      mode: "gamepad",
      direction_mode: "8way",
      enable_run: true,
      gamepad_target: "left_stick",
      dpad_walk_btn: "",
      dpad_run_btn: "Gamepad_2",
      mouse_speed: 12,
      mouse_curve_type: "power",
      mouse_curve: "smooth",
      mouse_curve_points: [0.15, 0.40, 0.75, 1.0],
      mouse_walk_ratio: 0.55,
      mouse_min_speed: 0.0,
      mouse_dynamic_accel: 0.0,
      mouse_aspect_ratio: 1.0,
      deadzone: 2500,
      hysteresis: 1500,
      invert_x: false,
      invert_y: false,
      rotation: 90,
      directions: {
        up:    { th_walk: 3000, th_run: 26000, key_walk: "W", key_run: ["Shift", "W"] },
        down:  { th_walk: 3000, th_run: 26000, key_walk: "S", key_run: ["Shift", "S"] },
        left:  { th_walk: 3000, th_run: 26000, key_walk: "A", key_run: ["Shift", "A"] },
        right: { th_walk: 3000, th_run: 26000, key_walk: "D", key_run: ["Shift", "D"] }
      }
    }
  },
  {
    name: "右スティック (カメラ Z/Rz)",
    description: "右スティック(Z/Rz軸)カメラ操作用、ゲームパッド13ボタン",
    keymap: {
      buttons: ["Gamepad_1", "Gamepad_2", "Gamepad_3", "Gamepad_4", "Gamepad_5", "Gamepad_6", "Gamepad_7", "Gamepad_8", "Gamepad_9", "Gamepad_10", "Gamepad_11", "Gamepad_12", "Gamepad_13"]
    },
    joystick: {
      mode: "gamepad",
      direction_mode: "8way",
      enable_run: false,
      gamepad_target: "right_stick",
      dpad_walk_btn: "",
      dpad_run_btn: "",
      mouse_speed: 12,
      mouse_curve_type: "power",
      mouse_curve: "smooth",
      mouse_curve_points: [0.15, 0.40, 0.75, 1.0],
      mouse_walk_ratio: 0.55,
      mouse_min_speed: 0.0,
      mouse_dynamic_accel: 0.0,
      mouse_aspect_ratio: 1.0,
      deadzone: 2500,
      hysteresis: 1500,
      invert_x: false,
      invert_y: false,
      rotation: 90,
      directions: {
        up:    { th_walk: 3000, th_run: 26000, key_walk: "W", key_run: ["Shift", "W"] },
        down:  { th_walk: 3000, th_run: 26000, key_walk: "S", key_run: ["Shift", "S"] },
        left:  { th_walk: 3000, th_run: 26000, key_walk: "A", key_run: ["Shift", "A"] },
        right: { th_walk: 3000, th_run: 26000, key_walk: "D", key_run: ["Shift", "D"] }
      }
    }
  },
  {
    name: "D-Pad 十字キー (ハットスイッチ 8方向)",
    description: "ハットスイッチによる十字キー入力、Walk/Run(Bダッシュ)ボタン連動対応",
    keymap: {
      buttons: ["Gamepad_1", "Gamepad_2", "Gamepad_3", "Gamepad_4", "Gamepad_5", "Gamepad_6", "Gamepad_7", "Gamepad_8", "Gamepad_9", "Gamepad_10", "Gamepad_11", "Gamepad_12", "Gamepad_13"]
    },
    joystick: {
      mode: "gamepad",
      direction_mode: "8way",
      enable_run: true,
      gamepad_target: "dpad",
      dpad_walk_btn: "",
      dpad_run_btn: "Gamepad_2",
      mouse_speed: 12,
      mouse_curve_type: "power",
      mouse_curve: "smooth",
      mouse_curve_points: [0.15, 0.40, 0.75, 1.0],
      mouse_walk_ratio: 0.55,
      mouse_min_speed: 0.0,
      mouse_dynamic_accel: 0.0,
      mouse_aspect_ratio: 1.0,
      deadzone: 2500,
      hysteresis: 1500,
      invert_x: false,
      invert_y: false,
      rotation: 90,
      directions: {
        up:    { th_walk: 3000, th_run: 26000, key_walk: "W", key_run: ["Shift", "W"] },
        down:  { th_walk: 3000, th_run: 26000, key_walk: "S", key_run: ["Shift", "S"] },
        left:  { th_walk: 3000, th_run: 26000, key_walk: "A", key_run: ["Shift", "A"] },
        right: { th_walk: 3000, th_run: 26000, key_walk: "D", key_run: ["Shift", "D"] }
      }
    }
  },
  {
    name: "マウス & 作業用 (ショートカット)",
    description: "スティックでマウスカーソル移動、ホイールやコピペ・Undo/Redoショートカット",
    keymap: {
      buttons: [
        "Mouse_Left", "Mouse_Right", "Mouse_Middle", "Wheel_Up", "Wheel_Down",
        ["LCtrl", "z"], ["LCtrl", "y"], ["LCtrl", "c"], ["LCtrl", "v"],
        "Space", "Tab", "LCtrl", "LAlt"
      ]
    },
    joystick: {
      mode: "mouse",
      direction_mode: "8way",
      enable_run: true,
      gamepad_target: "left_stick",
      dpad_walk_btn: "",
      dpad_run_btn: "Gamepad_2",
      mouse_speed: 12,
      mouse_curve_type: "power",
      mouse_curve: "smooth",
      mouse_curve_points: [0.15, 0.40, 0.75, 1.0],
      mouse_walk_ratio: 0.55,
      mouse_min_speed: 0.0,
      mouse_dynamic_accel: 0.0,
      mouse_aspect_ratio: 1.0,
      deadzone: 2500,
      hysteresis: 1500,
      invert_x: false,
      invert_y: false,
      rotation: 90,
      directions: {
        up:    { th_walk: 3000, th_run: 26000, key_walk: "Up", key_run: ["Shift", "Up"] },
        down:  { th_walk: 3000, th_run: 26000, key_walk: "Down", key_run: ["Shift", "Down"] },
        left:  { th_walk: 3000, th_run: 26000, key_walk: "Left", key_run: ["Shift", "Left"] },
        right: { th_walk: 3000, th_run: 26000, key_walk: "Right", key_run: ["Shift", "Right"] }
      }
    }
  },
  {
    name: "MMO / 4方向スナップ (誤爆防止)",
    description: "4方向スナップ(4way_snap)で斜め誤入力を防止、ホットバー1〜9＋Space/Esc",
    keymap: {
      buttons: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Space", "Tab", "Escape", "M"]
    },
    joystick: {
      mode: "keyboard",
      direction_mode: "4way_snap",
      enable_run: true,
      gamepad_target: "left_stick",
      dpad_walk_btn: "",
      dpad_run_btn: "Gamepad_2",
      mouse_speed: 12,
      mouse_curve_type: "power",
      mouse_curve: "smooth",
      mouse_curve_points: [0.15, 0.40, 0.75, 1.0],
      mouse_walk_ratio: 0.55,
      mouse_min_speed: 0.0,
      mouse_dynamic_accel: 0.0,
      mouse_aspect_ratio: 1.0,
      deadzone: 2500,
      hysteresis: 1500,
      invert_x: false,
      invert_y: false,
      rotation: 90,
      directions: {
        up:    { th_walk: 3000, th_run: 26000, key_walk: "W", key_run: ["Shift", "W"] },
        down:  { th_walk: 3000, th_run: 26000, key_walk: "S", key_run: ["Shift", "S"] },
        left:  { th_walk: 3000, th_run: 26000, key_walk: "A", key_run: ["Shift", "A"] },
        right: { th_walk: 3000, th_run: 26000, key_walk: "D", key_run: ["Shift", "D"] }
      }
    }
  }
];

let currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
let serialPort = null;
let reader = null;
let writer = null;
let isMonitoring = false;
let isRebootPending = false;
let isDisconnecting = false;
let currentTelemetry = {
  raw: [32768, 32768],
  dx: 0,
  dy: 0,
  states: { up: 0, down: 0, left: 0, right: 0 },
  btns: []
};

// 拡張入力編集ステート (通常/Fnレイヤー & Tap-Hold)
let currentEditingLayer = "base"; // "base" | "fn"
let currentTapHoldTarget = { input: null, buttonIndex: null };

// DOM要素取得
const connStatus = document.getElementById("connStatus");
const fwVersionBadge = document.getElementById("fwVersionBadge");
const versionAlertBanner = document.getElementById("versionAlertBanner");
const versionAlertTitle = document.getElementById("versionAlertTitle");
const versionAlertDetail = document.getElementById("versionAlertDetail");
const btnDismissVersionAlert = document.getElementById("btnDismissVersionAlert");
const safeModeAlertBanner = document.getElementById("safeModeAlertBanner");
const safeModeAlertDetail = document.getElementById("safeModeAlertDetail");
const btnSendCtrlD = document.getElementById("btnSendCtrlD");
const btnDismissSafeModeAlert = document.getElementById("btnDismissSafeModeAlert");

const btnConnect = document.getElementById("btnConnect");
const btnDisconnect = document.getElementById("btnDisconnect");
const btnLoadConfig = document.getElementById("btnLoadConfig");
const btnSaveConfig = document.getElementById("btnSaveConfig");
const btnExportJson = document.getElementById("btnExportJson");
const fileImportJson = document.getElementById("fileImportJson");
const btnResetDefault = document.getElementById("btnResetDefault");
const btnCalibrate = document.getElementById("btnCalibrate");
const btnToggleMonitor = document.getElementById("btnToggleMonitor");
const logArea = document.getElementById("logArea");
const btnClearLog = document.getElementById("btnClearLog");
const btnEnterMaintenance = document.getElementById("btnEnterMaintenance");
const btnRebootNormal = document.getElementById("btnRebootNormal");

// タブ & サイドバーDOM要素
const navItems = document.querySelectorAll(".nav-item[data-tab]");
const tabPanes = document.querySelectorAll(".tab-pane");
const sidebarActiveProfileName = document.getElementById("sidebarActiveProfileName");
const sidebarProfileSelect = document.getElementById("sidebarProfileSelect");

// プロファイルDOM要素
const profileSelect = document.getElementById("profileSelect");
const profileNameInput = document.getElementById("profileNameInput");
const btnAddProfile = document.getElementById("btnAddProfile");
const btnDuplicateProfile = document.getElementById("btnDuplicateProfile");
const btnDeleteProfile = document.getElementById("btnDeleteProfile");
const btnMoveProfileUp = document.getElementById("btnMoveProfileUp");
const btnMoveProfileDown = document.getElementById("btnMoveProfileDown");
const btnExportSingleProfile = document.getElementById("btnExportSingleProfile");
const fileImportSingleProfile = document.getElementById("fileImportSingleProfile");
const btnOpenPresetModal = document.getElementById("btnOpenPresetModal");
const presetModal = document.getElementById("presetModal");
const btnPresetModalClose = document.getElementById("btnPresetModalClose");
const presetCardsGrid = document.getElementById("presetCardsGrid");
const profilesListContainer = document.getElementById("profilesListContainer");
const profilesListGrid = document.getElementById("profilesListGrid");

// 共有プロファイルモーダル & トーストDOM要素
const sharedProfileModal = document.getElementById("sharedProfileModal");
const btnSharedProfileClose = document.getElementById("btnSharedProfileClose");
const btnSharedProfileCancel = document.getElementById("btnSharedProfileCancel");
const btnSharedProfileApply = document.getElementById("btnSharedProfileApply");
const sharedProfileBadge = document.getElementById("sharedProfileBadge");
const sharedProfileBtnCount = document.getElementById("sharedProfileBtnCount");
const sharedProfileName = document.getElementById("sharedProfileName");
const sharedProfileDesc = document.getElementById("sharedProfileDesc");
const toastNotification = document.getElementById("toastNotification");

// テスト入力DOM要素
const testInputBox = document.getElementById("testInputBox");
const btnClearTestInput = document.getElementById("btnClearTestInput");
const liveKeysContainer = document.getElementById("liveKeysContainer");
const hwBtnGrid = document.getElementById("hwBtnGrid");

// スティック・パラメータDOM要素
const stickModeSelect = document.getElementById("stickModeSelect");
const gamepadTargetRow = document.getElementById("gamepadTargetRow");
const gamepadTargetSelect = document.getElementById("gamepadTargetSelect");
const enableRunRow = document.getElementById("enableRunRow");
const enableRunCheckbox = document.getElementById("enableRunCheckbox");
const enableRunLabel = document.getElementById("enableRunLabel");
const enableRunHint = document.getElementById("enableRunHint");
const dpadWalkRunGroup = document.getElementById("dpadWalkRunGroup");
const dpadWalkBtnInput = document.getElementById("dpadWalkBtnInput");
const dpadRunBtnInput = document.getElementById("dpadRunBtnInput");
const directionModeSelect = document.getElementById("directionModeSelect");
const mouseSettingsBox = document.getElementById("mouseSettingsBox");
const mouseSpeedRow = document.getElementById("mouseSpeedRow");
const mouseSpeedInput = document.getElementById("mouseSpeedInput");
const mouseSpeedVal = document.getElementById("mouseSpeedVal");
const mouseWalkRatioRow = document.getElementById("mouseWalkRatioRow");
const mouseWalkRatioInput = document.getElementById("mouseWalkRatioInput");
const mouseWalkRatioVal = document.getElementById("mouseWalkRatioVal");
const mouseCurveTypeSelect = document.getElementById("mouseCurveTypeSelect");
const mousePowerCurveGroup = document.getElementById("mousePowerCurveGroup");
const mouseSigmoidGroup = document.getElementById("mouseSigmoidGroup");
const mouseCustomCurveGroup = document.getElementById("mouseCustomCurveGroup");
const customPointSliders = [
  document.getElementById("customPointSlider0"),
  document.getElementById("customPointSlider1"),
  document.getElementById("customPointSlider2"),
  document.getElementById("customPointSlider3")
];
const customPointVals = [
  document.getElementById("customPointVal0"),
  document.getElementById("customPointVal1"),
  document.getElementById("customPointVal2"),
  document.getElementById("customPointVal3")
];
const mouseMinSpeedInput = document.getElementById("mouseMinSpeedInput");
const mouseMinSpeedVal = document.getElementById("mouseMinSpeedVal");
const mouseDynamicAccelInput = document.getElementById("mouseDynamicAccelInput");
const mouseDynamicAccelVal = document.getElementById("mouseDynamicAccelVal");
const mouseAspectRatioInput = document.getElementById("mouseAspectRatioInput");
const mouseAspectRatioVal = document.getElementById("mouseAspectRatioVal");
const mouseCurveRow = document.getElementById("mouseCurveRow");
const mouseCurveSlider = document.getElementById("mouseCurveSlider");
const mouseCurveVal = document.getElementById("mouseCurveVal");
const curvePresetButtons = document.querySelectorAll(".curve-preset-btn");
const mouseRunThresholdRow = document.getElementById("mouseRunThresholdRow");
const mouseRunThresholdInput = document.getElementById("mouseRunThresholdInput");
const mouseRunThresholdVal = document.getElementById("mouseRunThresholdVal");
const mouseCurveCanvas = document.getElementById("mouseCurveCanvas");
const mouseCurveCtx = mouseCurveCanvas ? mouseCurveCanvas.getContext("2d") : null;
const curveLiveSpeedLabel = document.getElementById("curveLiveSpeedLabel");
const curveLegendRunTh = document.getElementById("curveLegendRunTh");
const curveLegendWalkCap = document.getElementById("curveLegendWalkCap");
const kbdThresholdsGroup = document.getElementById("kbdThresholdsGroup");

// クイックアクション共有ボタン & プロファイル名表示
const quickLoadBtns = document.querySelectorAll(".btn-quick-load");
const quickSaveBtns = document.querySelectorAll(".btn-quick-save");
const currentProfileDisplays = document.querySelectorAll(".current-profile-name-display");

const deadzoneInput = document.getElementById("deadzoneInput");
const deadzoneVal = document.getElementById("deadzoneVal");
const hysteresisInput = document.getElementById("hysteresisInput");
const hysteresisVal = document.getElementById("hysteresisVal");
const invertX = document.getElementById("invertX");
const invertY = document.getElementById("invertY");
const rotationSelect = document.getElementById("rotationSelect");
const batchWalkInput = document.getElementById("batchWalkInput");
const batchWalkVal = document.getElementById("batchWalkVal");
const batchRunInput = document.getElementById("batchRunInput");
const batchRunVal = document.getElementById("batchRunVal");

const rawXSpan = document.getElementById("rawX");
const rawYSpan = document.getElementById("rawY");
const deltaXSpan = document.getElementById("deltaX");
const deltaYSpan = document.getElementById("deltaY");

const stateUp = document.getElementById("stateUp");
const stateDown = document.getElementById("stateDown");
const stateLeft = document.getElementById("stateLeft");
const stateRight = document.getElementById("stateRight");

const stickCanvas = document.getElementById("stickCanvas");
const ctx = stickCanvas.getContext("2d");

// ログ出力
function log(msg, type = "info") {
  const time = new Date().toLocaleTimeString();
  logArea.textContent += `[${time}] [${type.toUpperCase()}] ${msg}\n`;
  logArea.scrollTop = logArea.scrollHeight;
}

btnClearLog.addEventListener("click", () => {
  logArea.textContent = "";
});

// プロファイルデータからハードウェア配線情報 (pins) を完全分離・除去
function sanitizeConfig(cfg) {
  if (!cfg || typeof cfg !== "object") return cfg;
  if ("pins" in cfg) {
    delete cfg.pins;
  }
  return cfg;
}

// RP2040 Flashストレージ容量上限 (約1.4MB、安全マージンとして1MBを設定)
const MAX_STORAGE_PAYLOAD_BYTES = 1000000;
const MAX_NVM_PAYLOAD_BYTES = 3900; // 旧NVM互換用

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return "--";
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${bytes.toLocaleString()} B`;
  }
}

function getConfigJsonByteLength(cfg) {
  try {
    return new TextEncoder().encode(JSON.stringify(cfg)).length;
  } catch (e) {
    return JSON.stringify(cfg || "").length;
  }
}

let latestStorageStatus = null;
let latestNvmStatus = null;

// プロファイル間の依存関係 (profile_switch:<id>) をアクティブプロファイルから再帰追跡 (Combo / Fn / Tap-Hold対応)
function getDependentProfileIds(activeProfile, allProfiles) {
  const dependentIds = new Set();
  if (!activeProfile || !Array.isArray(allProfiles)) return dependentIds;

  const queue = [activeProfile];
  const visited = new Set();
  if (activeProfile.id) visited.add(activeProfile.id);

  function scanActionString(str) {
    if (!str || typeof str !== "string") return;
    const parts = str.replace(/[|;,]/g, " ").split(/\s+/).filter(Boolean);
    for (let part of parts) {
      if (part.toLowerCase().startsWith("tap:")) part = part.slice(4);
      if (part.toLowerCase().startsWith("hold:")) part = part.slice(5);
      if (part.toLowerCase().startsWith("profile_switch:")) {
        const target = part.split(":")[1]?.trim();
        if (target) {
          const found = allProfiles.find(p => (p.id && p.id.toLowerCase() === target.toLowerCase()) || (p.name && p.name.toLowerCase() === target.toLowerCase()));
          if (found && found.id && !visited.has(found.id)) {
            visited.add(found.id);
            dependentIds.add(found.id);
            queue.push(found);
          }
        }
      }
    }
  }

  while (queue.length > 0) {
    const cur = queue.shift();
    const km = cur.keymap || {};

    // 1. 通常ボタン
    const buttons = km.buttons || [];
    for (const b of buttons) {
      if (typeof b === "string") scanActionString(b);
      else if (b && typeof b === "object") {
        scanActionString(b.tap);
        scanActionString(b.hold);
      }
    }

    // 2. Fn レイヤーボタン
    const fnButtons = km.fn_buttons || [];
    for (const b of fnButtons) {
      if (typeof b === "string") scanActionString(b);
      else if (b && typeof b === "object") {
        scanActionString(b.tap);
        scanActionString(b.hold);
      }
    }

    // 3. コンボ設定
    const combos = km.combos || [];
    for (const c of combos) {
      if (c && c.action) scanActionString(c.action);
    }
  }

  return dependentIds;
}

// デバイス (4KB Flash) 転送用の軽量化ペイロードを生成
function getDeviceSyncPayload(fullConfig) {
  if (!fullConfig || typeof fullConfig !== "object") return fullConfig;
  const cfg = JSON.parse(JSON.stringify(fullConfig));
  ensureProfiles(cfg);

  const activeIdx = (cfg.active_profile >= 0 && cfg.active_profile < cfg.profiles.length)
    ? cfg.active_profile
    : 0;
  const activeProfile = cfg.profiles[activeIdx];
  const depIds = getDependentProfileIds(activeProfile, cfg.profiles);

  // 転送対象となるプロファイルを選定:
  // 1) アクティブプロファイル (強制)
  // 2) 依存プロファイル (強制)
  // 3) p.device_sync !== false のプロファイル
  const syncProfiles = [];
  let newActiveIdx = 0;

  cfg.profiles.forEach((p, idx) => {
    const isAct = (idx === activeIdx);
    const isDep = p.id && depIds.has(p.id);
    const isSelected = isAct || isDep || (p.device_sync !== false);

    if (isSelected) {
      if (isAct) {
        newActiveIdx = syncProfiles.length;
      }
      syncProfiles.push(p);
    }
  });

  if (syncProfiles.length === 0) {
    syncProfiles.push(activeProfile);
    newActiveIdx = 0;
  }

  cfg.profiles = syncProfiles;
  cfg.active_profile = newActiveIdx;
  if (syncProfiles[newActiveIdx]) {
    cfg.keymap = JSON.parse(JSON.stringify(syncProfiles[newActiveIdx].keymap));
    cfg.joystick = JSON.parse(JSON.stringify(syncProfiles[newActiveIdx].joystick));
  }
  return cfg;
}

// プロファイル同期サマリー表示の更新
function updateProfilesSyncSummary() {
  const syncTargetCountEl = document.getElementById("syncTargetCount");
  const syncTotalCountEl = document.getElementById("syncTotalCount");
  const syncPayloadBytesEl = document.getElementById("syncPayloadBytes");
  const syncFreeBytesEl = document.getElementById("syncFreeBytes");

  if (!currentConfig || !Array.isArray(currentConfig.profiles)) return;

  const syncPayload = getDeviceSyncPayload(currentConfig);
  const payloadBytes = getConfigJsonByteLength(syncPayload);

  let freeBytes = 1250000;
  if (latestStorageStatus && latestStorageStatus.free !== undefined) {
    freeBytes = latestStorageStatus.free;
  }

  if (syncTargetCountEl) syncTargetCountEl.textContent = syncPayload.profiles.length;
  if (syncTotalCountEl) syncTotalCountEl.textContent = currentConfig.profiles.length;
  if (syncPayloadBytesEl) syncPayloadBytesEl.textContent = formatBytes(payloadBytes);
  if (syncFreeBytesEl) {
    syncFreeBytesEl.textContent = formatBytes(freeBytes);
    syncFreeBytesEl.style.color = "#34d399";
  }
}

// プロファイル切替時のビープ音 (Web Audio API)
function playProfileSwitchTone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.setValueAtTime(880, now + 0.05); // A5

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {
    // audio context blocked before user gesture
  }
}

function updateStorageUI(storageReported = null, nvmReported = null) {
  let total = 1441792;
  let free = 1250000;
  let used = 191792;
  let isDeviceReported = false;

  if (storageReported && typeof storageReported === "object" && storageReported.total > 0) {
    total = storageReported.total;
    used = storageReported.used;
    free = storageReported.free;
    isDeviceReported = true;
    latestStorageStatus = { ...storageReported, isDeviceReported: true };
  } else if (latestStorageStatus && latestStorageStatus.isDeviceReported) {
    total = latestStorageStatus.total;
    used = latestStorageStatus.used;
    free = latestStorageStatus.free;
    isDeviceReported = true;
  } else {
    const syncPayload = getDeviceSyncPayload(currentConfig);
    const payloadLen = getConfigJsonByteLength(syncPayload);
    used = payloadLen;
    free = Math.max(0, total - used);
    latestStorageStatus = { total, used, free, valid: true, isDeviceReported: false };
  }

  if (nvmReported && typeof nvmReported === "object") {
    latestNvmStatus = nvmReported;
  }

  const syncPayload = getDeviceSyncPayload(currentConfig);
  const payloadBytes = getConfigJsonByteLength(syncPayload);
  const percentNum = total > 0 ? (used / total) * 100 : 0;
  const percentStr = percentNum.toFixed(1);
  const profileCount = (syncPayload && Array.isArray(syncPayload.profiles)) ? syncPayload.profiles.length : 0;
  const totalProfilesCount = (currentConfig && Array.isArray(currentConfig.profiles)) ? currentConfig.profiles.length : 0;

  // Tab 5 詳細カード要素
  const usedEl = document.getElementById("nvmUsedVal");
  const freeEl = document.getElementById("nvmFreeVal");
  const totalEl = document.getElementById("nvmTotalVal");
  const countEl = document.getElementById("nvmProfileCountVal");
  const percentEl = document.getElementById("nvmProgressPercent");
  const barEl = document.getElementById("nvmProgressBar");
  const statusEl = document.getElementById("nvmProgressStatus");
  const badgeEl = document.getElementById("nvmSourceBadge");
  const warnEl = document.getElementById("nvmWarningText");

  if (usedEl) usedEl.textContent = formatBytes(payloadBytes);
  if (freeEl) freeEl.textContent = formatBytes(free);
  if (totalEl) totalEl.textContent = formatBytes(total);
  if (countEl) countEl.textContent = `${profileCount} (全登録: ${totalProfilesCount})`;
  if (percentEl) percentEl.textContent = `${percentStr}% 使用中 (システム全体)`;

  if (barEl) {
    barEl.style.width = `${Math.min(100, Math.max(2, percentNum))}%`;
    barEl.classList.remove("bar-safe", "bar-warn", "bar-danger");
    if (percentNum >= 95) {
      barEl.classList.add("bar-danger");
    } else if (percentNum >= 85) {
      barEl.classList.add("bar-warn");
    } else {
      barEl.classList.add("bar-safe");
    }
  }

  if (statusEl) {
    if (percentNum >= 95) {
      statusEl.textContent = "🚨 ストレージ空き容量僅少";
      statusEl.style.color = "#ef4444";
    } else if (percentNum >= 85) {
      statusEl.textContent = "⚠️ 使用率高め";
      statusEl.style.color = "#f59e0b";
    } else {
      statusEl.textContent = "✅ 余裕あり (空き多数)";
      statusEl.style.color = "#10b981";
    }
  }

  if (badgeEl) {
    if (isDeviceReported) {
      badgeEl.textContent = "✅ 実測値 (マイコンFlashストレージ)";
      badgeEl.className = "nvm-source-badge live";
    } else if (serialPort && writer) {
      badgeEl.textContent = "⚡ 接続中 (ストレージ)";
      badgeEl.className = "nvm-source-badge est";
    } else {
      badgeEl.textContent = "オフライン (推定値)";
      badgeEl.className = "nvm-source-badge offline";
    }
  }

  if (warnEl) {
    warnEl.style.display = "none";
  }

  // Tab 1 クイックチップ
  const chipEl = document.getElementById("quickStorageBadge") || document.getElementById("quickNvmBadge");
  if (chipEl) {
    chipEl.textContent = `💾 ストレージ: ${formatBytes(free)} 空き`;
    chipEl.title = `マイコン内蔵Flashストレージ (config.json): 空き ${formatBytes(free)} / 総容量 ${formatBytes(total)} (${isDeviceReported ? "実測値" : "推定値"})`;
    chipEl.classList.remove("chip-safe", "chip-warn", "chip-danger");
    chipEl.classList.add("chip-safe");
  }

  updateProfilesSyncSummary();
}

function updateNvmStorageUI(nvmReported = null) {
  updateStorageUI(null, nvmReported);
}

// プロファイル構造の保証 (後方互換性 & ハードウェアピン分離 & device_sync初期化)
function ensureProfiles(cfg) {
  if (!cfg || typeof cfg !== "object") {
    cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  cfg = sanitizeConfig(cfg);
  // スキーマバージョンを常に最新 (WEBUI_VERSION) に昇格
  cfg.version = WEBUI_VERSION;
  if (!cfg.profiles || !Array.isArray(cfg.profiles) || cfg.profiles.length === 0) {
    cfg.profiles = [
      {
        id: generateProfileId(),
        name: "プロファイル 1 (デフォルト)",
        device_sync: true,
        keymap: cfg.keymap || JSON.parse(JSON.stringify(DEFAULT_CONFIG.keymap)),
        joystick: cfg.joystick || JSON.parse(JSON.stringify(DEFAULT_CONFIG.joystick))
      }
    ];
  }
  const seenIds = new Set();
  cfg.profiles.forEach((p, idx) => {
    if (!p.id || seenIds.has(p.id)) {
      p.id = generateProfileId();
    }
    seenIds.add(p.id);

    // device_sync 未定義の場合は true (デフォルトで全件デバイス同期)
    if (p.device_sync === undefined) {
      p.device_sync = true;
    }

    // LED色未定義の場合はデフォルトパレットから割り当て
    if (!p.color || !/^#[0-9a-fA-F]{6}$/.test(p.color)) {
      p.color = getProfileColor(p, idx);
    }

    if (!p.keymap || typeof p.keymap !== "object") {
      p.keymap = {};
    }
    if (!Array.isArray(p.keymap.buttons)) {
      p.keymap.buttons = ["1", "2", "x", "e", "Tab", "f", "q", "4", "3", "Space", "z", "LCtrl", "LAlt"];
    }
    while (p.keymap.buttons.length < 13) {
      p.keymap.buttons.push("");
    }
    if (!Array.isArray(p.keymap.fn_buttons)) {
      p.keymap.fn_buttons = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "Space", "z", "LCtrl", "LAlt"];
    }
    while (p.keymap.fn_buttons.length < 13) {
      p.keymap.fn_buttons.push("");
    }
    if (!Array.isArray(p.keymap.combos)) {
      p.keymap.combos = [];
    }

    if (!p.joystick || typeof p.joystick !== "object" || Array.isArray(p.joystick)) {
      p.joystick = JSON.parse(JSON.stringify(DEFAULT_CONFIG.joystick));
    }
    if (!p.joystick.mode || typeof p.joystick.mode !== "string") p.joystick.mode = "keyboard";
    if (!p.joystick.mouse_speed) p.joystick.mouse_speed = 12;
    if (!p.joystick.mouse_curve_type || typeof p.joystick.mouse_curve_type !== "string") {
      p.joystick.mouse_curve_type = "power";
    }
    if (p.joystick.mouse_curve === undefined || (typeof p.joystick.mouse_curve !== "string" && typeof p.joystick.mouse_curve !== "number")) {
      p.joystick.mouse_curve = "smooth";
    }
    if (!Array.isArray(p.joystick.mouse_curve_points) || p.joystick.mouse_curve_points.length !== 4) {
      p.joystick.mouse_curve_points = [0.15, 0.40, 0.75, 1.0];
    }
    if (p.joystick.mouse_walk_ratio === undefined) p.joystick.mouse_walk_ratio = 0.55;
    if (p.joystick.mouse_min_speed === undefined || typeof p.joystick.mouse_min_speed !== "number") {
      p.joystick.mouse_min_speed = 0.0;
    }
    if (p.joystick.mouse_dynamic_accel === undefined || typeof p.joystick.mouse_dynamic_accel !== "number") {
      p.joystick.mouse_dynamic_accel = 0.0;
    }
    if (p.joystick.mouse_aspect_ratio === undefined || typeof p.joystick.mouse_aspect_ratio !== "number") {
      p.joystick.mouse_aspect_ratio = 1.0;
    }
    if (!p.joystick.direction_mode || typeof p.joystick.direction_mode !== "string") p.joystick.direction_mode = "8way";
    if (p.joystick.deadzone === undefined) p.joystick.deadzone = 2500;
    if (p.joystick.hysteresis === undefined) p.joystick.hysteresis = 1500;
    if (p.joystick.rotation === undefined) p.joystick.rotation = 90;
    if (p.joystick.invert_x === undefined) p.joystick.invert_x = false;
    if (p.joystick.invert_y === undefined) p.joystick.invert_y = false;
    if (p.joystick.enable_run === undefined) p.joystick.enable_run = true;
    if (!p.joystick.gamepad_target || typeof p.joystick.gamepad_target !== "string") p.joystick.gamepad_target = "left_stick";
    if (p.joystick.dpad_walk_btn === undefined) p.joystick.dpad_walk_btn = "";
    if (p.joystick.dpad_run_btn === undefined) p.joystick.dpad_run_btn = "Gamepad_2";

    if (!p.joystick.directions || typeof p.joystick.directions !== "object" || Array.isArray(p.joystick.directions)) {
      p.joystick.directions = JSON.parse(JSON.stringify(DEFAULT_CONFIG.joystick.directions));
    } else {
      ["up", "down", "left", "right"].forEach(dirKey => {
        const defDir = DEFAULT_CONFIG.joystick.directions[dirKey];
        const curDir = p.joystick.directions[dirKey];
        if (!curDir || typeof curDir !== "object" || Array.isArray(curDir)) {
          p.joystick.directions[dirKey] = JSON.parse(JSON.stringify(defDir));
        } else {
          if (typeof curDir.th_walk !== "number" || isNaN(curDir.th_walk)) curDir.th_walk = defDir.th_walk;
          if (typeof curDir.th_run !== "number" || isNaN(curDir.th_run)) curDir.th_run = defDir.th_run;
          if (curDir.key_walk === undefined || curDir.key_walk === null) curDir.key_walk = defDir.key_walk;
          if (curDir.key_run === undefined || curDir.key_run === null) curDir.key_run = JSON.parse(JSON.stringify(defDir.key_run));
        }
      });
    }
  });

  // ストレージ上限 (約1MB) を超える極端な場合のみ安全調整
  let testProfiles = cfg.profiles.filter((p, i) => i === cfg.active_profile || p.device_sync !== false);
  let testCfg = { version: cfg.version, active_profile: 0, profiles: testProfiles };
  if (getConfigJsonByteLength(testCfg) > MAX_STORAGE_PAYLOAD_BYTES) {
    for (let i = cfg.profiles.length - 1; i > 0; i--) {
      if (i === cfg.active_profile) continue;
      cfg.profiles[i].device_sync = false;
      testProfiles = cfg.profiles.filter((p, idx) => idx === cfg.active_profile || p.device_sync !== false);
      testCfg.profiles = testProfiles;
      if (getConfigJsonByteLength(testCfg) <= MAX_STORAGE_PAYLOAD_BYTES) {
        break;
      }
    }
  }

  if (cfg.active_profile === undefined || cfg.active_profile < 0 || cfg.active_profile >= cfg.profiles.length) {
    cfg.active_profile = 0;
  }
  // root keymap & joystick をアクティブプロファイルと同期
  const cur = cfg.profiles[cfg.active_profile];
  cfg.keymap = cur.keymap;
  cfg.joystick = cur.joystick;
  if (cfg.joystick) {
    if (!cfg.joystick.mode) cfg.joystick.mode = "keyboard";
    if (!cfg.joystick.mouse_speed) cfg.joystick.mouse_speed = 12;
    if (!cfg.joystick.direction_mode) cfg.joystick.direction_mode = "8way";
    if (cfg.joystick.rotation === undefined) cfg.joystick.rotation = 90;
    if (cfg.joystick.invert_x === undefined) cfg.joystick.invert_x = false;
    if (cfg.joystick.invert_y === undefined) cfg.joystick.invert_y = false;
    if (cfg.joystick.enable_run === undefined) cfg.joystick.enable_run = true;
    if (!cfg.joystick.gamepad_target) cfg.joystick.gamepad_target = "left_stick";
    if (cfg.joystick.dpad_walk_btn === undefined) cfg.joystick.dpad_walk_btn = "";
    if (cfg.joystick.dpad_run_btn === undefined) cfg.joystick.dpad_run_btn = "Gamepad_2";
  }
  return cfg;
}

function updateModeDisplay() {
  const mode = (currentConfig.joystick && currentConfig.joystick.mode) ? currentConfig.joystick.mode : "keyboard";
  const dirMode = (currentConfig.joystick && currentConfig.joystick.direction_mode) ? currentConfig.joystick.direction_mode : "8way";
  const target = (currentConfig.joystick && currentConfig.joystick.gamepad_target) ? currentConfig.joystick.gamepad_target : "left_stick";
  const textEl = document.getElementById("stickModeText");
  const extraEl = document.getElementById("stickModeExtra");
  if (!textEl) return;

  let modeLabel = "";
  let outputText = "-";

  if (mode === "gamepad") {
    if (target === "right_stick") {
      modeLabel = "GAMEPAD (右スティック Z/Rz)";
      if (currentTelemetry && currentTelemetry.gamepad) {
        outputText = `Z: ${currentTelemetry.gamepad[2] || 0} / Rz: ${currentTelemetry.gamepad[3] || 0}`;
      } else {
        outputText = "Z: 0 / Rz: 0";
      }
    } else if (target === "dpad") {
      modeLabel = "GAMEPAD (DPAD/ハットスイッチ)";
      if (currentTelemetry && currentTelemetry.gamepad) {
        const hatNames = ["中立(0)", "↑(1)", "↗(2)", "→(3)", "↘(4)", "↓(5)", "↙(6)", "←(7)", "↖(8)"];
        const hatVal = currentTelemetry.gamepad[4] || 0;
        const stageStr = currentTelemetry.gamepad_stage ? ` [${currentTelemetry.gamepad_stage.toUpperCase()}]` : "";
        outputText = `HAT: ${hatNames[hatVal] || hatVal}${stageStr}`;
      } else {
        outputText = "HAT: 中立(0)";
      }
    } else if (target === "z_axis") {
      modeLabel = "GAMEPAD (Z軸)";
      if (currentTelemetry && currentTelemetry.gamepad) {
        outputText = `Z: ${currentTelemetry.gamepad[2] || 0} / Rz: ${currentTelemetry.gamepad[3] || 0}`;
      } else {
        outputText = "Z: 0 / Rz: 0";
      }
    } else {
      modeLabel = "GAMEPAD (左スティック X/Y)";
      if (currentTelemetry && currentTelemetry.gamepad) {
        outputText = `X: ${currentTelemetry.gamepad[0]} / Y: ${currentTelemetry.gamepad[1]}`;
      } else {
        outputText = "X: 0 / Y: 0";
      }
    }
  } else if (mode === "mouse") {
    modeLabel = "MOUSE (POINTER)";
    if (currentTelemetry && currentTelemetry.mouse) {
      outputText = `dX: ${currentTelemetry.mouse[0]} / dY: ${currentTelemetry.mouse[1]}`;
    } else {
      outputText = "dX: 0 / dY: 0";
    }
  } else {
    modeLabel = "KEYBOARD (WASD)";
    if (currentTelemetry && currentTelemetry.keys && currentTelemetry.keys.length > 0) {
      outputText = `Keys: ${currentTelemetry.keys.join(", ")}`;
    } else {
      outputText = "Keys: (なし)";
    }
  }

  if (dirMode === "4way_snap") {
    modeLabel += " [4方向スナップ]";
  } else if (dirMode === "4way_strict") {
    modeLabel += " [4方向厳格]";
  }

  if (textEl.textContent !== modeLabel) {
    textEl.textContent = modeLabel;
  }
  if (extraEl && extraEl.textContent !== outputText) {
    extraEl.textContent = outputText;
  }
}

function updateModeVisibility() {
  const mode = (currentConfig.joystick && currentConfig.joystick.mode) ? currentConfig.joystick.mode : "keyboard";
  const target = (currentConfig.joystick && currentConfig.joystick.gamepad_target) ? currentConfig.joystick.gamepad_target : "left_stick";

  if (mouseSettingsBox) {
    mouseSettingsBox.style.display = (mode === "mouse") ? "flex" : "none";
  }
  const curveType = (currentConfig.joystick && currentConfig.joystick.mouse_curve_type) ? currentConfig.joystick.mouse_curve_type : "power";
  if (mousePowerCurveGroup) {
    mousePowerCurveGroup.style.display = (curveType === "power") ? "block" : "none";
  }
  if (mouseSigmoidGroup) {
    mouseSigmoidGroup.style.display = (curveType === "sigmoid") ? "block" : "none";
  }
  if (mouseCustomCurveGroup) {
    mouseCustomCurveGroup.style.display = (curveType === "custom") ? "block" : "none";
  }
  const isRunEnabled = currentConfig.joystick.enable_run !== false;
  if (mouseRunThresholdRow) {
    mouseRunThresholdRow.style.display = (mode === "mouse" && isRunEnabled) ? "flex" : "none";
  }
  const upRun = (currentConfig.joystick && currentConfig.joystick.directions && currentConfig.joystick.directions.up)
    ? currentConfig.joystick.directions.up.th_run
    : 26000;
  if (mouseRunThresholdInput) {
    mouseRunThresholdInput.value = upRun;
    const dz = (currentConfig.joystick && currentConfig.joystick.deadzone !== undefined) ? currentConfig.joystick.deadzone : 2500;
    const pct = Math.round(Math.max(0, Math.min(100, ((upRun - dz) / (32767 - dz)) * 100)));
    if (mouseRunThresholdVal) mouseRunThresholdVal.textContent = `${upRun} (約${pct}%)`;
  }
  if (kbdThresholdsGroup) {
    kbdThresholdsGroup.style.display = (mode === "keyboard") ? "block" : "none";
  }
  if (gamepadTargetRow) {
    gamepadTargetRow.style.display = (mode === "gamepad") ? "flex" : "none";
  }
  if (dpadWalkRunGroup) {
    dpadWalkRunGroup.style.display = (mode === "gamepad" && target === "dpad") ? "block" : "none";
  }
  if (gamepadTargetSelect) {
    gamepadTargetSelect.value = target;
  }
  if (enableRunCheckbox) {
    enableRunCheckbox.checked = isRunEnabled;
  }
  if (enableRunLabel && enableRunHint) {
    if (mode === "mouse") {
      enableRunLabel.textContent = "マウス深倒し加速 (Runブースト) を有効にする";
      enableRunHint.textContent = "※ON: 指定したRun閾値以上倒すと最高速まで急加速 / OFF: 通常域上限比率に速度を制限";
    } else if (mode === "gamepad" && target === "dpad") {
      enableRunLabel.textContent = "スティックのRun (走り/2段階目入力) を有効にする";
      enableRunHint.textContent = "※チェックを外すと最大まで倒しても常にWalk連動ボタンのみ入力されます";
    } else {
      enableRunLabel.textContent = "スティックのRun (走り/2段階目入力) を有効にする";
      enableRunHint.textContent = "※チェックを外すと最大まで倒しても常にWalk(1段階目)のみ入力されます";
    }
  }
  if (dpadWalkBtnInput) {
    dpadWalkBtnInput.value = currentConfig.joystick.dpad_walk_btn || "";
  }
  if (dpadRunBtnInput) {
    dpadRunBtnInput.value = currentConfig.joystick.dpad_run_btn || "";
  }
  updateModeDisplay();
  if (mode === "mouse") {
    drawMouseCurve();
  }
}

// ==========================================
// ファームウェア・WebUI バージョン管理
// ==========================================
function parseSemVer(v) {
  if (!v || typeof v !== "string") return [0, 0, 0];
  const cleaned = v.replace(/^v/, "").trim();
  const parts = cleaned.split(".").map(s => parseInt(s, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

function compareVersions(v1, v2) {
  const p1 = parseSemVer(v1);
  const p2 = parseSemVer(v2);
  for (let i = 0; i < 3; i++) {
    if (p1[i] < p2[i]) return -1;
    if (p1[i] > p2[i]) return 1;
  }
  return 0;
}

function checkFirmwareVersion(fwVersion) {
  if (!fwVersionBadge) return;
  fwVersionBadge.style.display = "inline-block";

  if (!fwVersion) {
    // バージョン未報告 (v1.0以前の旧ファームウェア)
    fwVersionBadge.className = "badge badge-fw-version outdated";
    fwVersionBadge.textContent = "FW: 旧版 (v1.0以前)";
    fwVersionBadge.title = "ファームウェアが旧バージョンです。更新をおすすめします。";

    if (versionAlertBanner) {
      if (versionAlertTitle) versionAlertTitle.textContent = "⚠️ ファームウェアの更新が推奨されます";
      if (versionAlertDetail) versionAlertDetail.textContent = `マイコン側: 未対応 (v1.0以前) / WebUI推奨: v${WEBUI_VERSION}`;
      versionAlertBanner.style.display = "flex";
    }
    log(`⚠️ 接続されたファームウェアは旧版（v1.0以前）です。最新版 (v${WEBUI_VERSION}) への更新をおすすめします。`, "warn");
    return;
  }

  const cmpRec = compareVersions(fwVersion, MIN_RECOMMENDED_FW_VERSION);
  const cmpWeb = compareVersions(fwVersion, WEBUI_VERSION);

  if (cmpRec < 0) {
    // 必須推奨バージョンより古い (v1.3.0未満)
    fwVersionBadge.className = "badge badge-fw-version outdated";
    fwVersionBadge.textContent = `FW: v${fwVersion} (要更新)`;
    fwVersionBadge.title = `最新ファームウェア (v${WEBUI_VERSION}) へのアップデートが必要です。`;

    if (versionAlertBanner) {
      if (versionAlertTitle) versionAlertTitle.textContent = "⚠️ ファームウェアの更新が推奨されます";
      if (versionAlertDetail) versionAlertDetail.textContent = `マイコン側: v${fwVersion} / WebUI最小推奨: v${MIN_RECOMMENDED_FW_VERSION}`;
      versionAlertBanner.style.display = "flex";
    }
    log(`⚠️ ファームウェアの更新が推奨されます: 現在 v${fwVersion} → 最新 v${WEBUI_VERSION}`, "warn");

  } else if (cmpWeb < 0) {
    // 動作可能だが最新版 (v1.9.0) へのアップデートが利用可能
    fwVersionBadge.className = "badge badge-fw-version up-to-date";
    fwVersionBadge.textContent = `FW: v${fwVersion} (更新可能)`;
    fwVersionBadge.title = `最新ファームウェア (v${WEBUI_VERSION}) へのアップデートが可能です（同時押しコンボ、長押し・タップ判定、Fnレイヤー、Flashストレージ永続化など）。`;

    if (versionAlertBanner) {
      versionAlertBanner.style.display = "none";
    }
    log(`ℹ️ ファームウェア更新が利用可能です: 現在 v${fwVersion} → 最新 v${WEBUI_VERSION}`, "info");

  } else if (cmpWeb > 0) {
    // ファームウェアの方がWebUIより新しい
    fwVersionBadge.className = "badge badge-fw-version up-to-date";
    fwVersionBadge.textContent = `FW: v${fwVersion}`;
    fwVersionBadge.title = `ファームウェア (v${fwVersion}) がWebUI (v${WEBUI_VERSION}) より新しいです。`;

    if (versionAlertBanner) {
      if (versionAlertTitle) versionAlertTitle.textContent = "ℹ️ ファームウェアがWebUIより新しいバージョンです";
      if (versionAlertDetail) versionAlertDetail.textContent = `マイコン側: v${fwVersion} / WebUI側: v${WEBUI_VERSION}`;
      versionAlertBanner.style.display = "flex";
    }
    log(`ℹ️ ファームウェア (v${fwVersion}) がWebUI (v${WEBUI_VERSION}) より新しいため、WebUIをリロードしてください。`, "info");

  } else {
    // バージョン一致 / 最新
    fwVersionBadge.className = "badge badge-fw-version up-to-date";
    fwVersionBadge.textContent = `FW: v${fwVersion} (最新)`;
    fwVersionBadge.title = "ファームウェアは最新版です。";
    if (versionAlertBanner) {
      versionAlertBanner.style.display = "none";
    }
    log(`ファームウェアバージョン: v${fwVersion} (最新)`, "success");
  }
}

// ==========================================
// localStorage 永続化機能
// ==========================================
const STORAGE_KEY = "lefty_controller_config";

function updateStorageBadge(state, detail = "") {
  const badge = document.getElementById("storageBadge");
  if (!badge) return;
  const now = new Date().toLocaleTimeString();
  if (state === "saved") {
    badge.className = "badge badge-storage saved";
    badge.textContent = "💾 ブラウザ保存済";
    badge.title = `ブラウザのlocalStorageに自動保存されています (最終保存: ${now}${detail ? " - " + detail : ""})`;
  } else if (state === "error") {
    badge.className = "badge badge-storage badge-disconnected";
    badge.textContent = "⚠️ 保存エラー";
    badge.title = `localStorageの書き込みに失敗しました: ${detail}`;
  }
}

function saveToLocalStorage(cfg, detail = "") {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    updateStorageBadge("saved", detail);
  } catch (e) {
    console.warn("localStorage save failed:", e);
    updateStorageBadge("error", e.message);
  }
  updateNvmStorageUI();
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const ensured = ensureProfiles(parsed);
        if (JSON.stringify(ensured) !== raw) {
          saveToLocalStorage(ensured, "最新配線同期");
        }
        return ensured;
      }
    }
  } catch (e) {
    console.warn("localStorage load failed:", e);
  }
  return null;
}

function clearLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("localStorage clear failed:", e);
  }
}

// 現在のUI/メモリ状態をアクティブプロファイルに同期
function syncCurrentToProfile() {
  if (!currentConfig.profiles || !currentConfig.profiles[currentConfig.active_profile]) return;
  const p = currentConfig.profiles[currentConfig.active_profile];
  p.keymap = JSON.parse(JSON.stringify(currentConfig.keymap));
  p.joystick = JSON.parse(JSON.stringify(currentConfig.joystick));
  saveToLocalStorage(currentConfig);
}

// プロファイル切り替え
function switchProfile(newIdx, shouldNotifyDevice = true) {
  syncCurrentToProfile();
  if (newIdx < 0 || newIdx >= currentConfig.profiles.length) return;
  currentConfig.active_profile = newIdx;
  const p = currentConfig.profiles[newIdx];
  currentConfig.keymap = JSON.parse(JSON.stringify(p.keymap));
  currentConfig.joystick = JSON.parse(JSON.stringify(p.joystick));

  renderProfileSelect();
  updateFormFromConfig();
  renderButtonGrid();
  renderDirectionTable();
  drawRadar();

  saveToLocalStorage(currentConfig, `プロファイル ${newIdx + 1}`);

  if (shouldNotifyDevice && serialPort && writer) {
    setDeviceOpLoading("save", true, "", `プロファイル「${p.name}」をデバイスへ反映中...`);
    sendJson({ cmd: "set_config", config: getDeviceSyncPayload(currentConfig) });
  }
  log(`プロファイルを「${p.name}」に切り替えました`, "info");
}

function updateProfileLabels() {
  if (!currentConfig.profiles || !currentConfig.profiles[currentConfig.active_profile]) return;
  const curProf = currentConfig.profiles[currentConfig.active_profile];
  const curName = curProf.name;
  const curColor = getProfileColor(curProf, currentConfig.active_profile);

  currentProfileDisplays.forEach(el => {
    let dot = el.querySelector(".active-profile-color-indicator");
    let textSpan = el.querySelector(".active-profile-name-text");
    if (!dot || !textSpan) {
      el.innerHTML = `<span class="active-profile-color-indicator"></span><span class="active-profile-name-text"></span>`;
      dot = el.querySelector(".active-profile-color-indicator");
      textSpan = el.querySelector(".active-profile-name-text");
    }
    textSpan.textContent = curName;
    if (dot) {
      dot.style.backgroundColor = curColor;
      dot.style.boxShadow = `0 0 6px ${curColor}`;
    }
    el.style.borderColor = curColor;
  });

  if (sidebarActiveProfileName) {
    sidebarActiveProfileName.textContent = curName;
    sidebarActiveProfileName.style.borderLeft = `3px solid ${curColor}`;
    sidebarActiveProfileName.style.paddingLeft = "6px";
  }
  if (sidebarProfileSelect) {
    sidebarProfileSelect.value = currentConfig.active_profile;
  }
}

function renderProfilesList() {
  const container = profilesListContainer || profilesListGrid;
  if (!container) return;
  container.innerHTML = "";
  ensureProfiles(currentConfig);

  const activeIdx = (currentConfig.active_profile >= 0 && currentConfig.active_profile < currentConfig.profiles.length)
    ? currentConfig.active_profile
    : 0;
  const activeProfile = currentConfig.profiles[activeIdx];
  const depIds = getDependentProfileIds(activeProfile, currentConfig.profiles);

  currentConfig.profiles.forEach((p, idx) => {
    const row = document.createElement("div");
    const isAct = (idx === activeIdx);
    const isDep = p.id && depIds.has(p.id);
    const isLocked = isAct || isDep;
    const isSynced = isLocked || (p.device_sync !== false);

    row.className = "profile-row-item" + (isAct ? " active" : "");
    const mode = (p.joystick && p.joystick.mode) ? p.joystick.mode.toUpperCase() : "KEYBOARD";
    const target = (p.joystick && p.joystick.gamepad_target) ? p.joystick.gamepad_target.toUpperCase() : "";
    const badgeText = mode === "GAMEPAD" && target ? `GP: ${target}` : mode;
    const buttonCount = p.keymap && p.keymap.buttons ? p.keymap.buttons.length : 13;
    const profColor = getProfileColor(p, idx);

    let syncBadgeHtml = "";
    let syncTitle = "";
    if (isAct) {
      syncBadgeHtml = '<span class="sync-status-badge active" title="現在実行中のアクティブプロファイルのため転送必須です">★実行中</span>';
      syncTitle = "現在実行中のアクティブプロファイルのため転送必須です";
    } else if (isDep) {
      syncBadgeHtml = '<span class="sync-status-badge linked" title="アクティブプロファイルのキー割当から参照されているため自動転送されます">🔗連携中</span>';
      syncTitle = "アクティブプロファイルのキー割当から直接/連鎖参照されているため自動転送されます";
    } else if (isSynced) {
      syncBadgeHtml = '<span class="sync-status-badge active" title="マイコンFlashへの転送対象">転送</span>';
      syncTitle = "マイコン内蔵Flash (NVM 4KB) への転送対象";
    } else {
      syncBadgeHtml = '<span class="sync-status-badge local" title="PC(ブラウザ)上のみに保存">PCのみ</span>';
      syncTitle = "マイコンへの転送から除外 (ブラウザ上でのみ保存)";
    }

    row.innerHTML = `
      <div class="col-status">
        <input type="radio" name="profile_active_radio" class="profile-radio-btn" ${isAct ? "checked" : ""} title="このプロファイルを選択">
      </div>
      <div class="col-sync">
        <label class="sync-checkbox-wrapper" title="${escapeHtml(syncTitle)}">
          <input type="checkbox" class="sync-checkbox" ${isSynced ? "checked" : ""} ${isLocked ? "disabled" : ""}>
          ${syncBadgeHtml}
        </label>
      </div>
      <div class="col-index">#${idx + 1}</div>
      <div class="col-name">
        <label class="profile-color-picker-wrapper" title="プロファイル切替時のLED色: ${escapeHtml(profColor)} (クリックして変更)">
          <input type="color" list="presetLedColors" class="profile-color-input" value="${escapeHtml(profColor)}">
          <span class="profile-color-dot" style="background-color: ${escapeHtml(profColor)}; box-shadow: 0 0 8px ${escapeHtml(profColor)}88;"></span>
        </label>
        <input type="text" class="profile-row-name-input" value="${escapeHtml(p.name)}" placeholder="プロファイル名">
      </div>
      <div class="col-meta">
        <span class="profile-mode-badge">${escapeHtml(badgeText)}</span>
        <span class="profile-btn-count">${Number(buttonCount) || 13} btns</span>
      </div>
      <div class="col-actions">
        <button type="button" class="btn-icon btn-move-up" title="上へ移動" ${idx === 0 ? "disabled" : ""}>▲</button>
        <button type="button" class="btn-icon btn-move-down" title="下へ移動" ${idx === currentConfig.profiles.length - 1 ? "disabled" : ""}>▼</button>
        <div class="profile-row-menu-container">
          <button type="button" class="btn-icon btn-kebab" title="その他のメニュー">…</button>
          <div class="profile-row-dropdown">
            <button type="button" class="dropdown-item btn-action-share-url">🔗 共有リンクをコピー (URL)</button>
            <button type="button" class="dropdown-item btn-action-dup">📑 複製</button>
            <button type="button" class="dropdown-item btn-action-export">💾 単体書き出し</button>
            <button type="button" class="dropdown-item danger btn-action-del" ${currentConfig.profiles.length <= 1 ? "disabled style='opacity:0.4;cursor:not-allowed'" : ""}>🗑️ 削除</button>
          </div>
        </div>
      </div>
    `;

    // 転送チェックボックス変更
    const syncWrapper = row.querySelector(".sync-checkbox-wrapper");
    if (syncWrapper) {
      syncWrapper.addEventListener("click", (e) => e.stopPropagation());
    }
    const syncCheckbox = row.querySelector(".sync-checkbox");
    if (syncCheckbox && !isLocked) {
      syncCheckbox.addEventListener("change", (e) => {
        e.stopPropagation();
        p.device_sync = e.target.checked;
        saveToLocalStorage(currentConfig, `転送設定: ${p.name}`);
        renderProfilesList();
        updateStorageUI();
        showToast(p.device_sync ? `💾 プロファイル「${p.name}」をデバイス転送対象に設定しました` : `🌐 プロファイル「${p.name}」をブラウザのみ(PC保存)に設定しました`);
      });
    }

    // ラジオボタン変更
    const radioBtn = row.querySelector(".profile-radio-btn");
    radioBtn.addEventListener("change", () => {
      if (idx !== currentConfig.active_profile) {
        switchProfile(idx, true);
      }
    });

    // 行クリックで選択（input, button, dropdownクリックは除外）
    row.addEventListener("click", (e) => {
      if (e.target.closest("input") || e.target.closest("button") || e.target.closest(".profile-row-dropdown")) {
        return;
      }
      if (idx !== currentConfig.active_profile) {
        switchProfile(idx, true);
      }
    });

    // LED色変更
    const colorWrapper = row.querySelector(".profile-color-picker-wrapper");
    if (colorWrapper) {
      colorWrapper.addEventListener("click", (e) => e.stopPropagation());
    }
    const colorInput = row.querySelector(".profile-color-input");
    const colorDot = row.querySelector(".profile-color-dot");
    if (colorInput) {
      colorInput.addEventListener("input", (e) => {
        const val = e.target.value.toLowerCase();
        p.color = val;
        if (colorDot) {
          colorDot.style.backgroundColor = val;
          colorDot.style.boxShadow = `0 0 8px ${val}88`;
        }
        if (isAct) {
          updateProfileLabels();
        }
      });
      colorInput.addEventListener("change", (e) => {
        e.stopPropagation();
        const val = e.target.value.toLowerCase();
        setProfileColorAt(idx, val);
      });
    }

    // 名前編集
    const nameInput = row.querySelector(".profile-row-name-input");
    nameInput.addEventListener("change", (e) => {
      renameProfileAt(idx, e.target.value);
    });
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.target.blur();
      }
    });

    // 上へ並び替え
    const btnUp = row.querySelector(".btn-move-up");
    btnUp.addEventListener("click", (e) => {
      e.stopPropagation();
      moveProfileUpAt(idx);
    });

    // 下へ並び替え
    const btnDown = row.querySelector(".btn-move-down");
    btnDown.addEventListener("click", (e) => {
      e.stopPropagation();
      moveProfileDownAt(idx);
    });

    // メニュー開閉
    const btnKebab = row.querySelector(".btn-kebab");
    const dropdown = row.querySelector(".profile-row-dropdown");
    btnKebab.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("open");
      document.querySelectorAll(".profile-row-dropdown.open").forEach(d => d.classList.remove("open"));
      if (!isOpen) {
        dropdown.classList.add("open");
      }
    });

    // 共有リンクコピー (URL)
    const btnShareUrl = row.querySelector(".btn-action-share-url");
    if (btnShareUrl) {
      btnShareUrl.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.remove("open");
        copyProfileShareUrl(idx);
      });
    }

    // 複製
    const btnDup = row.querySelector(".btn-action-dup");
    btnDup.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.remove("open");
      duplicateProfileAt(idx);
    });

    // 単体エクスポート
    const btnExport = row.querySelector(".btn-action-export");
    btnExport.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.remove("open");
      exportSingleProfileAt(idx);
    });

    // 削除
    const btnDel = row.querySelector(".btn-action-del");
    btnDel.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.remove("open");
      deleteProfileAt(idx);
    });

    container.appendChild(row);
  });
}

function renderProfileSelect() {
  ensureProfiles(currentConfig);

  // サイドバーのプロファイル選択プルダウン更新
  if (sidebarProfileSelect) {
    sidebarProfileSelect.innerHTML = "";
    currentConfig.profiles.forEach((p, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = `${idx + 1}: ${p.name}`;
      if (idx === currentConfig.active_profile) opt.selected = true;
      sidebarProfileSelect.appendChild(opt);
    });
  }

  // 互換性のため（旧profileSelectが存在する場合）
  if (profileSelect) {
    profileSelect.innerHTML = "";
    currentConfig.profiles.forEach((p, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = `${idx + 1}: ${p.name}`;
      if (idx === currentConfig.active_profile) opt.selected = true;
      profileSelect.appendChild(opt);
    });
  }
  if (profileNameInput && currentConfig.profiles[currentConfig.active_profile]) {
    profileNameInput.value = currentConfig.profiles[currentConfig.active_profile].name;
  }

  updateProfileLabels();
  renderProfilesList();
}

function moveProfileUpAt(idx) {
  if (idx <= 0) return;
  syncCurrentToProfile();
  const curActive = currentConfig.active_profile;
  const temp = currentConfig.profiles[idx];
  currentConfig.profiles[idx] = currentConfig.profiles[idx - 1];
  currentConfig.profiles[idx - 1] = temp;

  if (curActive === idx) {
    currentConfig.active_profile = idx - 1;
  } else if (curActive === idx - 1) {
    currentConfig.active_profile = idx;
  }
  currentConfig.keymap = JSON.parse(JSON.stringify(currentConfig.profiles[currentConfig.active_profile].keymap));
  currentConfig.joystick = JSON.parse(JSON.stringify(currentConfig.profiles[currentConfig.active_profile].joystick));

  renderProfileSelect();
  updateFormFromConfig();
  renderButtonGrid();
  renderDirectionTable();
  drawRadar();
  saveToLocalStorage(currentConfig, `並び替え: ${temp.name} を上へ移動`);

  if (serialPort && writer) {
    setDeviceOpLoading("save", true, "", `並び替えをデバイスへ反映中...`);
    sendJson({ cmd: "set_config", config: getDeviceSyncPayload(currentConfig) });
  }
  log(`プロファイル「${temp.name}」を上へ並び替えました`, "info");
}

function moveProfileDownAt(idx) {
  if (idx >= currentConfig.profiles.length - 1) return;
  syncCurrentToProfile();
  const curActive = currentConfig.active_profile;
  const temp = currentConfig.profiles[idx];
  currentConfig.profiles[idx] = currentConfig.profiles[idx + 1];
  currentConfig.profiles[idx + 1] = temp;

  if (curActive === idx) {
    currentConfig.active_profile = idx + 1;
  } else if (curActive === idx + 1) {
    currentConfig.active_profile = idx;
  }
  currentConfig.keymap = JSON.parse(JSON.stringify(currentConfig.profiles[currentConfig.active_profile].keymap));
  currentConfig.joystick = JSON.parse(JSON.stringify(currentConfig.profiles[currentConfig.active_profile].joystick));

  renderProfileSelect();
  updateFormFromConfig();
  renderButtonGrid();
  renderDirectionTable();
  drawRadar();
  saveToLocalStorage(currentConfig, `並び替え: ${temp.name} を下へ移動`);

  if (serialPort && writer) {
    setDeviceOpLoading("save", true, "", `並び替えをデバイスへ反映中...`);
    sendJson({ cmd: "set_config", config: getDeviceSyncPayload(currentConfig) });
  }
  log(`プロファイル「${temp.name}」を下へ並び替えました`, "info");
}

function duplicateProfileAt(idx) {
  syncCurrentToProfile();
  const src = currentConfig.profiles[idx];
  if (!src) return;
  const duplicated = {
    id: generateProfileId(),
    name: `${src.name} (コピー)`,
    color: src.color || getProfileColor(src, idx + 1),
    keymap: JSON.parse(JSON.stringify(src.keymap)),
    joystick: JSON.parse(JSON.stringify(src.joystick))
  };
  currentConfig.profiles.splice(idx + 1, 0, duplicated);
  switchProfile(idx + 1, true);
  log(`プロファイルを複製しました: ${duplicated.name}`, "success");
}

function exportSingleProfileAt(idx) {
  syncCurrentToProfile();
  const target = currentConfig.profiles[idx];
  if (!target) return;
  const singleData = {
    version: WEBUI_VERSION,
    profile: JSON.parse(JSON.stringify(target))
  };
  const safeName = target.name.replace(/[/\\?%*:|"<>]/g, "_").trim() || "profile";
  const blob = new Blob([JSON.stringify(singleData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lefty_profile_${safeName}.json`;
  a.click();
  URL.revokeObjectURL(url);
  log(`プロファイル「${target.name}」を単体エクスポートしました`, "info");
}

function deleteProfileAt(idx) {
  if (currentConfig.profiles.length <= 1) {
    alert("プロファイルは最低1つ必要です。");
    return;
  }
  syncCurrentToProfile();
  const target = currentConfig.profiles[idx];
  if (!target) return;
  if (confirm(`プロファイル「${target.name}」を削除しますか？`)) {
    currentConfig.profiles.splice(idx, 1);
    let newActive = currentConfig.active_profile;
    if (newActive >= currentConfig.profiles.length) {
      newActive = currentConfig.profiles.length - 1;
    } else if (newActive === idx) {
      newActive = Math.max(0, idx - 1);
    } else if (newActive > idx) {
      newActive -= 1;
    }
    switchProfile(newActive, true);
    log(`プロファイル「${target.name}」を削除しました`, "warn");
  }
}

function renameProfileAt(idx, newName) {
  const name = newName.trim() || `プロファイル ${idx + 1}`;
  if (!currentConfig.profiles[idx]) return;
  currentConfig.profiles[idx].name = name;
  if (idx === currentConfig.active_profile) {
    updateProfileLabels();
  }
  renderProfileSelect();
  saveToLocalStorage(currentConfig, `名前変更: ${name}`);
  if (serialPort && writer) {
    setDeviceOpLoading("save", true, "", "名前変更をデバイスへ反映中...");
    sendJson({ cmd: "set_config", config: getDeviceSyncPayload(currentConfig) });
  }
  log(`プロファイル #${idx + 1} の名前を「${name}」に変更しました`, "info");
}

function setProfileColorAt(idx, newColor) {
  if (!currentConfig.profiles[idx]) return;
  const color = newColor.toLowerCase();
  currentConfig.profiles[idx].color = color;
  if (idx === currentConfig.active_profile) {
    updateProfileLabels();
  }
  renderProfilesList();
  renderProfileSelect();
  saveToLocalStorage(currentConfig, `LED色変更: ${currentConfig.profiles[idx].name}`);
  if (serialPort && writer) {
    sendJson({ cmd: "set_config", config: getDeviceSyncPayload(currentConfig) });
  }
  log(`プロファイル #${idx + 1} のLED色を「${color}」に変更しました`, "info");
}

function moveProfileUp() {
  moveProfileUpAt(currentConfig.active_profile);
}

function moveProfileDown() {
  moveProfileDownAt(currentConfig.active_profile);
}

function exportSingleProfile() {
  syncCurrentToProfile();
  const curProfile = currentConfig.profiles[currentConfig.active_profile];
  if (!curProfile) return;
  const singleData = {
    version: WEBUI_VERSION,
    profile: JSON.parse(JSON.stringify(curProfile))
  };
  const safeName = curProfile.name.replace(/[/\\?%*:|"<>]/g, "_").trim() || "profile";
  const blob = new Blob([JSON.stringify(singleData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lefty_profile_${safeName}.json`;
  a.click();
  URL.revokeObjectURL(url);
  log(`プロファイル「${curProfile.name}」を単体エクスポートしました`, "info");
}

function importSingleProfile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const parsed = JSON.parse(evt.target.result);
      let targetProfile = null;
      if (parsed.profile && typeof parsed.profile === "object") {
        targetProfile = parsed.profile;
      } else if (parsed.keymap && parsed.joystick) {
        targetProfile = parsed;
      }

      if (!targetProfile || !targetProfile.keymap || !Array.isArray(targetProfile.keymap.buttons)) {
        throw new Error("有効なプロファイル形式ではありません (keymap.buttons が必要です)");
      }

      const newProfile = {
        id: (targetProfile.id && !currentConfig.profiles.some(p => p.id === targetProfile.id))
          ? targetProfile.id
          : generateProfileId(),
        name: targetProfile.name || `インポート: ${file.name.replace(/\.[^/.]+$/, "")}`,
        keymap: {
          buttons: targetProfile.keymap.buttons.slice(0, 13),
          fn_buttons: (targetProfile.keymap && Array.isArray(targetProfile.keymap.fn_buttons))
            ? targetProfile.keymap.fn_buttons.slice(0, 13)
            : ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "Space", "z", "LCtrl", "LAlt"],
          combos: (targetProfile.keymap && Array.isArray(targetProfile.keymap.combos))
            ? JSON.parse(JSON.stringify(targetProfile.keymap.combos))
            : []
        },
        joystick: JSON.parse(JSON.stringify(targetProfile.joystick || DEFAULT_CONFIG.joystick))
      };
      while (newProfile.keymap.buttons.length < 13) {
        newProfile.keymap.buttons.push("");
      }
      while (newProfile.keymap.fn_buttons.length < 13) {
        newProfile.keymap.fn_buttons.push("");
      }

      syncCurrentToProfile();
      currentConfig.profiles.push(newProfile);
      switchProfile(currentConfig.profiles.length - 1, true);

      if (!serialPort || !writer) {
        addPendingImportedProfile(newProfile);
        log(`プロファイル「${newProfile.name}」をインポートしました。デバイス接続時にデバイスへ自動同期されます。`, "info");
        showToast(`📥 プロファイル「${newProfile.name}」をインポートしました（接続時に自動同期）`, 4000);
      } else {
        log(`プロファイル「${newProfile.name}」を単体インポートしました`, "success");
        showToast(`📥 プロファイル「${newProfile.name}」を単体インポートしました`);
      }
    } catch (err) {
      log(`プロファイル単体のインポートに失敗しました: ${err.message}`, "error");
      alert(`プロファイルの読み込みに失敗しました: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

function openPresetModal() {
  if (!presetModal || !presetCardsGrid) return;
  presetCardsGrid.innerHTML = "";
  PRESET_PROFILES.forEach((preset) => {
    const item = document.createElement("div");
    item.className = "preset-card-item";
    const mode = preset.joystick.mode.toUpperCase();
    const target = preset.joystick.gamepad_target ? preset.joystick.gamepad_target.toUpperCase() : "";
    const modeBadge = mode === "GAMEPAD" && target ? `GP: ${target}` : mode;

    item.innerHTML = `
      <div class="preset-card-header">
        <span class="preset-card-title">${escapeHtml(preset.name)}</span>
        <span class="preset-card-mode">${escapeHtml(modeBadge)}</span>
      </div>
      <p class="preset-card-desc">${escapeHtml(preset.description)}</p>
      <div class="preset-card-actions">
        <button type="button" class="btn btn-sm btn-primary">このプリセットを追加</button>
      </div>
    `;
    const addBtn = item.querySelector("button");
    addBtn.addEventListener("click", () => {
      addPresetProfile(preset);
      closePresetModal();
    });
    presetCardsGrid.appendChild(item);
  });
  presetModal.style.display = "flex";
}

function closePresetModal() {
  if (presetModal) {
    presetModal.style.display = "none";
  }
}

function addPresetProfile(preset) {
  syncCurrentToProfile();
  const cloned = {
    id: generateProfileId(),
    name: preset.name,
    keymap: JSON.parse(JSON.stringify(preset.keymap)),
    joystick: JSON.parse(JSON.stringify(preset.joystick))
  };
  currentConfig.profiles.push(cloned);
  switchProfile(currentConfig.profiles.length - 1, true);

  if (!serialPort || !writer) {
    addPendingImportedProfile(cloned);
    log(`プリセット「${preset.name}」を追加しました。デバイス接続時にデバイスへ自動同期されます。`, "info");
    showToast(`📚 プリセット「${preset.name}」を追加しました（接続時に自動同期）`, 4000);
  } else {
    log(`プリセット「${preset.name}」を追加しました`, "success");
    showToast(`📚 プリセット「${preset.name}」を追加しました`);
  }
}

// ==========================================
// 未接続時に追加されたプロファイルの自動保留・マージ管理
// ==========================================
const PENDING_PROFILES_KEY = "lefty_pending_imported_profiles";

function loadPendingImportedProfiles() {
  try {
    const raw = localStorage.getItem(PENDING_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("loadPendingImportedProfiles failed:", e);
  }
  return [];
}

function savePendingImportedProfiles(list) {
  try {
    localStorage.setItem(PENDING_PROFILES_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("savePendingImportedProfiles failed:", e);
  }
}

function addPendingImportedProfile(profile) {
  const list = loadPendingImportedProfiles();
  list.push(JSON.parse(JSON.stringify(profile)));
  savePendingImportedProfiles(list);
}

function clearPendingImportedProfiles() {
  try {
    localStorage.removeItem(PENDING_PROFILES_KEY);
  } catch (e) {}
}

function getPendingOrExtraProfiles(deviceConfig) {
  const pending = loadPendingImportedProfiles();
  const result = [];
  const devProfiles = (deviceConfig && Array.isArray(deviceConfig.profiles)) ? deviceConfig.profiles : [];

  // 保留リスト (ユーザーが明示的に共有リンク/インポートで追加したもの) からデバイスに存在しないプロファイルのみを収集
  pending.forEach(p => {
    if (!p) return;
    const existsOnDevice = p.id
      ? devProfiles.some(dp => dp.id === p.id)
      : devProfiles.some(dp => dp.name === p.name);
    if (!existsOnDevice) {
      result.push(p);
    }
  });

  return result;
}

// ==========================================
// URLパラメータ方式 プロファイル共有 & インポート
// ==========================================
function uint8ArrayToBase64(bytes) {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

let toastTimer = null;
function showToast(message, duration = 3000) {
  const toast = document.getElementById("toastNotification");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    toastTimer = null;
  }, duration);
}

async function compressProfileToUrl(profile) {
  const jsonStr = JSON.stringify(profile);
  const stream = new Blob([jsonStr]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream("deflate-raw"));
  const buffer = await new Response(compressedStream).arrayBuffer();
  const base64 = uint8ArrayToBase64(new Uint8Array(buffer));
  const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const cleanUrl = new URL(window.location.origin + window.location.pathname);
  cleanUrl.searchParams.set("profile", base64url);
  return cleanUrl.toString();
}

const MAX_DECOMPRESSED_PROFILE_BYTES = 65536; // 64KB 展開上限 (Decompression Bomb防止)

async function decompressProfileFromUrl(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const bytes = base64ToUint8Array(base64);
  const stream = new Blob([bytes]).stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream("deflate-raw"));
  const streamReader = decompressedStream.getReader();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { value, done } = await streamReader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > MAX_DECOMPRESSED_PROFILE_BYTES) {
        await streamReader.cancel();
        throw new Error("展開後のプロファイルデータサイズが上限 (64KB) を超えています");
      }
      chunks.push(value);
    }
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(combined);
  return JSON.parse(text);
}

async function copyProfileShareUrl(idx) {
  syncCurrentToProfile();
  const target = currentConfig.profiles[idx];
  if (!target) return;

  try {
    const profileToShare = {
      id: target.id || generateProfileId(),
      name: target.name,
      keymap: JSON.parse(JSON.stringify(target.keymap)),
      joystick: JSON.parse(JSON.stringify(target.joystick))
    };
    const shareUrl = await compressProfileToUrl(profileToShare);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      showToast(`📋 プロファイル「${target.name}」の共有リンクをコピーしました！`);
      log(`共有リンクをクリップボードにコピーしました (${shareUrl.length}文字)`, "success");
    } else {
      prompt("プロファイル共有リンクをコピーしてください:", shareUrl);
    }
  } catch (err) {
    log(`共有リンクの生成に失敗しました: ${err.message}`, "error");
    alert(`共有リンクの生成に失敗しました: ${err.message}`);
  }
}

let pendingSharedProfile = null;

function openSharedProfileModal(profile) {
  pendingSharedProfile = profile;
  const modal = document.getElementById("sharedProfileModal");
  if (!modal) return;

  const badgeEl = document.getElementById("sharedProfileBadge");
  const countEl = document.getElementById("sharedProfileBtnCount");
  const nameEl = document.getElementById("sharedProfileName");
  const descEl = document.getElementById("sharedProfileDesc");

  const mode = (profile.joystick && profile.joystick.mode) ? profile.joystick.mode.toUpperCase() : "KEYBOARD";
  const target = (profile.joystick && profile.joystick.gamepad_target) ? profile.joystick.gamepad_target.toUpperCase() : "";
  const badgeText = mode === "GAMEPAD" && target ? `GP: ${target}` : mode;
  const btnCount = (profile.keymap && Array.isArray(profile.keymap.buttons)) ? profile.keymap.buttons.length : 13;

  if (badgeEl) badgeEl.textContent = badgeText;
  if (countEl) countEl.textContent = `${btnCount}ボタン設定済`;
  if (nameEl) nameEl.textContent = profile.name || "共有プロファイル";
  if (descEl) {
    descEl.textContent = `スティック設定 (${badgeText}) および ${btnCount}個のキー割り当てが含まれています。`;
  }

  modal.style.display = "flex";
}

function closeSharedProfileModal() {
  const modal = document.getElementById("sharedProfileModal");
  if (modal) {
    modal.style.display = "none";
  }
  pendingSharedProfile = null;
  cleanUpUrlParameters();
}

function cleanUpUrlParameters() {
  if (window.history && window.history.replaceState) {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

function applySharedProfile() {
  if (!pendingSharedProfile) {
    closeSharedProfileModal();
    return;
  }
  const profile = pendingSharedProfile;

  const buttons = (profile.keymap && Array.isArray(profile.keymap.buttons)) ? profile.keymap.buttons.slice(0, 13) : [];
  while (buttons.length < 13) {
    buttons.push("");
  }

  const newProfile = {
    id: (profile.id && !currentConfig.profiles.some(p => p.id === profile.id))
      ? profile.id
      : generateProfileId(),
    name: profile.name || "共有プロファイル",
    keymap: {
      buttons,
      fn_buttons: (profile.keymap && Array.isArray(profile.keymap.fn_buttons))
        ? profile.keymap.fn_buttons.slice(0, 13)
        : ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "Space", "z", "LCtrl", "LAlt"],
      combos: (profile.keymap && Array.isArray(profile.keymap.combos))
        ? JSON.parse(JSON.stringify(profile.keymap.combos))
        : []
    },
    joystick: JSON.parse(JSON.stringify(profile.joystick || DEFAULT_CONFIG.joystick))
  };
  while (newProfile.keymap.fn_buttons.length < 13) {
    newProfile.keymap.fn_buttons.push("");
  }

  syncCurrentToProfile();
  currentConfig.profiles.push(newProfile);
  switchProfile(currentConfig.profiles.length - 1, true);

  if (!serialPort || !writer) {
    addPendingImportedProfile(newProfile);
    log(`共有リンクからプロファイル「${newProfile.name}」を追加しました。デバイス接続時にデバイスへ自動同期されます。`, "info");
    showToast(`📥 プロファイル「${newProfile.name}」を追加しました（接続時に自動同期）`, 4000);
  } else {
    log(`共有リンクからプロファイル「${newProfile.name}」を追加しました`, "success");
    showToast(`📥 プロファイル「${newProfile.name}」を追加しました`);
  }

  closeSharedProfileModal();
}

async function checkUrlForSharedProfile() {
  try {
    let encoded = "";
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("profile")) {
      encoded = searchParams.get("profile");
    } else if (window.location.hash) {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      if (hashParams.has("profile")) {
        encoded = hashParams.get("profile");
      } else if (hash.startsWith("profile=")) {
        encoded = hash.split("=")[1];
      }
    }

    if (!encoded) return;

    if (encoded.length > 10000) {
      throw new Error("プロファイルデータが大きすぎます");
    }

    const decoded = await decompressProfileFromUrl(encoded);
    if (!decoded || typeof decoded !== "object") {
      throw new Error("プロファイルデータの形式が無効です");
    }

    let targetProfile = null;
    if (decoded.profile && typeof decoded.profile === "object") {
      targetProfile = decoded.profile;
    } else if (decoded.keymap && decoded.joystick) {
      targetProfile = decoded;
    }

    if (!targetProfile || !targetProfile.keymap || !Array.isArray(targetProfile.keymap.buttons)) {
      throw new Error("有効なプロファイル定義が見つかりませんでした (keymap.buttons が必要です)");
    }

    openSharedProfileModal(targetProfile);
  } catch (err) {
    log(`共有プロファイルURLの解析に失敗しました: ${err.message}`, "error");
    alert(`共有リンクからプロファイルデータを読み込めませんでした:\n${err.message}`);
    cleanUpUrlParameters();
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ハードウェアボタン状態インジケータ生成
function renderHwButtonGrid() {
  if (!hwBtnGrid) return;
  hwBtnGrid.innerHTML = "";
  HARDWARE_PINS.buttons.forEach((pin, i) => {
    const pill = document.createElement("div");
    pill.className = "hw-btn-pill";
    pill.id = `hw_btn_${pin}`;
    pill.textContent = BUTTON_LABELS[i] || `SW${i+1}`;
    pill.title = `${PIN_NAMES[i]} (GP${pin})`;
    hwBtnGrid.appendChild(pill);
  });
}

// ==========================================
// キーカタログ・モーダルピッカー・キー打鍵キャプチャ
// ==========================================
let currentCatalogCategory = "kbd_alpha";
let currentModalCategory = "kbd_alpha";
let modalTargetInput = null;
let modalSelectedBaseKey = null;
let activeCapture = null;

function populateDatalist() {
  const datalist = document.getElementById("allKeysList");
  if (!datalist) return;
  datalist.innerHTML = "";
  SUPPORTED_KEY_CATALOG.forEach(cat => {
    cat.keys.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k.id;
      opt.label = `${k.label} - ${k.desc}`;
      datalist.appendChild(opt);
    });
  });
}

function initKeyCatalog() {
  const toggleBtn = document.getElementById("btnToggleCatalog");
  const catalogBody = document.getElementById("keyCatalogBody");
  const header = document.querySelector(".key-catalog-header");

  if (toggleBtn && catalogBody) {
    const toggleFunc = () => {
      const isClosed = catalogBody.style.display === "none";
      catalogBody.style.display = isClosed ? "flex" : "none";
      toggleBtn.textContent = isClosed ? "一覧を閉じる ▲" : "一覧を展開 ▼";
    };
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFunc();
    });
    if (header) {
      header.addEventListener("click", toggleFunc);
    }
  }

  renderCatalogTabs();
  renderCatalogChips(currentCatalogCategory);
}

function renderCatalogTabs() {
  const tabsContainer = document.getElementById("catalogTabs");
  if (!tabsContainer) return;
  tabsContainer.innerHTML = "";

  SUPPORTED_KEY_CATALOG.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `catalog-tab-btn ${cat.category === currentCatalogCategory ? "active" : ""}`;
    btn.textContent = `${cat.icon} ${cat.name}`;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      currentCatalogCategory = cat.category;
      document.querySelectorAll(".catalog-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderCatalogChips(currentCatalogCategory);
    });
    tabsContainer.appendChild(btn);
  });
}

function renderCatalogChips(catId) {
  const container = document.getElementById("catalogChipsContainer");
  if (!container) return;
  container.innerHTML = "";

  const category = SUPPORTED_KEY_CATALOG.find(c => c.category === catId);
  if (!category) return;

  category.keys.forEach(k => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `key-chip chip-${category.category}`;
    chip.textContent = k.label;
    chip.title = `${k.id} (${k.desc}) - クリックで入力`;
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      applyKeyFromCatalog(k.id);
    });
    container.appendChild(chip);
  });

  if (catId === "profile" && currentConfig && Array.isArray(currentConfig.profiles)) {
    currentConfig.profiles.forEach((p, idx) => {
      const pId = p.id || `profile_${idx}`;
      const actionId = `profile_switch:${pId}`;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "key-chip chip-profile";
      chip.textContent = `🎯 #${idx + 1}「${p.name}」`;
      chip.title = `${actionId}: ボタン押下でプロファイル「${p.name}」へ直接切り替え`;
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        applyKeyFromCatalog(actionId);
      });
      container.appendChild(chip);
    });
  }
}

function applyKeyFromCatalog(keyId) {
  let target = lastFocusedInput;
  if (!target) {
    target = document.getElementById("btnInput_0");
  }
  if (!target) return;

  target.value = keyId;
  target.dispatchEvent(new Event("input"));
  target.dispatchEvent(new Event("change"));
  target.focus();

  target.style.transition = "box-shadow 0.2s ease";
  target.style.boxShadow = "0 0 10px #38bdf8";
  setTimeout(() => {
    target.style.boxShadow = "";
  }, 400);

  log(`カタログから「${keyId}」を入力欄に設定しました`, "info");
}

function stopKeyCapture() {
  if (!activeCapture) return;
  const { btn, handler, blurHandler } = activeCapture;
  window.removeEventListener("keydown", handler, true);
  window.removeEventListener("blur", blurHandler);
  if (btn) {
    btn.classList.remove("capturing-key");
    btn.textContent = "⌨️ 検出";
  }
  activeCapture = null;
}

function startKeyCapture(input, btn) {
  if (activeCapture) {
    const wasSame = activeCapture.btn === btn;
    stopKeyCapture();
    if (wasSame) return;
  }

  btn.classList.add("capturing-key");
  btn.textContent = "打鍵待機中(Esc取消)";

  const handler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape") {
      stopKeyCapture();
      log("キー検出をキャンセルしました", "info");
      return;
    }

    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      return;
    }

    const code = e.code;
    let baseKey = null;

    if (code.startsWith("Key")) {
      baseKey = code.slice(3).toLowerCase();
    } else if (code.startsWith("Digit")) {
      baseKey = code.slice(5);
    } else if (code.startsWith("Numpad") && !isNaN(code.slice(6))) {
      baseKey = code.slice(6);
    } else if (/^F\d{1,2}$/.test(code)) {
      baseKey = code;
    } else {
      const codeMap = {
        "Space": "Space",
        "Enter": "Enter",
        "NumpadEnter": "Enter",
        "Tab": "Tab",
        "Backspace": "Backspace",
        "Delete": "Delete",
        "Insert": "Insert",
        "Home": "Home",
        "End": "End",
        "PageUp": "PageUp",
        "PageDown": "PageDown",
        "ArrowUp": "Up",
        "ArrowDown": "Down",
        "ArrowLeft": "Left",
        "ArrowRight": "Right",
        "Minus": "-",
        "Equal": "=",
        "BracketLeft": "[",
        "BracketRight": "]",
        "Backslash": "\\",
        "Semicolon": ";",
        "Quote": "'",
        "Backquote": "`",
        "Comma": ",",
        "Period": ".",
        "Slash": "/",
        "CapsLock": "CapsLock"
      };
      baseKey = codeMap[code] || e.key;
    }

    const parts = [];
    if (e.ctrlKey) parts.push("LCtrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("LAlt");
    if (e.metaKey) parts.push("Win");

    if (baseKey && !parts.some(p => p.toLowerCase() === baseKey.toLowerCase())) {
      parts.push(baseKey);
    }

    const finalVal = parts.join(", ");
    input.value = finalVal;
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new Event("change"));
    log(`キー入力を検出・設定しました: ${finalVal}`, "info");

    stopKeyCapture();
  };

  const blurHandler = () => stopKeyCapture();

  activeCapture = { btn, input, handler, blurHandler };
  window.addEventListener("keydown", handler, true);
  window.addEventListener("blur", blurHandler);
}

function initModalEvents() {
  const modal = document.getElementById("keyPickerModal");
  const btnClose = document.getElementById("btnModalClose");
  const btnClear = document.getElementById("btnModalClear");
  const btnApply = document.getElementById("btnModalApply");

  if (btnClose) btnClose.addEventListener("click", closeKeyPicker);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeKeyPicker();
    });
  }

  ["modCtrl", "modShift", "modAlt", "modWin"].forEach(id => {
    const chk = document.getElementById(id);
    if (chk) chk.addEventListener("change", updateModalPreview);
  });

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (modalTargetInput) {
        modalTargetInput.value = "";
        modalTargetInput.dispatchEvent(new Event("input"));
        modalTargetInput.dispatchEvent(new Event("change"));
      }
      closeKeyPicker();
    });
  }

  if (btnApply) {
    btnApply.addEventListener("click", () => {
      if (!modalTargetInput) return;
      const result = buildModalCombinedKey();
      modalTargetInput.value = result;
      modalTargetInput.dispatchEvent(new Event("input"));
      modalTargetInput.dispatchEvent(new Event("change"));
      closeKeyPicker();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.style.display === "flex") {
      closeKeyPicker();
    }
  });
}

function openKeyPicker(targetInput, title = "キーを選択") {
  modalTargetInput = targetInput;
  const modal = document.getElementById("keyPickerModal");
  const titleEl = document.getElementById("modalTargetTitle");
  if (!modal) return;

  if (titleEl) titleEl.textContent = title;

  const curVal = targetInput.value.trim();
  const parts = curVal.split(',').map(s => s.trim()).filter(Boolean);

  const modCtrl = document.getElementById("modCtrl");
  const modShift = document.getElementById("modShift");
  const modAlt = document.getElementById("modAlt");
  const modWin = document.getElementById("modWin");

  if (modCtrl) modCtrl.checked = parts.some(p => p.toLowerCase().includes("ctrl"));
  if (modShift) modShift.checked = parts.some(p => p.toLowerCase().includes("shift"));
  if (modAlt) modAlt.checked = parts.some(p => p.toLowerCase().includes("alt"));
  if (modWin) modWin.checked = parts.some(p => ["win", "gui", "command"].includes(p.toLowerCase()));

  const base = parts.find(p => !["ctrl", "lctrl", "rctrl", "shift", "lshift", "rshift", "alt", "lalt", "ralt", "win", "lwin", "gui"].includes(p.toLowerCase()));
  modalSelectedBaseKey = base || null;

  if (modalSelectedBaseKey && modalSelectedBaseKey.toLowerCase().startsWith("profile_")) {
    currentModalCategory = "profile";
  }

  renderModalTabs();
  renderModalChips();
  updateModalPreview();

  modal.style.display = "flex";
}

function closeKeyPicker() {
  const modal = document.getElementById("keyPickerModal");
  if (modal) modal.style.display = "none";
  modalTargetInput = null;
  modalSelectedBaseKey = null;
}

function renderModalTabs() {
  const tabsContainer = document.getElementById("modalTabs");
  if (!tabsContainer) return;
  tabsContainer.innerHTML = "";

  SUPPORTED_KEY_CATALOG.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `catalog-tab-btn ${cat.category === currentModalCategory ? "active" : ""}`;
    btn.textContent = `${cat.icon} ${cat.name}`;
    btn.addEventListener("click", () => {
      currentModalCategory = cat.category;
      document.querySelectorAll("#modalTabs .catalog-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderModalChips();
    });
    tabsContainer.appendChild(btn);
  });
}

function renderModalChips() {
  const container = document.getElementById("modalChipsGrid");
  if (!container) return;
  container.innerHTML = "";

  const category = SUPPORTED_KEY_CATALOG.find(c => c.category === currentModalCategory);
  if (!category) return;

  category.keys.forEach(k => {
    const chip = document.createElement("button");
    chip.type = "button";
    const isSelected = modalSelectedBaseKey && modalSelectedBaseKey.toLowerCase() === k.id.toLowerCase();
    chip.className = `key-chip chip-${category.category} ${isSelected ? "selected" : ""}`;
    chip.textContent = k.label;
    chip.title = `${k.id}: ${k.desc}`;
    chip.addEventListener("click", () => {
      modalSelectedBaseKey = k.id;
      renderModalChips();
      updateModalPreview();
    });
    container.appendChild(chip);
  });

  // プロファイル切替タブの場合、登録されている全プロファイルへの直接切替チップを動的生成
  if (currentModalCategory === "profile" && currentConfig && Array.isArray(currentConfig.profiles)) {
    currentConfig.profiles.forEach((p, idx) => {
      const pId = p.id || `profile_${idx}`;
      const actionId = `profile_switch:${pId}`;
      const isSelected = modalSelectedBaseKey && modalSelectedBaseKey.toLowerCase() === actionId.toLowerCase();
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `key-chip chip-profile ${isSelected ? "selected" : ""}`;
      chip.textContent = `🎯 #${idx + 1}「${p.name}」へ直接切替`;
      chip.title = `${actionId}: ボタンを押すとプロファイル「${p.name}」へ直接切り替えます`;
      chip.addEventListener("click", () => {
        modalSelectedBaseKey = actionId;
        renderModalChips();
        updateModalPreview();
      });
      container.appendChild(chip);
    });
  }
}

function buildModalCombinedKey() {
  if (modalSelectedBaseKey && modalSelectedBaseKey.toLowerCase().startsWith("profile_")) {
    return modalSelectedBaseKey;
  }

  const parts = [];
  const modCtrl = document.getElementById("modCtrl");
  const modShift = document.getElementById("modShift");
  const modAlt = document.getElementById("modAlt");
  const modWin = document.getElementById("modWin");

  if (modCtrl && modCtrl.checked) parts.push("LCtrl");
  if (modShift && modShift.checked) parts.push("Shift");
  if (modAlt && modAlt.checked) parts.push("LAlt");
  if (modWin && modWin.checked) parts.push("Win");

  if (modalSelectedBaseKey) {
    if (!parts.some(p => p.toLowerCase() === modalSelectedBaseKey.toLowerCase())) {
      parts.push(modalSelectedBaseKey);
    }
  }
  return parts.join(", ");
}

function updateModalPreview() {
  const preview = document.getElementById("modalSelectedKey");
  if (!preview) return;
  const key = buildModalCombinedKey();
  preview.textContent = key || "未選択 (なし)";
}

function initTabs() {
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetTabId = item.getAttribute("data-tab");
      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");

      tabPanes.forEach(pane => {
        if (pane.id === targetTabId) {
          pane.classList.add("active");
        } else {
          pane.classList.remove("active");
        }
      });

      if (targetTabId === "tabJoystick") {
        setTimeout(drawRadar, 20);
      }
    });
  });
}

function initProfileExtraEvents() {
  if (btnMoveProfileUp) btnMoveProfileUp.addEventListener("click", moveProfileUp);
  if (btnMoveProfileDown) btnMoveProfileDown.addEventListener("click", moveProfileDown);
  if (btnExportSingleProfile) btnExportSingleProfile.addEventListener("click", exportSingleProfile);
  if (fileImportSingleProfile) {
    fileImportSingleProfile.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        importSingleProfile(e.target.files[0]);
        e.target.value = "";
      }
    });
  }
  if (btnOpenPresetModal) btnOpenPresetModal.addEventListener("click", openPresetModal);
  if (btnPresetModalClose) btnPresetModalClose.addEventListener("click", closePresetModal);
  if (presetModal) {
    presetModal.addEventListener("click", (e) => {
      if (e.target === presetModal) closePresetModal();
    });
  }
  if (btnSharedProfileClose) btnSharedProfileClose.addEventListener("click", closeSharedProfileModal);
  if (btnSharedProfileCancel) btnSharedProfileCancel.addEventListener("click", closeSharedProfileModal);
  if (btnSharedProfileApply) btnSharedProfileApply.addEventListener("click", applySharedProfile);
  if (sharedProfileModal) {
    sharedProfileModal.addEventListener("click", (e) => {
      if (e.target === sharedProfileModal) closeSharedProfileModal();
    });
  }
}

function initQuickActionBars() {
  quickLoadBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (!serialPort || !reader) {
        alert("デバイスと接続されていません。先にヘッダーの「デバイスと接続」を行ってください。");
        return;
      }
      log("デバイスから設定を読み込み中...", "info");
      requestConfigWithRetry(false);
    });
  });

  quickSaveBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (!serialPort || !writer) {
        alert("デバイスと接続されていません。先にヘッダーの「デバイスと接続」を行ってください。");
        return;
      }
      syncCurrentToProfile();
      const syncPayload = getDeviceSyncPayload(currentConfig);
      setDeviceOpLoading("save", true, "", "デバイスへ設定を保存中 (Flash書き込み待機)...");
      log(`デバイスへ設定を送信・保存中 (${syncPayload.profiles.length}個のプロファイルを同期)...`, "info");
      sendJson({ cmd: "set_config", config: syncPayload });
    });
  });
}

// UI初期化
function initUI() {
  const appVersionTag = document.getElementById("appVersionTag");
  if (appVersionTag) {
    appVersionTag.textContent = `WebUI v${WEBUI_VERSION}`;
  }

  const cached = loadFromLocalStorage();
  if (cached) {
    currentConfig = cached;
    log("ブラウザの localStorage から保存済み設定を復元しました", "info");
    updateStorageBadge("saved", "localStorageから復元");
  } else {
    ensureProfiles(currentConfig);
    updateStorageBadge("saved", "初期設定");
  }
  populateDatalist();
  initKeyCatalog();
  initModalEvents();
  initTabs();
  initProfileExtraEvents();
  initQuickActionBars();
  if (btnDismissVersionAlert && versionAlertBanner) {
    btnDismissVersionAlert.addEventListener("click", () => {
      versionAlertBanner.style.display = "none";
    });
  }
  if (btnDismissSafeModeAlert && safeModeAlertBanner) {
    btnDismissSafeModeAlert.addEventListener("click", () => {
      safeModeAlertBanner.style.display = "none";
    });
  }
  if (btnSendCtrlD) {
    btnSendCtrlD.addEventListener("click", async () => {
      await sendCtrlD();
    });
  }
  initNvmEvents();
  initAdvancedInputEvents();
  renderProfileSelect();
  renderHwButtonGrid();
  renderButtonGrid();
  renderDirectionTable();
  updateFormFromConfig();
  drawRadar();
  restoreDeviceButtons();
  updateNvmStorageUI();
  checkUrlForSharedProfile();
}

function initNvmEvents() {
  const btnRefreshNvm = document.getElementById("btnRefreshNvm");
  if (btnRefreshNvm) {
    btnRefreshNvm.addEventListener("click", () => {
      if (serialPort && writer) {
        log("マイコン内蔵Flashストレージ状況を問い合わせ中...", "info");
        sendJson({ cmd: "storage_status" });
      } else {
        latestStorageStatus = null;
        updateStorageUI();
        showToast("💾 設定データサイズからストレージ使用量を再計算しました");
      }
    });
  }

  if (btnEnterMaintenance) {
    btnEnterMaintenance.addEventListener("click", async () => {
      if (!serialPort || !writer) {
        showToast("⚠️ シリアル未接続です");
        return;
      }
      const ok = confirm(
        "マイコンをメンテナンスモード（CIRCUITPY ドライブ表示）で再起動しますか？\n\n" +
        "・PCにUSBマスストレージドライブとして認識され、code.py等のファイルを直接編集できるようになります。\n" +
        "・再起動に伴いWebUIのシリアル接続は一度切断されます。\n" +
        "・通常モードへ戻すには、ドライブを安全に取り外した後に「通常再起動」またはマイコンをリセットしてください。"
      );
      if (!ok) return;

      isRebootPending = true;
      log("🛠️ メンテナンスモードへの移行コマンドを送信中...", "info");
      await sendJson({ cmd: "enter_maintenance" });
      showToast("🛠️ メンテナンスモードへ移行中... マイコンが再起動します（数秒後に「接続」で再接続可能）", 6000);

      // 安全フォールバックタイマー (万一切断イベントが遅延した場合のフェイルセーフ)
      setTimeout(() => {
        if (isRebootPending && serialPort) {
          disconnectSerial({ isSilent: true, reason: "マイコンの再起動に伴い切断しました" });
          isRebootPending = false;
        }
      }, 1500);
    });
  }

  if (btnRebootNormal) {
    btnRebootNormal.addEventListener("click", async () => {
      if (!serialPort || !writer) {
        showToast("⚠️ シリアル未接続です");
        return;
      }
      const ok = confirm(
        "マイコンを通常モードで再起動しますか？\n\n" +
        "・再起動に伴いWebUIのシリアル接続は一度切断されます。"
      );
      if (!ok) return;

      isRebootPending = true;
      log("🔄 マイコンの通常再起動コマンドを送信中...", "info");
      await sendJson({ cmd: "reboot" });
      showToast("🔄 通常モードへ再起動中...（数秒後に「接続」で再接続可能）", 6000);

      // 安全フォールバックタイマー (万一切断イベントが遅延した場合のフェイルセーフ)
      setTimeout(() => {
        if (isRebootPending && serialPort) {
          disconnectSerial({ isSilent: true, reason: "マイコンの再起動に伴い切断しました" });
          isRebootPending = false;
        }
      }, 1500);
    });
  }
}

function renderButtonGrid() {
  const container = document.getElementById("buttonGrid");
  if (!container) return;
  container.innerHTML = "";

  if (!currentConfig.keymap) currentConfig.keymap = {};
  if (!Array.isArray(currentConfig.keymap.buttons)) currentConfig.keymap.buttons = Array(13).fill("");
  if (!Array.isArray(currentConfig.keymap.fn_buttons)) currentConfig.keymap.fn_buttons = Array(13).fill("");

  const isFn = (currentEditingLayer === "fn");
  const buttonsArray = isFn ? currentConfig.keymap.fn_buttons : currentConfig.keymap.buttons;

  for (let i = 0; i < 13; i++) {
    const card = document.createElement("div");
    card.className = "btn-card";
    card.id = `btnCard_${i}`;

    const header = document.createElement("div");
    header.className = "btn-card-header";

    const titleGroup = document.createElement("div");
    titleGroup.className = "btn-card-title";

    const label = document.createElement("span");
    label.className = "btn-label";
    label.textContent = PIN_NAMES[i] || `Button ${i+1}`;

    const pinInfo = document.createElement("span");
    pinInfo.className = "btn-pin";
    pinInfo.textContent = `GP${HARDWARE_PINS.buttons[i]}`;

    titleGroup.appendChild(label);
    titleGroup.appendChild(pinInfo);

    const keyVal = buttonsArray[i];

    if (typeof keyVal === "string" && keyVal.startsWith("tap:")) {
      const thBadge = document.createElement("span");
      thBadge.className = "btn-card-extra-badge badge-taphold-card";
      thBadge.textContent = "⏱️ 短/長";
      thBadge.title = keyVal;
      titleGroup.appendChild(thBadge);
    } else if (keyVal === "layer:fn" || keyVal === "fn") {
      const fnBadge = document.createElement("span");
      fnBadge.className = "btn-card-extra-badge badge-fn-card";
      fnBadge.textContent = "⚡ Fn";
      fnBadge.title = "Fnレイヤー切り替えキー";
      titleGroup.appendChild(fnBadge);
    }

    const toolsGroup = document.createElement("div");
    toolsGroup.className = "btn-card-tools";

    const btnPick = document.createElement("button");
    btnPick.type = "button";
    btnPick.className = "btn-tool-sm";
    btnPick.textContent = "📋 選択";
    btnPick.title = "一覧パレットから選んで設定";

    const btnCapture = document.createElement("button");
    btnCapture.type = "button";
    btnCapture.className = "btn-tool-sm";
    btnCapture.textContent = "⌨️ 検出";
    btnCapture.title = "PCキーボードのキーを押して自動入力";

    const btnTapHold = document.createElement("button");
    btnTapHold.type = "button";
    btnTapHold.className = "btn-tool-sm";
    btnTapHold.textContent = "⏱️ 長押し";
    btnTapHold.title = "短押し / 長押しの個別割当";

    toolsGroup.appendChild(btnPick);
    toolsGroup.appendChild(btnCapture);
    toolsGroup.appendChild(btnTapHold);

    header.appendChild(titleGroup);
    header.appendChild(toolsGroup);

    const wrapper = document.createElement("div");
    wrapper.className = "btn-input-wrapper";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "btn-input";
    input.id = `btnInput_${i}`;
    input.setAttribute("list", "allKeysList");
    input.value = Array.isArray(keyVal) ? keyVal.join(', ') : (keyVal || "");
    input.placeholder = isFn ? "例: F1, profile_next, Escape" : "例: 1, Space, LCtrl, c";

    const badge = document.createElement("span");
    badge.className = "key-valid-badge";
    badge.id = `keyValid_${i}`;

    input.addEventListener("focus", () => {
      lastFocusedInput = input;
    });

    input.addEventListener("input", () => {
      updateValidationBadge(input, badge);
    });

    input.addEventListener("change", (e) => {
      const parts = e.target.value.split(',').map(s => s.trim()).filter(s => s);
      const finalVal = parts.length > 1 ? parts : (parts[0] || "");
      buttonsArray[i] = finalVal;
      syncCurrentToProfile();
      updateProfilesSyncSummary();
      updateValidationBadge(input, badge);
      renderButtonGrid();
    });

    btnPick.addEventListener("click", () => {
      lastFocusedInput = input;
      const layerTitle = isFn ? "Fnレイヤー" : "通常";
      openKeyPicker(input, `${PIN_NAMES[i]} (${layerTitle}) のキー設定`);
    });

    btnCapture.addEventListener("click", () => {
      lastFocusedInput = input;
      startKeyCapture(input, btnCapture);
    });

    btnTapHold.addEventListener("click", () => {
      lastFocusedInput = input;
      openTapHoldModal(i, input);
    });

    updateValidationBadge(input, badge);

    wrapper.appendChild(input);
    wrapper.appendChild(badge);

    card.appendChild(header);
    card.appendChild(wrapper);
    container.appendChild(card);
  }

  renderCombosList();
}

// ==========================================
// 短押し / 長押し (Tap-Hold) モーダル
// ==========================================
function openTapHoldModal(buttonIndex, inputEl) {
  currentTapHoldTarget = { input: inputEl, buttonIndex };
  const modal = document.getElementById("tapHoldModal");
  if (!modal) return;

  const isFn = (currentEditingLayer === "fn");
  const buttonsArray = isFn ? currentConfig.keymap.fn_buttons : currentConfig.keymap.buttons;
  const currentVal = buttonsArray[buttonIndex] || "";

  const titleEl = document.getElementById("tapHoldModalTitle");
  if (titleEl) {
    const layerName = isFn ? "Fnレイヤー" : "通常レイヤー";
    titleEl.textContent = `⏱️ ${PIN_NAMES[buttonIndex]} (${layerName}) 短押し / 長押し設定`;
  }

  const tapInput = document.getElementById("tapHoldInputTap");
  const holdInput = document.getElementById("tapHoldInputHold");
  const msInput = document.getElementById("tapHoldInputMs");
  const previewEl = document.getElementById("tapHoldPreviewText");

  let tapVal = "";
  let holdVal = "";
  let msVal = 300;

  if (typeof currentVal === "string" && currentVal.startsWith("tap:")) {
    const match = currentVal.match(/^tap:(.*?)\|hold:(.*?)\|ms:(\d+)$/);
    if (match) {
      tapVal = match[1];
      holdVal = match[2];
      msVal = parseInt(match[3], 10) || 300;
    } else {
      tapVal = currentVal;
      holdVal = "profile_next";
    }
  } else if (Array.isArray(currentVal)) {
    tapVal = currentVal.join(", ");
    holdVal = "profile_next";
  } else {
    tapVal = currentVal || "";
    holdVal = "profile_next";
  }

  if (tapInput) tapInput.value = tapVal;
  if (holdInput) holdInput.value = holdVal;
  if (msInput) msInput.value = msVal;

  function updatePreview() {
    const t = tapInput ? tapInput.value.trim() : "";
    const h = holdInput ? holdInput.value.trim() : "";
    const m = msInput ? parseInt(msInput.value, 10) || 300 : 300;
    if (previewEl) {
      previewEl.textContent = `tap:${t}|hold:${h}|ms:${m}`;
    }
  }

  updatePreview();
  if (tapInput) tapInput.oninput = updatePreview;
  if (holdInput) holdInput.oninput = updatePreview;
  if (msInput) msInput.oninput = updatePreview;

  modal.style.display = "flex";
}

function initTapHoldModalEvents() {
  const modal = document.getElementById("tapHoldModal");
  const btnClose = document.getElementById("btnTapHoldClose");
  const btnApply = document.getElementById("btnTapHoldApply");
  const btnClear = document.getElementById("btnTapHoldClear");
  const btnPickTap = document.getElementById("btnTapHoldPickTap");
  const btnPickHold = document.getElementById("btnTapHoldPickHold");
  const tapInput = document.getElementById("tapHoldInputTap");
  const holdInput = document.getElementById("tapHoldInputHold");
  const msInput = document.getElementById("tapHoldInputMs");

  if (!modal) return;

  function closeModal() {
    modal.style.display = "none";
  }

  if (btnClose) btnClose.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  if (btnPickTap && tapInput) {
    btnPickTap.addEventListener("click", () => {
      openKeyPicker(tapInput, "短押し (Tap) のキー選択");
    });
  }

  if (btnPickHold && holdInput) {
    btnPickHold.addEventListener("click", () => {
      openKeyPicker(holdInput, "長押し (Hold) のキー選択");
    });
  }

  if (btnApply) {
    btnApply.addEventListener("click", () => {
      if (currentTapHoldTarget.buttonIndex === null) {
        closeModal();
        return;
      }
      const t = tapInput ? tapInput.value.trim() : "";
      const h = holdInput ? holdInput.value.trim() : "";
      const m = msInput ? parseInt(msInput.value, 10) || 300 : 300;

      if (!t) {
        showToast("⚠️ 短押し (Tap) のキーを入力してください");
        return;
      }
      if (!h) {
        showToast("⚠️ 長押し (Hold) のキーを入力してください");
        return;
      }

      const formatted = `tap:${t}|hold:${h}|ms:${m}`;
      const isFn = (currentEditingLayer === "fn");
      const buttonsArray = isFn ? currentConfig.keymap.fn_buttons : currentConfig.keymap.buttons;
      buttonsArray[currentTapHoldTarget.buttonIndex] = formatted;

      syncCurrentToProfile();
      updateProfilesSyncSummary();
      closeModal();
      renderButtonGrid();
      showToast(`⏱️ ${PIN_NAMES[currentTapHoldTarget.buttonIndex]} に短押し/長押しを設定しました`);
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (currentTapHoldTarget.buttonIndex === null) {
        closeModal();
        return;
      }
      const t = tapInput ? tapInput.value.trim() : "";
      const isFn = (currentEditingLayer === "fn");
      const buttonsArray = isFn ? currentConfig.keymap.fn_buttons : currentConfig.keymap.buttons;
      buttonsArray[currentTapHoldTarget.buttonIndex] = t;

      syncCurrentToProfile();
      updateProfilesSyncSummary();
      closeModal();
      renderButtonGrid();
      showToast(`通常の単一キー「${t || 'なし'}」に戻しました`);
    });
  }
}

// ==========================================
// 2ボタン同時押し (コンボ) リスト描画
// ==========================================
function renderCombosList() {
  const container = document.getElementById("combosListContainer");
  if (!container) return;
  container.innerHTML = "";

  if (!currentConfig.keymap) currentConfig.keymap = {};
  if (!Array.isArray(currentConfig.keymap.combos)) {
    currentConfig.keymap.combos = [];
  }

  const combos = currentConfig.keymap.combos;

  if (combos.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "combos-empty-hint";
    emptyDiv.textContent = "設定されたコンボはありません。「＋ コンボを追加」から側面ボタンの同時長押しによるプロファイル切り替え（例: 側面上 ＋ 側面下 600ms）などを登録できます。";
    container.appendChild(emptyDiv);
    return;
  }

  combos.forEach((combo, idx) => {
    const row = document.createElement("div");
    row.className = "combo-row";
    row.dataset.index = idx;

    // Button 1 & Button 2 dropdowns
    const btnsWrapper = document.createElement("div");
    btnsWrapper.className = "combo-btns-select";

    const sel1 = document.createElement("select");
    sel1.className = "combo-btn-select";
    const sel2 = document.createElement("select");
    sel2.className = "combo-btn-select";

    for (let b = 0; b < 13; b++) {
      const opt1 = document.createElement("option");
      opt1.value = b;
      opt1.textContent = `${PIN_NAMES[b]} (GP${HARDWARE_PINS.buttons[b]})`;
      if (combo.buttons && combo.buttons[0] === b) opt1.selected = true;
      sel1.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = b;
      opt2.textContent = `${PIN_NAMES[b]} (GP${HARDWARE_PINS.buttons[b]})`;
      if (combo.buttons && combo.buttons[1] === b) opt2.selected = true;
      sel2.appendChild(opt2);
    }

    const plus = document.createElement("span");
    plus.className = "combo-plus";
    plus.textContent = "＋";

    btnsWrapper.appendChild(sel1);
    btnsWrapper.appendChild(plus);
    btnsWrapper.appendChild(sel2);

    const arrow = document.createElement("span");
    arrow.className = "combo-arrow";
    arrow.textContent = "──►";

    // Action input & pick button
    const actionWrapper = document.createElement("div");
    actionWrapper.className = "combo-action-wrapper";

    const actInput = document.createElement("input");
    actInput.type = "text";
    actInput.className = "combo-action-input";
    actInput.placeholder = "例: profile_next, Escape";
    actInput.setAttribute("list", "allKeysList");
    actInput.value = combo.action || "profile_next";

    const btnPick = document.createElement("button");
    btnPick.type = "button";
    btnPick.className = "btn-tool-sm";
    btnPick.textContent = "📋 選択";
    btnPick.title = "アクションを選択";

    btnPick.addEventListener("click", () => {
      openKeyPicker(actInput, `コンボ ${idx + 1} の発動アクション選択`);
    });

    actionWrapper.appendChild(actInput);
    actionWrapper.appendChild(btnPick);

    // Hold MS input
    const msWrapper = document.createElement("div");
    msWrapper.className = "combo-ms-wrapper";

    const msLabel = document.createElement("span");
    msLabel.textContent = "長押し:";

    const msInput = document.createElement("input");
    msInput.type = "number";
    msInput.className = "combo-ms-input";
    msInput.min = "100";
    msInput.max = "2000";
    msInput.step = "50";
    msInput.value = combo.hold_ms || 600;

    const msUnit = document.createElement("span");
    msUnit.className = "combo-ms-unit";
    msUnit.textContent = "ms";

    msWrapper.appendChild(msLabel);
    msWrapper.appendChild(msInput);
    msWrapper.appendChild(msUnit);

    // Delete button
    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "combo-btn-del";
    btnDel.textContent = "🗑️ 削除";
    btnDel.title = "このコンボを削除";

    function saveCombo() {
      combo.buttons = [parseInt(sel1.value, 10), parseInt(sel2.value, 10)];
      combo.action = actInput.value.trim();
      combo.hold_ms = parseInt(msInput.value, 10) || 600;
      syncCurrentToProfile();
      updateProfilesSyncSummary();
    }

    sel1.addEventListener("change", saveCombo);
    sel2.addEventListener("change", saveCombo);
    actInput.addEventListener("change", saveCombo);
    msInput.addEventListener("change", saveCombo);

    btnDel.addEventListener("click", () => {
      combos.splice(idx, 1);
      syncCurrentToProfile();
      updateProfilesSyncSummary();
      renderCombosList();
      showToast("🗑️ コンボを削除しました");
    });

    row.appendChild(btnsWrapper);
    row.appendChild(arrow);
    row.appendChild(actionWrapper);
    row.appendChild(msWrapper);
    row.appendChild(btnDel);

    container.appendChild(row);
  });
}

function initAdvancedInputEvents() {
  const btnLayerBase = document.getElementById("btnLayerBase");
  const btnLayerFn = document.getElementById("btnLayerFn");

  if (btnLayerBase && btnLayerFn) {
    btnLayerBase.addEventListener("click", () => {
      if (currentEditingLayer === "base") return;
      currentEditingLayer = "base";
      btnLayerBase.classList.add("active");
      btnLayerFn.classList.remove("active");
      renderButtonGrid();
    });

    btnLayerFn.addEventListener("click", () => {
      if (currentEditingLayer === "fn") return;
      currentEditingLayer = "fn";
      btnLayerFn.classList.add("active");
      btnLayerBase.classList.remove("active");
      renderButtonGrid();
    });
  }

  const btnAddCombo = document.getElementById("btnAddCombo");
  if (btnAddCombo) {
    btnAddCombo.addEventListener("click", () => {
      if (!currentConfig.keymap) currentConfig.keymap = {};
      if (!Array.isArray(currentConfig.keymap.combos)) currentConfig.keymap.combos = [];
      currentConfig.keymap.combos.push({
        buttons: [9, 11], // 側面上 + 側面下
        action: "profile_next",
        hold_ms: 600
      });
      syncCurrentToProfile();
      updateProfilesSyncSummary();
      renderCombosList();
      showToast("➕ 新しいコンボを追加しました");
    });
  }

  initTapHoldModalEvents();
}

function renderDirectionTable() {
  const tbody = document.getElementById("dirTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const dirs = [
    { key: "up", label: "UP (上)" },
    { key: "down", label: "DOWN (下)" },
    { key: "left", label: "LEFT (左)" },
    { key: "right", label: "RIGHT (右)" }
  ];

  dirs.forEach(d => {
    const cfg = (currentConfig.joystick && currentConfig.joystick.directions && currentConfig.joystick.directions[d.key])
      || DEFAULT_CONFIG.joystick.directions[d.key];
    const tr = document.createElement("tr");
    const walkVal = escapeHtml(Array.isArray(cfg.key_walk) ? cfg.key_walk.join(", ") : cfg.key_walk);
    const runVal = escapeHtml(Array.isArray(cfg.key_run) ? cfg.key_run.join(", ") : cfg.key_run);
    const thWalkNum = Number(cfg.th_walk) || 3000;
    const thRunNum = Number(cfg.th_run) || 26000;

    tr.innerHTML = `
      <td><strong>${escapeHtml(d.label)}</strong></td>
      <td><input type="number" id="th_walk_${d.key}" value="${thWalkNum}" step="500" min="1000" max="32000"></td>
      <td><input type="text" id="kw_${d.key}" list="allKeysList" value="${walkVal}"></td>
      <td><input type="number" id="th_run_${d.key}" value="${thRunNum}" step="500" min="1000" max="32000"></td>
      <td><input type="text" id="kr_${d.key}" list="allKeysList" value="${runVal}"></td>
    `;

    tbody.appendChild(tr);

    const elKw = tr.querySelector(`#kw_${d.key}`);
    const elKr = tr.querySelector(`#kr_${d.key}`);

    [elKw, elKr].forEach(inp => {
      if (inp) {
        inp.addEventListener("focus", () => { lastFocusedInput = inp; });
      }
    });

    // イベントリスナー
    tr.querySelector(`#th_walk_${d.key}`).addEventListener("change", (e) => {
      currentConfig.joystick.directions[d.key].th_walk = parseInt(e.target.value, 10);
      syncCurrentToProfile();
      drawRadar();
    });
    tr.querySelector(`#th_run_${d.key}`).addEventListener("change", (e) => {
      currentConfig.joystick.directions[d.key].th_run = parseInt(e.target.value, 10);
      syncCurrentToProfile();
      drawRadar();
    });
    elKw.addEventListener("change", (e) => {
      const val = e.target.value.split(',').map(s => s.trim()).filter(s => s);
      currentConfig.joystick.directions[d.key].key_walk = val.length === 1 ? val[0] : val;
      syncCurrentToProfile();
    });
    elKr.addEventListener("change", (e) => {
      const val = e.target.value.split(',').map(s => s.trim()).filter(s => s);
      currentConfig.joystick.directions[d.key].key_run = val.length === 1 ? val[0] : val;
      syncCurrentToProfile();
    });
  });
}

function updateFormFromConfig() {
  if (stickModeSelect) {
    stickModeSelect.value = (currentConfig.joystick && currentConfig.joystick.mode) ? currentConfig.joystick.mode : "keyboard";
  }
  if (directionModeSelect) {
    directionModeSelect.value = (currentConfig.joystick && currentConfig.joystick.direction_mode) ? currentConfig.joystick.direction_mode : "8way";
  }
  if (mouseSpeedInput) {
    const spd = (currentConfig.joystick && currentConfig.joystick.mouse_speed) ? currentConfig.joystick.mouse_speed : 12;
    mouseSpeedInput.value = spd;
    if (mouseSpeedVal) mouseSpeedVal.textContent = spd;
  }
  const walkRatio = getMouseWalkRatio(currentConfig.joystick && currentConfig.joystick.mouse_walk_ratio);
  if (mouseWalkRatioInput) {
    const pct = Math.round(walkRatio * 100);
    mouseWalkRatioInput.value = pct;
    if (mouseWalkRatioVal) mouseWalkRatioVal.textContent = `${pct}%`;
  }
  const curvePower = getMouseCurvePower(currentConfig.joystick && currentConfig.joystick.mouse_curve);
  if (mouseCurveSlider) {
    mouseCurveSlider.value = curvePower.toFixed(2);
    if (mouseCurveVal) mouseCurveVal.textContent = curvePower.toFixed(2);
  }
  updateCurvePresetButtons(curvePower);

  const curveType = (currentConfig.joystick && currentConfig.joystick.mouse_curve_type) ? currentConfig.joystick.mouse_curve_type : "power";
  if (mouseCurveTypeSelect) {
    mouseCurveTypeSelect.value = curveType;
  }
  const pts = (currentConfig.joystick && Array.isArray(currentConfig.joystick.mouse_curve_points) && currentConfig.joystick.mouse_curve_points.length === 4)
    ? currentConfig.joystick.mouse_curve_points
    : [0.15, 0.40, 0.75, 1.0];
  customPointSliders.forEach((sl, idx) => {
    if (sl) {
      const pPct = Math.round(pts[idx] * 100);
      sl.value = pPct;
      if (customPointVals[idx]) customPointVals[idx].textContent = `${pPct}%`;
    }
  });

  const minSpd = (currentConfig.joystick && typeof currentConfig.joystick.mouse_min_speed === "number") ? currentConfig.joystick.mouse_min_speed : 0.0;
  if (mouseMinSpeedInput) {
    mouseMinSpeedInput.value = minSpd.toFixed(1);
    if (mouseMinSpeedVal) {
      mouseMinSpeedVal.textContent = minSpd > 0 ? `${minSpd.toFixed(1)} px` : "0.0 px (無効)";
    }
  }

  const dynAccel = (currentConfig.joystick && typeof currentConfig.joystick.mouse_dynamic_accel === "number") ? currentConfig.joystick.mouse_dynamic_accel : 0.0;
  if (mouseDynamicAccelInput) {
    mouseDynamicAccelInput.value = dynAccel.toFixed(1);
    if (mouseDynamicAccelVal) {
      mouseDynamicAccelVal.textContent = dynAccel > 0 ? dynAccel.toFixed(1) : "0.0 (OFF)";
    }
  }

  const aspect = (currentConfig.joystick && typeof currentConfig.joystick.mouse_aspect_ratio === "number") ? currentConfig.joystick.mouse_aspect_ratio : 1.0;
  if (mouseAspectRatioInput) {
    mouseAspectRatioInput.value = aspect.toFixed(2);
    if (mouseAspectRatioVal) {
      mouseAspectRatioVal.textContent = (aspect === 1.0) ? "1.00 (等倍)" : `${aspect.toFixed(2)}x`;
    }
  }

  updateModeVisibility();

  const deadzone = (currentConfig.joystick && currentConfig.joystick.deadzone !== undefined) ? currentConfig.joystick.deadzone : 2500;
  deadzoneInput.value = deadzone;
  deadzoneVal.textContent = deadzone;

  const hysteresis = (currentConfig.joystick && currentConfig.joystick.hysteresis !== undefined) ? currentConfig.joystick.hysteresis : 1500;
  hysteresisInput.value = hysteresis;
  hysteresisVal.textContent = hysteresis;

  invertX.checked = !!(currentConfig.joystick && currentConfig.joystick.invert_x);
  invertY.checked = !!(currentConfig.joystick && currentConfig.joystick.invert_y);
  rotationSelect.value = String((currentConfig.joystick && currentConfig.joystick.rotation !== undefined) ? currentConfig.joystick.rotation : 90);

  // ボタン
  const isFn = (currentEditingLayer === "fn");
  const buttonsArray = isFn
    ? (currentConfig.keymap && currentConfig.keymap.fn_buttons || [])
    : (currentConfig.keymap && currentConfig.keymap.buttons || []);
  for (let i = 0; i < 13; i++) {
    const input = document.getElementById(`btnInput_${i}`);
    const badge = document.getElementById(`keyValid_${i}`);
    if (input) {
      const val = buttonsArray[i];
      input.value = Array.isArray(val) ? val.join(', ') : (val || "");
      if (badge) updateValidationBadge(input, badge);
    }
  }

  // 方向
  ["up", "down", "left", "right"].forEach(d => {
    const cfg = currentConfig.joystick.directions[d];
    const elTw = document.getElementById(`th_walk_${d}`);
    const elTr = document.getElementById(`th_run_${d}`);
    const elKw = document.getElementById(`kw_${d}`);
    const elKr = document.getElementById(`kr_${d}`);
    if (elTw) elTw.value = cfg.th_walk;
    if (elTr) elTr.value = cfg.th_run;
    if (elKw) elKw.value = Array.isArray(cfg.key_walk) ? cfg.key_walk.join(', ') : cfg.key_walk;
    if (elKr) elKr.value = Array.isArray(cfg.key_run) ? cfg.key_run.join(', ') : cfg.key_run;
  });

  // 一括設定スライダーの同期
  const upWalk = currentConfig.joystick.directions.up ? currentConfig.joystick.directions.up.th_walk : 3000;
  const upRun = currentConfig.joystick.directions.up ? currentConfig.joystick.directions.up.th_run : 26000;
  if (batchWalkInput) {
    batchWalkInput.value = upWalk;
    batchWalkVal.textContent = upWalk;
  }
  if (batchRunInput) {
    batchRunInput.value = upRun;
    batchRunVal.textContent = upRun;
  }

  // プロファイル表示の同期
  if (profileSelect) {
    profileSelect.value = currentConfig.active_profile;
  }
  if (profileNameInput && currentConfig.profiles && currentConfig.profiles[currentConfig.active_profile]) {
    profileNameInput.value = currentConfig.profiles[currentConfig.active_profile].name;
  }

  drawRadar();
}

// プロファイル操作リスナー
if (sidebarProfileSelect) {
  sidebarProfileSelect.addEventListener("change", (e) => {
    const newIdx = parseInt(e.target.value, 10);
    switchProfile(newIdx, true);
  });
}

// ドロップダウンメニュー外クリックで閉じる
document.addEventListener("click", (e) => {
  if (!e.target.closest(".profile-row-menu-container")) {
    document.querySelectorAll(".profile-row-dropdown.open").forEach(d => d.classList.remove("open"));
  }
});

if (profileSelect) {
  profileSelect.addEventListener("change", (e) => {
    const newIdx = parseInt(e.target.value, 10);
    switchProfile(newIdx, true);
  });
}

if (profileNameInput) {
  profileNameInput.addEventListener("change", (e) => {
    const name = e.target.value.trim() || `プロファイル ${currentConfig.active_profile + 1}`;
    currentConfig.profiles[currentConfig.active_profile].name = name;
    renderProfileSelect();
    saveToLocalStorage(currentConfig, `名前変更: ${name}`);
    if (serialPort && writer) {
      setDeviceOpLoading("save", true, "", "名前変更をデバイスへ反映中...");
      sendJson({ cmd: "set_config", config: getDeviceSyncPayload(currentConfig) });
    }
    log(`プロファイル名を「${name}」に変更しました`, "info");
  });
}

if (btnAddProfile) {
  btnAddProfile.addEventListener("click", () => {
    syncCurrentToProfile();
    const newNum = currentConfig.profiles.length + 1;
    const newProfile = {
      id: generateProfileId(),
      name: `プロファイル ${newNum}`,
      color: DEFAULT_PROFILE_HEX_COLORS[(newNum - 1) % DEFAULT_PROFILE_HEX_COLORS.length],
      keymap: JSON.parse(JSON.stringify(DEFAULT_CONFIG.keymap)),
      joystick: JSON.parse(JSON.stringify(DEFAULT_CONFIG.joystick))
    };
    newProfile.joystick.rotation = 90;
    newProfile.joystick.invert_x = false;
    newProfile.joystick.invert_y = false;
    currentConfig.profiles.push(newProfile);
    switchProfile(currentConfig.profiles.length - 1, true);
    log(`新しいプロファイル「${newProfile.name}」を作成しました`, "success");
  });
}

if (btnDuplicateProfile) {
  btnDuplicateProfile.addEventListener("click", () => {
    syncCurrentToProfile();
    const cur = currentConfig.profiles[currentConfig.active_profile];
    const duplicated = {
      id: generateProfileId(),
      name: `${cur.name} (コピー)`,
      color: cur.color || DEFAULT_PROFILE_HEX_COLORS[currentConfig.profiles.length % DEFAULT_PROFILE_HEX_COLORS.length],
      keymap: JSON.parse(JSON.stringify(cur.keymap)),
      joystick: JSON.parse(JSON.stringify(cur.joystick))
    };
    currentConfig.profiles.push(duplicated);
    switchProfile(currentConfig.profiles.length - 1, true);
    log(`プロファイルを複製しました: ${duplicated.name}`, "success");
  });
}

if (btnDeleteProfile) {
  btnDeleteProfile.addEventListener("click", () => {
    if (currentConfig.profiles.length <= 1) {
      alert("プロファイルは最低1つ必要です。");
      return;
    }
    const curName = currentConfig.profiles[currentConfig.active_profile].name;
    if (confirm(`プロファイル「${curName}」を削除しますか？`)) {
      currentConfig.profiles.splice(currentConfig.active_profile, 1);
      const newIdx = Math.max(0, currentConfig.active_profile - 1);
      switchProfile(newIdx, true);
      log(`プロファイル「${curName}」を削除しました`, "warn");
    }
  });
}

// テスト入力機能
const activePhysicalKeys = new Set();
function updateLiveKeysDisplay() {
  if (!liveKeysContainer) return;
  if (activePhysicalKeys.size === 0) {
    liveKeysContainer.innerHTML = '<span class="key-pill-placeholder">なし</span>';
    return;
  }
  liveKeysContainer.innerHTML = "";
  activePhysicalKeys.forEach(k => {
    const pill = document.createElement("span");
    pill.className = "key-pill";
    pill.textContent = k;
    liveKeysContainer.appendChild(pill);
  });
}

window.addEventListener("keydown", (e) => {
  let keyName = e.key;
  if (keyName === " ") keyName = "Space";
  if (keyName.length === 1) keyName = keyName.toUpperCase();
  activePhysicalKeys.add(keyName);
  updateLiveKeysDisplay();
});

window.addEventListener("keyup", (e) => {
  let keyName = e.key;
  if (keyName === " ") keyName = "Space";
  if (keyName.length === 1) keyName = keyName.toUpperCase();
  activePhysicalKeys.delete(keyName);
  updateLiveKeysDisplay();
});

window.addEventListener("blur", () => {
  activePhysicalKeys.clear();
  updateLiveKeysDisplay();
});

if (testInputBox) {
  testInputBox.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      const start = testInputBox.selectionStart;
      const end = testInputBox.selectionEnd;
      const val = testInputBox.value;
      testInputBox.value = val.substring(0, start) + "\t" + val.substring(end);
      testInputBox.selectionStart = testInputBox.selectionEnd = start + 1;
      testInputBox.focus();
    }
  });
}

if (btnClearTestInput) {
  btnClearTestInput.addEventListener("click", () => {
    if (testInputBox) {
      testInputBox.value = "";
      testInputBox.focus();
    }
  });
}

// パラメータリスナー
if (stickModeSelect) {
  stickModeSelect.addEventListener("change", (e) => {
    currentConfig.joystick.mode = e.target.value;
    updateModeVisibility();
    syncCurrentToProfile();
    drawRadar();
    log(`スティック動作モードを「${e.target.value}」に変更しました`, "info");
  });
}

if (gamepadTargetSelect) {
  gamepadTargetSelect.addEventListener("change", (e) => {
    currentConfig.joystick.gamepad_target = e.target.value;
    updateModeVisibility();
    syncCurrentToProfile();
    log(`ゲームパッド割り当て軸を「${e.target.value}」に変更しました`, "info");
  });
}

if (enableRunCheckbox) {
  enableRunCheckbox.addEventListener("change", (e) => {
    currentConfig.joystick.enable_run = e.target.checked;
    updateModeVisibility();
    syncCurrentToProfile();
    drawRadar();
    log(`スティックRun(走り/2段階目)入力を「${e.target.checked ? "有効" : "無効"}」に変更しました`, "info");
  });
}

if (dpadWalkBtnInput) {
  dpadWalkBtnInput.addEventListener("change", (e) => {
    currentConfig.joystick.dpad_walk_btn = e.target.value.trim();
    syncCurrentToProfile();
    log(`DPAD Walk追加ボタンを「${e.target.value.trim() || "(なし)"}」に変更しました`, "info");
  });
}

if (dpadRunBtnInput) {
  dpadRunBtnInput.addEventListener("change", (e) => {
    currentConfig.joystick.dpad_run_btn = e.target.value.trim();
    syncCurrentToProfile();
    log(`DPAD Run追加ボタンを「${e.target.value.trim() || "(なし)"}」に変更しました`, "info");
  });
}

if (directionModeSelect) {
  directionModeSelect.addEventListener("change", (e) => {
    currentConfig.joystick.direction_mode = e.target.value;
    syncCurrentToProfile();
    drawRadar();
    updateModeDisplay();
    const modeName = directionModeSelect.options[directionModeSelect.selectedIndex].text;
    log(`方向入力制限を「${modeName}」に変更しました`, "info");
  });
}

if (mouseSpeedInput) {
  mouseSpeedInput.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    currentConfig.joystick.mouse_speed = val;
    if (mouseSpeedVal) mouseSpeedVal.textContent = val;
    syncCurrentToProfile();
    drawMouseCurve();
  });
}

if (mouseWalkRatioInput) {
  mouseWalkRatioInput.addEventListener("input", (e) => {
    const pct = parseInt(e.target.value, 10);
    const ratio = Math.round((pct / 100) * 100) / 100;
    currentConfig.joystick.mouse_walk_ratio = ratio;
    if (mouseWalkRatioVal) mouseWalkRatioVal.textContent = `${pct}%`;
    syncCurrentToProfile();
    drawMouseCurve();
  });
}

if (mouseCurveSlider) {
  mouseCurveSlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    currentConfig.joystick.mouse_curve = val;
    if (mouseCurveVal) mouseCurveVal.textContent = val.toFixed(2);
    updateCurvePresetButtons(val);
    syncCurrentToProfile();
    drawMouseCurve();
  });
}

if (curvePresetButtons) {
  curvePresetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const val = parseFloat(btn.getAttribute("data-curve"));
      if (!isNaN(val)) {
        currentConfig.joystick.mouse_curve = val;
        if (mouseCurveSlider) mouseCurveSlider.value = val.toFixed(2);
        if (mouseCurveVal) mouseCurveVal.textContent = val.toFixed(2);
        updateCurvePresetButtons(val);
        syncCurrentToProfile();
        drawMouseCurve();
        log(`マウス加速カーブを「${btn.textContent.trim()}」に変更しました`, "info");
      }
    });
  });
}

if (mouseCurveTypeSelect) {
  mouseCurveTypeSelect.addEventListener("change", (e) => {
    currentConfig.joystick.mouse_curve_type = e.target.value;
    updateModeVisibility();
    syncCurrentToProfile();
    drawMouseCurve();
    log(`カーブ計算方式を「${mouseCurveTypeSelect.options[mouseCurveTypeSelect.selectedIndex].text}」に変更しました`, "info");
  });
}

customPointSliders.forEach((sl, idx) => {
  if (sl) {
    sl.addEventListener("input", (e) => {
      const valPct = parseInt(e.target.value, 10);
      if (customPointVals[idx]) customPointVals[idx].textContent = `${valPct}%`;
      if (!Array.isArray(currentConfig.joystick.mouse_curve_points) || currentConfig.joystick.mouse_curve_points.length !== 4) {
        currentConfig.joystick.mouse_curve_points = [0.15, 0.40, 0.75, 1.0];
      }
      currentConfig.joystick.mouse_curve_points[idx] = Math.round((valPct / 100) * 100) / 100;
      syncCurrentToProfile();
      drawMouseCurve();
    });
  }
});

if (mouseMinSpeedInput) {
  mouseMinSpeedInput.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    currentConfig.joystick.mouse_min_speed = val;
    if (mouseMinSpeedVal) {
      mouseMinSpeedVal.textContent = val > 0 ? `${val.toFixed(1)} px` : "0.0 px (無効)";
    }
    syncCurrentToProfile();
    drawMouseCurve();
  });
}

if (mouseDynamicAccelInput) {
  mouseDynamicAccelInput.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    currentConfig.joystick.mouse_dynamic_accel = val;
    if (mouseDynamicAccelVal) {
      mouseDynamicAccelVal.textContent = val > 0 ? val.toFixed(1) : "0.0 (OFF)";
    }
    syncCurrentToProfile();
  });
}

if (mouseAspectRatioInput) {
  mouseAspectRatioInput.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    currentConfig.joystick.mouse_aspect_ratio = val;
    if (mouseAspectRatioVal) {
      mouseAspectRatioVal.textContent = (val === 1.0) ? "1.00 (等倍)" : `${val.toFixed(2)}x`;
    }
    syncCurrentToProfile();
  });
}

if (mouseRunThresholdInput) {
  mouseRunThresholdInput.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    const dz = (currentConfig.joystick && currentConfig.joystick.deadzone !== undefined) ? currentConfig.joystick.deadzone : 2500;
    const pct = Math.round(Math.max(0, Math.min(100, ((val - dz) / (32767 - dz)) * 100)));
    if (mouseRunThresholdVal) mouseRunThresholdVal.textContent = `${val} (約${pct}%)`;
    if (batchRunInput) batchRunInput.value = val;
    if (batchRunVal) batchRunVal.textContent = val;
    ["up", "down", "left", "right"].forEach(d => {
      currentConfig.joystick.directions[d].th_run = val;
      const elTr = document.getElementById(`th_run_${d}`);
      if (elTr) elTr.value = val;
    });
    syncCurrentToProfile();
    drawRadar();
    drawMouseCurve();
  });
}

batchWalkInput.addEventListener("input", (e) => {
  const val = parseInt(e.target.value, 10);
  batchWalkVal.textContent = val;
  ["up", "down", "left", "right"].forEach(d => {
    currentConfig.joystick.directions[d].th_walk = val;
    const el = document.getElementById(`th_walk_${d}`);
    if (el) el.value = val;
  });
  syncCurrentToProfile();
  drawRadar();
});

batchRunInput.addEventListener("input", (e) => {
  const val = parseInt(e.target.value, 10);
  batchRunVal.textContent = val;
  if (mouseRunThresholdInput) mouseRunThresholdInput.value = val;
  if (mouseRunThresholdVal) {
    const dz = (currentConfig.joystick && currentConfig.joystick.deadzone !== undefined) ? currentConfig.joystick.deadzone : 2500;
    const pct = Math.round(Math.max(0, Math.min(100, ((val - dz) / (32767 - dz)) * 100)));
    mouseRunThresholdVal.textContent = `${val} (約${pct}%)`;
  }
  ["up", "down", "left", "right"].forEach(d => {
    currentConfig.joystick.directions[d].th_run = val;
    const el = document.getElementById(`th_run_${d}`);
    if (el) el.value = val;
  });
  syncCurrentToProfile();
  drawRadar();
  drawMouseCurve();
});

deadzoneInput.addEventListener("input", (e) => {
  deadzoneVal.textContent = e.target.value;
  currentConfig.joystick.deadzone = parseInt(e.target.value, 10);
  syncCurrentToProfile();
  drawRadar();
  drawMouseCurve();
});

hysteresisInput.addEventListener("input", (e) => {
  hysteresisVal.textContent = e.target.value;
  currentConfig.joystick.hysteresis = parseInt(e.target.value, 10);
  syncCurrentToProfile();
  drawRadar();
});

invertX.addEventListener("change", (e) => {
  currentConfig.joystick.invert_x = e.target.checked;
  syncCurrentToProfile();
});

invertY.addEventListener("change", (e) => {
  currentConfig.joystick.invert_y = e.target.checked;
  syncCurrentToProfile();
});

rotationSelect.addEventListener("change", (e) => {
  currentConfig.joystick.rotation = parseInt(e.target.value, 10);
  syncCurrentToProfile();
});

// レーダー描画
function drawRadar() {
  const w = stickCanvas.width;
  const h = stickCanvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.44;

  ctx.clearRect(0, 0, w, h);

  // 外枠円
  ctx.strokeStyle = "#2c333e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 十字線
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
  ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
  ctx.stroke();

  // デッドゾーン (32768をスケール基準: 1.0 = radius)
  const dzRatio = Math.min(1.0, currentConfig.joystick.deadzone / 32768);
  ctx.fillStyle = "rgba(148, 163, 184, 0.12)";
  ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius * dzRatio, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 各方向のWalk / Run 領域の目安円 (キーボードモード または マウスモードのRun有効時)
  const mode = (currentConfig.joystick && currentConfig.joystick.mode) ? currentConfig.joystick.mode : "keyboard";
  const isMouseWithRun = (mode === "mouse" && currentConfig.joystick.enable_run !== false);
  if (mode === "keyboard" || isMouseWithRun) {
    if (mode === "keyboard") {
      const avgWalk = (currentConfig.joystick.directions.up.th_walk + currentConfig.joystick.directions.right.th_walk) / 2;
      const walkRatio = Math.min(1.0, avgWalk / 32768);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, radius * walkRatio, 0, Math.PI * 2);
      ctx.stroke();
    }

    const avgRun = (currentConfig.joystick.directions.up.th_run + currentConfig.joystick.directions.right.th_run) / 2;
    const runRatio = Math.min(1.0, avgRun / 32768);
    ctx.strokeStyle = isMouseWithRun ? "rgba(245, 158, 11, 0.5)" : "rgba(16, 185, 129, 0.35)";
    ctx.setLineDash(isMouseWithRun ? [3, 3] : []);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * runRatio, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 4方向制限モード時のガイド線・不感帯可視化
  const dirMode = (currentConfig.joystick && currentConfig.joystick.direction_mode) ? currentConfig.joystick.direction_mode : "8way";
  if (dirMode === "4way_snap" || dirMode === "4way_strict") {
    // 45° 対角分割線 (破線)
    ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    const diagDist = radius * 0.98;
    const diagOffset = diagDist * Math.SQRT1_2;

    ctx.beginPath();
    // 45° - 225° 線 (右上 - 左下)
    ctx.moveTo(cx - diagOffset, cy + diagOffset);
    ctx.lineTo(cx + diagOffset, cy - diagOffset);
    // 135° - 315° 線 (左上 - 右下)
    ctx.moveTo(cx - diagOffset, cy - diagOffset);
    ctx.lineTo(cx + diagOffset, cy + diagOffset);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4way_strict (斜め不感帯): 斜め45°付近を薄いハイライトで可視化
    if (dirMode === "4way_strict") {
      ctx.fillStyle = "rgba(239, 68, 68, 0.1)";
      const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
      const deadzoneAngle = 0.18; // 約 ±10.3°
      angles.forEach(ang => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, ang - deadzoneAngle, ang + deadzoneAngle);
        ctx.closePath();
        ctx.fill();
      });
    }

    // 4方向ラベル
    ctx.fillStyle = "rgba(245, 158, 11, 0.75)";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("▲ UP", cx, cy - radius * 0.85);
    ctx.fillText("▼ DOWN", cx, cy + radius * 0.85);
    ctx.fillText("◀ LEFT", cx - radius * 0.80, cy);
    ctx.fillText("RIGHT ▶", cx + radius * 0.80, cy);
  }

  // スティック現在位置プロット
  // deltaX, deltaY (-32768 〜 +32768)
  const px = cx + (currentTelemetry.dx / 32768) * radius;
  const py = cy - (currentTelemetry.dy / 32768) * radius; // 上がマイナスY(Canvas)

  // 中心からの線
  ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, py);
  ctx.stroke();

  // ドット
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ==========================================
// マウス加速カーブ & 速度計算 / プレビュー描画
// ==========================================
function getMouseCurvePower(val) {
  if (typeof val === "number" && !isNaN(val)) {
    return Math.max(0.5, Math.min(3.0, val));
  }
  if (typeof val === "string") {
    if (val === "linear") return 1.0;
    if (val === "aggressive") return 2.0;
    if (val === "smooth") return 1.5;
    const num = parseFloat(val);
    if (!isNaN(num)) return Math.max(0.5, Math.min(3.0, num));
  }
  return 1.5;
}

function getMouseWalkRatio(val) {
  if (typeof val === "number" && !isNaN(val)) {
    return Math.max(0.10, Math.min(0.90, val));
  }
  if (typeof val === "string") {
    const num = parseFloat(val);
    if (!isNaN(num)) return Math.max(0.10, Math.min(0.90, num));
  }
  return 0.55;
}

function evalMouseCurve(x, curveType = "power", curvePower = 1.5, pts = [0.15, 0.40, 0.75, 1.0]) {
  const normX = Math.max(0.0, Math.min(1.0, x));
  if (normX <= 0.0) return 0.0;
  if (normX >= 1.0) return 1.0;

  if (curveType === "sigmoid") {
    // 3次 Hermite SmoothStep: 3x^2 - 2x^3 (初動滑らか・中域リニア・終盤マイルド)
    return normX * normX * (3.0 - 2.0 * normX);
  } else if (curveType === "custom") {
    const p = (Array.isArray(pts) && pts.length === 4) ? pts : [0.15, 0.40, 0.75, 1.0];
    if (normX <= 0.25) {
      return (normX / 0.25) * p[0];
    } else if (normX <= 0.50) {
      const t = (normX - 0.25) / 0.25;
      return p[0] + t * (p[1] - p[0]);
    } else if (normX <= 0.75) {
      const t = (normX - 0.50) / 0.25;
      return p[1] + t * (p[2] - p[1]);
    } else {
      const t = (normX - 0.75) / 0.25;
      return p[2] + t * (p[3] - p[2]);
    }
  } else {
    // "power"
    return Math.pow(normX, curvePower);
  }
}

function calculateMouseSpeed(r, mouseSpeed, walkRatioCap, curvePower, enableRun, runThreshold, curveType = "power", curvePoints = [0.15, 0.40, 0.75, 1.0], minSpeed = 0.0) {
  if (r <= 0) return 0;
  const walkMaxSpeed = mouseSpeed * walkRatioCap;
  let spd = 0;
  if (enableRun) {
    if (r <= runThreshold) {
      const subRatio = r / runThreshold;
      spd = evalMouseCurve(subRatio, curveType, curvePower, curvePoints) * walkMaxSpeed;
    } else {
      const boostProgress = (r - runThreshold) / (1.0 - runThreshold);
      const boostSpan = mouseSpeed - walkMaxSpeed;
      spd = walkMaxSpeed + Math.pow(boostProgress, 1.3) * boostSpan;
    }
  } else {
    const subRatio = Math.min(1.0, r / runThreshold);
    spd = evalMouseCurve(subRatio, curveType, curvePower, curvePoints) * walkMaxSpeed;
  }

  if (minSpeed > 0) {
    const minSpd = Math.min(mouseSpeed, minSpeed);
    spd = minSpd + spd * (1.0 - minSpd / mouseSpeed);
  }
  return spd;
}

function updateCurvePresetButtons(curveVal) {
  if (!curvePresetButtons) return;
  const numVal = Math.round(curveVal * 100) / 100;
  curvePresetButtons.forEach(btn => {
    const target = parseFloat(btn.getAttribute("data-curve"));
    if (Math.abs(target - numVal) < 0.03) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function drawMouseCurve(currentRatio = undefined) {
  if (!mouseCurveCanvas || !mouseCurveCtx) return;

  const w = mouseCurveCanvas.width;
  const h = mouseCurveCanvas.height;
  const padL = 36;
  const padR = 14;
  const padT = 14;
  const padB = 22;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const mouseSpeed = (currentConfig.joystick && currentConfig.joystick.mouse_speed) ? currentConfig.joystick.mouse_speed : 12;
  const walkRatioCap = getMouseWalkRatio(currentConfig.joystick && currentConfig.joystick.mouse_walk_ratio);
  const curvePower = getMouseCurvePower(currentConfig.joystick && currentConfig.joystick.mouse_curve);
  const curveType = (currentConfig.joystick && currentConfig.joystick.mouse_curve_type) ? currentConfig.joystick.mouse_curve_type : "power";
  const curvePoints = (currentConfig.joystick && Array.isArray(currentConfig.joystick.mouse_curve_points) && currentConfig.joystick.mouse_curve_points.length === 4)
    ? currentConfig.joystick.mouse_curve_points
    : [0.15, 0.40, 0.75, 1.0];
  const minSpeed = (currentConfig.joystick && typeof currentConfig.joystick.mouse_min_speed === "number") ? currentConfig.joystick.mouse_min_speed : 0.0;
  const enableRun = (currentConfig.joystick && currentConfig.joystick.enable_run !== false);
  const deadzone = (currentConfig.joystick && currentConfig.joystick.deadzone !== undefined) ? currentConfig.joystick.deadzone : 2500;
  const maxRange = Math.max(1, 32767 - deadzone);
  const upRun = (currentConfig.joystick && currentConfig.joystick.directions && currentConfig.joystick.directions.up)
    ? currentConfig.joystick.directions.up.th_run
    : 26000;
  const runThreshold = Math.max(0.1, Math.min(0.95, (upRun - deadzone) / maxRange));
  const walkMaxSpeed = mouseSpeed * walkRatioCap;

  // 凡例パーセンテージ更新
  if (curveLegendRunTh) {
    curveLegendRunTh.textContent = `${Math.round(runThreshold * 100)}%`;
  }
  if (curveLegendWalkCap) {
    curveLegendWalkCap.textContent = `${Math.round(walkRatioCap * 100)}%`;
  }

  const toX = (r) => padL + r * plotW;
  const toY = (spd) => padT + plotH - (spd / Math.max(1, mouseSpeed)) * plotH;

  // 背景クリア
  mouseCurveCtx.fillStyle = "#080b0e";
  mouseCurveCtx.fillRect(0, 0, w, h);

  // グリッド線 & 軸目盛り
  mouseCurveCtx.lineWidth = 1;
  mouseCurveCtx.strokeStyle = "#1e293b";
  mouseCurveCtx.font = "9px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  mouseCurveCtx.fillStyle = "#64748b";
  mouseCurveCtx.textAlign = "right";
  mouseCurveCtx.textBaseline = "middle";

  // Y軸グリッド (0, 50%, 100%)
  const ySteps = [0, 0.5, 1.0];
  ySteps.forEach(stepRatio => {
    const spdVal = mouseSpeed * stepRatio;
    const y = toY(spdVal);
    mouseCurveCtx.beginPath();
    mouseCurveCtx.moveTo(padL, y);
    mouseCurveCtx.lineTo(padL + plotW, y);
    mouseCurveCtx.stroke();
    mouseCurveCtx.fillText(spdVal.toFixed(0), padL - 5, y);
  });

  // X軸グリッド (0%, 50%, 100%)
  mouseCurveCtx.textAlign = "center";
  mouseCurveCtx.textBaseline = "top";
  [0, 0.5, 1.0].forEach(r => {
    const x = toX(r);
    mouseCurveCtx.beginPath();
    mouseCurveCtx.moveTo(x, padT);
    mouseCurveCtx.lineTo(x, padT + plotH);
    mouseCurveCtx.stroke();
    mouseCurveCtx.fillText(`${Math.round(r * 100)}%`, x, padT + plotH + 4);
  });

  // Walk上限ライン (水平破線 - エメラルドグリーン)
  const walkY = toY(walkMaxSpeed);
  mouseCurveCtx.save();
  mouseCurveCtx.strokeStyle = "rgba(16, 185, 129, 0.75)";
  mouseCurveCtx.lineWidth = 1.2;
  mouseCurveCtx.setLineDash([3, 3]);
  mouseCurveCtx.beginPath();
  mouseCurveCtx.moveTo(padL, walkY);
  mouseCurveCtx.lineTo(padL + plotW, walkY);
  mouseCurveCtx.stroke();
  mouseCurveCtx.restore();

  // Run閾値ライン (垂直破線 - アンバー、Run有効時のみ)
  if (enableRun) {
    const runX = toX(runThreshold);
    mouseCurveCtx.save();
    mouseCurveCtx.strokeStyle = "rgba(245, 158, 11, 0.75)";
    mouseCurveCtx.lineWidth = 1.2;
    mouseCurveCtx.setLineDash([3, 3]);
    mouseCurveCtx.beginPath();
    mouseCurveCtx.moveTo(runX, padT);
    mouseCurveCtx.lineTo(runX, padT + plotH);
    mouseCurveCtx.stroke();
    mouseCurveCtx.restore();
  }

  // カーブ下部グラデーション塗りつぶし
  const grad = mouseCurveCtx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, "rgba(56, 189, 248, 0.35)");
  grad.addColorStop(1, "rgba(56, 189, 248, 0.02)");

  const steps = 60;
  mouseCurveCtx.beginPath();
  mouseCurveCtx.moveTo(toX(0), toY(0));
  for (let i = 0; i <= steps; i++) {
    const r = i / steps;
    const spd = calculateMouseSpeed(r, mouseSpeed, walkRatioCap, curvePower, enableRun, runThreshold, curveType, curvePoints, minSpeed);
    mouseCurveCtx.lineTo(toX(r), toY(spd));
  }
  mouseCurveCtx.lineTo(toX(1.0), toY(0));
  mouseCurveCtx.closePath();
  mouseCurveCtx.fillStyle = grad;
  mouseCurveCtx.fill();

  // 速度カーブライン描画
  mouseCurveCtx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const r = i / steps;
    const spd = calculateMouseSpeed(r, mouseSpeed, walkRatioCap, curvePower, enableRun, runThreshold, curveType, curvePoints, minSpeed);
    if (i === 0) {
      mouseCurveCtx.moveTo(toX(r), toY(spd));
    } else {
      mouseCurveCtx.lineTo(toX(r), toY(spd));
    }
  }
  mouseCurveCtx.strokeStyle = "#38bdf8";
  mouseCurveCtx.lineWidth = 2.2;
  mouseCurveCtx.stroke();

  // スティック現在倒し量・速度の計算
  let curR = 0;
  if (typeof currentRatio === "number") {
    curR = Math.max(0, Math.min(1.0, currentRatio));
  } else if (currentTelemetry && currentTelemetry.dx !== undefined && currentTelemetry.dy !== undefined) {
    const dist = Math.sqrt(currentTelemetry.dx * currentTelemetry.dx + currentTelemetry.dy * currentTelemetry.dy);
    curR = Math.max(0, Math.min(1.0, (dist - deadzone) / maxRange));
  }

  const curSpeed = calculateMouseSpeed(curR, mouseSpeed, walkRatioCap, curvePower, enableRun, runThreshold, curveType, curvePoints, minSpeed);
  if (curveLiveSpeedLabel) {
    curveLiveSpeedLabel.textContent = `入力: ${Math.round(curR * 100)}% / 速度: ${curSpeed.toFixed(1)}`;
  }

  // 現在位置のインジケータ (赤ドット & 垂直ガイド線)
  if (curR > 0) {
    const curX = toX(curR);
    const curY = toY(curSpeed);

    mouseCurveCtx.save();
    mouseCurveCtx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    mouseCurveCtx.lineWidth = 1;
    mouseCurveCtx.setLineDash([2, 2]);
    mouseCurveCtx.beginPath();
    mouseCurveCtx.moveTo(curX, padT);
    mouseCurveCtx.lineTo(curX, padT + plotH);
    mouseCurveCtx.stroke();
    mouseCurveCtx.restore();

    mouseCurveCtx.beginPath();
    mouseCurveCtx.arc(curX, curY, 4.5, 0, Math.PI * 2);
    mouseCurveCtx.fillStyle = "#ef4444";
    mouseCurveCtx.fill();
    mouseCurveCtx.strokeStyle = "#ffffff";
    mouseCurveCtx.lineWidth = 1.5;
    mouseCurveCtx.stroke();
  }
}

// テレメトリ更新UI
function updateTelemetryUI(data) {
  currentTelemetry.raw = data.raw || [32768, 32768];
  currentTelemetry.dx = data.dx || 0;
  currentTelemetry.dy = data.dy || 0;
  currentTelemetry.states = data.states || { up: 0, down: 0, left: 0, right: 0 };
  currentTelemetry.btns = data.btns || [];
  currentTelemetry.mode = data.mode || "keyboard";
  currentTelemetry.direction_mode = data.direction_mode || (currentConfig.joystick && currentConfig.joystick.direction_mode) || "8way";
  currentTelemetry.current_4way_dir = data.current_4way_dir || null;
  currentTelemetry.gamepad = data.gamepad || [0, 0, 0, 0, 0];
  currentTelemetry.gamepad_stage = data.gamepad_stage || "neutral";
  currentTelemetry.gamepad_target = data.gamepad_target || "left_stick";
  currentTelemetry.mouse = data.mouse || [0, 0];

  updateModeDisplay();

  rawXSpan.textContent = currentTelemetry.raw[0];
  rawYSpan.textContent = currentTelemetry.raw[1];
  deltaXSpan.textContent = currentTelemetry.dx;
  deltaYSpan.textContent = currentTelemetry.dy;

  // ステートバッジ更新
  const updateStatePill = (el, name, st) => {
    let text = `${name}: NEUTRAL`;
    el.className = "state-pill";
    if (st === 1) {
      text = `${name}: WALK`;
      el.classList.add("active-walk");
    } else if (st === 2) {
      text = `${name}: RUN`;
      el.classList.add("active-run");
    }
    el.textContent = text;
  };

  updateStatePill(stateUp, "UP", currentTelemetry.states.up);
  updateStatePill(stateDown, "DOWN", currentTelemetry.states.down);
  updateStatePill(stateLeft, "LEFT", currentTelemetry.states.left);
  updateStatePill(stateRight, "RIGHT", currentTelemetry.states.right);

  // ボタンの物理押下表示 (13ボタンカード & テスト入力エリアのハードウェアインジケータ)
  const pressedPins = currentTelemetry.btns;
  for (let i = 0; i < 13; i++) {
    const pin = HARDWARE_PINS.buttons[i];
    const card = document.getElementById(`btnCard_${i}`);
    if (card) {
      card.classList.toggle("physically-pressed", pressedPins.includes(pin));
    }
    const hwPill = document.getElementById(`hw_btn_${pin}`);
    if (hwPill) {
      hwPill.classList.toggle("pressed", pressedPins.includes(pin));
    }
  }

  drawRadar();
  const joyMode = (currentConfig.joystick && currentConfig.joystick.mode) ? currentConfig.joystick.mode : "keyboard";
  if (joyMode === "mouse") {
    const dz = (currentConfig.joystick && currentConfig.joystick.deadzone !== undefined) ? currentConfig.joystick.deadzone : 2500;
    const maxRange = Math.max(1, 32767 - dz);
    const dist = Math.sqrt(currentTelemetry.dx * currentTelemetry.dx + currentTelemetry.dy * currentTelemetry.dy);
    const ratio = Math.max(0, Math.min(1.0, (dist - dz) / maxRange));
    drawMouseCurve(ratio);
  }
}

// ==========================================
// デバイス通信中の進行状態 (In-Progress / Loading) 管理
// ==========================================
let activeOpTimer = null;
let currentActiveOp = null;

function setDeviceOpLoading(opType, isLoading, successText = "", customText = "") {
  const progressEl = document.getElementById("actionProgress");
  const progressText = document.getElementById("actionProgressText");

  if (activeOpTimer) {
    clearTimeout(activeOpTimer);
    activeOpTimer = null;
  }

  if (isLoading) {
    currentActiveOp = opType;
    // 多重送信・通信衝突を防止するために操作ボタンを一時無効化
    if (btnLoadConfig) btnLoadConfig.disabled = true;
    if (btnSaveConfig) btnSaveConfig.disabled = true;
    if (btnResetDefault) btnResetDefault.disabled = true;
    if (btnCalibrate) btnCalibrate.disabled = true;
    quickLoadBtns.forEach(btn => btn.disabled = true);
    quickSaveBtns.forEach(btn => btn.disabled = true);

    if (opType === "save") {
      if (btnSaveConfig) {
        btnSaveConfig.classList.add("btn-loading");
        btnSaveConfig.innerHTML = '<span class="spinner"></span>デバイスへ保存中...';
      }
      quickSaveBtns.forEach(btn => {
        btn.classList.add("btn-loading");
        btn.innerHTML = '<span class="spinner"></span>保存中...';
      });
    } else if (opType === "load") {
      if (btnLoadConfig) {
        btnLoadConfig.classList.add("btn-loading");
        btnLoadConfig.innerHTML = '<span class="spinner"></span>読込中...';
      }
      quickLoadBtns.forEach(btn => {
        btn.classList.add("btn-loading");
        btn.innerHTML = '<span class="spinner"></span>読込中...';
      });
    } else if (opType === "reset" && btnResetDefault) {
      btnResetDefault.classList.add("btn-loading");
      btnResetDefault.innerHTML = '<span class="spinner"></span>初期化中...';
    } else if (opType === "calibrate" && btnCalibrate) {
      btnCalibrate.classList.add("btn-loading");
      btnCalibrate.innerHTML = '<span class="spinner"></span>補正中...';
    }

    if (progressEl) {
      progressEl.style.display = "inline-flex";
      progressEl.className = "action-progress active";
      progressText.textContent = customText || (opType === "save" ? "デバイスへ設定を保存中..." : "デバイスから設定を取得中...");
    }

    // タイムアウト保護 (saveはFlash書込を考慮して35秒、loadはリトライ機構があるため7秒)
    const timeoutMs = opType === "load" ? 7000 : 35000;
    activeOpTimer = setTimeout(() => {
      stopLoadRetry();
      setDeviceOpLoading(opType, false);
      log(`「${opType}」処理がタイムアウトしました。`, "warn");
      // 接続時の自動読込がタイムアウトした場合でも、モニタリング待機中ならモニタリングを開始
      if (autoStartMonitorPending) {
        autoStartMonitorPending = false;
        startMonitoring();
      }
    }, timeoutMs);

  } else {
    currentActiveOp = null;

    if (btnLoadConfig) btnLoadConfig.classList.remove("btn-loading");
    if (btnSaveConfig) btnSaveConfig.classList.remove("btn-loading");
    if (btnResetDefault) btnResetDefault.classList.remove("btn-loading");
    if (btnCalibrate) btnCalibrate.classList.remove("btn-loading");
    quickLoadBtns.forEach(btn => {
      btn.classList.remove("btn-loading");
      btn.textContent = "📥 デバイスから読込";
    });
    quickSaveBtns.forEach(btn => {
      btn.classList.remove("btn-loading");
      btn.textContent = "💾 デバイスへ保存・反映";
    });

    if (successText) {
      let targetBtn = null;
      if (opType === "save") targetBtn = btnSaveConfig;
      if (opType === "load") targetBtn = btnLoadConfig;
      if (opType === "reset") targetBtn = btnResetDefault;
      if (opType === "calibrate") targetBtn = btnCalibrate;

      if (targetBtn) {
        targetBtn.classList.add("btn-flash-success");
        targetBtn.innerHTML = `✓ ${successText}`;
      }
      if (progressEl) {
        progressEl.className = "action-progress success";
        progressText.textContent = successText;
      }

      setTimeout(() => {
        if (targetBtn) {
          targetBtn.classList.remove("btn-flash-success");
          if (opType === "save") targetBtn.textContent = "デバイスへ保存・反映 (Hot Reload)";
          if (opType === "load") targetBtn.textContent = "デバイスから読込";
          if (opType === "reset") targetBtn.textContent = "デフォルトに戻す";
          if (opType === "calibrate") targetBtn.textContent = "ゼロ点キャリブレーション実行";
        }
        if (progressEl) progressEl.style.display = "none";
        restoreDeviceButtons();
      }, 1600);
    } else {
      if (btnSaveConfig) btnSaveConfig.textContent = "デバイスへ保存・反映 (Hot Reload)";
      if (btnLoadConfig) btnLoadConfig.textContent = "デバイスから読込";
      if (btnResetDefault) btnResetDefault.textContent = "デフォルトに戻す";
      if (btnCalibrate) btnCalibrate.textContent = "ゼロ点キャリブレーション実行";
      if (progressEl) progressEl.style.display = "none";
      restoreDeviceButtons();
    }
  }
}

function restoreDeviceButtons() {
  const isConn = !!serialPort;
  if (btnLoadConfig) btnLoadConfig.disabled = !isConn;
  if (btnSaveConfig) btnSaveConfig.disabled = !isConn;
  if (btnCalibrate) btnCalibrate.disabled = !isConn;
  if (btnResetDefault) btnResetDefault.disabled = false;
  quickLoadBtns.forEach(btn => btn.disabled = !isConn);
  quickSaveBtns.forEach(btn => btn.disabled = !isConn);
}

// モニタリング制御ヘルパー
function updateMonitorUI(active) {
  const monitorBtns = document.querySelectorAll(".btn-toggle-monitor, #btnToggleMonitor");
  monitorBtns.forEach(btn => {
    if (active) {
      btn.textContent = "モニタリング停止";
      btn.classList.add("monitoring-active");
      btn.title = "リアルタイムモニタリング中（クリックで停止）";
    } else {
      btn.textContent = "モニタリング開始";
      btn.classList.remove("monitoring-active");
      btn.title = "リアルタイムモニタリングを開始（スティック・ボタン入力状態を受信）";
    }
  });
}

function setMonitorDisabled(disabled) {
  const monitorBtns = document.querySelectorAll(".btn-toggle-monitor, #btnToggleMonitor");
  monitorBtns.forEach(btn => {
    btn.disabled = disabled;
    if (disabled) {
      btn.classList.remove("monitoring-active");
      btn.textContent = "モニタリング開始";
    }
  });
}

function startMonitoring() {
  if (!serialPort || !writer || isMonitoring) return;
  isMonitoring = true;
  updateMonitorUI(true);
  sendJson({ cmd: "monitor", enable: true });
}

function stopMonitoring() {
  if (!serialPort || !writer || !isMonitoring) return;
  isMonitoring = false;
  updateMonitorUI(false);
  sendJson({ cmd: "monitor", enable: false });
}

// 設定読込リトライ制御
let autoStartMonitorPending = false;
let loadRetryTimer = null;
let loadRetryCount = 0;
const MAX_LOAD_RETRIES = 3;

function stopLoadRetry() {
  if (loadRetryTimer) {
    clearTimeout(loadRetryTimer);
    loadRetryTimer = null;
  }
  loadRetryCount = 0;
}

async function requestConfigWithRetry(isStartup = false) {
  stopLoadRetry();
  loadRetryCount = 0;

  const sendAttempt = async () => {
    if (!serialPort || !writer) {
      stopLoadRetry();
      return;
    }
    loadRetryCount++;
    if (loadRetryCount > 1) {
      log(`応答待機中... 設定取得を再試行します (${loadRetryCount}/${MAX_LOAD_RETRIES})`, "info");
    }
    await sendJson({ cmd: "get_config" });

    if (loadRetryCount < MAX_LOAD_RETRIES) {
      loadRetryTimer = setTimeout(() => {
        if (currentActiveOp === "load") {
          sendAttempt();
        } else {
          stopLoadRetry();
        }
      }, 1800);
    }
  };

  setDeviceOpLoading("load", true, "", isStartup ? "接続完了: 設定を自動取得中..." : "デバイスから設定を取得中...");
  await sendAttempt();
}

// Web Serial 接続
async function connectSerial() {
  if (!("serial" in navigator)) {
    alert("このブラウザは Web Serial API をサポートしていません。Google Chrome / Edge 等の最新ブラウザをご利用ください。");
    return;
  }

  // 既存の接続が残っている場合は確実にクリーンアップ
  if (serialPort || reader || writer) {
    try {
      await disconnectSerial({ isSilent: true });
    } catch (_) {}
  }

  try {
    log("接続先デバイスの選択を待機中... (一覧から「Lefty Controller」を含む項目を選択してください)", "info");
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 115200 });

    reader = serialPort.readable.getReader();
    writer = serialPort.writable.getWriter();

    connStatus.textContent = "接続中";
    connStatus.className = "badge badge-connected";
    btnConnect.disabled = true;
    btnDisconnect.disabled = false;
    btnLoadConfig.disabled = false;
    btnSaveConfig.disabled = false;
    btnCalibrate.disabled = false;
    setMonitorDisabled(false);
    if (btnEnterMaintenance) btnEnterMaintenance.style.display = "inline-block";
    if (btnRebootNormal) btnRebootNormal.style.display = "inline-block";

    log("シリアルポートを開きました (115200bps)", "success");

    // バックグラウンド受信ループ
    readLoop();

    // シリアルポート接続直後のCDC通信路の安定化を待機 (250ms)
    await new Promise(r => setTimeout(r, 250));

    // 初回設定読込の完了後にモニタリングを自動開始するフラグ
    autoStartMonitorPending = true;

    // 接続時に設定を自動読込 (自動リトライ保護付き)
    await requestConfigWithRetry(true);

  } catch (err) {
    if (reader) { try { reader.releaseLock(); } catch (_) {} reader = null; }
    if (writer) { try { writer.releaseLock(); } catch (_) {} writer = null; }
    if (serialPort) { try { await serialPort.close(); } catch (_) {} serialPort = null; }

    connStatus.textContent = "未接続";
    connStatus.className = "badge badge-disconnected";
    btnConnect.disabled = false;
    btnDisconnect.disabled = true;

    if (err.name === "NotFoundError") {
      log("シリアルポートの選択がキャンセルされました", "info");
    } else if (err.message && err.message.includes("Failed to open serial port")) {
      log(`接続エラー: ポートを開けませんでした。別のタブ（localhost の WebUI 等）や他のツール（シリアルモニタ等）がポートを開いたままになっていないか確認し、マイコンのUSBケーブルを一度抜き差ししてお試しください。`, "error");
    } else {
      log(`接続エラー: ${err.message}`, "error");
    }
  }
}

async function disconnectSerial({ isSilent = false, reason = "" } = {}) {
  if (isDisconnecting) return;
  isDisconnecting = true;

  try {
    stopLoadRetry();
    autoStartMonitorPending = false;

    if (currentActiveOp) {
      setDeviceOpLoading(currentActiveOp, false);
    }

    if (isMonitoring && writer) {
      try {
        await sendJson({ cmd: "monitor", enable: false });
      } catch (_) {}
    }
    isMonitoring = false;
    updateMonitorUI(false);

    if (reader) {
      try {
        await reader.cancel();
      } catch (_) {}
      try {
        reader.releaseLock();
      } catch (_) {}
      reader = null;
    }

    if (writer) {
      try {
        writer.releaseLock();
      } catch (_) {}
      writer = null;
    }

    if (serialPort) {
      try {
        await serialPort.close();
      } catch (_) {}
      serialPort = null;
    }

    // UI状態を確実に「未接続」に復帰
    connStatus.textContent = "未接続";
    connStatus.className = "badge badge-disconnected";
    if (fwVersionBadge) {
      fwVersionBadge.style.display = "none";
    }
    if (versionAlertBanner) {
      versionAlertBanner.style.display = "none";
    }
    if (safeModeAlertBanner) {
      safeModeAlertBanner.style.display = "none";
    }
    btnConnect.disabled = false;
    btnDisconnect.disabled = true;
    btnLoadConfig.disabled = true;
    btnSaveConfig.disabled = true;
    btnCalibrate.disabled = true;
    setMonitorDisabled(true);
    if (btnEnterMaintenance) btnEnterMaintenance.style.display = "none";
    if (btnRebootNormal) btnRebootNormal.style.display = "none";

    latestNvmStatus = null;
    updateNvmStorageUI();

    if (reason) {
      log(reason, isSilent ? "info" : "warn");
    } else if (!isSilent) {
      log("シリアルポートを切断しました", "info");
    }
  } catch (err) {
    btnConnect.disabled = false;
    btnDisconnect.disabled = true;
    connStatus.textContent = "未接続";
    connStatus.className = "badge badge-disconnected";
    log(`切断クリーンアップ完了 (${err.message})`, "warn");
  } finally {
    isDisconnecting = false;
  }
}

async function sendJson(obj) {
  if (!writer) return;
  try {
    const encoder = new TextEncoder();
    const str = JSON.stringify(obj) + "\n";
    await writer.write(encoder.encode(str));
  } catch (err) {
    log(`送信エラー: ${err.message}`, "error");
    if (currentActiveOp) {
      setDeviceOpLoading(currentActiveOp, false);
    }
  }
}

async function sendCtrlD() {
  if (!writer) {
    showToast("⚠️ シリアル未接続です");
    return;
  }
  try {
    log("🔄 Ctrl-D (ソフトリセット) を送信中...", "info");
    const encoder = new TextEncoder();
    // \x03 (Ctrl-C) でREPLの不完全な入力をキャンセルし、\x04 (Ctrl-D) でソフトリロード
    await writer.write(encoder.encode("\x03\x04"));
    showToast("🔄 Ctrl-D を送信しました。マイコンの再起動を待機中...");
    if (safeModeAlertBanner) safeModeAlertBanner.style.display = "none";
  } catch (err) {
    log(`Ctrl-D 送信エラー: ${err.message}`, "error");
  }
}

async function readLoop() {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split("\n");
        buffer = lines.pop(); // 最後の不完全な行を保持

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) handleReceivedLine(trimmed);
        }
      }
    }
  } catch (err) {
    if (isRebootPending) {
      log("🔄 マイコンの再起動を検知しました（シリアル切断）", "info");
    } else {
      const isDeviceLost = err && (err.name === "NetworkError" || (err.message && err.message.includes("device has been lost")));
      if (isDeviceLost) {
        log("🔌 デバイスの切断を検知しました (The device has been lost)", "warn");
      } else {
        log(`受信ループエラー: ${err.message}`, "error");
      }
    }
  } finally {
    const wasReboot = isRebootPending;
    isRebootPending = false;
    await disconnectSerial({
      isSilent: wasReboot,
      reason: wasReboot
        ? "マイコンの再起動が完了するまでお待ちください（約3〜5秒後に「接続」で再接続できます）"
        : ""
    });
  }
}

function handleReceivedLine(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch (e) {
    // プレーンテキストログの出力
    log(`[DEVICE] ${line}`, "device");
    if (line.includes("セーフモード") || line.includes("Hard fault") || line.includes("Safe Mode") || line.includes("セーフモードに入った理由")) {
      handleSafeModeDetected(line);
    }
    return;
  }

function handleSafeModeDetected(line) {
  stopLoadRetry();
  if (safeModeAlertBanner) {
    safeModeAlertBanner.style.display = "flex";
  }
  log("⚠️ マイコンがセーフモード (Safe Mode) に入っています。PCの書き込みキャッシュが未フラッシュのままリセットされたか、ファイル更新直後の不整合の可能性があります。", "warn");
  showToast("⚠️ マイコンがセーフモードで起動しています。画面上部バナーの手順をご確認ください。", 8000);
}


  try {
    if (msg.type === "telemetry") {
      updateTelemetryUI(msg);
      return;
    }

    log(`受信: ${line}`, "rx");

    if (msg.cmd === "get_config" && msg.status === "ok") {
      stopLoadRetry();
      checkFirmwareVersion(msg.version);
      const deviceConfig = ensureProfiles(msg.config);

      // 未反映プロファイル（共有リンク/JSON/プリセット追加）があるか確認してマージ
      const pendingToMerge = getPendingOrExtraProfiles(deviceConfig);
      clearPendingImportedProfiles();

      if (pendingToMerge.length > 0) {
        let addedNames = [];
        let skippedNames = [];
        pendingToMerge.forEach(p => {
          let finalName = p.name || "共有プロファイル";
          let counter = 2;
          while (deviceConfig.profiles.some(dp => dp.name === finalName)) {
            finalName = `${p.name || "共有プロファイル"} (${counter++})`;
          }
          const clonedP = JSON.parse(JSON.stringify(p));
          clonedP.name = finalName;

          // ストレージ容量チェック (上限約1MB)
          const testProfiles = [...deviceConfig.profiles, clonedP];
          const testConfig = { ...deviceConfig, profiles: testProfiles };
          if (getConfigJsonByteLength(testConfig) > MAX_STORAGE_PAYLOAD_BYTES) {
            skippedNames.push(finalName);
            return;
          }

          deviceConfig.profiles.push(clonedP);
          addedNames.push(finalName);
        });

        if (skippedNames.length > 0) {
          const skipStr = skippedNames.map(n => `「${n}」`).join(", ");
          showToast(`⚠️ マイコン容量制限のため、プロファイル ${skipStr} は同期できませんでした`, 7000);
          log(`マイコン内蔵ストレージの空き容量不足のため、プロファイル ${skipStr} の追加をスキップしました。既存の不要なプロファイルを削除してください。`, "warn");
        }

        if (addedNames.length > 0) {
          deviceConfig.active_profile = deviceConfig.profiles.length - 1;
          deviceConfig.keymap = JSON.parse(JSON.stringify(deviceConfig.profiles[deviceConfig.active_profile].keymap));
          deviceConfig.joystick = JSON.parse(JSON.stringify(deviceConfig.profiles[deviceConfig.active_profile].joystick));

          currentConfig = deviceConfig;
          renderProfileSelect();
          renderHwButtonGrid();
          renderButtonGrid();
          renderDirectionTable();
          updateFormFromConfig();
          drawRadar();
          saveToLocalStorage(currentConfig, "デバイス読込 & プロファイル統合");
          setDeviceOpLoading("load", false, "読込・統合完了!");

          if (msg.nvm) updateNvmStorageUI(msg.nvm);
          else updateNvmStorageUI();

          // デバイスへ統合設定を即座に書き込み保存 (Hot Reload & 永続化)
          setDeviceOpLoading("save", true, "", `未反映プロファイル (${addedNames.length}件) をデバイスへ保存中...`);
          sendJson({ cmd: "set_config", config: getDeviceSyncPayload(currentConfig) });

          const namesStr = addedNames.map(n => `「${n}」`).join(", ");
          log(`デバイスの設定 (${deviceConfig.profiles.length - addedNames.length}件) に未反映プロファイル ${namesStr} を統合し、デバイスへ保存・反映しました`, "success");
          showToast(`📥 プロファイル ${namesStr} をデバイスへ保存・反映しました！`, 5000);
        } else {
          currentConfig = deviceConfig;
          renderProfileSelect();
          renderHwButtonGrid();
          renderButtonGrid();
          renderDirectionTable();
          updateFormFromConfig();
          drawRadar();
          saveToLocalStorage(currentConfig, "デバイス読込同期");
          setDeviceOpLoading("load", false, "読込完了!");
          updateStorageUI(msg.storage, msg.nvm);
        }

        if (autoStartMonitorPending) {
          autoStartMonitorPending = false;
          setTimeout(() => {
            startMonitoring();
          }, 300);
        }
        return;
      }

      currentConfig = deviceConfig;
      renderProfileSelect();
      renderHwButtonGrid();
      renderButtonGrid();
      renderDirectionTable();
      updateFormFromConfig();
      drawRadar();
      saveToLocalStorage(currentConfig, "デバイス読込同期");
      setDeviceOpLoading("load", false, "読込完了!");
      log("デバイスから設定を正常に読み込みました (localStorageに同期)", "success");
      updateStorageUI(msg.storage, msg.nvm);

      // 初回接続時のロード完了後、少し間を置いてモニタリングを自動開始 (安定化)
      if (autoStartMonitorPending) {
        autoStartMonitorPending = false;
        setTimeout(() => {
          startMonitoring();
        }, 150);
      }
    } else if (msg.type === "profile_switched") {
      log(`🔄 デバイス操作によりプロファイルが切り替わりました: [${msg.active_profile + 1}] ${msg.name} (ID: ${msg.id || "なし"})`, "info");
      let targetIdx = -1;
      if (msg.id) {
        targetIdx = currentConfig.profiles.findIndex(p => p.id === msg.id);
      }
      if (targetIdx === -1 && msg.name) {
        targetIdx = currentConfig.profiles.findIndex(p => p.name === msg.name);
      }
      if (targetIdx === -1) {
        // デバイス内スロット番号からの逆引き
        const syncPayload = getDeviceSyncPayload(currentConfig);
        if (syncPayload.profiles && syncPayload.profiles[msg.active_profile]) {
          const devP = syncPayload.profiles[msg.active_profile];
          targetIdx = currentConfig.profiles.findIndex(p => p.id === devP.id || p.name === devP.name);
        }
      }

      if (targetIdx >= 0 && targetIdx !== currentConfig.active_profile) {
        switchProfile(targetIdx, false); // デバイスには再送不要
        playProfileSwitchTone();
        showToast(`🔄 プロファイル切替: 「${msg.name}」 (デバイス連動)`, 4000);
      }
      return;
    } else if (msg.cmd === "version" && msg.status === "ok") {
      checkFirmwareVersion(msg.version);
    } else if (msg.cmd === "set_config" && msg.status === "ok") {
      if (msg.version) checkFirmwareVersion(msg.version);
      let saveDest = "RAMのみ";
      if (msg.saved_to_file) saveDest = "内蔵Flash (config.json)";
      if (msg.saved_to_nvm) saveDest += " & NVMバックアップ";
      saveToLocalStorage(currentConfig, "デバイス保存同期");
      setDeviceOpLoading("save", false, "保存完了!");
      updateStorageUI(msg.storage, msg.nvm);

      if (!msg.saved_to_nvm && !msg.saved_to_file) {
        log("⚠️ デバイスへの永続保存に失敗しました (RAM上でのみ有効です)。", "warn");
        showToast("⚠️ デバイス永続保存に失敗 (RAM上のみ反映)", 5000);
      } else {
        log(`設定がデバイスに反映されました (${saveDest})`, "success");
      }
      if (msg.warning) log(`情報: ${msg.warning}`, "info");
    } else if ((msg.cmd === "storage_status" || msg.cmd === "nvm_status") && msg.status === "ok") {
      updateStorageUI(msg.storage, msg.nvm);
      if (msg.storage) {
        log(`マイコンFlashストレージ: 空き ${formatBytes(msg.storage.free)} / 総容量 ${formatBytes(msg.storage.total)}`, "info");
        showToast(`💾 ストレージ空き: ${formatBytes(msg.storage.free)}`);
      } else if (msg.nvm) {
        log(`マイコンFlash(NVM)容量: 使用 ${msg.nvm.used.toLocaleString()} B / 空き ${msg.nvm.free.toLocaleString()} B`, "info");
      }
    } else if (msg.cmd === "calibrate" && msg.status === "ok") {
      setDeviceOpLoading("calibrate", false, "補正完了!");
      log(`キャリブレーション完了: Center=(${msg.center[0]}, ${msg.center[1]})`, "success");
    } else if (msg.cmd === "reset_config" && msg.status === "ok") {
      stopLoadRetry();
      currentConfig = ensureProfiles(msg.config);
      renderProfileSelect();
      renderHwButtonGrid();
      renderButtonGrid();
      renderDirectionTable();
      updateFormFromConfig();
      saveToLocalStorage(currentConfig, "デバイスリセット同期");
      setDeviceOpLoading("reset", false, "初期化完了!");
      updateStorageUI(msg.storage, msg.nvm);
      log("マイコンのFlashストレージおよび設定をデフォルトに初期化しました", "success");
    } else if (msg.cmd === "enter_maintenance") {
      if (msg.status === "ok") {
        log(`🛠️ ${msg.message || "メンテナンスモードへ移行します..."}`, "warn");
        showToast("🛠️ メンテナンスモードで再起動中... (CIRCUITPY ドライブが表示されます)");
      } else {
        log(`⚠️ メンテナンスモード移行エラー: ${msg.message}`, "error");
        showToast(`⚠️ メンテナンスモード移行エラー: ${msg.message}`);
      }
    } else if (msg.cmd === "reboot") {
      log(`🔄 ${msg.message || "マイコンを通常モードで再起動します..."}`, "info");
      showToast("🔄 マイコンを再起動中...");
    }
  } catch (err) {
    console.error("受信データ処理エラー:", err);
    log(`受信データ処理エラー: ${err.message}`, "error");
    if (currentActiveOp) {
      setDeviceOpLoading(currentActiveOp, false);
    }
  }
}

// イベントバインド
btnConnect.addEventListener("click", connectSerial);
btnDisconnect.addEventListener("click", () => disconnectSerial());

if (typeof navigator !== "undefined" && navigator.serial && typeof navigator.serial.addEventListener === "function") {
  navigator.serial.addEventListener("disconnect", (event) => {
    if (serialPort && (event.target === serialPort || !event.target)) {
      const wasReboot = isRebootPending;
      isRebootPending = false;
      disconnectSerial({
        isSilent: wasReboot,
        reason: wasReboot
          ? "🔄 マイコンの再起動に伴い切断しました"
          : "🔌 デバイスが取り外されました (シリアル切断)"
      });
    }
  });
}

btnLoadConfig.addEventListener("click", () => {
  log("デバイスから設定を読み込み中...", "info");
  requestConfigWithRetry(false);
});

btnSaveConfig.addEventListener("click", () => {
  syncCurrentToProfile();
  const syncPayload = getDeviceSyncPayload(currentConfig);
  const byteLen = getConfigJsonByteLength(syncPayload);
  if (byteLen > MAX_STORAGE_PAYLOAD_BYTES) {
    if (!confirm(`⚠️ 転送対象データのサイズ (${formatBytes(byteLen)}) が上限 (1MB) に近づいています。続行しますか？`)) {
      return;
    }
  }
  setDeviceOpLoading("save", true, "", "デバイスへ設定を保存中 (Flash書き込み待機)...");
  log(`デバイスへ設定を送信・保存中 (${syncPayload.profiles.length}個のプロファイルを同期)...`, "info");
  sendJson({ cmd: "set_config", config: syncPayload });
});

btnCalibrate.addEventListener("click", () => {
  setDeviceOpLoading("calibrate", true, "", "ゼロ点キャリブレーション実行中...");
  log("スティックゼロ点キャリブレーション実行中...", "info");
  sendJson({ cmd: "calibrate" });
});

const monitorBtns = document.querySelectorAll(".btn-toggle-monitor, #btnToggleMonitor");
monitorBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isMonitoring) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  });
});

btnExportJson.addEventListener("click", () => {
  syncCurrentToProfile();
  const blob = new Blob([JSON.stringify(currentConfig, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lefty_config.json";
  a.click();
  URL.revokeObjectURL(url);
  log("設定を lefty_config.json にエクスポートしました", "info");
});

fileImportJson.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const parsed = JSON.parse(evt.target.result);
      currentConfig = ensureProfiles(parsed);
      renderProfileSelect();
      renderHwButtonGrid();
      renderButtonGrid();
      renderDirectionTable();
      updateFormFromConfig();
      saveToLocalStorage(currentConfig, `JSONインポート: ${file.name}`);
      log(`設定ファイルをインポートしました: ${file.name} (localStorageに保存)`, "success");
    } catch (err) {
      log(`JSONの解析に失敗しました: ${err.message}`, "error");
    }
  };
  reader.readAsText(file);
});

btnResetDefault.addEventListener("click", () => {
  if (confirm("設定をデフォルトに戻しますか？マイコンのFlash(NVM)設定およびブラウザ保存も初期化されます。")) {
    currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    ensureProfiles(currentConfig);
    renderProfileSelect();
    renderHwButtonGrid();
    renderButtonGrid();
    renderDirectionTable();
    updateFormFromConfig();
    saveToLocalStorage(currentConfig, "デフォルト初期化");
    if (serialPort && writer) {
      setDeviceOpLoading("reset", true, "", "マイコンFlash初期化中...");
      log("マイコン設定の初期化コマンドを送信中...", "info");
      sendJson({ cmd: "reset_config" });
    }
    log("設定をデフォルト値にリセットしました (localStorageも初期化)", "info");
  }
});

// 初期ロード
initUI();
