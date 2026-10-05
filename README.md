# 左手デバイス近代化改修ファームウェア (Waveshare RP2040-Zero)

PIC18F2450（5V系）搭載の既存左手コントローラーを、**Waveshare RP2040-Zero**（3.3V系）に換装してファームウェアを刷新・近代化したプロジェクトです。
13個のボタンスイッチ入力と2軸アナログスティックを備え、**USB Composite Device（Keyboard + Mouse + Gamepad）** として動作します。

キーボードとしての多段階入力（歩き／走り、斜め移動合成）に加え、**アナログゲームパッド（X/Y軸コントローラー）** や **マウス（ポインタ移動・クリック）** としても利用可能で、**Web Serial API によるブラウザ設定ツール** からオンザフライで設定・プロファイル切り替えが行えます。

---

## 1. ハードウェア仕様・ピンアサイン

* **マイコンボード:** Waveshare RP2040-Zero (USB Type-C)
* **スイッチ入力 (13個):** 内蔵プルアップ有効化 / Active Low (押下時GND短絡)
* **アナログスティック (2軸):** RP2040の 3.3V(3V3ピン) と GND に接続 (※5V厳禁)

### ピンアサイン対応表

| ピン番号 | 接続先デバイス | 物理ラベル | 初期キー設定 (Profile 1: キーボード) |
| :--- | :--- | :--- | :--- |
| **GP0** | 前面ボタン 1 (SW1) | `1` | `1` |
| **GP1** | 前面ボタン 2 (SW2) | `2` | `2` |
| **GP2** | 前面ボタン 3 (SW3) | `X` | `x` |
| **GP3** | 前面ボタン 4 (SW4) | `E` | `e` |
| **GP4** | 前面ボタン 5 (SW5) | `Ta` | `Tab` |
| **GP5** | 前面ボタン 6 (SW6) | `F` | `f` |
| **GP6** | 前面ボタン 7 (SW7) | `Q` | `q` |
| **GP7** | 前面ボタン 8 (SW8) | `4` | `4` |
| **GP8** | 前面ボタン 9 (SW9) | `3` | `3` |
| **GP11** | 側面 上 / トリガー 1 (SW10) | 側面上 | `Space` |
| **GP9** | 側面 中 / トリガー 2 (SW11) | 側面中 | `z` |
| **GP10** | 側面 下 / トリガー 3 (SW12) | 側面下 | `LCtrl` |
| **GP12** | スティック押し込み (SW_STK) | STK | `LAlt` |
| **GP27** | スティック X軸 (ADC1) | - | 左右方向 (Left: `A`, Right: `D` / 走り時は `Shift` 追加) |
| **GP26** | スティック Y軸 (ADC0) | - | 前後方向 (Up: `W`, Down: `S` / 走り時は `Shift` 追加) |
| **3V3 / GND**| スティック電源 / 各SWコモン | - | 3.3V 電源 / 共通グランド |

---

## 2. ディレクトリ構成

```text
lefty-controller-firmware/
├── firmware/                  # RP2040-Zero に書き込むファームウェア一式
│   ├── boot.py                # USB Composite HID (Keyboard + Mouse + Gamepad) 構成
│   ├── code.py                # メインプログラム (スキャンループ・通信・HIDディスパッチ)
│   ├── hid_keyboard.py        # 外部依存ゼロのネイティブHIDキーボードドライバ
│   ├── hid_mouse.py           # 外部依存ゼロのネイティブHIDマウスドライバ
│   ├── hid_gamepad.py         # 外部依存ゼロのネイティブHIDゲームパッドドライバ
│   ├── stick_engine.py        # スティック判定エンジン (WASD多段判定 / アナログ軸 / マウス移動)
│   ├── debouncer.py           # 13ボタンの高速デバウンス処理 (Eager Debounce)
│   ├── key_mapper.py          # キーボード/マウス/ゲームパッド入力文字列パース
│   ├── serial_handler.py      # Web Serial API 連携・JSONプロトコルハンドラ
│   ├── diagnostic.py          # 導通テスト & ADCプロファイリングツール
│   └── config.json            # 動作設定ファイル (3つのプリセットプロファイル内蔵)
├── webui/                     # ブラウザ設定ツール (Web Serial API 対応)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── tests/                     # PC上で即時実行可能な自動テストスイート (34テスト)
│   ├── test_stick_engine.py   # スティック多段判定・ゲームパッド/マウスモード検証
│   ├── test_debouncer.py      # デバウンス・チャタリング耐性検証
│   ├── test_key_mapper.py     # キー/マウス/ゲームパッドマッピング検証
│   ├── test_hid_keyboard.py   # キーボードレポート生成検証
│   ├── test_hid_mouse.py      # マウスレポート生成検証
│   ├── test_hid_gamepad.py    # ゲームパッドレポート生成検証
│   └── test_serial_handler.py # シリアル通信プロトコル検証
├── docs/
│   ├── handover_spec.md       # 引き継ぎ仕様書ドキュメント
│   └── profile_spec.md        # プロファイル・設定フォーマット仕様書 (v1.2.0〜)
└── README.md
```

