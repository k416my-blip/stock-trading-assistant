# CURRENT_STATUS

Updated: 2026-07-10T19:45+08:00

> **注意:** `npm run status` / memory watchdog は本ファイルの先頭セクション（受入 PASS 記録）を上書きしません。ライブ snapshot は末尾の **Live snapshot** を参照してください。

---

## Cursor OOM Recurrence Hard Stop

| 項目 | 状態 |
|------|------|
| recurrence | **yes**（17:50 以降、正確な時刻不明） |
| exact time | **unknown** |
| 30min stability | **FAIL**（T+15/T+30 完走前に再 OOM） |
| Cursor aggregate | **~3875 MB**（再発後 ~19:45）。直前 **7786 MB** まで増加 |
| working tree | **11 行** |
| tmp-device-smoke | **workspace 外** |
| Metro / node / adb / logcat | **停止** |
| Internal testing | **HOLD** |
| Play upload | **HOLD** |
| 15 testers | **HOLD** |
| Play public release | **NO** |
| next policy | **no long Cursor Agent sessions** — VS Code / CLI / 手動 Play 作業を推奨 |

report: `CURSOR_OOM_RECURRENCE_HARD_STOP_REPORT.md`

---

## Cursor OOM Crash Recovery and Workspace Quarantine

| 項目 | 状態 |
|------|------|
| Cursor OOM crash | **確認** — `reason: 'oom', code: '-536870904'` |
| working tree | **3716 → 12** 行（quarantine 後） |
| quarantine | `stock-trading-artifacts/quarantine-20260710/`（~3749 files） |
| tmp-device-smoke | **workspace 外**（戻りなし） |
| cursorignore | **updated** — `.tmp*/`, `*.zip`, `.gradle/` 追加 |
| T0 Cursor aggregate | **4801 MB**（5 GB 未満） |
| T+15 / T+30 | **pending**（`logs/oom-crash-recheck.log` watch 実行中） |
| Extension Host | **1764 MB / 8 proc**（T0） |
| freeze / restart | クラッシュ後 **再発なし**（作業セッション中） |
| Internal testing | **HOLD** |
| Play upload | **HOLD** |
| 15 testers | **HOLD** |
| Play public release | **NO** |

report: `CURSOR_OOM_CRASH_RECOVERY_REPORT.md`

---

## OOM Regression Incident Before Internal Testing

| 項目 | 状態 |
|------|------|
| incident | **OOM / freeze / restart** reported（Cursor / PC） |
| timing | 2026-07-10 約 15:10 (+08)。P0 Final Gate（`3d153c9`）直後 |
| suspected cause | Extension Host ~2.5 GB（9 proc）+ `.tmp-device-smoke/` **776 MB** + 572 untracked + 長時間 Agent context |
| Cursor aggregate | **~5286 MB** (T0) → **~7025 MB** (T1 triage 中) |
| residual processes | adb 低メモリ残留。Metro/node/logcat **停止**。node 1 proc 前日残留 |
| large files | `.tmp-device-smoke/` **移動済み**（→ `stock-trading-artifacts/device-smoke-20260710/`） |
| mitigation | `.cursorignore` 拡張。Cursor 再起動推奨。15/30 分 memory 再計測 pending |
| Internal testing | **HOLD**（15人送付・Play upload 停止） |
| Play public release | **NO** |

report: `OOM_REGRESSION_INCIDENT_TRIAGE_REPORT.md`

---

## OOM Workspace Stabilization Before Internal Testing

