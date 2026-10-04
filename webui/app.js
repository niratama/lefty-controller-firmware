// Lefty Controller Configurator Client Script

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
  "backslash", "semicolon", "quote", "grave", "comma", "period", "slash"
].forEach(a => ALL_VALID_KEYS_SET.add(a));

function isValidActionName(name) {
  if (!name || typeof name !== "string") return false;
  const lower = name.trim().toLowerCase();
  if (ALL_VALID_KEYS_SET.has(lower)) return true;
  if (/^(gamepad|btn)_\d{1,2}$/.test(lower)) {
    const num = parseInt(lower.split("_")[1], 10);
    return num >= 1 && num <= 16;
  }
  return false;
}

function validateKeyString(str) {
  if (!str || !str.trim()) return { valid: true, empty: true };
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

const DEFAULT_CONFIG = {
  active_profile: 0,
  profiles: [
    {
      name: "プロファイル 1 (FPS/汎用)",
      keymap: {
        buttons: ["1", "2", "x", "e", "Tab", "f", "q", "4", "3", "Space", "z", "LCtrl", "LAlt"]
      },
      joystick: {
        mode: "keyboard",
        direction_mode: "8way",
        mouse_speed: 12,
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
      name: "プロファイル 2 (ゲームパッド)",
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
        mouse_speed: 12,
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
      name: "プロファイル 3 (マウス & 作業用)",
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
        mouse_speed: 12,
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
    buttons: ["1", "2", "x", "e", "Tab", "f", "q", "4", "3", "Space", "z", "LCtrl", "LAlt"]
  },
  joystick: {
    mode: "keyboard",
    direction_mode: "8way",
    mouse_speed: 12,
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
  },
  pins: {
    buttons: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    adc_x: 26,
    adc_y: 27
  }
};

let currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
let serialPort = null;
let reader = null;
let writer = null;
let isMonitoring = false;
let currentTelemetry = {
  raw: [32768, 32768],
  dx: 0,
  dy: 0,
  states: { up: 0, down: 0, left: 0, right: 0 },
  btns: []
};

// DOM要素取得
const connStatus = document.getElementById("connStatus");
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

// プロファイルDOM要素
const profileSelect = document.getElementById("profileSelect");
const profileNameInput = document.getElementById("profileNameInput");
const btnAddProfile = document.getElementById("btnAddProfile");
const btnDuplicateProfile = document.getElementById("btnDuplicateProfile");
const btnDeleteProfile = document.getElementById("btnDeleteProfile");

// テスト入力DOM要素
const testInputBox = document.getElementById("testInputBox");
const btnClearTestInput = document.getElementById("btnClearTestInput");
const liveKeysContainer = document.getElementById("liveKeysContainer");
const hwBtnGrid = document.getElementById("hwBtnGrid");

// スティック・パラメータDOM要素
const stickModeSelect = document.getElementById("stickModeSelect");
const directionModeSelect = document.getElementById("directionModeSelect");
const mouseSpeedRow = document.getElementById("mouseSpeedRow");
const mouseSpeedInput = document.getElementById("mouseSpeedInput");
const mouseSpeedVal = document.getElementById("mouseSpeedVal");
const kbdThresholdsGroup = document.getElementById("kbdThresholdsGroup");

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

// プロファイル構造の保証 (後方互換性)
function ensureProfiles(cfg) {
  if (!cfg.profiles || !Array.isArray(cfg.profiles) || cfg.profiles.length === 0) {
    cfg.profiles = [
      {
        name: "プロファイル 1 (デフォルト)",
        keymap: cfg.keymap || JSON.parse(JSON.stringify(DEFAULT_CONFIG.keymap)),
        joystick: cfg.joystick || JSON.parse(JSON.stringify(DEFAULT_CONFIG.joystick))
      }
    ];
  }
  cfg.profiles.forEach(p => {
    if (p.joystick) {
      if (!p.joystick.mode) p.joystick.mode = "keyboard";
      if (!p.joystick.mouse_speed) p.joystick.mouse_speed = 12;
      if (!p.joystick.direction_mode) p.joystick.direction_mode = "8way";
    }
  });
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
  }
  return cfg;
}

function updateModeDisplay() {
  const mode = (currentConfig.joystick && currentConfig.joystick.mode) ? currentConfig.joystick.mode : "keyboard";
  const dirMode = (currentConfig.joystick && currentConfig.joystick.direction_mode) ? currentConfig.joystick.direction_mode : "8way";
  const textEl = document.getElementById("stickModeText");
  const extraEl = document.getElementById("stickModeExtra");
  if (!textEl) return;

  let modeLabel = "";
  if (mode === "gamepad") {
    modeLabel = "GAMEPAD (X/Y)";
    if (extraEl) {
      if (currentTelemetry && currentTelemetry.gamepad) {
        extraEl.textContent = `X: ${currentTelemetry.gamepad[0]} / Y: ${currentTelemetry.gamepad[1]}`;
      } else {
        extraEl.textContent = "";
      }
    }
  } else if (mode === "mouse") {
    modeLabel = "MOUSE (POINTER)";
    if (extraEl) {
      if (currentTelemetry && currentTelemetry.mouse) {
        extraEl.textContent = `dX: ${currentTelemetry.mouse[0]} / dY: ${currentTelemetry.mouse[1]}`;
      } else {
        extraEl.textContent = "";
      }
    }
  } else {
    modeLabel = "KEYBOARD (WASD)";
    if (extraEl) extraEl.textContent = "";
  }

  if (dirMode === "4way_snap") {
    modeLabel += " [4方向スナップ]";
  } else if (dirMode === "4way_strict") {
    modeLabel += " [4方向厳格]";
  }
  textEl.textContent = modeLabel;
}

function updateModeVisibility() {
  const mode = (currentConfig.joystick && currentConfig.joystick.mode) ? currentConfig.joystick.mode : "keyboard";
  if (mouseSpeedRow) {
    mouseSpeedRow.style.display = (mode === "mouse") ? "flex" : "none";
  }
  if (kbdThresholdsGroup) {
    kbdThresholdsGroup.style.display = (mode === "keyboard") ? "block" : "none";
  }
  updateModeDisplay();
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
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (!parsed.pins) {
          parsed.pins = JSON.parse(JSON.stringify(DEFAULT_CONFIG.pins));
        }
        return ensureProfiles(parsed);
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
    sendJson({ cmd: "set_config", config: currentConfig });
  }
  log(`プロファイルを「${p.name}」に切り替えました`, "info");
}

function renderProfileSelect() {
  if (!profileSelect) return;
  profileSelect.innerHTML = "";
  ensureProfiles(currentConfig);
  currentConfig.profiles.forEach((p, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `${idx + 1}: ${p.name}`;
    if (idx === currentConfig.active_profile) opt.selected = true;
    profileSelect.appendChild(opt);
  });
  if (profileNameInput) {
    profileNameInput.value = currentConfig.profiles[currentConfig.active_profile].name;
  }
}

// ハードウェアボタン状態インジケータ生成
function renderHwButtonGrid() {
  if (!hwBtnGrid) return;
  hwBtnGrid.innerHTML = "";
  const pins = (currentConfig.pins && currentConfig.pins.buttons) ? currentConfig.pins.buttons : Array.from({length: 13}, (_, i) => i);
  pins.forEach((pin, i) => {
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
}

function buildModalCombinedKey() {
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

// UI初期化
function initUI() {
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
  renderProfileSelect();
  renderHwButtonGrid();
  renderButtonGrid();
  renderDirectionTable();
  updateFormFromConfig();
  drawRadar();
}

function renderButtonGrid() {
  const container = document.getElementById("buttonGrid");
  if (!container) return;
  container.innerHTML = "";

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
    pinInfo.textContent = `GP${currentConfig.pins.buttons[i]}`;

    titleGroup.appendChild(label);
    titleGroup.appendChild(pinInfo);

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

    toolsGroup.appendChild(btnPick);
    toolsGroup.appendChild(btnCapture);

    header.appendChild(titleGroup);
    header.appendChild(toolsGroup);

    const wrapper = document.createElement("div");
    wrapper.className = "btn-input-wrapper";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "btn-input";
    input.id = `btnInput_${i}`;
    input.setAttribute("list", "allKeysList");
    const keyVal = currentConfig.keymap.buttons[i];
    input.value = Array.isArray(keyVal) ? keyVal.join(', ') : (keyVal || "");
    input.placeholder = "例: 1, Space, LCtrl, c";

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
      currentConfig.keymap.buttons[i] = finalVal;
      syncCurrentToProfile();
      updateValidationBadge(input, badge);
    });

    btnPick.addEventListener("click", () => {
      lastFocusedInput = input;
      openKeyPicker(input, `${PIN_NAMES[i]} のキー設定`);
    });

    btnCapture.addEventListener("click", () => {
      lastFocusedInput = input;
      startKeyCapture(input, btnCapture);
    });

    updateValidationBadge(input, badge);

    wrapper.appendChild(input);
    wrapper.appendChild(badge);

    card.appendChild(header);
    card.appendChild(wrapper);
    container.appendChild(card);
  }
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
    const cfg = currentConfig.joystick.directions[d.key];
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><strong>${d.label}</strong></td>
      <td><input type="number" id="th_walk_${d.key}" value="${cfg.th_walk}" step="500" min="1000" max="32000"></td>
      <td><input type="text" id="kw_${d.key}" list="allKeysList" value="${Array.isArray(cfg.key_walk) ? cfg.key_walk.join(', ') : cfg.key_walk}"></td>
      <td><input type="number" id="th_run_${d.key}" value="${cfg.th_run}" step="500" min="1000" max="32000"></td>
      <td><input type="text" id="kr_${d.key}" list="allKeysList" value="${Array.isArray(cfg.key_run) ? cfg.key_run.join(', ') : cfg.key_run}"></td>
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
  updateModeVisibility();

  deadzoneInput.value = currentConfig.joystick.deadzone;
  deadzoneVal.textContent = currentConfig.joystick.deadzone;
  hysteresisInput.value = currentConfig.joystick.hysteresis;
  hysteresisVal.textContent = currentConfig.joystick.hysteresis;
  invertX.checked = !!currentConfig.joystick.invert_x;
  invertY.checked = !!currentConfig.joystick.invert_y;
  rotationSelect.value = String(currentConfig.joystick.rotation !== undefined ? currentConfig.joystick.rotation : 90);

  // ボタン
  for (let i = 0; i < 13; i++) {
    const input = document.getElementById(`btnInput_${i}`);
    const badge = document.getElementById(`keyValid_${i}`);
    if (input) {
      const val = currentConfig.keymap.buttons[i];
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
      sendJson({ cmd: "set_config", config: currentConfig });
    }
    log(`プロファイル名を「${name}」に変更しました`, "info");
  });
}

