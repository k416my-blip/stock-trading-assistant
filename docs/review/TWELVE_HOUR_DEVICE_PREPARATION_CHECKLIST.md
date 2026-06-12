# 12時間テスト — 実機環境準備チェックリスト

対象端末: **Xiaomi Redmi Note 13 Pro 5G**  
実行形態: **Expo Go** または **開発ビルド**（`expo run:android` / dev client）  
記録日: 2026-06-02  
HEAD 参考: `9e59afa`（Commit 9 完了時点）

---

## テスト目的

12時間の実機連続稼働テスト中に、**スマホ側・PC側・ネットワーク側**の要因で停止しないようにする。  
停止した場合でも、ログから次を切り分けできるようにする。

| 停止要因 | 切り分けの目安 |
|----------|----------------|
| スマホ電源落ち / バッテリー切れ | 充電・電量ログ、突然の logcat 断絶、端末操作不能 |
| 画面オフ / 省電力によるアプリ停止 | `[12H-MONITOR]` の OSスリープ検出、MIUI バッテリー制限 |
| Wi-Fi 切断 | PC ping / adb 切断、Metro 接続エラー |
| Expo Go / 開発アプリの BG キル | プロセス消失、adb `pid` ロスト、`phase12-5` の `pidLostEvents` |
| Metro / PC 接続切断 | Metro ターミナル停止、`Unable to connect to Metro` |
| API 失敗 | `verify:twelve-hour-api-audit` / アプリ内 API 監査ログ |
| アプリクラッシュ | logcat `AndroidRuntime` / `FATAL` |

**アプリ内監視（既存）:** `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` で `[12H-MONITOR]` ハートビート・スリープ検出・API 更新時刻を logcat に出力。

**PC 側オーケストレーション（既存）:** `npm run verify:phase12-5` → `docs/review/phase12-5-long-run/` に telemetry / checkpoint / logcat-final を保存。

---

## A. スマホ設定チェックリスト（Xiaomi / MIUI / Android）

テスト開始前に **すべてチェック**。項目ごとに ☐ を手動で確認。

### A-1. 電源・充電

| ☐ | 設定 | 推奨値 | MIUI での場所（目安） |
|---|------|--------|----------------------|
| ☐ | 充電器接続 | **テスト中ずっと接続**（純正 or 十分な出力の充電器） | — |
| ☐ | 開始時バッテリー | **100%**（最低 90% 以上） | 設定 → バッテリー |
| ☐ | 省電力モード | **OFF** | 設定 → バッテリー → 省電力モード |
| ☐ | ウルトラバッテリーセーバー | **OFF** | 設定 → バッテリー → ウルトラ省電力 |
| ☐ | 充電中は画面をスリープにしない | **ON** | 設定 → 追加設定 → 開発者向けオプション → **充電中は画面をスリープにしない** |
| ☐ | 画面ロック時間 | **最大（10分 or なし）** ※充電中スリープ無効と併用 | 設定 → ロック画面 → 自動ロック |
| ☐ | ケース | **外す**（発熱・充電不良防止） | — |

> **開発者向けオプションの有効化:** 設定 → 端末情報 → OS バージョンを **7回タップ**。

### A-2. アプリ別設定（対象アプリを選択）

| 使用するアプリ | パッケージ名（参考） |
|----------------|---------------------|
| 開発ビルド（推奨） | `com.assistant.stocktrading` |
| Expo Go | `host.exp.exponent` |

| ☐ | 設定 | 推奨値 | MIUI での場所（目安） |
|---|------|--------|----------------------|
| ☐ | バッテリー制限 | **制限なし** / **無制限** | 設定 → アプリ → アプリ管理 → [アプリ] → バッテリー → **制限なし** |
| ☐ | バックグラウンド実行 | **許可** | 同上 → バックグラウンド → **制限なし** or **バックグラウンド実行を許可** |
| ☐ | 自動起動 | **ON**（あれば） | 設定 → アプリ → 自動起動管理 → [アプリ] → **ON** |
| ☐ | 省電力ポップアップ | 表示されたら **制限しない** を選択 | 初回起動時の MIUI ダイアログ |
| ☐ | 最近のアプリからの削除 | テスト中 **スワイプで終了しない** | — |

