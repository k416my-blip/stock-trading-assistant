# Rakuten Transaction Import R2.5 — 実装レポート

| 項目 | 内容 |
|------|------|
| フェーズ | **R2.5 実装（配当 · 出金 · 手数料 · OCR なし）** |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 日付 | 2026-06-20 |
| versionCode | **25** |
| スコープ | 自然文パイプライン拡張 · commit パス · 買付余力（出金） · 確認 UI · 監査ログ |

---

## 実装内容

### 1. 配当（dividend）— フル commit パス

- `isCommittableType` / `canSaveImportCandidate` に `dividend` を追加
- `commitImportCandidateInState` → `DividendRecord`（`AddDividendScreen` 相当）
- 曖昧入力（`配当が入った`）は symbol/amount 不足で **保存不可**
- 明確入力（`Maybankの配当がRM50入った`）は 1155 · RM50 · **保存可**

### 2. 出金（withdrawal）

- 新規型 `WithdrawalRecord` · `AppState.withdrawals[]`（デフォルト `[]` · migration 対応）
- `calculateBuyingPower`:
  - `effectiveCapital = max(totalCapitalMYR, completedDeposits) - sum(withdrawals.amountMYR)`
  - `buyingPowerMYR = max(0, effectiveCapital - investedMYR)`
- NL: `出金|withdrawal|withdraw` 検出

### 3. 手数料（fee）

- 新規型 `FeeAdjustmentRecord` · `AppState.feeAdjustments[]`
- **同一日 · 同一銘柄** の既存 `TradeRecord` があれば `brokerageFee` に加算
- 該当 trade がなければ standalone `feeAdjustments` レコード
- NL: `手数料|brokerage fee|commission` 検出

### 4. 確認カード / 確認画面

- `ConciergeImportActionCard.tsx` — 出金/手数料ラベル · サマリー
- `RakutenImportConfirmScreen.tsx` — 同上 + 買付/売却プレビュー維持
- `buildConfirmPromptJa()` — dividend/withdrawal/fee 文言

### 5. 監査ログ

- `buildCommitAuditDetailJa()` — 種別別 `detailJa`（入金/出金/配当/手数料/売買）
- `commitRakutenImportCandidate` 確定時に `mappedRecordIds`（`dividendId` / `withdrawalId` / `feeAdjustmentId` / `tradeId`）
- ジャーナル `recordSource`: NL は `rakuten_import_nl`（既存 R2）

### 6. 重複検出

- `duplicateDetector` — withdrawal · dividend の日付+金額(+symbol) マッチ

---

## 対応自然文一覧

| ユーザー入力 | 構造化結果 | 保存 |
|-------------|-----------|------|
| 配当が入った | dividend · 銘柄/金額不明 | ×（低信頼） |
| Maybankの配当がRM50入った | dividend · 1155 · RM50 | ○ |
| 500リンギット出金した | withdrawal · RM500 | ○ |
| RM500 withdrawal | withdrawal · RM500 | ○ |
| 手数料RM8 | fee · RM8 · 銘柄なし | ○（standalone feeAdjustment） |
| brokerage fee RM8 | fee · RM8 | ○ |

**手数料マッピング（設計 §2.5 最小実装）**

| 条件 | 保存先 |
|------|--------|
| 同日同銘柄 trade あり | `TradeRecord.brokerageFee` += amount |
| なし | `FeeAdjustmentRecord` |

---

## 変更ファイル（主要）

| 区分 | パス |
|------|------|
| 型 | `src/types/index.ts`, `src/types/rakutenImport.ts` |
| 永続化 | `src/services/storage.ts` |
| 買付余力 | `src/services/buyingPower.ts` |
| パーサ | `naturalLanguageTransactionParser.ts`, `detectRakutenImportIntent.ts`, `rakutenImportConfidence.ts` |
| commit | `commitImportCandidate.ts`, `duplicateDetector.ts`, `buildNaturalLanguageImportCandidate.ts` |
| UI | `ConciergeImportActionCard.tsx`, `RakutenImportConfirmScreen.tsx` |
| 監査 | `useAppPortfolioActions.ts` |
| テスト | `tests/unit/rakutenImport/*` |
| ビルド | `app.json` (25), `android/app/build.gradle` |
| 証跡 | `scripts/capture-rakuten-import-r25-screenshots.mjs`, `docs/review/rakuten-import-r25-screenshots/*` |

---

## v25 APK

| 項目 | 値 |
|------|-----|
| パス | `artifacts/preview-v25-rakuten-import-r25.apk` |
| サイズ | 35,983,897 bytes |
| ビルド経路 | `C:\p\sta` 短パス · `gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` |
| 実機 versionCode | 25（`adb shell dumpsys package` 確認済み） |

---

## ユニットテスト結果

```
npx vitest run tests/unit/rakutenImport

 Test Files  5 passed (5)
      Tests  38 passed (38)
```

---

## 実機スクリーンショット

| ファイル | 内容 |
|----------|------|
| `docs/review/rakuten-import-r25-screenshots/01-concierge-home.png` | AI相談タブ |
| `docs/review/rakuten-import-r25-screenshots/02-nl-withdrawal-card.png` | RM500 withdrawal → 出金カード |
| `docs/review/rakuten-import-r25-screenshots/03-nl-dividend-card.png` | Maybank 配当 NL カード |
| `docs/review/rakuten-import-r25-screenshots/04-nl-fee-card.png` | brokerage fee RM8 カード |

---

## Git

| 項目 | 値 |
|------|-----|
| commit | `PLACEHOLDER` |
| push | `origin/cursor/top3-maxdd-capital-audit` |

---

## 次フェーズ（R3 以降）

- OCR スクショ経路（`ocr_screenshot`）
- OpenAI JSON schema フォールバック（任意）
- 手動入力フォームへの dividend/withdrawal/fee タブ（任意）
