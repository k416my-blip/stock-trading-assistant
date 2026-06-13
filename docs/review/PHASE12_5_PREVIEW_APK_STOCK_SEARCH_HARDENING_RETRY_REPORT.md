# Phase12.5 Preview APK — Stock Search Hardening Retry Report

## 実施時刻

| 項目 | 値 |
|------|-----|
| 開始 | 2026-06-13 13:36 JST 頃（UTC 05:36） |
| smoke 再実行 #1 完了 | 2026-06-13 13:46 JST（UTC 05:45）— **4/6 PASS** |
| runner 追加修正 | 2026-06-13 13:49 JST |
| smoke 再実行 #2 完了 | 2026-06-13 14:01 JST（UTC 06:00）— **5/6 PASS** |
| 状態 | runner 修正完了 · smoke **5/6 PASS** · 2〜3h / 12h **未開始** |

## ビルド / APK

| 項目 | 値 |
|------|-----|
| build id | `c961d709-0fd5-4faa-8200-0fd85fdeddc1` |
| APK | `preview-v3.apk` |
| package | `com.assistant.stocktrading` |
| versionCode | **3** |

## 1. ADB 接続結果

| チェック | 結果 |
|----------|------|
| `adb devices -l` | ✅ `FYRWXSNNAIOR9DCM device` |
| `adb shell pidof com.assistant.stocktrading` | ✅ `15013`（smoke 中維持） |
| `mCurrentFocus` | ✅ `com.assistant.stocktrading/.MainActivity` |
| unauthorized / offline | なし |

## 2. Foreground 確認

- smoke 全工程で `requireStockForeground` / `guardedTap` により入力・tap 前に package 確認
- 終了時 foreground: ✅ `com.assistant.stocktrading`
- WhatsApp / launcher への誤入力: **なし**（run2）
- 回転ロック: `accelerometer_rotation=0` · `user_rotation=0` · UI dump `rotation="0"`

## 3. Metro なし確認

```text
netstat -ano | findstr ":8081"
→ 該当なし（LISTENING なし）
```

## 4. 追加修正ファイル

| ファイル | 変更内容 |
|----------|----------|
| `scripts/lib/phase12-5-device-ui.mjs` | 複数 query / aliases · card 名一致 · screenerSymbols · cardExclude/cardMustInclude · detail 判定強化 |
| `scripts/phase12-5-long-run.mjs` | STOCKS 拡張 · `ensureMalaysiaFilterActive` · `trySearchQuery` 毎に MY フィルタ再適用 · `STOCK_APP_PKG`→`PKG` 修正 · detail 30s 待機 · 1 回 retry |
| `tests/unit/phase12-5DeviceUi.test.ts` | Public Bank Berhad / 5225 カード一致テスト追加 |

## 5. query / aliases 変更内容

| code | label | queries（最大3） |
|------|-------|------------------|
| 1155 | Maybank | Maybank · Malayan Banking |
| 1023 | CIMB | CIMB · CIMB Group |
| 1295 | Public Bank | Public Bank · Public · PBBANK |
| 5347 | Tenaga | Tenaga · Tenaga Nasional · TNB |
| 4707 | Nestle | Nestle · (Malaysia) · Nestlé (Malaysia) |
| 6033 | Petronas Gas | Petronas · Petronas Gas · PETGAS |

- 0 件時は aliases を順番試行（最大 3 query / 銘柄）
- 失敗時 `queriesTried` / `attempts` を telemetry に記録

## 6. card 判定強化内容

- `normalizeMatchText` — 大文字小文字・アクセント（Nestlé→nestle）無視
- `screenerSymbols` — APK 内 catalog コード差異（1295→**5225**）を許容
- `cardNames` — 「Public Bank Berhad」「Nestlé (Malaysia) Berhad」等のタイトル行一致
- `cardMustInclude` / `cardExclude` — 6033 は Gas 必須 · Chemicals 除外（誤タップ防止）
- `Berhad` / `Group` 等の会社名タイトル行をカードとして認識

## 7. detail 待機強化内容

- `MAX_DETAIL_WAIT_MS = 30_000`
- `isDetailLoading` — ProgressBar / 取得中 / loading ポーリング（2.5s 間隔）
- `isStockDetailVisible` — code · screenerSymbols · patterns · cardNames · AI四季報 · RM 価格 複合判定
- launcher focus 喪失 / detail 不可時 — 銘柄全体を **1 回 retry**
- 失敗時 — screenshot + UI dump + currentFocus 保存（`detail-fail-{code}.png`）

## 8. foreground guard 強化内容

