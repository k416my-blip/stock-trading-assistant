# Play Internal Testing Readiness 再評価レポート

**日付:** 2026-06-21  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**スコープ:** M1 完了後 · **versionCode 27** ベース · Play IT 投入準備再開  
**制約:** 新機能追加禁止 · M2 禁止

---

## 1. エグゼクティブサマリー

| 区分 | 状態 |
|------|------|
| **M1 多言語** | ✅ **完了**（`MULTI_LANGUAGE_M1_FIX_REPORT` 承認済み） |
| **versionCode 27 ベース** | ✅ `app.json` 確認（EAS 試行による 28 自動増分は **27 に復元**） |
| **expo-localization SDK 54** | ✅ `~17.0.9`（`^56.0.6` から修正 · インストール確認済み） |
| **production AAB（EAS）** | ❌ **不可** — Free quota 枯渇（**2026-07-01** リセット） |
| **ローカル AAB/APK（Release）** | ❌ **不可** — Windows MAX_PATH（260 文字） |
| **Data Safety** | ✅ 完成版原稿（Owner Console 入力待ち） |
| **Store Listing** | ✅ 完成版原稿 + グラフィック資産 |
| **Privacy Policy URL** | ✅ **HTTP 200** |
| **Play IT 投入** | ⏳ **AAB 取得後** + Owner Console 作業 |

**総合判定:** **CONDITIONAL READY** — ドキュメント・M1・ポリシーは整備済み。**配布用 AAB が唯一のクリティカルブロッカー**。

---

## 2. versionCode 27 ベース確認

| 項目 | 値 |
|------|------|
| `app.json` · `expo.version` | `1.0.0` |
| `app.json` · `android.versionCode` | **27** |
| `android.package` | `com.assistant.stocktrading` |
| `expo.name` | Malaysia Stock AI Concierge |
| 実機インストール（直近 M1 検証） | versionCode **27**（debug + Metro） |

### 2.1 EAS autoIncrement 副作用（記録）

2026-06-21 に `eas build --profile production` を試行した際、quota 拒否**前**に CLI が `versionCode` を **27 → 28** に書き換えた。ビルド成果物は未生成のため **`app.json` を 27 に復元**済み。

次回成功時の production ビルドでは `eas.json` の `autoIncrement: true` により **28** から開始される見込み（Owner と整合確認）。

---

## 3. AAB / standalone APK ビルド可否

### 3.1 EAS production AAB（推奨経路）

```text
npx eas-cli build -p android --profile production --non-interactive
```

| 項目 | 結果 |
|------|------|
| 実行日 | 2026-06-21 |
| アップロード | ✅ 成功（~90.7 MB） |
| ビルド開始 | ❌ Free plan quota 超過 |
| リセット | **2026-07-01**（メッセージ: 9 days） |
| 成果物 AAB | **なし** |

**判定:** **現時点 AAB ビルド不可**（EAS Free · 2026-07-01 以降に再試行）。

### 3.2 ローカル Gradle（Release）

| コマンド | 結果 |
|----------|------|
| `gradlew assembleRelease` | ❌ FAIL — `Filename longer than 260 characters`（CMake/ninja · safe-area-context） |
| `gradlew bundleRelease` | ❌ 同上 |

**判定:** 本 Windows 環境では **Release AAB/APK 不可**。回避策:

- EAS cloud build（quota 復帰後）
- WSL / 短パス worktree / `subst` ドライブ
- CI（Linux runner）

### 3.3 standalone APK（参考）

| 経路 | 状態 |
|------|------|
| EAS `preview` / `apk` profile | quota 枯渇で同様に不可 |
| debug APK + Metro | M1 検証可能だが **Play 提出不可** |
| 旧 EAS preview（vc 15） | 存在するが **versionCode 27 / M1 未同梱** |

**Play IT 提出に必要な standalone バイナリ:** **production AAB のみ**（上記 EAS 待ち）。

---

## 4. expo-localization ~17.0.9 · ネイティブ再ビルド

### 4.1 問題（M1 検証で確認）

| 項目 | 旧 | 新 |
|------|-----|-----|
| package.json | `expo-localization ^56.0.6` | `expo-localization ~17.0.9` |
| 症状 | スタンドアロン起動クラッシュ `NoSuchMethodError: getDirectConverter` | SDK 54 整合 |
| npm ls | — | `expo-localization@17.0.9` ✅ |

### 4.2 ネイティブ再ビルド