| 項目 | 状態 |
|------|------|
| Cursor restart | **部分** — 15:30/15:46 付近 EH 再起動痕跡。完全終了はユーザー操作待ち |
| tmp-device-smoke | **moved** — 1439 files / 776 MB → `stock-trading-artifacts/device-smoke-20260710/` |
| cursorignore | **updated** — `telemetry.jsonl`, `android/.gradle/`, `adb-logcat*.log` 追加 |
| T0 Cursor aggregate | **6045 MB**（15:39、移動後） |
| T+15 Cursor aggregate | **未記録**（watch 停滞） |
| T+30 Cursor aggregate | **未記録**（watch 停滞） |
| T+63 manual | **5734 MB**（16:42） |
| residual processes | adb server ~8 MB 維持。Metro/logcat 停止。Adobe node 51 MB（非 Metro） |
| Internal testing | **HOLD** |
| Play public release | **NO** |

report: `OOM_WORKSPACE_STABILIZATION_REPORT.md`

---

## P0 Safety Notice AAB Rebuild Final Smoke

| 項目 | 状態 |
|------|------|
| versionCode | **46** |
| AAB build | **PASS**（`4952baeb` / commit `1afa9f4`） |
| CompactSafetyNotice included | **PASS**（Hermes bundle UTF-16 検証） |
| device smoke | **PARTIAL PASS** — v46 sideload 成功。Home / Concierge / Manual / Settings で notice 視認。Allocation 未達 |
| API key missing UX | **PASS**（v46 Settings「未設定」表示・クラッシュなし） |
| RM5000 display | **PASS**（「指定額: RM5000」。RM50000 誤表示なし） |
| focused vitest | **PASS**（35/35） |
| Internal testing | **HOLD**（OOM incident） |
| Play public release | **NO** |

artifact: https://expo.dev/artifacts/eas/CYgg_p7x812m0m02QpKw_75LQQbwFLIaoGBQQjbiloQ.aab  
report: `P0_SAFETY_NOTICE_AAB_REBUILD_FINAL_SMOKE_REPORT.md`

---

## P0 Internal Testing Final Gate Cleanup

| 項目 | 状態 |
|------|------|
| 配布対象 AAB | **versionCode 46**（45 は配布禁止） |
| changelog / upload guide 整合 | **PASS** |
| AllocationPlan 実機 notice | **未達**（端末ロック）。コード配線 **PASS** |
| 今日のおすすめ空状態 v46 | **未達**（同上）。コード配線 **PASS** |
| Play Opt-in smoke | **pending**（アップロード後手動） |
| sideload smoke | **PARTIAL PASS** |
| Internal testing | **HOLD**（OOM incident） |
| テスター 15 人送付 | **HOLD**（OOM incident 解消まで） |
| Play public release | **NO** |

report: `P0_INTERNAL_TESTING_FINAL_GATE_REPORT.md`

---

## P0 Device Smoke Before Internal Testing

| 項目 | 状態 |
|------|------|
| adb device | **device**（unauthorized 解消） |
| versionCode 45 smoke | **PASS**（AAB 1545a8ba → bundletool sideload） |
| API key missing UX | **PASS**（未設定表示・クラッシュなし）。新文言は本 AAB 未収録 |
| safety notice visibility | **PARTIAL** — 既存「注文を送信しません」PASS / CompactSafetyNotice は本 AAB に無し |
| focused vitest | **PASS**（35/35） |
| Internal testing | **HOLD**（OOM incident） |
| Play public release | **NO** |

report: `P0_DEVICE_SMOKE_BEFORE_INTERNAL_TESTING_REPORT.md`

---

## P0 Minimal Safety Fix Before Internal Testing

| 項目 | 状態 |
|------|------|
| disclaimer / non-auto-trading | **実施** — `CompactSafetyNotice` を Home / Concierge / 今日のおすすめ / Manual order / Allocation / Settings に追加 |
| API key missing UX | **文言改善済み**。実機キーなし確認は Device Smoke で実施（本レポート参照） |
| versionCode 45 smoke | **実機 PASS**（Device Smoke） |
| strictCharterOnly | **B案** — 未使用のため削除。型とテストの不整合を解消 |
| release-critical tests | **追跡化**（conciergeBudget / conciergeUiE2e / oomHotfix / e2eMetroEnv） |
| Internal testing | **HOLD**（OOM incident） |
| Play public release | **NO** |

