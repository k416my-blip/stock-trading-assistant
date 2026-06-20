# Play Internal Testing P0 — Execution Report

**作成日:** 2026-06-21  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**スコープ:** Play Internal Testing 投入準備（P0 のみ）  
**新機能追加:** **禁止**（Rakuten Import 実スクショ検証は後日）

---

## 1. エグゼクティブサマリー

| 判定 | 状態 |
|------|------|
| Play Internal Testing Ready | **NO** — P0 手動作業 3 件残 |
| 本レポートで完了 | ポリシー HTML · Data Safety 下書き · Store Listing 下書き · AAB 手順 · repo 監査 |
| ブロッカー | GitHub Pages 有効化（Owner）· production AAB（EAS quota · 2026-07-01 以降） |

---

## 2. 完了項目

| # | 項目 | 成果物 / 証跡 |
|---|------|---------------|
| P0-1a | プライバシーポリシー HTML 化（日英同一ページ · R3 OCR 追記） | `docs/legal/privacy-policy.html` |
| P0-1b | GitHub Pages 用ルートリダイレクト | `docs/privacy-policy.html` → `legal/privacy-policy.html` |
| P0-2 | Data Safety 入力用資料（下書き · §4） | 本レポート §4 |
| P0-3 | Store Listing 素材整理（下書き · §5） | 本レポート §5 · `GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md` 参照 |
| P0-4a | production ビルドコマンド · monitor=0 · debug 既定 OFF 監査 | 本レポート §6 |
| P0-4b | versionCode · EAS projectId 確認 | `app.json` versionCode **26** · projectId `70000a9b-cffc-4738-b615-3e10edb0b865` |
| — | 実行レポート提出 | 本ファイル |

---

## 3. 未完了項目

| # | 項目 | 理由 | 次アクション |
|---|------|------|-------------|
| 1 | **Privacy Policy 公開 URL の HTTPS 200 確認** | GitHub Pages 未設定（repo push のみ） | Owner: Settings → Pages → Source **Deploy from branch · /docs** |
| 2 | **Play Console Data Safety フォーム入力** | Console 手動作業 | §4 を Console に転記 |
| 3 | **Store 素材の実ファイル upload** | Feature Graphic · 正式スクショ未 export | §5 手順 · v26 実機キャプチャ |
| 4 | **production AAB 生成** | EAS Free quota · production ビルド履歴 **0 件** | **2026-07-01** 以降 §6 実行 |
| 5 | **Internal Testing 初回 upload** | AAB 依存 | AAB 取得後 Play Console |
| 6 | **ストア正式アプリ名確定** | Rakuten 表記リスク | Owner 法務/ブランド判断 |
| 7 | **Rakuten Import Buy/Sell/Dividend/Withdrawal 実スクショ検証** | ユーザー指示で後日 | Play IT 優先のため保留 |

---

## 4. 必要な手動作業（Owner / Dev）

### 4.1 GitHub Pages 有効化（Owner · 約 5 分）

1. https://github.com/k416my-blip/stock-trading-assistant/settings/pages
2. **Build and deployment → Source:** Deploy from a branch
3. **Branch:** `cursor/top3-maxdd-capital-audit`（または merge 後の default）· **Folder:** `/docs`
4. Save → 数分待機
5. 確認:
   ```powershell
   curl -I https://k416my-blip.github.io/stock-trading-assistant/privacy-policy.html
   curl -I https://k416my-blip.github.io/stock-trading-assistant/legal/privacy-policy.html
   ```
6. Play Console → **App content → Privacy policy** に canonical URL を登録

### 4.2 Play Console Data Safety（Owner · 30 分）

§4 下書きを転記。ポリシー URL と整合させる。

### 4.3 Store Listing · グラフィック（Dev + Owner）

§5 のドラフトを Console に貼付。Feature Graphic 1024×500 を作成 upload。

### 4.4 production AAB（Dev · 2026-07-01 以降）

§6 手順。quota 回復後 **1 回** production ビルドを優先。

### 4.5 サポートメール確認（Owner）

本レポートでは EAS アカウント `k416my@gmail.com` を暫定採用。Play Console 用に正式メールを確定すること。

---

## 5. Privacy Policy URL

