# Fable Review Prompt（日本語・貼り付け用）

以下を Fable にそのまま貼り付けてください。続けて `FABLE_APP_EVALUATION_PACKAGE.md` と関連レポートを添付・貼付してください。

---

## プロンプト本文

```
あなたは第三者の厳しいプロダクト／リスクレビュアーです。
「Malaysia Stock AI Concierge」（package: com.assistant.stocktrading、versionCode: 45）を評価してください。

# アプリ概要（前提）
- マレーシア株向けの投資支援アプリ
- 実売買アプリではない。自動発注機能はない
- ユーザーが楽天証券などの証券アプリへ手動入力する前提
- AI Concierge は予算を使い切ることを目的にしない
- 「買わない」「見送る」「現金を残す」「おすすめなし」は正式な投資判断
- 低 confidence / beginner strict では弱候補を buy に昇格しない

# 現状ステータス（開発側申告）
- AI Concierge Budget / Quantity UI Final Acceptance: PASS
- OOM 12h Stability Run: PASS
- CURRENT_STATUS 保護: PASS
- Release Readiness / Internal Testing Stabilization: PASS
- AAB 生成: PASS（build 1545a8ba / versionCode 45）
- Play 内部テスト: GO（アップロードは手動待ち）
- 既知課題: typecheck/lint 17 errors、npm test 6 fail（既存未解決）
- 内部テスター実機フィードバック: 未完了

# 添付資料の読み方
1. まず FABLE_APP_EVALUATION_PACKAGE.md を全体把握に使う
2. リスクは FABLE_PRODUCT_RISK_SUMMARY.md
3. 技術は FABLE_TECHNICAL_SUMMARY.md
4. 詳細根拠は CURRENT_STATUS.md、RELEASE_READINESS…、OOM_12H…、AI_CONCIERGE… を参照
5. 大容量 logcat / telemetry 全量 / AAB は添付していない（要約レポートを正とする）

# 評価してほしい観点
- アプリ全体の完成度
- UI/UX の分かりやすさ、初心者への使いやすさ
- 投資アプリとして危険な表現、自動売買誤解、リスク説明不足
- 「おすすめなし」「見送り」「現金維持」の表現の適切さ
- APIキー設定 UX、エラー表示の分かりやすさ
- 内部テストに出してよいか
- Play 公開前に直すべき優先順位
- typecheck / test fail の重み
- 設計方針の妥当性
- 次に修正すべき TOP10

# 評価スタンス
- 褒めるより問題点を優先する
- 投資アプリとして危険な点を厳しく指摘する
- 初心者に誤解を与える点を指摘する
- 直接発注なし・手動入力支援である前提は考慮する（その前提でも危険なら指摘）
- 根拠のない過大評価をしない
- 開発側の PASS 申告を鵜呑みにせず、残課題との整合を見る

# 出力形式（必ずこの見出しで）

# 総合評価
- 点数: 100点満点
- 内部テストへ進めるか: YES / NO / 条件付き
- Play公開へ進めるか: YES / NO / 条件付き

# 良い点

# 危険な点

# UX上の問題

# 投資アプリとしてのリスク

# 技術的リスク

# テスト不足

# すぐ直すべきTOP10
（各項目に 高/中/低 を付ける）

# 内部テスターに確認してもらうべき項目

# Play公開前の必須修正

# 総評
```

---

## 補足（運用者向け）

- 最初に本プロンプトを貼り、続けて `FABLE_APP_EVALUATION_PACKAGE.md` 全文を渡すとよい
- 深掘りが必要なら `FABLE_PRODUCT_RISK_SUMMARY.md` → `OOM_12H_RUN_REPORT.md` → Concierge 受入レポートの順
- AAB や API キーは渡さない
