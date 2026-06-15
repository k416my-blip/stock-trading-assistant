# API設定UI簡素化レポート

| 項目 | 値 |
|------|-----|
| 実施日 | 2026-06-14 |
| 対象画面 | `ApiKeySettingsScreen`（APIキー設定） |
| 関連監査 | [API_CONFIGURATION_AUDIT_REPORT.md](./API_CONFIGURATION_AUDIT_REPORT.md) |
| 目的 | 二重管理・誤設定を防ぎ、必須/任意 API を明確化する |

---

## 1. 変更概要

`ApiKeySettingsScreen` を **Twelve Data 専用 + 分析用キー混在** から、**必須 API と任意 API をセクション分けした統合ハブ** に再構成しました。

主な改善点:

1. **SNS APIキー欄を削除** — Settings の X API と同一ストレージの重複入力を廃止
2. **「決算APIキー」を「Finnhub APIキー」に改名** — 実際のサービス名（Finnhub）を UI に明示
3. **【必須】/【任意】セクションを追加** — OpenAI · Twelve Data を必須、NewsAPI · Reddit · Finnhub · X API を任意として整理
4. **OpenAI API を本画面に統合** — 接続テスト付きで一画面完結（AiSettings / Settings からも引き続き設定可）
5. **各フィールドに用途ヒント・保存状態表示** — 空欄保存=既存キー保持、マスク表示ルールをプレースホルダで明示

---

## 2. UI 構造（Before / After）

### Before（変更前）

```
APIキー設定（Twelve Data 株価・為替）
├── ヒーローカード（Twelve Data 登録手順）
├── Twelve Data APIキー（保存 · 接続テスト）
└── 分析用APIキー（任意）
    ├── ニュースAPIキー
    ├── Reddit Bearerトークン
    ├── 決算APIキー          ← Finnhub だが名称不明
    └── SNS APIキー           ← X API と重複
```

### After（変更後）

```
APIキー設定（必須・任意 API の登録）
├── ヒーローカード（OpenAI + Twelve Data 推奨 · 登録手順）
├── 【必須】
│   ├── OpenAI API（保存 · 接続テスト · キー取得リンク）
│   └── Twelve Data API（保存 · 接続テスト · キー取得リンク）
└── 【任意】
    ├── NewsAPI
    ├── Reddit
    ├── Finnhub APIキー
    ├── X API
    └── 任意キーを保存 / Finnhub 登録リンク
```

---

## 3. 削除したフィールドと理由

| 削除項目 | 理由 |
|----------|------|
| **SNS APIキー** | `snsApiKey` は X Bearer Token の **レガシー別名**。`loadAnalysisApiKeys()` が `snsApiKey` 未設定時に `xApiKey` を流用するため、Settings の **X API** と二重管理になる。新規入力は **X API** 欄（または Settings → X API）に一本化。 |

> **後方互換:** 既存端末に `snsApiKey` が保存されていても、読み込み時に `xApiKey` へフォールバックするロジックは `analysisApiKeys.ts` に残存。UI からの新規保存のみ廃止。

---

## 4. 必須 vs 任意 API マッピング

### 【必須】— 実運用分析の中核

| UI ラベル | 内部キー / Provider | SecureStore ID | 用途 |
|-----------|---------------------|----------------|------|
| OpenAI API | `aiApiKey` / `openai` | `sta.secret.ai_api_key` | AIコンシェルジュ · 材料要約 · 投資委員会 · 拡張分析 |
| Twelve Data API | `twelveDataApiKey` / `twelve_data` | `sta.secret.twelve_data_api_key` | 保有銘柄株価更新 · ポートフォリオ評価 · OHLCV |

未設定時: 主要 AI 機能および Twelve 経由の株価更新が停止または大幅劣化。

### 【任意】— 未設定でもアプリは動作

