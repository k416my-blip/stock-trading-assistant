# Phase13–23 Commit 6 依存修正 実行レポート

監査日: 2026-06-02  
コミット: `phase13-23: close dependency gaps for isolated typecheck and phase11-19 wiring`  
**GitHub push: 未実施（禁止遵守）**

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| 実行前 HEAD | **PASS** — `074b3ce00ac7aa3d8c7e3511f805e5b337b9206b` |
| stage 件数 | **9**（必須 6 + fixture 3） |
| 必須 6 件同梱 | **PASS** |
| fixture 3 件同梱 | **あり**（Firebase キー DUMMY 化後） |
| 禁止ファイル混入 | **なし** |
| typecheck | **PASS**（0 errors） |
| Commit 6 直結 unit tests | **PASS**（4 files / 19 tests） |
| Phase3–9 回帰 | **PASS**（7 files / 25 tests） |
| full `test:unit` | **PASS**（321 files / 1392 tests） |
| commit | **PASS** — `125470171dad71ba51b795ffb4d9f2be7bfd158f` |
| push | **未実施** |
| remote 差分 | **ahead 6**（`338ebc4` → `1254701`） |
| **総合** | **PASS** |

---

## 1. HEAD 確認

### 1.1 実行前

| 項目 | 値 |
|------|-----|
| `git rev-parse HEAD` | `074b3ce00ac7aa3d8c7e3511f805e5b337b9206b` |
| message | `phase22.2-23: conviction and earnings revision intelligence with pipeline wiring` |

### 1.2 実行後

| 項目 | 値 |
|------|-----|
| `git rev-parse HEAD` | `125470171dad71ba51b795ffb4d9f2be7bfd158f` |
| message | `phase13-23: close dependency gaps for isolated typecheck and phase11-19 wiring` |
| parent | `074b3ce00ac7aa3d8c7e3511f805e5b337b9206b` |

---

## 2. stage ファイル一覧（9 件）

### 必須 6 件

| # | パス |
|---|------|
| 1 | `src/services/bursa/bursaMacroSectorAdjustment.ts` |
| 2 | `src/services/analysisApiKeys.ts` |
| 3 | `src/services/bursa/bursaKlseHtmlClient.ts` |
| 4 | `src/services/globalMarketQuoteService.ts` |
| 5 | `src/services/bursa/bursaMaterialSources.ts` |
| 6 | `src/services/bursa/bursaTrendAnalysis.ts` |

### fixture 3 件

| # | パス |
|---|------|
| 7 | `scripts/klse-sample-1066.html` |
| 8 | `scripts/klse-sample-5183.html` |
| 9 | `scripts/klse-sample-5819.html` |

### stage 件数

| 区分 | 件数 |
|------|------|
| 必須 | 6 |
| fixture | 3 |
| **合計** | **9** |

---

## 3. 必須 6 件の同梱確認

| # | パス | staged | committed |
|---|------|--------|-----------|
| 1 | `bursaMacroSectorAdjustment.ts` | **yes** | **yes** |
| 2 | `analysisApiKeys.ts` | **yes** | **yes** |
| 3 | `bursaKlseHtmlClient.ts` | **yes** | **yes** |
| 4 | `globalMarketQuoteService.ts` | **yes** | **yes** |
| 5 | `bursaMaterialSources.ts` | **yes** | **yes** |
| 6 | `bursaTrendAnalysis.ts` | **yes** | **yes** |

---

## 4. fixture 3 件の同梱有無

| 項目 | 結果 |
|------|------|
| 同梱 | **あり**（Commit 6 に含む） |
| 目的 | Phase3–9 unit 回帰（`klse-sample-*.html`） |

---

## 5. fixture シークレットスキャン結果

### 5.1 add 前スキャン

| ファイル | 検出 | 対応 |
|----------|------|------|
| `klse-sample-1066.html` | `DUMMY_FIXTURE_FIREBASE_KEY`（旧 Firebase `apiKey` — redact 済） | **DUMMY 化** |
| `klse-sample-5183.html` | 同上 | **DUMMY 化** |
| `klse-sample-5819.html` | 同上 | **DUMMY 化** |

