# Privacy Policy Report — Play Store Data Safety & Public Policy Draft

**作成日:** 2026-06-19  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**アプリ:** Rakuten Trade MY 助手 (`com.assistant.stocktrading`)  
**version:** 1.0.0 · versionCode 15（production EAS ビルド時 autoIncrement）

---

## 1. エグゼクティブサマリー

| 項目 | 状態 |
|------|------|
| アカウント登録 / ログイン | **なし** — ユーザーアカウントを運営側で収集しない |
| サーバー側データ保存 | **なし** — バックエンド DB なし（クライアント主体） |
| 必須 API キー | **なし** — ユーザーが任意で端末に保存 |
| 12h テスト monitor | **production ビルドでは無効** |
| Play Data Safety 入力 | 本レポート §3 を Console へ転記 |
| 公開 URL | **未ホスト** — §5 草案を GitHub Pages / Notion 等へ公開が必要 |

---

## 2. 現在のデータ収集内容（repo 監査）

### 2.1 端末ローカル保存

| データ種別 | 収集 | 保存先 | 暗号化 | 送信 |
|------------|------|--------|--------|------|
| API キー（OpenAI / Twelve Data / News / X 等） | 任意 · ユーザー入力 | expo-secure-store（`sta.secret.*`） | OS キーチェーン相当 | 各 API 呼び出し時のみ |
| ポートフォリオ · 約定 · 練習モード残高 | はい | AsyncStorage（`@sta/*`） | 端末ファイルシステム | **送信しない** |
| AI 設定 · 表示モード · ガイド進捗 | はい | AsyncStorage | 同上 | **送信しない** |
| 通知設定 · ローカル通知履歴 | はい | AsyncStorage | 同上 | **送信しない** |
| Forward validation / soak 記録 | 開発・検証用 | AsyncStorage | 同上 | **送信しない** |

**API キー UI:** 実キーは画面に表示しない（`設定済み（****last4）` マスク）。Commit24 参照。

### 2.2 ネットワーク送信（第三者サービス）

| 送信先 | 送信内容 | トリガー | 必須 |
|--------|----------|----------|------|
| **OpenAI** | ユーザー質問 · 銘柄コンテキスト · 分析プロンプト | AI コンシェルジュ / 材料分析 | 任意（キー未設定時は機能制限） |
| **Twelve Data** | 銘柄コード · 価格リクエスト | 株価更新 | 任意 |
| **News API** | 検索クエリ · 銘柄名 | ニュース材料 | 任意 |
| **X (Twitter) API** | 検索クエリ | SNS 材料 | 任意 |
| **Yahoo Finance** | 銘柄シンボル | 株価 · チャート | 不要（キーなし） |
| **KLSE Screener 等 HTML** | URL リクエスト | Bursa 四季報 · 開示 | 不要 |
| **Reddit RSS** | フィード URL | SNS 材料 | 不要 |

**注意:** 送信データにポートフォリオ全体を一括アップロードする設計ではない。AI 利用時はユーザー操作に紐づくコンテキストがプロンプトに含まれる場合がある。

### 2.3 収集しないデータ

| 項目 | 理由 |
|------|------|
| 氏名 · メール · 電話番号 | アカウント機能なし |
| 位置情報 | 未使用 |
| 連絡先 · 写真 · マイク録音ファイル | 未収集（音声入力は OS 経由 · 保存しない） |
| 広告 ID / 分析 SDK | Firebase Analytics 等 **未導入**（2026-06-19 監査時点） |
| 決済情報 | ブローカー連携なし |

### 2.4 Android 権限

| 権限 | 用途 |
|------|------|
| `WAKE_LOCK` | 長時間バックグラウンド監視（FGS 補助） |
| `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_DATA_SYNC` | 株価 · ニュース定期更新サービス |
| `POST_NOTIFICATIONS` | AI / 材料通知（ユーザー許可後） |

### 2.5 ビルドフレーバー別

| フレーバー | `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR` | 12h logcat telemetry |
|------------|----------------------------------------|----------------------|
| preview | `1` | 開発検証用 `[12H-MONITOR]` ログ |
| **production** | 空（無効） | **収集しない** |
| apk | 空（無効） | **収集しない** |

---

## 3. Google Play Data Safety 対応表

Play Console → **App content → Data safety** 入力用。最終判断はリリースオーナーが Console 上で確認すること。

### 3.1 収集するデータ

| Data type (Google) | Collected | Shared | Purpose | Optional | Encrypted in transit | Encrypted at rest | Delete request |
|--------------------|-----------|--------|---------|----------|----------------------|-------------------|----------------|
| **Financial info** — Other financial info | Yes | No | App functionality | N/A (local) | N/A | Device storage | User clears app data |
| **Personal info** — Other (API keys user-entered) | Yes | With third parties* | App functionality | Yes | Yes (HTTPS) | Yes (SecureStore) | In-app delete keys |
| **App activity** — In-app search history | Partial | No | App functionality | N/A | N/A | Local only | Clear app data |
| **App info** — Crash logs | No** | — | — | — | — | — | — |
| **Device ID** | No | — | — | — | — | — | — |

\* API キー自体は第三者に「販売」しない。ユーザー操作により OpenAI 等へリクエストが送信される。  
\*\* 専用クラッシュ SDK なし。OS / Play のデフォルトクラッシュ報告は Play Console 設定に従う。

### 3.2 収集しないと申告可能

- Email address, Name, Phone number  
- Location (precise / approximate)  
- Photos and videos  
- Contacts  
- User IDs (no login)  
- Advertising ID  

