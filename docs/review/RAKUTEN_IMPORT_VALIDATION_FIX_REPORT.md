# Rakuten Import Validation Fix — 実装レポート

| 項目 | 内容 |
|------|------|
| フェーズ | **P0 バグ修正のみ（Validation Fix）** |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 日付 | 2026-06-21 |
| スコープ | `amount` → `total` 正規化 · 同一実スクショ再検証 · 回帰確認 |

---

## 修正内容

### 問題（Real-World Validation で判明）

OpenAI Vision が Transaction History 行の金額を JSON キー **`amount`** で返す一方、OCR パイプラインは **`total`** のみ参照していた。その結果 `totalMYR` が未設定となり、実スクショ 4 行すべてで **total 正解率 0%**（未取得 4/4）となった。

### 修正方針

**一箇所に統一:** `parseOcrVisionJson`（`ocrVisionJsonParser.ts`）

- 行パース後、`total == null` かつ `amount != null` のとき `total = amount` に正規化
- 既存の `total` キーは優先（上書きしない）
- `ocrRowToCandidate` / プロンプト / Vision API 呼び出しは **変更なし**

```typescript
function normalizeVisionRow(row: OcrTransactionRow): OcrTransactionRow {
  const raw = row as OcrTransactionRow & { amount?: number };
  if (raw.total == null && raw.amount != null) {
    const { amount, ...rest } = raw;
    return { ...rest, total: amount };
  }
  return row;
}
```

---

## 変更ファイル

| 区分 | パス |
|------|------|
| 修正 | `src/services/rakutenImport/ocrVisionJsonParser.ts` |
| テスト | `tests/unit/rakutenImport/transactionHistoryVisionOcr.test.ts` |
| 再検証結果 | `docs/review/rakuten-import-real-world/ocr-results.json`（再生成） |
| レポート | `docs/review/RAKUTEN_IMPORT_VALIDATION_FIX_REPORT.md` |

**変更なし:** `ocrRowToCandidate.ts` · OCR プロンプト · UI · 設計

---

## 修正前後比較（同一実スクショ）

**フィクスチャ:** `docs/review/rakuten-import-real-world/fixtures/01-user-screenshot-20260621.jpg`  
**ground truth:** 4 行（fee Charge -5.40 · deposit ×3）

| フィールド | 修正前 | 修正後 |
|-----------|--------|--------|
| date | 100% | 100% |
| symbol | 100% | 100% |
| quantity | 100% | 100% |
| price | 100% | 100% |
| fee | 100% ※ | 0% ※ |
| **total** | **0%** | **100%** |
| currency | 100% | 100% |

※ symbol/quantity/price/fee は期待値なし行では「空欄一致」で 100%。修正後 Live OCR は deposit 行に `fee: 0` を返し fee 列は「誤認識」4/4（P0 スコープ外 · total 修正のみ）。

### total 行別（修正後 · 2026-06-21 再実行）

| 行 | 種別 | 期待 total | OCR total | 判定 |
|----|------|-----------|-----------|------|
| 0 | fee | -5.40 | -5.40 | 正解 |
| 1 | deposit | 4880.23 | 4880.23 | 正解 |
| 2 | deposit | 4880.23 | 4880.23 | 正解 |
| 3 | deposit | 5000.00 | 5000.00 | 正解 |

**total 正解率: 0% → 100%（4/4）** — 期待どおり。

---

## 回帰確認

### ユニットテスト

```
npx vitest run tests/unit/rakutenImport
→ 57 passed（+2: amount→total 正規化 · deposit/fee 候補 totalMYR）
```

| 種別 | 確認内容 | 結果 |
|------|----------|------|
| **Deposit** | `amount: 5000` のみ → `totalMYR: 5000` 候補 | **PASS** |
| **Fee** | `amount: -5.4` のみ → `totalMYR: -5.4` 候補 | **PASS** |

### 実スクショ再検証

```
node scripts/rakuten-import-real-world-validation.mjs
→ PASS · ocr-results.json 更新（ranAt: 2026-06-21）
```

- 行数: 4/4 一致 · 幻覚行 0
- 空画面フィクスチャ: 0 行一致（変更なし）

---

## 実機スクリーンショット

| ファイル | 内容 |
|----------|------|
| `docs/review/rakuten-import-real-world/fixtures/01-user-screenshot-20260621.jpg` | ユーザー提供 · Transaction History > Cash（再検証対象） |
| `docs/review/rakuten-import-real-world/fixtures/04-adb-transaction-history-cash.png` | 空画面 · 回帰（0 行） |

---

## Git

| 項目 | 値 |
|------|-----|
| コミット | （commit 後に記載） |
| push | （push 後に記録） |

---

## スコープ遵守

- **新機能追加:** なし
- **OCR 改善（プロンプト等）:** なし
- **設計変更:** なし
- **P0 のみ:** Vision `amount` キーの `total` 正規化
