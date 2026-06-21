# Play Store 掲載名 — 採用決定 · 統一反映計画

**決定日:** 2026-06-21  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**前提:** `APP_NAMING_REVIEW_REPORT.md` **承認済み**  
**実施範囲:** 本レポート作成のみ（**新機能コード変更なし · 次回リリース準備まで反映保留**）

---

## 1. 採用決定

| 項目 | 値 |
|------|-----|
| **Play Store 掲載名（確定）** | **Malaysia Stock AI Concierge** |
| **文字数** | 27 / 30（Google Play Metadata 上限内） |
| **監査推奨案との差分** | 監査第1候補は `Malaysia Stock AI Assistant`。Owner 決定で **Concierge** を採用 — AI コンシェルジュ機能と製品ブランドが一致 |
| **変更しない識別子** | `slug`: `stock-trading-assistant` · `package`: `com.assistant.stocktrading` · npm name |
| **統一実施タイミング** | **次回リリース準備時**（production AAB ビルド前） |

---

## 2. 変更対象一覧

| # | 区分 | ファイル / 場所 | 現行 | 次回リリース時 | 優先度 |
|---|------|-----------------|------|----------------|--------|
| 1 | **app.json** | `expo.name` | `Rakuten Trade MY 助手` | `Malaysia Stock AI Concierge` | **P0** |
| 2 | **Play Console** | Store listing → App name | 未設定 / 旧名 | `Malaysia Stock AI Concierge` | **P0** |
| 3 | **Play Console** | Short description | P0 下書き（Rakuten 言及なし） | 冒頭に掲載名整合 · 下記 §5.2 | **P0** |
| 4 | **Play Console** | Full description | 構成案のみ | §5.3 テンプレ反映 | **P0** |
| 5 | **Feature Graphic** | `docs/store-assets/feature-graphic-1024x500.png` | **未作成** | 掲載名をメインタイトルに §6 | **P0** |
| 6 | **Privacy Policy** | `docs/legal/privacy-policy.html` | `Rakuten Trade MY 助手` | 日英 `<title>` · 本文アプリ名 | **P1** |
| 7 | **Privacy Policy 原稿** | `docs/review/PRIVACY_POLICY_REPORT.md` | 旧名 | 掲載名に同期 | **P1** |
| 8 | **Store Listing 下書き** | `PLAY_INTERNAL_TESTING_P0_EXECUTION_REPORT.md` §7 | 候補表 | 確定名に更新 | **P1** |
| 9 | **Store Listing 素材** | `GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md` | Rakuten 表記注意 | 確定名 · 非提携声明に差替 | **P1** |
| 10 | **Play Console** | Data Safety · App content | 下書き | アプリ名参照箇所を統一 | **P1** |
| 11 | **実行計画** | `PLAY_INTERNAL_TESTING_EXECUTION_PLAN.md` | 旧アプリ名 | ヘッダー表記更新 | **P2** |
| 12 | **端末ラベル** | Android ホーム画面アプリ名 | `expo.name` 由来 | app.json 変更後の AAB で自動反映 | **P0**（#1 依存） |

**変更対象外（次回リリースでも維持）:**

| 項目 | 理由 |
|------|------|
| `expo.slug` | EAS project · deep link · OTA 識別子 — 変更コスト大 |
| `android.package` | Play 初回 upload 後は変更不可 |
| `app.json` → `expo-image-picker.photosPermission` | Rakuten Trade **取引履歴 OCR 機能**の説明文。アプリ名ではなく機能文脈のため **現状維持** |
| レビュー履歴レポート（`APP_NAMING_REVIEW_REPORT.md` 等） | 監査証跡として **改変しない** |

---

## 3. app.json 変更箇所

**ファイル:** `app.json`

### 3.1 変更するフィールド

| パス | 現行 | 次回リリース時 |
|------|------|----------------|
| `expo.name` | `"Rakuten Trade MY 助手"` | `"Malaysia Stock AI Concierge"` |

**差分（予定）:**

```diff
 {
   "expo": {
-    "name": "Rakuten Trade MY 助手",
+    "name": "Malaysia Stock AI Concierge",
     "slug": "stock-trading-assistant",
```

### 3.2 変更しないフィールド（確認用）

| パス | 値 | 備考 |
|------|-----|------|
| `expo.slug` | `stock-trading-assistant` | 維持 |
| `expo.android.package` | `com.assistant.stocktrading` | 維持 |
| `expo.version` / `versionCode` | リリース時に increment | 名前変更と同コミット可 |
| `expo.plugins[expo-image-picker].photosPermission` | Rakuten Trade 取引履歴… | **機能説明 · 維持** |

### 3.3 反映確認（AAB ビルド後）

```powershell
adb shell dumpsys package com.assistant.stocktrading | findstr /i "label"
```

期待値: `Malaysia Stock AI Concierge`

---

## 4. Store Listing 反映箇所

### 4.1 Play Console（Owner · 次回リリース準備時）

| Console パス | 反映内容 |
|--------------|----------|
| **Grow → Store presence → Main store listing → App name** | `Malaysia Stock AI Concierge` |
| **Short description**（80 字） | §5.2 ドラフト |
| **Full description** | §5.3 テンプレ |
| **App icon** | `assets/icon.png`（名称変更なし · 512 export 要確認） |
| **Phone screenshots** | `docs/store-assets/screenshots/phone/`（7 枚推奨 · スクショ内に旧名が写っていないか確認） |
| **Feature graphic** | §6 |
| **Contact email** | k416my@gmail.com（暫定 · Owner 確定） |
| **Privacy policy URL** | `https://k416my-blip.github.io/stock-trading-assistant/legal/privacy-policy.html`（Pages 有効化後） |

