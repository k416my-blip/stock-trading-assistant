# Play Release Preparation Report

**実施日:** 2026-06-21  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**正式名称:** **Malaysia Stock AI Concierge**  
**スコープ:** Play Internal Testing 投入準備（**新機能追加なし**）

---

## 1. エグゼクティブサマリー

| 項目 | 状態 |
|------|------|
| `app.json` 名称変更 | ✅ 完了 |
| Privacy Policy 名称統一 | ✅ 完了 |
| Feature Graphic 1024×500 | ✅ 作成 |
| Play Store スクリーンショット 5 枚 | ✅ 実機キャプチャ |
| adb / aapt ラベル確認 | ✅ `Malaysia Stock AI Concierge` |
| Privacy Policy URL | ✅ HTTPS 200 |
| production AAB | ⏳ EAS Free quota 枯渇（2026-07-01 リセット後） |

---

## 2. 変更内容

### 2.1 app.json

| フィールド | 変更前 | 変更後 |
|------------|--------|--------|
| `expo.name` | `Rakuten Trade MY 助手` | **`Malaysia Stock AI Concierge`** |

**変更なし:** `slug` · `android.package` · `versionCode`（26）

### 2.2 Privacy Policy

**ファイル:** `docs/legal/privacy-policy.html`

| 箇所 | 変更 |
|------|------|
| `<title>` | Malaysia Stock AI Concierge |
| 日本語 `<meta>` · §1 本文 | 旧名称 → 新名称 |
| 英語 `<meta>` · §1 Overview | Rakuten Trade MY Assistant → Malaysia Stock AI Concierge |
| 最終更新日 | 2026-06-21（掲載名統一を追記） |

**維持:** 非提携声明 · Rakuten OCR 機能説明 · 連絡先 k416my@gmail.com

### 2.3 新規スクリプト

| ファイル | 用途 |
|----------|------|
| `scripts/capture-play-store-screenshots.mjs` | Standard モード 5 画面の Play 用スクショ取得 |

---

## 3. スクリーンショット

**保存先:** `docs/store-assets/screenshots/phone/`  
**デバイス:** FYRWXSNNAIOR9DCM · **Standard** モード · versionCode **26**

| # | ファイル | 画面 | サイズ |
|---|----------|------|--------|
| 1 | `01-home.png` | ホーム | 191 KB |
| 2 | `02-ai-consult.png` | AI相談 | 371 KB |
| 3 | `03-portfolio.png` | 保有銘柄 | 318 KB |
| 4 | `04-stock-check.png` | 銘柄チェック | 110 KB |
| 5 | `05-settings.png` | 設定 | 319 KB |

**メタデータ:** `docs/store-assets/screenshots/phone/capture-meta.json`

**再取得コマンド:**

```powershell
node scripts/capture-play-store-screenshots.mjs
```

---

## 4. Feature Graphic

| 項目 | 値 |
|------|-----|
| **ファイル** | `docs/store-assets/feature-graphic-1024x500.png` |
| **サイズ** | 1024 × 500 px · 1.4 MB |
| **背景** | `#0f1419` |
| **メインタイトル** | Malaysia Stock AI Concierge |
| **サブコピー** | Bursa Analysis · AI Concierge · Independent Tool |

---

## 5. Privacy Policy URL

| 項目 | 値 |
|------|-----|
| **Canonical URL** | https://k416my-blip.github.io/stock-trading-assistant/legal/privacy-policy.html |
| **リダイレクト** | https://k416my-blip.github.io/stock-trading-assistant/privacy-policy.html |
| **HTTP 確認（2026-06-21）** | **200 OK** |
| **Play Console 登録** | Owner 手動（未実施） |

> push 後、GitHub Pages 反映まで数分かかる場合あり。名称更新反映後に再確認推奨。

---

## 6. versionCode

| 項目 | 値 |
|------|-----|
| `app.json` | **26** |
| 実機インストール APK（debug） | **26** |
| 次回 production EAS | `autoIncrement: true` → **27** 見込み |

---

## 7. 実機確認 — adb label

### 7.1 ビルド · インストール

EAS preview は Free quota 枯渇のため、ローカル debug APK で検証:

```powershell
npx expo prebuild --platform android --no-install
$env:NODE_ENV='production'
cd android; .\gradlew :app:assembleDebug
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

### 7.2 ラベル検証結果

**aapt badging:**

```
application-label:'Malaysia Stock AI Concierge'
```

**dumpsys package:**

```
versionCode=26 minSdk=24 targetSdk=36
package:com.assistant.stocktrading
```

| 確認項目 | 結果 |
|----------|------|
| 端末ラベル（APK badging） | ✅ **Malaysia Stock AI Concierge** |
| package 名 | ✅ `com.assistant.stocktrading` |
| versionCode | ✅ 26 |

---

## 8. Play Console 反映（Owner · 手動）

| 項目 | 入力値 |
|------|--------|
| App name | Malaysia Stock AI Concierge |
| Feature graphic | `docs/store-assets/feature-graphic-1024x500.png` |
| Phone screenshots | `docs/store-assets/screenshots/phone/01-05-*.png` |
| Privacy policy URL | §5 Canonical URL |
| Short description | `APP_NAME_ADOPTION_REPORT.md` §4.3 参照 |

---

## 9. 未完了 · 次ステップ

| # | 項目 | 備考 |
|---|------|------|
| 1 | **production AAB** | EAS quota 2026-07-01 以降 · `npm run build:android:production` |
| 2 | **Play Console Store listing upload** | 本レポート §8 |
| 3 | **Data Safety フォーム** | `PLAY_INTERNAL_TESTING_P0_EXECUTION_REPORT.md` §6 |
| 4 | **Internal Testing 初回 upload** | AAB 取得後 |

---

## 10. GitHub commit hash · push 結果

| 項目 | 値 |
|------|-----|
| **Commit** | *(push 後に更新)* |
| **Branch** | `cursor/top3-maxdd-capital-audit` |
| **Push** | *(push 後に更新)* |

**コミット対象（予定）:**

- `app.json`
- `docs/legal/privacy-policy.html`
- `docs/store-assets/feature-graphic-1024x500.png`
- `docs/store-assets/screenshots/phone/*`
- `scripts/capture-play-store-screenshots.mjs`
- `docs/review/PLAY_RELEASE_PREPARATION_REPORT.md`

---

## 11. 参照

| ファイル | 用途 |
|----------|------|
| `docs/review/APP_NAME_ADOPTION_REPORT.md` | 採用決定 |
| `docs/review/APP_NAMING_REVIEW_REPORT.md` | 商標監査 |
| `docs/review/PLAY_INTERNAL_TESTING_P0_EXECUTION_REPORT.md` | P0 チェックリスト |
