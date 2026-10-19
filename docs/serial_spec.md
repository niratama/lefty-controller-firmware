# 左手デバイス シリアル通信プロトコル仕様書 (Serial Protocol Specification)

本ドキュメントは、Waveshare RP2040-Zero 搭載左手デバイスファームウェア（**v1.9.0 以降**）におけるシリアル通信（USB CDC）のインターフェース、コマンド体系、データフォーマット、およびエラーハンドリングを網羅した技術仕様書です。

Web Serial API を用いたブラウザ設定ツール（WebUI）との通信、およびシリアルターミナル（PuTTY, Tera Term, screen, Arduino Serial Monitor 等）からの対話的 CLI 操作の双方に対応しています。

---

## 1. 通信基本仕様 (Transport Layer)

| 項目 | 設定値 / 仕様 | 補足 |
| :--- | :--- | :--- |
| **物理 / 論理層** | USB 2.0 Full Speed CDC (Virtual COM Port) | OS標準ドライバ（WinUSB / cdc_acm）で認識 |
| **ボーレート** | 115,200 bps | CDC仮想シリアルでは実質速度はUSB転送速度に依存 |
| **データビット** | 8 bit | - |
| **パリティ** | None | - |
| **ストップビット** | 1 bit | - |
| **フロー制御** | None (ソフトウェア制御) | - |
| **文字エンコーディング** | UTF-8 | 日本語プロファイル名も完全対応 |
| **改行コード** | `LF` (`\n`) または `CRLF` (`\r\n`) | 受信時に自動正規化 |
| **メッセージ形式** | **JSON Lines (1行1JSON)** または **プレーンテキスト** | - |

---

## 2. フレーミング & 信頼性制御 (Framing & Reliability)

