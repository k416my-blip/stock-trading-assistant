# ホーム手動注文導線・言語選択・自動遷移修正レポート

**日付:** 2026-06-13  
**versionCode:** 44（AAB は今回未作成）

## 概要

1. 言語選択 — 初回 ja 確認が効かない問題を修正
2. ホーム自動遷移 — Tab remount 要因を除去、Home 固定
3. ホーム4ボタン — 全 UX モードで手動注文リスト導線を追加

## テスト

- confirmInitialLanguage.test.ts: 4 passed
- manualOrderFlow.test.ts: 5 passed
- 合計 9 passed

## GitHub

- ブランチ: cursor/top3-maxdd-capital-audit
- リモート同期: origin と同期 (HEAD 4262b4c)
- 今回変更: 未コミット
- AAB: 未作成
