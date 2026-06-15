# HyperOS v9 3h NO-GO — 根本原因分析

作成日: 2026-06-15  
対象ラン: runId `20260615-203607` · MYT 20:36–23:37

---

## 1. エグゼクティブサマリー

| 失敗項目 | 根本原因（確度） |
|----------|------------------|
| PID maintenance FAIL | **FGS 不在時に `svc +1 LAST` でプロセス終了**（23:07 MYT · 約151分） |
| Foreground Service FAIL | **`startForeground()` に API29+ service type 未指定** · dumpsys 検出パターン不一致 · `running` 静的フラグのみ |
| Heartbeat FAIL | **計測バグ** — RN ログは `'[12H-MONITOR]', 'heartbeat'` 分割形式 · 実 heartbeat は継続 |

---

## 2. PID 消失（166m ポール / 実 death 151m）

### 2.1 logcat 決定的証拠

```
06-15 23:07:11.292 I/ActivityManager: Process com.assistant.stocktrading (pid 7644) has died: svc   +1 LAST
```

- **`svc +1 LAST`**: プロセス内の **最後の Service が終了** したため AMS がプロセスを kill
- 151分時点まで PID 7644 は維持 · 166m/181m ポールで `pidof` が null

### 2.2 因果链

1. `LongRunForegroundService` が dumpsys に **12/12 ポール未検出**
2. WakeLock だけでは HyperOS Doze 下で **長時間プロセス保持不可**
3. 約2.5h 後に Service バインディング終了 → **LAST service death** → プロセス kill
4. phase12-5 UI 操作（価格更新）が一時的に画面 Awake にするが、**プロセス寿命には寄与せず**

### 2.3 修正方針（v10）

- `startForeground(id, notification, FOREGROUND_SERVICE_TYPE_DATA_SYNC)` （Android Q+）
- `android:stopWithTask="false"` · `onTaskRemoved` で FGS 再起動
- WakeLock `acquire(timeout=12h)` · 3分ごと JS `survival_repair`
- `STA-SURVIVAL` タグで native lifecycle を logcat 記録
- `getSurvivalStatus()` を ActivityManager runningServices ベースに変更

---

## 3. Foreground Service 未検出

### 3.1 実装ギャップ（v9）

| 問題 | 詳細 |
|------|------|
| startForeground 型不足 | Android 14/HyperOS で dataSync FGS は **service type 必須** |
| 検出ロジック | orchestrator が `LongRunForegroundService` 文字列のみ grep — パッケージ限定 dumpsys 未使用 |
| 状態フラグ | `companion.running` 静的 bool のみ — service 未起動でも false のまま |

### 3.2 survival_status ログ

16分 PASS 時も `foregroundServiceRunning: false` が散見 — **FGS は実質未稼働** だった可能性が高い。

---

## 4. Heartbeat 計測 FAIL（偽陽性）

### 4.1 旧カウンタ

```javascript
countLines(raw, '[12H-MONITOR] heartbeat')  // → 常に 0
```

### 4.2 実際の RN ログ形式

```
ReactNativeJS: '[12H-MONITOR]', 'heartbeat', { elapsedMin: ... }
```

logcat summary には **heartbeat 行が多数存在**（`logcat-summary-3h-20260615-203607.txt` 参照）。

### 4.3 修正

`scripts/lib/hyperos-monitor-metrics.mjs` — `countHeartbeat()` で `'heartbeat'` + `12H-MONITOR` を検出。

---

## 5. HyperOS 電源制限調査

| 項目 | 調査方法 | 対策 |
|------|----------|------|
| Doze / deviceidle | `dumpsys deviceidle whitelist` | `whitelist +PKG` |
| App Standby Bucket | `am get-standby-bucket` | 監視 · ACTIVE 推奨 |
| Background Restriction | `cmd activity get-background-restriction-exemption` | 記録 |
| RUN_ANY_IN_BACKGROUND | `cmd appops get/set` | `allow` 設定 |
| MIUI PowerKeeper | `dumpsys activity provider com.miui.powerkeeper` | 手動「無制限」推奨 |

スクリプト: `node scripts/audit-hyperos-power-restrictions.mjs`

---

## 6. v10 修正一覧

| ファイル | 変更 |
|----------|------|
| `LongRunForegroundService.kt` | service type · START_STICKY · onTaskRemoved · STA-SURVIVAL log |
| `StaNativeRuntimeModule.kt` | applicationContext · runningServices 検出 · wakeLock timeout |
| `AndroidManifest.xml` | `stopWithTask=false` |
| `longRunSurvival.ts` | 3分 health check · `survival_repair` |
| `hyperos-monitor-metrics.mjs` | heartbeat/FGS 計測修正 |
| `verify-hyperos-v9-3h-screen-off.mjs` | dumpsys evidence · PID timeline · power audit preflight |
| `verify-hyperos-v9-staged-screen-off.mjs` | 30m→1h→3h 段階検証 |
| `app.json` | versionCode **10** |

---

## 7. 再検証計画

1. EAS preview v10 ビルド & インストール
2. `node scripts/verify-hyperos-v9-staged-screen-off.mjs`（30m → 1h → 3h）
3. 各段階で提出: Markdown · PID timeline · dumpsys evidence · GitHub sync
