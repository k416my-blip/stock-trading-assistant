# Rakuten Import Real-World Validation — 検証レポート

| 項目 | 内容 |
|------|------|
| フェーズ | **Real-World OCR Validation（実スクショ · フィールド精度）** |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 日付 | 2026-06-21 |
| スコープ | **新機能追加なし** — 実世界フィクスチャ · 検証スクリプト · JSON 結果 · レポートのみ |
| 前提 commit | `8e34ed0825d1851d4892b134fcb4a29ab316e2b2`（検証実行時点 · 本レポート commit は後述） |

---

## 1. 検証概要

### 1.1 実施した収集手段

| 手段 | 結果 |
|------|------|
| `docs/review/rakuten-import-real-world/fixtures/` | ユーザー提供 `01-user-screenshot-20260621.jpg`（adb pull: `/sdcard/DCIM/Screenshots/*ispeed*`） |
| adb `/sdcard/DCIM/Screenshots` キーワード `ispeed` | **1 件**（上記と同一） |
| adb 実機キャプチャ（`ispeed.rakutentrade.my`） | Menu → **Transaction History (Cash, This Week)** — 取引行 **0 件** · Menu 画面キャプチャ 1 枚 |
| adb → Order → Trade History | **未取得**（ナビ中に端末ホーム画面へ逸脱） |

### 1.2 実スクショ枚数 · 取引種別カバレッジ

| 指標 | 値 |
|------|-----|
| フィクスチャ画像 | **3 枚**（取引行あり **1 枚** · 空画面 **1 枚** · 非適用ナビ **1 枚**） |
| ground truth 行数 | **4 行**（ユーザー提供スクショのみ） |
| Deposit | **○**（Success 1 · Failure 2） |
| Fee / Charge | **○**（Charge -5.40） |
| Buy | **未収集** |
| Sell | **未収集** |
| Dividend | **未収集** |
| Withdrawal | **未収集** |

### 1.3 非適用スクショ

| ファイル | 理由 |
|----------|------|
| `03-adb-myaccount.png` | Menu ナビ画面のみ — 取引行なし · OCR フィールド精度集計対象外 |

---

## 2. OCR 精度

**OpenAI Vision:** 利用可（`.env` · ソース: `.env`）  
**実行:** `node scripts/rakuten-import-real-world-validation.mjs` → `ocr-results.json`

### 2.1 フィクスチャ別結果

| ID | ファイル | 期待行 | OCR 行 | 幻覚行 | 備考 |
|----|----------|--------|--------|--------|------|
| `user-txn-history-cash-20260621` | `01-user-screenshot-20260621.jpg` | 4 | **4** | 0 | 行数一致 · type/date/currency 正解 |
| `txn-history-cash-empty-week` | `04-adb-transaction-history-cash.png` | 0 | 0 | 0 | 空画面一致 **○** |
| `menu-navigation-only` | `03-adb-myaccount.png` | — | — | — | **非適用**（OCR スキップ） |

### 2.2 フィールド別精度（正解 / 誤認識 / 未取得）

評価対象: ユーザー提供スクショ **4 行** × 7 フィールド = **28 セル**

| フィールド | 正解 | 誤認識 | 未取得 | 正解率 |
|-----------|------|--------|--------|--------|
| date | 4 | 0 | 0 | **100.0%** |
| symbol | 4 | 0 | 0 | **100.0%** ※期待値なし行は空欄一致 |
| quantity | 4 | 0 | 0 | **100.0%** ※同上 |
| price | 4 | 0 | 0 | **100.0%** ※同上 |
| fee | 4 | 0 | 0 | **100.0%** ※同上 |
| **total** | **0** | **0** | **4** | **0.0%** |
| currency | 4 | 0 | 0 | **100.0%** |

**注:** `total` の未取得 100% は Vision が JSON キー **`amount`** で金額を返し、パイプラインが **`total`** を読む設計のため。raw OCR 行には `amount: 4880.23` 等が正しく含まれている（`ocr-results.json` の `rawOcrRows` 参照）。

### 2.3 行別所見（ユーザー提供スクショ）

| 行 | 種別 | date | total | currency | 所見 |
|----|------|------|-------|----------|------|
| 0 | fee (Charge) | 正解 | **未取得** | 正解 | `amount: -5.4` を返却 — `total` 未マップ |
| 1 | deposit (Success) | 正解 | **未取得** | 正解 | `amount: 4880.23` |
| 2 | deposit (Failure) | 正解 | **未取得** | 正解 | `amount: 4880.23` |
| 3 | deposit (Failure) | 正解 | **未取得** | 正解 | `amount: 5000` |

