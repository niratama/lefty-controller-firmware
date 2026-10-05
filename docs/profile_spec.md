# 左手デバイス プロファイル・設定フォーマット仕様書

本ドキュメントは、Waveshare RP2040-Zero 搭載左手デバイスファームウェア（**v1.2.0 以降**）における設定データ構造およびプロファイル（Profile）のフォーマット仕様を定めた技術リファレンスです。

---

## 1. 基本設計方針とアーキテクチャ

### 1.1 論理設定とハードウェア配線の完全分離 (v1.2.0〜)
従来（v1.1.0 以前）は設定データ内に GPIO ピン番号情報が含まれていましたが、**v1.2.0 よりハードウェア配線情報（GPIO ピン番号）を設定ファイルおよびプロファイルから完全に分離・排除**しました。

* **ハードウェアピン定義:** 基板固定の物理仕様としてファームウェア内部（`HARDWARE_BUTTON_PINS`, `HARDWARE_ADC_X`, `HARDWARE_ADC_Y`）に定数化。
* **プロファイル情報:** 「どのボタンにどのキーを割り当てるか」「スティックをどのように動作させるか」という**純粋な論理設定のみを保持**。
* **メリット:** 
  * プロファイルの追加・複製・インポート・エクスポート時に配線設定が破壊されるリスクがゼロ。
  * WebUI や他環境間でプロファイル設定（JSON）を安全に共有・移行可能。

### 1.2 マルチプロファイル管理
1つの設定ファイル（`config.json`）内に複数のプロファイルオブジェクトを保持し、`active_profile` インデックスによってオンザフライ（再起動不要）で切り替えが可能です。

---

## 2. 全体データ構造 (Root Config Schema)

設定データのルートオブジェクトは以下のフィールドで構成されます。

```json
{
  "version": "1.2.0",
  "active_profile": 0,
  "profiles": [
    { /* プロファイル 0 オブジェクト */ },
    { /* プロファイル 1 オブジェクト */ },
    { /* プロファイル 2 オブジェクト */ }
  ],
  "keymap": { /* 現在アクティブなプロファイルの keymap (互換用スナップショット) */ },
  "joystick": { /* 現在アクティブなプロファイルの joystick (互換用スナップショット) */ }
}
```

### トップレベルフィールド定義

| フィールド | 型 | 必須 | デフォルト値 | 説明 |
| :--- | :--- | :---: | :--- | :--- |
| `version` | `string` | ○ | `"1.2.0"` | 設定フォーマットのセマンティックバージョン。 |
| `active_profile` | `number` | ○ | `0` | 現在有効化されているプロファイルのインデックス（0始まり）。 |
| `profiles` | `array` | ○ | 3つの初期プリセット | プロファイルオブジェクトの配列（最低1件以上）。 |
| `keymap` | `object` | ○ | - | 現在アクティブなプロファイルの `keymap` 設定。起動時・旧バージョン互換用に保持。 |
| `joystick` | `object` | ○ | - | 現在アクティブなプロファイルの `joystick` 設定。起動時・旧バージョン互換用に保持。 |

> [!NOTE]
> デバイスや WebUI でプロファイルを切り替えた際、ルート直下の `keymap` および `joystick` は選択された `profiles[active_profile]` の内容と自動同期されます。

---

## 3. プロファイルオブジェクト仕様 (Profile Object)

各プロファイルは `name`, `keymap`, `joystick` の3要素で構成されます。

```json
{
  "name": "プロファイル 1 (FPS/汎用)",
  "keymap": {
    "buttons": [
      "1", "2", "x", "e", "Tab", "f", "q", "4", "3",
      "Space", "z", "LCtrl", "LAlt"
    ]
  },
  "joystick": {
    "mode": "keyboard",
    "direction_mode": "8way",
    "mouse_speed": 12,
    "deadzone": 2500,
    "hysteresis": 1500,
    "invert_x": false,
    "invert_y": false,
    "rotation": 90,
    "directions": {
      "up":    { "th_walk": 3000, "th_run": 26000, "key_walk": "W", "key_run": ["Shift", "W"] },
      "down":  { "th_walk": 3000, "th_run": 26000, "key_walk": "S", "key_run": ["Shift", "S"] },
      "left":  { "th_walk": 3000, "th_run": 26000, "key_walk": "A", "key_run": ["Shift", "A"] },
      "right": { "th_walk": 3000, "th_run": 26000, "key_walk": "D", "key_run": ["Shift", "D"] }
    }
  }
}
```

