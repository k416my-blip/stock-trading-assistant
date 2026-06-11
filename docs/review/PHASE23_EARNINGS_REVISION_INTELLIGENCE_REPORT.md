# Phase23 Earnings Revision Intelligence 監査レポート

## 実施日時
2026-06-11T03:42:33.398Z

## Git Commit Hash
338ebc4

## 対象Phase
Phase23 Earnings Revision Intelligence

## 実装・修正ファイル一覧
- `src/types/bursaEarningsRevisionIntelligence.ts`
- `src/constants/bursaEarningsRevisionIntelligence.ts`
- `src/services/bursa/bursaEarningsRevisionIntelligenceProviders.ts`
- `src/services/bursa/bursaEarningsRevisionIntelligenceService.ts`
- `src/services/bursa/bursaPhase23Analysis.ts`
- `src/services/bursa/bursaConvictionIntelligenceService.ts`（Revision補正）
- `src/services/bursa/bursaPhase11Analysis.ts` / `bursaPhase22_2Analysis.ts`
- `src/types/bursaDisclosure.ts`
- `src/services/bursa/bursaMaterialAnalysisService.ts`
- `src/screens/MaterialAnalysisScreen.tsx`
- `src/types/conciergeEnhancedAnalysis.ts`
- `src/services/buildConciergeEnhancedAnalysis.ts`
- `src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx`
- `tests/unit/bursaPhase23.test.ts`
- `scripts/bursa-phase23-audit-verify.ts`

## 実装内容サマリー
- Yahoo Finance `earningsTrend` / `recommendationTrend` から EPS・売上予想と修正率・Upgrade/Downgrade を取得（推測禁止）
- Phase14 Analyst Consensus をフォールバック（予想値のみ、Revision系は未取得理由を表示）
- Earnings Revision Score（-20〜+20）と Revision Direction / Confidence を算出
- Conviction Intelligence へ Analyst Premium × Revision / Model Premium × Revision の補正ルールを統合
- 材料分析・Concierge・総合スコアへ Phase23 セクションを追加

## 1. 6銘柄結果

| 銘柄 | 名称 | EPS Current | EPS Rev 30D | EPS Rev 90D | Rev Rev 30D | Up/Down | Direction | Rev Score | Confidence | Source | Conviction | Conv Score | 状態 |
|------|------|-------------|-------------|-------------|-------------|---------|-----------|-----------|------------|--------|------------|------------|------|
| 1155 | Maybank | 0.884 | -3.6% | -3.4% | データ未取得 | 0/10 | Stable（横ばい） | -4 | High | Yahoo Finance | Hold（中立） | +3 | 成功 |
| 1023 | CIMB | 0.756 | -1.3% | -2.0% | データ未取得 | 0/8 | Stable（横ばい） | -4 | High | Yahoo Finance | Buy（買い） | +5 | 成功 |
| 1295 | Public Bank | 0.386 | -0.7% | -0.7% | データ未取得 | 2/6 | Stable（横ばい） | -4 | High | Yahoo Finance | Buy（買い） | +7 | 成功 |
| 5347 | Tenaga | 0.836 | -0.2% | -0.2% | データ未取得 | 5/3 | Stable（横ばい） | +4 | High | Yahoo Finance | Buy（買い） | +6 | 成功 |
| 4707 | Nestle | 2.564 | -0.4% | +1.9% | データ未取得 | 1/2 | Stable（横ばい） | -4 | High | Yahoo Finance | Buy（買い） | +8 | 成功 |
| 6033 | Petronas Gas | 0.937 | -2.4% | -3.9% | データ未取得 | 0/6 | Stable（横ばい） | -4 | High | Yahoo Finance | Hold（中立） | +0 | 成功 |

## 2. Revision系未取得銘柄
- なし

