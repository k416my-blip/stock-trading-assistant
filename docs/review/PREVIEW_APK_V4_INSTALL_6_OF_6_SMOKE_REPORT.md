# Preview APK v4 Install + 6/6 Smoke Report

## 実施時刻

- 開始: 2026-06-13 14:56 JST 頃（UTC 06:56）
- smoke 完了: 2026-06-13 15:08 JST（UTC 07:08）
- 状態: **v4 install 成功 · smoke 5/6 PASS**

## Build / APK

| 項目 | 値 |
|------|-----|
| build id | `bc841f30-cded-4695-9bd0-76be9c689b07` |
| build commit | `852209885a7176f8272bb0c9cbb2f26277064293` |
| artifact URL | https://expo.dev/artifacts/eas/4reb1fMHE1OJfxKKA2wsRh9MVDCyXBFUsducIBfRQfU.apk |
| 保存パス | `artifacts/preview-v4.apk` |
| ファイルサイズ | 80,746,666 bytes（≈77.0 MiB） |
| 拡張子 | `.apk` |

## 1. ADB 接続

| チェック | 結果 |
|----------|------|
| `adb devices -l` | ✅ `FYRWXSNNAIOR9DCM device`（Xiaomi 23090RA98G / zircon） |
| unauthorized / offline | なし |

## 2. Metro なし確認

```text
netstat -ano | findstr ":8081"
→ 該当なし（LISTENING なし）
```

Metro は起動していません。

## 3. Install 結果

```text
adb install -r artifacts/preview-v4.apk
→ Success
```

| 項目 | 結果 |
|------|------|
| install | ✅ **成功**（v3 上書き） |
| エラー | なし |

## 4. Package / versionCode

| 項目 | 値 |
|------|-----|
| package | `com.assistant.stocktrading` ✅ |
| versionCode | **4** ✅ |

## 5. Cold launch

| 項目 | 結果 |
|------|------|
| force-stop → start MainActivity | ✅ |
| PID | **9131** |
| 即 crash | なし |
| 白画面停止 | なし |

## 6. Logcat（起動直後 + smoke 内）

| チェック | 結果 |
|----------|------|
| `[12H-MONITOR] heartbeat` | ✅ smoke 内 **23 行**（`monitorSample` に heartbeat / app_state 確認） |
| Could not load bundle | **なし**（`bundleError: false`） |
| FATAL EXCEPTION | **0** |
| ANR | **0** |

起動直後 8 秒 window では MONITOR 行は未出力（smoke 実行中に heartbeat 確認）。

## 7. 6 銘柄 smoke 結果

| 項目 | 値 |
|------|-----|
| コマンド | `PHASE12_5_RUNTIME_MODE=apk PHASE12_5_SMOKE=1 PHASE12_5_HOURS=0.25 node scripts/phase12-5-long-run.mjs` |
| **PASS 数** | **5 / 6** |
| runner exit code | **1** |
| price_refresh | ✅ ok |
| bundleError | false |
| FATAL / ANR | 0 / 0 |
| 終了時 foreground | `com.assistant.stocktrading` |
| PID | 9131 |
| ログ | `docs/review/phase12-5-long-run/smoke-v4-install-run.log` |

### 各銘柄

| code | label | 結果 | winning query | tapLabel | 備考 |
|------|-------|------|---------------|----------|------|
| 1155 | Maybank | **PASS** | Malayan Banking | 1155 · バルサ・マレーシア | |
| 1023 | CIMB | **PASS** | CIMB | 1023 · バルサ・マレーシア | |
| 1295 | Public Bank | **PASS** | Public Bank | **1295 · バルサ・マレーシア** | v4 catalog 正 symbol 確認 ✅ |
| 5347 | Tenaga | **PASS** | Tenaga | 5347 · バルサ・マレーシア | |
| 4707 | Nestle | **PASS** | Nestle | Nestle | |
| 6033 | Petronas Gas | **FAIL** | Petronas | — | card ✅ · detail ❌ · retry 後も `detail_not_visible` |

### 1295 Public Bank（v4 重点確認）

- カード表示: **1295 · バルサ・マレーシア**（v3 の誤 5225 ではなく正 code）
- 詳細遷移: ✅ visible
- IHH 誤遷移: なし

### 6033 Petronas Gas（v4 重点確認）

- 検索 query: `Petronas` → card found ✅
- 詳細: ❌ `detail_not_visible`（attempt 0 + whole verify retry attempt 1）
- 失敗記録: `docs/review/phase12-5-long-run/detail-fail-6033.png`
- smoke 中 WARN: launcher focus 奪取（6033 retry 時）

### smoke 中 WARN（参考）

- `com.teslacoilsw.launcher` — openScreenerMalaysia 中（1155 / 6033 retry）
- `com.grabtaxi.passenger` — price_refresh 前（ensureAppForeground が復帰 · price_refresh は ok）

## 8. v3 vs v4 smoke 比較

| 指標 | v3 smoke | v4 smoke |
|------|----------|----------|
| PASS | 6/6 | **5/6** |
| 1295 tapLabel | Public Bank / 5225 系 | **1295 · バルサ** ✅ |
| 6033 | PASS（runner のみ） | **FAIL** detail |

## 9. 未実施確認

| 項目 | 状態 |
|------|------|
| 2〜3h 短期テスト | ❌ **未開始** |
| 12h 本番 | ❌ **未開始** |
| git add / commit / push | ❌ **未実施** |

## 10. 次の作業

### 6033 FAIL 対応（2〜3h 前）

1. `detail-fail-6033.png` / UI dump 解析 — detail 待機延長 or tap target 調整
2. v4 上で 6033 単体 smoke 再試行
3. **6/6 PASS** 確認後:
   - logcat ローテート
   - pre-run-watch / watchdog
   - **2〜3h 短期テスト**（ユーザー承認後）

### 1295

- v4 catalog + runner で **PASS 確認済み** — 追加対応不要