### 4.2 リポジトリ内ドキュメント（Dev · 次回リリース準備時）

| ファイル | 反映箇所 | 作業 |
|----------|----------|------|
| `docs/review/PLAY_INTERNAL_TESTING_P0_EXECUTION_REPORT.md` | §7.1 アプリ名候補 | 確定名行を追加 · 旧候補を「却下」に |
| `docs/review/GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md` | §1 表 · §8.1 候補 · §9 #1 | 確定名 · Rakuten 表記リスク **解消済み** に更新 |
| `docs/review/PLAY_INTERNAL_TESTING_EXECUTION_PLAN.md` | 概要表 `アプリ` 行 | 確定名に差替 |
| `docs/legal/privacy-policy.html` | `<title>` · §JA/EN 本文先頭 | 掲載名に統一（非提携声明は維持） |
| `docs/review/PRIVACY_POLICY_REPORT.md` | §4 · §5 草案 | 掲載名に統一 |

### 4.3 Short description ドラフト（確定名反映 · EN）

```
AI concierge for Malaysia stocks. Material analysis & portfolio insights. Not a broker. Trade in your broker app.
```

（80 字以内 · 執行なし · 非ブローカーを明示）

### 4.4 Full description 先頭テンプレ（確定名反映 · EN）

```
Malaysia Stock AI Concierge is an independent analysis and decision-support tool for Bursa Malaysia–focused investing.

• Not affiliated with Rakuten Trade or any broker
• Does not place orders or automate trading
• AI Concierge · Material analysis · Portfolio tracking · Practice mode

[以降: 機能一覧 · 免責 · データ/AI 限界 — GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md §8.3 構成]
```

---

## 5. Feature Graphic 反映箇所

**ファイル（新規作成）:** `docs/store-assets/feature-graphic-1024x500.png`

| 項目 | 仕様 |
|------|------|
| サイズ | **1024 × 500 px** · 24-bit PNG または JPG（アルファなし） |
| 背景色 | `#0f1419`（`app.json` splash / adaptiveIcon と統一） |
| **メインタイトル** | **Malaysia Stock AI Concierge** |
| サブコピー（案） | `Bursa Analysis · AI Concierge · Independent Tool` |
| 禁止要素 | Rakuten / Bursa ロゴ · 「Official」 · 成果保証 · 注文執行暗示 |
| Play Console upload | Main store listing → Feature graphic |
| 参照 | `PLAY_INTERNAL_TESTING_EXECUTION_PLAN.md` §3.2 · `PLAY_INTERNAL_TESTING_P0_EXECUTION_REPORT.md` §7.5 |

**デザイン整合チェック（リリース前）:**

- [ ] タイトルが Play Console App name と **完全一致**
- [ ] アイコン（`assets/icon.png`）と色調一致
- [ ] スクリーンショットキャプションに旧名 `Rakuten Trade MY` がない

---

## 6. Play Console 資料 — 統一チェックリスト

次回リリース準備時、以下を **Malaysia Stock AI Concierge** で横断一致させる。

| Console セクション | 確認項目 |
|--------------------|----------|
| **Main store listing** | App name · Short/Full description · Feature graphic |
| **App content → Privacy policy** | URL 先 HTML の `<title>` / 本文名 |
| **App content → Data safety** | アプリ説明内の名称（任意記述欄） |
| **App content → Financial features** | 分析支援 · 非執行 — 名称と矛盾なし |
| **Internal testing → Release notes** | 初回: "Initial internal test — Malaysia Stock AI Concierge" |
| **EAS Submit** | `eas.json` submit profile — package 名のみ（名称は store listing 側） |

---

## 7. 次回リリース準備 — 推奨作業順

1. `app.json` → `expo.name` 変更 · commit  
2. Privacy Policy HTML 更新 · GitHub Pages 再デプロイ  
3. Feature Graphic 作成 · `docs/store-assets/` 配置  
4. スクリーンショット再キャプチャ（端末ラベルが新名になる AAB / preview から）  
5. Play Console Store listing 入力 · 資料 upload  
6. `npm run build:android:production` → Internal Testing upload  
7. 本レポート §2 チェックリスト全項目 ✅

---

## 8. GitHub commit hash · push 結果

| 項目 | 値 |
|------|-----|
| **本レポート commit** | *(push 後に更新)* |
| **Branch** | `cursor/top3-maxdd-capital-audit` |
| **Remote** | `https://github.com/k416my-blip/stock-trading-assistant.git` |
| **Push** | *(push 後に更新)* |

**本コミット対象:** `docs/review/APP_NAME_ADOPTION_REPORT.md`（新規）

---

## 9. 参照

| ファイル | 用途 |
|----------|------|
| `docs/review/APP_NAMING_REVIEW_REPORT.md` | 商標監査（承認済み） |
| `docs/review/PLAY_INTERNAL_TESTING_P0_EXECUTION_REPORT.md` | Store / AAB P0 準備 |
| `app.json` | 次回変更対象 |
| `docs/review/GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md` | Listing 素材詳細 |
