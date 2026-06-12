# Phase13–23 Commit 6 依存修正 準備レポート

監査日: 2026-06-02  
対象コミット: **Commit 6** — 隔離 worktree typecheck / unit 失敗の依存クロージャ  
前提 HEAD: `074b3ce00ac7aa3d8c7e3511f805e5b337b9206b`（Commit 5 完了）  
実施範囲: **準備のみ**（`git add` / `commit` / `push` は未実施）

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| HEAD 確認 | **PASS** — `074b3ce` |
| ユーザー指定 6 件の分類 | 必須 **5** / 不要 **1** |
| 追加発見（必須） | `src/services/bursa/bursaTrendAnalysis.ts` |
| **推奨 Commit 6 必須件数** | **6 ファイル** |
| 任意追加（fixture） | **3 ファイル**（Phase3–9 回帰用） |
| typecheck 14 errors 解消見込み | **6 必須ファイルで全解消（高確度）** |
| unit 13 failed の Commit 6 直結 | **4 / 13 ファイル** |
| 禁止ファイル混入リスク | **低（必須 6 件に該当なし）** |
| Commit 6 準備 | **PASS（条件付き）** |
| **総合判定** | **PASS（条件付き）** — `bursaTrendAnalysis.ts` 同梱必須 |

---

## 1. ユーザー指定 6 件 — 必須 / 任意 / 不要

| # | パス | 状態 | 分類 | 理由 |
|---|------|------|------|------|
| 1 | `src/services/bursa/bursaMacroSectorAdjustment.ts` | `??` | **A. 必須** | Phase19 / 19.5 / Macro が import。モジュール不在で typecheck 3 件 + unit 3 スイート失敗 |
| 2 | `src/services/analysisApiKeys.ts` | `M` (+67 行) | **A. 必須** | `alphaVantageApiKey` / `fmpApiKey` 追加。typecheck 5 件の直接原因 |
| 3 | `src/services/bursa/bursaKlseHtmlClient.ts` | `M` (+54 行) | **A. 必須** | `fetchKlseShareholdingsHistoryHtml` export。Phase16 系 typecheck 2 件 |
| 4 | `src/services/globalMarketQuoteService.ts` | `M` (+7 行) | **A. 必須** | `fetchYahooSnapshotsForSymbols` export。Phase19 typecheck 1 件 |
| 5 | `src/services/bursa/bursaMaterialSources.ts` | `M` (+14 行) | **A. 必須** | `emptyMaterialSourceStatus` export + null-safe / ラベル改善。Phase11 typecheck 1 件 |
| 6 | `tests/unit/bursaPayloadNormalize.test.ts` | **CLEAN** | **C. 不要** | 差分なし（Commit 1 で既コミット）。修正対象は **テストではなく** `bursaTrendAnalysis.ts` |

### 追加発見（ユーザー指定外・Commit 6 必須）

| パス | 状態 | 分類 | 理由 |
|------|------|------|------|
| `src/services/bursa/bursaTrendAnalysis.ts` | `M` (+12 行) | **A. 必須** | `filterCompleteFyAnnual` が `undefined` 非対応（HEAD）。typecheck 1 件 + `bursaPayloadNormalize.test.ts` 1 件失敗の実修正先 |

### 任意（Commit 6 に含めてもよいが typecheck 非依存）

| パス | 状態 | 分類 | 理由 |
|------|------|------|------|
| `scripts/klse-sample-1066.html` | `??` | **B. 任意** | Phase3–9 unit が参照。tracked は `1155` のみ |
| `scripts/klse-sample-5183.html` | `??` | **B. 任意** | 同上 |
| `scripts/klse-sample-5819.html` | `??` | **B. 任意** | 同上 |

---

## 2. typecheck 14 errors — 原因表と対応

