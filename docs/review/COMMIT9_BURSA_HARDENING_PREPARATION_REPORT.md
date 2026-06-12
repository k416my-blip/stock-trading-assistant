# Commit 9 準備レポート — Bursa Hardening

準備日: 2026-06-02  
コミット予定メッセージ: `bursa: harden null-safety and monitoring snapshot normalization`  
実施範囲: **restore + 精査 + 検証のみ**（`git add` / `commit` / `push` は **未実施・禁止**）  
前提: Commit 1〜8 push 済み、`POST_COMMIT8_WORKTREE_AUDIT_REPORT.md` で Commit 9 承認済み

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| HEAD | `92a335e637cad9d29c1047262c54d39ec0c345e7` — **PASS** |
| remote 同期 | `0	0` — **PASS** |
| D 状態解消 | **0 件** — **PASS** |
| Commit 9 対象 | **9 件**（bursa のみ）— **PASS** |
| 依存関係 | **閉じている** — **PASS** |
| シークレットスキャン | **PASS**（REDDIT 1 件は識別子の誤検知） |
| `npm run typecheck` | **PASS** |
| unit test | **12/12 PASS** |
| **commit 可否** | **PASS**（ユーザー承認済み。実行は次ステップ） |

---

## 1. HEAD 確認

```
92a335e637cad9d29c1047262c54d39ec0c345e7
```

ブランチ: `cursor/top3-maxdd-capital-audit`  
親コミット: Commit 8 — `twelve-hour-runtime: wire stability monitor, device audit, and bursa error boundaries`

---

## 2. remote 同期確認

```bash
git rev-list --left-right --count origin/cursor/top3-maxdd-capital-audit...HEAD
```

| 結果 | 期待値 | 判定 |
|------|--------|------|
| `0	0` | `0 0` | **PASS** |

---

## 3. D 状態解消確認

### 3.1 実施コマンド

```bash
git restore scripts/kill-metro.ps1
git restore scripts/capture-daily-comment-verify-screenshot.mjs
```

### 3.2 確認

```bash
git status --porcelain | grep '^D \|^ D'
```

| 項目 | 期待値 | 実測 | 判定 |
|------|--------|------|------|
| D 状態件数 | 0 | **0** | **PASS** |

両ファイルは HEAD の内容で復元済み。`package.json` の `kill:metro` 参照も整合。

---

## 4. Commit 9 対象 9 件一覧

| # | パス | 状態 | テーマ |
|---|------|------|--------|
| 1 | `src/services/bursa/bursaMaterialDataQuality.ts` | M | 材料配列 `?? []`、`sourceStatus` null ガード |
| 2 | `src/services/bursa/bursaMonitoringDetectors.ts` | M | 検出ロジック堅牢化 |
| 3 | `src/services/bursa/bursaMonitoringStorage.ts` | M | 空/壊れ JSON 除去 + `normalizeMonitoringSnapshot` |
| 4 | `src/services/bursa/bursaPeerSnapshotService.ts` | M | peer スナップショット null ガード |
| 5 | `src/services/bursa/bursaPhase6Analysis.ts` | M | Phase6 null ガード |
| 6 | `src/services/bursa/bursaPhase7Analysis.ts` | M | Phase7 null ガード |
| 7 | `src/services/bursa/bursaPhase8Analysis.ts` | M | Phase8 null ガード |
| 8 | `src/services/bursa/bursaRankingMetrics.ts` | M | `annualRecords` / `dividend.history` `?? []` |
| 9 | `src/services/bursa/bursaShikihoComments.ts` | M | コメント生成堅牢化 |

`git status --porcelain` で bursa 配下の変更は上記 **9 件のみ**（他 bursa ファイルに M なし）。

---

## 5. 依存関係

### 5.1 9 ファイル内の import（HEAD 既存のみ）

| ファイル | 参照先（すべて HEAD 既存） |
|----------|---------------------------|
| `bursaMaterialDataQuality.ts` | `../../types/bursaDisclosure` のみ |
| `bursaMonitoringDetectors.ts` | `bursaTrendAnalysis` |
| `bursaMonitoringStorage.ts` | `bursaPayloadNormalize`（**新規追加ファイルなし**） |
| `bursaPeerSnapshotService.ts` | `bursaDisclosureCache`, `bursaKlseHtmlClient`, `bursaCompanyProfileService`, `bursaQuarterlyService`, `bursaTrendAnalysis` |
| `bursaPhase6Analysis.ts` | `bursaDisclosureService`, `bursaPeerSnapshotService`, `bursaPhase6Scoring`, `bursaStockUniverse` |
| `bursaPhase7Analysis.ts` | Phase3/5/6, `bursaRankingMetrics`, `bursaPeerSnapshotService`, 他 bursa 既存 |
| `bursaPhase8Analysis.ts` | Phase3/5/6/7, `bursaPeerSnapshotService`, `bursaTodayActions`, 他 bursa 既存 |
| `bursaRankingMetrics.ts` | `bursaTrendAnalysis`, `bursaYearUtil`, `bursaKlseParser` |
| `bursaShikihoComments.ts` | `bursaTrendAnalysis`, `bursaYearUtil` |

### 5.2 閉じていることの根拠

- **新規ファイル:** 0（`bursaPayloadNormalize.ts` は Commit 8 以前から HEAD に存在）
- **forward-validation:** 非依存（tsconfig exclude）
- **UI / Context 変更:** 0（Commit 9 範囲外）
- **scripts / docs 変更:** 0（9 ファイル stage 時に混入しない想定）

