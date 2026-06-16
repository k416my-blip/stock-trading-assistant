# HyperOS v15 — 1h Screen-Off Run (Interim Report)

Updated: **2026-06-16 10:16:45 MYT**  
Device: **Redmi Note 13 Pro** (`FYRWXSNNAIOR9DCM`)  
APK: **preview-v15.apk** (versionCode **15**, EAS build `e4491fe1`)  
Run ID: `20260616-091138`  
Git at run start: `af9240153be8a3a45c776ecf545e63621f0add7a`

---

## Summary

1時間画面OFF監視の **60分 poll は完了**（15/30/45/60分）。`phase12-5` ランナーは **1h 後処理**（hour-1 銘柄検証）を実行中。コア生存指標（PID・FGS・WakeLock）は暫定 **GO**。

---

## 1. 開始時刻

| TZ | Value |
|----|-------|
| MYT | **2026-06-16 09:11:38** |
| UTC | 2026-06-16T01:11:38.065Z |

---

## 2. 現在時刻

| TZ | Value |
|----|-------|
| MYT | **2026-06-16 10:16:45** |
| UTC | 2026-06-16T02:16:45Z |

---

## 3. 経過時間

**約 65分 7秒**（開始から）

---

## 4. 完了率

| フェーズ | 進捗 |
|----------|------|
| HyperOS 1h 監視 poll（15/30/45/60分） | **4/4 = 100%** |
| phase12-5 price refresh（h0-m0/m15/m30） | **3/3 = 100%** |
| phase12-5 全体（hour-1 銘柄検証 tail 含む） | **~95%**（実行中） |

---

## 5. 終了予定時刻

| 項目 | 時刻 (MYT) |
|------|------------|
| 1h 監視ウィンドウ（ログ記載） | **10:12:04**（到達済み） |
| 最終レポート・ランナー完全終了 | **10:25〜10:35** 頃（hour-1 UI 検証 tail 次第） |

---

## 6. App PID

| 項目 | Value |
|------|-------|
| Baseline PID | **27511** |
| 現在 PID（adb） | **27511** |
| 60分 poll PID | **27511** |

---

## 7. PID lost events

**0**（`hyperos-v10-1h-evidence.json`, `checkpoint.json`）

---

## 8. Heartbeat 回数

| Poll | elapsedMin | heartbeatTotal | heartbeatDelta |
|------|------------|----------------|----------------|
| 15m | 15 | 1 | -2 |
| 30m | 30 | **3** | +2 |
| 45m | 45 | 0 | -3 |
| 60m | 60 | 0 | 0 |

**注:** 45m/60m で total=0 は logcat スキャン区間リセットの既知挙動の可能性。30m 時点で継続確認済み。最終レポートで logcat 全体を再集計予定。

---

## 9. Twelve Data / price_update 回数

### Orchestrator poll（logcat delta）

| Poll | priceTotal |
|------|------------|
| 15m | 1 |
| 30m | 1 |
| 45m | 0 |
| 60m | 0 |

### phase12-5 UI price refresh（checkpoint）

| Tag | Result | At (UTC) |
|-----|--------|----------|
| h0-m0 | **ok** | 01:26:19 |
| h0-m15 | **ok** | 01:42:45 |
| h0-m30 | **ok** | 01:58:57 |

**UI 価格更新: 3回成功**

---

## 10. News fetch 回数

| Poll | newsTotal |
|------|-----------|
| 15m | 2 |
| 30m | 0 |
| 45m | 1 |
| 60m | **2** |

---

## 11. Foreground Service 状態

**全 poll で `fgsRunning: true`**

60分時点 dumpsys（抜粋）:

```
* ServiceRecord{... LongRunForegroundService ...}
  isForeground=true foregroundId=9001 types=0x00000001
  startForegroundCount=1
```

Evidence: `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-60m-services.txt`

---

## 12. WakeLock 状態

**全 poll で `wakeLockHeld: true`**

| Poll | wakefulness |
|------|-------------|
| 15m | Awake |
| 30m | Awake |
| 45m | **Dozing** |
| 60m | **Dozing** |

45m 以降 **Dozing**（画面OFF相当）で FGS + WakeLock 維持を確認。

---

## 13. Crash / FATAL 数

**0**（`checkpoint.json` → `crashes.fatal: 0`）

---

## 14. ANR 数

**0**（`checkpoint.json` → `anrCount: 0`）

---

## 15. 現時点の GO / NO-GO 暫定判定

| 判定基準 | 暫定 |
|----------|------|
| PID lost events = 0 | **PASS** |
| fatal = 0 | **PASS** |
| anr = 0 | **PASS** |
| foregroundServiceRunning = true（60m dumpsys） | **PASS** |
| wakeLockHeld = true（60m poll） | **PASS** |
| Heartbeat 継続 | **WATCH**（45/60m poll counter 要最終 logcat 再集計） |
| Twelve Data / News 継続 | **WATCH**（poll counter 揺れ；UI price refresh 3/3 ok） |

### 暫定総合: **GO（条件付き）**

- コア生存（PID / FGS / WakeLock / Crash / ANR）は **GO**
- Heartbeat・price/news の logcat カウンタは最終レポートで確定
- 3h テストへは **最終 1h レポート GO 後のみ** 進行

---

## PID タイムライン

| At (UTC) | elapsedMin | PID | Note |
|----------|------------|-----|------|
| 01:27:01 | 15 | 27511 | Awake |
| 01:42:05 | 30 | 27511 | Awake |
| 01:57:09 | 45 | 27511 | Dozing |
| 02:12:11 | 60 | 27511 | Dozing |

---

## dumpsys / logcat 証跡（途中）

| Path |
|------|
| `docs/review/hyperos-screen-off-survival/hyperos-v10-1h-evidence.json` |
| `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-15m-services.txt` |
| `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-30m-services.txt` |
| `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-45m-services.txt` |
| `docs/review/hyperos-screen-off-survival/dumpsys-evidence/20260616-091138-60m-services.txt` |
| `docs/review/phase12-5-long-run/checkpoint.json` |

---

## GitHub 同期状況

| Item | Value |
|------|-------|
| Branch | `cursor/top3-maxdd-capital-audit` |
| HEAD (local) | `5cf8c3b` — docs(hyperos): fill v15 Phase1 report commit hash |
| Remote | `origin/cursor/top3-maxdd-capital-audit` — **同期済み**（interim 提出前） |
| Run start commit | `af92401` — v15 Phase 1 PASS report |
| 本 interim レポート | **commit 待ち**（本ファイル） |

---

## 次の提出物

- `HYPEROS_V15_1H_SCREEN_OFF_RUN_REPORT.md`（ランナー完全終了後）