| # | エラー（要約） | 発生ファイル | 解消に必要な Commit 6 変更 |
|---|----------------|--------------|---------------------------|
| 1 | `AnalysisApiKeys` に `alphaVantageApiKey` なし | `bursaAnalystConsensusService.ts:132` | `analysisApiKeys.ts` |
| 2 | `AnalysisApiKeys` に `fmpApiKey` なし | `bursaAnalystConsensusService.ts:136` | `analysisApiKeys.ts` |
| 3 | `fmpApiKey` なし | `bursaDividendIntelligenceService.ts:210` | `analysisApiKeys.ts` |
| 4 | `alphaVantageApiKey` なし | `bursaDividendIntelligenceService.ts:211` | `analysisApiKeys.ts` |
| 5 | `fetchKlseShareholdingsHistoryHtml` 未 export | `bursaFixedInstitutionalBasketService.ts:31` | `bursaKlseHtmlClient.ts` |
| 6 | `fetchKlseShareholdingsHistoryHtml` 未 export | `bursaHistoricalOwnershipService.ts:28` | `bursaKlseHtmlClient.ts` |
| 7 | `fetchYahooSnapshotsForSymbols` 未 export | `bursaMacroIntelligenceService.ts:24` | `globalMarketQuoteService.ts` |
| 8 | `./bursaMacroSectorAdjustment` 不在 | `bursaMacroIntelligenceService.ts:33` | `bursaMacroSectorAdjustment.ts`（新規） |
| 9 | `emptyMaterialSourceStatus` 未 export | `bursaPhase11Analysis.ts:14` | `bursaMaterialSources.ts` |
| 10 | `./bursaMacroSectorAdjustment` 不在 | `bursaSectorRotationEngine.ts:20` | `bursaMacroSectorAdjustment.ts`（新規） |
| 11 | `undefined` を `BursaQuarterlyRecord[]` に渡せない | `bursaPayloadNormalize.test.ts:26` | **`bursaTrendAnalysis.ts`**（シグネチャ `null \| undefined` 対応） |
| 12 | `alphaVantageApiKey` 未知プロパティ | `bursaPhase14.test.ts:23` | `analysisApiKeys.ts` |
| 13 | `bursaMacroSectorAdjustment` 不在 | `bursaPhase19.test.ts:14` | `bursaMacroSectorAdjustment.ts`（新規） |

> **対応ファイル集計**: 必須 6 件で **14/14 解消見込み**（`bursaPayloadNormalize.test.ts` の変更は不要）。

---

## 3. unit test 13 failed — 分類表

隔離 worktree（`074b3ce` + `npm ci`）での `npm run test:unit` 結果: **13 failed / 305 passed**（318 files）

| # | 失敗テストファイル | 主因 | Commit 6 分類 |
|---|-------------------|------|---------------|
| 1 | `bursaPhase11.test.ts` | `bursaMacroSectorAdjustment` モジュール不在 | **A. Commit 6 で直す** |
| 2 | `bursaPhase19.test.ts` | 同上 | **A. Commit 6 で直す** |
| 3 | `bursaPhase19_5.test.ts` | 同上 | **A. Commit 6 で直す** |
| 4 | `bursaPayloadNormalize.test.ts` | `filterCompleteFyAnnual(undefined)` 実行時例外 | **A. Commit 6 で直す**（`bursaTrendAnalysis.ts`） |
| 5 | `bursaPhase3.test.ts` | `scripts/klse-sample-1066.html` ENOENT | **B. 別対応**（fixture 未追跡） |
| 6 | `bursaPhase4.test.ts` | 同上（2 tests） | **B. 別対応** |
| 7 | `bursaPhase5.test.ts` | 同上（2 tests） | **B. 別対応** |
| 8 | `bursaPhase6.test.ts` | bundle 数不足（fixture 1/4 のみ） | **B. 別対応** |
| 9 | `bursaPhase7.test.ts` | 同上 | **B. 別対応** |
| 10 | `bursaPhase8.test.ts` | bundles.length 1 !== 4 | **B. 別対応** |
| 11 | `bursaPhase9.test.ts` | bundles.length 1 !== 4（2 tests） | **B. 別対応** |
| 12 | `buySignalForwardReturnAnalysis.test.ts` | `openai-buy-hybrid-analysis.json` ENOENT | **C. push 判定から除外**（`openai-*.json` コミット禁止） |
| 13 | `regionalCagrAudit.test.ts` | `best-strategy-regional-grid-optimization.json` ENOENT | **C. push 判定から除外**（監査成果物・リポジトリ外依存） |

### 分類サマリー

| 区分 | ファイル数 | Commit 6 後の見込み |
|------|-----------|---------------------|
| **A. Commit 6 で直す** | **4** | **PASS 見込み** |
| **B. fixture 不足（別対応）** | **7** | 任意 3 fixture add で解消可能 |
| **C. push 判定除外** | **2** | コミット対象外のため full unit ゲートから除外推奨 |

