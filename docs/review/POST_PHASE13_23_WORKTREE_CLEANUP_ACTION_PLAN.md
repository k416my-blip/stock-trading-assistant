# Post Phase13–23 B/D 整理アクションプラン（Commit 7 前準備）

監査日: 2026-06-02  
前提: Phase13–23 Commits 1〜6 は GitHub push 完了（`1254701`）  
実施範囲: **準備レポートのみ**（`git restore` / `rm` / `git add` / `commit` / `push` は **未実施**）

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| HEAD | `125470171dad71ba51b795ffb4d9f2be7bfd158f` |
| remote 同期 | **0	0 — PASS** |
| 現在の未コミット件数 | **702 件**（modified **91** / untracked **611**） |
| **A. git restore 候補** | **62 件**（tracked の実行成果物汚染） |
| **B. rm / delete 候補** | **~165 件**（untracked 生成物） |
| **C. .gitignore 追加候補** | **12 パターン** |
| **D. 絶対保護** | `.env` + Phase13–23 push 済みコード + Commit 7 候補 |
| **E. Commit 7 候補（残す）** | **24 件**（全件 dirty tree に存在 — **PASS**） |
| 整理後の想定残件数 | **~478 件**（+ 本レポート 1 件で **~479**） |
| **総合判定** | **PASS**（実行準備完了。破壊的操作は未実施） |

---

## 1. 現在 HEAD

```
125470171dad71ba51b795ffb4d9f2be7bfd158f
```

message: `phase13-23: close dependency gaps for isolated typecheck and phase11-19 wiring`（Commit 6）

---

## 2. remote 同期確認

```bash
git rev-list --left-right --count origin/cursor/top3-maxdd-capital-audit...HEAD
```

| 結果 | 期待値 | 判定 |
|------|--------|------|
| `0	0` | `0 0` | **PASS** |

---

## 3. 現在の未コミット件数

```bash
git status --porcelain
```

| 区分 | 件数 |
|------|------|
| **合計** | **702** |
| modified (` M`) | 91 |
| untracked (`??`) | 611 |

> 前回監査（`POST_PHASE13_23_WORKTREE_CLEANUP_AUDIT_REPORT.md`）は **701 件**。一時ファイルの増減で ±1〜2 の揺れは正常範囲。

---

## 4. 分類一覧（A〜E）

### A. git restore 候補（62 件）

tracked だがローカル実行で汚れた成果物。**HEAD の内容に戻す**（ファイル削除ではない）。

#### A-1. phase12-5 長時間実行（tracked 分）

| 件数 | パス |
|------|------|
| 2 | `docs/review/PHASE12_5_LONG_RUN_REPORT.md`, `docs/review/PHASE12_5_PARTIAL_REPORT.md` |
| 41 | `docs/review/phase12-5-long-run/**`（png / xml / txt / json / jsonl） |

#### A-2. device verify 成果物（tracked 分）

| 件数 | パス |
|------|------|
| 13 | `scripts/ai-enhanced-analysis-device-verify/**`（png / xml / json） |
| 1 | `docs/review/third-party-review-2026-06-09/evidence/ai-enhanced-analysis-device-verify.json` |

#### A-3. 古い監査 JSON 出力（tracked 再出力）

| 件数 | パス |
|------|------|
| 3 | `scripts/top3-feature-walkforward-dd-audit.json`, `scripts/top3-feature-walkforward-oos-ranking.json`, `scripts/top3-feature-walkforward-oos-ranking-capital-normalized.json` |

#### A-4. ローカル専用設定・スクリプト差分

| 件数 | パス | 備考 |
|------|------|------|
| 1 | `.vscode/settings.json` | IDE 個人設定（`.gitignore` 対象だが tracked 汚染） |
| 1 | `scripts/phase12-5-long-run.mjs` | 長時間実行スクリプトのローカル改変 |
| 1 | `scripts/device-ui-automation.mjs` | ※現状 porcelain に無し（既に clean の可能性） |

**restore 対象外（判断保留 C）**: `scripts/operational-api-test.mjs`, `scripts/verify-ai-enhanced-analysis-device.mjs` — スクリプト本体の改変。成果物ではなくコード差分のため本 B/D 整理では触らない。