同一日付・同一金額の Deposit 3 行を Vision は正しく分離（行数 4/4 一致）。

---

## 3. フィクスチャ一覧（ground truth）

manifest: `docs/review/rakuten-import-real-world/fixtures/manifest.json`

### 3.1 `01-user-screenshot-20260621.jpg`

| # | type | date | symbol | qty | price | fee | total | currency |
|---|------|------|--------|-----|-------|-----|-------|----------|
| 1 | fee | 2026-06-08 | — | — | — | — | -5.40 | MYR |
| 2 | deposit | 2026-06-05 | — | — | — | — | 4880.23 | MYR |
| 3 | deposit | 2026-06-05 | — | — | — | — | 4880.23 | MYR |
| 4 | deposit | 2026-06-05 | — | — | — | — | 5000.00 | MYR |

### 3.2 `04-adb-transaction-history-cash.png`

期待行 **0**（This Week フィルタ · 「No Transaction available」）

### 3.3 `03-adb-myaccount.png`

非適用（Menu ナビ · expectedRows 0）

---

## 4. 発見された問題（優先度順）

| 順位 | 問題 | 影響 |
|------|------|------|
| **1** | Vision が金額を **`amount`** キーで返し **`total` 未マップ** | 比較・`ocrRowToCandidate` 経路で total が常に未取得 — 入金額が候補に入らない |
| **2** | **Buy / Sell / Dividend / Withdrawal 実スクショ未収集** | 銘柄 · 数量 · 価格フィールドの実世界精度は未検証 |
| **3** | Transaction History の **Amount 列**と Trade History の **Symbol/Qty/Price 列**は UI レイアウトが異なる | Trade History 専用行は未検証 |
| **4** | adb ナビが不安定（ホーム画面逸脱） | 追加キャプチャの自動化が困難 — ユーザー手動スクショが現実的 |
| **5** | Deposit Failure 行は Vision が type=deposit として返す | Status(Success/Failure) は OCR スキーマ外 — 重複 deposit 候補の区別不可 |

---

## 5. 修正優先度（推奨のみ · 本検証では src/ 変更なし）

| 優先度 | 推奨 | 理由 |
|--------|------|------|
| **P0** | Vision 応答の **`amount` → `total` 正規化**（パーサまたは `ocrRowToCandidate`） | 実スクショで金額は Vision 正解だがパイプラインで消失 |
| **P1** | Buy/Sell/Dividend/Withdrawal を含む **Trade History 実スクショ**を fixtures に追加 | symbol/quantity/price の実世界精度が未測定 |
| **P1** | Transaction History **Dividends タブ**の実スクショ追加 | 配当種別の UI レイアウト未検証 |
| **P2** | Vision プロンプトで **`total` キー明示**（`amount` 禁止） | モデル出力の揺れ低減 |
| **P2** | Deposit Failure 行の **重複候補 UX**（reference / status） | 同一金額の Success/Failure 区別 |

---

## 6. 検証ツール一覧

| パス | 役割 |
|------|------|
| `scripts/rakuten-import-real-world-validation.mjs` | 実世界検証エントリ |
| `scripts/rakuten-import-real-world-validation.vitest.ts` | OCR 比較 · JSON 出力 |
| `vitest.real-world.validation.config.ts` | RN スタブ付き vitest 設定 |

**再実行:**

```bash
node scripts/rakuten-import-real-world-validation.mjs
```

**フィクスチャ追加手順:**

1. Rakuten Trade の Transaction History / Trade History スクショを `docs/review/rakuten-import-real-world/fixtures/` に配置
2. `fixtures/manifest.json` の `expectedRows` を手動転記
3. 上記コマンドを再実行

---

## 7. 結論

| 領域 | 結果 |
|------|------|
| 実スクショ収集 | **1 枚に取引行 4 行**（deposit×3 · fee×1） |
| OCR 行数 | **4/4 一致** · 幻覚行 0 |
| date / currency | **100% 正解** |
| symbol / qty / price / fee | **N/A 相当**（期待値なし行は空欄一致 100%） |
| **total** | **0% 正解 · 100% 未取得**（`amount` キー問題） |
| Buy/Sell/Dividend/Withdrawal | **未検証** |

**次アクション:** Trade History および Dividends タブの実スクショを fixtures に追加 → manifest 更新 → 検証再実行。並行して P0 の `amount`/`total` マッピングを別タスクで実装。

---

## 8. Git

| 項目 | 値 |
|------|-----|
| 検証実行時 commit | `8e34ed0825d1851d4892b134fcb4a29ab316e2b2` |
| 本レポート commit | （下記 push 後に確定） |
| push | （下記 push 後に確定） |
