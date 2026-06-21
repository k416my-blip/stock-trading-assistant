# Play Console Submission Package

**作成日:** 2026-06-21  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**アプリ:** Malaysia Stock AI Concierge  
**Package:** `com.assistant.stocktrading` · versionCode **26**  
**スコープ:** Play Console 入力資料の最終化（**新機能 · UI 変更なし**）

---

## エグゼクティブサマリー

| 区分 | 状態 |
|------|------|
| Data Safety 完成版 | ✅ 本ドキュメント §1 |
| Store Listing 完成版 | ✅ 本ドキュメント §2 |
| Internal Testing 手順 | ✅ 本ドキュメント §3 |
| Owner 作業チェックリスト | ✅ 本ドキュメント §4 |
| production AAB | ⏳ EAS Free quota — **2026-07-01** 以降（Dev 作業 · §3.1） |

**Privacy Policy URL:** https://k416my-blip.github.io/stock-trading-assistant/legal/privacy-policy.html  
**サポートメール（暫定）:** k416my@gmail.com

---

## 1. Data Safety 完成版

> **入力場所:** Play Console → **App content → Data safety**  
> 最終申告前に Owner が Console 上の選択肢と照合すること。  
> 根拠: `docs/legal/privacy-policy.html` · `PLAY_INTERNAL_TESTING_P0_EXECUTION_REPORT.md` §6 · versionCode 26 監査

---

### 1.1 概要質問（Overview）

| # | Console 質問（要旨） | **回答** |
|---|---------------------|----------|
| O1 | Does your app collect or share any of the required user data types? | **Yes** |
| O2 | Is all of the user data collected by your app encrypted in transit? | **Yes**（HTTPS / TLS） |
| O3 | Do you provide a way for users to request that their data is deleted? | **Yes**（§1.6 削除手順） |
| O4 | Have you published a privacy policy URL? | **Yes** — §エグゼクティブサマリー URL |
| O5 | Does your app use advertising ID? | **No** |
| O6 | Does your app allow users to create an account? | **No** |
| O7 | Is your app primarily a news app? | **No** |
| O8 | Is your app a VPN service? | **No** |

---

### 1.2 データ種別 — Financial info

#### Financial info → Other financial info

| 項目 | **回答** |
|------|----------|
| **Collected** | **Yes** |
| **Shared** | **No**（当方サーバーへのアップロードなし · 第三者への販売なし） |
| **Processed ephemerally** | **No**（端末内 AsyncStorage に永続保存） |
| **Required or optional** | **Required for app functionality**（ポートフォリオ機能の核心データ） |
| **Purposes** | ☑ **App functionality** |
| **Why collected**（Console 自由記述 · 英語） | Portfolio holdings, trade records, and practice-mode balances stored locally on device for analysis and tracking. Not uploaded to developer servers. |

---

### 1.3 データ種別 — Personal info

#### Personal info → Other info（ユーザー入力 API キー）

| 項目 | **回答** |
|------|----------|
| **Collected** | **Yes** |
| **Shared** | **Yes**（ユーザー操作に基づき API プロバイダへ送信） |
| **Processed ephemerally** | **No**（SecureStore に保存） |
| **Required or optional** | **Optional**（未設定時は AI / 一部データ機能が制限） |
| **Purposes** | ☑ **App functionality** |
| **Why collected**（英語） | User optionally enters API keys (OpenAI, Twelve Data, News API, X API) stored encrypted on device. Keys are sent to respective APIs only when user initiates features. We do not sell user data. |

**Shared with（Console で該当する場合）:**

| 第三者 | 送信データ | 目的 |
|--------|-----------|------|
| OpenAI | プロンプト · 質問 · 分析コンテキスト · OCR 画像 | AI 分析 |
| Twelve Data | 銘柄シンボル | 株価 |
| News API | 検索クエリ | ニュース材料 |
| X (Twitter) API | 検索クエリ | SNS 材料 |

---

### 1.4 データ種別 — Photos and videos