---

### B. rm / delete 候補（~165 件）

untracked の生成物。**ディスクから削除**（git 履歴には影響なし）。

#### B-1. OpenAI / ローカル分析 JSON・TXT（55 行 = 50 json + 5 txt）

```
scripts/openai-*.json          # 50 件
scripts/openai-*-run.txt       # 5 件（action-horizon / buy-clustered / streak-details / symbol-action 等）
scripts/openai-buy-vs-proxy.txt
```

代表例: `openai-1023-*`, `openai-buy-*`, `openai-best-rule-*`, `openai-304-*`, `openai-30d-report.json` 等。

#### B-2. その他ローカル分析 JSON

| パス |
|------|
| `scripts/atr-ratio-forward20-correlation.json` |
| `scripts/buy-signal-forward-returns.json` |
| `scripts/forward20-feature-exploration-ranking.json` |

#### B-3. phase12-5 長時間実行（untracked 分）

| 件数 | 代表 |
|------|------|
| ~30 | `docs/review/phase12-5-long-run/RKStorage-pull.db`, `ai-hour-7.png`, `meminfo-hour-*.txt`, `price-h7-*.xml`, `tab-scroll-保有銘柄-*.xml` 等 |

#### B-4. device verify（untracked 分）

| 件数 | 代表 |
|------|------|
| ~40 | `scripts/ai-enhanced-analysis-device-verify/05-scroll-*.xml`, `error-state.png`, `02-concierge-open-retry.xml` |
| 1 dir | `scripts/api-key-device-verify/**` |

#### B-5. 一時ログ・TXT

| パス |
|------|
| `.expo-start-log.txt` |
| `docs/review/WIFI_ADB_VERIFY_OUTPUT.txt` |
| `docs/review/undefined-fix-logcat.txt`, `undefined-fix-logcat-excerpt.txt` |
| `scripts/conflict-analysis-out.txt` |
| `scripts/buy-signal-forward-returns-run.txt` |
| `scripts/metro-recovery-logcat.txt` |
| `scripts/reload-loop-logcat-filtered.txt` |
| `scripts/test-unit-readme-run.txt`, `scripts/test-unit-stabilization-run.txt` |
| `scripts/_typecheck-out.txt` |

#### B-6. 一時 PNG / HTML（device / portfolio 検証）

| 件数 | 代表 |
|------|------|
| ~35 | `scripts/00-*.png`, `scripts/01-*.png`, `scripts/02-*.png`, `scripts/03-*.png` |
| | `scripts/portfolio-*.png`, `scripts/bursa-phase1-device-*.png`, `scripts/candidate-flow-*.png` |
| 2 | `scripts/action-center-expected-v2.html`, `scripts/action-center-expected-v2.png` |

#### B-7. 一時スクリプト（再生成可能）

| パス |
|------|
| `scripts/capture-daily-comment-verify-screenshot.mjs` |
| `scripts/concierge-maybank-perf.ts` |
| `scripts/kill-metro.ps1` |

#### B-8. ディスク上のみ（git status 非表示 — `.gitignore` 済み）

| パス | 備考 |
|------|------|
| `.expo-bundle-eager/**` | 約 38 ファイル（bundle + assets） |
| `.expo-bundle-head/**` | 同上 |
| `.expo-bundle-test/**` | 同上 |
| `agent-tools/**` | デバイススクショ等 |

> これらは `git status` に出ないが、ディスク容量・誤 add 防止のため **任意で削除** を推奨。

---

### C. .gitignore 追加候補

現行 `.gitignore` に未記載、またはパターン不足のもの。**次回コミット時に `.gitignore` だけ先に add する案**（本手順では未実施）。

```gitignore
# --- 追加候補（B/D 再発防止）---
scripts/openai-*.json
scripts/openai-*-run.txt
scripts/openai-buy-vs-proxy.txt
docs/review/phase12-5-long-run/
scripts/ai-enhanced-analysis-device-verify/
scripts/api-key-device-verify/
scripts/*-run.txt
scripts/*-out.txt
scripts/portfolio-*.png
scripts/candidate-flow-*.png
scripts/bursa-phase1-device-*.png
.expo-start-log.txt
```

