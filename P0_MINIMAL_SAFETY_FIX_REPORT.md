# P0 Minimal Safety Fix Before Internal Testing — Report

Generated: 2026-07-10T12:25+08:00  
Phase: **P0 Minimal Safety Fix Before Internal Testing**  
Base audit: `8ac0174`

---

## 1. 実施日時

2026-07-10（+08）

---

## 2. 修正ファイル

| ファイル | 内容 |
|----------|------|
| `src/constants/disclaimers.ts` | 内部テスト用 全文 / 短縮 安全文言を追加 |
| `src/components/CompactSafetyNotice.tsx` | **新規** — 短い安全表示コンポーネント |
| `src/screens/HomeScreen.tsx` | trust / beginner / pro 各ホームに表示 |
| `src/components/concierge/AiConciergeSheet.tsx` | Concierge シート先頭に表示 |
| `src/components/concierge/ConciergeTodayProposalsPanel.tsx` | 今日のおすすめ（空/有）に表示 |
| `src/screens/ManualOrderFlowScreen.tsx` | CompactNotice + 既存警告の補強 |
| `src/screens/AllocationPlanScreen.tsx` | 配分プラン画面先頭に表示 |
| `src/screens/SettingsScreen.tsx` | 詳細設定セクション先頭に表示 |
| `src/constants/apiSettings.ts` | キー未設定でも画面確認可能である旨を明記 |
| `src/services/manualOrderFlow.ts` | **B案** — 未使用 `strictCharterOnly` 引数を削除 |
| `tests/unit/conciergeBudgetOptimization.test.ts` | surplus prop 削除・追跡対象化 |
| `tests/unit/conciergeUiE2eOptimizationSmoke.test.ts` | 同上 |
| `tests/unit/oomHotfix.test.ts` | release-critical として追跡 |
| `tests/unit/e2eMetroEnv.test.ts` | 関連として追跡 |
| `CURRENT_STATUS.md` | 本フェーズ結果追記 |
| `P0_MINIMAL_SAFETY_FIX_REPORT.md` | 本レポート |

投資ロジック / AI 提案ロジックの変更は**なし**。

---

## 3. 追加した免責 / 非自動売買文言

**短縮版（主要導線）:**

> 参考情報のみ。利益保証なし。実際の注文は証券会社アプリで手動確認・手動入力してください。

**全文（定数として用意）:**

> このアプリは投資判断の参考情報を表示するもので、利益を保証するものではありません。実際の注文は証券会社アプリで内容を確認し、ご自身で手動入力してください。

既存の `MANUAL_ORDER_WARNING` / Allocation disclaimer / Settings 詳細免責は維持。

---

## 4. 表示箇所

| 画面 | 表示 |
|------|------|
| Home（trust / beginner / pro） | `CompactSafetyNotice` |
| AI Concierge シート | ヘッダ直下 |
| 今日のおすすめ（空・有） | タイトル直下 |
| Manual order flow | 画面先頭 + 既存警告カード内 |
| Allocation / おすすめ配分 | 画面先頭 |
| Settings（詳細設定） | PersonalUseBanner の前 |

---

## 5. APIキー未設定UX確認結果

| 項目 | 結果 |
|------|------|
| 実機確認 | **未完了** — `adb devices` で端末 `FYRWXSNNAIOR9DCM` が **unauthorized**。USB デバッグ許可待ち |
| 静的確認 | `ApiKeySettingsScreen` は未設定ステータス表示あり。クラッシュ前提の throw は見当たらず |
| 文言修正 | `apiSettings.ts`: 「未設定でも起動・基本画面確認可」「高度な AI / 最新株価は制限」を明記 |
| 内部テスター | キーなしでもホーム / 設定 / Concierge UI の確認は可能と案内可能。AI 応答・価格更新は制限あり |

---

## 6. versionCode 45 スモーク結果

| 項目 | 結果 |
|------|------|
| AAB 再インストール実機 | **未実施**（adb unauthorized） |
| 静的 / 単体 | focused 35/35 PASS。安全表示は src に配線済み |
| 制約 | 45 AAB 実機スモークは **Play アップロード前に運用者が実施必須** |
| 判定 | **CONDITIONAL** — コード側は準備済み、実機確認は残 |

---

## 7. strictCharterOnly 方針と対応

**採用: B案**（正式仕様にしない）

理由:

- `AllocationPlanInput` / `buildAllocationPlan` に実装が無い
- 余剰プロパティのみで、意図制御は効いていなかった
- A案（型+実装追加）は投資ロジック変更になりうるため本フェーズ禁止範囲

対応:

- `manualOrderFlow` から引数削除
- テストから `strictCharterOnly` を除去し、残現金・空 universe の既存挙動で断言
- typecheck から当該 `TS2353` は解消

---

## 8. release-critical 未追跡テストの扱い

| ファイル | 対応 |
|----------|------|
| `conciergeBudgetOptimization.test.ts` | **commit 対象に追加** |
| `conciergeUiE2eOptimizationSmoke.test.ts` | **commit 対象に追加** |
| `oomHotfix.test.ts` | **commit 対象に追加** |
| `e2eMetroEnv.test.ts` | **commit 対象に追加** |
| `devStatus.test.ts` | 既に tracked |
| `tests/unit/_*.mjs*` 等 | **commit しない**（パッチ残骸） |

---

## 9. テスト結果

| コマンド | 結果 |
|----------|------|
| `npx vitest run` 4 files | **35/35 PASS** |
| `npm run typecheck` | FAIL（既存）。`strictCharterOnly` / `manualOrderFlow` 6引数エラーは**解消** |
| `npm run lint` | typecheck と同一（既存 FAIL） |
| 悪化 | **なし**（Concierge 関連の新規型エラーなし） |

注意: `npm test -- <path>` は全 unit 実行のため、focused には `npx vitest run <paths>` を使用。

---

## 10. Internal testing / Play

| 項目 | 判定 |
|------|------|
| Internal testing | **CONDITIONAL GO** — 安全表示・型不整合解消・テスト追跡は完了。実機キーなし / 45 AAB スモークは運用者確認後に正式 GO |
| Play 公開 | **NO**（維持） |

---

## 11. 残課題

1. adb 許可後の **キーなし実機確認**
2. versionCode **45 AAB** インストール・スモーク
3. Play アップロードと Opt-in
4. 主要画面の「買い推奨」表現の見直し（次フェーズ）
5. 残 typecheck 既存エラーの段階的解消
6. working tree 大規模整理（継続）

---

## 12. 最終判定

# **PARTIAL → CONDITIONAL GO（Internal）**

- 最低限の誤解防止表示: **実施**
- strictCharterOnly 不整合: **解消（B案）**
- release-critical テスト: **追跡化**
- 実機 45 / キーなし: **未完了（端末 unauthorized）**
- Play: **NO**
