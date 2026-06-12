# 次回 12 時間テスト — 再開準備メモ

**記録作成:** 2026-06-12T06:34:18+08:00  
**方針:** 本日は 12 時間テストを **開始しない**。次回 dry-run → preflight → 本番の順。

---

## 現在状態（停止前スナップショット）

| 項目 | 値 |
|------|-----|
| 現在時刻 | **2026-06-12T06:34:18+08:00** |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| HEAD commit | `9e59afa44c6e46952ebd7e19a9f5d413e153040b` — bursa: harden null-safety and monitoring snapshot normalization |
| adb device | **FYRWXSNNAIOR9DCM** — `device` |
| app PID | **15969**（`com.assistant.stocktrading`） |
| Metro | **:8081 LISTENING**（node PID **25308**） |
| バッテリー | **97%** · `status: 2`（充電中） |
| スケジュール電源ON/OFF | **OFF**（前回 adb で無効化済み） |

---

## 前回 12 時間テスト結果

| 項目 | 値 |
|------|-----|
| 開始 | **2026-06-11T21:20+08** |
| 停止 | **2026-06-11T23:24+08** |
| 経過 | **約 2h04m**（計画 12h の **17%**） |
| 総合 | **FAILED（中断）** — `docs/review/PHASE12_5_LONG_RUN_REPORT.md` |
| 停止理由 | `logcat-final.txt` 固定名 **`fs.writeFileSync` 上書き** → **errno -4094**（PC 側ファイルロック） |
| 端末 | 停止後も app / Metro / adb **生存**（オーケストレータのみ exit 1） |

---

## 修正済み（次回向け）

| 内容 | 参照 |
|------|------|
| logcat finalization を **timestamp 付き final log + WARN 化** | `scripts/lib/phase12-5-logcat-finalization.mjs` |
| 周期スキャンから固定名 `logcat-final.txt` 上書きを **廃止** | `scripts/phase12-5-long-run.mjs` |
| FAIL / WARN 分離（log 保存失敗は本体 FAIL にしない） | 同上 |
| 詳細レポート | `docs/review/PHASE12_5_LOGCAT_FINALIZATION_FIX_REPORT.md` |

---

## 検証済み（2026-06-12 時点）

| 検証 | 結果 |
|------|------|
| typecheck | **PASS** |
| phase12-5LogcatFinalization | **6/6 PASS** |
| phase12Stability | **5/5 PASS** |
| dry-run（`PHASE12_5_DRY_RUN=1`） | **exit 0** |
| mock-fail dry-run（`PHASE12_5_LOGCAT_FINALIZE_MOCK_FAIL=1`） | **exit 0**（WARN のみ） |

---

## ログ保存先（停止前・最終更新）

| ファイル | サイズ | 最終更新 |
|----------|--------|----------|
| `docs/review/twelve-hour-test/adb-logcat-live.log` | ~14.6 MB | **2026-06-12 06:34:31** |
| `docs/review/twelve-hour-test/metro.log` | ~4.1 MB | **2026-06-12 06:34:30** |
| `docs/review/twelve-hour-test/phase12-5-runner.log` | 3.6 KB | 2026-06-11 23:24:26 |
| `docs/review/twelve-hour-test/app-runtime.log` | 453 B | 2026-06-11 21:19:37 |
| `docs/review/phase12-5-long-run/checkpoint.json` | 7.2 KB | 2026-06-12 06:30:04（失敗ラン復元済み） |
| `docs/review/phase12-5-long-run/logcat-final.txt` | ~31 MB | 2026-06-11 23:24:26（旧形式・削除せず保持） |
| `docs/review/twelve-hour-test/adb-logcat-final-20260612-062916.log` | dry-run 生成 | 2026-06-12 06:29 頃 |
| `docs/review/phase12-5-long-run/logcat-snapshot-20260612-062916.txt` | dry-run 生成 | 2026-06-12 06:29 頃 |

---

## 起動中プロセス（停止前）

| プロセス | PID / 備考 | 状態 |
|----------|------------|------|
| `verify:phase12-5` | terminal 278652 | **既に停止**（2026-06-11 23:24 exit 1） |
| `adb logcat` → Tee-Object live.log | shell **24952**, adb **18076** | **稼働中** → 停止対象 |
| Metro `npm run start:clear` | shell **10964**, node **25308** | **稼働中** → 停止対象 |
| 端末アプリ | PID **15969** | **維持**（停止しない） |

---

## 次回やること（順序）

1. **dry-run 1 回** — logcat finalization 確認
2. **preflight** — `npm run verify:twelve-hour-preflight`
3. **12 時間テスト本番** — `npm run verify:phase12-5`（WARN_ALLOW 前提なら NewsAPI 0×6 は既知）

---

## 次回実行コマンド

### Step 0 — 環境（PowerShell、リポジトリ root）

```powershell
cd C:\Users\k416m\Documents\Projects\stock-trading-assistant
adb devices -l
```

### Step 1 — dry-run（logcat final 生成確認）

```powershell
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
$env:PHASE12_5_DRY_RUN="1"
node scripts/phase12-5-long-run.mjs
```

### Step 2 — Metro + live logcat 再起動（本番前）

```powershell
Remove-Item Env:PHASE12_5_DRY_RUN -ErrorAction SilentlyContinue
# Metro（別ターミナル推奨）
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
npm run start:clear
# live logcat（別ターミナル推奨）
adb logcat -v threadtime ReactNativeJS:* AndroidRuntime:E ActivityManager:I *:S 2>&1 `
  | Tee-Object -FilePath "docs/review/twelve-hour-test/adb-logcat-live.log" -Append
```

### Step 3 — preflight + 本番 12h

```powershell
Remove-Item Env:PHASE12_5_DRY_RUN -ErrorAction SilentlyContinue
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
$env:PHASE12_5_HOURS="12"

npm run verify:twelve-hour-preflight
npm run verify:phase12-5
```

### 参考 — mock-fail 確認（任意・本番前）

```powershell
$env:PHASE12_5_DRY_RUN="1"
$env:PHASE12_5_LOGCAT_FINALIZE_MOCK_FAIL="1"
node scripts/phase12-5-long-run.mjs
Remove-Item Env:PHASE12_5_LOGCAT_FINALIZE_MOCK_FAIL -ErrorAction SilentlyContinue
```

---

## 停止実施（2026-06-12T06:35+08）

| プロセス | 操作 | 結果 |
|----------|------|------|
| `verify:phase12-5` | 停止確認 | **既に停止済み**（2026-06-11 23:24 exit 1） |
| `adb logcat` Tee-Object | Stop-Process **24952**（+ adb **18076**） | **停止** |
| Metro `:8081` | `scripts/kill-metro.ps1`（node **25308**, **11852**） | **停止** · port **8081 free** |
| 端末アプリ PID **15969** | — | **維持**（停止していない） |

---

## git 操作

`git add` / `commit` / `push` — **未実施**

---

## 関連ドキュメント

- `docs/review/twelve-hour-test/test-start-info.md` — 前回開始・停止記録
- `docs/review/PHASE12_5_LONG_RUN_REPORT.md` — FAILED（中断）確定
- `docs/review/PHASE12_5_LOGCAT_FINALIZATION_FIX_REPORT.md` — 修正詳細
- `docs/review/TWELVE_HOUR_DEVICE_PREPARATION_CHECKLIST.md` — 端末/PC チェックリスト