#### Photos and videos（Rakuten 取引履歴 OCR · 任意機能）

| 項目 | **回答** |
|------|----------|
| **Collected** | **Yes**（ユーザーが image-picker で明示選択時） |
| **Shared** | **Yes**（OCR 実行時 OpenAI Vision API へ送信） |
| **Processed ephemerally** | **Yes**（OCR 元画像は端末外・当方サーバーに永続保存しない） |
| **Required or optional** | **Optional**（OCR 機能利用時のみ · OpenAI キー必須） |
| **Purposes** | ☑ **App functionality** |
| **Why collected**（英語） | When user optionally imports broker transaction history via screenshot OCR, the selected image is read on-device and sent to OpenAI Vision API for parsing. Source images are not stored on developer servers. Parsed rows are saved locally only after user review. |

**権限:** `READ_MEDIA_IMAGES` · expo-image-picker

---

### 1.5 データ種別 — App activity

#### App activity → In-app search history（該当する場合）

| 項目 | **回答** |
|------|----------|
| **Collected** | **Yes**（限定的 — 銘柄検索 · 表示履歴程度） |
| **Shared** | **No** |
| **Processed ephemerally** | **No** |
| **Required or optional** | **Required for app functionality** |
| **Purposes** | ☑ **App functionality** |
| **Why collected**（英語） | Local search and browsing history within the app to improve navigation. Stored on device only. |

> Console に **In-app search history** が無い場合は **App interactions** または該当最小カテゴリで同等申告。

---

### 1.6 収集しないデータ（Console で選択不要 · 申告 NO）

以下は **収集しない** と回答:

| Data type | 回答 |
|-----------|------|
| Name | No |
| Email address | No |
| User IDs | No |
| Address | No |
| Phone number | No |
| Race and ethnicity | No |
| Political or religious beliefs | No |
| Sexual orientation | No |
| Location（Precise / Approximate） | No |
| Contacts | No |
| Calendar events | No |
| SMS or MMS | No |
| Files and docs（上記 OCR 以外） | No |
| Audio files | No |
| Videos（OCR 以外） | No |
| Health info | No |
| Fitness info | No |
| Web browsing history | No |
| Installed apps | No |
| Device or other IDs | No |
| Crash logs（専用 SDK） | No※ |
| Diagnostics（専用 SDK） | No※ |

※ Google Play のデフォルトクラッシュレポートは Console の別設定。**Firebase Analytics / Crashlytics 等は未導入**（2026-06-21 監査）。

---

### 1.7 セキュリティ practices

| 項目 | **回答** |
|------|----------|
| Data encrypted in transit | **Yes**（TLS / HTTPS） |
| Data deletion mechanism | **Yes** |
| **Deletion instructions**（英語 · Console / Policy 用） | Users can delete API keys in Settings, reset all app data via in-app reset, or clear storage / uninstall the app from Android settings. No developer-operated account required. |

---

### 1.8 第三者 SDK（Console 補足 · 該当フィールド）

| SDK | データ | 申告メモ |
|-----|--------|----------|
| Expo / React Native | 最小限 | 標準ランタイム |
| expo-secure-store | 端末シークレット | 収集=ユーザー入力キーのみ |
| expo-notifications | 通知トークン（FCM） | **要確認** — 通知利用時 |
| expo-image-picker | ユーザー選択画像 | §1.4 と整合 |
| Hermes | なし | — |

---

### 1.9 Financial features declaration（関連セクション）

| 項目 | **回答** |
|------|----------|
| App provides financial features? | **Yes** — portfolio tracking / analysis |
| App facilitates stock trading / order execution? | **No** |
| App provides personalized investment advice? | **No** — decision-support tool only |
| Broker / exchange affiliation? | **No** |

---

## 2. Store Listing 完成版

> **入力場所:** Play Console → **Grow → Store presence → Main store listing**  
> **デフォルト言語:** English (United States) 推奨（アプリ名が英語）  
> 日本語ストア掲載する場合は **Store listings → Manage translations → Add Japanese** で §2.2–2.3 JA を追加

