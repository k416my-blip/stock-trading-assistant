# PHASE23_1_IMPLEMENTATION_REPORT

## 概要

Phase23.1 Earnings Revision × Insider/Institutional Cross Signal を実装し、Phase11 材料分析パイプラインへ統合した。

- 実装日: 2026-06-13
- ブランチ: `cursor/top3-maxdd-capital-audit`

---

## 1. 実装内容

### 1.1 新規ファイル

| ファイル | 説明 |
|----------|------|
| `src/types/bursaEarningsRevisionCrossSignal.ts` | Cross Signal ドメイン型 |
| `src/constants/bursaEarningsRevisionCrossSignal.ts` | スコア定数・6銘柄監査リスト |
| `src/services/bursa/bursaEarningsRevisionCrossSignalService.ts` | バイアス解決・Cross Signal 判定・材料変換 |
| `src/services/bursa/bursaPhase23_1Analysis.ts` | Phase23.1 オーケストレータ |
| `tests/unit/bursaPhase23_1.test.ts` | 10 テスト |
| `scripts/bursa-phase23_1-verify.ts` | 6銘柄 Live パイプライン検証 |

### 1.2 変更ファイル

| ファイル | 変更 |
|----------|------|
| `src/types/bursaDisclosure.ts` | `earningsRevisionCrossSignal?` フィールド追加 |
| `src/services/bursa/bursaPhase11Analysis.ts` | Phase23 → **Phase23.1** → Phase22.2 の順で呼び出し |

### 1.3 コア API

```typescript
buildEarningsRevisionCrossSignalAnalysis({
  earningsRevisionIntelligence,
  insiderTrading,
  institutionalOwnership,
})

enrichStockWithEarningsRevisionCrossSignal({ stock })
```

---

## 2. Cross Signal ルール（実装）

| 条件 | Direction | Score |
|------|-----------|-------|
| Rev↑ + Insider Buy + Inst Buy（3系統） | Strong Bullish | +18 |
| Rev↓ + Insider Sell + Inst Sell（3系統） | Strong Bearish | -18 |
| Rev↑ + 1系統以上支持・矛盾なし | Bullish | +10〜+14 |
| Rev↓ + 1系統以上支持・矛盾なし | Bearish | -10〜-14 |
| Rev↑ + 矛盾（Sell系） | Neutral | +3 |
| Rev↓ + 矛盾（Buy系） | Neutral | -3 |
| Rev のみ | Bullish/Bearish | ±6 |
| Insider+Inst 2系統一致（Rev なし） | Bullish/Bearish | ±5 |

材料加算: `round(crossSignalScore × 0.55)`、cap ±12

---

## 3. テスト結果

```
npx vitest run tests/unit/bursaPhase23_1.test.ts

✓ 10 tests passed
```

カバレッジ:
- コンポーネントバイアス解決（Revision / Insider / Institutional）
- Strong Bullish / Strong Bearish / 乖離 Neutral
- 単一系統 → unavailable
- 材料スコア加算・Phase11 enrich 統合

---

## 4. 6銘柄 Live 検証

```
npx tsx scripts/bursa-phase23_1-verify.ts
```

| Code | Revision | Insider | Institutional | Cross Signal | Score | Status |
|------|----------|---------|---------------|--------------|-------|--------|
| 1155 | Stable | 買い優勢 | Buying | Bullish | +5 | PASS |
| 1023 | Stable | 買い優勢 | Selling | Neutral（乖離） | 0 | PASS |
| 1295 | Stable | 買い優勢 | Strong Selling | Neutral（乖離） | 0 | PASS |
| 5347 | Stable | 買い優勢 | Strong Buying | Bullish | +5 | PASS |
| 4707 | Stable | 買い優勢 | Strong Buying | Bullish | +5 | PASS |
| 6033 | Stable | 買い優勢 | Strong Buying | Bullish | +5 | PASS |

**6/6 PASS** — 詳細は `PHASE23_1_DEVICE_SMOKE_REPORT.md`

---

## 5. 設計との差分

- Revision が全銘柄 Stable のため Strong Bullish/Bearish は Live 検証で未発火（ルール・ユニットテストで検証済み）
- Insider+Institutional 2系統一致による Partial Bullish (+5) が Live では主パターン

---

## 6. GitHub 同期

| 項目 | 値 |
|------|-----|
| Commit | `21d5bd8` |
| Push | `origin/cursor/top3-maxdd-capital-audit` — 成功 |

---

## 7. 再実行コマンド

```bash
npx vitest run tests/unit/bursaPhase23_1.test.ts
npx tsx scripts/bursa-phase23_1-verify.ts
```