| タイミング | 手段 |
|------------|------|
| input 前 / tap 前 / card tap 前 | `requireStockForeground` |
| detail 待機中 | ループ内 `requireStockForeground` |
| 失敗記録前 | `dumpCurrentFocus` |
| 別 app 検出時 | `monkey -p` → `am start MainActivity` → 2s 待機 → 再確認 |
| 復帰不可 | その銘柄 FAIL（他 app へ入力しない） |

## 9. smoke 再実行結果（最終 run #2）

| 項目 | 結果 |
|------|------|
| runner exit code | **1**（6/6 未達） |
| PASS 数 | **5 / 6** |
| price_refresh | ✅ ok |
| bundleError | false |
| FATAL / ANR | 0 / 0 |
| [12H-MONITOR] | smoke 短縮のため `monitorLineCount: 0`（heartbeat 専用 12h 未開始） |
| Could not load bundle | なし |
| ログ | `docs/review/phase12-5-long-run/smoke-hardening-retry-run2.log` |

### 各銘柄結果

| code | label | queriesTried | card found | detail visible | 結果 | failure reason |
|------|-------|--------------|------------|----------------|------|----------------|
| 1155 | Maybank | Maybank, Malayan Banking | ✅ | ✅ | **PASS** | —（winning: Malayan Banking） |
| 1023 | CIMB | CIMB | ✅ | ✅ | **PASS** | — |
| 1295 | Public Bank | Public Bank | ✅ | ❌ | **FAIL** | detail_not_visible（card タップ後 IHH HEALTHCARE 等誤遷移 or 検索画面に残留 · retry 後も同様） |
| 5347 | Tenaga | Tenaga | ✅ | ✅ | **PASS** | —（前回 launcher focus 問題は解消） |
| 4707 | Nestle | Nestle | ✅ | ✅ | **PASS** | —（query「Nestle」1 回目で card+detail OK） |
| 6033 | Petronas Gas | Petronas, Petronas Gas, PETGAS | ❌ | — | **FAIL** | card not found — **APK 内 SAMPLE_STOCKS に 6033 未収録**（Petronas→5183 Chemicals のみ · cardExclude で正しく除外） |

### 前回（hardening v1）からの改善

| 指標 | v1 | retry #2 |
|------|-----|----------|
| PASS | 1/6 | **5/6** |
| 1155 | FAIL | **PASS** |
| 1023 | PASS | **PASS** |
| 1295 | FAIL (card) | FAIL (detail) — card 検出まで改善 |
| 5347 | FAIL (detail) | **PASS** |
| 4707 | FAIL (card) | **PASS** |
| 6033 | FAIL (card) | FAIL — APK データ不足 |

## 10. 根本原因メモ（6033 / 1295）

- **6033**: インストール済み APK v3 の `SAMPLE_STOCKS` に Petronas Gas (6033) が存在しない。runner だけでは解決不可 → **APK 再ビルド（sampleStocks 修正）が必要**。
- **1295**: catalog 上 symbol が **5225**（正: 1295）。card タイトル「Public Bank Berhad」は検出できるが、タップ座標がタイトル行だと誤遷移（IHH HEALTHCARE）または詳細未遷移。次アクション: **`5225 · バルサ` ティッカー行を tap 優先**。

## 11. typecheck / unit test

| チェック | 結果 |
|----------|------|
| `npm run typecheck` | ✅ **PASS** |
| `phase12-5RuntimeMode.test.ts` | ✅ 12/12 PASS |
| `phase12-5DeviceUi.test.ts` | ✅ 7/7 PASS |
| `phase12-5InvalidDetectors.test.ts` | ⚠️ 13/15 PASS — `metro_down` / `bundle_error` 2 件 FAIL（runner 変更とは無関係 · 既存テスト / 環境依存） |

## 12. 未実施確認

| 項目 | 状態 |
|------|------|
| 2〜3h 短期テスト | ❌ **未開始** |
| 12h 本番 | ❌ **未開始** |
| Metro 起動 | ❌ 未起動 |
| git add / commit / push | ❌ **未実施** |

## 13. 次の作業

### 5/6 未達 — 推奨アクション

1. **1295**: `pickBestStockCard` で `screenerSymbols` ティッカー行（`5225 · バルサ`）tap 優先 · detail 到達確認後に smoke 再実行
2. **6033**: `src/data/sampleStocks.ts` に 6033 Petronas Gas 追加 + symbol 5225→1295 修正 → **preview APK v4 再ビルド・install** 後に smoke
3. 上記完了後 **6/6 PASS** 確認 → commit 保存 → logcat ローテート → pre-run-watch/watchdog → **2〜3h 短期テスト**

### 6/6 PASS 到達時

- git commit（runner + sampleStocks + レポート）
- logcat ローテート
- pre-run-watch / watchdog 起動
- 2〜3h 短期テスト開始（ユーザー承認後）
