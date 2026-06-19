# UX Implementation Phase A Report

| 項目 | 内容 |
|------|------|
| フェーズ | **Phase A — appUxMode 基盤 + Beginner 4タブ** |
| 実装コミット | `3aa64e0` |
| レポートコミット | `059df64` |
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
| 実機 adb | デバイス `FYRWXSNNAIOR9DCM` |
| Phase A APK | **versionCode 18** · `artifacts/preview-v18-phase-a.apk`（ローカル Gradle ビルド · 35.9 MB） |
| インストール | `adb install -r` **成功** |
| FAB（Beginner） | **非表示**（`fabVisibleInBeginner: false`） |

| # | ファイル | 内容 |
|---|----------|------|
| 1 | `docs/review/phase-a-screenshots/01-settings-beginner-mode.png` | 表示モード **初心者** 選択 · 3 択 UI |
| 2 | `docs/review/phase-a-screenshots/02-home-4-tabs.png` | タブ **4 つのみ**（ホーム/保有銘柄/銘柄チェック/AI相談） |
| 3 | `docs/review/phase-a-screenshots/03-stock-check-no-phase.png` | タイトル **銘柄チェック** · Phase 未取得時 |
| 4 | `docs/review/phase-a-screenshots/04-ai-consult-tab.png` | **AI相談** タブ · チャット UI |
| 5 | `docs/review/phase-a-screenshots/05-home-no-fab.png` | ホーム · Concierge FAB **なし** |

キャプチャスクリプト: `scripts/capture-phase-a-screenshots.mjs`  
メタ: `docs/review/phase-a-screenshots/capture-meta.json`

---

## 3. APK確認

| 項目 | 内容 |
|------|------|
| ビルド経路 | `C:\p\sta` 短パス · `gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` |
| Gradle | **BUILD SUCCESSFUL** |
| versionCode | **18**（`app.json` · `android/app/build.gradle`） |
| APK | `artifacts/preview-v18-phase-a.apk`（35,902,113 bytes · gitignore 対象） |
| 実機インストール | `adb install -r` → **Success** · `versionCode=18` 確認 |
| 検証日 | 2026-06-20 |

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
| レポートコミット | `059df64` — `docs(review): UX Phase A implementation report` |
| push 先 | `origin/cursor/top3-maxdd-capital-audit` |
| push 結果 | **成功** — 実装 `ce0e35f..3aa64e0`、レポート `3aa64e0..059df64` |

---

## 6. スコープ外（Phase A 以降）

- BeginnerTodayAdviceCard / オンボーディング 3 ステップ
- Portfolio「このまま持つ？」カード
- BeginnerConciergeQuickActions
- ホーム CTA 遷移 param 連携