---

### 2.1 App Name

```
Malaysia Stock AI Concierge
```

| 項目 | 値 |
|------|-----|
| 文字数 | 27 / 30 |
| Package | `com.assistant.stocktrading`（変更不可） |

---

### 2.2 Short Description（80 文字以内 · EN）

**Console に貼り付け:**

```
AI concierge for Malaysia stocks. Portfolio insights & material analysis. Not a broker.
```

| 項目 | 値 |
|------|-----|
| 文字数 | 79 / 80 |

**日本語版（翻訳追加時）:**

```
マレーシア株のAIコンシェルジュ。材料分析と保有管理で判断を整理。証券会社の公式アプリではありません。
```

---

### 2.3 Full Description（EN · Console に貼り付け）

```
Malaysia Stock AI Concierge is an independent analysis and decision-support tool for investors focused on Bursa Malaysia, with reference coverage for US and Hong Kong markets.

NOT A BROKER
• Not affiliated with Rakuten Trade, Bursa Malaysia, or any securities company
• Does not place orders, execute trades, or automate trading
• All trading must be done in your broker's official app

KEY FEATURES
• AI Concierge — ask questions and organize investment decisions with multi-layer analysis
• Material Analysis — score news and social signals from multiple sources
• AI Stock Report — deep-dive Bursa holdings in a structured format
• Portfolio Tracking — visualize holdings, P/L, and allocation in MYR
• Practice Mode — try strategies with virtual funds
• Trade History Import — manual entry, natural language, or optional screenshot OCR (requires your OpenAI API key)

HOW TO USE
1. Execute trades in your broker app
2. Record and analyze positions in this app
3. Use AI tools for research — not for order execution

DATA & AI
• Optional API keys (OpenAI, Twelve Data, News API, X API) stored encrypted on your device
• No developer-operated backend server collecting your personal profile
• AI outputs may be incomplete or outdated — verify before acting

DISCLAIMER
This app does not provide investment advice. All investment decisions and trade execution are your sole responsibility. Past analysis does not guarantee future results.

Support: k416my@gmail.com
Privacy Policy: https://k416my-blip.github.io/stock-trading-assistant/legal/privacy-policy.html
```

---

### 2.4 Keywords（ASO）

> **注意:** Google Play は **独立した Keywords フィールドを廃止**（2022〜）。以下は Title · Short · Full Description への **自然な組み込み用** リスト。

**Primary（高優先）:**

```
Malaysia stock, Bursa Malaysia, AI concierge, stock analysis, portfolio tracker, MYR, investment assistant
```

**Secondary:**

```
material analysis, AI investing, practice mode, stock screener, market monitoring, OpenAI, decision support
```

**禁止（Metadata policy 抵触回避）:**

```
Rakuten Trade, official, broker app, guaranteed returns, free money, #1 trading app, Bursa official
```

**推奨配置:**

| キーワード群 | 配置先 |
|-------------|--------|
| Malaysia stock · Bursa · AI concierge | App Name · 先頭段落 |
| portfolio · material analysis | Short Description · Full Description 見出し |
| not a broker · independent | Short Description 末尾 · Full Description NOT A BROKER |

---

### 2.5 グラフィック素材（参照 · Console upload）

| 種別 | ファイル |
|------|----------|
| App icon | `assets/icon.png`（512×512 要確認） |
| Feature graphic | `docs/store-assets/feature-graphic-1024x500.png` |
| Phone screenshots | `docs/store-assets/screenshots/phone/01-home.png` 〜 `05-settings.png` |

---

## 3. Internal Testing 実行手順書

### 3.1 Phase A — production AAB 作成（Dev · EAS quota 利用可能時）

**前提:** EAS Free Android builds quota 利用可能（2026-07-01 リセット後を推奨）