### A-3. ネットワーク

| ☐ | 設定 | 推奨値 |
|---|------|--------|
| ☐ | Wi-Fi | **常時 ON**、PC と **同一 SSID** |
| ☐ | モバイルデータ | **OFF 推奨**（Wi-Fi 切替・課金回避） |
| ☐ | VPN | **OFF** |
| ☐ | Wi-Fi スリープ（端末） | **なし** / スリープ中も接続維持（開発者向け or 詳細設定があれば OFF） |
| ☐ | ルーター省電力 | 12時間 **スリープしない** 設定（可能なら） |

### A-4. 通知・割り込み

| ☐ | 設定 | 推奨値 |
|---|------|--------|
| ☐ | 着信・メッセージ | 可能なら **サイレント** or 別端末へ |
| ☐ | 不要アプリの通知 | **OFF** |
| ☐ | OS アップデート | **テスト中は延期** |
| ☐ | 画面操作 | テスト中 **触らない**（`phase12-5` が adb で画面操作） |

### A-5. USB / adb（PC 連携時）

| ☐ | 設定 | 推奨値 |
|---|------|--------|
| ☐ | USB デバッグ | **ON** |
| ☐ | USB デバッグ（セキュリティ設定） | **ON**（あれば） |
| ☐ | 充電のみ USB | **ファイル転送 / USB デバッグ** モード |
| ☐ | adb 接続 | `adb devices` で `device` 表示 |
| ☐ | Wi-Fi adb（任意） | USB 抜く前に `scripts/wifi-adb-verify.ps1` で検証済み |

---

## B. PC 設定チェックリスト（Windows + Metro + Expo）

| ☐ | 項目 | 推奨値 / 確認方法 |
|---|------|-------------------|
| ☐ | PC スリープ | **なし**（電源プラン → スリープ **なし**） |
| ☐ | 画面オフ | **なし** or 長時間（Metro ターミナルが見えること） |
| ☐ | ネットワークアダプタ省電力 | デバイスマネージャ → ネットワークアダプタ → 電源管理 → **省電力を無効** |
| ☐ | 同一 Wi-Fi | スマホと PC が **同じサブネット**（ゲスト Wi-Fi 不可） |
| ☐ | ポート 8081 | 他プロセス占有なし（`npm run kill:metro` で解放可） |
| ☐ | Metro 起動 | `npm run start` or `npm run start:clear` |
| ☐ | adb reverse | `adb reverse tcp:8081 tcp:8081`（USB 時） |
| ☐ | 実機接続 | Expo でアプリ起動済み、または dev build インストール済み |
| ☐ | 監視ビルド | `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` で **再ビルド or 再起動** |
| ☐ | ログ保存フォルダ | 下記「ログ保存体制」参照 — **事前に作成** |
| ☐ | 重い処理 | 不要な terminal / ビルド / スキャンを **停止** |
| ☐ | Node ヒープ | `start-metro.ps1` が `NODE_OPTIONS=--max-old-space-size=8192` を設定済み |

### Windows 電源設定（管理者 PowerShell・参考）

```powershell
# 確認
powercfg /query SCHEME_CURRENT SUB_SLEEP

# AC 電源時スリープ無効（要管理者）
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
```

---

## C. 開始前チェック（実行順）

テスト本番前に **この順序** で実行。すべて PASS（または許容 WARN のみ）してから開始。

### 手順 1 — リポジトリ状態（監査用・任意）

```powershell
cd C:\Users\k416m\Documents\Projects\stock-trading-assistant
git status --porcelain
git rev-parse HEAD
```

期待: テスト対象コミットであることを確認（本番は dirty でも可だが記録すること）。

### 手順 2 — 静的検証

```powershell
npm run typecheck
```

期待: **exit 0**

### 手順 3 — 関連 unit test

