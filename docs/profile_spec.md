# 左手デバイス プロファイル・設定フォーマット仕様書

本ドキュメントは、Waveshare RP2040-Zero 搭載左手デバイスファームウェア（**v1.7.0 以降**）における設定データ構造およびプロファイル（Profile）のフォーマット仕様を定めた技術リファレンスです。

---

## 1. 基本設計方針とアーキテクチャ

### 1.1 論理設定とハードウェア配線の完全分離 (v1.2.0〜)
従来（v1.1.0 以前）は設定データ内に GPIO ピン番号情報が含まれていましたが、**v1.2.0 よりハードウェア配線情報（GPIO ピン番号）を設定ファイルおよびプロファイルから完全に分離・排除**しました。

* **ハードウェアピン定義:** 基板固定の物理仕様としてファームウェア内部（`HARDWARE_BUTTON_PINS`, `HARDWARE_ADC_X`, `HARDWARE_ADC_Y`）に定数化。
* **プロファイル情報:** 「どのボタンにどのキーを割り当てるか」「スティックをどのように動作させるか」という**純粋な論理設定のみを保持**。
* **メリット:** 
  * プロファイルの追加・複製・インポート・エクスポート時に配線設定が破壊されるリスクがゼロ。
  * WebUI や他環境間でプロファイル設定（JSON）を安全に共有・移行可能。

### 1.2 マルチプロファイル管理 & 一意ID (v1.4.0〜)
1つの設定ファイル（`config.json`）内に複数のプロファイルオブジェクトを保持し、`active_profile` インデックスによってオンザフライ（再起動不要）で切り替えが可能です。
さらに各プロファイルに一意の識別子（`id`: `prof_xxx`）を付与し、WebUIとの同期やURLパラメータ共有時の重複防止を強化しました。

### 1.3 デバイス内プロファイル切替 & オンボードLED連携 (v1.5.0〜)
* **ハードウェア切り替え:** ボタン割り当てに `profile_next`, `profile_prev`, `profile_default`, `profile_switch:<id>` を設定することで、PCレスで瞬時にプロファイルを切り替え可能（RAM上での切り替えのためFlash書き換え寿命を消費しません）。
* **オンボードLED連携:** 切替時にオンボードRGB LED（WS2812）がプロファイル固有色でパルス発光。

### 1.4 内蔵Flashストレージ永続化 & 高度な入力拡張 (v1.6.0〜)
* **Flashストレージ (config.json) への直接永続化:** 4KB NVM制限を撤廃し、マイコン内蔵Flash上の `config.json` をプライマリストレージとして保存。約1.4MBの広大な容量により多数のプロファイルを余裕を持ってマイコンへ保持可能。
* **メンテナンスモード連携:** PCへUSBマウント時に PC 上で `config.json` を直接手動編集・バックアップ可能。
* **同時押しコンボ (Combos):** 2ボタンの同時押し（例: 側面上＋側面下長押しでプロファイル切替）に対応。
* **長押し・短押し判定 (Tap-Hold):** ボタンの短押し（Tap）と長押し（Hold: 一定時間押下で別アクション発火）に対応。
* **Fnレイヤー (Fn Layer):** `layer:fn` を割り当てたボタンを押している間だけ切り替わるモーメンタリ（Momentary）方式のセカンダリキーバインド層（`fn_buttons`）に対応。

### 1.5 マウス加速カーブ & Runブースト連動・LEDカラー指定 (v1.7.0〜)
* **マウス加速カーブ (`mouse_curve`):** リニア（1.0）、スムーズ（1.5 / デフォルト）、急加速（2.0）から選択可能。
* **マウス深倒し加速 (Runブースト):** スティックのRun有効設定とキーボード共通のRun閾値（`th_run`）に連動し、75〜80%以上倒すと最高速度へ急加速。無効時は約55%速度上限で精密エイムを保護。
* **プロファイルLEDカラー指定 (`color`):** WebUIのカラーピッカーから各プロファイル切替時のLED発光色（`#RRGGBB`）を直感的にカスタマイズ可能（RP2040-ZeroのGRB物理配線補正済み）。

