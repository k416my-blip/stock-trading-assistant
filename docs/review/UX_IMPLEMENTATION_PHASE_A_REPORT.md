# UX Implementation Phase A Report

| 項目 | 内容 |
|------|------|
| フェーズ | **Phase A — appUxMode 基盤 + Beginner 4タブ** |
| 実装コミット | `3aa64e0` |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 日付 | 2026-06-20 |

---

## 1. 実装内容

### 1.1 appUxMode（Beginner / Standard / Pro）

- 新規型 `AppUxMode` と AsyncStorage キー `@sta/app_ux_mode_v1`
- 初回読込時に `conciergeUxMode` + `investmentDisplayMode` からマイグレーション（UX1.1 マッピング）
  - **beginner** ← trust\|beginner + concierge beginner
  - **standard** ← 新規インストール既定 / その他レガシー
  - **pro** ← pro または concierge advanced
- `AppUxModeProvider` / `useAppUxMode()` — `App.tsx` で `AppProvider` 直下にマウント
- モード変更時にレガシー `aiPreferences` を双方向同期
- **設定** 画面最上部に 3 択セレクタ（初心者 / 標準 / プロ）

**新規ファイル**

| ファイル | 役割 |
|----------|------|
| `src/types/appUxMode.ts` | 型定義 |
| `src/constants/appUxMode.ts` | ラベル・ヒント |
| `src/services/appUxModeStorage.ts` | load/save/migrate/sync |
| `src/context/AppUxModeContext.tsx` | Provider + hook |
| `tests/unit/appUxMode.test.ts` | マイグレーション・タブ設定ユニットテスト |

**変更ファイル**

| ファイル | 変更 |
|----------|------|
| `src/constants/storageKeys.ts` | `appUxMode` キー追加 |
| `src/screens/SettingsScreen.tsx` | 表示モード 3 択 UI |
| `App.tsx` | `AppUxModeProvider` 追加 |

### 1.2 Beginner 4タブ Navigator

- `src/navigation/beginnerTabNavigatorConfig.ts` — モード別タブ可視性
- **Beginner（4タブ）:** ホーム · 保有銘柄 · 銘柄チェック · AI相談
- **Standard（8タブ）:** 上記 + おすすめ配分 · 銘柄検索 · 今日の売買 · 売買履歴
- **Pro（12タブ）:** 現行 11 タブ + AI相談
- `ConciergeConsult` タブ追加 — `ConciergeTabScreen.tsx`（`AiAssistantChat` inline）
- `MainTabNavigator.tsx` — `appUxMode` でタブ非表示 + ラベル上書き（材料分析 → 銘柄チェック）

### 1.3 Phase13–24 Beginner 完全非表示

- `MaterialAnalysisScreen.tsx` / `StockMaterialCard`
- `appUxMode === 'beginner'` 時、Phase13–Phase22.2 ブロックを DOM から除外（折りたたみなし）
- ページタイトルも「銘柄チェック」に変更

### 1.4 Concierge FAB 非表示（Beginner）

- `AiConciergeOverlay.tsx` — `isBeginnerMode` 時 `AiConciergeFab` 非表示（AI相談タブで代替）

---

## 2. スクリーンショット

| 項目 | 結果 |
|------|------|
| 実機 adb | デバイス `FYRWXSNNAIOR9DCM` 接続確認 |
| Phase A ビルド APK | **未インストール** — 本コミット後の preview APK は未ビルド |
| スクリーンショット | **未取得** — 新ビルドなしのため UI キャプチャ不可 |

### 手動確認手順（次ビルド後）

1. 設定 → 表示モード → **初心者** を選択
2. タブが 4 つのみ（ホーム / 保有銘柄 / 銘柄チェック / AI相談）であること
3. 右下 Concierge FAB が **非表示** であること
4. 銘柄チェック → 銘柄カードに Phase13–24 見出しが **存在しない** こと
5. AI相談タブでチャット入力 UI が表示されること
6. 表示モード → **プロ** に切替 → 全タブ + FAB 復帰

---

## 3. APK確認

| 項目 | 内容 |
|------|------|
| ビルドコマンド | `npm run build:android:apk`（EAS profile `apk`） |
| 実行 | **未実行**（Play IT 準備と並行のため Phase A コードのみ先行） |
| アプリ version | `package.json` `1.0.0`（preview ビルド番号は EAS 依存） |

---

## 4. テスト

| コマンド | 結果 |
|----------|------|
| `npx vitest run tests/unit/appUxMode.test.ts` | **6/6 PASS** |
| `npm run typecheck` | 既存 TS エラー 5 件（本 Phase A 変更由来ではない） |

---

## 5. Git

| 項目 | 値 |
|------|-----|
| 実装コミット | `3aa64e0` — `feat(ux): Phase A appUxMode and beginner 4-tab navigator` |
| レポートコミット | （本ファイルコミット後に追記） |
| push 先 | `origin/cursor/top3-maxdd-capital-audit` |
| push 結果 | **成功** — `ce0e35f..3aa64e0` |

---

## 6. スコープ外（Phase A 以降）

- BeginnerTodayAdviceCard / オンボーディング 3 ステップ
- Portfolio「このまま持つ？」カード
- BeginnerConciergeQuickActions
- ホーム CTA 遷移 param 連携
