# Commit 16 準備レポート — Phase12.5 Metro / Bundle / Watchdog Hardening

**実施時刻:** 2026-06-13T00:21:46+08:00  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**HEAD:** `d6002577c7a4502543ccdb7ed24016b6eaa2c508`  
**remote 同期:** **0 / 0**  
**Step:** **1 のみ**（Commit16 実装 · 検証 · 準備レポート）  
**未実施:** git add / commit / push · 12h 本番 · 2〜3h 短期テスト · APK/preview build · Phase24

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| **Step 1 完了** | **はい** |
| **typecheck** | **PASS** |
| **unit test** | **32/32 PASS** |
| **dry-run** | **PASS**（exit **0** · ~2.9s · warnings **`[]`**） |
| **logcat ローテート** | **実施**（69,348,426 bytes → archive） |
| **Commit16 commit 可能** | **はい** |

---

## 1. 現状確認（git）

```text
git branch --show-current → cursor/top3-maxdd-capital-audit
git rev-parse HEAD        → d6002577c7a4502543ccdb7ed24016b6eaa2c508
remote 同期               → 0 / 0
git status --porcelain    → 795 行（未コミット多数 · 今回 Commit16 対象ファイルのみ変更）
```

---

## 2. 前回 INVALID 理由（Post-Commit 15）

参照:
- `docs/review/twelve-hour-test/TWELVE_HOUR_POST_COMMIT15_INVALID_METRO_BUNDLE_REPORT.md`
- `docs/review/twelve-hour-test/TWELVE_HOUR_POST_COMMIT15_H0_M15_PROGRESS_REPORT.md`
- `docs/review/twelve-hour-test/TWELVE_HOUR_POST_COMMIT15_START_REPORT.md`

| 事象 | 時刻（+08） |
|------|-------------|
| **pre-run-watch 停止** | **23:18:31**（以降 dead） |
| **Could not load bundle** | **23:29:22** |
| **Metro NOT LISTENING** | **23:34** 確認 |
| **手動 runner 停止** | 23:40:24–26 |

---

## 3. Commit 15 UI dump hardening（正常）

| 項目 | 結果 |
|------|------|
| uiDumpWarnings | **`[]`** |
| dismiss.xml errno -4094 | **再発なし** |
| timestamp 付き ui-dump | **95 件正常** |

---

## 4. 修正ファイル一覧

| ファイル | 種別 |
|----------|------|
| `scripts/lib/phase12-5-metro-watchdog.mjs` | 新規 |
| `scripts/lib/phase12-5-invalid-detectors.mjs` | 新規 |
| `scripts/lib/phase12-5-graceful-invalid.mjs` | 新規 |
| `scripts/phase12-5-pre-run-watch.mjs` | 新規 |
| `scripts/phase12-5-watchdog.mjs` | 新規 |
| `scripts/phase12-5-long-run.mjs` | 更新 |
| `tests/unit/phase12-5MetroWatchdog.test.ts` | 新規 |
| `tests/unit/phase12-5InvalidDetectors.test.ts` | 新規 |

---

## 5. Metro 監視仕様

| 項目 | 内容 |
|------|------|
| **モジュール** | `phase12-5-metro-watchdog.mjs` |
| **方法** | Windows `netstat -ano` · `:8081` + `LISTENING` |
| **OK** | `listening: true` |
| **NG** | `stopReason=metro_down` · `metroDownAt` · `lastMetroCheck` · `metroCheckDetails` |
| **例外** | detector 内 catch · runner クラッシュしない |

`metroCheckDetails` 例: `{ port, listening, method, pid, checkedAt }`

---

## 6. bundle error 検知仕様

| 項目 | 内容 |
|------|------|
| **モジュール** | `phase12-5-invalid-detectors.mjs` |
| **ソース** | `adb-logcat-live.log` **増分のみ**（offset 追跡 · max 512KB/tick） |
| **パターン** | Could not load bundle · UI crash · LoadBundleFromServerRequestError · AppErrorBoundary |
| **NG** | `stopReason=bundle_error` · `bundleErrorAt` · `matchingLine` · `sourceFile` |
| **巨大 log** | 全体読み込み禁止 · offset 以降のみ |

---

## 7. app PID 監視仕様

| 項目 | 内容 |
|------|------|
| **baseline** | runner 開始時 `baselineAppPid` |
| **PID 変更** | `app_pid_changed` · `previousPid` · `currentPid` |
| **PID 喪失** | `app_pid_lost` |
| **checkpoint** | `pidLostEvents` · `pidChangedEvents` |
| **変更** | 旧 auto-relaunch **廃止** → graceful INVALID |

