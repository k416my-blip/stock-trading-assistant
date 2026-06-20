# Rakuten Transaction Import R1 — 実装レポート

| 項目 | 内容 |
|------|------|
| フェーズ | **R1 実装（手動入力のみ）** |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 日付 | 2026-06-20 |
| versionCode | **23** |
| スコープ | 入金・買付・売却の手動入力 → 確認画面 → ユーザー確認後保存（OCR / 自然文パースなし） |

---

## 実装内容

### ドメイン・永続化

- `BrokerTransactionCandidate` / `ImportBatch` / 監査ログ型（`src/types/rakutenImport.ts`）
- ステージングストア `@sta/rakuten_import_batches_v1`、監査 `@sta/rakuten_import_audit_v1`
- 重複検出（参照番号・同日同額入金・同日同銘柄同数量取引）
- `commitImportCandidateInState`: 入金は `DepositPlan(completed)`、売買は `TradeRecord` + ポートフォリオ更新 + 執行ジャーナル `recordSource: rakuten_import_manual`

### UI / ナビゲーション

- `RakutenImportManualEntryScreen` — 入金 / 買付 / 売却チップ、手動フォーム
- `RakutenImportConfirmScreen` — 重複警告、買付余力プレビュー、記録 / 修正 / キャンセル
- `RootNavigator` に両画面登録
- 設定（標準・プロ表示）に **「Rakuten取引記録」** メニュー行

### AppContext

- `stageRakutenImportManual` / `commitRakutenImportCandidate` / `rejectRakutenImportCandidate` をコンテキストに公開

### ユニットテスト

- `tests/unit/rakutenImport/duplicateDetector.test.ts`
- `tests/unit/rakutenImport/staging.test.ts`
- `tests/unit/rakutenImport/commitImportCandidate.test.ts`

---

## 変更ファイル（主要）

| 区分 | パス |
|------|------|
| 型 | `src/types/rakutenImport.ts`, `src/types/execution.ts` |
| 定数 | `src/constants/storageKeys.ts` |
| サービス | `src/services/rakutenImport/*` |
| 画面 | `src/screens/RakutenImportManualEntryScreen.tsx`, `RakutenImportConfirmScreen.tsx` |
| コンテキスト | `src/context/app/useAppPortfolioActions.ts`, `AppContext.tsx` |
| ナビ | `src/navigation/types.ts`, `RootNavigator.tsx` |
| 設定 | `src/screens/SettingsScreen.tsx` |
| ビルド | `app.json` (versionCode 23), `android/app/build.gradle` |
| テスト | `tests/unit/rakutenImport/*` |
| 証跡 | `scripts/capture-rakuten-import-r1-screenshots.mjs`, `docs/review/rakuten-import-r1-screenshots/*` |

---

## v23 APK

| 項目 | 値 |
|------|-----|
| パス | `artifacts/preview-v23-rakuten-import-r1.apk` |
| サイズ | 35,963,845 bytes |
| ビルド経路 | `C:\p\sta` 短パス · `gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` |
| 実機 versionCode | 23（インストール確認済み） |

---

## ユニットテスト結果

```
npx vitest run tests/unit/rakutenImport

 Test Files  3 passed (3)
      Tests  12 passed (12)
```

---

## 実機スクリーンショット

| ファイル | 内容 |
|----------|------|
| `docs/review/rakuten-import-r1-screenshots/01-deposit-entry.png` | 入金入力 |
| `docs/review/rakuten-import-r1-screenshots/02-deposit-confirm.png` | 入金確認 |
| `docs/review/rakuten-import-r1-screenshots/03-buy-entry.png` | 買付入力 |
| `docs/review/rakuten-import-r1-screenshots/04-buy-confirm.png` | 買付確認 |
| `docs/review/rakuten-import-r1-screenshots/05-sell-entry.png` | 売却入力 |
| `docs/review/rakuten-import-r1-screenshots/06-sell-confirm.png` | 売却確認 |
| `docs/review/rakuten-import-r1-screenshots/capture-meta.json` | 取得メタデータ |

---

## Git

| 項目 | 値 |
|------|-----|
| コミット | （push 後に `git rev-parse HEAD` で記録） |
| push | （下記コミット・push 実行結果を参照） |

---

## 残タスク（R2 以降）

- 自然文（コンシェルジュ）経路
- Transaction History OCR 経路
- 出金・配当・手数料のみ行のサポート
