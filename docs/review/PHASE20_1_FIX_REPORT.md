# Phase20.1-fix 監査レポート

## 1. 実施日時

- **実施:** 2026-06-11T00:45:12.408Z

## 2. Git Commit Hash

- **Commit:** 338ebc4

## 3. 対象Phase

**Phase20.1-fix** — Critical 修正

1. Valuation Intelligence: キーワード分類廃止 → `valuationRating` から sentiment 直接決定
2. Debt/Equity: Yahoo `%` → 比率 `raw/100` 正規化 · 表示 `x` 統一

## 4. 修正ファイル一覧

| ファイル | 修正内容 |
|----------|----------|
| `src/services/bursa/bursaValuationIntelligenceService.ts` | `valuationRatingToSentiment` · `scoreValuationMaterialItem` |
| `src/services/bursa/bursaPhase20Analysis.ts` | キーワード `scoreMaterialItem` → `scoreValuationMaterialItem` |
| `src/services/bursa/bursaValuationIntelligenceProviders.ts` | `normalizeDebtToEquityRatio` · 保存時 ÷100 |
| `tests/unit/bursaPhase20.test.ts` | Strong Overvalued/Undervalued · D/E 正規化テスト |
| `scripts/bursa-phase20-1-fix-audit-verify.ts` | 本監査スクリプト |

## 5. 実装内容サマリー

### 問題1 — sentiment マッピング

| valuationRating | Sentiment | 材料 sentiment |
|-----------------|-----------|----------------|
| Strong Overvalued | Bearish | 悪材料 |
| Overvalued | Bearish | 悪材料 |
| Fair Value | Neutral | 中立 |
| Undervalued | Bullish | 好材料 |
| Strong Undervalued | Bullish | 好材料 |

### 問題2 — Debt/Equity 正規化

```
debtToEquityRatio = yahooRaw > 5 ? yahooRaw / 100 : yahooRaw
display = fmtRatio(ratio)  // 例: 1.75x
scoring = bench.debtEquityMax と ratio 比較
```

## 6. Unit Test 結果

```
npx vitest run tests/unit/bursaPhase20.test.ts
✓ 12/12 PASS
```

| テスト | 結果 |
|--------|------|
| Strong Overvalued → Bearish | PASS |
| Strong Undervalued → Bullish | PASS |
| normalizeDebtToEquityRatio | PASS |
| computeValuationScore D/E ratio | PASS |

- **実行 Commit:** 338ebc4

## 7. Nestle 再計算（4707）

| 段階 | Before fix | After fix |
|------|------------|-----------|
| materialScore | 5 → 24 | **5 → -17** |
| AI overallScore | 53 → 62 | **53 → 42** |
| Valuation rating sentiment | 好材料（誤） | **Bearish** |
| 材料 item score | +19.1 | **-22.2** |
| Valuation Adj | -5.9 | **-4.2** |

| 指標 | 値 |
|------|-----|
| Valuation Score | -10 |
| Rating | Overvalued |
| Rating Sentiment | **Bearish** |
| 材料 item | 悪材料 (-22.2) |

## 8. D/E 再計算

| Code | Yahoo raw | 正規化 ratio | UI 表示 |
|------|-----------|--------------|---------|
| 5347 | 175.305% | 1.75 | 1.75x |
| 4707 | 103.668% | 1.04 | 1.04x |

## 9. AI スコア差分（6銘柄）

| Code | material Before→After | AI Before→After | Δ AI | Val Sentiment |
|------|----------------------|-----------------|------|---------------|
| 1155 | 32→32 | 66→66 | +0 | Neutral |
| 1023 | 32→32 | 66→66 | +0 | Neutral |
| 1295 | 32→32 | 66→66 | +0 | Neutral |
| 5347 | 16→36 | 58→68 | +10 | Bullish |
| 4707 | 5→-17 | 53→42 | -11 | Bearish |
| 6033 | 20→20 | 60→60 | +0 | Neutral |

## 10. PASS/FAIL

**総合判定: PASS**

| 検証 | 結果 |
|------|------|
| Nestle valuationRating → Bearish | PASS（Overvalued → Bearish） |
| Nestle 材料 item → 悪材料 | PASS |
| Nestle materialScore 低下 | PASS |
| D/E 表示が ratio (x) | PASS |
| Unit Test 12/12 | PASS |

## 11. 残課題

1. 銀行 3 社 D/E 未取得 — Yahoo `financialData` フォールバック
2. 取得率 68% — FCF Growth / PSR 等の追加ソース

## 12. 次に実施すべきこと

- Phase20.5 — セクター中央値 · FR 深度統合
- Phase20.1-fix 後の ChatGPT 再監査

## 13. 再実行コマンド

```bash
npx vitest run tests/unit/bursaPhase20.test.ts
npx tsx scripts/bursa-phase20-1-fix-audit-verify.ts
```

## 14. 注意点

- ライブ Yahoo API 依存 · 数値は再実行で微変動しうる
- Nestle materialScore は Phase17-19 材料に依存（Before 値が変動しうる）

## 15. 実機監査結果

| 項目 | 値 |
|------|-----|
| heartbeatCount | N/A（API 監査） |
| testEnded | true |
| AsyncStorage保存確認 | N/A |

## 16. 前回レポートとの差分

**前回:** `PHASE20_1_VALUATION_AUDIT_REPORT.md`
**今回:** Commit `338ebc4`

| 区分 | 内容 |
|------|------|
| 修正 | sentiment 直接決定 · D/E 正規化 |
| 判定 | FAIL → **PASS**（Critical 解消） |

---

## 【監査サマリー】

| 項目 | 値 |
|------|-----|
| Commit | 338ebc4 |
| PASS/FAIL | PASS |
| 次回テスト実施可否 | PASS |
| 残課題件数 | 2 |
| Critical 課題件数 | 0 |

## 【次回テスト実施可否】

**PASS** — Critical 修正完了 · 本番テスト実施可