```powershell
cd c:\Users\k416m\Documents\Projects\stock-trading-assistant

git pull origin cursor/top3-maxdd-capital-audit
git log -1 --oneline

# EAS ログイン
npx eas-cli whoami

# production AAB（monitor=0 · app-bundle · autoIncrement）
npm run build:android:production -- --non-interactive --wait

# 成果物ダウンロード
npx eas-cli build:download --platform android --profile production --latest
```

| 確認項目 | 期待値 |
|----------|--------|
| Profile | `production` |
| Build type | `app-bundle` (.aab) |
| `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR` | `0` |
| versionCode | **27** 見込み（autoIncrement · `app.json` 同期確認） |
| Package | `com.assistant.stocktrading` |
| App label | `Malaysia Stock AI Concierge` |

**ビルド後スモーク（Dev · 推奨）:**

```powershell
# logcat: [12H-MONITOR] 0 行
adb logcat -d | findstr "12H-MONITOR"

# ラベル確認
aapt dump badging <path-to.aabのAPKSまたはインストール済みAPK> | findstr application-label
```

**quota 枯渇時の代替（参考 · 非 production）:**

```powershell
# ローカル debug（Internal Testing 提出不可 · ラベル確認のみ）
npx expo prebuild --platform android --no-install
$env:NODE_ENV='production'
cd android; .\gradlew :app:assembleDebug
```

---

### 3.2 Phase B — Play Console Upload（Owner または Dev）

**パス:** Play Console → **Release → Testing → Internal testing**

#### 方法 A: Play Console 手動 upload（推奨 · 初回）

1. **Internal testing** タブを開く
2. **Create new release**（または **Create release**）
3. **App bundles** → **Upload** → production `.aab` を選択
4. **Release name:** `1.0.0 (27)` — versionCode に合わせる
5. **Release notes（EN）:**

```
Initial internal test release.
• Malaysia Stock AI Concierge — analysis & decision-support tool
• Not a broker app — no order execution
• Report issues to k416my@gmail.com
```

6. **Review release** → **Start rollout to Internal testing**

#### 方法 B: EAS Submit（Google Service Account 設定済みの場合）

```powershell
npx eas-cli submit -p android --profile production --latest --non-interactive
```

> 初回は Play Console でアプリ作成 · 署名鍵登録 · Data Safety 完了が必要。EAS Submit は **Internal track 指定** を `eas.json` / submit プロファイルで要確認。

---

### 3.3 Phase C — Tester 追加（Owner）

**パス:** Play Console → **Release → Testing → Internal testing → Testers**

| 方法 | 手順 |
|------|------|
| **Email list（推奨 · 初回）** | 1. **Create email list** → 名前例 `internal-testers-v1`  2. テスターメール追加（最大 100）  3. **Save** |
| **Tester グループ有効化** | Internal testing → **Testers** タブ → 作成した list にチェック |
| **Opt-in URL 共有** | **How testers join** → Copy link → テスターに送付 |
| **テスター側** | リンクを開く → Google アカウントで参加 → Play Store からインストール |

**初回テスター例:**

```
k416my@gmail.com
（追加の実機テスター メール）
```

---

### 3.4 Phase D — リリース作成 · 公開（Owner）

| Step | 作業 | 完了条件 |
|------|------|----------|
| D1 | §4 Owner チェックリスト全項目完了 | Data Safety · Listing · Policy URL |
| D2 | Internal testing release 作成 · AAB upload | Release draft 保存 |
| D3 | **Review release** | エラー 0 件 |
| D4 | **Start rollout to Internal testing** | Status: **Available to internal testers** |
| D5 | Opt-in URL でテスター端末インストール確認 | アプリ起動 · ラベル一致 |
| D6 | 初回フィードバック記録 | `docs/review/` に smoke メモ（任意） |

**Internal Testing の審査:** 通常 **数時間〜24 時間**。初回アプリは **Data Safety · Policy · Content rating** 未完了だとブロック。

---

## 4. Owner 向け作業一覧（Play Console のみ）

> Dev 作業（EAS build · git · スクリプト）は **含まない**。  
> チェックボックスは Console 作業完了時に ✅

