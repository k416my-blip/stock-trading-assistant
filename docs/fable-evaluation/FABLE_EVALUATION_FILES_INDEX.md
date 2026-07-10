# Fable Evaluation Files Index

Generated: 2026-07-10  
用途: Fable に渡す資料の優先順位と見どころ

---

## 読み順（推奨）

1. `FABLE_REVIEW_PROMPT_JA.md`（最初に貼るプロンプト）
2. `FABLE_APP_EVALUATION_PACKAGE.md`（メイン要約）
3. `FABLE_PRODUCT_RISK_SUMMARY.md`
4. `FABLE_TECHNICAL_SUMMARY.md`
5. 個別 PASS レポート（必要に応じて深掘り）

---

## 一覧

| ファイル名 | 何の資料か | Fable 優先度 | 重要な見るべき箇所 | 状態 |
|------------|------------|--------------|--------------------|------|
| `FABLE_REVIEW_PROMPT_JA.md` | 評価依頼プロンプト | **P0** | 出力形式・厳しめ依頼 | — |
| `FABLE_APP_EVALUATION_PACKAGE.md` | 総合評価パッケージ | **P0** | §3 設計原則、§5 テスト、§6 課題 | — |
| `FABLE_PRODUCT_RISK_SUMMARY.md` | 投資・表現リスク | **P0** | 誤解・免責・ストア文言 | — |
| `FABLE_TECHNICAL_SUMMARY.md` | 技術要約 | **P1** | AAB / 12h / 既知 fail / EAS 経緯 | — |
| `CURRENT_STATUS.md` | 現状ダッシュボード | **P1** | Concierge PASS、OOM PASS、Closed Testing PREPARED | PASS 記録維持 |
| `RELEASE_READINESS_INTERNAL_TESTING_REPORT.md` | リリース準備判定 | **P1** | Executive Summary、AAB、NO-GO、最終判定 | **PASS** / Play **GO** |
| `INTERNAL_TESTING_CHANGELOG.md` | 内部テスト向け変更点 | **P1** | versionCode 45、既知制限 | 整合済み |
| `PLAY_INTERNAL_TESTING_UPLOAD_GUIDE.md` | Play アップロード手順 | **P2** | versionCode / package 確認、既知制限 | 手動待ち |
| `AI_CONCIERGE_BUDGET_QUANTITY_UI_FINAL_ACCEPTANCE_REPORT.md` | Concierge 最終受入 | **P1** | 受入原則、実機結果、残課題 | **PASS** |
| `AI_CONCIERGE_UI_E2E_OPTIMIZATION_FINAL_FIX_REPORT.md` | Concierge E2E final fix | **P2** | 実機シナリオ詳細 | **PASS**（受入根拠） |
| `OOM_12H_RUN_REPORT.md` | 12h 安定性 | **P1** | Executive Summary、WARN 35、残課題 | **PASS** |
| `CURRENT_STATUS_LIVE_SNAPSHOT_PRESERVATION_FIX_REPORT.md` | status 保護修正 | **P2** | merge 方式、テスト 6/6 | **PASS** |
| `PLAY_CLOSED_TESTING_TESTER_OPERATIONS_GUIDE.md` | Closed testing 運用 | **P2** | Internal vs Closed、12人/14日注意 | PREPARED |
| `PLAY_CONSOLE_CLOSED_TESTING_CHECKLIST.md` | 運用者チェックリスト | **P3** | Production access 確認欄 | PREPARED |
| `TESTER_INVITATION_MESSAGE_JA.md` | テスター依頼文 | **P3** | 14日維持・実売買しない | PREPARED |
| `TESTER_INSTALL_AND_FEEDBACK_GUIDE_JA.md` | テスター手順 | **P3** | 確認画面・報告項目 | PREPARED |
| `TESTER_TRACKING_TEMPLATE.md` | テスター管理表 | **P3** | 15+5 空行 | PREPARED |
| `FABLE_EVALUATION_PACKAGE_REPORT.md` | 本パッケージ作成レポート | **P3** | 機密チェック、除外一覧 | 本作業 |

---

## 渡さないもの（意図的除外）

| 除外 | 理由 |
|------|------|
| adb logcat 全量（約数百 MB） | 大容量・ノイズ |
| telemetry.jsonl / checkpoint.json 全量 | 大容量 |
| AAB 本体 | バイナリ・配布物 |
| node_modules / build artifacts | 不要 |
| API キー・keystore・パスワード | 機密 |

---

## 状態凡例

| 記号 | 意味 |
|------|------|
| PASS | 当該フェーズの受入完了 |
| GO | 次工程（Play アップロード等）に進める |
| PREPARED | 運用ドキュメント整備済み、実作業は手動待ち |
| PARTIAL | 一部未達または既存課題あり |
| FAIL | 当該ゲート未達（本パッケージ対象の主要ゲートは PASS） |
