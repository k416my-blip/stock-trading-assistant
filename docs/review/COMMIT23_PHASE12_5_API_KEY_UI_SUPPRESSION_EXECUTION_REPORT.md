# Commit23 — Phase12.5 API Key Warning UI Suppression Execution Report

## 実施概要

| 項目 | 値 |
|------|-----|
| 目的 | 3h / 12h 長時間テスト中に APIキー未設定ダイアログをスマホ画面に表示しない |
| 前提 | Preview APK は `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1` ビルド |
| runner mode | `PHASE12_5_RUNTIME_MODE=apk` |
| parent HEAD | `7271be1e4c5638ace6ae64212a2e50c31fc79703` (Commit22) |
| 3h rerun | **本タスクでは未実施** |

## APIキー未設定警告UIの非表示化

| 項目 | 内容 |
|------|------|
| **非表示化** | **実装済** — stability test build では Alert / modal を出さない |
| **対象 mode** | `EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1`（preview APK / 12h monitor ビルド） |
| **runner 側** | `PHASE12_5_RUNTIME_MODE=apk` — price refresh telemetry に `apiKeyDialogAppeared` 記録 |

## 通常利用時の警告表示

| 条件 | 挙動 |
|------|------|
| 通常ビルド（monitor flag なし） | **従来通り** `Alert.alert('APIキー未設定', …)` を表示 |
| stability test build | UI 非表示 → Yahoo フォールバックで price refresh 継続 |

## price refresh NOT_CONFIGURED / WARN

| 状態 | 意味 |
|------|------|
| `NOT_CONFIGURED` | Twelve Data キーなしで refresh 試行（Yahoo のみ） |
| `WARN` | キーなしだが一部 success（`successCount > 0`） |
| `uiBlocked: false` | UI 操作不要 |
| `warningCode` | `API_KEY_MISSING_SUPPRESSED_IN_TEST_MODE` |

logcat: `[12H-MONITOR] api_key_missing_suppressed { … }`

## dismissOverlayDialogs 依存の低減

- APIキーダイアログは **アプリ側で非表示** → 通常フローで「了解」tap 不要
- runner `dismissOverlayDialogs` は **保険**（dialog 検出時のみ fallback）
- checkpoint / telemetry: `apiKeyDialogAppeared` — 次回 rerun で **0 を期待**

## スマホ無操作運用

3h / 12h テスト中 **禁止**: 了解 tap / 手動ナビ / 手動 dismiss / 再起動  
**許可**: 画面確認・スクショのみ

Commit23 後、preview APK **再ビルド・再インストール** が必要（アプリ側変更のため）。

## 変更ファイル

| ファイル | 変更 |
|----------|------|
| `src/constants/phase125StabilityTest.ts` | **新規** — monitor build 判定 |
| `src/services/phase125StabilityTestMode.ts` | **新規** — suppress / telemetry helpers |
| `src/types/marketData.ts` | `PriceSyncStabilityMeta` 追加 |
| `src/context/app/useAppApiKeys.ts` | キー未設定でも Yahoo refresh 継続 |
| `src/components/portfolio/PortfolioPriceSyncCard.tsx` | Alert 抑制 |
| `scripts/lib/phase12-5-api-key-dialog.mjs` | **新規** — UI dump 検出 |
| `scripts/phase12-5-long-run.mjs` | `apiKeyDialogAppeared` telemetry |
| `tests/unit/phase125StabilityTestMode.test.ts` | **新規** |
| `tests/unit/phase12-5ApiKeyDialog.test.ts` | **新規** |
| `docs/review/COMMIT22_…` | GitHub 同期欄追記 |

## 実行したテスト

| チェック | 結果 |
|----------|------|
| `npm run typecheck` | （commit 前実行） |
| `phase125StabilityTestMode.test.ts` | 3 tests |
| `phase12-5ApiKeyDialog.test.ts` | 3 tests |
| 既存 phase12-5 系 | 73 tests |

## 3h rerun 再実行見込み

| 項目 | 判定 |
|------|------|
| Commit22 checkpoint hardening | ✅ |
| Commit23 API key UI suppression | ✅（**APK 再ビルド後**） |
| スマホ無操作 3h rerun | **再ビルド・インストール後に実施可能** |
| 期待 metric | `apiKeyDialogAppeared: 0` 全 price refresh |

## 12h 本番条件（変更なし）

1. 3h rerun **PASS**（完走・INFRA INVALID なし）
2. `apiKeyDialogAppeared: 0`
3. FATAL / ANR / PID lost = 0

## secret scan

staged diff — 実キー形式 **ヒットなし**

## GitHub 同期

| 項目 | 値 |
|------|-----|
| commit hash | （push 後記載） |
| push | （push 後記載） |
| remote 同期 | （push 後記載） |

---

*Commit23 — API key warning UI suppressed in stability test builds; 3h rerun not started.*