---

## 2. 全体データ構造 (Root Config Schema)

設定データのルートオブジェクトは以下のフィールドで構成されます。

```json
{
  "version": "1.7.0",
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
| :--- | :--- | :--- | :--- | :--- |
| `version` | `string` | ○ | `"1.7.0"` | 設定フォーマットのセマンティックバージョン。 |
| `active_profile` | `number` | ○ | `0` | 現在有効化されているプロファイルのインデックス（0始まり）。 |
| `profiles` | `array` | ○ | 3つの初期プリセット | プロファイルオブジェクトの配列（最低1件以上）。 |
| `keymap` | `object` | ○ | - | 現在アクティブなプロファイルの `keymap` 設定。起動時・旧バージョン互換用に保持。 |
| `joystick` | `object` | ○ | - | 現在アクティブなプロファイルの `joystick` 設定。起動時・旧バージョン互換用に保持。 |

> [!NOTE]
> デバイスや WebUI でプロファイルを切り替えた際、ルート直下の `keymap` および `joystick` は選択された `profiles[active_profile]` の内容と自動同期されます。

---

## 3. プロファイルオブジェクト仕様 (Profile Object)

各プロファイルは `id`, `name`, `color`, `device_sync`, `keymap`, `joystick` の要素で構成されます。

```json
{
  "id": "prof_fps_default",
  "name": "プロファイル 1 (FPS/汎用)",
  "color": "#008cff",
  "device_sync": true,
  "keymap": {
    "buttons": [
      "1", "2", "x", "e", "Tab", "f", "q", "4", "3",
      "Space", "z", "LCtrl", "LAlt"
    ],
    "fn_buttons": [
      "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9",
      "Space", "z", "LCtrl", "LAlt"
    ],
    "combos": [
      { "buttons": [9, 11], "action": "profile_next", "hold_ms": 600 }
    ]
  },
  "joystick": {
    "mode": "keyboard",
    "direction_mode": "8way",
    "enable_run": true,
    "gamepad_target": "left_stick",
    "dpad_walk_btn": "",
    "dpad_run_btn": "Gamepad_2",
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

### 3.1 `id`, `name`, `color`, `device_sync` フィールド
* **`id`** (`string`): プロファイルの一意識別子（例: `"prof_fps_default"`）。`profile_switch:<id>` によるダイレクト切り替えや共有URLインポート時の識別に使用されます。
* **`name`** (`string`): プロファイルの表示名。WebUI のドロップダウン選択肢やログ出力で使用されます（例: `"プロファイル 1 (FPS/汎用)"`）。
* **`color`** (`string`, 省略可): プロファイル切替時のオンボードRGB LED（WS2812）発光色（7文字の16進数カラーコード `"#RRGGBB"`、例: `"#008cff"`）。プロファイル切り替え時に指定色でパルス点滅し、通常点灯色としても保持されます。省略時はプロファイル番号順のデフォルトカラーパレット（青、緑、紫、橙/黄、水色、赤）が自動割り当てされます。WebUI のプロファイル一覧から直感的にカラーピッカーで指定・変更できます。
* **`device_sync`** (`boolean`, 省略時 `true`): マイコンへの転送対象フラグ。`false` に設定するとブラウザ（`localStorage`）上にのみ保管され、マイコンへの送信ペイロードから除外されます（ただし現在アクティブなプロファイルや `profile_switch:<id>` で参照されているプロファイルは強制的に同期されます）。

---

### 3.2 `keymap` オブジェクト
コントローラの物理スイッチ（13ボタン）の通常レイヤー、Fn裏面レイヤー、および2ボタン同時押しコンボを管理します。

```json
"keymap": {
  "buttons": [ ... ],
  "fn_buttons": [ ... ],
  "combos": [ ... ]
}
```

#### `buttons` / `fn_buttons` 配列
* **型:** `Array<string | Array<string> | object>`
* **要素数:** 固定 **13個**（`buttons`: 通常レイヤー、`fn_buttons`: `layer:fn` ボタン押下中に有効となるFnレイヤー）
* **各要素の指定形式:**
  1. **単一キー/アクション（文字列）:** `"1"`, `"Space"`, `"LCtrl"`, `"Mouse_Left"`, `"Gamepad_1"`, `"profile_next"`, `"layer:fn"` など
  2. **複数キー同時押し（文字列配列 または カンマ区切り文字列）:** `["Shift", "W"]`, `["LCtrl", "c"]` または `"LCtrl, c"`
  3. **短押し・長押し (Tap-Hold) 定義:**
     * **パイプ区切り文字列形式:** `"tap:Space|hold:LCtrl|ms:300"`（`ms:` 省略時はデフォルト `300` ms）
     * **オブジェクト形式:** `{"tap": "Space", "hold": "LCtrl", "hold_ms": 300}`
  4. **未割当・無効:** `""` (空文字) または `"None"`

#### `combos` 配列（2ボタン同時押しコンボ）
* **型:** `Array<object>`（省略可）
* **各要素のプロパティ:**
  * `buttons`: `[number, number]` — 同時押しする2つのボタンインデックス（`0` 〜 `12` の相異なる整数2つ）。構成ボタンが同時に押されている間、単体ボタンとしての出力は自動的にマスク（抑制）されます。
  * `action`: `string | Array<string>` — 発動するキーまたはアクション（例: `"profile_next"`, `"Escape"`, `["LCtrl", "Shift", "Tab"]`）。
  * `hold_ms`: `number` — 同時押し継続判定時間（ミリ秒、省略時 `0` = 即時発動）。

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
2軸アナログスティックの動作モード、感度、回転補正、ターゲット軸、閾値設定を管理します。

| プロパティ | 型 | 許容値 / 範囲 | デフォルト値 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `mode` | `string` | `"keyboard"`, `"gamepad"`, `"mouse"` | `"keyboard"` | スティックの出力エミュレーションモード。 |
| `direction_mode` | `string` | `"8way"`, `"4way_snap"`, `"4way_strict"` | `"8way"` | 斜め入力防止・方向制限モード。 |
| `enable_run` | `boolean` | `true`, `false` | `true` | スティックのRun（走り/2段階目入力/マウス深倒し加速）の有効化。<br>・キーボード/DPAD: `false`時は深倒ししても常にWalkのみ。<br>・マウス: `true`時は設定されたRun閾値（`th_run`）以上深倒しで最高速へ急加速(ブースト)。`false`時は全域でWalk上限(約55%速度)に抑制し、精密エイムを優先。 |
| `gamepad_target` | `string` | `"left_stick"`, `"right_stick"`, `"dpad"`, `"z_axis"` | `"left_stick"` | ゲームパッドモード時の割り当て先軸・ハット。 |
| `dpad_walk_btn` | `string` | ボタン・キー識別子 | `""` | DPADターゲット時のWalk（浅倒し時）追加連動ボタン（逆パターン/スニーク対応）。 |
| `dpad_run_btn` | `string` | ボタン・キー識別子 | `"Gamepad_2"` | DPADターゲット時のRun（深倒し時）追加連動ボタン（ダッシュ・Bダッシュ等）。 |
| `mouse_speed` | `number` | `2` 〜 `30` (整数) | `12` | マウスモード時のカーソル最高移動速度（感度）。 |
| `mouse_curve` | `string` | `"linear"`, `"smooth"`, `"aggressive"` | `"smooth"` | マウスモード時のレスポンス（加速）カーブ指数。`linear`(1.0), `smooth`(1.5), `aggressive`(2.0)。 |
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
   * `enable_run` が `false` の場合は、最大まで倒しても Run キーは押されず Walk キーが維持されます。
   * 斜め入力時は2軸（例: 前 + 右）が合成され、8方向移動が可能。
2. **`"gamepad"` (ゲームパッド出力):**
   * `gamepad_target` の設定により、以下のターゲットへディスパッチされます:
     * **`"left_stick"`:** 左スティック（X軸, Y軸: `-127` 〜 `127`）。
     * **`"right_stick"`:** 右スティック（Z軸, Rz軸: `-127` 〜 `127`、カメラ操作向け）。
     * **`"dpad"`:** ハットスイッチ（Hat: 0=中立, 1=上, 2=右上, 3=右, 4=右下, 5=下, 6=左下, 7=左, 8=左上）。
       * 4方向スナップと組み合わせることで完全な4方向ハットスイッチ動作が可能。
       * `dpad_run_btn`（深倒し時）や `dpad_walk_btn`（浅倒し時）を連動ボタンとして同時送信可能（Bダッシュやスニーク歩き等）。
     * **`"z_axis"`:** DirectInput Z / Rz 軸。
3. **`"mouse"` (マウスポインタ移動):**
   * スティックの倒し角と傾き量に応じた速度カーブでマウスカーソルを移動。
   * **マウスレスポンスカーブ (`mouse_curve`):**
     * `"linear"` (1.0): 倒し込み量に一定比例。
     * `"smooth"` (1.5, デフォルト): 浅倒し時の微小操作が繊細で滑らか。
     * `"aggressive"` (2.0): 浅倒し時の超精密エイムと端まで倒したときの一気な高速移動を両立。
   * **Runブースト・深倒し加速 (`enable_run`):**
     * `true` (デフォルト): スティック傾きがキーボード共通のRun閾値（`th_run`、初期値26000 = 約78%倒し）未満では Walk 速度域（最高速の約55%）で繊細にコントロールでき、`th_run` を超えて深倒しすると一気に `mouse_speed`（最高速 100%）へブースト急加速。WebUI上のスライダーでブースト開始点を自在に微調整可能。
     * `false`: 最大まで倒しても Walk 速度上限（約55%）に頭打ちされ、急激な飛び出しを防いで精密エイムに専念可能。
   * **サブピクセル端数蓄積:**
     * 毎フレームの移動量計算で生じる1ピクセル未満の端数を内部保持・キャリーオーバーすることで、低速エイムや微小操作時でも引っかかりのない滑らかなカーソル挙動を実現。

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

### 5.7 プロファイル切替・レイヤー制御・高度入力書式
* **プロファイル切替アクション:**
  * `profile_next` (または `prof_next`, `next_profile`): 次のプロファイルへ循環切り替え
  * `profile_prev` (または `prof_prev`, `prev_profile`): 前のプロファイルへ循環切り替え
  * `profile_default` (または `prof_default`, `default_profile`): 初期プロファイル（インデックス `0`）へ復帰
  * `profile_switch:<IDまたは名前>` (または `prof_switch:<ID>`): 指定したプロファイルID（例: `profile_switch:prof_gamepad_default`）へ直接切り替え
* **Fnレイヤー切り替え:**
  * `layer:fn` (または `fn`, `fn_layer`): 押している間だけ `keymap.fn_buttons` の割り当てを有効化（モーメンタリ動作）
* **短押し・長押し (Tap-Hold) 書式:**
  * `tap:<短押しアクション>|hold:<長押しアクション>|ms:<長押し判定ミリ秒>`（例: `tap:Space|hold:LCtrl|ms:300`）

---

## 6. プロファイル初期プリセット例

ファームウェアおよび WebUI に標準同梱されている3つの初期プロファイル構成です。

```json
[
  {
    "id": "prof_fps_default",
    "name": "プロファイル 1 (FPS/汎用)",
    "keymap": {
      "buttons": ["1", "2", "x", "e", "Tab", "f", "q", "4", "3", "Space", "z", "LCtrl", "LAlt"],
      "combos": [
        { "buttons": [9, 11], "action": "profile_next", "hold_ms": 600 }
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
  },
  {
    "id": "prof_gamepad_default",
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
    "id": "prof_mouse_default",
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

### 7.1 マイコン内蔵 Flash ストレージ (`config.json` プライマリ + `microcontroller.nvm` バックアップ)
* **メイン保存先 (`config.json`):** 通常運用モードでは `boot.py` により `CIRCUITPY` ドライブの PC マウントが無効化され、マイコン側からのファイルシステム書き込みが許可されます（総容量 約1.4MB）。`load_config()` 時も `config.json` が最優先で読み込まれるため、メンテナンスモードで PC から直接 `config.json` を編集した場合も即座に反映されます。
* **サブ保存先 (`microcontroller.nvm`):** メンテナンスモード（PC が USB マスストレージとしてマウント中でファイルシステムが Read-Only の状態）でも設定保存を可能にするため、ペイロードが 4,096 bytes 以内に収まる場合は RP2040 内蔵 EEPROM 領域（`microcontroller.nvm`）へもバックアップ保存されます。
  * **ヘッダ:** `LFTY1` (5バイトマジックヘッダ) + ペイロード長 (2バイト Big-Endian)
  * **ボディ:** UTF-8 エンコードされた JSON 文字列

### 7.2 Web Serial API 通信プロトコル (JSON Lines)
ブラウザ上の WebUI とファームウェア間で改行区切り JSON として送受信されるコマンドおよび非同期イベントです。

* **設定取得 (`get_config`):**
  ```json
  {"cmd": "get_config"}
  ```
  ファームウェアから `{"status": "ok", "cmd": "get_config", "version": "1.7.0", "config": { ... }, "storage": { ... }, "nvm": { ... }}` が返送されます。
* **設定反映 (`set_config`):**
  ```json
  {"cmd": "set_config", "config": { ... }}
  ```
  ファームウェアが即時にメモリ上へ反映（Hot Reload）し、`config.json`（および4KB以内の場合は NVM）へ永続化します。
* **設定初期化 (`reset_config`):**
  ```json
  {"cmd": "reset_config"}
  ```
  NVM および `config.json` を出荷時初期設定（`DEFAULT_CONFIG`）にリセットします。
* **ゼロ点キャリブレーション (`calibrate`):**
  ```json
  {"cmd": "calibrate"}
  ```
  実機の ADC を再サンプリングしてスティックの中心座標を更新し、`{"status": "ok", "cmd": "calibrate", "center": [cx, cy]}` を返送します。
* **リアルタイムモニタリング切替 (`monitor`):**
  ```json
  {"cmd": "monitor", "enable": true}
  ```
  有効化中（最大約30Hz）は `{"type": "telemetry", "raw": [rx, ry], "dx": dx, "dy": dy, "states": {...}, "keys": [...], "btns": [...]}` をストリーミング送信します。
* **ストレージ・バージョン・疎通確認 (`storage_status` / `nvm_status` / `version` / `ping`):**
  ストレージ空き容量やファームウェアバージョンの取得、疎通確認（`pong` 応答）を行います。
* **デバイス側プロファイル切替通知イベント (`profile_switched`):**
  物理ボタンやコンボ操作によってデバイス上でプロファイルが切り替わった際、`{"type": "profile_switched", "active_profile": idx, "id": "...", "name": "..."}` が WebUI へ非同期通知されます。

### 7.3 ブラウザ側 localStorage と JSON エクスポート / インポート
* WebUI では操作内容がブラウザの `localStorage` に常時自動キャッシュされます。
* 「JSONエクスポート」で保存される `.json` ファイルは本仕様書のルート設定オブジェクトに準拠しており、別ブラウザや別PCの「JSONインポート」からそのまま復元可能です。

---

## 8. 下位互換性ルールとマイグレーション

1. **旧バージョン（v1.0 / v1.1）からの移行:**
   * 旧設定 JSON に `pins` フィールドが含まれている場合、ファームウェア（`config_store.py` の `sanitize_config`）および WebUI（`app.js` の `ensureProfiles`）によって**自動的に検出・除去（クレンジング）**されます。
2. **パラメータ欠落時のフォールバック保証:**
   * 外部からインポートされたプロファイルに一部のパラメータ（例: `direction_mode` や `rotation`）が存在しない場合でも、WebUI およびファームウェアが安全なデフォルト値（`rotation: 90`, `invert: false`, `direction_mode: "8way"`）を自動補完して適用します。