置換値: `DUMMY_FIXTURE_FIREBASE_KEY`（`klse-sample-1155.html` と同方式）

### 5.2 add 前再スキャン（パターン）

対象文字列: `AIza`, `sk-`, `Bearer`, `OPENAI`, `NEWSAPI`, `REDDIT`, `CLIENT_SECRET`, `apiKey`, `token`, `secret`

| 結果 |
|------|
| 生キー（`AIzaSy…`）**なし** |
| `apiKey` は `DUMMY_FIXTURE_FIREBASE_KEY` のみ |

### 5.3 staged diff スキャン

| パターン | 結果 |
|----------|------|
| `AIzaSy…` / `sk-…` / `Bearer …` | **検出なし** |
| pre-commit hook | **PASS**（commit 成功） |

---

## 6. 禁止ファイル混入なし確認

| 禁止カテゴリ | staged 9 件 | 結果 |
|--------------|-------------|------|
| `scripts/openai-buy-hybrid-analysis.json` | 含まない | **PASS** |
| `scripts/best-strategy-regional-grid-optimization.json` | 含まない | **PASS** |
| `docs/review/phase12-5-long-run/**` | 含まない | **PASS** |
| `*.png` / `*.jpg` / `*.log` | 含まない | **PASS** |
| `.env` | 含まない | **PASS** |
| device verify 成果物 | 含まない | **PASS** |
| 855 件一括 add | 該当なし（9 件のみ） | **PASS** |

---

## 7. `git diff --cached --stat`（commit 前）

```
 scripts/klse-sample-1066.html                    | 7628 ++++++++++++++++++++
 scripts/klse-sample-5183.html                    | 6828 ++++++++++++++++++
 scripts/klse-sample-5819.html                    | 8181 ++++++++++++++++++++++
 src/services/analysisApiKeys.ts                  |   23 +-
 src/services/bursa/bursaKlseHtmlClient.ts        |   54 +
 src/services/bursa/bursaMacroSectorAdjustment.ts |  141 +
 src/services/bursa/bursaMaterialSources.ts       |   14 +-
 src/services/bursa/bursaTrendAnalysis.ts         |   12 +-
 src/services/globalMarketQuoteService.ts         |    7 +
 9 files changed, 22876 insertions(+), 12 deletions(-)
```

---

## 8. typecheck 結果

```bash
npm run typecheck
```

| 項目 | 結果 |
|------|------|
| exit code | **0** |
| errors | **0** |
| 判定 | **PASS** |

> Commit 5 準備時の隔離 worktree **14 errors** は解消。

---

## 9. Commit 6 直結 unit test 結果

```bash
npx vitest run \
  tests/unit/bursaPhase11.test.ts \
  tests/unit/bursaPhase19.test.ts \
  tests/unit/bursaPhase19_5.test.ts \
  tests/unit/bursaPayloadNormalize.test.ts
```

| ファイル | tests | 結果 |
|----------|-------|------|
| `bursaPhase11.test.ts` | 4 | **PASS** |
| `bursaPhase19.test.ts` | 5 | **PASS** |
| `bursaPhase19_5.test.ts` | 4 | **PASS** |
| `bursaPayloadNormalize.test.ts` | 6 | **PASS** |
| **合計** | **19** | **PASS** |

Duration: ~3.5s

---

## 10. Phase3–9 回帰テスト結果

```bash
npx vitest run tests/unit/bursaPhase3.test.ts … bursaPhase9.test.ts
```

| ファイル | tests | 結果 |
|----------|-------|------|
| `bursaPhase3.test.ts` | 2 | **PASS** |
| `bursaPhase4.test.ts` | 3 | **PASS** |
| `bursaPhase5.test.ts` | 4 | **PASS** |
| `bursaPhase6.test.ts` | 4 | **PASS** |
| `bursaPhase7.test.ts` | 4 | **PASS** |
| `bursaPhase8.test.ts` | 5 | **PASS** |
| `bursaPhase9.test.ts` | 3 | **PASS** |
| **合計** | **25** | **PASS** |

