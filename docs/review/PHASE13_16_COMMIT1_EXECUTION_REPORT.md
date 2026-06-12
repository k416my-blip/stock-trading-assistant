# Phase13–16 Commit 1 実行レポート

監査日: 2026-06-02  
コミット: `phase13-16: earnings call through institutional intelligence`  
**GitHub push: 未実施（禁止遵守）**

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| `44f1a2b` push 未実施（実行前） | **PASS** — remote は `338ebc4` |
| `git reset --soft 338ebc4` | **PASS** |
| `bursaDisclosure.ts` 部分 stage | **PASS** — Phase13–16 のみコミット |
| stage 件数 | **63** |
| typecheck | **PASS**（0 errors） |
| Phase13–16 unit tests | **PASS**（10 files / 53 tests） |
| commit | **PASS** — `cd301812a68fb91a67f1b867532917ff03dfdb9d` |
| push | **未実施** |
| **総合** | **PASS** |

---

## 1. push 未実施確認（実行前）

| 項目 | 値 |
|------|-----|
| 実行前 HEAD | `44f1a2b` |
| remote `origin/cursor/top3-maxdd-capital-audit` | `338ebc4` |
| `git rev-list --left-right --count origin...HEAD` | `0 1` |

`44f1a2b` は push されていないことを確認後、作業を開始した。

---

## 2. reset 実行結果

```bash
git reset --soft 338ebc4
git reset HEAD                    # 44f1a2b 由来の全 staged を unstage
git reset HEAD src/types/bursaDisclosure.ts  # （初回 unstage 後、disclosure も index=338ebc4 に）
```

| 項目 | 結果 |
|------|------|
| HEAD 移動先 | `338ebc4` |
| `44f1a2b` | 履歴から解消（soft reset） |
| 44f1a2b 由来 19 ファイル | 全 unstage — Commit 1 候補のみ再 stage |
| working tree | 全変更保持（Phase17+ 含む） |

---

## 3. `bursaDisclosure.ts` 部分 stage 結果

### 3.1 実施方法

非対話シェルのため、`git add -p` の Hunk 1/2/3 操作と等価な手順を実行:

1. Phase17–23 行を除いた Commit 1 スライスを一時的に working tree に書き込み
2. `git add src/types/bursaDisclosure.ts` で index に Phase13–16 スライスのみ stage
3. working tree を Phase17–23 行付き全量に復元

これは承認済み計画の **Hunk 1 → y / Hunk 2 → y / Hunk 3 → e（Phase13–16 のみ残す）** と同等。

### 3.2 コミット内容（`HEAD:src/types/bursaDisclosure.ts`）

| 区分 | 状態 |
|------|------|
| `import type { BursaEarningsCallAnalysis }` | **含む** |
| `scoreJa` / `detailJa` | **含む** |
| `earningsCall` | **含む** |
| `analystConsensus` | **含む** |
| `insiderTrading` | **含む** |
| `institutionalOwnership` | **含む** |
| `institutionalTrend` | **含む** |
| `historicalOwnership` | **含む** |
| `fixedInstitutionalBasket` | **含む** |
| `dividendIntelligence` 〜 `earningsRevisionIntelligence` | **含まない** |

### 3.3 working tree 残差分（Commit 2–5 用）

`git diff HEAD -- src/types/bursaDisclosure.ts` に Phase17–23 の 10 プロパティが **unstaged** として残存:

- `dividendIntelligence`
- `newsIntelligence`
- `macroIntelligence`
- `sectorRotation`
- `valuationIntelligence`
- `fairValueIntelligence`
- `analystTargetIntelligence`
- `valuationGapIntelligence`
- `convictionIntelligence`
- `earningsRevisionIntelligence`

---

## 4. stage ファイル一覧（63 件）

### docs（13）

```
docs/review/PHASE13_17_DATA_SOURCE_PLAN.md
docs/review/PHASE13_EARNINGS_CALL_REPORT.md
docs/review/phase13-earnings-call/verify-results.json
docs/review/PHASE14_ANALYST_CONSENSUS_REPORT.md
docs/review/phase14-analyst-consensus/verify-results.json
docs/review/PHASE15_INSIDER_TRADING_REPORT.md
docs/review/phase15-insider-trading/verify-results.json
docs/review/PHASE16_5_INSTITUTIONAL_TREND_REPORT.md
docs/review/PHASE16_6_HISTORICAL_OWNERSHIP_REPORT.md
docs/review/PHASE16_7_FIXED_BASKET_REPORT.md
docs/review/PHASE16_INSTITUTIONAL_OWNERSHIP_REPORT.md
```

### scripts（11）

```
scripts/bursa-phase13-klse-diagnose.ts
scripts/bursa-phase13-verify.ts
scripts/klse-financial-report-1155-2024-12-31.html
scripts/klse-probe-s-www-klsescreener-com-v2-financial-reports-aisummary-740579.html
scripts/klse-shareholdings-1155.html
scripts/klse-shareholdings.html
scripts/klse-sample-1155.html
scripts/probe-klse-financial-report.ts
scripts/probe-shareholdings-1155.ts
```

### src（28）