### 4.1 アプリ作成 · 基本設定

- [ ] Google Play Console でアプリ作成（未作成の場合）
- [ ] App name 確定: **Malaysia Stock AI Concierge**
- [ ] Default language: **English (United States)**
- [ ] App / Game: **App**
- [ ] Free / Paid: **Free**

### 4.2 App content（必須 · リリースブロッカー）

- [ ] **Privacy policy** URL 登録  
  `https://k416my-blip.github.io/stock-trading-assistant/legal/privacy-policy.html`
- [ ] **Data safety** — §1 を Console に転記 · **Submit**
- [ ] **Ads** — アプリに広告なし → **No, my app does not contain ads**
- [ ] **Content rating** — IARC questionnaire 完了（Finance / 参照のみ · 非暴力的）
- [ ] **Target audience** — 13+ （COPPA 非対象）
- [ ] **News app** — No
- [ ] **COVID-19 contact tracing / status** — 該当なし · Skip
- [ ] **Data safety · Financial features** — §1.9 に整合
- [ ] **Government apps** — No
- [ ] **Health** — 該当なし

### 4.3 Store listing

- [ ] **App name:** §2.1
- [ ] **Short description:** §2.2 EN
- [ ] **Full description:** §2.3 EN
- [ ] **App icon** upload（512×512）
- [ ] **Feature graphic** upload — `docs/store-assets/feature-graphic-1024x500.png`
- [ ] **Phone screenshots** upload — 5 枚（`01-home` 〜 `05-settings`）
- [ ] **Category:** Finance
- [ ] **Contact email:** k416my@gmail.com（正式メール確定）
- [ ] **（任意）** 日本語 translation 追加 — §2.2 JA

### 4.4 配信 · テスト

- [ ] **Countries / regions** — 初回は Malaysia · Japan · または Internal test 用に限定配信を選定
- [ ] Dev から受け取った **production AAB** を確認（versionCode · package 名）
- [ ] **Internal testing → Create release → Upload AAB**
- [ ] **Release notes** 入力（§3.2）
- [ ] **Start rollout to Internal testing**
- [ ] **Testers → Email list** 作成 · Opt-in URL 共有
- [ ] テスター端末でインストール · 起動確認

### 4.5 提出前最終確認

- [ ] Store listing のアプリ名 = **Malaysia Stock AI Concierge**（旧 Rakuten 表記なし）
- [ ] Privacy Policy URL がブラウザで **200 OK**
- [ ] Data Safety と Privacy Policy の記述が矛盾しない
- [ ] スクリーンショットに旧アプリ名ラベルが写っていない（写っている場合は Dev に再キャプチャ依頼）

---

## 5. GitHub commit hash · push 結果

| 項目 | 値 |
|------|-----|
| **Commit（本体）** | `db4a097` — Add Play Console submission package for Internal Testing. |
| **Commit（HEAD）** | `736ca14` — Record commit hash in Play Console submission package. |
| **Branch** | `cursor/top3-maxdd-capital-audit` |
| **Remote** | `https://github.com/k416my-blip/stock-trading-assistant.git` |
| **Push** | **success** — `fa98c09..736ca14` → `origin/cursor/top3-maxdd-capital-audit` |

---

## 6. 参照

| ファイル | 用途 |
|----------|------|
| `docs/review/PLAY_RELEASE_PREPARATION_REPORT.md` | リリース準備完了報告 |
| `docs/review/APP_NAME_ADOPTION_REPORT.md` | 掲載名採用 |
| `docs/review/PLAY_INTERNAL_TESTING_P0_EXECUTION_REPORT.md` | Data Safety 原稿 |
| `docs/legal/privacy-policy.html` | Privacy Policy 公開版 |
| `eas.json` | production profile |
| `docs/store-assets/` | グラフィック · スクショ |

---

**新機能追加 · UI 変更は禁止。本パッケージは Play Internal Testing 投入の Console 入力専用。**