### 5.3 下流（変更不要・HEAD 既存）

`MarketMonitoringScreen`, `bursaPhase9Analysis`, `bursaPhase10Analysis`, `bursaMaterialAnalysisService`, `TodayTradingScreen`, `AssetManagementScreen`, `BursaDiscoveryScreen`, `aiStockReportService`

**判定: 依存グラフ閉じ — PASS**

---

## 6. diff 規模

```bash
git diff HEAD --stat -- <9 files>
```

```
 src/services/bursa/bursaMaterialDataQuality.ts | 19 ++++++++++---------
 src/services/bursa/bursaMonitoringDetectors.ts |  2 +-
 src/services/bursa/bursaMonitoringStorage.ts   | 12 ++++++++++--
 src/services/bursa/bursaPeerSnapshotService.ts |  8 ++++----
 src/services/bursa/bursaPhase6Analysis.ts      |  4 ++--
 src/services/bursa/bursaPhase7Analysis.ts      |  4 ++--
 src/services/bursa/bursaPhase8Analysis.ts      |  6 +++---
 src/services/bursa/bursaRankingMetrics.ts      | 10 +++++-----
 src/services/bursa/bursaShikihoComments.ts     |  2 +-
 9 files changed, 38 insertions(+), 29 deletions(-)
```

---

## 7. シークレットスキャン

### 7.1 対象パターン

`sk-` / `AIza` / `Bearer` / `OPENAI` / `NEWSAPI` / `REDDIT` / `CLIENT_SECRET`

### 7.2 スキャン方法

9 ファイルの **working tree 全文** および **`git diff HEAD` 差分** を上記パターンで検索。

### 7.3 結果

| パターン | ヒット | 判定 |
|----------|--------|------|
| `sk-` | 0 | PASS |
| `AIza` | 0 | PASS |
| `Bearer` | 0 | PASS |
| `OPENAI` | 0 | PASS |
| `NEWSAPI` | 0 | PASS |
| `CLIENT_SECRET` | 0 | PASS |
| `REDDIT` | 1（diff） | **誤検知** — `status.reddit` ソースキー名（`BursaMaterialSource` の列挙値）。認証情報ではない |

**総合: PASS**

---

## 8. typecheck 結果

```bash
npm run typecheck
```

| 項目 | 結果 |
|------|------|
| コマンド | `tsc --noEmit -p tsconfig.typecheck.json` |
| exit code | 0 |
| エラー | 0 |
| **判定** | **PASS** |

---

## 9. test 結果

### 9.1 実行コマンド

```bash
npx vitest run \
  tests/unit/bursaMaterialDataQuality.test.ts \
  tests/unit/bursaRanking.test.ts \
  tests/unit/bursaPhase9.test.ts \
  tests/unit/bursaPhase10.test.ts
```

> 注: リポジトリに `bursaRankingMetrics.test.ts` は存在せず、同等カバレッジは `bursaRanking.test.ts`（`bursaRankingMetrics` を間接検証）。

### 9.2 結果

| ファイル | テスト数 | 結果 |
|----------|----------|------|
| `bursaMaterialDataQuality.test.ts` | 3 | PASS |
| `bursaRanking.test.ts` | 3 | PASS |
| `bursaPhase9.test.ts` | 3 | PASS |
| `bursaPhase10.test.ts` | 3 | PASS |
| **合計** | **12** | **12/12 PASS** |

Vitest: 4 files passed, Duration ~1.4s

---

## 10. commit 可否

| チェック | 結果 |
|----------|------|
| ユーザー承認 | **済**（POST_COMMIT8 監査後） |
| D 状態解消 | **PASS** |
| 単一テーマ 9 件 | **PASS** |
| 依存完結 | **PASS** |
| シークレット | **PASS** |
| typecheck | **PASS** |
| unit test 12/12 | **PASS** |
| **commit 準備** | **PASS — 実行可能** |

### 推奨 stage コマンド（次ステップ参考・本レポートでは未実行）

```bash
git add \
  src/services/bursa/bursaMaterialDataQuality.ts \
  src/services/bursa/bursaMonitoringDetectors.ts \
  src/services/bursa/bursaMonitoringStorage.ts \
  src/services/bursa/bursaPeerSnapshotService.ts \
  src/services/bursa/bursaPhase6Analysis.ts \
  src/services/bursa/bursaPhase7Analysis.ts \
  src/services/bursa/bursaPhase8Analysis.ts \
  src/services/bursa/bursaRankingMetrics.ts \
  src/services/bursa/bursaShikihoComments.ts
```

---

## 11. 推奨 commit message

```
bursa: harden null-safety and monitoring snapshot normalization
```

---

## 12. PASS / FAIL 総合判定

| 観点 | 判定 |
|------|------|
| restore 実施 | **PASS** |
| D 状態 0 件 | **PASS** |
| Commit 9 対象整合 | **PASS** |
| 依存関係 | **PASS** |
| diff 規模確認 | **PASS** |
| シークレットスキャン | **PASS** |
| typecheck | **PASS** |
| unit test 12/12 | **PASS** |
| **本準備タスク** | **PASS** |

---

## 13. 停止確認

- `git add` — **未実施**
- `git commit` — **未実施**
- `git push` — **未実施**

準備レポート作成完了。Commit 9 実行は次の明示指示まで停止。
