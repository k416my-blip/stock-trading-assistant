# Post Commit 11 — Worktree 整理方針

**作成日:** 2026-06-02  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**前提:** Commit 11 完了 · **12 時間テストは深夜実施予定（本日は開始しない）**  
**実施範囲:** 分類・方針レポートのみ（`git add` / `commit` / `push` **未実施** · **ファイル削除未実施**）

---

## エグゼクティブサマリー

| 項目 | 値 |
|------|-----|
| HEAD | `35dd6de3f756ac4e55da582d696a0effdfd41d59`（Commit 11） |
| remote 同期 | `0	0` |
| worktree 残件 | **656**（Commit 11 直後 655 + 本実行レポート未追跡 1） |
| modified | **25** |
| untracked | **631** |
| 方針 | **A 破棄 → B ignore 強化 → C 小 commit → D 独立ブランチ**（すべて **12h テスト完了後**） |

---

## 1. 現在状態

```text
git branch --show-current
cursor/top3-maxdd-capital-audit

git rev-parse HEAD
35dd6de3f756ac4e55da582d696a0effdfd41d59

git log -1 --oneline
35dd6de docs: archive commit 9-10 and phase12.5 test reports

git rev-list --left-right --count origin/cursor/top3-maxdd-capital-audit...HEAD
0	0

git status --porcelain -uall
656 行
```

| エリア | 件数（概算） |
|--------|-------------|
| `docs/review/`（非 Markdown 成果物中心） | **224** |
| `scripts/` | **430** |
| ルート / その他 | **2**（`.cursorignore`, `vitest.soak.config.ts`） |

> **注:** `*.log` および `.expo-bundle-*/` は `.gitignore` 済みのため **656 件に含まれない**が、ディスク上には存在しうる（§B 参照）。

---

## 2. 残件 656 件 — 分類

### A. 破棄候補（ローカル削除 · git restore 対象）

**方針:** 12h テスト **完了後**に削除または `git restore`。**テスト前は削除しない**（§5）。

| サブカテゴリ | 件数 | 代表パス |
|-------------|------|----------|
| `phase12-5-long-run/` 生成物 | **~57** | `checkpoint.json`, `telemetry.jsonl`, `logcat-final.txt`, `meminfo-*.txt`, `price-*.xml`, `ai-hour-*.png` |
| `device-live-api-audit/` | **16** | `logcat.txt`, `report.json`, `ui-*.xml` |
| 一時監査 `_tmp_*` | **9** | `_tmp_commit10_*`, `_tmp_post8_*` |
| JSON（分析成果物） | **~84** | `docs/review/evidence/*.json`, `scripts/openai-*.json`, `node-stocks.json` 等 |
| XML（UI dump） | **~30** | `undefined-fix-device/`, `final-review-v2-device/` 等 |
| PNG / JPG | **~30** | `final-evidence-device/`, `phase12-5-long-run/ai-hour-*.png` |
| TXT | **~17** | `meminfo-*.txt`, `runner-console.txt`, `logcat-snapshot-*.txt` |
| HTML | **4** | `scripts/*.html`, KLSE fixture 監査 HTML |
| logcat 系 | **~3**（status 内） | `logcat-final.txt`, `logcat-snapshot-*.txt`, `device-live-api-audit/logcat.txt` |
| dry-run 成果物 | 少数 | `adb-logcat-final-*.log`（gitignore だが残存時は削除候補） |

**合計 A（status 上）:** **~250 件**

**modified 24 件の内訳:** ほぼすべて `docs/review/phase12-5-long-run/` — **12h 再実行前の参照用エビデンスとして温存**（破棄はテスト後）。

**twelve-hour-test ログ（status 外 · 破棄候補）:**

- `docs/review/twelve-hour-test/adb-logcat-live.log`
- `docs/review/twelve-hour-test/metro.log`
- `docs/review/twelve-hour-test/phase12-5-runner.log`
- `docs/review/twelve-hour-test/app-runtime.log`
- `docs/review/twelve-hour-test/api-connectivity.log`

（`*.log` は `.gitignore` のため porcelain に出ない）

---

### B. ignore 候補（`.gitignore` / `.cursorignore` 強化）

**方針:** 今後も再生成されるパスを ignore し、worktree ノイズを減らす。**12h テスト前は apply のみ慎重に**（§5）。

| パターン | 理由 |
|----------|------|
| `docs/review/phase12-5-long-run/`（JSON/XML/PNG/TXT/logcat 除く `.md` 以外） | 毎ラン上書き・大量 UI dump |
| `docs/review/twelve-hour-test/*.log` | Metro / adb 追記ログ |
| `docs/review/device-live-api-audit/` | 実機監査の再生成物 |
| `docs/review/_tmp_*` | 監査一時ファイル |
| `docs/review/evidence/*.json` / `*.txt` | 同期監査スナップショット |
| `docs/review/*-device/`（png, xml） | デバイス UI キャプチャ |
| `.expo-bundle-eager/` `.expo-bundle-head/` `.expo-bundle-test/` | Expo ビルドキャッシュ（`.gitignore` 済み） |
| `scripts/forward-validation-*` | 分析バッチ出力（§D と併用） |
| `scripts/openai-*.json` | オフライン分析 JSON |
| `agent-tools/` `agent-transcripts/` | Cursor 生成物（`.cursorignore` 一部済み） |