---

## 4. Commit 6 ファイル候補一覧

### 4.1 必須（6 件）— 推奨 minimum

| # | パス | 新規/更新 |
|---|------|----------|
| 1 | `src/services/bursa/bursaMacroSectorAdjustment.ts` | 新規 |
| 2 | `src/services/analysisApiKeys.ts` | 更新 |
| 3 | `src/services/bursa/bursaKlseHtmlClient.ts` | 更新 |
| 4 | `src/services/globalMarketQuoteService.ts` | 更新 |
| 5 | `src/services/bursa/bursaMaterialSources.ts` | 更新 |
| 6 | `src/services/bursa/bursaTrendAnalysis.ts` | 更新 |

### 4.2 任意（3 件）— Phase3–9 回帰

| # | パス | 備考 |
|---|------|------|
| 7 | `scripts/klse-sample-1066.html` | KLSE HTML fixture（untracked） |
| 8 | `scripts/klse-sample-5183.html` | 同上 |
| 9 | `scripts/klse-sample-5819.html` | 同上 |

> `scripts/klse-sample-1155.html` は **既に tracked**（Commit 1 以前から存在）。

### 4.3 明示的に含めない

| パス | 理由 |
|------|------|
| `tests/unit/bursaPayloadNormalize.test.ts` | 差分なし。テストは Commit 1 済み |

### 4.4 ファイル件数

| 区分 | 件数 |
|------|------|
| 必須 | **6** |
| 任意（fixture） | **3** |
| **推奨 minimum stage** | **6** |
| **拡張 stage（fixture 同梱）** | **9** |

---

## 5. 禁止ファイル混入リスク

### 5.1 必須 6 件のスキャン

| 禁止カテゴリ | 必須 6 件 | リスク |
|--------------|-----------|--------|
| `.env` | 対象外 | **なし** |
| API キー / Bearer Token（diff 内） | スキャン済み — マッチなし | **なし** |
| `docs/review/phase12-5-long-run/**` | 対象外 | **なし** |
| `*.png` / `*.jpg` / `*.log` | 対象外 | **なし** |
| `openai-*.json` | 対象外 | **なし** |
| device verify 成果物 | 対象外 | **なし** |
| 855 件一括 add | 6〜9 件のみ | **なし** |

### 5.2 任意 fixture（HTML）の注意

| 項目 | 内容 |
|------|------|
| ファイル種別 | `scripts/klse-sample-*.html` |
| 禁止リスト該当 | **なし**（png/jpg/log/openai ではない） |
| シークレット | Firebase 等は Commit 1 で `DUMMY_FIXTURE_*` 化済みのパターンを踏襲すること |
| 推奨 | add 前に `AIza` / `sk-` 等の生キー grep を実施 |

### 5.3 `analysisApiKeys.ts` 差分の性質

- 追加は **型定義・env 変数名・`getSecret` キー名**のみ
- 実キー値のハードコードは **含まない**

**判定**: 必須 6 件の Commit 6 — **禁止ファイル混入リスク低（PASS）**

---

## 6. typecheck 予想

| シナリオ | 予想 |
|----------|------|
| **A. 必須 6 件のみ stage（隔離 worktree 相当）** | **PASS（高確度）** — 14/14 解消 |
| **B. 必須 5 件のみ（`bursaTrendAnalysis.ts` 漏れ）** | **FAIL** — 残 1 error |
| **C. `bursaPayloadNormalize.test.ts` のみ add** | **FAIL** — 差分なし・効果なし |

**推奨ゲート（Commit 6 直後）**:

```bash
npm run typecheck
```

---

## 7. unit test 予想

### 7.1 必須 6 件のみ（minimum Commit 6）

| 対象 | 予想 |
|------|------|
| `bursaPhase11.test.ts` | **PASS** |
| `bursaPhase19.test.ts` | **PASS** |
| `bursaPhase19_5.test.ts` | **PASS** |
| `bursaPayloadNormalize.test.ts` | **PASS** |
| Phase3–9（7 files） | **FAIL 継続**（fixture 不足） |
| `buySignalForwardReturnAnalysis.test.ts` | **FAIL 継続**（除外推奨） |
| `regionalCagrAudit.test.ts` | **FAIL 継続**（除外推奨） |