> 既存: `.expo-bundle-*/`, `agent-tools/`, `scripts/device-screenshot*.png` は **既に ignore 済み**。

---

### D. 絶対に保護するもの

| 対象 | 状態 | 保護理由 |
|------|------|----------|
| `.env` | ローカル存在（`True`） | API キー・シークレット本体。**絶対 add 禁止** |
| `.env.*` | gitignore 済 | 同上 |
| `credentials.json`, `secrets.json`, `firebase-adminsdk*`, `google-services.json` | 不在 / ignore | シークレット類 |
| Phase13–23 push 済みコード | `1254701` @ remote | 本整理の restore/delete 対象に **含めない** |
| Commit 7 候補（下記 E） | dirty tree に存在 | restore/delete コマンドから **明示除外** |
| Bearer / `sk-` / `AIza` 生キー | — | ステージ前スキャン必須 |

**restore/delete コマンド設計原則**: パスを **明示列挙** または **狭い glob**。`src/**` や `docs/review/PHASE13*` への一括 restore/delete は **禁止**。

---

### E. Commit 7 候補として残す対象（24 件）

全件 `git status --porcelain` で確認済み。**restore/delete 対象ゼロ — PASS**。

| パス | 状態 |
|------|------|
| `src/context/BursaMaterialContext.tsx` | M |
| `src/context/ProactiveConciergeContext.tsx` | M |
| `src/screens/SettingsScreen.tsx` | M |
| `src/constants/storageKeys.ts` | M |
| `src/services/twelveHourTestMonitor.ts` | ?? |
| `src/services/twelveHourTestMonitorCore.ts` | ?? |
| `src/services/twelveHourTestMonitorPersistence.ts` | ?? |
| `src/types/twelveHourTestMonitor.ts` | ?? |
| `src/constants/twelveHourTestMonitor.ts` | ?? |
| `src/hooks/useTwelveHourTestRuntime.ts` | ?? |
| `src/services/deviceLiveApiAudit.ts` | ?? |
| `src/constants/deviceLiveApiAudit.ts` | ?? |
| `src/constants/newsApiRateLimit.ts` | ?? |
| `src/components/BursaDataErrorBoundary.tsx` | ?? |
| `tests/unit/twelveHourTestMonitor.test.ts` | ?? |
| `tests/unit/newsApiRateLimit.test.ts` | ?? |
| `tests/unit/phase12Stability.test.ts` | ?? |
| `package.json` | M |
| `scripts/twelve-hour-test-preflight-verify.ts` | ?? |
| `scripts/twelve-hour-api-key-audit.mjs` | ?? |
| `scripts/verify-material-fallback-without-newsapi.ts` | ?? |
| `scripts/newsapi-429-diagnosis.mjs` | ?? |
| `scripts/git-safe-sync-after-report.mjs` | ?? |
| `scripts/phase12-stability-test.mjs` | ?? |

#### Commit 7 安全性チェック

| チェック | 結果 |
|----------|------|
| 24 件すべて dirty tree に存在 | **PASS** |
| restore 候補との交差 | **0 件 — PASS** |
| delete 候補との交差 | **0 件 — PASS** |
| `App.tsx` | **clean**（整理対象外） |

---

## 5. 実行予定コマンド案（未実行）

> **警告**: 以下は **案のみ**。ユーザー承認後に段階実行すること。  
> PowerShell / Git Bash 混在環境のため、パスに日本語・空白があるものはクォート必須。

### Step 0 — 事前確認（読み取りのみ）

```bash
git rev-parse HEAD
git rev-list --left-right --count origin/cursor/top3-maxdd-capital-audit...HEAD
git status --porcelain | wc -l   # または Measure-Object
test -f .env && echo ".env EXISTS — do not add"
```

### Step 1 — git restore（A: 62 件）

