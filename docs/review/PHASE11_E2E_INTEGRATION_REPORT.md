# PHASE11_E2E_INTEGRATION_REPORT

## 概要
Phase11 Live E2E — Phase13〜24 全チェーン一括検証（fetchLiveExternal=true）。

- 実行日時: 2026-06-19T03:54:44.052Z
- Git commit: `384276a`
- fetchLiveExternal: **true**

## 判定

**PASS** — 6/6 PASS · 0 PARTIAL · クラッシュ 0

## 検証項目

| 項目 | 内容 |
|------|------|
| fetchLiveExternal | true（Live API / HTML） |
| Phase13〜24 | analyzeOneStock 全 enricher 実行 |
| Material Score | -100〜+100 集計 |
| Concierge | buildConciergeEnhancedAnalysis 出力 |
| UI Mapping | MaterialStockRow 各 Phase evaluationJa |
| API Fallback | sourceStatus ok/partial/skipped 耐性 |
| エラー耐性 | 銘柄単位 try/catch、全体クラッシュ0 |

## 6銘柄結果

| Code | Label | Status | Score | Phases Exec | Phases Data | UI Map | Concierge | API | Error |
|------|-------|--------|-------|-------------|-------------|--------|-----------|-----|-------|
| 1155 | Maybank | PASS | 84 | 19/19 | 19/19 | 19/19 | OK | OK | — |
| 1023 | CIMB | PASS | 93 | 19/19 | 19/19 | 19/19 | OK | OK | — |
| 1295 | Public Bank | PASS | 100 | 19/19 | 19/19 | 19/19 | OK | OK | — |
| 5347 | Tenaga | PASS | 100 | 19/19 | 19/19 | 19/19 | OK | OK | — |
| 4707 | Nestle | PASS | 100 | 19/19 | 19/19 | 19/19 | OK | OK | — |
| 6033 | Petronas Gas | PASS | 84 | 19/19 | 19/19 | 19/19 | OK | OK | — |

## Phase チェーン詳細（1155 代表）

| Phase | Executed | Data |
|-------|----------|------|
| 13 | Y | Y |
| 14 | Y | Y |
| 24 | Y | Y |
| 15 | Y | Y |
| 16 | Y | Y |
| 16.6 | Y | Y |
| 16.7 | Y | Y |
| 16.5 | Y | Y |
| 17 | Y | Y |
| 18 | Y | Y |
| 19 | Y | Y |
| 19.5 | Y | Y |
| 20 | Y | Y |
| 21 | Y | Y |
| 22 | Y | Y |
| 22.1 | Y | Y |
| 23 | Y | Y |
| 23.1 | Y | Y |
| 22.2 | Y | Y |

## 再実行

```bash
npx vitest run tests/unit/bursaPhase11E2e.test.ts
npx tsx scripts/bursa-phase11-e2e-verify.ts
```