---

### 3.1 `name` フィールド
* **型:** `string`
* **説明:** プロファイルの表示名。WebUI のドロップダウン選択肢やログ出力で使用されます。
* **例:** `"プロファイル 1 (FPS/汎用)"`, `"APEX Legends"`, `"Blender作業用"`

---

### 3.2 `keymap` オブジェクト
コントローラの物理スイッチ（13ボタン）のキー割り当てを管理します。

```json
"keymap": {
  "buttons": [ ... ]
}
```

#### `buttons` 配列
* **型:** `Array<string | Array<string>>`
* **要素数:** 固定 **13個**
* **各要素の指定形式:**
  1. **単一キー/アクション（文字列）:** `"1"`, `"Space"`, `"LCtrl"`, `"Mouse_Left"`, `"Gamepad_1"` など
  2. **同時押しコンボ（文字列配列）:** `["Shift", "W"]`, `["LCtrl", "c"]` など（WebUI ではカンマ区切り `LCtrl, c` と相互変換）
  3. **未割当・無効:** `""` (空文字) または `"None"`

#### 物理ボタンと配列インデックスの対応表

| Index | 接続GPIO | スイッチ記号 | 物理ラベル | 主な推奨用途 / 初期設定 |
| :---: | :---: | :---: | :---: | :--- |
| **0** | GP0 | SW1 | `1` | メイン前面ボタンスイッチ 1 |
| **1** | GP1 | SW2 | `2` | メイン前面ボタンスイッチ 2 |
| **2** | GP2 | SW3 | `X` | メイン前面ボタンスイッチ 3 |
| **3** | GP3 | SW4 | `E` | メイン前面ボタンスイッチ 4 |
| **4** | GP4 | SW5 | `Ta` | メイン前面ボタンスイッチ 5 (`Tab`) |
| **5** | GP5 | SW6 | `F` | メイン前面ボタンスイッチ 6 |
| **6** | GP6 | SW7 | `Q` | メイン前面ボタンスイッチ 7 |
| **7** | GP7 | SW8 | `4` | メイン前面ボタンスイッチ 8 |
| **8** | GP8 | SW9 | `3` | メイン前面ボタンスイッチ 9 |
| **9** | **GP11** | SW10 | 側面上 | 側面トリガー 上 (`Space` / ジャンプ) |
| **10** | **GP9** | SW11 | 側面中 | 側面トリガー 中 (`z` / しゃがみ・伏せ) |
| **11** | **GP10** | SW12 | 側面下 | 側面トリガー 下 (`LCtrl` / スニーク) |
| **12** | **GP12** | SW_STK | STK | スティック押し込みスイッチ (`LAlt` / ピン・ダッシュ) |

> [!IMPORTANT]
> 配線変更により、側面ボタンスイッチの物理接続ピンは **側面上=GP11 (Index 9)**、**側面中=GP9 (Index 10)**、**側面下=GP10 (Index 11)** となっています。プロファイルの配列インデックスは常に上記対応表の通り固定です。

---

### 3.3 `joystick` オブジェクト
2軸アナログスティックの動作モード、感度、回転補正、閾値設定を管理します。

