# PLAY_IT_OWNER_CONSOLE_CHECKLIST

**日付:** 2026-06-21  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**versionCode:** **27**（次回 EAS production ビルド時 autoIncrement → **28** 見込み）  
**判定:** **Conditional Ready**（`PLAY_IT_READINESS_RECHECK_REPORT.md` 承認済み）

---

## 常時制約（Standing constraints）

| 制約 | 内容 |
|------|------|
| 新機能 | **禁止** |
| M2 i18n | **禁止** |
| Rakuten Import 追加検証 | **不要** |
| production AAB | **2026-07-01** EAS Free quota リセット**以降のみ**（Dev 作業） |
| 本ドキュメントのスコープ | **Play Console Owner 準備のみ**（Dev は Console 非保有） |

**参照パッケージ:** [`docs/review/PLAY_CONSOLE_SUBMISSION_PACKAGE.md`](PLAY_CONSOLE_SUBMISSION_PACKAGE.md)

---

## 1. Owner が **今すぐ** Play Console でできること

> Dev 作業（EAS build · git · AAB）を**待たずに**完了可能。チェックボックスは Console 作業完了時に ✅

### 1.1 アプリ作成 · 基本設定

- [ ] Google Play Console でアプリ作成（未作成の場合）
- [ ] **App name:** `Malaysia Stock AI Concierge`
- [ ] **Default language:** English (United States)
- [ ] **App / Game:** App
- [ ] **Free / Paid:** Free
- [ ] **Category:** **Finance**
- [ ] **Contact email:** `k416my@gmail.com`

### 1.2 Privacy Policy URL

**入力場所:** App content → Privacy policy

```
https://k416my-blip.github.io/stock-trading-assistant/legal/privacy-policy.html
```

- [ ] URL 登録済み
- [ ] ブラウザで **HTTP 200** 確認済み

### 1.3 Data Safety

