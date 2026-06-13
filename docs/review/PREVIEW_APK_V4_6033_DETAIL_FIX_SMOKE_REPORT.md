# Preview APK v4 — 6033 Petronas Gas Detail Fix & Smoke Report

## 実施概要

| 項目 | 値 |
|------|-----|
| 実施日時 (UTC) | 2026-06-13T07:16–07:35 |
| 実施日時 (JST) | 2026-06-13 16:16–16:35 |
| build id | `bc841f30-cded-4695-9bd0-76be9c689b07` |
| versionCode | 4 |
| package | `com.assistant.stocktrading` |
| device | `FYRWXSNNAIOR9DCM` (23090RA98G) |
| runtime mode | `PHASE12_5_RUNTIME_MODE=apk` |
| Metro | LISTENING なし (8081 未使用) |

## 前回結果

- v4 install smoke: **5/6 PASS** (exit 1)
- 唯一 FAIL: **6033 Petronas Gas** — card found → `detail_not_visible` (retry 後も FAIL)
- 1295 Public Bank: PASS 維持

## 6033 失敗原因

### 1. 検索・カード選択 (v4 初回 smoke)

- query `Petronas` だと **Petronas Gas Berhad (6033)** と **Petronas Chemicals Group (5183)** の2カードが同時ヒット
- `cardExclude: ['Chemicals']` のみでは ticker 行の誤タップリスクが残る
- 優先 query を `Petronas Gas` に変更し Chemicals 系を card/detail 両方で除外する必要があった

### 2. detail 待機中の foreground 喪失 (主因)

- UI dump 解析 (`ui-dump-detail-6033-20260613-150628.xml` 等):
  - 一時的に **PETRONAS GAS BERHAD / AI四季報 / 会社名** が表示され detail は正しくロードしていた
- 最終 fail dump (`detail-fail-6033.png` 対応):
  - **Grab** (`com.grabtaxi.passenger`) または **launcher** (`com.teslacoilsw.launcher`) が foreground を奪取
- 旧 `waitForStockDetail` は foreign foreground 検出時に **即 FAIL** していたため、detail visible 判定前に `detail_not_visible` / `wrong_foreground_detail` になっていた

### 3. 6033 単体再試行 1 回目の card not found (副次)

- `ui-dump-search-pre-6033-q0-20260613-151750.xml` に **APIキー未設定** ダイアログ (`了解` ボタン) が表示
- screener 検索フィールドに到達できず全 query が card not found
- `dismissOverlayDialogs` で `了解` を追加 dismiss することで解消

## 解析したファイル

- `docs/review/phase12-5-long-run/detail-fail-6033.png`
- `docs/review/phase12-5-long-run/smoke-v4-install-run.log`
- `docs/review/phase12-5-long-run/ui-dump-detail-6033-20260613-150628.xml`
- `docs/review/phase12-5-long-run/ui-dump-detail-fail-6033-20260613-150717.xml`
- `docs/review/phase12-5-long-run/ui-dump-search-pre-6033-q0-20260613-151750.xml`
- `docs/review/phase12-5-long-run/smoke-6033-only-run.log`
- `docs/review/phase12-5-long-run/smoke-6033-only-run2.log`
- `docs/review/phase12-5-long-run/smoke-v4-6033-fix-run.log`

## 修正ファイル

| ファイル | 変更内容 |
|----------|----------|
| `scripts/lib/phase12-5-device-ui.mjs` | `resolveDetailWaitMs`, `isExcludedDetailXml`, detail 判定強化, `ensurePortrait` 修復, code ticker 行は `cardMustInclude` 免除 |
| `scripts/phase12-5-long-run.mjs` | 6033 STOCK 設定, foreground 復帰付き `waitForStockDetail`, `dismissOverlayDialogs`, `PHASE12_5_STOCK_CODE` フィルタ, fail artifact 拡充 |
| `tests/unit/phase12-5DeviceUi.test.ts` | 6033 query / card / detail テスト追加 |

## query 順変更 (6033)

| 順 | 変更前 | 変更後 |
|----|--------|--------|
| 1 | Petronas (query) | **Petronas Gas** |
| 2 | Petronas Gas (alias) | **PETGAS** |
| 3 | PETGAS (alias) | **Petronas** |