```powershell
npx vitest run tests/unit/twelveHourTestMonitor.test.ts tests/unit/phase12Stability.test.ts tests/unit/newsApiRateLimit.test.ts
```

期待: **全 PASS**

### 手順 4 — 12時間プリフライト（既存スクリプト）

```powershell
npm run verify:twelve-hour-preflight
```

期待: `docs/review/TWELVE_HOUR_TEST_PREFLIGHT_REPORT.md` が **PASS**（WARN は内容を確認）。

### 手順 5 — API 疎通（推奨）

```powershell
npm run verify:twelve-hour-api-audit
```

期待: 各 API プロバイダが応答（`.env` 必須）。

### 手順 6 — Metro 起動（別ターミナル・ログ保存推奨）

```powershell
# ログ保存付き起動（提案コマンド — §F 参照）
npm run start:clear
```

期待: `Metro waiting on exp://...`、ポート **8081** LISTEN。

### 手順 7 — 実機接続確認

```powershell
adb devices -l
adb reverse tcp:8081 tcp:8081
adb shell dumpsys battery | findstr level
```

期待:

- `device` 1台以上
- バッテリー **level: 100**（または 90+）
- アプリが起動し、Metro に接続済み

**開発ビルド起動例:**

```powershell
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
npx expo run:android
```

### 手順 8 — ログ保存開始 + 開始時刻記録

```powershell
$RUN_ID = Get-Date -Format "yyyy-MM-ddTHHmm"
$LOG_DIR = "docs/review/twelve-hour-run/$RUN_ID"
New-Item -ItemType Directory -Force -Path $LOG_DIR
@{
  startedAt = (Get-Date).ToString("o")
  commit    = (git rev-parse HEAD)
  device    = "Xiaomi Redmi Note 13 Pro 5G"
  hours     = 12
} | ConvertTo-Json | Set-Content "$LOG_DIR/start.json"
Write-Host "TEST START: $(Get-Content $LOG_DIR/start.json)"
```

### 手順 9 — 12時間テスト本体開始

```powershell
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
$env:PHASE12_5_HOURS="12"
npm run verify:phase12-5
```

期待: `docs/review/PHASE12_5_LONG_RUN_REPORT.md` と `docs/review/phase12-5-long-run/` が更新される。

**短縮ドライラン（事前確認・約15分）:**

```powershell
$env:PHASE12_5_HOURS="0.25"
npm run verify:phase12-5
```

---

## D. テスト中に触ってはいけないこと

- スマホ画面の **手動操作**（ホーム / タスクキル / スワイプ終了）
- **USB 抜き差し**（Wi-Fi adb 未設定時）
- PC の **スリープ・再起動・サインアウト**
- Metro ターミナルの **Ctrl+C**
- `npm run kill:metro` の実行
- ルーター / VPN / Wi-Fi の **切り替え**
- 端末の **再起動・OS アップデート**
- 充電器の **抜き差し**（やむを得ない場合は `start.json` にメモ）

---

## E. 途中停止時の確認項目

停止を検知したら **すぐ** 以下を記録（電源が落ちる前に）。

| 順 | 確認 | コマンド / 場所 |
|----|------|-----------------|
| 1 | 停止時刻 | `Get-Date -Format o` → `end.json` に保存 |
| 2 | スマホ電源 | 画面応答あるか、充電ランプか |
| 3 | adb 生存 | `adb devices` — `unauthorized` / 空 lista |
| 4 | アプリプロセス | `adb shell pidof com.assistant.stocktrading` |
| 5 | Metro | PC ターミナルが生きているか |
| 6 | Wi-Fi | 端末設定 or `adb shell dumpsys wifi \| findstr "Wi-Fi is"` |
| 7 | logcat 末尾 | `adb logcat -d -t 200 > docs/review/twelve-hour-run/<RUN_ID>/logcat-snapshot.txt` |
| 8 | phase12-5 checkpoint | `docs/review/phase12-5-long-run/checkpoint.json` |
| 9 | 12H 監視 | logcat で `[12H-MONITOR]` 最終行の時刻 |