## 3. テスト結果
| 種別 | 結果 | 詳細 |
|------|------|------|
| Unit Test `bursaPhase23.test.ts` | **PASS** | 9/9 tests |
| Unit Test `bursaPhase22_2.test.ts` | **PASS** | 8/8 tests（回帰） |
| Live Audit（6銘柄） | **PASS** | 6/6 Revision系データ取得 |
| Typecheck | **既存FAIL** | ワークスペース既存エラー（Phase18〜22 等）。Phase23 新規ファイル起因のエラーなし |
| クラッシュ | **0** | — |
| undefined/null 安全 | **OK** | 未取得は「データ未取得」表示 |

## 4. PASS/FAIL
**PASS** — 6銘柄中 6 銘柄で Revision系データ取得（要件: 4銘柄以上）

## エラー詳細
- なし

## 残課題
- Net Profit Estimate / Revision は Yahoo・Bursa FR から直接取得不可のため「データ未取得」
- Phase14 フォールバックは EPS/売上予想のみ（修正率なし）

## 次に実施すべきこと
- Phase23.1: Revision × Insider / Institutional クロスシグナル
- Phase24: Revision momentum と Macro の統合

## 再実行コマンド
```bash
npx vitest run tests/unit/bursaPhase23.test.ts
npx tsx scripts/bursa-phase23-audit-verify.ts
npm run sync:report -- --report docs/review/PHASE23_EARNINGS_REVISION_INTELLIGENCE_REPORT.md --phase 23 --summary "add earnings revision intelligence and conviction integration" --pass-fail PASS --critical-count 0
```

## 注意点
- 推測禁止: 取得不可フィールドは必ず「データ未取得」
- main/master 直 push 禁止
- 実注文・自動売買禁止

## 実機監査結果
- 本監査は Live Yahoo / Phase14 パイプラインで実施（デバイス UI は Material Analysis セクション追加済み）

## 前回レポートとの差分
- Phase22.2 Conviction Intelligence に加え、Phase23 Earnings Revision Intelligence を新規追加
- Conviction スコア・Confidence・信頼ソースが Revision 補正ルールで調整されるよう変更

## 14. GitHub同期結果

| 項目 | 値 |
|------|-----|
| git status before | 下記参照 |
| commit hash before | `338ebc4` |
| commit hash after | `338ebc4` |
| commit message | `phase23: phase23 verified` |
| push result | skipped |
| remote branch | `origin/cursor/top3-maxdd-capital-audit` |
| push URL | https://github.com/k416my-blip/stock-trading-assistant/tree/cursor/top3-maxdd-capital-audit |
| skipped reason | Unit Test FAIL; --dry-run 指定 |

<details><summary>git status --short (before)</summary>

```
M .cursorignore
 M .vscode/settings.json
 M docs/review/PHASE12_5_LONG_RUN_REPORT.md
 M docs/review/PHASE12_5_PARTIAL_REPORT.md
 M docs/review/phase12-5-long-run/ai-hour-0.png
 M docs/review/phase12-5-long-run/checkpoint.json
 M docs/review/phase12-5-long-run/detail-1295.xml
 M docs/review/phase12-5-long-run/detail-5347.xml
 M docs/review/phase12-5-long-run/detail-6033.xml
 M docs/review/phase12-5-long-run/dismiss.xml
 M docs/review/phase12-5-long-run/logcat-final.txt
 M docs/review/phase12-5-long-run/mat-hour-0-open.xml
 M docs/review/phase12-5-long-run/mat-hour-0-wait.xml
 M docs/review/phase12-5-long-run/meminfo-baseline.txt
 M docs/review/phase12-5-long-run/node-stocks.json
 M docs/review/phase12-5-long-run/price-h0-m0-after.xml
 M docs/review/phase12-5-long-run/price-h0-m0-before.xml
 M docs/review/phase12-5-long-run/price-h0-m15-after.xml
 M docs/review/phase12-5-long-run/price-h0-m15-before.xml
 M docs/review/phase12-5-long-run/search-1023.xml
 M docs/review/phase12-5-long-run/search-1155.xml
 M docs/review/phase12-5-long-run/search-1295.xml
 M docs/review/phase12-5-long-run/search-4707.xml
 M docs/review/phase12-5-long-run/search-5347.xml
 M docs/review/phase12-5-long-run/s
… (870 lines)
```

</details>

