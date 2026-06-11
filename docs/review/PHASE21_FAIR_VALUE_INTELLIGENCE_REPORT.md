# Phase21 Fair Value Intelligence 監査レポート

## 1. 実施日時

- **実施:** 2026-06-11T01:11:19.981Z

## 2. Git Commit Hash

- **Commit:** 338ebc4

## 3. 対象Phase

**Phase21** — Fair Value Intelligence（DCF · DDM · Fair Value Score · AI統合）

## 4. 実装ファイル一覧

| ファイル | 内容 |
|----------|------|
| `src/types/bursaFairValueIntelligence.ts` | 型定義 |
| `src/constants/bursaFairValueIntelligence.ts` | 定数 · セクター割引率 |
| `src/services/bursa/bursaFairValueIntelligenceProviders.ts` | Yahoo/Phase17 取得 |
| `src/services/bursa/bursaFairValueIntelligenceService.ts` | DCF/DDM · Score |
| `src/services/bursa/bursaPhase21Analysis.ts` | オーケストレータ |
| `src/services/bursa/bursaPhase11Analysis.ts` | パイプライン統合 |
| `src/services/bursa/bursaMaterialAnalysisService.ts` | UI マッピング |
| `src/screens/MaterialAnalysisScreen.tsx` | 材料分析 UI |
| `src/services/buildConciergeEnhancedAnalysis.ts` | AI 統合 |
| `tests/unit/bursaPhase21.test.ts` | ユニットテスト |
| `scripts/bursa-phase21-audit-verify.ts` | 監査スクリプト |

## 5. 実装内容サマリー

| 機能 | 説明 | 取得元 |
|------|------|--------|
| Fair Value Range | DCF/DDM モデル価格の min/mid/max | 算出 |
| Upside % | (適正−現在)/現在 | 算出 |
| Downside % | (現在−下限)/現在 | 算出 |
| Margin of Safety | (適正−現在)/適正 | 算出 |
| DCF | 5年FCF予測+永久価値 | Yahoo FCF · セクター割引率定数 |
| DDM | Gordon Growth Model | Yahoo dividendRate · Phase17配当成長 |
| PER補完 | EPS × セクター適正PER | Yahoo trailingEps · Phase20定数 |
| Fair Value Score | -20..+20 | Upside/MoS から算出 |
| 推奨判断 | Strong Buy〜Avoid | Score 帯域 |

## 6. テスト結果

```
npx vitest run tests/unit/bursaPhase21.test.ts
✓ 10/10 PASS
```

- **実行 Commit:** 338ebc4

## 7. 6銘柄ライブ結果

成功: **6/6** · 平均取得率: **74.3%**

| Code | 銘柄 | 状態 | 現在 | 適正 | Upside | DCF | DDM | Score | 推奨 | 取得率 |
|------|------|------|------|------|--------|-----|-----|-------|------|--------|
| 1155 | Maybank | 成功 | RM 10.68 | RM 9.46 | -11.4% | 未取得 | 未取得 | -4 | Hold | 67% |
| 1023 | CIMB | 成功 | RM 7.40 | RM 7.92 | +7.0% | 未取得 | 未取得 | +2 | Hold | 67% |
| 1295 | Public Bank | 成功 | RM 4.80 | RM 4.07 | -15.2% | 未取得 | 未取得 | -7 | Reduce | 67% |
| 5347 | Tenaga | 成功 | RM 14.22 | RM 14.76 | +3.8% | 未取得 | 未取得 | +0 | Hold | 78% |
| 4707 | Nestle | 成功 | RM 93.78 | RM 81.20 | -13.4% | RM 103.16 | 未取得 | -7 | Reduce | 89% |
| 6033 | Petronas Gas | 成功 | RM 17.22 | RM 13.76 | -20.1% | 未取得 | 未取得 | -9 | Reduce | 78% |

### 詳細

#### 1155 Maybank

- MoS: -12.9% · Downside: +11.4%
- DCF source: 未取得 · DDM source: 未取得
- Material: 32→32 (Δ+0) · Adj -1.6


#### 1023 CIMB

- MoS: +6.6% · Downside: -7.0%
- DCF source: 未取得 · DDM source: 未取得
- Material: 32→32 (Δ+0) · Adj 0.8


#### 1295 Public Bank

- MoS: -17.9% · Downside: +15.2%
- DCF source: 未取得 · DDM source: 未取得
- Material: 32→11 (Δ-21) · Adj -2.7


#### 5347 Tenaga

- MoS: +3.7% · Downside: -3.8%
- DCF source: 未取得 · DDM source: 未取得
- Material: 36→36 (Δ+0) · Adj 0


#### 4707 Nestle

- MoS: -15.5% · Downside: +36.8%
- DCF source: 算出 · DDM source: 未取得
- Material: -17→-38 (Δ-21) · Adj -3.3


#### 6033 Petronas Gas

- MoS: -25.1% · Downside: +20.1%
- DCF source: 未取得 · DDM source: 未取得
- Material: 20→-2 (Δ-22) · Adj -3.9



## 8. PASS/FAIL

**総合判定: PASS**

| 成功銘柄 | 6/6 |
| 合格基準 | ≥4/6 |

## 9. 残課題

1. 銀行セクター FCF データ不足時の FR フォールバック
2. WACC 精緻化（負債コスト · ベータ取得）

## 10. 次に実施すべきこと

- Phase21.5 — セクター中央値 · 感応度分析

## 11. 再実行コマンド

```bash
npx vitest run tests/unit/bursaPhase21.test.ts
npx tsx scripts/bursa-phase21-audit-verify.ts
```

## 12. 実機監査結果

| 項目 | 値 |
|------|-----|
| heartbeatCount | N/A（API 監査） |
| testEnded | true |
| AsyncStorage保存確認 | N/A |

## 13. 前回レポートとの差分

**前回:** `PHASE20_1_FIX_REPORT.md`
**今回:** Commit `338ebc4`

- **追加:** Phase21 Fair Value Intelligence 全層
- **修正:** なし

---

## 【監査サマリー】

| 項目 | 値 |
|------|-----|
| Commit | 338ebc4 |
| PASS/FAIL | PASS |
| 次回テスト実施可否 | PASS |
| 残課題件数 | 2 |

## 【次回テスト実施可否】

**PASS**
