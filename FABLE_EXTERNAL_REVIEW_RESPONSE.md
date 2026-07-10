# Fable External Review Response

Generated: 2026-07-10T11:05+08:00  
Source: Fable 外部評価（評価パッケージ提出後）  
App: Malaysia Stock AI Concierge / `com.assistant.stocktrading` / versionCode 45

本ドキュメントは Fable の指摘を受け入れ、自己申告との差分と次フェーズ優先順位を証跡化する。  
**コード修正・投資ロジック修正・UI 修正は本フェーズでは行わない。**

---

## 1. Fable からの主な指摘

1. 「PASS」の積み重ねによるアンカリング効果があり、自己申告を鵜呑みにすべきでない
2. release-critical **35/35 PASS** と **typecheck 型エラー**が同一テストファイルで共存している
3. `strictCharterOnly` が型定義に無いのにテスト／呼び出し側で使われている疑い
4. working tree が実質未整理（報告では「多数」、実態は数百件規模）
5. `.tmp-eas.json` が `.gitignore` 対象外
6. `lint` と `typecheck` が同一コマンドで、ゲートを二重に数えている
7. 免責・リスク表示が「強化余地」止まりで、投資アプリとしてはブロッカー級
8. Google Play 金融サービスポリシー / マレーシア規制（SC Malaysia）への言及欠落
9. API キー未設定 UX はテスター前に社内確認すべき
10. versionCode **44**（受入・12h）と **45**（AAB）の差分未確認
11. Internal testing: **条件付き YES** / Play 公開: **NO**

---

## 2. こちらで確認できた事実

| 指摘 | 確認結果 |
|------|----------|
| `lint` ≡ `typecheck` | **妥当** — 両方とも `tsc --noEmit -p tsconfig.typecheck.json` |
| release-critical と型エラーの食い違い | **妥当** — `strictCharterOnly` が Concierge 関連テストと `manualOrderFlow` に存在 |
| working tree 規模 | **妥当** — `git status --short` で **577 件**（「多数」は過小表現） |
| `.tmp-eas.json` ignore 外 | **妥当** — `*.tmp` のみでは `.tmp-eas.json` にマッチしない |
| Internal: 条件付き YES | **受け入れ** |
| Play: NO | **受け入れ** |
| 公開判断の重み | **受け入れ** — PASS 実績より免責・規制・型整合・API 未設定 UX が重い |

---

## 3. 自己申告との差分

| 自己申告（評価パッケージ） | 実態 / Fable 指摘後の認識 |
|----------------------------|---------------------------|
| typecheck / lint 17 errors（既存・gate 外） | 同一コマンドの二重カウント。ESLint 等は走っていない可能性 |
| release-critical 35/35 PASS | vitest 実行 PASS と tsc 型整合は別物。中核ロジック周辺で型ズレあり |
| working tree not clean（多数） | **577 件**。規模を伏せていた |
| 既知課題として軽く列挙 | 投資アプリでは免責・規制が公開ブロッカー級 |
| Play 内部テスト GO | **条件付き**（免責・API UX 確認が先） |
| AAB / Concierge / OOM PASS | 技術検証としては維持。公開判断の十分条件ではない |

---

## 4. Fable 指摘が妥当だった点

- 型チェックとユニットテストの分離による「偽の安心」
- working tree 規模の過小報告
- lint ゲートの実態
- `.tmp-eas*.json` の ignore 漏れ
- 投資アプリとしての免責・誤解防止・規制確認の優先度
- Internal 条件付き / Play NO の判断枠組み

---

## 5. まだ未確認の点（次フェーズ以降）

| 項目 | 状態 |
|------|------|
| `strictCharterOnly` の正式な型定義欠落の有無と実行時挙動 | **未修正・要調査**（本フェーズでは触らない） |
| typecheck 17 件の全リストと Concierge 以外の内訳 | 再実行で確認予定 |
| npm test 6 fail の Concierge 関連度 | 精査未了 |
| versionCode 44→45 の差分が versionCode のみか | 未確認 |
| `.tmp-eas.json` の中身に認証情報が含まれるか | 中身の詳細監査は次（ignore 追加は本フェーズで実施） |
| Play 金融ポリシー / SC Malaysia の具体要件 | 資料・準拠確認未着手 |
| 画面上の免責・リスク表示の実装有無の画面単位監査 | 未着手 |
| API キー未設定 UX の実機再確認 | 未着手 |

---

## 6. Internal testing: 条件付き YES の理由

- AAB（versionCode 45 / build `1545a8ba`）は技術的に生成済み
- Concierge 受入・12h OOM・Release Readiness の技術 PASS は維持
- ただし **免責表示・API 未設定 UX・誤解防止文言**の社内確認前に広く配るのはリスク
- 条件: 最低限の免責・非自動発注の明示確認、API 未設定時の表示確認、テスターへの「実売買しない」周知を満たしてから Opt-in 募集

---

## 7. Play 公開: NO の理由

- 免責・損失リスク表示が未整備／未確認
- 金融系ストアポリシー・規制観点の確認欠落
- typecheck と release-critical の整合が取れていない
- 内部テスター実機フィードバック未完了
- working tree 未整理により「配布物とリポジトリ状態」の一致が弱い

---

## 8. 次に直すべき優先順位

### P0（次フェーズ最優先）

1. 投資アプリとしての免責・規制・誤解防止
2. 自動売買ではないことの明示
3. API キー未設定時 UX
4. typecheck / lint の実態整理（同一コマンドであることの文書化とゲート再設計）
5. working tree 577 件の整理（本フェーズで監査・ignore のみ。大規模整理は継続）

### P1

1. `strictCharterOnly` 周辺の型整合
2. release-critical test と typecheck のズレ解消
3. Play Console 提出前の表示・免責文確認

### P2

1. foreground WARN 改善
2. memory_watch jsonl 運用確認
3. GitHub Pages / docs 整理

### 本フェーズでやらないこと

- 免責表示 UI 実装
- API 未設定 UX 修正
- `strictCharterOnly` 型修正
- typecheck 17 / npm test 6 の修正
- 投資ロジック変更
- Play 公開向け文言修正

---

## 9. 最終判断

| 項目 | 判定 |
|------|------|
| Fable 評価の受け入れ | **YES** |
| Internal testing | **条件付き YES** |
| Play 公開 | **NO** |
| 本フェーズ（証跡化・整理） | 実施 |
| 次フェーズ着手点 | **P0（安全性・免責・型整合・API UX）** |

**総合:** Fable の厳しい評価を正とし、自己申告の PASS を公開判断の十分条件としない。