```bash
# phase12-5 tracked 成果物
git restore docs/review/PHASE12_5_LONG_RUN_REPORT.md
git restore docs/review/PHASE12_5_PARTIAL_REPORT.md
git restore docs/review/phase12-5-long-run/

# device verify tracked 成果物
git restore scripts/ai-enhanced-analysis-device-verify/
git restore docs/review/third-party-review-2026-06-09/evidence/ai-enhanced-analysis-device-verify.json

# 古い監査 JSON（tracked 再出力）
git restore scripts/top3-feature-walkforward-dd-audit.json
git restore scripts/top3-feature-walkforward-oos-ranking.json
git restore scripts/top3-feature-walkforward-oos-ranking-capital-normalized.json

# IDE / 長時間実行スクリプト
git restore .vscode/settings.json
git restore scripts/phase12-5-long-run.mjs
```

### Step 2 — rm / delete（B: untracked ~165 件）

```bash
# OpenAI / ローカル分析（D カテゴリ — 絶対コミット禁止）
rm -f scripts/openai-*.json scripts/openai-*-run.txt scripts/openai-buy-vs-proxy.txt
rm -f scripts/atr-ratio-forward20-correlation.json
rm -f scripts/buy-signal-forward-returns.json scripts/buy-signal-forward-returns-run.txt
rm -f scripts/forward20-feature-exploration-ranking.json

# phase12-5 untracked 成果物（tracked は Step 1 で restore 済み想定）
rm -rf docs/review/phase12-5-long-run/RKStorage-pull.db
# または untracked のみ一括（tracked restore 後）:
# git clean -fd docs/review/phase12-5-long-run/   # ※要 dry-run 先

# device verify untracked
rm -rf scripts/ai-enhanced-analysis-device-verify/05-scroll-*.xml
rm -f scripts/ai-enhanced-analysis-device-verify/error-state.png
rm -f scripts/ai-enhanced-analysis-device-verify/02-concierge-open-retry.xml
rm -rf scripts/api-key-device-verify/

# 一時ログ・TXT
rm -f .expo-start-log.txt
rm -f docs/review/WIFI_ADB_VERIFY_OUTPUT.txt
rm -f docs/review/undefined-fix-logcat*.txt
rm -f scripts/conflict-analysis-out.txt scripts/metro-recovery-logcat.txt
rm -f scripts/reload-loop-logcat-filtered.txt scripts/_typecheck-out.txt
rm -f scripts/test-unit-readme-run.txt scripts/test-unit-stabilization-run.txt

# 一時 PNG / HTML
rm -f scripts/00-*.png scripts/01-*.png scripts/02-*.png scripts/03-*.png
rm -f scripts/portfolio-*.png scripts/bursa-phase1-device-*.png scripts/candidate-flow-*.png
rm -f scripts/action-center-expected-v2.html scripts/action-center-expected-v2.png

# 一時スクリプト
rm -f scripts/capture-daily-comment-verify-screenshot.mjs
rm -f scripts/concierge-maybank-perf.ts
rm -f scripts/kill-metro.ps1
```

**PowerShell 代替（openai 一括）**:

```powershell
Remove-Item -Force scripts/openai-*.json, scripts/openai-*-run.txt -ErrorAction SilentlyContinue
Remove-Item -Force scripts/openai-buy-vs-proxy.txt -ErrorAction SilentlyContinue
```

### Step 2b — ディスクのみ削除（任意）

```powershell
Remove-Item -Recurse -Force .expo-bundle-eager, .expo-bundle-head, .expo-bundle-test -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force agent-tools -ErrorAction SilentlyContinue
```

### Step 3 — dry-run 推奨（実行前確認）

```bash
git status --porcelain | wc -l
git diff --name-only HEAD -- src/context/BursaMaterialContext.tsx package.json  # Commit 7 差分が残ること
git status --porcelain | grep -E 'twelveHour|deviceLiveApi|newsApiRateLimit|BursaDataErrorBoundary'  # 24 件残存
```

### Step 4 — .gitignore 更新（任意・別コミット可）

Step 2 完了後、セクション C のパターンを `.gitignore` に追記 → `git add .gitignore` のみ（Commit 7 とは分離推奨）。

