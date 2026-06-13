# Phase12.5 Preview APK — Stock Search Runner Hardening Report

## 実施時刻

- 開始: 2026-06-13 13:09 JST 頃（UTC 05:09）
- smoke 再実行（hardening v2）完了: 2026-06-13 13:27 JST 頃（UTC 05:27）
- 状態: **runner 修正完了 · smoke 部分 PASS（1/6）**

## ビルド / APK

| 項目 | 値 |
|------|-----|
| build id | `c961d709-0fd5-4faa-8200-0fd85fdeddc1` |
| APK | `preview-v3.apk` |
| package | `com.assistant.stocktrading` |
| versionCode | **3** |

## 1. ADB 再接続結果

| チェック | 結果 |
|----------|------|
| `adb devices -l` | ✅ `FYRWXSNNAIOR9DCM device` |
| unauthorized / offline | なし |
| 初回 `mCurrentFocus` | `com.miui.home`（ランチャー）→ `monkey -p com.assistant.stocktrading 1` で復帰 |
| smoke 中 PID | `15013` 維持 |
| smoke 終了時 foreground | ✅ `com.assistant.stocktrading` |

## 2. 回転ロック

```text
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 0
```

- smoke 中 UI dump は `rotation="0"`（縦向き）
- 横向き座標ずれ（WhatsApp 奪取時の rotation=3 問題）は再発せず

## 3. 原因整理

| 原因 | 内容 |
|------|------|
| WhatsApp / ランチャー focus 奪取 | ADB 入力が別アプリへ流れた。`openScreenerMalaysia` 中に `com.teslacoilsw.launcher` を検出（WARN ログ） |
| 数値コード全角化 | `input text 1155` → 検索欄 `１１５５` → 0件 |
| code 検索前提 | 旧 `verifyStockDevice` が `input text ${stock.code}` + ホームタブ固定座標 |
| 詳細画面ロード不足 | カードタップ後 AI四季報ロード中（8秒では不足）→ `visible: false` |
| screener API 揺らぎ | 名称検索でも Maybank / Nestle 等が 0件になるケースあり（retry 後も失敗） |

## 4. 修正ファイル

| ファイル | 変更 |
|----------|------|
| `scripts/lib/phase12-5-device-ui.mjs` | **新規** — foreground guard / portrait / name search helpers |
| `scripts/phase12-5-long-run.mjs` | `verifyStockDevice` 全面刷新、smoke 拡張、STOCKS query 追加 |
| `tests/unit/phase12-5DeviceUi.test.ts` | **新規** — 純関数ユニットテスト |

## 5. STOCKS query 追加

| code | label | query（検索入力） |
|------|-------|-------------------|
| 1155 | Maybank | `Maybank` |
| 1023 | CIMB | `CIMB` |
| 1295 | Public Bank | `Public` |
| 5347 | Tenaga | `Tenaga` |
| 4707 | Nestle | `Nestle` |
| 6033 | Petronas Gas | `Petronas Gas` |

## 6. verifyStockDevice 修正内容

1. `wakeDevice()` + `requireStockForeground()` — 各操作前に package 確認
2. `openScreenerMalaysia()` — 銘柄検索タブ → マレーシア市場フィルタ
3. `performStockSearch()` — 検索欄 clear → `safeInputText(stock.query)` → 10秒待機 → 0件時 **1回 retry**
4. `findStockSearchCards()` — code / query / label + `·` 形式カード判定
5. `waitForStockDetail()` — 最大22秒ポーリング（「取得中」ProgressBar 対応）
6. 失敗時 `recordStockVerifyFailure()` — UI dump + screenshot + foreground 記録
7. タブ scroll 上限: **4回**（旧 8回 / setup 25回ループを回避）

## 7. foreground guard / input 安全化

