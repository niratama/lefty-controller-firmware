# 左手デバイス近代化改修ファームウェア (Waveshare RP2040-Zero)

PIC18F2450（5V系）搭載の既存左手コントローラーを、**Waveshare RP2040-Zero**（3.3V系）に換装してファームウェアを刷新・近代化したプロジェクトです。
通常の13個のキースイッチ入力に加え、**2軸アナログスティックの倒しこみ量に応じた多段階キー判定（歩き／走り、斜め移動合成）** と、**Web Serial API によるブラウザ設定ツール** を提供します。

---

## 1. ハードウェア仕様・ピンアサイン

* **マイコンボード:** Waveshare RP2040-Zero (USB Type-C)
* **スイッチ入力 (13個):** 内蔵プルアップ有効化 / Active Low (押下時GND短絡)
* **アナログスティック (2軸):** RP2040の 3.3V(3V3ピン) と GND に接続 (※5V厳禁)

### ピンアサイン対応表

| ピン番号 | 接続先デバイス | 役割・初期キー設定 |
| :--- | :--- | :--- |
| **GP0〜GP8** | 前面ボタン 1〜9 (SW1〜SW9) | `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9` |
| **GP9** | 側面トリガー 1 (SW10) | `Space` |
| **GP10** | 側面トリガー 2 (SW11) | `Tab` |
| **GP11** | 側面トリガー 3 (SW12) | `LCtrl` |
| **GP12** | スティック押し込み (SW_STK) | `LAlt` |
| **GP26** | スティック X軸 (ADC0) | 左右方向 (Left: `A`, Right: `D` / 走り時は `Shift` 追加) |
| **GP27** | スティック Y軸 (ADC1) | 前後方向 (Up: `W`, Down: `S` / 走り時は `Shift` 追加) |
| **3V3 / GND**| スティック電源 / 各SWコモン | 3.3V 電源 / 共通グランド |

---

## 2. ディレクトリ構成

```text
lefty-controller-firmware/
├── firmware/                  # RP2040-Zero に書き込むファームウェア一式
│   ├── boot.py                # USB HID構成 (Composite Keyboard)
│   ├── code.py                # メインエントリーポイント (スキャンループ・通信・HID送信)
│   ├── stick_engine.py        # 2軸スティック多段判定エンジン (ヒステリシス・合成)
│   ├── debouncer.py           # 13ボタンの高速デバウンス処理 (Eager Debounce)
│   ├── key_mapper.py          # キー名文字列 ⇔ USB HID Keycode 変換
│   ├── serial_handler.py      # Web Serial API 連携・JSONプロトコルハンドラ
│   ├── diagnostic.py          # Phase 1 導通テスト & ADCプロファイリングツール
│   └── config.json            # 動作設定ファイル
├── webui/                     # ブラウザ設定ツール (Web Serial API 対応)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── tests/                     # PC上で即時実行可能な自動テストスイート
│   ├── test_stick_engine.py   # スティック多段判定・ヒステリシス検証
│   ├── test_debouncer.py      # デバウンス・チャタリング耐性検証
│   ├── test_key_mapper.py     # キーマッピング検証
│   └── test_serial_handler.py # シリアル通信プロトコル検証
├── docs/
│   └── handover_spec.md       # 引き継ぎ仕様書ドキュメント
└── README.md
```

---

## 3. スティック多段判定エンジンの仕様 (Phase 2)

* **ゼロ点自動キャリブレーション:**
  * 起動時に数十ms間スティックの静止値を読み取り、ニュートラル中心値として記録。
* **デッドゾーン (遊び):**
  * デフォルト `4000` (16bit空間)。中心値付近の微細なノイズをカットし、ニュートラル時は全キー解放。
* **ヒステリシス (チャタリング防止):**
  * デフォルト `1500`。Walk/Run境界での高速な連打・誤判定を防止。
    * Walk ON: 偏差 $\ge 12000$ / Walk OFF: 偏差 $< 10500$
    * Run ON: 偏差 $\ge 26000$ / Run OFF: 偏差 $< 24500$
* **キー競合回避 & 斜め移動合成:**
  * WalkからRunへの遷移時は、Walkキーを維持したまま `Shift` キーを追加押下（差分HIDレポート送信）。
  * X軸・Y軸の同時倒し（斜め移動）時は、両軸のキー（例: `W` + `D` + `Shift`）を自然に合成。

---

## 4. 導入・セットアップ手順

### 4.1 マイコン側への書き込み (CircuitPython)

1. **CircuitPython の導入:**
   * RP2040-Zero の `BOOT` ボタンを押しながらPCのUSBポートに挿入し、マスストレージ（`RPI-RP2`）としてマウント。
   * [CircuitPython 公式サイト (RP2040-Zero用)](https://circuitpython.org/board/waveshare_rp2040_zero/) から `.uf2` をダウンロードし、`RPI-RP2` ドライブにコピー。
   * ドライブ名が `CIRCUITPY` に変われば導入完了です。

2. **ライブラリの配置:**
   * [Adafruit CircuitPython Bundle](https://circuitpython.org/libraries) から `adafruit_hid` フォルダを取得し、`CIRCUITPY/lib/adafruit_hid` に配置します。

3. **ファームウェアファイルのコピー:**
   * 本リポジトリの `firmware/` 内の全ファイル（`code.py`, `boot.py`, `config.json`, `stick_engine.py`, `debouncer.py`, `key_mapper.py`, `serial_handler.py`）を `CIRCUITPY` ドライブのルートにコピーします。

---

## 5. Web Serial API 設定ツールの使い方 (Phase 4)

Google Chrome または Microsoft Edge 等の Web Serial API 対応ブラウザで使用できます。

### 起動方法
ローカルでHTTPサーバーを起動します：
```bash
python3 -m http.server 8000 --directory webui
```
ブラウザで `http://localhost:8000` を開きます。

### 主な機能
* **デバイスと接続:**
  * 「デバイスと接続」ボタンを押し、一覧から RP2040-Zero のシリアルポート（CDC）を選択。
* **スティック・ビジュアライザ:**
  * スティックの現在の倒しこみ座標（Delta X, Delta Y）、現在の判定ステート（NEUTRAL / WALK / RUN）を円形レーダー上にリアルタイム描画。
* **閾値・キーマップ編集:**
  * デッドゾーン、ヒステリシス、Walk/Run閾値のスライダー調整。
  * 13個のボタンのキーバインド変更（物理ボタンを押すと画面上の該当カードが緑に点灯）。
* **設定の即時反映 (Hot Reload):**
  * 「デバイスへ保存・反映」をクリックすると、マイコンを再起動することなくオンザフライで新しい設定が適用されます。

---

## 6. 単体テストの実行

PCローカル（Python 3環境）で以下のコマンドを実行することで、ハードウェア実機がなくても全コアロジックをテストできます：

```bash
python3 -m unittest discover tests
```
