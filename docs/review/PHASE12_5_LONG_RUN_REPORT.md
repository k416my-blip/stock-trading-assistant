# Phase12.5 Long Run Validation Report

**ステータス:** RUNNING
**開始:** 2026-06-10T02:43:59.691Z
**終了:** —
**計画時間:** 12 時間
**実機:** Redmi (adb)

## 総合判定: **進行中**

### PASS条件

| 条件 | 判定 | 結果 |
|------|------|------|
| クラッシュ0 | PASS | FATAL=0, undefined=0 |
| ANR0 | PASS | ANR=0 |
| メモリ増加20%以内 | PASS | +0.0% |
| 全銘柄正常表示 | — | 1155, 1023, 1295, 5347, 4707, 6033 — 各1回以上OK必要 |

### 検証銘柄

- 1155 Maybank
- 1023 CIMB
- 1295 Public Bank
- 5347 Tenaga
- 4707 Nestle
- 6033 Petronas Gas

### 1時間ごとメモリ (KB)

| Hour | TOTAL KB |
|------|----------|
| 0 | 797764 |

### CPU使用率サンプル

| Hour | CPU % |
|------|-------|
| 0 | 63.3 |

### AsyncStorageサイズ (KB)

| Hour | RKStorage | App data total |
|------|-----------|----------------|
| 0 | 1396 | 21860 |

### 実行回数

- 株価更新 (15分毎): 0 回 (失敗 0)
- AI分析 (1時間毎): 0 回 (失敗 0)
- プロセス消失: 0

### エビデンス

- `docs/review/phase12-5-long-run/telemetry.jsonl`
- `docs/review/phase12-5-long-run/checkpoint.json`
- `docs/review/phase12-5-long-run/logcat-final.txt`
- `docs/review/phase12-5-long-run/meminfo-hour-*.txt`

### 再実行

```powershell
npm run verify:phase12-5
# または
PHASE12_5_HOURS=12 node scripts/phase12-5-long-run.mjs
```