| 関数 | 役割 |
|------|------|
| `safeEnsureAppForeground()` | focus 不一致時 `monkey` + `am start`、再確認 |
| `safeInputText()` | input 前後の focus 確認 + Latin IME |
| `clearSearchField()` | DEL keyevent ×16 |
| `dumpCurrentFocus()` | `mCurrentFocus` package 記録 |
| `ensurePortrait()` | accelerometer_rotation / user_rotation 0 |
| `requireStockForeground()` | runner 側ラッパー + telemetry |

- 別アプリ focus 時は **入力を続けず** WARN/FAIL
- 数値コード検索は **デフォルト不使用**（名称 query のみ）

## 8. smoke 再実行結果

### 環境

```powershell
$env:PHASE12_5_RUNTIME_MODE = "apk"
$env:PHASE12_5_SMOKE = "1"
$env:PHASE12_5_HOURS = "0.25"
node scripts/phase12-5-long-run.mjs
```

- Metro: **未起動**（`:8081` LISTENING なし）
- ログ: `docs/review/phase12-5-long-run/smoke-hardening-run2.log`

### 6銘柄 card / detail 結果（run2 · 最終）

| code | 銘柄 | 結果 | 備考 |
|------|------|------|------|
| 1155 | Maybank | ❌ FAIL | card not found（retry 後も 0件） |
| 1023 | CIMB | ✅ **PASS** | card found + detail visible |
| 1295 | Public Bank | ❌ FAIL | card not found（query=Public） |
| 5347 | Tenaga | ❌ FAIL | card found も detail visible=false（launcher focus WARN） |
| 4707 | Nestle | ❌ FAIL | card not found |
| 6033 | Petronas Gas | ❌ FAIL | card not found |

**smoke 総合: FAIL（1/6 PASS）**

| 項目 | 結果 |
|------|------|
| runner exit code | **1** |
| price_update | ✅ `runPriceRefresh h0-m0` ok=true |
| [12H-MONITOR] | ✅ 24 lines（heartbeat / news_fetch サンプルあり） |
| Could not load bundle | なし |
| FATAL / ANR | 0 / 0 |
| foreground 終了時 | com.assistant.stocktrading |

### run1 → run2 改善

- run1: 0/6 PASS（detail 待機不足で 1023 も visible=false）
- run2: **1023 CIMB PASS** — 名称検索 + detail wait が有効

## 9. 検証

| チェック | 結果 |
|----------|------|
| `npm run typecheck` | ✅ PASS |
| `phase12-5RuntimeMode.test.ts` | ✅ 12/12 |
| `phase12-5InvalidDetectors.test.ts` | ✅ 15/15 |
| `phase12-5DeviceUi.test.ts` | ✅ 5/5 |

## 10. 未実施（遵守）

- ❌ 2〜3h 短期テスト: **未開始**
- ❌ 12h 本番: **未開始**
- ❌ git add / commit / push: **未実施**
- ❌ Metro 起動: **なし**

## 11. 次の作業

### FAIL 残原因と次アクション

1. **端末データ setup 再開** — 1155 以外 5 銘柄をポートフォリオ/ウォッチリストへ（1023 は screener 検索 PASS 済み）
2. **query 微調整** — 6033: `Petronas Gas` → `Petronas`、1295: `Public Bank`（%s）再試行
3. **5347** — verify 中 launcher focus WARN; `requireStockForeground` 失敗時は当該銘柄を skip せず即 relaunch して retry
4. **Maybank / Nestle 0件** — KLSE screener API / ネットワーク確認（runner 側は retry 済み）
5. **6/6 PASS 後** → commit 保存 → logcat ローテート → pre-run-watch/watchdog → **2〜3h 短期テスト**

---

**サマリー**

| 項目 | 結果 |
|------|------|
| ADB 再接続 | ✅ |
| runner 修正 | ✅ |
| 6銘柄 smoke | ❌ FAIL（**1/6**: 1023 CIMB のみ PASS） |
| runner exit code | 1 |
| typecheck | PASS |
| 2〜3h / 12h | 未開始 |

**レポート保存パス:** `docs/review/PHASE12_5_PREVIEW_APK_STOCK_SEARCH_HARDENING_REPORT.md`
