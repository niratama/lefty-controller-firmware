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
  }
  return cfg;
}

function updateModeDisplay() {
  const mode = (currentConfig.joystick && currentConfig.joystick.mode) ? currentConfig.joystick.mode : "keyboard";
  const textEl = document.getElementById("stickModeText");
  const extraEl = document.getElementById("stickModeExtra");
  if (!textEl) return;

  if (mode === "gamepad") {
    textEl.textContent = "GAMEPAD (X/Y)";
    if (extraEl) {
      if (currentTelemetry && currentTelemetry.gamepad) {
        extraEl.textContent = `X: ${currentTelemetry.gamepad[0]} / Y: ${currentTelemetry.gamepad[1]}`;
      } else {
        extraEl.textContent = "";
      }
    }
  } else if (mode === "mouse") {
    textEl.textContent = "MOUSE (POINTER)";
    if (extraEl) {
      if (currentTelemetry && currentTelemetry.mouse) {
        extraEl.textContent = `dX: ${currentTelemetry.mouse[0]} / dY: ${currentTelemetry.mouse[1]}`;
      } else {
        extraEl.textContent = "";
      }
    }
  } else {
    textEl.textContent = "KEYBOARD (WASD)";
    if (extraEl) extraEl.textContent = "";
  }
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

    const label = document.createElement("span");
    label.className = "btn-label";
    label.textContent = PIN_NAMES[i] || `Button ${i+1}`;

    const pinInfo = document.createElement("span");
    pinInfo.className = "btn-pin";
    pinInfo.textContent = `GP${currentConfig.pins.buttons[i]}`;

    header.appendChild(label);
    header.appendChild(pinInfo);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "btn-input";
    input.id = `btnInput_${i}`;
    const keyVal = currentConfig.keymap.buttons[i];
    input.value = Array.isArray(keyVal) ? keyVal.join(', ') : (keyVal || "");
    input.placeholder = "例: 1, Space, LCtrl, c";

    input.addEventListener("change", (e) => {
      const parts = e.target.value.split(',').map(s => s.trim()).filter(s => s);
      const finalVal = parts.length > 1 ? parts : (parts[0] || "");
      currentConfig.keymap.buttons[i] = finalVal;
      syncCurrentToProfile();
    });

    card.appendChild(header);
    card.appendChild(input);
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
      <td><input type="text" id="kw_${d.key}" value="${Array.isArray(cfg.key_walk) ? cfg.key_walk.join(', ') : cfg.key_walk}"></td>
      <td><input type="number" id="th_run_${d.key}" value="${cfg.th_run}" step="500" min="1000" max="32000"></td>
      <td><input type="text" id="kr_${d.key}" value="${Array.isArray(cfg.key_run) ? cfg.key_run.join(', ') : cfg.key_run}"></td>
    `;

    tbody.appendChild(tr);

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
    tr.querySelector(`#kw_${d.key}`).addEventListener("change", (e) => {
      const val = e.target.value.split(',').map(s => s.trim()).filter(s => s);
      currentConfig.joystick.directions[d.key].key_walk = val.length === 1 ? val[0] : val;
      syncCurrentToProfile();
    });
    tr.querySelector(`#kr_${d.key}`).addEventListener("change", (e) => {
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
    if (input) {
      const val = currentConfig.keymap.buttons[i];
      input.value = Array.isArray(val) ? val.join(', ') : (val || "");
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
      log("デバイスから設定を正常に読み込みました (localStorageに同期)", "success");
    } else if (msg.cmd === "set_config" && msg.status === "ok") {
      let saveDest = "RAMのみ";
      if (msg.saved_to_nvm) saveDest = "内蔵Flash(NVM)に永続保存";
      if (msg.saved_to_file) saveDest += " & config.json";
      saveToLocalStorage(currentConfig, "デバイス保存同期");
      log(`設定がデバイスに反映されました (${saveDest})`, "success");
      if (msg.warning) log(`情報: ${msg.warning}`, msg.saved_to_nvm ? "info" : "warn");
    } else if (msg.cmd === "calibrate" && msg.status === "ok") {
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
  sendJson({ cmd: "get_config" });
});

btnSaveConfig.addEventListener("click", () => {
  syncCurrentToProfile();
  sendJson({ cmd: "set_config", config: currentConfig });
});

btnCalibrate.addEventListener("click", () => {
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
      sendJson({ cmd: "reset_config" });
    }
    log("設定をデフォルト値にリセットしました (localStorageも初期化)", "info");
  }
});

// 初期ロード
initUI();
