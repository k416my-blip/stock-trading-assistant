# 手動注文リスト削除機能 v43 実装レポート

**日付:** 2026-06-13  
**ブランチ:** `cursor/top3-maxdd-capital-audit`  
**versionCode:** 43

## 概要

手動注文リスト画面に、未完了注文の個別削除・一括削除、および実行済み注文の別管理と削除確認を追加した。

## 要件対応

| # | 要件 | 対応 |
|---|------|------|
| 1 | 各注文カードに「削除」ボタン | `ManualOrderListScreen` の未完了カードに追加 |
| 2 | 削除前確認ダイアログ（指定文言） | タイトル「この手動注文を削除しますか？」／本文「削除すると元に戻せません。」 |
| 3 | 未完了リストから削除 | `removePendingManualOrder` で `completed === false` のみ削除 |
| 4 | 「未完了をすべて削除」ボタン | 未完了セクション上部に配置 |
| 5 | 一括削除も確認ダイアログ | タイトル「未完了の手動注文をすべて削除しますか？」／本文「削除すると元に戻せません。」 |
| 6 | 実行済みは別管理 | セクション名を「実行済みとして記録済み（N件）」に変更。完了済みは `clearCompletedManualOrders` のみ |
| 7 | 件数表示の更新 | `pending` / `done` を state から再計算するため削除後に即反映 |
| 8 | 実機動作確認 | **未実施** — `adb devices` で接続デバイスなし |
| 9 | Markdown レポート | 本ファイル |
| 10 | GitHub 同期 | コミット・プッシュ後に更新 |
| 11 | Release AAB | EAS production ビルド後に更新 |

## 変更ファイル

- `src/screens/ManualOrderListScreen.tsx`
- `src/context/app/useAppPortfolioActions.ts`
- `src/context/AppContext.tsx`
- `tests/unit/manualOrderListDelete.test.ts`
- `app.json` (versionCode 43)

## テスト結果

```
npx vitest run tests/unit/manualOrderListDelete.test.ts tests/unit/manualOrderConfirmation.test.ts
```

14 tests passed

## GitHub 同期

（プッシュ後に更新）

## Release AAB v43

（ビルド完了後に更新）
