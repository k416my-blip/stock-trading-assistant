# Git スナップショット（調査時点）

| 項目 | 値 |
|------|-----|
| 調査日 | 2026-06-09 |
| リポジトリ | https://github.com/k416my-blip/stock-trading-assistant.git |
| ブランチ | `cursor/top3-maxdd-capital-audit` |
| 最新コミット | `a3a430adddeb0f914e5ba6f0a32737973cdc17cb` |
| コミットメッセージ | Add Bursa Phase10 AI concierge proactive notifications tab and home integration. |
| コミット日時 | 2026-06-09 13:31:37 +0800 |
| 未コミット差分 | **約 1,277 件**（`git status --short`） |
| `.env` 追跡 | なし（`.gitignore` 対象） |
| pre-commit | `core.hooksPath = .githooks`（`.env` ブロック + APIキーパターン検出） |

## typecheck（2026-06-09 実行）

`npm run typecheck` → **FAIL**（exit code 2）

主因: `tests/unit/` 配下の分析・バックテスト用テストの型エラー（`openAi*`, `sixEtfStableStrategyBacktest`, `trustMonthlyPerformanceReport`, `userAnalysisSymbols` 等）。アプリ本体よりテスト側の型ずれが中心。

## HEAD に未反映の主なローカル変更（未コミット）

- Bursa Phase11 材料分析
- Reddit RSS 品質フィルタ Stage1/2
- AIコンシェルジュ拡張分析（15項目ブロック）
- 各種 device verify スクリプト・`evidence/*.json`