**full `test:unit` 見込み**: **9 failed / 309 passed**（13→9 に改善）

### 7.2 必須 6 + 任意 fixture 3 件

| 対象 | 予想 |
|------|------|
| Phase3–9（7 files） | **PASS（高確度）** |
| full `test:unit`（C 除外 2 件を除く） | **PASS（高確度）** |

### 7.3 推奨ゲート（Commit 6 直後）

**minimum**:

```bash
npx vitest run \
  tests/unit/bursaPhase11.test.ts \
  tests/unit/bursaPhase19.test.ts \
  tests/unit/bursaPhase19_5.test.ts \
  tests/unit/bursaPayloadNormalize.test.ts
```

**拡張（fixture 同梱時）**:

```bash
npx vitest run tests/unit/bursaPhase3.test.ts tests/unit/bursaPhase4.test.ts \
  tests/unit/bursaPhase5.test.ts tests/unit/bursaPhase6.test.ts \
  tests/unit/bursaPhase7.test.ts tests/unit/bursaPhase8.test.ts \
  tests/unit/bursaPhase9.test.ts
```

---

## 8. commit 可否

| 判定項目 | 結果 |
|----------|------|
| 依存欠落の特定 | **完了** |
| 必須ファイル確定 | **6 件**（指定 5 + `bursaTrendAnalysis.ts`） |
| 禁止ファイル | **混入なし（必須セット）** |
| typecheck 解消見込み | **可** |
| push readiness（minimum） | typecheck PASS 後、隔離 worktree 再監査で push 判断 |
| 現時点での commit 実行 | **禁止**（本タスク指示） |

**commit 可否**: **準備 PASS（条件付き）** — 必須 6 件 stage 後に Proceed 可

**推奨コミットメッセージ案**:

```
phase13-23: close dependency gaps for isolated typecheck and phase11-19 wiring
```

---

## 9. 次に実行する `git add` コマンド案

> **注意**: 以下は案のみ。本レポート時点では **未実行**。

### 9.1 必須 6 件（minimum）

```bash
git add \
  src/services/bursa/bursaMacroSectorAdjustment.ts \
  src/services/analysisApiKeys.ts \
  src/services/bursa/bursaKlseHtmlClient.ts \
  src/services/globalMarketQuoteService.ts \
  src/services/bursa/bursaMaterialSources.ts \
  src/services/bursa/bursaTrendAnalysis.ts
```

### 9.2 任意 — KLSE fixture 3 件（Phase3–9 回帰）

```bash
git add \
  scripts/klse-sample-1066.html \
  scripts/klse-sample-5183.html \
  scripts/klse-sample-5819.html
```

### 9.3 実行後ゲート（承認後）

```bash
# 隔離 worktree を Commit 6 後 HEAD で更新して再検証推奨
npm run typecheck
npx vitest run tests/unit/bursaPhase11.test.ts tests/unit/bursaPhase19.test.ts \
  tests/unit/bursaPhase19_5.test.ts tests/unit/bursaPayloadNormalize.test.ts
git commit -m "$(cat <<'EOF'
phase13-23: close dependency gaps for isolated typecheck and phase11-19 wiring

EOF
)"
```

---

## 10. PASS / FAIL

| チェック | 判定 |
|----------|------|
| HEAD = `074b3ce` | **PASS** |
| 指定 6 件の必須/任意/不要分類 | **PASS** |
| typecheck 14 errors 原因表 | **PASS** |
| unit 13 failed 分類表 | **PASS** |
| Commit 6 候補一覧・件数 | **PASS** |
| 禁止ファイル混入リスク | **PASS（低）** |
| typecheck / unit 予想 | **PASS** |
| `git add` / commit / push 未実施 | **PASS** |
| **総合（Commit 6 準備）** | **PASS（条件付き）** |

---

## 11. 停止宣言

Commit 6 準備完了。`git add` / `commit` / `push` は **一切実行していない**。

次ステップ（ユーザー承認後）: §9.1 add → 隔離 worktree 更新 → typecheck → §7.3 unit → commit → push readiness 再監査

---

*Evidence: `074b3ce` HEAD, 隔離 worktree typecheck 14 errors, `npm run test:unit` 13 failed ログ, `git status` / `git diff HEAD` on 6 候補 + `bursaTrendAnalysis.ts`*
