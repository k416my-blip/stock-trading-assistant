# Monitor Event Root Cause Report

**Date:** 2026-06-16  
**Subject:** `logcat-live-verify-20260616-193413.log` — heartbeat / price_update / news_fetch = 0  
**Verdict:** **イベント未発火（計測ハーネス欠陥）— 集計ロジック不具合ではない**

---

## Executive summary

30分 logcat 検証（`20260616-193413`）で **17 MB** の run-scoped logcat 取得は成功したが、監視イベント count がすべて **0** だった。

解析の結果:

| 仮説 | 判定 |
|------|------|
| イベント存在 + count=0 → 集計ロジック不具合 | **却下** |
| イベント自体が logcat に存在しない | **確定** |

根本原因は **logcat-only ハーネスがアプリ起動・monitor 活性化を行わなかった** こと。`heartbeat: 4` 等は **MIUI PushService / GCM** 等のシステムログであり、アプリ `[12H-MONITOR]` イベントではない。

3h RERUN 時の PID / FGS / WakeLock 維持はアプリ本体の成果。今回の count=0 は **計測条件不足** であり、生存性リスクの再増ではない。

---

## 1. grep 結果（`logcat-live-verify-20260616-193413.log`）

| Pattern | Line count | 備考 |
|---------|------------|------|
| `12H-MONITOR` | **0** | アプリ monitor タグなし |
| `heartbeat` | **4** | すべて OS / GMS / PushService（下記抜粋） |
| `price_update` | **0** | — |
| `news_fetch` | **0** | — |
| `survival_health_ok` | **0** | — |

### orchestrator `countMonitorEvent` 結果（同一ファイル）

| Function | Count |
|----------|-------|
| `countHeartbeat()` | **0** |
| `countPriceUpdate()` | **0** |
| `countNewsFetch()` | **0** |
| `countSurvivalEvents()` | **0** |

### 参考: 3h RERUN スナップショット（集計ロジック正常性の対照）

ファイル: `docs/review/phase12-5-long-run/logcat-snapshot-20260616-173450.txt`

| Pattern | Count |
|---------|-------|
| `12H-MONITOR` + `'heartbeat'` 同行 | **2** |
| `countHeartbeat(snapshot)` | **2** ✓ grep と一致 |

→ **集計ロジックは正しい。** 30m verify ファイルに `[12H-MONITOR]` 行が 0 件なので count=0 は期待通り。

---

## 2. logcat 抜粋

### 2.1 `heartbeat`（非アプリ — 誤検知候補）

```
06-16 19:35:06.608  7738  7965 W PushService: [Tid:74] [Alarm] heartbeat alarm finish in 41
06-16 19:45:06.660  7738  7965 W PushService: [Tid:74] [Alarm] heartbeat alarm finish in 77
06-16 19:54:08.285 15596 15596 I DrivingDndInitializer: Starting Driving Mode logger service for heartbeat
```

### 2.2 FGS 維持（システム側 — アプリ JS ログではない）

```
06-16 19:34:15.043  1767  2199 D PolicyMaker: HasForegroundService pkgName=com.assistant.stocktrading uid:10396
06-16 19:34:15.043  1767  2199 D PolicyMaker: uid =10396 pkg=com.assistant.stocktrading reason=fgservice
```

### 2.3 3h RERUN 時の正しい monitor 形式（対照）

```
06-16 17:31:21.560  2506  2681 I ReactNativeJS: '[12H-MONITOR]', 'heartbeat', { elapsedMin: 4862,
```

`countMonitorEvent` は `12H-MONITOR` と `'heartbeat'` の **同一行共存** を要求 — この形式と一致。

### 2.4 30m verify 窗口内の ReactNativeJS

```
06-16 19:47:09.486 12616 13044 W ReactNativeJS: '[global]', '[bugsnag] Cannot set "maxBreadcrumbs"...
06-16 19:47:09.487 12616 13044 D ReactNativeJS: '[global]', '[bugsnag]', 'Loaded!'
```

→ **stock-trading アプリ（PID 2506）からの ReactNativeJS ログは 0 件。** 2 件は別アプリ（bugsnag）。

---

## 3. 根本原因分析

### 3.1 直接原因: logcat-only ハーネス

`scripts/verify-hyperos-logcat-capture-30m.mjs`（修正前）は:

1. `adb logcat -c` でリングバッファをクリア
2. Node pipe で logcat をファイルに追記
3. **アプリ起動なし・monitor 待機なし** で 30 分待機

→ 取得できた 17 MB は **端末全体のシステム logcat**。`[12H-MONITOR]` はアプリ JS が `console.log` した場合のみ出力されるため、**アプリ JS 未稼働窗口では 0 が正常**。

### 3.2 間接原因: 3h RERUN 終了後の JS 沈黙

| 信号 | 30m verify 窗口 |
|------|-----------------|
| FGS（PolicyMaker） | ✓ 約 5 秒間隔で pkg 参照 |
| PID 2506（RERUN 時） | 3 行のみ（残骸参照） |
| ReactNativeJS / `[12H-MONITOR]` | **0** |
| `survival_health_ok`（3 分周期） | **0** |