### 停止原因の切り分け早見表

| 観測 | 有力な原因 |
|------|-----------|
| adb ごと消えた | 端末電源オフ / USB 緩み / Wi-Fi adb 切断 |
| adb はあるが pid なし | アプリ BG キル / クラッシュ |
| logcat に `FATAL EXCEPTION` | アプリクラッシュ |
| Metro が止まった | PC スリープ / 手動停止 / Node クラッシュ |
| `[12H-MONITOR]` が3分以上途切れ | OS スリープ / Doze |
| API のみ stale | キー期限 / レート制限 / ネットワーク |

---

## F. ログ保存体制

### F-1. 推奨ディレクトリ構成

```
docs/review/twelve-hour-run/<RUN_ID>/
  start.json              # 開始時刻・commit・端末名
  end.json                # 終了/停止時刻・手動メモ（任意）
  metro.log               # Metro 標準出力（Tee-Object）
  logcat.log              # リアルタイム logcat（Tee-Object）
  phase12-5-runner.log    # verify:phase12-5 の PC 側出力
```

**既存スクリプト出力（自動）:**

```
docs/review/phase12-5-long-run/
  telemetry.jsonl         # 1分 tick・メモリ等
  checkpoint.json         # 途中経過
  logcat-final.txt        # 終了時 logcat ダンプ
  meminfo-*.txt           # メモリスナップショット
  *.xml, *.png            # UI / AI 画面証跡

docs/review/PHASE12_5_LONG_RUN_REPORT.md   # サマリレポート
docs/review/TWELVE_HOUR_TEST_PREFLIGHT_REPORT.md
```

### F-2. 提案コマンド（新規 script なし・手動実行）

**ターミナル A — Metro + ログ**

```powershell
$RUN_ID = Get-Date -Format "yyyy-MM-ddTHHmm"
$LOG_DIR = "docs/review/twelve-hour-run/$RUN_ID"
New-Item -ItemType Directory -Force -Path $LOG_DIR | Out-Null
npm run start:clear 2>&1 | Tee-Object -FilePath "$LOG_DIR/metro.log"
```

**ターミナル B — adb logcat + ログ**

```powershell
# $RUN_ID / $LOG_DIR はターミナル A と同じ値に揃える
adb logcat -c
adb logcat -v threadtime ReactNativeJS:* AndroidRuntime:E ActivityManager:I *:S 2>&1 `
  | Tee-Object -FilePath "$LOG_DIR/logcat.log"