| 項目 | 値 |
|------|-----|
| **Canonical（推奨）** | `https://k416my-blip.github.io/stock-trading-assistant/legal/privacy-policy.html` |
| **短縮リダイレクト** | `https://k416my-blip.github.io/stock-trading-assistant/privacy-policy.html` |
| **ソースファイル** | `docs/legal/privacy-policy.html` |
| **最終更新日** | 2026-06-21 |
| **連絡先（暫定）** | k416my@gmail.com |
| **公開状態（本レポート時点）** | **未確認** — Pages 有効化待ち |

**R3 追記内容（ポリシーに反映済み）:**

- `READ_MEDIA_IMAGES` / expo-image-picker — ユーザー選択の Rakuten 取引履歴スクショのみ
- OCR 実行時 OpenAI Vision API へ画像（base64）送信 — 当方サーバー非経由
- OCR 元画像の永続保存なし · 確定取引行のみ端末内保存

---

## 6. Data Safety 下書き（Play Console 転記用）

> 最終申告は Owner が Console 上で確認すること。2026-06-21 · versionCode 26 監査ベース。

### 6.1 データ収集サマリー

| 区分 | 内容 |
|------|------|
| **アカウント** | なし（ログイン・ユーザー ID なし） |
| **当方サーバー保存** | なし |
| **端末ローカル保存** | ポートフォリオ · 約定 · 設定 · API キー（SecureStore）· 確定インポート取引 |
| **暗号化** | 転送: HTTPS · 静止: SecureStore（API キー）· その他 AsyncStorage（OS FS） |

### 6.2 収集データ詳細

| Google Data type | Collected | Shared with third parties | Purpose | Optional | Notes |
|------------------|-----------|---------------------------|---------|----------|-------|
| **Financial info — Other financial info** | Yes | No | App functionality | — | ポートフォリオ · 約定 · ローカルのみ |
| **Personal info — Other** (user-entered API keys) | Yes | Yes* | App functionality | Yes | *OpenAI/Twelve/News/X へリクエスト時 |
| **Photos and videos** | Ephemeral access | Yes** | App functionality | Yes | **OCR 時のみ · ユーザー選択画像 → OpenAI Vision |
| **App activity — In-app search history** | Partial | No | App functionality | — | ローカル検索/表示履歴程度 |
| **Device or other IDs** | No | — | — | — | 広告 ID なし |
| **Location** | No | — | — | — | |
| **Email / Name / Phone** | No | — | — | — | アカウントなし |

\* 販売・共有ではなく、ユーザー操作に基づく API 呼び出し。  
\** OCR 機能利用時のみ。画像は当方サーバーに保存しない。

### 6.3 外部送信先一覧

| 送信先 | 送信内容 | トリガー | 必須 |
|--------|----------|----------|------|
| **OpenAI** | 質問文 · 分析プロンプト · 銘柄コンテキスト · **OCR 用画像（base64）** | AI コンシェルジュ / 材料分析 / Rakuten OCR | 任意（キー未設定時機能制限） |
| **Twelve Data** | 銘柄コード · 価格リクエスト | 株価更新 | 任意 |
| **News API** | 検索クエリ | ニュース材料 | 任意 |
| **X API** | 検索クエリ | SNS 材料 | 任意 |
| **Yahoo Finance** | シンボル | 株価 | 不要（キーなし） |
| **KLSE Screener 等** | URL | 四季報 HTML | 不要 |

### 6.4 API キー

| 項目 | 申告 |
|------|------|
| 収集 | ユーザーが設定画面で任意入力 |
| 保存 | expo-secure-store（端末のみ） |
| 表示 | マスク（`****last4`） |
| 削除 | 設定 → 個別削除 · 全削除 · アプリデータ消去 |

### 6.5 画像 OCR（Rakuten Import R3）

| 項目 | 申告 |
|------|------|
| 権限 | `READ_MEDIA_IMAGES` |
| 取得 | ユーザーが image-picker でスクショを**明示選択** |
| 端末保存 | OCR 元画像は永続保存しない |
| OpenAI 送信 | **あり** — Vision API（`input_image` + base64 data URL） |
| 送信条件 | ユーザーが OCR 実行 · OpenAI API キー設定済み |
| 解析結果 | ユーザー確認後、取引候補として AsyncStorage |