| プロパティ | 型 | 許容値 / 範囲 | デフォルト値 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `mode` | `string` | `"keyboard"`, `"gamepad"`, `"mouse"` | `"keyboard"` | スティックの出力エミュレーションモード。 |
| `direction_mode` | `string` | `"8way"`, `"4way_snap"`, `"4way_strict"` | `"8way"` | 斜め入力防止・方向制限モード。 |
| `mouse_speed` | `number` | `2` 〜 `30` (整数) | `12` | マウスモード時のカーソル最高移動速度（感度）。 |
| `deadzone` | `number` | `500` 〜 `10000` (整数) | `2500` | 中心付近の不感帯（遊び）。ノイズによる微小ドリフトを防止。 |
| `hysteresis` | `number` | `200` 〜 `5000` (整数) | `1500` | 判定境界のチャタリング防止ヒステリシス幅。 |
| `rotation` | `number` | `0`, `90`, `180`, `270` | `90` | **取付角度回転補正**。本デバイスの標準取付時は `90`。 |
| `invert_x` | `boolean` | `true`, `false` | `false` | X軸（左右方向）の反転フラグ。 |
| `invert_y` | `boolean` | `true`, `false` | `false` | Y軸（前後方向）の反転フラグ。 |
| `directions` | `object` | `up`, `down`, `left`, `right` | 下記参照 | キーボードモード時の4方向別閾値および押下キー。 |

#### `directions` オブジェクト詳細（各方向 `up`, `down`, `left`, `right`）

| プロパティ | 型 | 許容範囲 | デフォルト値 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `th_walk` | `number` | `1000` 〜 `32000` | `3000` | Walk（歩き）判定の開始閾値。 |
| `th_run` | `number` | `1000` 〜 `32000` | `26000` | Run（走り）判定の開始閾値。 |
| `key_walk` | `string \| Array<string>` | キー識別子 | `"W"`, `"S"`, `"A"`, `"D"` | 浅倒し（Walk）時に送出するキー。 |
| `key_run` | `string \| Array<string>` | キー識別子 | `["Shift", "W"]` 等 | 深倒し（Run）時に送出するキー（同時押し対応）。 |

---

## 4. スティック動作モードと方向制限の仕様

### 4.1 動作モード (`mode`)
1. **`"keyboard"` (キーボード多段階入力):**
   * スティックの傾き量に応じて Walk キー（浅倒し）または Run キー（深倒し）を送信。
   * 斜め入力時は2軸（例: 前 + 右）が合成され、8方向移動が可能。
2. **`"gamepad"` (アナログスティック):**
   * スティックの傾き量と角度を正規化アナログ値（X軸, Y軸: `-127` 〜 `127`）として送信。
   * DirectInput ゲームパッド標準のアナログジョイスティックとして認識。
3. **`"mouse"` (マウスポインタ移動):**
   * スティックの倒し角と傾き量に応じた速度カーブでマウスカーソルを移動。
   * `mouse_speed` で最高速度（感度）を制御。

### 4.2 方向入力制限 (`direction_mode`)
斜め入力時の誤操作を防ぐためのフィルタリング機能です。

* **`"8way"` (標準: 8方向入力):**
  * 斜め入力時に縦横両方のキー／軸を同時に認識します。
* **`"4way_snap"` (推奨: 4方向スナップ):**
  * 斜めに倒された場合でも、最も傾きの大きい直交1方向（上下左右のいずれか）のみを選択して入力します。十字キーやレトロゲーム、武器選択ホイール等で誤入力を完全に防止します。
* **`"4way_strict"` (4方向厳格 / 斜め不感帯):**
  * 完全な直交入力（X軸またはY軸単独）のみを有効とし、対角線領域（斜め）に入った瞬間に全方向をニュートラル化します。

---

## 5. 対応キー・アクション識別子一覧

プロファイルの `keymap.buttons` および `directions` の `key_walk` / `key_run` で使用可能な識別子一覧です（大文字小文字は正規化されて処理されます）。