**既存 ignore 確認:**

- `.gitignore`: `*.log`, `.expo-bundle-*/`
- `.cursorignore`: `*.log`, `node_modules/`, `agent-tools/` 等

**追加検討（テスト後）:** `docs/review/phase12-5-long-run/*.xml` 等をパス指定で ignore。

---

### C. 別 Commit 候補（小さな単独 commit · 12h テストと無関係）

| # | パス | 状態 | 推奨タイミング |
|---|------|------|----------------|
| 1 | `docs/review/COMMIT11_DOCS_REVIEW_MARKDOWN_EXECUTION_REPORT.md` | `??` | **Commit 12**（docs のみ · **12h 前でも可**） |
| 2 | `.cursorignore` | `M` | Commit 13 — **12h 後推奨**（IDE 索引変更が開発体験に影響） |
| 3 | `vitest.soak.config.ts` | `??` | Commit 14 — soak 設定 · 12h 後 |
| 4 | `scripts/operational-api-test.mjs` | `M` | Commit 15 — API 監査スクリプト · 12h 後 |
| 5 | `scripts/verify-ai-enhanced-analysis-device.mjs` | `M` | 同上 |

**合計 C:** **5 件**（+ 本整理方針レポート `POST_COMMIT11_WORKTREE_CLEANUP_PLAN.md` は **Commit 12b** または 12 に同梱可）

---

### D. 独立ブランチ候補（大量 · 本流と分離）

| サブカテゴリ | 件数 | 内容 |
|-------------|------|------|
| `scripts/forward-validation-*` | **~246** | csv, json, ts, html — フォワード検証分析一式 |
| `scripts/` その他成果物 | **~56** | `openai-*.json`, device-verify xml/png, 一時 `.mjs` |
| `scripts/` ソース（分析用 `.ts/.mjs`） | **~62** | forward-validation スクリプト本体 |

**合計 D:** **~364 件**

**方針:**

- ブランチ例: `cursor/forward-validation-archive` または `research/forward-validation-2026`
- 本流 `cursor/top3-maxdd-capital-audit` には **マージしない** · 必要なら cherry-pick のみ
- 12h テストとは **完全独立**

---

### E. 要注意 / 削除禁止（12h 深夜テストに必要）

| 種別 | パス | 備考 |
|------|------|------|
| **コード（Commit 10 · 追跡済み）** | `scripts/phase12-5-long-run.mjs` | オーケストレータ — **変更・削除禁止** |
| | `scripts/lib/phase12-5-logcat-finalization.mjs` | logcat finalization — **変更・削除禁止** |
| | `tests/unit/phase12-5LogcatFinalization.test.ts` | 単体テスト — **変更・削除禁止** |
| **手順（Commit 11 · 追跡済み）** | `docs/review/twelve-hour-test/NEXT_RUN_PREP_NOTE.md` | dry-run → preflight → 本番 — **変更・削除禁止** |
| | `docs/review/twelve-hour-test/test-start-info.md` | 前回 FAILED 記録 |
| | `docs/review/PHASE12_5_LONG_RUN_REPORT.md` | 失敗ラン公式レポート |
| | `docs/review/TWELVE_HOUR_DEVICE_PREPARATION_CHECKLIST.md` | 端末チェックリスト |
| **実行時エビデンス（modified · 参照用）** | `docs/review/phase12-5-long-run/checkpoint.json` | dry-run 上書きあり · テスト前 **restore/削除しない** |
| | `docs/review/phase12-5-long-run/telemetry.jsonl` | 失敗ラン履歴 — **温存** |
| | `docs/review/phase12-5-long-run/logcat-final.txt` | 旧形式最終 logcat — **温存** |
| **npm スクリプト** | `package.json` の `verify:phase12-5`, `verify:twelve-hour-preflight` | 変更禁止（現状 dirty なし） |

**合計 E（status 上の modified 24 件）:** phase12-5-long-run 成果物 — **削除・git restore 禁止（テスト前）**

---

### 分類サマリー（656 件）

| 区分 | 件数 | 説明 |
|------|------|------|
| **A. 破棄候補** | ~250 | 生成物 · 一時ファイル（**12h 後**に削除） |
| **B. ignore 候補** | A と重叠 | パターン ignore で再発防止 |
| **C. 別 Commit 候補** | 5–7 | 小 commit · 12h 前は **実行レポート md のみ可** |
| **D. 独立ブランチ候補** | ~364 | forward-validation 系 |
| **E. 削除禁止** | 25 modified + 追跡済み手順 | 12h テスト直前まで温存 |
| **other** | ~56 | `docs/review/evidence/`, patch, ts backup 等 — A または D で個別判断 |

