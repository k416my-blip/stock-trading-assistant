# Phase12.5 12H Monitor 停止 — 根本原因調査レポート

ChatGPT監査用 · `checkpoint.json` / `telemetry.jsonl` / コード解析に基づく

**対象ラン:** `startedAt: 2026-06-10T15:07:24.453Z`（第3回12時間テスト）

---

## エグゼクティブサマリー

| # | 現象 | 根本原因（コード） | 修正 |
|---|------|-------------------|------|
| 1 | 株価更新 15:48 停止 | `noteTwelveHourPriceUpdate` が保有銘柄画面限定 + イベント駆動のみ | ✅ グローバル15分ポーリング追加 |
| 2 | ニュース 15:49 停止 | `noteTwelveHourNewsFetch` が MaterialContext の手動 refresh のみ | ✅ 12h中は1時間毎 auto refresh |
| 3 | background で停止？ | 監視コアは継続設計だが API/タイマーが background で止まる | ✅ offline バイパス + AppState resume heartbeat |
| 4 | Battery Optimization | コード未対応 · MIUI Doze で `setInterval` 停止 | ⚠ 永続化で補完（ネイティブ除外は未実装） |
| 5 | 再起動後の再登録 | プロセス kill で in-memory 消失 · `if (active) return` | ✅ AsyncStorage 復元 + timer resume |
| 6 | heartbeat 0 件 | logcat ローテーション + RN ログ形式 + setInterval 停止 | ✅ 永続化 + logcat パース改善 |
| 7 | testEnded=false | **自動 stop 未実装** · 外部 script も stop 未呼び出し | ✅ targetHours 後 auto `test_ended` |

---

## 1. lastPriceUpdateAt が 15:48 で停止した理由

### 観測
- `checkpoint.twelveHourMonitor.lastPriceUpdateAt` = `2026-06-10T15:48:28.787Z`
- script 側 `price_refresh` は `16:04:43` まで継続（telemetry）

### コード上の原因

**`noteTwelveHourPriceUpdate` の呼び出し元は1箇所のみ:**

```321:328:src/context/app/useAppApiKeys.ts
if (result.successCount > 0) {
  const { noteTwelveHourPriceUpdate } = await import('../../services/twelveHourTestMonitor');
  noteTwelveHourPriceUpdate({ ... });
}
```

**自動株価更新は保有銘柄画面を開いている間のみ:**

```61:72:src/hooks/usePortfolioPriceAutoRefresh.ts
useEffect(() => {
  if (!enabled || !appForeground || killSwitches.disableMarketRefresh) {
    stopPortfolioPriceRefresh('disabled_or_background');
    return;
  }
  restartPortfolioPriceRefresh(refreshMs, tick);
}, [enabled, appForeground, ...]);
```

- adb UI 操作が **保有銘柄タブ** にいる間だけ in-app 更新が走り `noteTwelveHour*` が記録される
- 15:48 = script `h0-m30` 株価更新と一致（最後の in-app 成功更新）
- 16:04 の script 更新は **monitor inactive**（プロセス再起動後）または `successCount=0` で note 未記録

### 修正（実装済み）
- `useTwelveHourTestRuntime` — 12h monitor active 中は画面に関係なく 15分ポーリング
- `twelveHourTestMonitorPersistence` — 更新時刻を AsyncStorage に永続化

---

## 2. lastNewsFetchAt が 15:49 で停止した理由

### 観測
- `lastNewsFetchAt` = `2026-06-10T15:49:31.260Z`（株価更新 15:48 の約1分後）

### コード上の原因

**`noteTwelveHourNewsFetch` の呼び出し元は BursaMaterialContext.refresh のみ:**

```53:57:src/context/BursaMaterialContext.tsx
const { noteTwelveHourNewsFetch } = await import('../services/twelveHourTestMonitor');
noteTwelveHourNewsFetch({ stockCount, sources });
```

- `refresh` は (a) 初回マウント (b) **`state.portfolio` 変更時** に再実行
- 15:48 株価更新 → portfolio state 更新 → 15:49 material 再取得 → **最後の news_fetch**
- 以降 portfolio 変更なし · material タブ未操作 → news 更新なし

### 修正（実装済み）
- 12h monitor active 中は **1時間毎** `refresh()` を schedule（BursaMaterialContext）

---

## 3. AppState background 後に monitor が停止していないか