### 6.6 収集しないと申告可能

- Email, Name, Phone, Location, Contacts, Advertising ID  
- 専用クラッシュ/analytics SDK（Firebase Analytics 等未導入）

### 6.7 データ削除

1. アプリ内「すべてリセット」  
2. 設定 → API キー個別削除  
3. Android → アプリ → ストレージ消去 / アンインストール  

### 6.8 第三者 SDK

| SDK | 備考 |
|-----|------|
| Expo / React Native | 標準ランタイム |
| expo-secure-store | 端末シークレット |
| expo-notifications | FCM トークン（可能性 — Console で要確認） |
| expo-image-picker | ユーザー選択画像の一時読取 |
| Hermes | JS エンジン · データ収集なし |

---

## 7. Store Listing 下書き

### 7.1 アプリ名候補

| 案 | 備考 |
|----|------|
| 現行 `Rakuten Trade MY 助手` | `app.json` 現行 · **提携誤解リスク高** — Play 掲載名変更推奨 |
| `Stock Analysis Assistant MY` | 英語 · 中立 |
| `AI投資分析アシスタント（MY株）` | 日本語 · 分析支援明示 |

**推奨:** Internal Testing 前に Owner が Play 掲載名を確定（説明文に非提携声明必須）。

### 7.2 短い説明（80 字目安 · JA）

```
Bursa・米国・香港株の分析支援。AIコンシェルジュと材料分析で判断を整理。注文は証券会社アプリで。
```

### 7.3 長い説明（構成案 · JA）

1. **目的** — マレーシア株中心の分析支援 · **非公式 · 非提携**  
2. **主要機能** — AI四季報 · 材料分析 · AIコンシェルジュ · 保有管理 · 練習モード · Rakuten 取引履歴インポート（手入力/NL/OCR）  
3. **対応市場** — Bursa 中心 · US/HK 参考  
4. **使い方** — 証券会社で約定 → アプリに記録 · 分析のみ  
5. **免責** — 投資助言ではない · データ欠損あり · AI 限界  
6. **非提携声明** — Rakuten Trade / 証券会社公式アプリではない  

**末尾免責（素材）:**

```
本アプリは Rakuten Trade その他証券会社の公式アプリではなく、提携・後援も受けていません。
投資助言を提供するものではなく、参考情報に基づく分析支援ツールです。
すべての投資判断と取引実行はユーザー自身の責任で行ってください。
```

### 7.4 スクリーンショット候補（7 枚推奨）

| # | 画面 | 取得元候補 |
|---|------|-----------|
| 1 | 保有銘柄 | `docs/review/final-evidence-device/02-portfolio-holdings.png` 等 |
| 2 | 材料分析 | `docs/review/final-review-v2-device/03-material-analysis.png` |
| 3 | AIコンシェルジュ | `docs/review/final-review-v2-device/04-ai-concierge.png` |
| 4 | AI四季報 | 銘柄詳細キャプチャ（要 v26 再取得） |
| 5 | 市場監視 | `docs/review/final-review-v2-device/08-market-monitoring.png` |
| 6 | 設定（分析支援） | `docs/review/final-review-v2-device/11-settings.png` |
| 7 | 初心者ガイド / リスク告知 | 要キャプチャ |

**注意:** 多くの PNG は `.gitignore` 対象 · Play upload 用に `docs/store-assets/screenshots/phone/` へ export 推奨。

### 7.5 Feature Graphic 要件

| 項目 | 値 |
|------|-----|
| サイズ | **1024 × 500 px** · JPG または 24-bit PNG（アルファなし） |
| 背景 | `#0f1419`（アプリテーマ） |
| 文案案 | アプリ名 + 「Bursa 分析支援 · AI コンシェルジュ · 非公式ツール」 |
| 禁止 | 成果保証 · 提携暗示 · 注文執行表現 |
| 保存先（提案） | `docs/store-assets/feature-graphic-1024x500.png` |
| 状態 | **未作成** |

### 7.6 サポートメール

| 項目 | 値 |
|------|-----|
| 暫定 | k416my@gmail.com（EAS `k416my` アカウント · ポリシー HTML に記載） |
| Play Console | **未登録** — Owner が正式メールを確定して Console に入力 |

---

## 8. Production AAB 準備状況

