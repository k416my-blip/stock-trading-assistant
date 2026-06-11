# Phase20 Valuation Intelligence 監査レポート

## 1. 実施日時

- **実施:** 2026-06-11T00:12:23.687Z

## 2. Git Commit Hash

- **Commit:** 338ebc4

## 3. 実装ファイル一覧

| ファイル | 内容 |
|----------|------|
| `src/types/bursaValuationIntelligence.ts` | 型定義 |
| `src/constants/bursaValuationIntelligence.ts` | 定数・ベンチマーク |
| `src/services/bursa/bursaValuationIntelligenceProviders.ts` | Yahoo/FR 取得 |
| `src/services/bursa/bursaValuationIntelligenceService.ts` | スコア算出 |
| `src/services/bursa/bursaPhase20Analysis.ts` | オーケストレータ |
| `src/services/bursa/bursaPhase11Analysis.ts` | パイプライン統合 |
| `src/services/bursa/bursaMaterialAnalysisService.ts` | UI マッピング |
| `src/screens/MaterialAnalysisScreen.tsx` | 材料分析 UI |
| `src/services/buildConciergeEnhancedAnalysis.ts` | AI 統合 |
| `tests/unit/bursaPhase20.test.ts` | ユニットテスト |
| `scripts/bursa-phase20-audit-verify.ts` | 監査スクリプト |

## 4. 取得率

| 指標 | 値 |
|------|-----|
| 成功銘柄 | 6/6 |
| 平均フィールド取得率 | 68.0% |
| データソース優先 | Yahoo Finance → Financial Report → Bursa |

## 5. 6銘柄ライブ結果

| Code | 銘柄 | Sector | 状態 | PER | PBR | ROE | Source | 取得率 |
|------|------|--------|------|-----|-----|-----|--------|--------|
| 1155 | Maybank | Banking | 成功 | 12.42x | 1.43x | 11.3% | yahoo_finance | 59% |
| 1023 | CIMB | Banking | 成功 | 10.28x | 1.16x | 11.3% | yahoo_finance | 59% |
| 1295 | Public Bank | Banking | 成功 | 12.97x | 1.57x | 12.3% | yahoo_finance | 59% |
| 5347 | Tenaga | Utilities | 成功 | 17.13x | 1.65x | 8.4% | yahoo_finance | 77% |
| 4707 | Nestle | Consumer Products | 成功 | 39.57x | 38.64x | 1.0% | yahoo_finance | 77% |
| 6033 | Petronas Gas | Energy | 成功 | 20.02x | 2.40x | 12.5% | yahoo_finance | 77% |

## 6. Valuation Score一覧

| Code | Score | Rating | Fair Value | Rev Growth | EPS Growth | D/E |
|------|-------|--------|------------|------------|------------|-----|
| 1155 | -2 | Fair Value | 適正 — 割安/割高の極端さなし | -5.4% | -4.3% | 未取得 |
| 1023 | -2 | Fair Value | 適正 — 割安/割高の極端さなし | -2.6% | -3.2% | 未取得 |
| 1295 | -2 | Fair Value | 適正 — 割安/割高の極端さなし | 1.0% | 0.4% | 未取得 |
| 5347 | +1 | Fair Value | 適正 — 割安/割高の極端さなし | 2.4% | 3.7% | 175.31x |
| 4707 | -14 | Strong Overvalued | 割高（強）— バリュエーション面で注意 | 6.3% | 27.1% | 103.67x |
| 6033 | -9 | Overvalued | 割高 — 慎重 | -0.6% | -6.4% | 15.66x |

## 7. AIスコア変化

| Code | Before | After | Delta | Valuation Adj |
|------|--------|-------|-------|---------------|
| 1155 | 32 | 32 | +0 | -0.7 |
| 1023 | 32 | 32 | +0 | -0.7 |
| 1295 | 32 | 32 | +0 | -0.7 |
| 5347 | 16 | 16 | +0 | 0.4 |
| 4707 | 5 | 24 | +19 | -5.9 |
| 6033 | 20 | 20 | +0 | -3.8 |

## 8. PASS/FAIL

**総合判定: PASS** (6/6 成功 · クラッシュ0 · 推測値なし)

## 9. 残課題

- なし（6/6 成功時）

## 10. 次の推奨Phase

- **Phase20.5** — セクター中央値 PER/PBR ライブ算出 · KLSE Financial Report 深度統合
- **Phase21** — Fair Value 絶対値モデル（DCF/DDM）— 推測禁止ルール維持

## 12. 実機監査結果

| 項目 | 値 |
|------|-----|
| heartbeatCount | N/A |
| testEnded | N/A |
| AsyncStorage保存確認 | N/A |
| battery optimization状態 | N/A |
| foreground時間 | N/A |
| background時間 | N/A |
| 端末再起動回数 | N/A |
| プロセス消失回数 | N/A |
| NewsAPI成功回数 | N/A |
| RSS成功回数 | N/A |
| X API成功回数 | N/A |
| OpenAI成功回数 | N/A |

## 13. 前回レポートとの差分

**前回:** `REPORT_FORMAT_POLICY_V3_REPORT.md` · Phase19.5 完了
**今回:** Commit: `338ebc4`

### 差分

- **追加機能:** Phase20 Valuation Intelligence · 22指標 · Score -20..+20
- **修正内容:** Phase11 パイプライン · 材料分析 UI · Concierge AI
- **削除機能:** なし
- **テスト結果差分:** bursaPhase20.test.ts 追加

---

## 【監査サマリー】

| 項目 | 値 |
|------|-----|
| Commit | 338ebc4 |
| PASS/FAIL | PASS |
| 次回テスト実施可否 | PASS |
| 残課題件数 | 0 |
| Critical課題件数 | 0 |
| Warning件数 | 0 |

## 【次回テスト実施可否】

**PASS**
