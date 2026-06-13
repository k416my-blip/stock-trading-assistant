# Commit22 — Phase12.5 Checkpoint Hardening Execution Report

## 実施概要

| 項目 | 値 |
|------|-----|
| 目的 | 3h rerun INFRA INVALID（checkpoint.json 書き込み失敗）の再発防止 |
| 参照 | `docs/review/PHASE12_5_3H_RERUN_INFRA_INVALID_REPORT.md` |
| branch | `cursor/top3-maxdd-capital-audit` |
| parent HEAD | `8681ad78a4d59b44aad6447f5b117d897f8bd9d8` |
| 3h rerun 再実行 | **本タスクでは未実施** |

## 修正内容

### 1. checkpoint writer 堅牢化（P0）

- 新規 `scripts/lib/phase12-5-checkpoint.mjs`
- `checkpoint.json.tmp` へ atomic write → fsync（best effort）→ Windows 向け rename / copy-unlink fallback
- 書き込み前に `checkpoint.json.bak` バックアップ
- retry 5 回 + linear backoff（50ms × attempt）
- 失敗時は throw せず `{ ok, warning }` を返却

### 2. graceful invalid 連携

- `saveCheckpoint()` を async 化し、最終失敗時 `stopReason=checkpoint_write_failed` で `gracefulInvalidExit`
- `gracefulInvalidExit` / `main().catch` では primary 失敗時 `checkpoint.json.emergency` へ best-effort 保存
- `state.checkpointWriteWarnings` / `checkpointBackupPath` を記録

### 3. h1-m45 missing 修正

- 新規 `scripts/lib/phase12-5-price-schedule.mjs`
- price tag を elapsed から算出せず **slot キュー**（h0-m0 → … → h1-m45 → h2-m0）で管理
- main loop で **price refresh を hour boundary より先**に実行
- 原因: h1-m30 後の 15 分 gate が 2h 境界を跨ぎ、legacy `minuteIndex` が h2-m0 になっていた

### 4. pre-run-watch lastHb=none 修正

- 新規 `scripts/lib/phase12-5-logcat-monitor-parse.mjs`
- tail 読取を **4 KB → 64 KB** に拡大
- **UTF-16LE** logcat（PowerShell Tee-Object）を decode
- heartbeat 正規表現を ReactNativeJS 行形式に対応

## 変更ファイル

| ファイル | 変更 |
|----------|------|
| `scripts/lib/phase12-5-checkpoint.mjs` | **新規** — atomic write / retry / backup / emergency |
| `scripts/lib/phase12-5-price-schedule.mjs` | **新規** — slot scheduler |
| `scripts/lib/phase12-5-logcat-monitor-parse.mjs` | **新規** — heartbeat parser |
| `scripts/lib/phase12-5-logcat-finalization.mjs` | `EMFILE` を retryable に追加 |
| `scripts/phase12-5-long-run.mjs` | checkpoint / price schedule / graceful invalid 統合 |
| `scripts/phase12-5-pre-run-watch.mjs` | shared parser + 64KB tail |
| `tests/unit/phase12-5Checkpoint.test.ts` | **新規** |
| `tests/unit/phase12-5PriceSchedule.test.ts` | **新規** |
| `tests/unit/phase12-5LogcatMonitorParse.test.ts` | **新規** |

## checkpoint writer 新仕様

```
writeCheckpointWithRetry({
  checkpointPath,
  state,
  maxRetries: 5,
  backoffMs: 50,
})
```

1. 既存 `checkpoint.json` → `checkpoint.json.bak`
2. `checkpoint.json.tmp` へ JSON 書込 + fsync
3. Windows: unlink + rename、失敗時 copy-unlink
4. retry 対象エラーで warn log → backoff → 再試行
5. 最終失敗: error log + `{ ok: false, warning }`（throw しない）

## retry 対象エラー

- `UNKNOWN`
- `errno -4094`
- `EBUSY` / `EPERM` / `EACCES` / `ENOENT` / `EMFILE`

## graceful invalid の扱い

| 状況 | 動作 |
|------|------|
| main loop 定期 save 失敗 | `checkpoint_write_failed` → logcat finalize → invalid artifacts → emergency checkpoint → **exit 1** |
| gracefulInvalidExit 内 save 失敗 | 同上 + `.emergency` ファイル |
| main().catch | invalid artifacts + retry save + emergency best-effort |

証跡保全優先。アプリクラッシュではなく **INFRA INVALID** として exit 1。

## h1-m45 missing 調査結果

| 項目 | 内容 |
|------|------|
| runner log | `h1-m30` → `hourly snapshot 2` → `hour-2 AI` → `h2-m0`（`h1-m45` なし） |
| 根本原因 | 15 分 gate が 2h 壁後に開き、`minuteIndex = floor((elapsed % 1h)/15m)*15` が **0**（= h2-m0） |
| 修正 | slot キュー + price-before-hour 順序 |
| 回帰テスト | `phase12-5PriceSchedule.test.ts` — h1-m30 後 next tag = **h1-m45** |

## pre-run-watch lastHb=none 調査結果

| 項目 | 内容 |
|------|------|
| 現象 | logcat に heartbeat あるのに `lastHb=none` |
| 原因 1 | tail **4 KB** — 巨大 logcat 末尾が sensor spam のみ |
| 原因 2 | adb logcat が **UTF-16LE** — utf8 decode では `[12H-MONITOR]` 不可 |
| 修正 | 64 KB tail + UTF-16 decode + regex 改善 |
| 分類 | **表示/parse 問題**（monitor 自体は生存） |

## 実行したテスト

| チェック | 結果 |
|----------|------|
| `npm run typecheck` | **PASS** |
| `phase12-5Checkpoint.test.ts` | **7/7 PASS** |
| `phase12-5PriceSchedule.test.ts` | **5/5 PASS** |
| `phase12-5LogcatMonitorParse.test.ts` | **4/4 PASS** |
| 既存 phase12-5 系（6 files） | **57/57 PASS** |
| **合計** | **73/73 PASS** |

## 3h rerun を再実行してよいか

**はい — Commit22 適用後、クリーン 3h rerun を再実行してよい。**

前提:
- logcat rotate / checkpoint 退避
- pre-run-watch / watchdog / adb logcat 再起動
- PC スリープ無効・実機充電維持
- long-run 中 checkpoint.json を IDE で開かない

## 12h 本番へ進める条件

1. **3h rerun PASS**（INFRA / アプリ INVALID なし、完走）
2. price refresh 全 slot 記録（**h1-m45 含む**）
3. FATAL / ANR / PID lost = 0
4. checkpoint write warning なし（または retry 成功のみ）

**現時点: 12h 本番には進めない**（3h 完走実績なし）

## secret scan

staged diff を以下パターンで検索 — **ヒットなし**:

- OpenAI-style `sk-` prefix strings
- Google `AIza` key prefix strings
- `Bearer` JWT-style tokens
- env var names: OPENAI, ANTHROPIC, CLIENT_SECRET（代入形式）
- literal `password` / `token` assignments

## GitHub 同期

| 項目 | 値 |
|------|-----|
| commit hash | `7271be1e4c5638ace6ae64212a2e50c31fc79703` |
| push | **成功** (`8681ad7..7271be1`) |
| remote 同期 | **0 ahead / 0 behind** |
| secret scan | **PASS**（staged diff 実キー形式ヒットなし） |

---

*Commit22 — checkpoint INFRA hardening; 3h rerun not started in this task.*