ファームウェア（[`firmware/serial_handler.py`](file:///home/developer/projects/lefty-controller-firmware/firmware/serial_handler.py)）には、シリアル通信の過渡現象やリソース制約に対応するための堅牢な保護設計が組み込まれています。

### 2.1 受信バッファ溢れ保護
* **最大バッファ長:** 32,768 bytes (32KB)
* 大量データ送信や未完了ストリームによって受信バッファが 32KB を超えた場合、メモリ不足（OOM）防止のためバッファは自動破棄・クリアされます。

### 2.2 接続時過渡ノイズ耐性 (Fault Tolerance)
* シリアルポートのオープン・切断直後、OSやドライバの切り替えによってヌル文字（`\x00`）やゴミデータが先頭に付着することがあります。
* ファームウェアは各行の前後からヌル文字や空白をトリムし、初回の JSON パースに失敗した場合は文字列内の最初に出現する `{` から末尾の `}` までの部分文字列を自動抽出し、再パースを試みます。

### 2.3 送信バッファ保護 (Chunked Flushing)
* RP2040 の USB CDC 送信 FIFO バッファのオーバーフローを防ぐため、長大な JSON レスポンス（大容量プロファイル設定等）を出力する際は **128 バイトごとに分割（Chunking）して送信し、随時 `stdout.flush()` を呼び出して送信** します。

---

## 3. 通信メッセージ形式の概要

ファームウェアは以下の3種類の通信メッセージを処理・出力します。

1. **JSON コマンド (Web Serial API / WebUI 向け):**
   * 要求（Request）: 1行の JSON オブジェクト（`{"cmd": "..."}`）
   * 応答（Response）: 1行の JSON オブジェクト（`{"status": "ok" | "error", "cmd": "...", ...}`）
2. **プレーンテキスト CLI コマンド (ターミナル対話向け):**
   * 要求: `help`, `version`, `calibrate`, `enter_maintenance`, `reboot`, `monitor_on`, `monitor_off`
   * 応答: JSON 形式で結果を返送
3. **非同期イベント & ストリーミング:**
   * `{"type": "telemetry", ...}`: モニタリング有効時のリアルタイム座標・入力テレメトリ
   * `{"type": "profile_switched", ...}`: デバイス本体のボタン/コンボ操作によるプロファイル切替通知
   * `[INFO] ...`, `[WARN] ...`: ファームウェア内部の診断ログ

---

## 4. JSON コマンドリファレンス (JSON Commands API)

### 共通レスポンス構造

すべての JSON コマンドに対する応答には、以下の共通フィールドが含まれます。

```json
{
  "status": "ok",
  "cmd": "コマンド名",
  "version": "1.9.0"
}
```

* 失敗時（エラー）は `"status": "error"` となり、`"message": "エラー理由"` が付与されます。

---

### 4.1 設定取得 (`get_config`)

デバイスに保存されている全プロファイル設定、現在のFlashストレージ容量、およびNVM状態を取得します。

* **Request:**
  ```json
  {"cmd": "get_config"}
  ```
* **Response (成功時):**
  ```json
  {
    "status": "ok",
    "cmd": "get_config",
    "version": "1.9.0",
    "config": {
      "version": "1.9.0",
      "active_profile": 0,
      "profiles": [ ... ],
      "keymap": { ... },
      "joystick": { ... }
    },
    "storage": {
      "total": 1400000,
      "used": 42000,
      "free": 1358000,
      "valid": true
    },
    "nvm": {
      "total": 4096,
      "used": 1520,
      "free": 2572,
      "valid": true
    }
  }
  ```

---

### 4.2 設定反映・保存 (`set_config`)

送信された新しい設定をデバイスのメモリ（RAM）上へ即時反映（Hot Reload）し、内蔵Flash（`config.json`）および NVM（4KB以内の場合）へ永続保存します。

* **Request:**
  ```json
  {
    "cmd": "set_config",
    "config": {
      "version": "1.9.0",
      "active_profile": 0,
      "profiles": [ ... ]
    }
  }
  ```
* **Response (成功時):**
  ```json
  {
    "status": "ok",
    "cmd": "set_config",
    "version": "1.9.0",
    "saved_to_file": true,
    "saved_to_nvm": false,
    "storage": { "total": 1400000, "used": 45000, "free": 1355000, "valid": true },
    "nvm": { "total": 4096, "used": 0, "free": 4096, "valid": false }
  }
  ```
  * `saved_to_file`: Flashストレージ上の `config.json` への保存成否。
  * `saved_to_nvm`: NVM EEPROM領域（4KB以内バックアップ）への保存成否。
  * `warning`: 保存時に注意が必要な場合（ファイルシステムがRead-OnlyでNVMにのみ保存された場合等）にメッセージが付与されます。

---

### 4.3 設定出荷時リセット (`reset_config`)

NVMおよびFlashストレージの設定をクリアし、ファームウェア標準の出荷時初期プリセット（3プロファイル構成）に初期化します。

* **Request:**
  ```json
  {"cmd": "reset_config"}
  ```
* **Response:**
  ```json
  {
    "status": "ok",
    "cmd": "reset_config",
    "version": "1.9.0",
    "config": { ... },
    "storage": { ... },
    "nvm": { ... }
  }
  ```

---

### 4.4 ゼロ点キャリブレーション (`calibrate`)

スティックを中央ニュートラル位置にした状態で送信し、実機の ADC X/Y 値を再サンプリングして原点（Center）座標を補正します。

* **Request:**
  ```json
  {"cmd": "calibrate"}
  ```
* **Response:**
  ```json
  {
    "status": "ok",
    "cmd": "calibrate",
    "center": [32768, 32810]
  }
  ```

---

### 4.5 リアルタイムモニタリング切替 (`monitor`)

スティックの座標値やボタン入力状態を高頻度（最大約 30Hz）で連続送信するテレメトリストリーミングの有効/無効を切り替えます。

* **Request:**
  ```json
  {"cmd": "monitor", "enable": true}
  ```
* **Response:**
  ```json
  {
    "status": "ok",
    "cmd": "monitor",
    "enabled": true
  }
  ```

---

### 4.6 メンテナンスモード移行 (`enter_maintenance`)

USBケーブルの抜き差しや物理BOOTボタンの操作を行わずに、マイコンをソフト再起動して PC 上に `CIRCUITPY` USBマスストレージドライブをマウント表示します。

* **Request:**
  ```json
  {"cmd": "enter_maintenance"}
  ```
* **Response:**
  ```json
  {
    "status": "ok",
    "cmd": "enter_maintenance",
    "version": "1.9.0",
    "message": "Rebooting into maintenance mode (USB drive enabled)..."
  }
  ```
* **動作詳細:**
  1. `microcontroller.nvm` の末尾 4 バイトにワンタイムブートフラグ（`b"MAIT"`）を書き込みます。
  2. 約 150ms 待機後、`microcontroller.reset()` を実行してチップをソフトリセットします。
  3. `boot.py` 実行時にフラグが検知され、フラグを即時消去した上で `storage.enable_usb_drive()` を呼び出し、ドライブを表示します。

---

### 4.7 通常モード再起動 (`reboot`)

マイコンを通常コントローラモード（USBマスストレージ非表示）で再起動します。

* **Request:**
  ```json
  {"cmd": "reboot"}
  ```
* **Response:**
  ```json
  {
    "status": "ok",
    "cmd": "reboot",
    "version": "1.9.0",
    "message": "Rebooting controller into normal mode..."
  }
  ```
* **動作詳細:**
  1. NVM 末尾 4 バイトのブートフラグをクリア（`b"\x00\x00\x00\x00"`）します。
  2. `microcontroller.reset()` でマイコンをソフトリセットします。

---

### 4.8 ストレージ容量確認 (`storage_status` / `nvm_status`)

内蔵 Flash ストレージおよび NVM の空き容量・総容量を取得します。

* **Request:**
  ```json
  {"cmd": "storage_status"}
  ```
* **Response:**
  ```json
  {
    "status": "ok",
    "cmd": "storage_status",
    "version": "1.9.0",
    "storage": {
      "total": 1400000,
      "used": 42000,
      "free": 1358000,
      "valid": true
    },
    "nvm": {
      "total": 4096,
      "used": 1520,
      "free": 2572,
      "valid": true
    }
  }
  ```

---

### 4.9 バージョン取得・疎通確認 (`version` / `ping`)

ファームウェアのバージョン確認および接続確認（Ping-Pong）を行います。

* **Version Request:**
  ```json
  {"cmd": "version"}
  ```
  **Response:**
  ```json
  {"status": "ok", "cmd": "version", "version": "1.9.0"}
  ```

* **Ping Request:**
  ```json
  {"cmd": "ping"}
  ```
  **Response:**
  ```json
  {"status": "ok", "cmd": "pong", "version": "1.9.0"}
  ```

---

## 5. プレーンテキスト CLI コマンド (Serial Terminal)

シリアルターミナル（PuTTY、screen、Arduino シリアルモニタ等）から手動で文字列をキーボード入力し、Enterキーを押すだけで実行可能なコマンドです。JSON を入力する必要はありません。

| コマンド | 説明 | 応答例 |
| :--- | :--- | :--- |
| `help` | サポートされているプレーンテキストコマンド一覧を取得 | `{"status": "ok", "help": ["get_config", "set_config", "version", "calibrate", "monitor_on", "monitor_off", "enter_maintenance", "reboot"]}` |
| `version` | ファームウェアバージョンを取得 | `{"status": "ok", "cmd": "version", "version": "1.9.0"}` |
| `calibrate` | スティックの原点を補正 | `{"status": "ok", "cmd": "calibrate", "center": [32768, 32768]}` |
| `monitor_on` | テレメトリのストリーミングを開始 | `{"status": "ok", "monitor": true}` |
| `monitor_off` | テレメトリのストリーミングを停止 | `{"status": "ok", "monitor": false}` |
| `enter_maintenance` | メンテナンスモード（USBドライブ表示）で再起動 | `{"status": "ok", "cmd": "enter_maintenance", ...}` |
| `reboot` | 通常モードで再起動 | `{"status": "ok", "cmd": "reboot", ...}` |

---

## 6. 非同期イベント & テレメトリ仕様

### 6.1 テレメトリストリーミング (`type: "telemetry"`)

`monitor: true` または `monitor_on` 実行時に、コントローラのメインループから最大約 30Hz（約 33ms 間隔）で非同期送信されます。

```json
{
  "type": "telemetry",
  "raw": [32768, 32768],
  "dx": 0,
  "dy": 0,
  "states": {
    "up": "idle",
    "down": "idle",
    "left": "idle",
    "right": "idle"
  },
  "keys": [],
  "btns": [0, 9],
  "mode": "keyboard",
  "direction_mode": "8way",
  "current_4way_dir": null,
  "gamepad": [0, 0, 0, 0, 0],
  "gamepad_stage": "neutral",
  "gamepad_target": "left_stick",
  "mouse": [0, 0]
}
```

#### テレメトリ各フィールド仕様

| フィールド | 型 | 説明 |
| :--- | :---: | :--- |
| `type` | `string` | `"telemetry"` 固定 |
| `raw` | `[number, number]` | スティック実機 ADC 生値 `[X (0〜65535), Y (0〜65535)]` |
| `dx` | `number` | キャリブレーション中心・回転・反転補正後の X 変位量（`-32768` 〜 `+32767`） |
| `dy` | `number` | キャリブレーション中心・回転・反転補正後の Y 変位量（`-32768` 〜 `+32767`） |
| `states` | `object` | 4方向の多段階判定状態。各方向は `"idle"`, `"walk"`, `"run"` のいずれか |
| `keys` | `array<string>` | 現在 HID キーボードとして押下出力されているキー一覧（例: `["W", "Shift"]`） |
| `btns` | `array<number>` | 現在物理的に押下されているボタンスイッチのインデックス番号配列（`0` 〜 `12`） |
| `mode` | `string` | スティックの現在の動作モード（`"keyboard"`, `"gamepad"`, `"mouse"`） |
| `direction_mode` | `string` | スティックの制限モード（`"8way"`, `"4way_snap"`, `"4way_strict"`） |
| `current_4way_dir` | `string \| null` | 4方向制限モードで現在選択されている主方向（`"up"`, `"down"`, `"left"`, `"right"` または `null`） |
| `gamepad` | `array<number>` | ゲームパッド出力値 `[X, Y, Z, Rz, Hat]` |
| `gamepad_stage` | `string` | ゲームパッド状態（`"neutral"`, `"walk"`, `"run"`） |
| `gamepad_target` | `string` | 出力先ターゲット軸（`"left_stick"`, `"right_stick"`, `"dpad"`） |
| `mouse` | `[number, number]` | 出力された相対マウス移動量 `[vx, vy]` |

---

### 6.2 デバイス側プロファイル切替通知 (`type: "profile_switched"`)

コントローラの物理ボタンや同時押しコンボに `profile_next`, `profile_prev`, `profile_switch:<id>` 等のアクションが割り当てられており、ユーザーがデバイス操作でプロファイルを切り替えた瞬間に WebUI へ自動通知されます。

```json
{
  "type": "profile_switched",
  "active_profile": 1,
  "id": "prof_gamepad_default",
  "name": "プロファイル 2 (ゲームパッド)"
}
```

* `active_profile`: デバイス内で有効化されたプロファイルのインデックス（0始まり）
* `id`: プロファイルの一意識別子
* `name`: プロファイルの表示名

---

## 7. エラーハンドリング仕様

リクエストの処理中に異常が発生した場合、ファームウェアは即座に以下の形式でエラーレスポンスを返送します。

```json
{
  "status": "error",
  "message": "具体的なエラー理由"
}
```

### 想定されるエラーケースとメッセージ一覧

| 原因 | 返送メッセージ例 | 対処方法 |
| :--- | :--- | :--- |
| **未定義コマンド** | `Unknown command: foo` | 正しいコマンド名（`get_config`, `set_config` 等）を指定する |
| **JSONパース失敗** | `Expecting property name enclosed in double quotes: ...` | 有効な改行区切り JSON 形式で送信する |
| **NVM容量制限超過** | `NVM容量不足: 必要 XXXX bytes / 空き 4092 bytes` | プロファイルをスリム化するか、Flash直接保存（`config.json`）を利用する |
| **ストレージ書込不可** | `[WARN] 内蔵ストレージ保存エラー: Read-only filesystem` | メンテナンスモード（PCマウント中）のためファイル書き込み不可。NVMへ自動保存されます |
| **ブートフラグ設定失敗** | `Failed to set maintenance boot flag` | NVMアクセス異常。マイコンを電源再投入して確認 |

---

## 8. 仕様改定履歴 (Revision History)

| バージョン | 改定日 | 改定内容 |
| :--- | :--- | :--- |
| **v1.9.0** | 2026-10-20 | ・ファームウェアバージョン v1.9.0 に更新<br>・設定ペイロードの joystick オブジェクトに通常域上限比率 `mouse_walk_ratio` (0.10〜0.90) および連続値加速カーブ `mouse_curve` (1.00〜3.00) を追加 |
| **v1.8.0** | 2026-10-20 | ・本シリアルプロトコル仕様書の新規初版作成<br>・メンテナンスモード移行コマンド（`enter_maintenance`）および通常再起動（`reboot`）の追加<br>・NVM末尾4バイトブートフラグ制御仕様の策定<br>・プレーンテキストCLIコマンド仕様およびテレメトリ完全スキーマの明文化 |