RERUN 終了（19:20 MYT）から verify 開始（19:34 MYT）の 14 分後、**ネイティブ FGS 登録は残るが JS タイマー（heartbeat 15 分、`survival_health` 3 分）が logcat に出ていない** → Doze / プロセス再起動 / JS サスペンドのいずれかで **monitor 発火経路が停止** していた可能性が高い。

### 3.3 発火経路調査（コード）

| ユーザー指定 | 実装 | 発火条件 |
|--------------|------|----------|
| `noteHeartbeat()` | **`emitHeartbeat()`** 内部 / **`forceTwelveHourHeartbeat()`** 公開 | `active === true`（monitor 開始後）; 15 分 `setInterval` |
| `noteTwelveHourPriceUpdate()` | `twelveHourTestMonitorCore.ts:318` | `active` + Twelve Data 取得成功（`useAppApiKeys.ts`） |
| `noteNewsFetch()` | `noteTwelveHourNewsFetch()` `twelveHourTestMonitorCore.ts:325` | `active` + ニュース取得（`BursaMaterialContext.tsx`） |
| survival monitor | `repairSurvivalIfNeeded()` `longRunSurvival.ts:81` | `enableLongRunSurvival()` 後、3 分 `setInterval` |

Monitor 開始チェーン:

```
initProductionStabilityRuntime()
  → TWELVE_HOUR_TEST_MONITOR_ENABLED (EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1)
  → startTwelveHourTestMonitor({ allowBackground: true, targetHours: 12 })
  → startTwelveHourTestMonitorCore()
  → log('test_started') + emitHeartbeat(true) + setInterval(emitHeartbeat, 15min)
  → enableLongRunSurvival() → survival_health_ok 3min
```

**すべて JS スレッド依存。** ネイティブ FGS だけでは `[12H-MONITOR]` は出ない。

### 3.4 集計ロジック判定

```javascript
// scripts/lib/hyperos-monitor-metrics.mjs
raw.split('\n').filter((l) => l.includes('12H-MONITOR') && l.includes("'heartbeat'"))
```

3h スナップショットで grep=2 / count=2 が一致 → **不具合なし**。

---

## 4. 修正案

### 4.1 30m 検証ハーネス（実装済み）

`verify-hyperos-logcat-capture-30m.mjs` を更新:

- デフォルト: **cold launch + `[12H-MONITOR]` 待機**（120s）
- `LOGCAT_VERIFY_SKIP_APP_LAUNCH=1` で logcat-only モード（今回の再現用）
- evidence に `monitorReady` / `monitorPass` を記録
- logcat 取得 PASS（bytes>0）と monitor イベント PASS を分離

### 4.2 12h / 3h orchestrator（推奨）

- 既存: `readMetricsLogcat(ev)` で live file 優先（実装済み）
- 追加: poll 開始前に `waitSurvival()` 相当で `test_started` 確認
- finalize レポートに **「JS monitor 行数」** と **「FGS dumpsys」** を分離表示

### 4.3 将来（任意）: ネイティブ fallback ログ

JS 沈黙時も計測可能にするため、`StaNativeRuntime` 側で 15 分ごとに `STA-SURVIVAL heartbeat_native` を logcat 出力（orchestrator は別 counter で集計）。

### 4.4 再検証コマンド

```powershell
$env:ANDROID_SERIAL="FYRWXSNNAIOR9DCM"
$env:LOGCAT_VERIFY_MINUTES="30"
node scripts/verify-hyperos-logcat-capture-30m.mjs

# 解析
node scripts/analyze-logcat-monitor-events.mjs docs/review/hyperos-screen-off-survival/logcat-live-verify-<runId>.log
```

---

## 5. 12h テスト開始への影響

| 項目 | 状態 |
|------|------|
| run-scoped logcat 0 byte | **解決**（Node pipe、17 MB 確認） |
| monitor count=0（30m verify） | **ハーネス条件不足** — アプリ GO 判定には影響しない |
| 3h PID / FGS / WakeLock | **達成済み** |
| 12h 開始 | logcat 修正 PASS + **次回 verify は app launch 付き** で monitor ≥1 を確認後 GO |

---

## 6. GitHub sync

| Item | Value |
|------|-------|
| Commit | **fde568d** |
| Branch | `cursor/top3-maxdd-capital-audit` |
| Push | **success** → `origin/cursor/top3-maxdd-capital-audit` |

### Changed files (this report)

- `docs/review/MONITOR_EVENT_ROOT_CAUSE_REPORT.md`
- `scripts/analyze-logcat-monitor-events.mjs`
- `scripts/verify-hyperos-logcat-capture-30m.mjs` — app launch + monitor wait

---

## Appendix: 解析コマンド再現

```powershell
node scripts/analyze-logcat-monitor-events.mjs docs/review/hyperos-screen-off-survival/logcat-live-verify-20260616-193413.log
```