---

## 8. pre-run-watch 軽量化仕様

**スクリプト:** `node scripts/phase12-5-pre-run-watch.mjs`

| 項目 | 内容 |
|------|------|
| UI dump | **取得しない** |
| logcat | mtime / size / **末尾 4KB のみ** |
| Tail 500 行 | **禁止** |
| adb | タイムアウト 10s |
| heartbeat | `pre-run-watch-heartbeat.log` |
| 出力 | `pre-run-watch.log` |

---

## 9. watchdog 仕様

**スクリプト:** `node scripts/phase12-5-watchdog.mjs`

| 項目 | 内容 |
|------|------|
| 監視 | `pre-run-watch.log` **mtime のみ** |
| adb | **呼ばない** |
| 5 分 | WARN → `watchdog.log` |
| 10 分 | FAIL · runner 側 `watch_dead` |
| ログ | `docs/review/twelve-hour-test/watchdog.log` |

---

## 10. checkpoint / invalid reason 出力

### checkpoint 追加フィールド

`baselineAppPid` · `metroDownAt` · `metroPid` · `lastMetroCheck` · `metroCheckDetails` · `bundleErrorAt` · `bundleMatchingLine` · `bundleSourceFile` · `watchDeadAt` · `previousPid` · `currentPid` · `pidChangedEvents` · `logcatScanOffset` · `detectorErrors`

### INVALID artifact

| ファイル | 用途 |
|----------|------|
| `docs/review/twelve-hour-test/phase12-5-invalid-reason.json` | 構造化 |
| `docs/review/twelve-hour-test/PHASE12_5_INVALID_REASON_SUMMARY.md` | サマリー |

### runner 統合

- main loop **各 tick 先頭**で `runInvalidDetectors()`
- INVALID 検知 → `gracefulInvalidExit()` · exit **1**
- dry-run: adb 未接続時は logcat-only（adb ハング回避）

---

## 11. logcat ローテート（dry-run 前）

| 項目 | 値 |
|------|-----|
| **旧サイズ** | 69,348,426 bytes (~66 MB) |
| **archive** | `adb-logcat-live-archive-commit16-20260613-001740.log` |
| **新 live** | ローテートマーカーのみから開始 |
| **削除** | **なし** |

---

## 12. 検証結果

### typecheck

```text
npm run typecheck → PASS（exit 0）
```

### unit test

```text
phase12-5MetroWatchdog.test.ts       → 5/5 PASS
phase12-5InvalidDetectors.test.ts    → 13/13 PASS
phase12-5LogcatFinalization.test.ts    → 6/6 PASS
phase12-5UiDumpFinalization.test.ts    → 8/8 PASS
合計                                 → 32/32 PASS
```

### dry-run

```powershell
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
$env:PHASE12_5_DRY_RUN="1"
node scripts/phase12-5-long-run.mjs
```

| 項目 | 結果 |
|------|------|
| **exit code** | **0** |
| **所要時間** | **~2.9 秒** |
| **warnings** | **`[]`** |
| **adb** | 未接続 · WARN のみ · logcat-only dry-run |
| **final** | `adb-logcat-final-20260613-002146.log` |

---

## 13. Step 2 以降 — 未実施

| Step | 内容 | 状態 |
|------|------|------|
| 2 | APK / preview build 方針 | **未着手** |
| 3 | Phase24 設計・実装準備 | **未着手** |
| 4 | Phase24 小さく実装 | **未着手** |
| 5 | unit test（Phase24） | **未着手** |
| 6 | 2〜3 時間短期テスト | **未着手** |
| 7 | APK 環境 12h テスト | **未着手** |
| — | **12h 本番** | **未着手** |

---

## 14. git / 証跡

| 項目 | 状態 |
|------|------|
| git add / commit / push | **未実施** |
| 前回 INVALID 証跡 | **保持** |
| ログ削除 | **なし** |

---

## 15. Commit16 commit 可否

| 判定 | **commit 可能** |
|------|-----------------|
| 理由 | typecheck PASS · 32 tests PASS · dry-run PASS · スコープ明確 |

**推奨 commit message:**

```text
phase12.5: add metro and bundle watchdogs for long-run tests
```

---

*Step 1 完了 — 次は Step 2（APK/preview build 方針）へ。本番 12h / 短期テスト / Phase24 は未着手。*
