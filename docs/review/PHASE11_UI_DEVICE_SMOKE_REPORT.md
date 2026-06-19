# PHASE11_UI_DEVICE_SMOKE_REPORT

## 概要

Phase11 承認後の Android 実機 UI スモーク — Material Analysis / Concierge Enhanced Analysis / Phase24 / Phase23.1。

| 項目 | 値 |
|------|-----|
| 実行日時 | 2026-06-19T04:06:29Z 〜 04:38:52Z（約 32 分） |
| デバイス | Xiaomi 23090RA98G (`FYRWXSNNAIOR9DCM`) |
| パッケージ | `com.assistant.stocktrading` |
| ベース commit | `77b0a17`（実行時 HEAD） |
| スクリプト | `scripts/bursa-phase11-ui-device-verify.mjs` |
| 証跡 | `docs/review/phase11-ui-device/` |

---

## 判定

**PARTIAL PASS** — クラッシュなし・材料分析画面 OK。Phase24 / Phase23.1 / Concierge 強化分析 / 6 銘柄切替は自動判定 **未達**（要 Preview APK 再ビルド + スクリプト改善後の再検証）。

| 検証項目 | 結果 | 備考 |
|----------|------|------|
| Material Analysis Screen | **PASS** | タブ遷移・再取得・ロード完了・1155 カード表示 |
| スクロール | **PASS** | Phase17〜20 領域まで到達（04-phase23_1-scroll.png） |
| Phase24 表示 | **FAIL** | 全 200+ UI dump に `Phase24 Analyst Consensus Intelligence` **0 件** |
| Phase23.1 表示 | **FAIL** | `Phase23.1 Earnings Revision Cross Signal` **0 件** |
| Concierge Enhanced Analysis | **FAIL** | FAB タップ後も材料分析画面のまま。`AI分析結果` 等 **0 件** |
| 6 銘柄切替 | **FAIL** | 銘柄コードタップ未実装。全 `material-*.png` が同一ビュー（Phase11.5 監査） |
| クラッシュ有無 | **PASS** | logcat FATAL 0 → 0（`crashFree: true`） |

---

## 6 銘柄結果（自動マーカー）

| Code | Label | Phase24 | Phase23.1 | 銘柄 XML | 判定 |
|------|-------|---------|-----------|----------|------|
| 1155 | Maybank | 4/6 | 1/5 | ✗ | FAIL |
| 1023 | CIMB | 4/6 | 1/5 | ✗ | FAIL |
| 1295 | Public Bank | 4/6 | 1/5 | ✗ | FAIL |
| 5347 | Tenaga | 4/6 | 1/5 | ✗ | FAIL |
| 4707 | Nestle | 4/6 | 1/5 | ✗ | FAIL |
| 6033 | Petronas Gas | 4/6 | 1/5 | ✗ | FAIL |

**注:** Phase24 の 4/6 は `Source:` / `Target:` / `Score:` / `Confidence:` の部分一致。これらは Phase14 等でも出現するため、Phase24 セクション到達の証拠にはならない。全 XML で Phase24 / Phase23.1 **見出しラベルは未検出**。

---

## 実機で確認できた内容

1. **起動・タブ** — アプリ起動 → 材料分析タブ → 再取得 → `【銘柄別材料分析】` 表示（02-material-loaded.png）。
2. **1155 Maybank** — スコア +100、データ品質 4/5、API 接続（News/X 接続済み、Reddit 未接続）。
3. **スクロール深度** — Phase18 News / Phase19 Macro / Phase19.5 Sector Rotation まで視認（04-phase23_1-scroll.png）。
4. **Phase11.5 API 統合監査** — 接続 1/3（X のみ）。News API は 429 レート制限。
5. **クラッシュ** — 32 分連続操作で FATAL EXCEPTION なし。

---

## 未達の主因（分析）

| 原因 | 詳細 |
|------|------|
| スクロール不足 | 銘柄カード内 Phase24（Phase14 直後）・Phase23.1（Phase23 直後）まで 15〜25 swipe では未到達 |
| 銘柄切替未実装 | スクリプトは relaunch + 材料タブのみ。銘柄行タップ / StockReport 遷移なし |
| Concierge FAB | 座標フォールバック (980,2100) が AI レポートオーバーレイと競合し、モーダル未オープンの可能性 |
| Preview APK 鮮度 | E2E パイプライン（77b0a17）では Phase24/23.1 UI マップ 19/19 だが、実機バンドルが古い可能性 |

---

## ADB 接続手順（再実行時）

```powershell
# 1. USB デバッグ ON → USB 接続
adb devices -l
# → FYRWXSNNAIOR9DCM  device ... が表示されること

# 2. Preview APK インストール（最新ビルド）
adb install -r android/app/build/outputs/apk/release/app-release.apk

# 3. Metro（開発ビルドの場合）
npx expo start

# 4. スモーク実行
node scripts/bursa-phase11-ui-device-verify.mjs

# 5. 結果確認
type docs\review\phase11-ui-device\device-results.json
```

**トラブルシュート**

- `adb: device unauthorized` → 端末で RSA 指紋を許可
- `adb: no devices` → ドライバ / USB モード（ファイル転送）確認
- 材料分析タイムアウト → Wi‑Fi 接続、News API 429 時は 24h 待ちまたはキー更新

---

## 推奨フォローアップ

1. Preview APK を `77b0a17` 以降で再ビルド・再インストール
2. スクリプト改善 — 銘柄行タップ、`scrollUntil` に Phase24 **見出し**を必須条件化、Concierge は `AIコンシェルジュを開く` content-desc 優先
3. 手動確認 — 1155 カード内を Phase24 見出しまで手動スクロールしスクリーンショット取得

---

## 再実行

```bash
node scripts/bursa-phase11-ui-device-verify.mjs
```

---

## GitHub 同期

| 項目 | 値 |
|------|-----|
| Commit | **`f594ae8`**（証跡） / **`ab132e7`**（HEAD · hash 追記） |
| Push | **成功** — `77b0a17..ab132e7` → `origin/cursor/top3-maxdd-capital-audit` |