### 5.1 キーボード（アルファベット・数字・記号）
* **アルファベット:** `A` 〜 `Z`
* **数字:** `0` 〜 `9`
* **記号:** `-`, `=`, `[`, `]`, `\\`, `;`, `'`, `` ` ``, `,`, `.`, `/`

### 5.2 特殊・制御キー
* `Space` (または `Spacebar`)
* `Enter` (または `Return`)
* `Tab`
* `Escape` (または `Esc`)
* `Backspace`
* `Delete` (または `Del`)
* `Insert` (または `Ins`)
* `Home`, `End`
* `PageUp` (または `PgUp`), `PageDown` (または `PgDn`)
* `CapsLock`

### 5.3 修飾キー (Modifiers)
* `Ctrl` / `LCtrl` (左コントロール), `RCtrl` (右コントロール)
* `Shift` / `LShift` (左シフト), `RShift` (右シフト)
* `Alt` / `LAlt` (左オルト), `RAlt` (右オルト)
* `Gui` / `Win` / `LWin` (左 Windows/Command キー), `RGui` (右 Windows/Command キー)

### 5.4 矢印キー・ファンクションキー
* **矢印キー:** `Up`, `Down`, `Left`, `Right`
* **ファンクション:** `F1` 〜 `F12`

### 5.5 マウスアクション
* **ボタンクリック:**
  * `Mouse_Left` (左クリック)
  * `Mouse_Right` (右クリック)
  * `Mouse_Middle` (中クリック / ホイールクリック)
  * `Mouse_Back` (サイドボタン 戻る)
  * `Mouse_Forward` (サイドボタン 進む)
* **スクロールホイール:**
  * `Wheel_Up` (上スクロール)
  * `Wheel_Down` (下スクロール)

### 5.6 ゲームパッドボタン
* **汎用ボタン番号:** `Gamepad_1` 〜 `Gamepad_16`
* **標準エイリアス:**
  * `Gamepad_A` (= 1), `Gamepad_B` (= 2), `Gamepad_X` (= 3), `Gamepad_Y` (= 4)
  * `Gamepad_LB` / `Gamepad_L1` (= 5), `Gamepad_RB` / `Gamepad_R1` (= 6)
  * `Gamepad_LT` / `Gamepad_L2` (= 7), `Gamepad_RT` / `Gamepad_R2` (= 8)
  * `Gamepad_Select` / `Gamepad_Back` (= 9), `Gamepad_Start` (= 10)
  * `Gamepad_L3` / `Gamepad_LS` (= 11), `Gamepad_R3` / `Gamepad_RS` (= 12)

---

## 6. プロファイル初期プリセット例

ファームウェアおよび WebUI に標準同梱されている3つの初期プロファイル構成です。

```json
[
  {
    "name": "プロファイル 1 (FPS/汎用)",
    "keymap": {
      "buttons": ["1", "2", "x", "e", "Tab", "f", "q", "4", "3", "Space", "z", "LCtrl", "LAlt"]
    },
    "joystick": {
      "mode": "keyboard",
      "direction_mode": "8way",
      "mouse_speed": 12,
      "deadzone": 2500,
      "hysteresis": 1500,
      "invert_x": false,
      "invert_y": false,
      "rotation": 90,
      "directions": {
        "up":    { "th_walk": 3000, "th_run": 26000, "key_walk": "W", "key_run": ["Shift", "W"] },
        "down":  { "th_walk": 3000, "th_run": 26000, "key_walk": "S", "key_run": ["Shift", "S"] },
        "left":  { "th_walk": 3000, "th_run": 26000, "key_walk": "A", "key_run": ["Shift", "A"] },
        "right": { "th_walk": 3000, "th_run": 26000, "key_walk": "D", "key_run": ["Shift", "D"] }
      }
    }
  },
  {
    "name": "プロファイル 2 (ゲームパッド)",
    "keymap": {
      "buttons": [
        "Gamepad_1", "Gamepad_2", "Gamepad_3", "Gamepad_4",
        "Gamepad_5", "Gamepad_6", "Gamepad_7", "Gamepad_8",
        "Gamepad_9", "Gamepad_10", "Gamepad_11", "Gamepad_12", "Gamepad_13"
      ]
    },
    "joystick": {
      "mode": "gamepad",
      "direction_mode": "8way",
      "mouse_speed": 12,
      "deadzone": 2500,
      "hysteresis": 1500,
      "invert_x": false,
      "invert_y": false,
      "rotation": 90,
      "directions": {
        "up":    { "th_walk": 3000, "th_run": 26000, "key_walk": "W", "key_run": ["Shift", "W"] },
        "down":  { "th_walk": 3000, "th_run": 26000, "key_walk": "S", "key_run": ["Shift", "S"] },
        "left":  { "th_walk": 3000, "th_run": 26000, "key_walk": "A", "key_run": ["Shift", "A"] },
        "right": { "th_walk": 3000, "th_run": 26000, "key_walk": "D", "key_run": ["Shift", "D"] }
      }
    }
  },
  {
    "name": "プロファイル 3 (マウス & 作業用)",
    "keymap": {
      "buttons": [
        "Mouse_Left", "Mouse_Right", "Mouse_Middle", "Wheel_Up", "Wheel_Down",
        ["LCtrl", "z"], ["LCtrl", "y"], ["LCtrl", "c"], ["LCtrl", "v"],
        "Space", "Tab", "LCtrl", "LAlt"
      ]
    },
    "joystick": {
      "mode": "mouse",
      "direction_mode": "8way",
      "mouse_speed": 12,
      "deadzone": 2500,
      "hysteresis": 1500,
      "invert_x": false,
      "invert_y": false,
      "rotation": 90,
      "directions": {
        "up":    { "th_walk": 3000, "th_run": 26000, "key_walk": "Up", "key_run": ["Shift", "Up"] },
        "down":  { "th_walk": 3000, "th_run": 26000, "key_walk": "Down", "key_run": ["Shift", "Down"] },
        "left":  { "th_walk": 3000, "th_run": 26000, "key_walk": "Left", "key_run": ["Shift", "Left"] },
        "right": { "th_walk": 3000, "th_run": 26000, "key_walk": "Right", "key_run": ["Shift", "Right"] }
      }
    }
  }
]
```

---

## 7. 設定の永続化・同期プロトコル

設定およびプロファイル情報は以下の3系統で管理・同期されます。

### 7.1 マイコン内蔵 Flash (NVM: `microcontroller.nvm`)
CircuitPython が USB マスストレージ接続時にローカルファイルを Read-Only にロックする制約を回避するため、設定の保存時は内蔵 Flash の EEPROM 領域へバイナリ保存されます。
* **ヘッダ:** `LFTY1` (5バイトマジックヘッダ) + ペイロード長 (2バイト Big-Endian)
* **ボディ:** UTF-8 エンコードされた JSON 文字列

### 7.2 Web Serial API 通信プロトコル (JSON Lines)
ブラウザ上の WebUI とファームウェア間で送受信されるコマンドです。

* **設定取得 (`get_config`):**
  ```json
  {"cmd": "get_config"}
  ```
  ファームウェアから `{"status": "ok", "cmd": "get_config", "config": { ... }}` が返送されます。
* **設定反映 (`set_config`):**
  ```json
  {"cmd": "set_config", "config": { ... }}
  ```
  ファームウェアが即時にメモリ上へ反映（Hot Reload）し、NVM（および可能であれば `config.json`）へ永続化します。
* **設定初期化 (`reset_config`):**
  ```json
  {"cmd": "reset_config"}
  ```
  マイコン内蔵 Flash (NVM) のマジックヘッダをクリアし、出荷時初期設定（`DEFAULT_CONFIG`）にリセットします。

### 7.3 ブラウザ側 localStorage と JSON エクスポート / インポート
* WebUI では操作内容がブラウザの `localStorage` に常時自動キャッシュされます。
* 「JSONエクスポート」で保存される `.json` ファイルは本仕様書のルート設定オブジェクトに準拠しており、別ブラウザや別PCの「JSONインポート」からそのまま復元可能です。

---

## 8. 下位互換性ルールとマイグレーション

1. **旧バージョン（v1.0 / v1.1）からの移行:**
   * 旧設定 JSON に `pins` フィールドが含まれている場合、ファームウェア（`config_store.py` の `sanitize_config`）および WebUI（`app.js` の `ensureProfiles`）によって**自動的に検出・除去（クレンジング）**されます。
2. **パラメータ欠落時のフォールバック保証:**
   * 外部からインポートされたプロファイルに一部のパラメータ（例: `direction_mode` や `rotation`）が存在しない場合でも、WebUI およびファームウェアが安全なデフォルト値（`rotation: 90`, `invert: false`, `direction_mode: "8way"`）を自動補完して適用します。
