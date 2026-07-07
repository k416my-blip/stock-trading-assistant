# Manual Order List Management — Device Smoke Report

Updated: 2026-07-07T06:50:00+08:00

## Overall: **PARTIAL**

4機能中3機能が実機 **PASS**、編集は UI 反映確認まで **PARTIAL**（保存後の probe 読取のみ未達）。

| 機能 | 結果 | pending before→after | completed before→after |
|------|------|----------------------|------------------------|
| 個別削除 | **PASS** | 35 → 34 | 0 → 0 |
| 実行済みにする | **PASS** | 34 → 33 | 0 → 1 |
| 編集 | **PARTIAL** | 33 → (probe null) | 1 → (probe null) |
| 一括削除 | **PASS** | 33 → 0 | 1 → 1 |

## 実装・修正（本フェーズ）

- `HomeManualOrderEntrySection` — `home-nav-manual-order-list` 追加
- `ManualOrderListScreen` — 確認 Modal + testID（UiAutomator 対応）
- `_deviceVerifyE2eCommon.mjs` — リスト遷移改善
- `run-manual-order-list-device-smoke.mjs` — 1機能ずつ軽量スモーク

## 各機能の実機結果

### 個別削除 — PASS
- pending: 35 → 34
- ダイアログ: `この手動注文を削除しますか？` / `削除すると元に戻せません…Rakuten Trade側には影響しません。`
- 証跡: `docs/review/manual-order-list-smoke/delete-one-result.json`

### 実行済みにする — PASS
- pending: 34 → 33 / completed: 0 → 1
- ダイアログ: `この注文を実行済みにしますか？` / `Rakuten Trade側で手入力済みの場合のみ…`
- 証跡: `docs/review/manual-order-list-smoke/complete-one-result.json`

### 編集 — PARTIAL
- 数量 999 へ変更し一覧反映 (`editReflected: true`)
- 保存後 probe null（Modal/keyboard 後の画面外）
- 証跡: `docs/review/manual-order-list-smoke/edit-one-result.json`

### 一括削除 — PASS
- pending: 33 → 0 / completed: 1 → 1
- ダイアログ: `未完了の手動注文をすべて削除しますか？`
- 証跡: `docs/review/manual-order-list-smoke/bulk-delete-result.json`

## Unit test: 13/13 PASS

## AAB: 未作成（Build Credit 節約）

## Git
- Commit hash: `5c10f14d5f44b97d626f2a0b4e86bf4d3af9f68a`
- Push: success (origin/cursor/top3-maxdd-capital-audit)