| UI ラベル | 内部キー | SecureStore ID | 未設定時の代替 |
|-----------|----------|----------------|----------------|
| NewsAPI | `newsApiKey` | `sta.secret.news_api_key` | Yahoo / Google / Bursa RSS + 参考推定ヘッドライン |
| Reddit | `redditApiKey` | `sta.secret.reddit_api_key` | Reddit RSS（`search.rss`） |
| Finnhub APIキー | `earningsApiKey`（+ `finnhubApiKey` 統合解決） | `sta.secret.earnings_api_key` | サンプル/推定ファンダメンタル · Finnhub 系機能スキップ |
| X API | `xApiKey` | `sta.secret.x_api_key` | X 材料スキップ · optional モード · RSS フォールバック |

任意キーは **「任意キーを保存」** ボタンで一括保存（空欄=既存キー保持）。

---

## 5. 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/screens/ApiKeySettingsScreen.tsx` | セクション分け UI · OpenAI 追加 · SNS 削除 · Finnhub 改名 · X API 追加 · 接続テスト/状態表示 |
| `src/constants/apiSettings.ts` | セクションタイトル · 各 API ヒント · URL 定数 · 初心者向け手順文言 |
| `docs/review/API_SETTINGS_UI_SIMPLIFICATION_REPORT.md` | 本レポート（新規） |

**変更なし（意図的）:**

- `src/services/analysisApiKeys.ts` — `snsApiKey` 読み込み/保存 API は後方互換のため維持
- `src/screens/SettingsScreen.tsx` — X API · Finnhub · 接続テスト等の既存ハブはそのまま

---

## 6. 実装メモ（型修正）

初回実装で `runTestAiApiConnection` を参照していたが、`AppContext` の公開名は `testAiApiConnection`。あわせて戻り値フィールドは `messageJa` を使用（`AiApiConnectionTestResult` 型準拠）。

---

## 7. ユーザー向け確認手順

1. アプリを起動し **APIキー設定** 画面を開く
2. **【必須】** セクションに OpenAI API · Twelve Data API が表示されること
3. **【任意】** セクションに NewsAPI · Reddit · Finnhub APIキー · X API が表示され、**SNS APIキーが無い** こと
4. 「決算APIキー」ではなく **「Finnhub APIキー」** と表示されること
5. OpenAI / Twelve Data で **保存** → **接続テスト** が動作すること
6. 任意キーを入力し **「任意キーを保存」** で保存されること（空欄保存で既存キーが消えないこと）
7. **設定（SettingsScreen）→ X API** でも引き続き X Bearer Token を設定・接続テストできること

---

## 8. SettingsScreen の X API について

**X API は Settings 画面でも引き続き利用可能です。**

| 画面 | X API の扱い |
|------|--------------|
| `ApiKeySettingsScreen` | 【任意】セクションの **X API** 欄 — 分析用一括保存 |
| `SettingsScreen` | **X API** 個別設定 + **search/recent 接続テスト** + X API 利用量画面への導線 |

両方とも同一の `xApiKey`（`sta.secret.x_api_key`）を参照します。接続テストや利用量確認は **Settings → X API** が正式路径です。ApiKeySettings 側では任意セクションの注記でこの関係を明示しています。

---

## 9. 検証結果

| チェック | 結果 |
|----------|------|
| 要件 1: SNS APIキー削除 | ✅ |
| 要件 2: 決算API → Finnhub APIキー | ✅ |
| 要件 3: 【必須】/【任意】セクション構成 | ✅ |
| 要件 4: 誤設定防止 UI（ヒント · 状態表示 · 空欄保持） | ✅ |
| 要件 5: 本レポート作成 | ✅ |
| Lint（編集ファイル） | ✅ エラーなし |
| `npm run typecheck`（編集ファイル） | ✅ ApiKeySettings 関連エラー解消（`storage.ts` の既存エラーは別件） |

---

## 10. 関連ドキュメント

- [API_CONFIGURATION_AUDIT_REPORT.md](./API_CONFIGURATION_AUDIT_REPORT.md) — 全 API の必須/任意 · 保存場所 · 使用箇所の監査
- [COMMIT24_API_KEY_PERSISTENCE_AND_SAFE_STORAGE_REPORT.md](./COMMIT24_API_KEY_PERSISTENCE_AND_SAFE_STORAGE_REPORT.md) — SecureStore 永続化・空欄保存ルール