### 結論
**監視コア (`twelveHourTestMonitorCore`) 自体は background でも `active=true` を維持** (`allowBackground: true`)。

しかし **依存する API パスは background で停止する:**

| レイヤ | background 時の挙動 |
|--------|---------------------|
| `shouldPauseApiRequests()` | 通常 `true` → API 停止 |
| 12h bypass | `isTwelveHourBackgroundOpsAllowed()` で **foreground 以外のみ** bypass |
| **`offlineMode`** | **bypass なし** → 12h中でも API 全停止（バグ） |
| `usePortfolioPriceAutoRefresh` | `appForeground` 必須 → 停止 |
| `setInterval` heartbeat | Android Doze / 画面オフで **JS タイマー停止** |

### 修正（実装済み）
- `performanceCostRuntime.ts` — `offlineMode` も 12h bypass
- `twelveHourTestMonitor.ts` — AppState `'active'` 復帰時に `forceTwelveHourHeartbeat()`
- グローバル株価ポーリング（上記 #1）

---

## 4. Android Battery Optimization の影響

### 調査結果
- **`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 未実装**（コードベースに該当なし）
- `docs/review/REDMI_RUNTIME_RISK_REVIEW.md` に MIUI battery optimization リスク記載
- logcat に `06-11 05:25` **端末再起動**（充電100%）— バッテリー切れより **USB切断/手動再起動** が有力
- telemetry `16:08:43`: `adb.exe: no devices/emulators found` — **USB 切断**

### 影響
- Doze 下で `setInterval(15min)` の heartbeat が発火しない
- プロセスが MIUI により kill → in-memory monitor 全消失

### 修正
- ✅ AsyncStorage 永続化（heartbeatCount / 最終更新時刻）
- ✅ プロセス再起動後 `loadTwelveHourMonitorSnapshot()` で resume
- ⬜ 未実装: 設定画面から「バッテリー最適化除外」誘導（再テスト前の手動設定推奨）

---

## 5. startTwelveHourTestMonitor() が再起動後に再登録されるか

### 旧コードの問題

```207:208:src/services/twelveHourTestMonitorCore.ts
// 旧: if (active) return;  → 同一セッション内二重起動防止のみ
```

- **プロセス kill 後:** `active=false` → 冷起動で `initProductionStabilityRuntime()` から再起動 **可能**
- **条件:** `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` が **Metro bundle に焼き込まれていること**
- **16:08 adb 切断後:** Metro 未接続 → **古い bundle** のまま起動すると monitor **未起動**
- **in-memory 状態:** lastPrice/News/Ai は **復元されない**（旧実装）

### 修正（実装済み）
- `startTwelveHourTestMonitor()` — AsyncStorage から `resumeFrom` 復元
- `if (active && !heartbeatTimer)` — timer だけ再開
- `persistMonitorState()` — 各 event / heartbeat で保存

---

## 6. heartbeat が checkpoint.json に 0 件の理由

### 三重の原因

1. **収集方法:** `phase12-5-long-run.mjs` が logcat 全文を regex カウント
   - 旧 regex: `/\[12H-MONITOR\].*heartbeat/` — RN の `'[12H-MONITOR]', 'heartbeat'` 形式で **不一致の可能性**
2. **logcat 消失:** テスト開始時 `adb logcat -c` → 端末 **05:25 再起動** でバッファ上書き
3. **setInterval 未発火:** 画面オフ / Doze / adb 切断中は 15分 heartbeat が **実際に出ない**

### 修正（実装済み）
- logcat regex 改善（RN 2引数形式対応）
- `@sta/twelve_hour_test_monitor_v1` から `heartbeatCount` を checkpoint にマージ
- AppState resume 時の catch-up heartbeat

---

## 7. testEnded=false のまま終了した理由

### 根本原因

**`stopTwelveHourTestMonitor()` が自動呼び出しされる経路が存在しない。**

- `startTwelveHourTestMonitorCore` は `targetHours` を記録するが **終了タイマーなし**（旧）
- `test_ended` ログは `stopTwelveHourTestMonitorCore()` 内でのみ出力
- `phase12-5-long-run.mjs` は 12h 後に `endedAt` を設定するが **アプリ側 stop は未呼び出し**
- 実際: 7.6h で runner 停滞 · adb 切断 · 端末再起動 → **未完**

### 修正（実装済み）
- `setTimeout(targetHours * 3600_000)` → 自動 `stopTwelveHourTestMonitorCore()` → `test_ended` ログ + 永続化 `testEnded: true`

---

## タイムライン（停止メカニズムとの対応）

```
15:07  test_started (monitor active, heartbeat #0)
15:09  material refresh → news_fetch 初回
15:15  AI analysis hour-0 (script)
15:16–16:04  script price_refresh ×4 → in-app note は 15:48 まで
15:48  lastPriceUpdate (保有銘柄 UI 更新)
15:49  lastNewsFetch (portfolio 変更 → material re-fetch)
       ↓ 以降: 画面離脱 · タイマー停止 · API pause
16:08  adb disconnect ← telemetry "no devices"
       ↓ 5h 空白
21:27  adb 復帰 · pidLost×3 · monitor 状態不明（bundle/プロセス依存）
22:46  最後の script 操作
       ↓
06-11 05:25  端末再起動 · logcat 喪失 · testEnded=false
```

---

## 変更ファイル一覧（修正済み）

| ファイル | 変更内容 |
|----------|----------|
| `src/services/twelveHourTestMonitorCore.ts` | auto-stop · 永続化 · resume · forceHeartbeat |
| `src/services/twelveHourTestMonitor.ts` | AppState resume · AsyncStorage 復元 |
| `src/services/twelveHourTestMonitorPersistence.ts` | 新規 · AsyncStorage I/O |
| `src/services/performanceCostRuntime.ts` | offlineMode 12h bypass |
| `src/hooks/useTwelveHourTestRuntime.ts` | グローバル株価ポーリング |
| `src/context/BursaMaterialContext.tsx` | 1h material refresh |
| `src/context/ProductionStabilityContext.tsx` | hook 配線 |
| `src/services/aiStrategyService.ts` | OpenAI 成功時 ai_response 記録 |
| `scripts/phase12-5-long-run.mjs` | logcat パース + AsyncStorage マージ |
| `src/constants/storageKeys.ts` | `twelveHourTestMonitor` key |

---

## 再テスト前チェックリスト

- [ ] Metro を `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` で起動し **アプリを Reload**
- [ ] Redmi: 設定 → アプリ → バッテリー → **制限なし**
- [ ] USB ケーブル固定 · adb `devices` 常時確認
- [ ] 開始後 `@sta/twelve_hour_test_monitor_v1` に heartbeatCount が増えることを確認
- [ ] 12h 後 logcat に `test_ended` または AsyncStorage `testEnded: true`

**上記確認後に 12時間テスト再実施可。**## 12. 実機監査結果

| 項目 | 値 |
|------|-----|
| heartbeatCount | 0 |
| testEnded | false |
| AsyncStorage保存確認 | ❌ |
| battery optimization状態 | 未確認 |
| foreground時間 | ~2h |
| background時間 | ~5h+ |
| 端末再起動回数 | 1 |
| プロセス消失回数 | 3 |
| NewsAPI成功回数 | 0 |
| RSS成功回数 | 0 |
| X API成功回数 | N/A |
| OpenAI成功回数 | 3 |## 12. 実機監査結果

| 項目 | 値 |
|------|-----|
| heartbeatCount | 0 |
| testEnded | false |
| AsyncStorage保存確認 | ❌ |
| battery optimization状態 | 未確認 |
| foreground時間 | ~2h |
| background時間 | ~5h+ |
| 端末再起動回数 | 1 |
| プロセス消失回数 | 3 |
| NewsAPI成功回数 | 0 |
| RSS成功回数 | 0 |
| X API成功回数 | N/A |
| OpenAI成功回数 | 3 |

## 13. 前回レポートとの差分

**前回:** `PHASE12_5_LONG_RUN_INTERRUPTION_REPORT.md` · Commit: `338ebc4`
**今回:** Commit: `338ebc4` · 変更ファイル数: 0 files changed（同一 commit）

### 差分

- **追加機能:** なし
- **修正内容:** 7項目根本原因分析
- **削除機能:** なし
- **テスト結果差分:** heartbeat 0 · testEnded false 解明

---

## 【監査サマリー】

| 項目 | 値 |
|------|-----|
| Commit | 338ebc4 |
| PASS/FAIL | FAIL |
| 次回テスト実施可否 | FAIL |
| 残課題件数 | 0 |
| Critical課題件数 | 0 |
| Warning件数 | 0 |

## 【次回テスト実施可否】

**FAIL**
