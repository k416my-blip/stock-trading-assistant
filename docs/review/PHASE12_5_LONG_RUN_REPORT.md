# Phase12.5 Long Run Validation Report

**ステータス:** INTERRUPTED
**開始:** 2026-06-11T13:20:23.292Z（2026-06-11T21:20+08）
**終了:** 2026-06-11T15:24:24.769Z（2026-06-11T23:24+08）
**経過:** 2h 04m（計画 12h の **17%**）
**計画時間:** 12 時間
**実機:** Redmi FYRWXSNNAIOR9DCM (adb) · app PID **15969**
**停止理由:** `docs/review/phase12-5-long-run/logcat-final.txt` 固定名への **`fs.writeFileSync` 上書き** → **`errno: -4094`**（PC 側ファイルロック）。オーケストレータ **exit 1**。端末 app / adb / Metro（:8081）は **停止後も生存**。

## 総合判定: **FAILED**（中断 · 約2h04m）

### テスト本体 FAIL 条件（A）

| 条件 | 判定 | 結果 |
|------|------|------|
| クラッシュ0 | FAIL | FATAL=1, undefined=0 |
| ANR0 | PASS | ANR=0 |
| プロセス消失0 | PASS | pidLost=0 |
| adb device | PASS | connected |
| Metro :8081 | PASS | LISTENING（停止後も生存） |
| 価格更新復帰 | PASS | 直近4回連続失敗なし |

### WARN 条件（B — 本体FAILにしない）

| 条件 | 判定 | 結果 |
|------|------|------|
| logcat finalization | — | 旧実装：周期上書きが **停止直接原因**（Commit 10 で修正済み） |
| 全銘柄UI表示 | WARN | adb UI **card not found**（既知） |
| メモリ増加20%以内 | WARN | baseline → hour-2: **795MB → 934MB → 961MB（+20.8%）** |

### 検証銘柄

- 1155 Maybank
- 1023 CIMB
- 1295 Public Bank
- 5347 Tenaga
- 4707 Nestle
- 6033 Petronas Gas

### 1時間ごとメモリ (KB)

| Hour | TOTAL KB | 概算 MB |
|------|----------|---------|
| 0（baseline） | 795438 | 795 |
| 1 | 933720 | 934 |
| 2 | 960924 | 961 |

### CPU使用率サンプル

| Hour | CPU % |
|------|-------|
| 1 | 41.3 |
| 2 | 60.0 |

### AsyncStorageサイズ (KB)

| Hour | RKStorage | App data total |
|------|-----------|----------------|
| 1 | 1756 | 22276 |
| 2 | 1760 | 22424 |

### 実行回数

- 株価更新 (15分毎): **8** 回 (失敗 0)
  - h0: **0 / 15 / 30 / 45** min
  - h1: **0 / 15 / 30** min
  - h2: **0** min（停止直前）
- AI分析 (1時間毎): **3** 回 (hour 0–2)
- プロセス消失: **0**

### hour 0–2 記録サマリー

| Hour | 材料分析 | 株価更新 | メモリ | 銘柄UI |
|------|----------|----------|--------|--------|
| 0 | OK | 4/4 OK | 795 MB | 6/6 card not found（WARN） |
| 1 | OK（partial · 1023） | 3/3 OK | 934 MB | card not found（WARN） |
| 2 | OK（partial · 1295） | 1/1 OK → 停止 | 961 MB | card not found（WARN） |

### エビデンス

- `docs/review/phase12-5-long-run/telemetry.jsonl`
- `docs/review/phase12-5-long-run/checkpoint.json`（失敗ラン記録）
- `docs/review/twelve-hour-test/phase12-5-runner.log` — stack trace
- `docs/review/phase12-5-long-run/logcat-final.txt` — 旧形式・最終スナップショット（~31 MB）
- live logcat: `docs/review/twelve-hour-test/adb-logcat-live.log`（追記専用）
- `docs/review/twelve-hour-test/test-start-info.md` — 開始・停止記録
- `docs/review/PHASE12_5_LOGCAT_FINALIZATION_FIX_REPORT.md` — 原因分析・修正詳細

### Commit 10 修正（logcat finalization）

| 項目 | 内容 |
|------|------|
| commit | `aaf6e25604dc48f1f63befba0dbe9cb04e443948` |
| 変更 | 固定名 `logcat-final.txt` 周期上書き廃止 · timestamp 付き final log · WARN 化 · FAIL/WARN 分離 |
| 参照 | `scripts/lib/phase12-5-logcat-finalization.mjs` · `COMMIT10_PHASE12_5_LOGCAT_FINALIZATION_EXECUTION_REPORT.md` |

> dry-run 検証結果は `COMMIT10_PHASE12_5_LOGCAT_FINALIZATION_EXECUTION_REPORT.md` に記載（本レポートは **2026-06-11 本番ラン** の記録）。

### 再実行（次回手順）

**dry-run → preflight → 本番** の順。詳細: `docs/review/twelve-hour-test/NEXT_RUN_PREP_NOTE.md`

```powershell
# 1. dry-run
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
$env:PHASE12_5_DRY_RUN="1"
node scripts/phase12-5-long-run.mjs

# 2. Metro + live logcat 再起動後
Remove-Item Env:PHASE12_5_DRY_RUN -ErrorAction SilentlyContinue
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
npm run verify:twelve-hour-preflight

# 3. 本番 12h
$env:PHASE12_5_HOURS="12"
npm run verify:phase12-5
```
