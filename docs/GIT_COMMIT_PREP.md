# Git コミット準備

リポジトリは **まだ初回コミット前** です。古いスケルトンだけがステージされ、実装の大半は未ステージ / 未追跡です。以下の手順で 1 本の初期コミットにまとめることを推奨します。

## コミットに含めないもの

`.gitignore` で除外済み:

- `node_modules/`, `.expo/`, `.env`, `.env.example`（ローカル用テンプレートは git 管理外）
- `expo-go-qr.png`（ローカル生成 QR）
- `audit-out.txt`

含めない推奨（任意）:

- `.cursorignore` — エディタ用
- `.vscode/` — チームで共有する場合のみ `git add`

## ステージング手順（PowerShell）

```powershell
cd stock-trading-assistant

# 古い部分ステージをいったん解除
git reset

# 除外ルールを反映したうえで全体をステージ
git add -A
git status

# 意図しないファイルがあれば除外
# git reset HEAD expo-go-qr.png
```

`git status` で **staged** がアプリ本体・`tests/`・`docs/`・`assets/sounds/`・`.github/` などになっていることを確認してください（`.env.example` は含まれないこと）。

テストの API キーは `tests/helpers/dummyCredentials.ts` の `DUMMY_API_KEY` を使用します。pre-commit は `sk-` 形式の文字列をブロックします。

## 推奨コミットメッセージ（単一コミット）

```
feat: personal stock assistant with AI concierge and Expo Go support

- Portfolio, market data, practice mode, and persistence guards
- AI strategy concierge, urgency signals, and trade queue UX
- Disable expo-notifications in Expo Go; enable in development builds
- SecureStore corruption recovery; break require cycles via utils
- Vitest unit tests and tsx release verify scripts
```

## 論理分割する場合（複数コミット）

| 順序 | 内容 | 主なパス |
|------|------|----------|
| 1 | 基盤・ナビ・永続化 | `App.tsx`, `src/context/`, `src/services/storage*`, `package.json` |
| 2 | ポートフォリオ・市場データ | `src/services/portfolio*`, `src/screens/Portfolio*` |
| 3 | AI・コンシェルジュ・緊急シグナル | `src/components/Ai*`, `src/services/ai*` |
| 4 | 通知・Expo Go ガード | `notificationService.ts`, `runtimeEnvironment.ts` |
| 5 | テスト・ドキュメント | `tests/`, `docs/`, `README.md` |

## package.json 差分サマリー

**dependencies 追加**

- `@expo/vector-icons`, `expo-constants`, `expo-haptics`, `expo-notifications`, `expo-secure-store`, `expo-speech`, `react-native-gesture-handler`

**devDependencies 追加**

- `babel-preset-expo`, `vitest`

**scripts 追加**

- `typecheck`, `test`, `test:unit`, `test:integration`, `verify:*`

## コミット前チェック

```bash
npm run typecheck
npm run lint
npm test
```

Expo Go でホーム・保有・株価・AI コンシェルジュを再確認し、通知設定画面で権限ダイアログが **出ない** こと（Expo Go）を確認してください。
