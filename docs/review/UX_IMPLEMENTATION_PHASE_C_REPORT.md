# UX Implementation Phase C Report

| 項目 | 内容 |
|------|------|
| フェーズ | **Phase C — 初回オンボーディング · 理由3行 · 気をつける点 · BeginnerStockSummaryCard** |
| 実装コミット | `8b556d2` |
| レポートコミット | `522c3ae` |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 日付 | 2026-06-20 |

---

## 1. 実装内容

### 1.1 初回オンボーディング（3 ステップ · UX1.1 §4.2）

| ファイル | 役割 |
|----------|------|
| `src/constants/storageKeys.ts` | `@sta/beginner_onboarding_seen_v1` |
| `src/services/beginner/beginnerOnboardingStorage.ts` | seen フラグ load/save/clear |
| `src/components/beginner/BeginnerOnboardingModal.tsx` | Step1 ようこそ · Step2 4タブ · Step3 アドバイスプレビュー |
| `src/navigation/MainTabNavigator.tsx` | `isBeginnerMode && !seen` でモーダル表示 · スキップ/完了で seen 保存 |

**フロー:** 初心者モード初回起動 → 3 ステップオーバーレイ → 「ホームではじめる」または Step1「スキップ」でホーム着地。

### 1.2 理由3行 · 気をつける点 · 次にすること

| ファイル | 役割 |
|----------|------|
| `src/services/beginner/sanitizeBeginnerPlainJa.ts` | UX0.3 §4.2 辞書置換 · 48字 · フォールバックプール |
| `src/services/beginner/beginnerMaterialSummaryBuilder.ts` | 銘柄別サマリー生成（AI判定 · 信頼度3段階 · 理由3行 · 気をつける点 · 次にすること） |

**理由3行:** Phase 正向評価 · summaryLines · positive 材料から抽出 → `fillBeginnerReasons()` で **必ず3行**（空不可）。

**気をつける点:** negative 材料 · sellReasons · 決算/金利/業績パターン → 最大3行 · 空時フォールバック。

### 1.3 BeginnerStockSummaryCard

| ファイル | 役割 |
|----------|------|
| `src/components/beginner/BeginnerStockSummaryCard.tsx` | UX0.3 ワイヤーフレーム準拠カード |

### 1.4 MaterialAnalysisScreen 統合

| 変更 | 内容 |
|------|------|
| beginner 時 | `BeginnerTodayAdviceCard` + `BeginnerStockSummaryCard` 一覧 |
| 非表示 | 材料スコア内訳 · API接続 · データ品質 · Phase · Reddit · 監査 |
| pro/standard | 従来 `StockMaterialCard` 維持 |

### 1.5 テスト

| コマンド | 結果 |
|----------|------|
| `npx vitest run tests/unit/sanitizeBeginnerPlainJa.test.ts tests/unit/beginnerMaterialSummaryBuilder.test.ts tests/unit/beginner*.test.ts` | **27/27 PASS** |

---

## 2. スクリーンショット

| 項目 | 結果 |
|------|------|
| 実機 adb | デバイス `FYRWXSNNAIOR9DCM` |
| Phase C APK | **versionCode 20** · `artifacts/preview-v20-phase-c.apk`（35,932,301 bytes） |
| インストール | `adb install -r` **成功** · `versionCode=20` 確認 |

| # | ファイル | 内容 |
|---|----------|------|
| 1 | `docs/review/phase-c-screenshots/01-onboarding-step-1.png` | オンボーディング **Step1 ようこそ** |
| 2 | `docs/review/phase-c-screenshots/02-onboarding-step-2.png` | オンボーディング **Step2 4タブ紹介** |
| 3 | `docs/review/phase-c-screenshots/03-onboarding-step-3.png` | オンボーディング **Step3 アドバイスプレビュー** |
| 4 | `docs/review/phase-c-screenshots/04-material-beginner-stock-card.png` | 銘柄チェック **理由3行 + 気をつける点** |

キャプチャスクリプト: `scripts/capture-phase-c-screenshots.mjs`  
メタ: `docs/review/phase-c-screenshots/capture-meta.json`

---

## 3. APK確認

| 項目 | 内容 |
|------|------|
| ビルド経路 | `C:\p\sta` 短パス · `gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` |
| Gradle | **BUILD SUCCESSFUL** |
| versionCode | **20**（`app.json` · `android/app/build.gradle`） |
| APK | `artifacts/preview-v20-phase-c.apk`（gitignore 対象） |
| 実機インストール | `adb install -r` → **Success** |

---

## 4. Git

| 項目 | 値 |
|------|-----|
| 実装コミット | `8b556d2` |
| レポートコミット | `522c3ae` |
| push 先 | `origin/cursor/top3-maxdd-capital-audit` |
| push 結果 | **成功** — `1a59782..522c3ae` |

---

## 5. スコープ外（Phase D 以降）

- scrollToSymbol 遷移 param 連携
- オンボーディング再表示 CTA（はじめての使い方）からの再トリガー