**入力場所:** App content → Data safety  
**詳細原稿:** [`PLAY_CONSOLE_SUBMISSION_PACKAGE.md` §1](PLAY_CONSOLE_SUBMISSION_PACKAGE.md#1-data-safety-完成版)

#### 概要（Overview）— コピペ用

| # | 質問（要旨） | **回答** |
|---|-------------|----------|
| O1 | Collect or share required user data types? | **Yes** |
| O2 | All data encrypted in transit? | **Yes**（HTTPS / TLS） |
| O3 | Way for users to request data deletion? | **Yes** |
| O4 | Privacy policy URL published? | **Yes** — 上記 URL |
| O5 | Uses advertising ID? | **No** |
| O6 | Users can create an account? | **No** |
| O7 | Primarily a news app? | **No** |
| O8 | VPN service? | **No** |

#### 収集データ種別（要約）

| 種別 | Collected | Shared | 備考 |
|------|-----------|--------|------|
| **Financial info** → Other financial info | Yes | No | ポートフォリオ · 取引記録 · 端末内 AsyncStorage |
| **Personal info** → Other info（API キー） | Yes | Yes | SecureStore · OpenAI / Twelve Data / News / X へユーザー操作時のみ送信 |
| **Photos and videos**（OCR 任意） | Yes | Yes | image-picker 選択時 · OpenAI Vision へ送信 · 当方サーバー非保存 |
| **App activity** → In-app search history | Yes | No | 銘柄検索 · 端末内のみ |

#### 収集しない（No で回答）

Name · Email · User IDs · Location · Contacts · Device IDs · Crash logs SDK 等 — 詳細は submission package §1.6

#### セキュリティ · 削除

- Data encrypted in transit: **Yes**
- Deletion mechanism: **Yes** — Settings で API キー削除 · アプリ内リセット · アンインストール

- [ ] Data Safety 全項目入力 · **Submit**

### 1.4 Ads

**入力場所:** App content → Ads

- [ ] **No, my app does not contain ads**

### 1.5 Content Rating（IARC）

**入力場所:** App content → Content rating

| ガイダンス | 内容 |
|-----------|------|
| アプリ種別 | Finance · 参照 · 分析ツール |
| 暴力 · 成人向け | 該当なし |
| ブローカー / 取引実行 | **No** — 分析 · ポートフォリオ追跡のみ |
| 投資助言 | **No** — decision-support tool only |

- [ ] IARC アンケート完了 · レーティング取得

### 1.6 Target Audience

**入力場所:** App content → Target audience and content

- [ ] **13+**（COPPA 非対象 · 13 歳未満向けではない）
- [ ] **News app:** No
- [ ] **COVID-19 / Government / Health:** 該当なし · Skip

### 1.7 Financial features declaration

**入力場所:** App content → Financial features（§1.9）

| 項目 | **回答** |
|------|----------|
| App provides financial features? | **Yes** — portfolio tracking / analysis |
| Facilitates stock trading / order execution? | **No** |
| Personalized investment advice? | **No** — decision-support tool only |
| Broker / exchange affiliation? | **No** |

- [ ] Financial features 申告完了

### 1.8 Store Listing

**入力場所:** Grow → Store presence → Main store listing

#### App Name

```
Malaysia Stock AI Concierge
```

#### Short Description（79/80 文字 · EN）

```
AI concierge for Malaysia stocks. Portfolio insights & material analysis. Not a broker.
```

#### Full Description（EN）

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

#### グラフィック素材（リポジトリパス）

| 種別 | パス |
|------|------|
| App icon（512×512） | `assets/icon.png` |
| Feature graphic | `docs/store-assets/feature-graphic-1024x500.png` |
| Phone screenshots（5 枚） | `docs/store-assets/screenshots/phone/01-home.png` 〜 `05-settings.png` |

- [ ] App name · Short · Full description 入力
- [ ] Icon · Feature graphic · Screenshots アップロード
- [ ] Category: **Finance**
- [ ] Contact email: `k416my@gmail.com`

### 1.9 その他 App content（ブロッカー回避）

- [ ] Data safety · Financial features — §1.7 と整合
- [ ] Store listing のアプリ名に旧 Rakuten 表記なし
- [ ] スクリーンショットに旧アプリ名ラベルが写っていない

---

## 2. Dev 作業 — **2026-07-01 以降**（EAS quota リセット後）

> Owner は待機。以下は Dev 担当。

- [ ] `git pull origin cursor/top3-maxdd-capital-audit`
- [ ] `app.json` · `android.versionCode` 確認（現状 **27**）
- [ ] EAS ログイン: `npx eas-cli whoami`
- [ ] **production AAB ビルド:**

```powershell
cd c:\Users\k416m\Documents\Projects\stock-trading-assistant
npm run build:android:production -- --non-interactive --wait
```

- [ ] 成果物ダウンロード: `npx eas-cli build:download --platform android --profile production --latest`
- [ ] **versionCode 検証:** autoIncrement により **28** 見込み（Owner と整合確認）
- [ ] **Package:** `com.assistant.stocktrading`
- [ ] **App label:** `Malaysia Stock AI Concierge`
- [ ] **EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR:** `0`
- [ ] **スタンドアロン smoke**（Metro 不要）— 起動 · 言語切替 · 主要 5 タブ · expo-localization 17.0.9 同梱確認
- [ ] production `.aab` を Owner に共有（Internal testing upload 用）

**quota 枯渇時:** 2026-07-01 まで再試行しない。ローカル Windows Release は MAX_PATH で不可（EAS cloud のみ）。

---

## 3. 最終ステップ — **AAB 受領後**（Owner）

**パス:** Play Console → Release → Testing → Internal testing

### 3.1 AAB アップロード · リリース作成

- [ ] Dev から受け取った production AAB を確認（versionCode · package 名）
- [ ] **Create new release** → **Upload** `.aab`
- [ ] **Release name:** `1.0.0 (28)` — 実際の versionCode に合わせる
- [ ] **Release notes（EN 例）:**

```
Initial internal test release.
• Malaysia Stock AI Concierge — analysis & decision-support tool
• Not a broker app — no order execution
• Report issues to k416my@gmail.com
```

- [ ] **Review release** → エラー 0 件
- [ ] **Start rollout to Internal testing**

### 3.2 テスター設定

**パス:** Internal testing → Testers

- [ ] **Create email list** — 例: `internal-testers-v1`
- [ ] テスターメール追加（初回例: `k416my@gmail.com` + 実機テスター）
- [ ] Internal testing → Testers タブで list にチェック
- [ ] **How testers join** → Opt-in URL をコピー · テスターに送付

### 3.3 端末インストール確認

- [ ] テスターが Opt-in URL で参加
- [ ] Play Store からインストール
- [ ] アプリ起動 · ラベル = **Malaysia Stock AI Concierge**
- [ ] Status: **Available to internal testers**（審査: 通常数時間〜24h）

---

## 4. Owner 向け — 迷いやすい Console フィールド Q&A

| フィールド / 質問 | 回答例 |
|------------------|--------|
| **O1: Collect or share data?** | **Yes** — ポートフォリオ（Financial）· API キー（Personal）· OCR 画像（Photos）· 検索履歴（App activity） |
| **O5: Advertising ID?** | **No** — 広告 SDK なし |
| **O6: Account creation?** | **No** — ログイン · 当方アカウントなし |
| **O7: News app?** | **No** — ニュース**参照**はあるが、ニュースアプリ本体ではない |
| **Financial info — Shared?** | **No** — 当方サーバーへアップロードなし · 第三者販売なし |
| **Personal info（API keys）— Shared?** | **Yes** — ユーザー操作時のみ OpenAI / Twelve Data / News API / X API へ送信 |
| **Photos — OCR** | **Optional** · Collected=Yes · Shared=Yes（OpenAI Vision）· Ephemeral=Yes（当方サーバー非保存） |
| **Financial features — provides trading?** | **No** — portfolio tracking / analysis のみ |
| **Personalized investment advice?** | **No** — decision-support tool only |
| **Broker affiliation?** | **No** — Rakuten Trade · Bursa 等と無関係 |
| **Content rating — finance app** | 分析 · 参照ツール。**ブローカー · 注文実行アプリではない** と明記 |
| **Target audience** | **13+** · COPPA 非対象 |
| **Ads** | **No ads** |
| **Category** | **Finance** |

---

## 5. GitHub commit hash

| 項目 | 値 |
|------|-----|
| **Commit（本体）** | `211901d` — docs: add Play IT owner console waiting checklist until EAS quota reset |
| **Commit（HEAD）** | `bc6e64b` — docs: sync Play IT checklist HEAD to 7f055f2 |
| **Branch** | `cursor/top3-maxdd-capital-audit` |
| **Remote** | `https://github.com/k416my-blip/stock-trading-assistant.git` |

---

## 6. Push 結果

| 項目 | 値 |
|------|-----|
| **Push** | **success** — `f32e7a9..211901d`（本体） · `211901d..9feca69`（hash 追記） · `9feca69..bc6e64b`（HEAD 同期） → `origin/cursor/top3-maxdd-capital-audit` |

---

**新機能追加 · M2 i18n · Rakuten Import 追加検証は禁止。本チェックリストは EAS quota 復帰までの Owner Console 待機用。**
