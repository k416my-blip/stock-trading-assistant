# Stock Trading Assistant

React Native + Expo (TypeScript) app for **analysis and suggestions only**. It does not connect to brokers or execute trades — you place orders manually in your broker app.

## 起動手順（Expo Go）

### 前提

- Node.js 20 LTS 推奨
- 同一 Wi‑Fi 上の実機、または Android エミュレータ / iOS シミュレータ
- 実機テスト用に [Expo Go](https://expo.dev/go) をインストール

### 1. 依存関係のインストール

```bash
cd stock-trading-assistant
npm install
```

### 2. 開発サーバー起動

```bash
npx expo start
```

ターミナルに表示される QR コードを Expo Go でスキャンするか、`a`（Android）/ `i`（iOS）でエミュレータを起動します。

LAN でつながらない場合:

```bash
npx expo start --tunnel
```

### 3. 動作確認の目安（Expo Go）

| 機能 | Expo Go |
|------|---------|
| ホーム / 購入銘柄 / 株価更新 | 利用可 |
| AI コンシェルジュ | 利用可 |
| ローカル通知・プッシュ登録 | **無効**（クラッシュ回避のため意図的にスキップ） |
| API キー（SecureStore） | 利用可（読み込み失敗時は空キーにフォールバック） |

通知は `Constants.appOwnership === 'expo'` のとき `expo-notifications` を読み込みません（`src/utils/runtimeEnvironment.ts`）。

### 4. Development build（通知を有効にする場合）

Expo Go ではなく **development build** では、同じコードベースで通知が有効になります。

```bash
# 初回のみ（EAS CLI が未導入なら）
npm install -g eas-cli
eas build --profile development --platform android
# または ios
```

ビルドを端末にインストールしたうえで `npx expo start --dev-client` から接続してください。  
通知の権限要求・ローカル通知・バックグラウンド監視（`useNotificationMonitor`）が動作します。

### 5. 品質チェック（コミット前）

```bash
npm run typecheck
npm run lint
npm test
```

---

## Package 差分（初期スケルトンからの主な追加）

| パッケージ | 用途 |
|-----------|------|
| `expo-constants` | Expo Go / dev build の判定 |
| `expo-notifications` | ローカル通知（dev build のみ実行時ロード） |
| `expo-secure-store` | API キー等のシークレット保存 |
| `expo-speech` | AI コンシェルジュ音声読み上げ |
| `expo-haptics` | 緊急シグナルのバイブ |
| `react-native-gesture-handler` | ナビゲーション・ジェスチャ |
| `@expo/vector-icons` | アイコン |
| `vitest` / `babel-preset-expo` | テスト・Babel |

`npm test` は `npx tsx` で verify スクリプトを実行します（初回は tsx が自動取得されます）。

---

## Project structure

```
stock-trading-assistant/
├── App.tsx                 # Entry: providers + navigation
├── app.json                # Expo config (notifications plugin for dev builds)
├── package.json
├── assets/                 # App icons, splash, notification sounds
└── src/
    ├── constants/
    ├── context/            # AppContext, UrgencySignal, AiConcierge
    ├── components/
    ├── screens/
    ├── services/           # Pure logic (notifications lazy-loaded)
    ├── utils/              # runtimeEnvironment, portfolio helpers
    ├── theme/
    └── types/
```

## Feature map

| Feature | Location |
|--------|----------|
| Portfolio & holdings | `screens/PortfolioScreen.tsx` |
| AI concierge | `components/AiAssistantChat.tsx` |
| Urgency signals / trade queue | `components/AiTradeQueueSection.tsx` |
| Notifications (dev build) | `services/notificationService.ts` |
| Persistence guards | `services/portfolioPersistenceGuard.ts` |

## Architecture notes

- **Expo Go safe**: notifications module is dynamically imported only when `areNotificationsSupported()` is true.
- **No require cycles**: portfolio integrity in `utils/`, concierge enrich in `aiConciergeMessageEnrich.ts`.
- **Local-first**: mock / API 切替は AI 設定と API キーで制御。
- **No auto-trading**: disclaimers in `constants/disclaimers.ts`.

## Further docs

- [docs/GIT_COMMIT_PREP.md](docs/GIT_COMMIT_PREP.md) — 初回コミット用のステージング手順
- [docs/DEVICE_SMOKE_TEST_CHECKLIST.md](docs/DEVICE_SMOKE_TEST_CHECKLIST.md) — 実機スモーク
- [docs/AI_CONCIERGE_ARCHITECTURE.md](docs/AI_CONCIERGE_ARCHITECTURE.md) — コンシェルジュ設計
