# Commit 10 — Phase12.5 Logcat Finalization 準備監査

**監査日時:** 2026-06-12T07:54+08:00  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**HEAD:** `9e59afa44c6e46952ebd7e19a9f5d413e153040b` — bursa: harden null-safety and monitoring snapshot normalization  
**git add / commit / push:** **未実施**

---

## 1. git status --porcelain -uall（サマリー）

| 項目 | 値 |
|------|-----|
| 総行数 | **729** |
| docs/review・ログ・成果物系（除外対象パターン） | **594** 行（混入リスク — Commit 10 には含めない） |
| Commit 10 コード候補 | **3 ファイル**（下記） |

### Commit 10 候補ファイルの git 状態

```
 M scripts/phase12-5-long-run.mjs
?? scripts/lib/phase12-5-logcat-finalization.mjs
?? tests/unit/phase12-5LogcatFinalization.test.ts
```

### ユーザー指定候補との差分

| ファイル | 状態 |
|----------|------|
| `scripts/lib/phase12-5-logcat-finalization.mjs` | **新規（??）** — Commit 10 に含める |
| `scripts/phase12-5-long-run.mjs` | **変更（M）** — +169 / −36 行 — Commit 10 に含める |
| `tests/unit/phase12-5LogcatFinalization.test.ts` | **新規（??）** — Commit 10 に含める |
| `tests/unit/phase12Stability.test.ts` | **HEAD と差分なし** — 回帰テスト実行のみ、**Commit 10 には含めない** |

---

## 2. Commit 10 候補ファイル一覧（ステージ対象）

| # | パス | 種別 | 行数（概算） |
|---|------|------|-------------|
| 1 | `scripts/lib/phase12-5-logcat-finalization.mjs` | 新規 | ~187 |
| 2 | `scripts/phase12-5-long-run.mjs` | 変更 | +169 / −36 |
| 3 | `tests/unit/phase12-5LogcatFinalization.test.ts` | 新規 | ~80 |

**合計:** 3 ファイル · 約 +436 行（新規 lib + test、long-run 差分）

---

## 3. 修正内容（要約）

| 変更 | 内容 |
|------|------|
| logcat 周期書き込み廃止 | `scanLogcatDelta()` から固定名 `logcat-final.txt` の `writeFileSync` を **削除** |
| timestamp 付き final | `finalizeLogcatSnapshot()` — `adb-logcat-final-YYYYMMDD-HHMMSS.log` / `logcat-snapshot-*.txt` |
| live / final 分離 | live=`adb-logcat-live.log`（追記専用）、final=終了時コピー |
| WARN 化 | 書き込み失敗は `logFinalizationWarnings[]` に記録、**throw しない** |
| FAIL / WARN 分離 | テスト本体 FAIL（crash/ANR/PID/adb/Metro/価格）と WARN（logcat/UI/メモリ）を分離 |
| exit code | log finalization 失敗のみでは **exit 1 にしない** |
| dry-run | `PHASE12_5_DRY_RUN=1` モード追加 |
| mock fail | `PHASE12_5_LOGCAT_FINALIZE_MOCK_FAIL=1` で WARN 模擬 |

---

## 4. 混入チェック（Commit 10 候補ファイル内）

| 確認項目 | 結果 |
|----------|------|
| `docs/review/**` をコミット内容に含む | **PASS** — 候補 3 ファイルに review 成果物なし（パス文字列定数のみ） |
| `.log` / logcat 実データ | **PASS** |
| `.json` / `.xml` / `.png` / `.html` | **PASS** |
| forward-validation 成果物 | **PASS** |
| `.cursorignore` | **PASS**（候補外 — ワークツリーに M あり、Commit 10 除外） |

**判定:** Commit 10 候補 3 ファイルは **コードのみ** — 安全に分離可能。

---

## 5. 除外ファイル一覧（Commit 10 に含めない）

### カテゴリ別件数（porcelain 729 行中）