### 8.1 EAS アカウント · quota

| 項目 | 値 |
|------|-----|
| アカウント | `k416my` · k416my@gmail.com |
| Project ID | `70000a9b-cffc-4738-b615-3e10edb0b865` |
| production ビルド履歴 | **0 件** |
| 直近 Android ビルド | preview · versionCode 15 · 2026-06-16 完了 |
| quota 状態 | **production 未実行** — 計画上 2026-07-01 Free tier リセット後に初回 build 推奨（`PLAY_INTERNAL_TESTING_EXECUTION_PLAN.md` §P0-4） |

### 8.2 ビルド設定監査（repo · 変更なし）

| 項目 | production | preview |
|------|------------|---------|
| `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR` | `"0"` | `"1"` |
| `buildType` | `app-bundle` | `apk` |
| `distribution` | `store` | `internal` |
| `autoIncrement` | `true` | `false` |
| 署名 | EAS remote keystore | 同上 |

### 8.3 monitor 無効 · debug 非表示

| 項目 | 状態 |
|------|------|
| 12h monitor | `twelveHourTestMonitor.ts` — `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR === '1'` のみ有効 · production は `"0"` |
| AI Concierge debug | `aiPreferencesStorage.ts` 既定 `aiConciergeDebugMode: false` |
| Debug UI | `ConciergePromptDebugPanel` — debug トグル ON 時のみ表示 · production 一般ユーザーは非表示 |

### 8.4 versionCode

| 項目 | 値 |
|------|-----|
| `app.json` | **26** |
| 次回 production EAS | `autoIncrement: true` → **27** 見込み（ビルド後 `app.json` 同期確認） |

### 8.5 AAB 生成手順

```powershell
cd c:\Users\k416m\Documents\Projects\stock-trading-assistant

# 最新コード
git pull origin cursor/top3-maxdd-capital-audit
git log -1 --oneline

# EAS ログイン確認
npx eas-cli whoami

# production AAB（quota 利用可能時）
npm run build:android:production -- --non-interactive --wait

# artifact ダウンロード
npx eas-cli build:download --platform android --profile production --latest

# Play Internal Testing upload（いずれか）
npx eas-cli submit -p android --profile production --latest
# または Play Console → Internal testing → Upload AAB
```

**ビルド後検証（P1）:**

- logcat で `[12H-MONITOR]` **0 行**
- API キー永続化 smoke
- versionCode · package `com.assistant.stocktrading` 確認

---

## 9. GitHub commit hash · push 結果

| 項目 | 値 |
|------|-----|
| **Commit** | *(push 後に更新 — 下記 §10 実行結果)* |
| **Branch** | `cursor/top3-maxdd-capital-audit` |
| **Remote** | `https://github.com/k416my-blip/stock-trading-assistant.git` |
| **Push** | *(push 後に更新)* |

**本コミット対象ファイル:**

- `docs/legal/privacy-policy.html`（新規）
- `docs/privacy-policy.html`（新規 · Pages ルート用）
- `docs/review/PLAY_INTERNAL_TESTING_P0_EXECUTION_REPORT.md`（新規）

---

## 10. 参照

| ファイル | 用途 |
|----------|------|
| `docs/review/PRIVACY_POLICY_REPORT.md` | ポリシー/Data Safety 原稿（OCR 追記前版） |
| `docs/review/PLAY_INTERNAL_TESTING_EXECUTION_PLAN.md` | P0 チェックリスト · Pages 手順 |
| `docs/review/GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md` | Store 素材詳細 |
| `eas.json` · `app.json` | ビルド · 権限 · versionCode |
| `src/services/rakutenImport/transactionHistoryVisionOcr.ts` | OCR → OpenAI 送信実装 |

---

## 11. 次の優先順位

1. **Owner:** GitHub Pages 有効化 → Privacy URL 200 確認 → Play Console 登録  
2. **Owner:** Data Safety フォーム入力（§6）  
3. **Dev:** Feature Graphic + スクショ export（v26 実機）  
4. **Dev:** 2026-07-01 以降 production AAB → Internal Testing upload  
5. **後日:** Rakuten Import Buy/Sell/Dividend/Withdrawal 実スクショ OCR 検証  

**新機能追加は Play Internal Testing 初回 upload 完了まで禁止。**
