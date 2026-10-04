// Lefty Controller Configurator Client Script

const PIN_NAMES = [
  "SW1 (前面 1)", "SW2 (前面 2)", "SW3 (前面 3)",
  "SW4 (前面 4)", "SW5 (前面 5)", "SW6 (前面 6)",
  "SW7 (前面 7)", "SW8 (前面 8)", "SW9 (前面 9)",
  "SW10 (側面 上)", "SW11 (側面 中)", "SW12 (側面 下)",
  "SW_STK (スティック押込)"
];

const DEFAULT_CONFIG = {
  keymap: {
    buttons: ["1", "2", "x", "e", "Tab", "f", "q", "4", "3", "Space", "z", "LCtrl", "LAlt"]
  },
  joystick: {
    deadzone: 4000,
    hysteresis: 1500,
    invert_x: false,
    invert_y: true,
    rotation: 90,
    directions: {
      up: { th_walk: 12000, th_run: 26000, key_walk: "W", key_run: ["Shift", "W"] },
      down: { th_walk: 12000, th_run: 26000, key_walk: "S", key_run: ["Shift", "S"] },
      left: { th_walk: 12000, th_run: 26000, key_walk: "A", key_run: ["Shift", "A"] },
      right: { th_walk: 12000, th_run: 26000, key_walk: "D", key_run: ["Shift", "D"] }
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

const deadzoneInput = document.getElementById("deadzoneInput");
const deadzoneVal = document.getElementById("deadzoneVal");
const hysteresisInput = document.getElementById("hysteresisInput");
const hysteresisVal = document.getElementById("hysteresisVal");
const invertX = document.getElementById("invertX");
const invertY = document.getElementById("invertY");
const rotationSelect = document.getElementById("rotationSelect");

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

// UI初期化
function initUI() {
  renderButtonGrid();
  renderDirectionTable();
  updateFormFromConfig();
  drawRadar();
}

function renderButtonGrid() {
  const container = document.getElementById("buttonGrid");
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

    const indicator = document.createElement("div");
    indicator.className = "btn-indicator";
    indicator.id = `btnInd_${i}`;

    header.appendChild(label);
    header.appendChild(indicator);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "btn-input";
    input.id = `btnInput_${i}`;
    input.value = currentConfig.keymap.buttons[i] || "";
    input.addEventListener("change", (e) => {
      currentConfig.keymap.buttons[i] = e.target.value;
    });

    card.appendChild(header);
    card.appendChild(input);
    container.appendChild(card);
  }
}

function renderDirectionTable() {
  const tbody = document.getElementById("dirTableBody");
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
      drawRadar();
    });
    tr.querySelector(`#th_run_${d.key}`).addEventListener("change", (e) => {
      currentConfig.joystick.directions[d.key].th_run = parseInt(e.target.value, 10);
      drawRadar();
    });
    tr.querySelector(`#kw_${d.key}`).addEventListener("change", (e) => {
      const val = e.target.value.split(',').map(s => s.trim()).filter(s => s);
      currentConfig.joystick.directions[d.key].key_walk = val.length === 1 ? val[0] : val;
    });
    tr.querySelector(`#kr_${d.key}`).addEventListener("change", (e) => {
      const val = e.target.value.split(',').map(s => s.trim()).filter(s => s);
      currentConfig.joystick.directions[d.key].key_run = val.length === 1 ? val[0] : val;
    });
  });
}

function updateFormFromConfig() {
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
    if (input) input.value = currentConfig.keymap.buttons[i] || "";
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

  drawRadar();
}

deadzoneInput.addEventListener("input", (e) => {
  deadzoneVal.textContent = e.target.value;
  currentConfig.joystick.deadzone = parseInt(e.target.value, 10);
  drawRadar();
});

hysteresisInput.addEventListener("input", (e) => {
  hysteresisVal.textContent = e.target.value;
  currentConfig.joystick.hysteresis = parseInt(e.target.value, 10);
  drawRadar();
});

invertX.addEventListener("change", (e) => {
  currentConfig.joystick.invert_x = e.target.checked;
});

invertY.addEventListener("change", (e) => {
  currentConfig.joystick.invert_y = e.target.checked;
});