report: `P0_MINIMAL_SAFETY_FIX_REPORT.md`

---

## Closed Testing / Tester Operations — PREPARED

| 項目 | 状態 |
|------|------|
| Release Readiness | PASS |
| AAB | versionCode **46** 生成済み（**配布対象**。45 は使用禁止） |
| Play upload | **HOLD**（OOM incident 解消まで） |
| Play Opt-in smoke | pending（アップロード後） |
| tester target | 15人推奨 |
| minimum testers | Play Console上で要確認。個人開発者要件では12人以上/14日間のclosed testが必要になる可能性あり |
| Internal testing | **HOLD**（OOM incident） |
| Play public release | **NO** |
| docs | 作成済み・v46 整合済み |

関連ドキュメント:

* `PLAY_CLOSED_TESTING_TESTER_OPERATIONS_GUIDE.md`
* `PLAY_CONSOLE_CLOSED_TESTING_CHECKLIST.md`
* `TESTER_TRACKING_TEMPLATE.md`
* `TESTER_INVITATION_MESSAGE_JA.md`
* `TESTER_INSTALL_AND_FEEDBACK_GUIDE_JA.md`
* `PLAY_INTERNAL_TESTING_UPLOAD_GUIDE.md`（AAB アップロード手順 — **versionCode 46**）
* `P0_INTERNAL_TESTING_FINAL_GATE_REPORT.md`

---

## AI Concierge Budget / Quantity UI Final Acceptance — PASS

| 項目 | 状態 |
| -------------------------------- | ---------------------------------------------------------- |
| 最終受入 | PASS |
| report | AI_CONCIERGE_BUDGET_QUANTITY_UI_FINAL_ACCEPTANCE_REPORT.md |
| 指定額を使い切らない / 残現金許容 | 受入済み |
| 弱候補・低 confidence の buy 昇格禁止 | 受入済み |
| 今日のおすすめなし | 実機 PASS |
| beginner strict / AllocationPlan | 実機 PASS |
| 1155 + RM5000 表示統一 | 実機 PASS |
| 見送り・現金維持・残現金 | 正常な AI 判断、エラー扱いしない |
| commit hash | b437bd830c57b073bf9bc3c4a2f1cdee053d60f9 |

### 維持原則

* AIコンシェルジュを予算消化係に戻さない
* budget utilization を最優先目的に戻さない
* 「おすすめなし」「見送り」「現金維持」は正常判断として維持
* 「買わない」「見送る」「現金を残す」は正式な投資判断として扱う

---

## OOM 12h Stability Run — PASS

| 項目 | 状態 |
| -------------------------- | ------------------------------------------------- |
| 最終判定 | PASS |
| report | OOM_12H_RUN_REPORT.md |
| 評価対象 | 試行 #2 |
| 実行時間 | 12h 15m 51s |
| branch | cursor/top3-maxdd-capital-audit |
| base commit hash | b437bd830c57b073bf9bc3c4a2f1cdee053d60f9 |
| app versionCode | 44 |
| device | FYRWXSNNAIOR9DCM / Xiaomi 23090RA98G / Android 16 |
| OOM | なし |
| ERR_STRING_TOO_LONG | なし |
| RN / Metro / Expo DevTools | 0 |
| Metro停止 | なし |
| adb切断 | なし |
| runner異常終了 | なし |
| health_restart | 0 |
| Cursor最大 | 5101MB |
| system memory最大 | 55.3% |
| memory_watch | 153エントリ継続 |
| foreground WARN | 35件、停止条件外 |
| logcat | ストリーム + ローテーション維持 |

### 試行 #1

* 約16分で watch_dead により停止
* 原因: pre-run-watch.log stale
* 対応: pre-run-watch 起動後、試行 #2を開始
* 試行 #1は参考記録、試行 #2を本番評価対象とする

### 試行 #2

