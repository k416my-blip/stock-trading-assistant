# Duplicate Detection Logic Fix Report (v40)

**Date:** 2026-07-02  
**Branch:** `cursor/top3-maxdd-capital-audit`

---

## 不具合概要

Rakuten 取引記録の重複判定が **date + amount** のみで `duplicate_blocked` となり、**参照番号が異なる入金**でも確認画面で

> 重複の可能性が高いため保存できません

となり保存できませんでした。

---

## 原因

`detectDuplicateImport` の入金判定（`duplicateDetector.ts`）が:

- 同日・同額一致 → 常に `blockSave: true`
- 参照番号の比較を行わない

また、参照番号単体の `note.includes(ref)` チェックが、日付・金額と独立してブロックしていた。

---

## 修正内容

### 1. 重複判定ロジック (`duplicateDetector.ts`)

| 条件 | 動作 |
|------|------|
| **date + amount + reference が完全一致** | `blockSave: true`（保存不可） |
| **date + amount のみ一致**（参照番号が異なる、または片方のみ入力） | `blockSave: false` + 警告ヒント |
| **参照番号が異なる** | 保存許可 |

- 入金: 既存 `deposits[].note` から `ref:XXX` を抽出して比較
- 出金: `withdrawals[].referenceNumber` または note 内 `ref:` を比較
- ジャーナル: `brokerReferenceNumber` + date + amount で完全一致時のみブロック

### 2. 確認画面 (`RakutenImportConfirmScreen.tsx`)

| 状態 | 表示 |
|------|------|
| 完全一致（blocked） | 「重複の可能性が高いため保存できません」 |
| date+amount のみ（soft） | 「**同じ金額・同日の記録があります**」 |
| その他の類似 | 「類似の記録があります」 |

soft 警告時は **「記録する」ボタンが有効**（`duplicate_blocked` ではないため）。

### 3. i18n

`rakutenImport.confirm.duplicateExactTitle` / `duplicateSoftTitle` / `duplicateSimilarTitle` を ja / en / zh-Hans に追加。

---

## 修正ファイル

| ファイル |
|----------|
| `src/services/rakutenImport/duplicateDetector.ts` |
| `src/screens/RakutenImportConfirmScreen.tsx` |
| `src/i18n/resources/ja/rakutenImport.json` |
| `src/i18n/resources/en/rakutenImport.json` |
| `src/i18n/resources/zh-Hans/rakutenImport.json` |
| `tests/unit/rakutenImport/duplicateDetector.test.ts` |
| `app.json`（versionCode 40） |

---

## テスト結果

```text
npx vitest run tests/unit/rakutenImport/duplicateDetector.test.ts
→ 7/7 PASS

npx vitest run tests/unit/rakutenImport
→ 68/69 PASS
→ 1 FAIL（既存・非関連）: importConfidence.test.ts — confidenceLabelJa
```

### 追加テストケース

- 同日・同額・**参照番号異なる** → `blockSave: false`、警告のみ
- 同日・同額・**参照番号一致** → `blockSave: true`
- 同日・同額・**両方参照番号なし** → `blockSave: true`（完全一致）
- 候補に参照番号あり・既存になし → 警告のみ、保存可
- 出金の date+amount+reference 完全一致 → ブロック

---

## 実機確認手順（推奨）

Internal Testing / Expo で以下を確認:

1. 既存入金: 2026-07-02 / RM5000 / ref:A を保存済み
2. 新規入金: 同日 / RM5000 / ref:B を入力 → 確認画面に「同じ金額・同日の記録があります」→ **記録する** で保存成功
3. 新規入金: 同日 / RM5000 / ref:A → 「重複の可能性が高いため保存できません」→ 保存ボタン無効
4. 参照番号なしで同日同額2件目 → ブロック（完全一致）

**本セッション:** adb/Expo 実機操作は未実施。上記はコード・単体テストに基づく確認手順。

---

## バージョン

| 項目 | 値 |
|------|-----|
| versionName | `1.0.0` |
| versionCode | **40** |

---

## GitHub 同期

| 項目 | 値 |
|------|-----|
| Commit | （push 後に追記） |
| Push | （push 後に追記） |

---

## 受け入れ基準

- [x] 参照番号入力時は date + amount + reference で判定
- [x] 参照番号が異なれば保存許可
- [x] 完全一致のみ保存不可
- [x] date+amount のみは警告「同じ金額・同日の記録があります」+ 保存可
- [x] unit test 追加・更新