### 実行しないこと

```bash
# 以下は本プランでは禁止
git add .
git commit
git push
git restore src/   # 広域 restore 禁止
rm -rf src/        # 絶対禁止
```

---

## 6. 実行後の想定残件数

| 段階 | 件数 | 内訳 |
|------|------|------|
| 現在 | **702** | modified 91 + untracked 611 |
| Step 1 restore 後 | **~640** | −62（tracked 汚染解消） |
| Step 2 delete 後 | **~478** | −162（untracked 生成物削除） |
| 本レポート追加後 | **~479** | +1（`POST_PHASE13_23_WORKTREE_CLEANUP_ACTION_PLAN.md`） |

### 残件 478 の想定内訳

| カテゴリ | 件数 | 内容 |
|----------|------|------|
| **E. Commit 7 候補** | 24 | Twelve-Hour バンドル |
| **C. 判断保留** | ~454 | `forward-validation-*`（~232）、横断 `src/` 変更（~19）、監査 docs（~60+）、その他 scripts |
| **D. 保護** | 0（status 上） | `.env` は ignore のため porcelain に出ない |

> `forward-validation-*`（~232 件）は **本 B/D 整理の対象外**（別 PR / 別判断）。Commit 7 前の視認性改善が主目的。

---

## 7. リスク

| リスク | 深刻度 | 緩和策 |
|--------|--------|--------|
| Commit 7 候補の誤削除 | **高** | パス明示列挙。Step 3 で 24 件残存確認 |
| `.env` の誤 add | **高** | `git add .` 禁止。ステージはファイル単位 |
| `git restore docs/review/phase12-5-long-run/` が untracked も消す | 中 | restore は tracked のみ。untracked は Step 2 の `rm` で対応。`git clean -fd` は dry-run 必須 |
| 日本語ファイル名パスの restore 失敗 | 中 | `git restore "docs/review/phase12-5-long-run/"` でディレクトリ指定 |
| `scripts/operational-api-test.mjs` 等の意図的改変を restore してしまう | 低 | 本プランでは restore 対象外（C 保留） |
| openai JSON に分析データ・キー混入 | 中 | 削除対象（D）。再生成時もコミット禁止 |
| `.expo-bundle-*` 削除で次回ビルドが遅くなる | 低 | 再生成可能。任意 Step 2b |
| restore 後も `forward-validation-*` が 232 件残り視認性が低い | 低 | Commit 7 スコープ外。別整理で対応 |

---

## 8. PASS / FAIL

| チェック | 判定 |
|----------|------|
| HEAD = `1254701` | **PASS** |
| remote 同期 `0 0` | **PASS** |
| 未コミット 702 件を再取得 | **PASS** |
| A restore 候補 62 件一覧化 | **PASS** |
| B delete 候補 ~165 件一覧化 | **PASS** |
| C .gitignore 候補提示 | **PASS** |
| D 保護対象明示 | **PASS** |
| E Commit 7 候補 24 件・交差ゼロ | **PASS** |
| 実行コマンド案作成 | **PASS** |
| 実行後残件 ~478 見積もり | **PASS** |
| restore / delete / add / commit / push 未実施 | **PASS** |
| **総合（B/D 整理準備）** | **PASS** |

---

## 9. 次の推奨アクション（承認後）

1. **Step 0〜3 を実行** — B/D 整理（本レポートのコマンド案）
2. **Commit 7 準備** — Twelve-Hour 24 件で typecheck + 関連 unit test
3. **Commit 7 実行** — push は別承認
4. **任意 Commit 8** — `docs/review/PHASE13–23` 監査 docs のみ
5. **C カテゴリ判断** — `forward-validation-*` / 横断 `src/` は別スコープ

---

## 10. 停止宣言

B/D 整理の **準備レポート完了**。  
`git restore` / `rm` / `git add` / `commit` / `push` は **一切実行していない**。

---

*Evidence: `git status --porcelain`（702 lines）, `git rev-parse HEAD`, `git rev-list --left-right --count`, Commit 7 24 件個別確認, 分類スクリプト集計（restore 62 / delete 162 / hold 454）*