| ステップ | 状態 |
|----------|------|
| `npm install expo-localization@~17.0.9` | ✅ 完了 |
| `npx expo prebuild --clean`（android 再生成） | ⏳ **EAS/ Linux ビルド前に推奨** |
| Release ネイティブ compile（ローカル） | ❌ MAX_PATH で未完了 |
| **EAS production ビルド** | ⏳ quota 復帰後 — **17.0.9 同梱の初回スタンドアロン AAB** |

**判定:** 依存関係修正は **repo に反映済み**。スタンドアロン実機確認は **次回 EAS AAB 取得後** が必須。

---

## 5. Data Safety 状況

| 項目 | 状態 |
|------|------|
| 完成版原稿 | ✅ `docs/review/PLAY_CONSOLE_SUBMISSION_PACKAGE.md` §1 |
| 根拠 | `docs/legal/privacy-policy.html` · P0 監査 |
| Console 入力 | ⏳ **Owner 作業**（Dev は Console 非保有） |
| 主要申告 | Financial info · Personal info（API keys）· Photos（OCR 任意）· App activity |
| 広告 ID | No |
| アカウント | No |

**矛盾チェック:** Privacy Policy（端末内保存 · API 送信の説明）と Data Safety 原稿は **整合**。

---

## 6. Store Listing 状況

| 項目 | 状態 |
|------|------|
| 完成版原稿 | ✅ `PLAY_CONSOLE_SUBMISSION_PACKAGE.md` §2 |
| App name | Malaysia Stock AI Concierge（27/30 文字） |
| Short / Full description | EN 原稿済み · JA 翻訳案あり |
| Feature graphic | ✅ `docs/store-assets/feature-graphic-1024x500.png` |
| Phone screenshots（5） | ✅ `docs/store-assets/screenshots/phone/01–05-*.png` |
| Console 入力 | ⏳ **Owner 作業** |
| M1 多言語 UI | Store **デフォルト EN** 掲載で IT 開始可（アプリ内 i18n は M1 完了） |

---

## 7. Privacy Policy URL

| 項目 | 値 |
|------|-----|
| **Canonical URL** | https://k416my-blip.github.io/stock-trading-assistant/legal/privacy-policy.html |
| HTTP 確認（2026-06-21） | **200 OK** |
| リポジトリ | `docs/legal/privacy-policy.html` |
| アプリ名表記 | Malaysia Stock AI Concierge ✅ |

---

## 8. 残ブロッカー（優先順）

| # | ブロッカー | 担当 | 対応 |
|---|-----------|------|------|
| **P0** | **production AAB 未生成** | Dev | **2026-07-01** 以降 `npm run build:android:production` |
| **P0** | **expo-localization 同梱スタンドアロン未検証** | Dev | 上記 AAB 取得後 · 実機起動 smoke（Metro 不要） |
| **P1** | Data Safety Console 入力 | Owner | §1 原稿を Console に転記 |
| **P1** | Store Listing Console 入力 | Owner | §2 + グラフィックアップロード |
| **P1** | Content rating · Financial 申告 | Owner | §1.8 参照 |
| **P2** | ローカル Windows Release ビルド | Dev | EAS 代替 · 短パス/WSL（IT 必須ではない） |
| — | M2 i18n 拡張 | — | **開始禁止**（ユーザー指示） |

---

## 9. Play IT 再開チェックリスト

### Dev（quota 復帰後）

- [ ] `app.json` versionCode 確認（27 または意図的 28+）
- [ ] `npm run build:android:production` → AAB ダウンロード
- [ ] スタンドアロン実機 smoke（起動 · 言語切替 · 主要 5 タブ）
- [ ] AAB を Owner に共有

### Owner

- [ ] Play Console アプリ作成 / Internal testing track
- [ ] Data Safety 完了
- [ ] Store Listing + グラフィック
- [ ] Privacy Policy URL 設定
- [ ] AAB アップロード · テスター追加

---

## 10. Git

| 項目 | 値 |
|------|-----|
| ベース | `f861826`（M1 fix report） |
| 本レポートコミット | *(push 後に追記)* |
| push | *(push 後に追記)* |

### 本再評価でコミットする変更

- `package.json` — `expo-localization ~17.0.9`
- `app.json` — versionCode **27** 維持

---

## 11. 参照ドキュメント

| ドキュメント | 用途 |
|-------------|------|
| `PLAY_CONSOLE_SUBMISSION_PACKAGE.md` | Data Safety · Listing · IT 手順 |
| `MULTI_LANGUAGE_M1_FIX_REPORT.md` | M1 完了証跡 |
| `PLAY_RELEASE_PREPARATION_REPORT.md` | ストア資産 · 初回リリース準備 |
| `eas.json` | production = app-bundle · autoIncrement |

---

*Play IT readiness recheck — 新機能なし · M2 未着手 · 2026-06-21*