---

## 3. スティック動作モードとプロファイルプリセット

本ファームウェアでは、プロファイルごとにスティックの動作モードとボタン割り当てを自由に切り替えることができます。

### 3.1 動作モード
1. **キーボード (WASD 多段階入力):**
   - 浅倒しで「歩き (W/A/S/D)」、深倒しで「走り (Shift + W/A/S/D)」の2段階入力。
   - ヒステリシス機構（チャタリング防止）と斜め入力合成を完備。
2. **ゲームパッド (アナログスティック):**
   - ジョイスティックの倒しこみ量と角度を正規化アナログ値（X軸, Y軸: -127〜127）として出力。
   - PC標準のDirectInputゲームパッドとして認識（Steam入力経由でXInputに自動変換可能）。
3. **マウス (ポインタ移動):**
   - スティックの傾き量に応じた加速度カーブ付きマウスポインタ移動。
   - WebUIから最高速度（感度スライダー）を微調整可能。

### 3.2 初期プロファイルプリセット
* **プロファイル 1 (FPS / 汎用):**
  - スティック: キーボード (WASD Walk/Run 多段階入力)
  - ボタン: `1`, `2`, `X`, `E`, `Tab`, `F`, `Q`, `4`, `3`, `Space`, `z`, `LCtrl`, `LAlt`
* **プロファイル 2 (ゲームパッド):**
  - スティック: ゲームパッド (アナログスティック X/Y)
  - ボタン: `Gamepad_1`〜`Gamepad_13` (A, B, X, Y, LB, RB, LT, RT, Select, Start 等)
* **プロファイル 3 (マウス & 作業用):**
  - スティック: マウス (カーソル移動)
  - ボタン: `Mouse_Left`, `Mouse_Right`, `Mouse_Middle`, `Wheel_Up`, `Wheel_Down`, `LCtrl, z`, `LCtrl, c`, `LCtrl, v` 等

> [!NOTE]
> プロファイルの JSON フォーマット詳細、13ボタン配列と物理ピンの対応、全対応キー・アクション識別子一覧については [docs/profile_spec.md](docs/profile_spec.md) を参照してください。

---

## 4. 導入・セットアップ手順

### 4.1 マイコン側への書き込み (CircuitPython)

1. **CircuitPython の導入:**
   * RP2040-Zero の `BOOT` ボタンを押しながらPCのUSBポートに挿入し、マスストレージ（`RPI-RP2`）としてマウント。
   * [CircuitPython 公式サイト (RP2040-Zero用)](https://circuitpython.org/board/waveshare_rp2040_zero/) から `.uf2` をダウンロードし、`RPI-RP2` ドライブにコピー。
   * ドライブ名が `CIRCUITPY` に変われば導入完了です。

2. **ファームウェアファイルのコピー:**
   * 本リポジトリの `firmware/` 内の全ファイル（`code.py`, `boot.py`, `config.json`, `stick_engine.py`, `debouncer.py`, `key_mapper.py`, `serial_handler.py`, `hid_keyboard.py`, `hid_mouse.py`, `hid_gamepad.py`）を `CIRCUITPY` ドライブのルートにコピーします。
   * **注意:** `boot.py` の更新によりUSB複合デバイス（Keyboard + Mouse + Gamepad）が構成されるため、**書き込み後に一度USBケーブルを抜き差ししてください。**

---

## 5. Web Serial API 設定ツールの使い方

Google Chrome または Microsoft Edge 等の Web Serial API 対応ブラウザ（Chromium系）で使用できます。

### 起動方法

* **Web上で直接利用（推奨・インストール不要）:**  
  👉 **[https://niratama.github.io/lefty-controller-firmware/](https://niratama.github.io/lefty-controller-firmware/)**

* **ローカルで起動する場合:**  
  ```bash
  python3 -m http.server 8000 --directory webui
  ```
  ブラウザで `http://localhost:8000` を開きます。

### 主な機能
* **デバイスと接続:**
  * 「デバイスと接続」ボタンを押し、一覧から RP2040-Zero のシリアルポート（CDC）を選択。
* **スティック・ビジュアライザ:**
  * スティックの現在の倒しこみ座標（Delta X, Delta Y）、動作モード、出力量を円形レーダー上にリアルタイム描画。
* **プロファイル切り替え・管理:**
  * FPS用キーボード、ゲームパッド、マウス操作プロファイルを1クリックで切り替え。
* **設定の即時反映 (Hot Reload):**
  * 「デバイスへ保存・反映」をクリックすると、マイコンを再起動することなくオンザフライで新しい設定が適用されます。

---

## 6. 単体テストの実行

PCローカル（Python 3環境）で以下のコマンドを実行することで、ハードウェア実機がなくても全コアロジックをテストできます：

```bash
python3 -m unittest discover tests -v
```

---

## 7. ライセンス

[MIT License](LICENSE)