| カテゴリ | 例 | 扱い |
|----------|-----|------|
| `docs/review/**` | レポート `.md`、phase12-5-long-run 成果物 | **除外** |
| ログ | `twelve-hour-test/*.log`, `logcat-final.txt` | **除外** |
| JSON / XML / PNG | checkpoint.json, telemetry.jsonl, ai-hour-*.png, *.xml | **除外** |
| HTML | scripts/*.html 等 | **除外** |
| forward-validation | `scripts/openai-*.json` 等 | **除外** |
| `.cursorignore` | M | **除外** |
| 無関係スクリプト M | `operational-api-test.mjs`, `verify-ai-enhanced-analysis-device.mjs` | **除外** |
| 無関係 ?? scripts | `phase12-5-fetch-bursa-quotes.ts`, `phase12-5-start-snapshot-collect.mjs` | **除外** |

### 主要除外パス（抜粋）

```
 M .cursorignore
 M docs/review/PHASE12_5_LONG_RUN_REPORT.md
 M docs/review/phase12-5-long-run/**  (png, xml, json, jsonl, txt, logcat-final.txt)
?? docs/review/PHASE12_5_LOGCAT_FINALIZATION_FIX_REPORT.md
?? docs/review/twelve-hour-test/NEXT_RUN_PREP_NOTE.md
?? docs/review/twelve-hour-test/adb-logcat-final-*.log
?? docs/review/phase12-5-long-run/logcat-snapshot-*.txt
 M scripts/operational-api-test.mjs
 M scripts/verify-ai-enhanced-analysis-device.mjs
 (+ その他 docs/review レポート多数)
```

---

## 6. Secret scan

| 対象 | パターン | 結果 |
|------|----------|------|
| 候補 3 ファイル | `AIzaSy`, `sk-…`, api_key, secret, token, password | **PASS（ヒットなし）** |

**判定:** **PASS**

---

## 7. typecheck

```
npm run typecheck
```

| 結果 | **PASS**（exit 0） |

---

## 8. Unit test

```
npx vitest run tests/unit/phase12-5LogcatFinalization.test.ts tests/unit/phase12Stability.test.ts
```

| スイート | 結果 |
|----------|------|
| phase12-5LogcatFinalization | **6/6 PASS** |
| phase12Stability（回帰） | **5/5 PASS** |
| **合計** | **11/11 PASS** |

---

## 9. dry-run

```powershell
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
$env:PHASE12_5_DRY_RUN="1"
node scripts/phase12-5-long-run.mjs
```

| 実行 | 結果 |
|------|------|
| **本監査（2026-06-12 07:54）** | **FAIL exit 2** — `adb device not found`（端末未接続） |
| 参考: 修正直後（2026-06-12 06:29、端末接続時） | **PASS exit 0** — final log + snapshot 生成確認済み |

**注:** 現行 `main()` は dry-run 前に `adbOk()` を要求するため、端末未接続時は dry-run 不可。

**判定:** **CONDITIONAL** — コードは準備完了。Commit 10 push 前または 12h 再開前に **adb 接続下で dry-run を 1 回再実行**推奨。

---

## 10. commit 可否

| 判定 | **CONDITIONAL PASS — Commit 10 実行可** |
|------|----------------------------------------|

### 条件

1. **ステージするのは 3 ファイルのみ**（phase12Stability.test.ts は差分なしのため含めない）
2. docs/review・ログ・成果物・`.cursorignore` は **一切 add しない**
3. push 前に adb 接続下で dry-run を 1 回再確認（推奨）

### 推奨ステージコマンド（参考・未実行）

```powershell
git add scripts/lib/phase12-5-logcat-finalization.mjs `
        scripts/phase12-5-long-run.mjs `
        tests/unit/phase12-5LogcatFinalization.test.ts
```

---

## 11. 推奨 commit message

```
phase12.5: harden logcat finalization for long-run tests
```

---

## 12. git 操作

`git add` / `git commit` / `git push` — **未実施**（準備監査のみ）

---

## 13. 関連ドキュメント（Commit 10 外・参考）

| ファイル | 用途 |
|----------|------|
| `docs/review/PHASE12_5_LOGCAT_FINALIZATION_FIX_REPORT.md` | 修正詳細（別コミット or 後続 docs batch） |
| `docs/review/twelve-hour-test/NEXT_RUN_PREP_NOTE.md` | 次回 12h 再開手順 |
