# Commit24 — API Key Persistence and Safe Storage Report

## 実施概要

| 項目 | 値 |
|------|-----|
| 実施日時 (MYT / UTC+8) | 2026-06-13 21:05 頃 |
| 目的 | APIキーが再起動・設定画面操作・リセット後に空になる問題を修正 |
| 3h rerun | **未開始**（本タスク範囲外） |
| preview APK | **v6 再ビルド必要**（アプリ側変更のため · 現実機 v5 には未反映） |

---

## 1. APIキーが空になる原因（特定結果）

| 原因 | 深刻度 | 説明 |
|------|--------|------|
| **設定画面が実キーを TextInput にロード** | **高** | `SettingsScreen` / `ApiKeySettingsScreen` / `AiSettingsScreen` が `loadAllApiKeys()` / `safeGetApiKey()` の戻り値を入力欄にセット。context 同期 useEffect が空値で上書きするレース、空欄保存操作の誤解を誘発 |
| **「すべてリセット」が APIキーも削除** | **高** | `resetAllAppData(true)` 固定 + `clearAllPersistedAppData` が `clearApiKeys` 引数を無視し常に `deleteAllSecretsWithReport()` 実行 |
| **SecureStore 読取失敗時の自動 purge** | **中** | `secretStorage.safeGetSecureItem` が corruption 疑いで `deleteItemAsync` — 読取不能と削除を混同 |
| **adb install -r / 再インストール** | 低（仕様） | Android は同一署名・同一 package の `-r` なら SecureStore / app data 通常保持。完全アンインストールは消える（仕様） |
| **Commit23 stability mode** | なし | キー削除ではなく UI 抑制のみ |

---

## 2. 修正内容

### 2.1 空値上書き防止（既存 + 強化）

- `safeApiKey` / `secretStorage.setSecret` — 空文字保存時は既存キーを保持（変更なし · 再確認済）
- 設定画面 — **draft 入力のみ**保存対象。空欄保存 = skip

### 2.2 設定 UI — 実キー非表示

- 新規 `src/services/apiKeyUiState.ts` — `loadApiKeyConfiguredStatus` / `formatConfiguredStatusLine`
- 表示: **設定済み（****last4）** / **未設定**
- TextInput は常に空 draft 開始 · 保存後 draft クリア

### 2.3 リセット分離

- `clearAllPersistedAppData(clearApiKeys)` — `false` 時は SecureStore + レガシー API AsyncStorage を**保持**
- `resetAllAppData(false)` — 「すべてリセット」は **APIキー保持**
- 新規 **「すべてのAPIキーを削除」** — 二段確認 · `deleteAllApiKeysUserConfirmed(true)` のみ削除

### 2.4 SecureStore 読取

- corruption 疑いでも **自動 purge しない**（明示削除のみ）

### 2.5 Context 再読込

- `reloadStoredApiKeys()` — 保存 / 削除後に context を storage から再同期

---

## 3. 保存先

| API | SecureStore key (`SECRET_KEYS`) | レガシー AsyncStorage |
|-----|--------------------------------|----------------------|
| OpenAI | `sta.secret.ai_api_key` | `@sta/ai_api_key` |
| Twelve Data | `sta.secret.twelve_data_api_key` | `@sta/twelve_data_api_key` |
| News API | `sta.secret.news_api_key` | `@sta/news_api_key` |
| X Bearer | `sta.secret.x_api_key` | `@sta/x_api_key` |
| Reddit | `sta.secret.reddit_api_key` | `@sta/reddit_api_key` |
| SNS / Earnings / 他 | 各 `sta.secret.*` | 各 `@sta/*` |

---

## 4. 変更ファイル

| ファイル | 変更 |
|----------|------|
| `src/services/apiKeyUiState.ts` | **新規** — 設定済み状態 + マスク表示 |
| `src/services/storage.ts` | reset 時 APIキー保持オプション |
| `src/services/apiKeys.ts` | `deleteAllApiKeysUserConfirmed` |
| `src/services/secretStorage.ts` | 読取失敗時 auto-purge 停止 |
| `src/context/AppContext.tsx` | reset 分岐 · `reloadStoredApiKeys` |
| `src/screens/SettingsScreen.tsx` | draft UI · reset 分離 · 全キー削除ボタン |
| `src/screens/ApiKeySettingsScreen.tsx` | draft UI · マスク表示 |
| `src/screens/AiSettingsScreen.tsx` | OpenAI draft UI · マスク表示 |
| `tests/unit/apiKeyPersistence.test.ts` | **新規** |

---

## 5. 仕様

### 空値上書き防止

- 入力欄空 · マスク · 10文字未満 → **保存 skip · 既存キー保持**

### 明示的削除

- 各 provider「削除」ボタン · 「すべてのAPIキーを削除」（二段確認）のみ

### reset 処理

| 操作 | APIキー |
|------|---------|
| すべてリセット | **保持** |
| すべてのAPIキーを削除 | **削除**（アプリデータは保持） |

### 長時間テスト（Commit23 継続）

- stability test build: Alert/modal **非表示** · `apiKeyDialogAppeared=0` 期待
- telemetry: `NOT_CONFIGURED` / `WARN` のみ · **実キーなし**

---

## 6. 実キーのログ非露出

- `safeApiKey` — `logLoad` は `{ exists, length }` のみ
- `apiKeyUiState` — UI は `maskSecret` のみ
- テストログ — マスク済み表示行に raw key 非包含を assert

---

## 7. テスト結果

```text
npm run typecheck — PASS
vitest:
  safeApiKey.test.ts — 6/6 PASS
  apiKeyPersistence.test.ts — 5/5 PASS
  phase125StabilityTestMode.test.ts — 3/3 PASS
```

---

## 8. 実機確認（方針）

| 項目 | 状態 |
|------|------|
| preview APK v5（現実機） | Commit24 **未反映** |
| 必要 action | **preview APK v6 再ビルド + 再インストール** |
| 確認手順（v6 後） | キー入力→保存→force-stop→再起動→「設定済み」表示 · 設定画面開閉 · price refresh 後も保持 |

---

## 9. 3h rerun を開始してよいか

| 判定 | 内容 |
|------|------|
| **まだ NO** | Commit24 を v6 APK に反映してから。手順: v6 build → install → キー保存 smoke → 3h 開始前チェック |
| Commit23 項目 | v5 で smoke 済み（`apiKeyDialogAppeared=0`）— v6 でも再確認推奨 |

---

## 10. GitHub 同期

| 項目 | 値 |
|------|-----|
| commit | （push 後に記載） |
| push | 実施予定 |
| remote 同期 | push 後 **0 / 0** 確認 |
| secret scan | 変更 diff に `sk-` / 実キー pattern **なし** |
| .env / credentials | **git add なし** |

---

## 11. 次のアクション

1. preview APK **v6** EAS build（`versionCode=6` bump）
2. 実機 install + APIキー永続化 smoke
3. 3h rerun 開始前チェック（前回レポート手順）
4. 3h rerun 本番開始（ユーザー承認後）