rotationSelect.addEventListener("change", (e) => {
  currentConfig.joystick.rotation = parseInt(e.target.value, 10);
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

  // 各方向のWalk / Run 領域の目安円
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

  rawXSpan.textContent = currentTelemetry.raw[0];
  rawYSpan.textContent = currentTelemetry.raw[1];
  deltaXSpan.textContent = currentTelemetry.dx;
  deltaYSpan.textContent = currentTelemetry.dy;

  // 方向ステート
  const stateNames = ["NEUTRAL", "WALK", "RUN"];
  const updatePill = (el, dirKey) => {
    const st = currentTelemetry.states[dirKey] || 0;
    el.textContent = `${dirKey.toUpperCase()}: ${stateNames[st]}`;
    el.className = "state-pill";
    if (st === 1) el.classList.add("active-walk");
    if (st === 2) el.classList.add("active-run");
  };

  updatePill(stateUp, "up");
  updatePill(stateDown, "down");
  updatePill(stateLeft, "left");
  updatePill(stateRight, "right");

  // ボタン押下状態
  for (let i = 0; i < 13; i++) {
    const card = document.getElementById(`btnCard_${i}`);
    if (card) {
      if (currentTelemetry.btns.includes(i)) {
        card.classList.add("physically-pressed");
      } else {
        card.classList.remove("physically-pressed");
      }
    }
  }

  drawRadar();
}

// Web Serial 通信ロジック
async function connectSerial() {
  if (!("serial" in navigator)) {
    alert("お使いのブラウザはWeb Serial APIに対応していません。Google Chrome / Edge 等をご利用ください。");
    return;
  }

  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 115200 });

    connStatus.textContent = "接続中";
    connStatus.className = "badge badge-connected";
    btnConnect.disabled = true;
    btnDisconnect.disabled = false;
    btnLoadConfig.disabled = false;
    btnSaveConfig.disabled = false;
    btnCalibrate.disabled = false;
    btnToggleMonitor.disabled = false;

    log("シリアルポートに接続しました (115200 baud)", "success");

    readLoop();

    // 接続時に自動で設定を取得
    sendJson({ cmd: "get_config" });

  } catch (err) {
    log(`接続失敗 / キャンセル: ${err.message}`, "error");
  }
}

async function disconnectSerial() {
  try {
    if (isMonitoring) {
      await sendJson({ cmd: "monitor", enable: false });
      isMonitoring = false;
      btnToggleMonitor.textContent = "モニタリング開始";
    }

    if (reader) {
      await reader.cancel();
      reader = null;
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

    log("シリアルポートから切断しました", "info");
  } catch (err) {
    log(`切断時エラー: ${err.message}`, "error");
  }
}

async function sendJson(obj) {
  if (!serialPort || !serialPort.writable) {
    log("シリアルポートが書き込み可能ではありません", "error");
    return;
  }
  try {
    const encoder = new TextEncoder();
    const str = JSON.stringify(obj) + "\n";
    const w = serialPort.writable.getWriter();
    await w.write(encoder.encode(str));
    w.releaseLock();
    log(`送信: ${str.trim()}`, "tx");
  } catch (err) {
    log(`送信エラー: ${err.message}`, "error");
  }
}

async function readLoop() {
  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
  reader = textDecoder.readable.getReader();

  let lineBuffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        lineBuffer += value;
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop(); // 最後の不完全な行を保持

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          handleReceivedLine(trimmed);
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
      currentConfig = msg.config;
      updateFormFromConfig();
      log("デバイスから設定を正常に読み込みました", "success");
    } else if (msg.cmd === "set_config" && msg.status === "ok") {
      let saveDest = "RAMのみ";
      if (msg.saved_to_nvm) saveDest = "内蔵Flash(NVM)に永続保存";
      if (msg.saved_to_file) saveDest += " & config.json";
      log(`設定がデバイスに反映されました (${saveDest})`, "success");
      if (msg.warning) log(`情報: ${msg.warning}`, msg.saved_to_nvm ? "info" : "warn");
    } else if (msg.cmd === "calibrate" && msg.status === "ok") {
      log(`キャリブレーション完了: Center=(${msg.center[0]}, ${msg.center[1]})`, "success");
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
  const blob = new Blob([JSON.stringify(currentConfig, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lefty_config.json";
  a.click();
  URL.revokeObjectURL(url);
  log("設定を left_config.json にエクスポートしました", "info");
});

fileImportJson.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const parsed = JSON.parse(evt.target.result);
      currentConfig = parsed;
      updateFormFromConfig();
      log(`設定ファイルをインポートしました: ${file.name}`, "success");
    } catch (err) {
      log(`JSONの解析に失敗しました: ${err.message}`, "error");
    }
  };
  reader.readAsText(file);
});

btnResetDefault.addEventListener("click", () => {
  if (confirm("設定をデフォルトに戻しますか？")) {
    currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    updateFormFromConfig();
    log("設定をデフォルト値にリセットしました", "info");
  }
});

// 初期ロード
initUI();