```

**ターミナル C — テスト本体**

```powershell
$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"
$env:PHASE12_5_HOURS="12"
npm run verify:phase12-5 2>&1 | Tee-Object -FilePath "$LOG_DIR/phase12-5-runner.log"
```

**終了後 — ログ場所表示**

```powershell
Write-Host "=== 12h test logs ==="
Write-Host "Run dir:    $LOG_DIR"
Write-Host "Phase12.5:  docs/review/phase12-5-long-run/"
Write-Host "Report:     docs/review/PHASE12_5_LONG_RUN_REPORT.md"
Get-ChildItem $LOG_DIR | Format-Table Name, Length, LastWriteTime
```

### F-3. 将来の簡易 script 案（未実装・提案のみ）

| 案 | 役割 |
|----|------|
| `scripts/twelve-hour-start-logging.ps1` | `$RUN_ID` 作成、`start.json`、logcat/Metro の Tee 起動手順を表示 |
| `scripts/twelve-hour-collect-logs.ps1` | 停止時 snapshot + パス一覧出力 |
| `package.json` の `verify:twelve-hour-run` | preflight → phase12-5 を順実行しログ dir を引き継ぎ |

> **方針:** 上記は **提案のみ**。既存 `phase12-5-long-run.mjs` / `twelve-hour-test-preflight-verify.ts` を壊さない。

---

## G. 終了後に保存するログ一覧

| 優先度 | ファイル / ディレクトリ |
|--------|-------------------------|
| 必須 | `docs/review/PHASE12_5_LONG_RUN_REPORT.md` |
| 必須 | `docs/review/phase12-5-long-run/telemetry.jsonl` |
| 必須 | `docs/review/phase12-5-long-run/logcat-final.txt` |
| 必須 | `docs/review/phase12-5-long-run/checkpoint.json` |
| 必須 | `docs/review/twelve-hour-run/<RUN_ID>/start.json` |
| 推奨 | `docs/review/twelve-hour-run/<RUN_ID>/logcat.log` |
| 推奨 | `docs/review/twelve-hour-run/<RUN_ID>/metro.log` |
| 推奨 | `docs/review/twelve-hour-run/<RUN_ID>/phase12-5-runner.log` |
| 任意 | `docs/review/TWELVE_HOUR_TEST_PREFLIGHT_REPORT.md` |
| 任意 | `docs/review/twelve-hour-run/<RUN_ID>/end.json`（停止理由メモ） |

---

## H. PASS / FAIL 判定基準

### テスト開始可否（プリフライト）

| 条件 | 判定 |
|------|------|
| 本チェックリスト A・B がすべて ☐ | 開始可 |
| `npm run typecheck` PASS | 開始可 |
| `twelveHourTestMonitor` 等 unit test PASS | 開始可 |
| `verify:twelve-hour-preflight` FAIL 0 | 開始可 |
| `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` 未設定 | **WARN** — 監視ログが弱くなる |
| adb 未接続 | **FAIL** — `phase12-5` 自動操作不可 |
| バッテリー 90% 未満・充電なし | **FAIL** |

### 12時間テスト完了（本番）

| 条件 | 判定 |
|------|------|
| `PHASE12_5_HOURS=12` が最後まで完走 | **PASS** |
| `PHASE12_5_LONG_RUN_REPORT.md` で致命的クラッシュ 0 | **PASS** |
| `pidLostEvents` / `fatal` が許容閾値内 | レポート記載どおり |
| 12時間前に Metro / adb / 充電が切れた | **FAIL**（環境要因） |
| API が30分以上全面停止 | **FAIL** または **WARN**（レポートで判断） |

---

## I. 未対応リスク（本準備時点）

| リスク | 説明 | 緩和策 |
|--------|------|--------|
| MIUI の強制 BG キル | 機種・OS パッチで挙動が変わる | バッテリー制限なし + 自動起動 + 充電中スリープ無効 |
| Expo Go の制限 | Go は本番ビルドより BG で殺されやすい | **開発ビルド推奨**（`expo run:android`） |
| USB 抜き後の adb 切断 | Wi-Fi adb 未設定だと phase12-5 停止 | `wifi-adb-verify.ps1` 事前実施 or USB 常時接続 |
| PC スリープ | Metro 停止 → JS バンドル更新不可 | 電源設定 + 充電中は PC もスリープ無効 |
| ルーター再起動 | 夜間のメンテナンス | 固定 IP / 2.4GHz 安定 SSID |
| 端末発熱 | スロットリング・充電停止 | ケース外し・換気・直射日光を避ける |
| ログディスク容量 | logcat が GB 級になりうる | `*:S` フィルタ付き logcat（§F-2 参照） |
| `twelve-hour-run/` 未 gitignore | ログが repo を汚す | テスト後はコミットしない / 必要なら `.gitignore` 追加は別タスク |

---

## J. 関連既存コマンド一覧

| コマンド | 用途 |
|----------|------|
| `npm run verify:twelve-hour-preflight` | 開始前 9 項目検証 |
| `npm run verify:twelve-hour-api-audit` | API キー疎通 |
| `npm run verify:phase12-5` | 12時間オーケストレーション |
| `npm run verify:device-live-api-audit` | 実機 API 監査（短時間） |
| `npm run start:clear` | Metro（キャッシュクリア） |
| `npm run kill:metro` | ポート 8081 解放（**テスト中は使わない**） |
| `scripts/wifi-adb-verify.ps1` | Wi-Fi adb 切替検証 |

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-06-02 | 初版作成（12時間テスト本番前準備） |
