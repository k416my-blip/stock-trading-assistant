# P0 Minimal Fix Plan

Generated: 2026-07-10T11:40+08:00  
前提: `P0_SAFETY_COMPLIANCE_API_UX_AUDIT.md`  
本フェーズでは **実装しない**。次フェーズの着手順のみ。

---

## 1. すぐ直すべき最小修正（次フェーズ候補）

| # | 修正 | 種別 | 優先 |
|---|------|------|------|
| 1 | テスター招待文・手順に免責 / 非自動売買 / 自己責任 / キーなし範囲を明記 | docs | P0 |
| 2 | Concierge / 今日のおすすめ / ホームに短い共通免責 1 行を常時表示 | UI 最小 | P0 |
| 3 | `strictCharterOnly`: 型に追加して実装するか、テストから削除するか方針決定→最小差分 | 型 / ロジック境界 | P1（調査は P0） |
| 4 | release-critical テスト 3 ファイルを tracked にするか、ゲートから外すか決定 | git / gate | P0 |
| 5 | `package.json` の `lint` を「typecheck エイリアス」と README/レポートで明示。将来 ESLint 分離 | docs / scripts | P0 文書 |
| 6 | API キーなし実機チェックリスト実行（クラッシュしない・設定誘導） | 検証 | P0 |
| 7 | versionCode 45 AAB スモーク（起動・Concierge・Manual order 警告表示） | 検証 | P0 |

---

## 2. 触るファイル（次フェーズ・想定）

| 目的 | 候補 |
|------|------|
| 共通免責 1 行 | `disclaimers.ts` / Concierge パネル / Today proposals / Home |
| テスター文面 | `TESTER_INVITATION_MESSAGE_JA.md`, `TESTER_INSTALL_AND_FEEDBACK_GUIDE_JA.md` |
| 型整合 | `src/types/index.ts`, `allocationPlan.ts` またはテストから `strictCharterOnly` 削除 |
| テスト追跡 | `tests/unit/conciergeBudgetOptimization.test.ts` 等（選別 commit） |
| gate 説明 | 本監査・CURRENT_STATUS・必要なら package.json コメント相当の docs |

---

## 3. 触らないファイル（当面）

- 投資配分・委員会・buy 昇格ロジックの大規模変更
- forwardValidation 配下
- `android/app/build.gradle`（未精査のまま）
- scripts/ 大量未追跡
- AAB 再ビルド（スモーク不足が確定するまで急がない）
- Play Console 公開操作

---

## 4. リスク

| リスク | 内容 |
|--------|------|
| 免責を足すだけ | 露出不足は改善するが、強い「買い推奨」ラベルが残ると不十分 |
| `strictCharterOnly` を型だけ追加 | 実行分岐が無いとテストが偽 PASS のまま |
| `strictCharterOnly` を実装 | beginner 見送り挙動が変わりうる → 回帰テスト必須 |
| 未追跡テストを一括 add | working tree 他ファイルを巻き込まないよう path 限定 |

---

## 5. テスト方法（次フェーズ）

```bash
npx vitest run tests/unit/devStatus.test.ts tests/unit/conciergeBudgetOptimization.test.ts tests/unit/conciergeUiE2eOptimizationSmoke.test.ts tests/unit/oomHotfix.test.ts
npm run typecheck
# 実機: APIキー全消し → 起動 → ホーム → Concierge → 設定 → RiskWarning
```

注意: `npm test -- <path>` は `test:unit` が全 unit を実行するため、**focused には `npx vitest run <paths>` を使う**。

---

## 6. commit 方針

| フェーズ | commit 内容 |
|----------|-------------|
| 本フェーズ（今） | `P0_SAFETY_COMPLIANCE_API_UX_AUDIT.md`, `P0_MINIMAL_FIX_PLAN.md` のみ |
| 次 | 免責 1 行 UI / テスター文面 / 型方針のどれか **1 テーマずつ** |
| 禁止 | `git add -A`、logcat、AAB、未精査 scripts |

---

## 7. 判断の再掲

- Internal testing: **条件付き YES**（最低条件は監査レポート §10）
- Play 公開: **NO**
- AAB 成功 ≠ 安全に配れる