```
src/services/bursa/bursaAnalystConsensusProviders.ts
src/services/bursa/bursaAnalystConsensusService.ts
src/services/bursa/bursaEarningsCallService.ts
src/services/bursa/bursaFinancialReportAnalysis.ts
src/services/bursa/bursaFixedInstitutionalBasketService.ts
src/services/bursa/bursaHistoricalOwnershipService.ts
src/services/bursa/bursaInsiderTradingParser.ts
src/services/bursa/bursaInsiderTradingService.ts
src/services/bursa/bursaInstitutionalOwnershipParser.ts
src/services/bursa/bursaInstitutionalOwnershipService.ts
src/services/bursa/bursaInstitutionalTrendParser.ts
src/services/bursa/bursaInstitutionalTrendService.ts
src/services/bursa/bursaMaterialSentiment.ts
src/services/bursa/bursaMaterialWeightCalibration.ts
src/services/bursa/bursaPayloadNormalize.ts
src/services/bursa/bursaPhase13Analysis.ts
src/services/bursa/bursaPhase14Analysis.ts
src/services/bursa/bursaPhase15Analysis.ts
src/services/bursa/bursaPhase16Analysis.ts
src/services/bursa/bursaPhase16BasketAnalysis.ts
src/services/bursa/bursaPhase16HistoricalAnalysis.ts
src/services/bursa/bursaPhase16TrendAnalysis.ts
src/services/bursa/earningsCallAiSummary.ts
src/services/quoteProviders/yahooQuoteSummaryClient.ts
src/types/bursaAnalystConsensus.ts
src/types/bursaDisclosure.ts          ← Phase13–16 スライスのみ
src/types/bursaEarningsCall.ts
src/types/bursaFinancialReportAnalysis.ts
src/types/bursaFixedInstitutionalBasket.ts
src/types/bursaHistoricalOwnership.ts
src/types/bursaInsiderTrading.ts
src/types/bursaInstitutionalOwnership.ts
src/types/bursaInstitutionalTrend.ts
```

### tests（11）

```
tests/unit/bursaFinancialReportAnalysis.test.ts
tests/unit/bursaMaterialWeightCalibration.test.ts
tests/unit/bursaPayloadNormalize.test.ts
tests/unit/bursaPhase13.test.ts
tests/unit/bursaPhase14.test.ts
tests/unit/bursaPhase15.test.ts
tests/unit/bursaPhase16.test.ts
tests/unit/bursaPhase16Basket.test.ts
tests/unit/bursaPhase16Historical.test.ts
tests/unit/bursaPhase16Trend.test.ts
```

**stage 件数: 63**

---

## 5. `git diff --cached --stat`（commit 直前）

```
 63 files changed, 30216 insertions(+)
```

`src/types/bursaDisclosure.ts` は **+16 行**（Phase13–16 スライス）。Phase17–23 の +25 行は stage 外。

---

## 6. typecheck 結果

```bash
npm run typecheck
```

| 項目 | 結果 |
|------|------|
| exit code | **0** |
| errors | **0** |

Evidence: `docs/review/evidence/phase13-16-commit1-typecheck.log`

---

## 7. Phase13–16 unit test 結果

```bash
npx vitest run tests/unit/bursaFinancialReportAnalysis.test.ts \
  tests/unit/bursaMaterialWeightCalibration.test.ts \
  tests/unit/bursaPayloadNormalize.test.ts \
  tests/unit/bursaPhase13.test.ts \
  tests/unit/bursaPhase14.test.ts \
  tests/unit/bursaPhase15.test.ts \
  tests/unit/bursaPhase16.test.ts \
  tests/unit/bursaPhase16Basket.test.ts \
  tests/unit/bursaPhase16Historical.test.ts \
  tests/unit/bursaPhase16Trend.test.ts
```

| 項目 | 結果 |
|------|------|
| Test Files | **10 passed** |
| Tests | **53 passed** |
| Failed | **0** |

Evidence: `docs/review/evidence/phase13-16-commit1-unit-tests.log`

---

## 8. commit 結果

### 8.1 pre-commit フック対応

初回 commit 試行は pre-commit により **blocked**:

- 原因: KLSE HTML fixture 内の Firebase `apiKey`（`AIzaSy...` パターン）
- 対象: 5 件の staged HTML fixture
- 対応: `DUMMY_FIXTURE_FIREBASE_KEY`（旧: `AIzaSy[REDACTED_FIREBASE_FIXTURE_KEY]`）に redact 後、再 stage・commit **成功**

### 8.2 commit 情報

| 項目 | 値 |
|------|-----|
| **commit hash** | `cd301812a68fb91a67f1b867532917ff03dfdb9d` |
| **message** | `phase13-16: earnings call through institutional intelligence` |
| **parent** | `338ebc4351ed08046f0a07a79e0dbd0c57b3a720` |
| **files** | 63 |
| **insertions** | 30216 |

---

## 9. remote との差分

| 項目 | 値 |
|------|-----|
| local HEAD | `cd30181` |
| remote `origin/cursor/top3-maxdd-capital-audit` | `338ebc4` |
| `git rev-list --left-right --count origin...HEAD` | **`0 1`**（ローカルのみ 1 コミット先行） |
| `44f1a2b` | 履歴上 **不在**（soft reset により置換） |

---

## 10. push 未実施確認（実行後）

```bash
git push   # 未実行
```

| 項目 | 結果 |
|------|------|
| push 実行 | **なし** |
| remote 更新 | **なし** |

---

## 11. PASS / FAIL

| チェック | 判定 |
|----------|------|
| push 禁止遵守 | **PASS** |
| soft reset | **PASS** |
| disclosure 部分 stage（Phase13–16 のみ） | **PASS** |
| 禁止ファイル未混入 | **PASS** |
| stage 63 件 | **PASS** |
| typecheck | **PASS** |
| Phase13–16 unit tests | **PASS** |
| commit 作成 | **PASS** |
| **総合** | **PASS** |

---

## 12. 停止宣言

Commit 1 実行完了。GitHub push は **未実施**。

次ステップ（ユーザー承認後）: Commit 2（Phase17–19.5）— `bursaDisclosure.ts` の Phase17+ 行を段階 stage

---

*Evidence: `docs/review/evidence/phase13-16-commit1-typecheck.log`, `phase13-16-commit1-unit-tests.log`*