## cardMustInclude / cardExclude 変更 (6033)

**cardMustInclude:** `['Gas']` (維持、code ticker 行 `6033 · …` は免除)

**cardExclude (拡張):**

- Chemicals
- Dagangan
- IHH
- Healthcare
- 5183

**cardNames 追加:**

- Petronas Gas Berhad
- PETRONAS GAS
- PETRONAS GAS BERHAD

## detail 判定強化

- `detailExclude`: Petronas Chemicals, 5183, Chemicals, Dagangan, IHH, Healthcare
- `detailWaitMs`: **45_000 ms**
- `isStockDetailVisible`: detailExclude 先行チェック、code+name、AI四季報+会社名 fallback
- `isWrongStockDetail`: excluded detail を即 wrong 判定
- wrong detail → back → 別 tap target / whole verify retry (既存フロー)

## foreground 復帰強化

- `waitForStockDetail`: foreign foreground 検出時 **最大3回** `safeEnsureAppForeground` で復帰し polling 継続 (即 FAIL しない)
- `dismissOverlayDialogs`: `了解` / スキップ / 閉じる / OK / 後で — screener 前後と ensureAppForeground で実行
- fail 時 artifact: screenshot + UI dump + `detail-fail-{code}-focus.txt` + `detail-fail-{code}-tap.txt`

## 6033 単体 smoke 結果

### 1 回目 (dialog 未 dismiss)

- 結果: **FAIL** (card not found)
- 原因: APIキー未設定ダイアログ
- log: `smoke-6033-only-run.log`

### 2 回目 (修正後)

- 結果: **PASS**
- query: `Petronas Gas` (1 query で card+detail OK)
- tapLabel: `Petronas Gas`
- exit code: **0**
- log: `smoke-6033-only-run2.log`

## 6/6 smoke 再確認結果

- 実行: `node scripts/phase12-5-long-run.mjs` (PHASE12_5_SMOKE=1, HOURS=0.25, apk mode)
- 結果: **6/6 PASS**
- runner exit code: **0**
- log: `smoke-v4-6033-fix-run.log`
- elapsed: ~567 s

### 各銘柄結果

| code | label | query (winning) | card | detail | ok |
|------|-------|-----------------|------|--------|-----|
| 1155 | Maybank | Malayan Banking | found | visible | PASS |
| 1023 | CIMB | CIMB | found | visible | PASS |
| 1295 | Public Bank | Public Bank | found | visible | PASS |
| 5347 | Tenaga | Tenaga | found | visible | PASS |
| 4707 | Nestle | Nestle | found | visible | PASS |
| 6033 | Petronas Gas | Petronas Gas | found | visible | PASS |

### price_refresh

- tag: `h0-m0`
- ok: **true**
- hasError: **false**

### [12H-MONITOR]

- monitorLineCount: 2 (logcat delta スキャン範囲内)
- heartbeat / app_state 確認済み
- 初回 v4 smoke の 23 行は長時間稼働 log 由来; 今回 smoke 短時間実行のため行数は少ない

### Could not load bundle

- **なし** (`bundleError: false`)

### FATAL / ANR

- fatal: **0**
- anr: **0**
- rnTypeError: **0**
- undefined: **0**

### foreground

- 終了時: `com.assistant.stocktrading`
- pid: 9131

## typecheck / unit test

| チェック | 結果 |
|----------|------|
| `npm run typecheck` | **PASS** |
| phase12-5RuntimeMode.test.ts | 12/12 PASS |
| phase12-5DeviceUi.test.ts | 11/11 PASS |
| phase12-5InvalidDetectors.test.ts | 15/15 PASS |

## 未実施項目 (意図的)

- 2〜3h 短期テスト: **未開始**
- 12h 本番: **未開始**
- Metro 起動: **なし**
- git add / commit / push: **未実施**

## 次の作業

1. 6/6 PASS を commit 保存 (ユーザー指示後)
2. logcat ローテート
3. pre-run-watch / watchdog 準備
4. 2〜3h 短期テスト開始判断
5. 短期テスト PASS 後 → 12h 本番

---

*Report generated after 6033 detail fix verification on preview APK v4.*