if (btnAddProfile) {
  btnAddProfile.addEventListener("click", () => {
    syncCurrentToProfile();
    const newNum = currentConfig.profiles.length + 1;
    const newProfile = {
      name: `プロファイル ${newNum}`,
      keymap: JSON.parse(JSON.stringify(DEFAULT_CONFIG.keymap)),
      joystick: JSON.parse(JSON.stringify(DEFAULT_CONFIG.joystick))
    };
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
      name: `${cur.name} (コピー)`,
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
  ["up", "down", "left", "right"].forEach(d => {
    currentConfig.joystick.directions[d].th_run = val;
    const el = document.getElementById(`th_run_${d}`);
    if (el) el.value = val;
  });
  syncCurrentToProfile();
  drawRadar();
});

deadzoneInput.addEventListener("input", (e) => {
  deadzoneVal.textContent = e.target.value;
  currentConfig.joystick.deadzone = parseInt(e.target.value, 10);
  syncCurrentToProfile();
  drawRadar();
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

  // 各方向のWalk / Run 領域の目安円 (キーボードモード時のみ描画)
  const mode = (currentConfig.joystick && currentConfig.joystick.mode) ? currentConfig.joystick.mode : "keyboard";
  if (mode === "keyboard") {
    const avgWalk = (currentConfig.joystick.directions.up.th_walk + currentConfig.joystick.directions.right.th_walk) / 2;
    const walkRatio = Math.min(1.0, avgWalk / 32768);
    ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * walkRatio, 0, Math.PI * 2);
    ctx.stroke();

    const avgRun = (currentConfig.joystick.directions.up.th_run + currentConfig.joystick.directions.right.th_run) / 2;
    const runRatio = Math.min(1.0, avgRun / 32768);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
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
  currentTelemetry.gamepad = data.gamepad || [0, 0];
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
    const pin = currentConfig.pins.buttons[i];
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

    if (opType === "save" && btnSaveConfig) {
      btnSaveConfig.classList.add("btn-loading");
      btnSaveConfig.innerHTML = '<span class="spinner"></span>デバイスへ保存中...';
    } else if (opType === "load" && btnLoadConfig) {
      btnLoadConfig.classList.add("btn-loading");
      btnLoadConfig.innerHTML = '<span class="spinner"></span>読込中...';
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

    // タイムアウト保護 (30秒)
    activeOpTimer = setTimeout(() => {
      setDeviceOpLoading(opType, false);
      log(`「${opType}」処理がタイムアウトしました。`, "warn");
    }, 30000);

  } else {
    currentActiveOp = null;

    if (btnLoadConfig) btnLoadConfig.classList.remove("btn-loading");
    if (btnSaveConfig) btnSaveConfig.classList.remove("btn-loading");
    if (btnResetDefault) btnResetDefault.classList.remove("btn-loading");
    if (btnCalibrate) btnCalibrate.classList.remove("btn-loading");

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
}

// Web Serial 接続
async function connectSerial() {
  if (!("serial" in navigator)) {
    alert("このブラウザは Web Serial API をサポートしていません。Google Chrome / Edge 等の最新ブラウザをご利用ください。");
    return;
  }

  try {
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
    btnToggleMonitor.disabled = false;

    log("シリアルポートを開きました (115200bps)", "success");

    // バックグラウンド受信ループ
    readLoop();

    // 接続時に設定を自動読込
    setDeviceOpLoading("load", true, "", "接続完了: 設定を自動取得中...");
    sendJson({ cmd: "get_config" });

    // モニタリングを自動開始
    isMonitoring = true;
    btnToggleMonitor.textContent = "モニタリング停止";
    sendJson({ cmd: "monitor", enable: true });

  } catch (err) {
    log(`接続エラー: ${err.message}`, "error");
  }
}

async function disconnectSerial() {
  try {
    if (currentActiveOp) {
      setDeviceOpLoading(currentActiveOp, false);
    }

    if (isMonitoring) {
      sendJson({ cmd: "monitor", enable: false });
      isMonitoring = false;
      btnToggleMonitor.textContent = "モニタリング開始";
    }

    if (reader) {
      await reader.cancel();
      reader.releaseLock();
      reader = null;
    }
    if (writer) {
      writer.releaseLock();
      writer = null;
    }
    if (serialPort) {
      await serialPort.close();
      serialPort = null;
    }

    connStatus.textContent = "未接続";
    connStatus.className = "badge badge-disconnected";
    btnConnect.disabled = false;
    btnDisconnect.disabled = true;
    btnLoadConfig.disabled = true;
    btnSaveConfig.disabled = true;
    btnCalibrate.disabled = true;
    btnToggleMonitor.disabled = true;

    log("シリアルポートを切断しました", "info");
  } catch (err) {
    log(`切断エラー: ${err.message}`, "error");
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
    log(`受信ループエラー: ${err.message}`, "error");
  }
}

function handleReceivedLine(line) {
  try {
    const msg = JSON.parse(line);
    if (msg.type === "telemetry") {
      updateTelemetryUI(msg);
      return;
    }

    log(`受信: ${line}`, "rx");

    if (msg.cmd === "get_config" && msg.status === "ok") {
      currentConfig = ensureProfiles(msg.config);
      renderProfileSelect();
      renderHwButtonGrid();
      renderButtonGrid();
      renderDirectionTable();
      updateFormFromConfig();
      saveToLocalStorage(currentConfig, "デバイス読込同期");
      setDeviceOpLoading("load", false, "読込完了!");
      log("デバイスから設定を正常に読み込みました (localStorageに同期)", "success");
    } else if (msg.cmd === "set_config" && msg.status === "ok") {
      let saveDest = "RAMのみ";
      if (msg.saved_to_nvm) saveDest = "内蔵Flash(NVM)に永続保存";
      if (msg.saved_to_file) saveDest += " & config.json";
      saveToLocalStorage(currentConfig, "デバイス保存同期");
      setDeviceOpLoading("save", false, "保存完了!");
      log(`設定がデバイスに反映されました (${saveDest})`, "success");
      if (msg.warning) log(`情報: ${msg.warning}`, msg.saved_to_nvm ? "info" : "warn");
    } else if (msg.cmd === "calibrate" && msg.status === "ok") {
      setDeviceOpLoading("calibrate", false, "補正完了!");
      log(`キャリブレーション完了: Center=(${msg.center[0]}, ${msg.center[1]})`, "success");
    } else if (msg.cmd === "reset_config" && msg.status === "ok") {
      currentConfig = ensureProfiles(msg.config);
      renderProfileSelect();
      renderHwButtonGrid();
      renderButtonGrid();
      renderDirectionTable();
      updateFormFromConfig();
      invertX.checked = false;
      invertY.checked = false;
      saveToLocalStorage(currentConfig, "デバイスリセット同期");
      setDeviceOpLoading("reset", false, "初期化完了!");
      log("マイコンのFlash(NVM)および設定をデフォルトに初期化しました", "success");
    }
  } catch (e) {
    // プレーンテキストログの出力
    log(`[DEVICE] ${line}`, "device");
  }
}

// イベントバインド
btnConnect.addEventListener("click", connectSerial);
btnDisconnect.addEventListener("click", disconnectSerial);

btnLoadConfig.addEventListener("click", () => {
  setDeviceOpLoading("load", true, "", "デバイスから設定を取得中...");
  log("デバイスから設定を読み込み中...", "info");
  sendJson({ cmd: "get_config" });
});

btnSaveConfig.addEventListener("click", () => {
  syncCurrentToProfile();
  setDeviceOpLoading("save", true, "", "デバイスへ設定を保存中 (Flash書き込み待機)...");
  log("デバイスへ設定を送信・保存中...", "info");
  sendJson({ cmd: "set_config", config: currentConfig });
});

btnCalibrate.addEventListener("click", () => {
  setDeviceOpLoading("calibrate", true, "", "ゼロ点キャリブレーション実行中...");
  log("スティックゼロ点キャリブレーション実行中...", "info");
  sendJson({ cmd: "calibrate" });
});

btnToggleMonitor.addEventListener("click", () => {
  isMonitoring = !isMonitoring;
  btnToggleMonitor.textContent = isMonitoring ? "モニタリング停止" : "モニタリング開始";
  sendJson({ cmd: "monitor", enable: isMonitoring });
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
    invertX.checked = false;
    invertY.checked = false;
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
