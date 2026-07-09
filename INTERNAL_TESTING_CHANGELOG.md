# Internal Testing Changelog

対象: 内部テスター / QA（エンドユーザー向けリリースノートではありません）

Updated: 2026-07-09  
Branch: `cursor/top3-maxdd-capital-audit`  
Base commit: `4596e88` + release readiness commit  
Target versionCode: **45**

---

## AI Concierge — 予算・数量の判断（PASS 済み）

- AI コンシェルジュは **指定額を無理に使い切らない**
- **残現金・見送り・おすすめなし** は正常な投資判断（エラーではない）
- 「買わない」「現金を残す」は正式な判断として扱う
- **今日のおすすめなし** を正常表示（空状態 UI）
- **beginner strict / AllocationPlan**: 弱候補を buy に昇格しない（実機 PASS）
- **1155 + RM5000** 表示統一（RM50000 誤表示なし、実機 PASS）

---

## OOM / 長時間安定性（12h PASS 済み）

- OOM hotfix 適用済み — 12h 15m 51s 完走（試行 #2）
- ERR_STRING_TOO_LONG なし
- RN / Metro / Expo DevTools 自動起動 0
- Metro / adb 12h 維持
- health_restart 0
- logcat **ストリーム + ローテーション**（全量 adb logcat -d 保持に逆戻りなし）
- memory_watch 153 エントリ継続（次回 run から session jsonl 固定出力）

---

## foreground WARN（12h 記録）

- 35 件（unknown 26 / launcher 9）— **停止条件外**
- runner / price refresh / AI analysis は継続
- 今後: `ensureAppForeground` 判定安定化（改善候補）

---

## 開発・運用インフラ

- **CURRENT_STATUS 保護修正** — `npm run status` が PASS セクションを上書きしない
- Memory note / Live snapshot のみ自動更新
- memory_watch: 次回以降 `logs/memory_watch_<session>.jsonl` を session 固定で出力

---

## ビルド / 配布（本フェーズ）

- versionCode **45**（Play 再提出用、44 から increment）
- package: `com.assistant.stocktrading`
- AAB: EAS `production` profile（app-bundle）— **ビルド再試行中**（JS bundle フェーズ要修正）

---

## 内部テスト時の確認ポイント

1. AI Concierge: 予算未消化・残現金が「失敗」表示にならないか
2. 今日のおすすめなし / beginner strict / RM5000 表示
3. 長時間利用時の OOM / Metro 停止がないか
4. API キー未設定時の graceful エラー表示

---

## 既知の制限（本ビルド前）

- AAB 未生成のため Play 内部テスト配布は **次ビルド成功後**
- typecheck / lint に既存エラーあり（実行時動作とは別 track）