* 12h 15m 51s 完走
* stopReason: null
* watchDeadAt: null
* runner exit code 0
* OOMなし
* ERR_STRING_TOO_LONGなし
* DevTools 0
* Metro / adb 維持
* PASS

### foreground WARN（本 run）

| package | 件数 | 扱い |
|---------|------|------|
| unknown | 26 | 停止条件外 — runner 継続、price refresh 44 runs、AI analysis hour 0–12 完了 |
| com.teslacoilsw.launcher | 9 | 停止条件外 — ensureAppForeground 誤検知候補 |
| **合計** | **35** | PASS を覆さない。件数と context を継続記録 |

### 次回 run 改善

* 次回以降、memory_watch は必ず session ごとの jsonl を作成する
* 出力先: `logs/memory_watch_<session>.jsonl`（例: `logs/memory_watch_12h-20260708-202834.jsonl`）
* `MEMORY_WATCH_SESSION` を runner と watchdog で共有する（`logs/.memory_watch_session` も可）
* foreground WARN は停止条件にしないが、件数と context を継続記録する
* ensureAppForeground 判定安定化は今後の改善候補

---

## Git

| 項目 | 値 |
|------|-----|
| `git log -1 --oneline` | `a31a305 docs: update CURRENT_STATUS git section for 08c61d8` |
| `git branch --show-current` | `cursor/top3-maxdd-capital-audit` |
| `git remote -v` | `origin https://github.com/k416my-blip/stock-trading-assistant.git` (fetch/push) |
| working tree (12h 対象ファイル) | **clean** — 12h 証跡および本 CURRENT_STATUS 更新は push 済み |
| **12h OOM stability run commit hash** | `9ab6458` — reports / telemetry / checkpoint / memory_watch スクリプト |
| CURRENT_STATUS 更新 commits | `0d47fb1`, `78fe711`, `4229af7`, `08c61d8`, **`a31a305`** |
| **push** | **成功**（`a31a305` → `origin/cursor/top3-maxdd-capital-audit`） |
| **push branch** | `cursor/top3-maxdd-capital-audit` |
| **実施日時** | 2026-07-09 09:44 +08（初回 push）、2026-07-09 10:04 +08（本更新） |

### 12h git add 対象（commit 済み — 再 add 不要）

* `OOM_12H_RUN_REPORT.md` ✓
* `OOM_12H_RUN_INTERIM.md` ✓
* `OOM_12H_RUN_KICKOFF.md` ✓
* `docs/review/PHASE12_5_LONG_RUN_REPORT.md` ✓
* `docs/review/phase12-5-long-run/checkpoint.json` ✓
* `docs/review/phase12-5-long-run/telemetry.jsonl` ✓

### git 除外（大容量 logcat）

* `docs/review/twelve-hour-test/adb-logcat-final-20260709-091018.log`（約 489 MB）— **git 未追跡**、`.gitignore` 対象

---

## Memory note

| 項目 | 値 |
|------|-----|
| 現在の Cursor aggregate | **~3874.6 MB**（2026-07-10 19:46 +08、npm run status） |
| Metro / adb / node | **停止中** |
| 判定 | **正常** — 5 GB 未満 |

---

## Live snapshot（2026-07-10 19:46 +08）

`npm run status` による一時計測。PASS 判定値は上記 OOM / Concierge セクションを正とする。

### System memory

- Used: **35.6%** (11640 / 32678 MB)

### Cursor memory

- **Cursor aggregate**: ~3874.6 MB (15 proc)
- TypeScript Server: 0 MB (0 proc)
- Extension Host: 1720.9 MB (8 proc)

### Dev processes

| Process | Running |
|---------|---------|
| Metro | no |
| adb | no |
| node | no |
| adb logcat | no |

---


## Commands

- `npm run status` — ライブ snapshot（本ファイルの PASS セクションは上書きしないよう注意）
- `npm run oom:report`
- `npm run memory:watch` — `logs/memory_watch_<session>.jsonl`
- `npm run verify:phase12-5`