Duration: ~2.7s

---

## 11. full unit test 実行有無と結果

| 項目 | 値 |
|------|-----|
| 実行 | **あり** |
| コマンド | `npm run test:unit` |
| exit code | **0** |
| Test Files | **321 passed (321)** |
| Tests | **1392 passed (1392)** |
| Duration | ~35s |
| 判定 | **PASS** |

### 11.1 除外扱いテスト（push 判定用メモ）

今回の full run では以下も **PASS** したが、**Commit 6 に含まれないローカル untracked 成果物**に依存:

| テスト | 依存ファイル | Commit 6 | 隔離 clone での扱い |
|--------|-------------|----------|---------------------|
| `buySignalForwardReturnAnalysis.test.ts` | `scripts/openai-buy-hybrid-analysis.json` 等 | **含まない** | **push 判定から除外推奨**（`openai-*.json` コミット禁止） |
| `regionalCagrAudit.test.ts` | `scripts/best-strategy-regional-grid-optimization.json` 等 | **含まない** | **push 判定から除外推奨**（監査成果物） |

> メイン working tree では untracked JSON が存在するため PASS。隔離 worktree 再監査時は上記 2 件をゲート外とするか、スキップ方針を維持すること。

---

## 12. commit

```bash
git commit -m "phase13-23: close dependency gaps for isolated typecheck and phase11-19 wiring"
```

| 項目 | 値 |
|------|-----|
| hash（短） | `1254701` |
| hash（完全） | `125470171dad71ba51b795ffb4d9f2be7bfd158f` |
| files changed | 9 |
| insertions / deletions | +22,876 / -12 |

### Commits 1–6 一覧（local only）

| # | hash | message |
|---|------|---------|
| 1 | `cd30181` | phase13-16: earnings call through institutional intelligence |
| 2 | `a822b46` | phase17-19.5: dividend, news intelligence, macro and sector rotation |
| 3 | `b2da697` | phase20-21.8: valuation and fair value intelligence with validation |
| 4 | `2bd2005` | phase22-22.1: analyst target and valuation gap intelligence |
| 5 | `074b3ce` | phase22.2-23: conviction and earnings revision intelligence with pipeline wiring |
| 6 | `1254701` | phase13-23: close dependency gaps for isolated typecheck and phase11-19 wiring |

---

## 13. remote との差分

| 項目 | 値 |
|------|-----|
| `origin/cursor/top3-maxdd-capital-audit` | `338ebc4351ed08046f0a07a79e0dbd0c57b3a720` |
| local HEAD | `125470171dad71ba51b795ffb4d9f2be7bfd158f` |
| `git rev-list --left-right --count origin/...HEAD` | **0	6** |
| branch status | `ahead 6` |

---

## 14. push 未実施確認

| チェック | 結果 |
|----------|------|
| `git push` 実行 | **なし** |
| remote 更新 | **なし**（`338ebc4` のまま） |

---

## 15. PASS / FAIL

| チェック | 判定 |
|----------|------|
| 実行前 HEAD = `074b3ce` | **PASS** |
| 必須 6 件 stage / commit | **PASS** |
| fixture 3 件（DUMMY 化後） | **PASS** |
| 禁止ファイル混入なし | **PASS** |
| typecheck | **PASS** |
| Commit 6 直結 unit tests | **PASS** |
| Phase3–9 回帰 | **PASS** |
| full `test:unit` | **PASS** |
| commit 成功 | **PASS** |
| push 未実施 | **PASS** |
| **総合（Commit 6 実行）** | **PASS** |

---

## 16. 停止宣言

Commit 6 実行完了。`git push` は **一切実行していない**。

次ステップ（ユーザー承認後）: 隔離 worktree を `1254701` で更新 → push readiness 最終再監査 → `git push -u origin cursor/top3-maxdd-capital-audit`

---

*Evidence: `git diff --cached --stat`, fixture シークレットスキャン, `npm run typecheck`, vitest 4+7 files, `npm run test:unit`（321/321）*
