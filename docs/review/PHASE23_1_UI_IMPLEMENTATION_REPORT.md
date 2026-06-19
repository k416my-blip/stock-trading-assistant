# PHASE23_1_UI_IMPLEMENTATION_REPORT

## 概要

Phase23.1 Earnings Revision Cross Signal の UI 露出を Material Analysis / Concierge に追加した。

- 実装日: 2026-06-19
- 優先順位: 2（Phase24 の次）

---

## 1. 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/services/bursa/bursaMaterialAnalysisService.ts` | Cross Signal フィールド + Material Impact |
| `src/screens/MaterialAnalysisScreen.tsx` | Phase23.1 セクション（Phase23 と Conviction の間） |
| `src/types/conciergeEnhancedAnalysis.ts` | `earningsRevisionCrossSignal` 評価 + detail 型 |
| `src/services/buildConciergeEnhancedAnalysis.ts` | マッピング + summarize |
| `src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx` | Cross Signal ブロック |

---

## 2. 表示フィールド

| 項目 | データソース |
|------|-------------|
| **Cross Signal** | `displayJa.crossSignalDirection` |
| **Direction** | 同上 + `crossSignalScore` |
| **Alignment** | `alignmentCount` + Revision/Insider/Institutional bias |
| **Score** | `displayJa.crossSignalScore` |
| **Material Impact** | `earningsRevisionCrossSignalMaterialScoreAdjustment()` → `MaterialStockRow.earningsRevisionCrossSignalMaterialImpactJa` |

---

## 3. MaterialStockRow 新規フィールド

```typescript
earningsRevisionCrossSignalEvaluationJa: string;
earningsRevisionCrossSignalDisplayJa: EarningsRevisionCrossSignalDisplayFields | null;
earningsRevisionCrossSignalMaterialImpactJa: string;  // 材料スコア加算 ±12 cap
```

---

## 4. 6銘柄 UI パイプライン検証

| Code | Cross Signal | Alignment | Score | Material Impact | Status |
|------|--------------|-----------|-------|-----------------|--------|
| 1155 | Bullish | 2 | +5 | +3 | PASS |
| 1023 | Neutral（乖離） | 0 | 0 | 0 | PASS |
| 1295 | Neutral（乖離） | 0 | 0 | 0 | PASS |
| 5347 | Bullish | 2 | +5 | +3 | PASS |
| 4707 | Bullish | 2 | +5 | +3 | PASS |
| 6033 | Bullish | 2 | +5 | +3 | PASS |

**6/6 PASS**

---

## 5. テスト

```
npx vitest run tests/unit/bursaMaterialAnalysisUi.test.ts
```

Material Impact 例: Strong Bullish mock → `+6`（score 18 × 0.55 ≈ 10, capped）

---

## 6. GitHub 同期

| 項目 | 値 |
|------|-----|
| Commit | （sync 後更新） |
| Push | `origin/cursor/top3-maxdd-capital-audit` |

---

## 再実行

```bash
npx tsx scripts/bursa-phase23_1-verify.ts
npx tsx scripts/bursa-phase24-23_1-ui-pipeline-verify.ts
```