### 3.3 第三者 SDK（2026-06-19）

| SDK | データ | 備考 |
|-----|--------|------|
| Expo / React Native | 最小限 | 標準ランタイム |
| expo-secure-store | ローカルシークレット | 端末のみ |
| expo-notifications | 通知トークン（可能性） | FCM 経由 · 要 Console 確認 |
| Hermes | なし | JS エンジン |

### 3.4 データ削除

ユーザーは以下でデータを削除できる:

1. アプリ内「すべてリセット」（API キーはデフォルト保持 · 別途「すべての API キーを削除」あり）
2. Android 設定 → アプリ → ストレージ消去
3. アンインストール

---

## 4. 公開用プライバシーポリシー草案（日本語）

> **公開時:** `[EFFECTIVE_DATE]` · `[CONTACT_EMAIL]` · `[POLICY_URL]` を置換してホストすること。

---

### プライバシーポリシー

**Rakuten Trade MY 助手**（以下「本アプリ」）  
最終更新日: [EFFECTIVE_DATE]

#### 1. はじめに

本アプリは、マレーシア株（Bursa Malaysia）を中心とした投資分析・意思決定支援ツールです。  
**本アプリは Rakuten Trade および証券会社の公式アプリではなく、非提携です。**  
**注文の送信・自動売買は行いません。**

#### 2. 収集する情報

**(1) 端末内に保存する情報**

- ユーザーが入力した API キー（OpenAI、Twelve Data、News API、X API 等）— 暗号化ストレージに保存
- ポートフォリオ、約定記録、練習モードの取引データ
- アプリ設定、表示モード、通知設定

**(2) 第三者サービスへ送信する情報**

ユーザーが機能を利用した場合、以下のサービスへ HTTPS でリクエストを送信します。

- OpenAI（AI 分析・コンシェルジュ）
- Twelve Data、Yahoo Finance 等（株価）
- News API、X API、Reddit RSS 等（ニュース・SNS 材料）

送信内容は、銘柄コード、検索クエリ、ユーザーが入力した質問文等です。  
**当方が運営するサーバーに個人情報を蓄積する仕組みはありません。**

#### 3. 収集しない情報

- アカウント登録（メール、氏名、電話番号）は不要です
- 位置情報、連絡先、写真、広告 ID は収集しません

#### 4. 利用目的

- 株価・ニュース・AI 分析機能の提供
- ポートフォリオ管理（端末内）
- 通知の配信（ユーザー許可時）

#### 5. データの保存とセキュリティ

- API キーは端末の SecureStore に保存します
- その他のデータは端末内 AsyncStorage に保存し、当方サーバーへアップロードしません
- 通信は TLS（HTTPS）を使用します

#### 6. データの共有

当方はユーザーデータを第三者に販売しません。  
ユーザー操作に基づき、上記 API プロバイダへリクエストが送信されます。各サービスのポリシーもご確認ください。

#### 7. ユーザーの権利

- アプリ内設定から API キーを削除できます
- 「すべてリセット」でアプリデータを削除できます（API キーは別操作で削除可能）
- アンインストールで端末上のデータは削除されます（Android の仕様）

#### 8. 子どものプライバシー

本アプリは 13 歳未満を対象としていません。

#### 9. 変更

本ポリシーは必要に応じて更新します。重要な変更はアプリまたはストアページで告知します。

#### 10. お問い合わせ

[EFFECTIVE_DATE]  
[CONTACT_EMAIL]

---

## 5. Public Privacy Policy Draft (English — for Play Store)

**Rakuten Trade MY Assistant** — Last updated: [EFFECTIVE_DATE]

This app is an **analysis and decision-support tool** for Bursa Malaysia–focused investing. It is **not** affiliated with Rakuten Trade or any broker. **It does not place orders or automate trading.**

**What we store on your device**

- Optional API keys you enter (encrypted secure storage)
- Portfolio, trade records, and app settings (local storage only)

**What is sent over the network**

When you use features, requests may be sent to third-party APIs (OpenAI, Twelve Data, Yahoo Finance, News API, X API, etc.) including symbols, queries, and text you provide. **We do not operate a backend server that collects your personal profile.**

**What we do not collect**

- No account registration, email, name, or phone number
- No location, contacts, photos, or advertising ID

**Your choices**

- Delete API keys in Settings
- Clear app data or uninstall the app

Contact: [CONTACT_EMAIL]  
Policy URL: [POLICY_URL]

---

## 6. Play Console 入力チェックリスト

| # | 項目 | 状態 |
|---|------|------|
| 1 | Privacy policy URL 公開 | **未** — §4/§5 をホスト |
| 2 | Data safety フォーム入力 | **未** — §3 転記 |
| 3 | データ暗号化申告 | SecureStore + HTTPS |
| 4 | 第三者共有申告 | AI / market data APIs |
| 5 | アカウント削除 | N/A（アカウントなし）· アプリデータ削除手順を記載 |
| 6 | Families / COPPA | 13+ 想定 |
| 7 | Financial features declaration | 分析のみ · 執行なし |

---

## 7. 参照

- `docs/review/GOOGLE_PLAY_STORE_LISTING_MATERIALS_REPORT.md`
- `docs/review/COMMIT24_API_KEY_PERSISTENCE_AND_SAFE_STORAGE_REPORT.md`
- `docs/review/PHASE25_RELEASE_HARDENING_REPORT.md`
- `docs/review/PLAY_STORE_SUBMISSION_GUIDE.md`
- `src/constants/disclaimers.ts` · `src/constants/platformClarification.ts`

---

## GitHub sync

_(filled after commit/push)_