---

## 3. 12 時間テスト前に触ってはいけないもの

以下は **深夜 12h テスト開始まで変更・削除・git restore しない**。

### コード

- `scripts/phase12-5-long-run.mjs`
- `scripts/lib/phase12-5-logcat-finalization.mjs`
- `tests/unit/phase12-5LogcatFinalization.test.ts`

### 手順・レポート（Markdown）

- `docs/review/twelve-hour-test/NEXT_RUN_PREP_NOTE.md`
- `docs/review/PHASE12_5_LONG_RUN_REPORT.md`
- `docs/review/PHASE12_5_LOGCAT_FINALIZATION_FIX_REPORT.md`

### 実行エビデンス（phase12-5-long-run · modified 24 件）

- `checkpoint.json` / `telemetry.jsonl` / `logcat-final.txt`
- `meminfo-*.txt` / hour 0–2 関連 XML・PNG

### 12h 用コマンド・環境

```powershell
# NEXT_RUN_PREP_NOTE 記載 — 変更しない
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
$env:PHASE12_5_DRY_RUN="1"          # Step 1 のみ
node scripts/phase12-5-long-run.mjs
npm run verify:twelve-hour-preflight
npm run verify:phase12-5
```

### Metro / adb / Expo 関連

- `package.json` の `start:clear` / `verify:phase12-5` スクリプト定義
- `app.json` / `eas.json` / Expo env フラグ
- `.cursorignore` の **本番 apply**（索引・監視対象が変わる可能性）

---

## 4. 次に実行すべき順番

| 順 | タイミング | 作業 | git 操作 |
|----|-----------|------|----------|
| **0** | **今（12h 前）** | 本整理方針の確認 · 深夜テスト準備読み合わせ | **なし** |
| **1** | **12h 前（任意）** | Commit 12: `COMMIT11_DOCS_REVIEW_MARKDOWN_EXECUTION_REPORT.md` + 本 PLAN のみ stage | 小 commit · push 可 |
| **2** | **12h 直前** | dry-run → Metro/logcat 再起動 → preflight（`NEXT_RUN_PREP_NOTE` どおり） | **コード変更なし** |
| **3** | **12h 本番** | `npm run verify:phase12-5`（12 時間） | **worktree 整理しない** |
| **4** | **12h 完了後** | A: `_tmp_*` · device-live-api-audit · 古い log 削除 | 削除のみ · commit 不要 |
| **5** | **12h 完了後** | B: `.gitignore` 強化（phase12-5-long-run パターン等） | 別 commit |
| **6** | **12h 完了後** | `git restore docs/review/phase12-5-long-run/` または新ラン成果物で上書き | 状況に応じ |
| **7** | **12h 後** | C: `.cursorignore`, `vitest.soak.config.ts`, scripts 2 件 | Commit 13–15 |
| **8** | **独立タイミング** | D: forward-validation 246 件を別ブランチへ | 本流と分離 |

---

## 5. 12h テスト前後 — 安全 / 回避マトリクス

| 作業 | 12h **前** | 12h **後** |
|------|-----------|-----------|
| 本 PLAN / 実行レポート md 作成 | **可** | 可 |
| Commit 12（docs 1–2 件のみ） | **可** | 可 |
| `_tmp_*` / device-live-api-audit 削除 | **不可** | **可** |
| phase12-5-long-run `git restore` | **不可** | 可（新ラン後） |
| `.gitignore` 更新 | **非推奨** | **可** |
| `.cursorignore` commit | **非推奨** | 可 |
| forward-validation ブランチ整理 | **不可**（不要） | **可** |
| logcat finalization コード変更 | **不可** | テスト結果を見て判断 |

---

## 6. git 操作（本レポート）

| 操作 | 状態 |
|------|------|
| `git add` | **未実施** |
| `git commit` | **未実施** |
| `git push` | **未実施** |
| ファイル削除 | **未実施** |

---

## 7. 関連ドキュメント

| 用途 | パス |
|------|------|
| Commit 11 実行 | `docs/review/COMMIT11_DOCS_REVIEW_MARKDOWN_EXECUTION_REPORT.md` |
| Commit 11 準備 | `docs/review/COMMIT11_DOCS_REVIEW_MARKDOWN_PREPARATION_REPORT.md` |
| 次回 12h 手順 | `docs/review/twelve-hour-test/NEXT_RUN_PREP_NOTE.md` |
| 前回 Post-commit 整理 | `docs/review/POST_PHASE13_23_WORKTREE_CLEANUP_ACTION_PLAN.md` |
