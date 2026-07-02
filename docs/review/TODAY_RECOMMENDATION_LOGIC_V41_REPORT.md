# 今日のおすすめ ロジック改善レポート (v41)

**Date:** 2026-07-02  
**Branch:** `cursor/top3-maxdd-capital-audit`  
**Commit:** `3568c76`

---

## 不具合概要

ウォッチリスト・保有銘柄が 0 件のとき、「今日のおすすめ」作成で

> 作成できません — まずウォッチリストまたは保有銘柄を登録してください

と表示され、新規ユーザーが分析を開始できませんでした。

---

## 修正内容

### 1. 最新入金履歴の自動取得

`resolveLatestInvestableDepositMYR()` を新規追加:

- 完了済み `state.deposits` の最新 `amountMYR`（例: RM5,000）
- なければ買付余力 / `totalCapitalMYR`
- 練習モードは `practice.cashBalanceMYR`

`AllocationPlanScreen` の入金額欄に自動入力。

### 2. 0 銘柄でも分析実行

- 保有・ウォッチリストが空のとき、市場ユニバース（`getStocksByMarket`）へフォールバック
- AI が市場銘柄からスコアリング・分散選定・配分を実行
- コンシェルジュ根拠も市場ユニバース向けに生成

### 3. 保有銘柄がある場合

従来通り `resolveSymbolsForAllocation()` で保有＋ウォッチ＋手動注文を優先。空のときのみ市場 AI 選定。

### 4. ウォッチリストの位置づけ

事前登録は不要。AI 提案後に「手動注文リストに追加」で気になる銘柄として保存可能（既存フロー維持）。

---

## 修正ファイル

| ファイル | 変更 |
|----------|------|
| `src/services/resolveLatestInvestableDepositMYR.ts` | **新規** — 最新入金額解決 |
| `src/services/allocationPlan.ts` | 空ユニバース時に市場銘柄へフォールバック |
| `src/screens/AllocationPlanScreen.tsx` | 入金自動入力、市場 AI 分析、サブタイトル更新 |
| `tests/unit/allocationPlanDepositPrefill.test.ts` | **新規** — 入金 prefill / 0 銘柄プラン生成 |
| `app.json` | versionCode **41** |

---

## テスト結果

```text
npx vitest run tests/unit/allocationPlanDepositPrefill.test.ts
→ 4/4 PASS

npx vitest run tests/unit/allocationCommitteeFallback.test.ts
→ 5/5 PASS
```

---

## 実機確認手順

1. ウォッチリスト・保有 0 件の状態で「今日のおすすめ」タブを開く
2. 入金額が最新入金（例: RM5,000）で自動入力されていること
3. 「おすすめを見る」→ 候補カードが表示されること（「作成できません」が出ないこと）
4. 各候補に理由・リスク・期待リターン（既存カード UI）が表示されること

**本セッション:** adb 実機操作は未実施。上記はコード・単体テストに基づく手順。

---

## Release AAB

詳細は [`RELEASE_AAB_TODAY_RECOMMENDATION_V41_REPORT.md`](RELEASE_AAB_TODAY_RECOMMENDATION_V41_REPORT.md) を参照。

---

## GitHub 同期

| 項目 | 値 |
|------|-----|
| Commit | `3568c76` |
| Push | （push 後に追記） |
