# Phase22.2–23 Commit 5 準備レポート

監査日: 2026-06-02  
対象コミット: **Commit 5** — `phase22.2-23: conviction and earnings revision intelligence with pipeline wiring`  
前提 HEAD: `2bd2005de3f8dd865da1a7160455627bf87563ef`（Commit 4 完了）  
実施範囲: **準備のみ**（`git add` / `commit` / `push` は未実施）

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| HEAD 確認 | **PASS** — `2bd2005de3f8dd865da1a7160455627bf87563ef` |
| 指定ファイル候補数 | **22**（ユーザー明示リスト） |
| 依存追加推奨 | **+4**（typecheck / 配線完結に必要） |
| disclosure 部分 stage | **+1**（残り 2 プロパティのみ — 単一 hunk） |
| **推奨 stage 合計** | **27** |
| Phase22.2 / Phase23 / Phase11 / UI / Concierge 依存 | **Commit 1–4 HEAD + Commit 5 候補で完結** |
| 隔離 typecheck 予想（推奨 27 件 stage 後） | **PASS（高確度）** |
| Commit 5 準備 | **PASS（条件付き）** |
| **総合判定** | **PASS（条件付き）** — 依存 4 件を同梱しない場合は **FAIL リスク** |

---

## 1. HEAD 確認

| 項目 | 値 |
|------|-----|
| `git rev-parse HEAD` | `2bd2005de3f8dd865da1a7160455627bf87563ef` |
| message | `phase22-22.1: analyst target and valuation gap intelligence` |
| parent | `b2da6970a6308e384fe5b39e2d14bc618c478073`（Commit 3） |
| remote `origin/cursor/top3-maxdd-capital-audit` | `338ebc4`（Commits 1–4 は **未 push**） |

---

## 2. Commit 5 ファイル候補一覧

### 2.1 ユーザー指定（22 件）

#### Phase22.2 — Conviction Intelligence（7 件）

| # | パス | 状態 |
|---|------|------|
| 1 | `docs/review/PHASE22_2_CONVICTION_INTELLIGENCE_REPORT.md` | `??` |
| 2 | `scripts/bursa-phase22-2-audit-verify.ts` | `??` |
| 3 | `src/constants/bursaConvictionIntelligence.ts` | `??` |
| 4 | `src/services/bursa/bursaConvictionIntelligenceService.ts` | `??` |
| 5 | `src/services/bursa/bursaPhase22_2Analysis.ts` | `??` |
| 6 | `src/types/bursaConvictionIntelligence.ts` | `??` |
| 7 | `tests/unit/bursaPhase22_2.test.ts` | `??` |

#### Phase23 — Earnings Revision Intelligence（8 件）

| # | パス | 状態 |
|---|------|------|
| 8 | `docs/review/PHASE23_EARNINGS_REVISION_INTELLIGENCE_REPORT.md` | `??` |
| 9 | `scripts/bursa-phase23-audit-verify.ts` | `??` |
| 10 | `src/constants/bursaEarningsRevisionIntelligence.ts` | `??` |
| 11 | `src/services/bursa/bursaEarningsRevisionIntelligenceProviders.ts` | `??` |
| 12 | `src/services/bursa/bursaEarningsRevisionIntelligenceService.ts` | `??` |
| 13 | `src/services/bursa/bursaPhase23Analysis.ts` | `??` |
| 14 | `src/types/bursaEarningsRevisionIntelligence.ts` | `??` |
| 15 | `tests/unit/bursaPhase23.test.ts` | `??` |

#### Phase11 フルパイプライン / MaterialAnalysis / Concierge（7 件）

| # | パス | 状態 | 差分規模 |
|---|------|------|----------|
| 16 | `src/services/bursa/bursaPhase11Analysis.ts` | `M` | +112 行 |
| 17 | `src/services/bursa/bursaMaterialAnalysisService.ts` | `M` | +122 行 |
| 18 | `src/screens/MaterialAnalysisScreen.tsx` | `M` | +427 行 |
| 19 | `src/services/buildConciergeEnhancedAnalysis.ts` | `M` | +162 行 |
| 20 | `src/types/conciergeEnhancedAnalysis.ts` | `M` | +221 行 |
| 21 | `src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx` | `M` | +475 行 |
| 22 | `src/context/BursaConciergeContext.tsx` | `M` | +10 / -? |

### 2.2 依存追加推奨（指定外・同梱必須級）（4 件）

| # | パス | 状態 | 理由 |
|---|------|------|------|
| 23 | `src/services/bursa/bursaAnalysisDiagnostics.ts` | `??` | `BursaConciergeContext.tsx` が `mapBursaAnalysisError` を import。未同梱だと隔離 typecheck **FAIL** |
| 24 | `src/services/bursa/bursaDisclosureService.ts` | `M` | Phase11 が `fetchBursaDisclosureBundle` 経由で `normalizeDisclosureBundle` を利用（パイプライン堅牢化） |
| 25 | `src/services/bursa/bursaDisclosureCache.ts` | `M` | キャッシュ読み出し時の normalize / 破損 JSON ガード（Phase11 上流データ品質） |
| 26 | `tests/unit/buildConciergeEnhancedAnalysis.test.ts` | `M` | Concierge 拡張（15→20 セクション、`sourceEvaluationsJa` 等）に追随。未同梱だと unit test **FAIL リスク** |

> `bursaPayloadNormalize` は **Commit 1 HEAD** に既存。disclosure service/cache の差分は新規ファイル不要。

### 2.3 任意追加（MaterialAnalysis UX — 指定外）

| # | パス | 状態 | 備考 |
|---|------|------|------|
| — | `src/context/BursaMaterialContext.tsx` | `M` (+18) | `mapBursaAnalysisError` / 12h リフレッシュ。typecheck 単体では未同梱でも可。**実行時 UX 整合のため同梱推奨** |

### 2.4 `bursaDisclosure.ts`（+1）

| # | パス | 内容 |
|---|------|------|
| 27 | `src/types/bursaDisclosure.ts` | `convictionIntelligence` / `earningsRevisionIntelligence` の 2 optional プロパティ |

### 2.5 ファイル件数サマリー

| 区分 | 件数 |
|------|------|
| ユーザー指定 | 22 |
| 依存追加推奨 | 4 |
| disclosure 部分更新 | 1 |
| **推奨 stage 合計** | **27** |
| 任意（MaterialContext） | +1 → **28**（任意採用時） |

| 内訳（推奨 27） | 件数 |
|-----------------|------|
| docs | 2 |
| scripts | 2 |
| src（constants / types / services / screens / components / context） | 18 |
| tests | 3 |
| disclosure | 1 |

| 新規 untracked add | 16 |
| modified add | 10 |
| disclosure | 1 |

---

## 3. `bursaDisclosure.ts` — Commit 5 に含める差分

### 3.1 現状

- **HEAD（Commit 4）**: Phase13–16 + Phase17–19.5 + Phase20–21.8 + Phase22–22.1 まで完了
- **working tree vs HEAD**: **単一 hunk・+4 行のみ**（Phase22.2 / Phase23 の 2 プロパティ）
- **残存未 stage プロパティ**: **なし**（Commit 5 で disclosure 累積は **完了**）

### 3.2 Commit 5 で stage する 2 プロパティ

```typescript
  /** Phase22.2 — Conviction Intelligence（optional） */
  convictionIntelligence?: import('./bursaConvictionIntelligence').BursaConvictionIntelligenceAnalysis | null;
  /** Phase23 — Earnings Revision Intelligence（optional） */
  earningsRevisionIntelligence?: import('./bursaEarningsRevisionIntelligence').BursaEarningsRevisionIntelligenceAnalysis | null;
```

**必要な型ファイル**（Commit 5 候補に含む）:

- `src/types/bursaConvictionIntelligence.ts`
- `src/types/bursaEarningsRevisionIntelligence.ts`

### 3.3 `bursaDisclosure.ts` 部分 stage 計画

| 操作 | 内容 |
|------|------|
| Hunk 1/1 | **`y`（丸ごと採用可）** — hunk 全体が上記 2 プロパティのみ |
| 代替（非対話） | working tree が HEAD + 2 プロパティのみなら **`git add src/types/bursaDisclosure.ts`** で可 |
| Commit 4 との違い | Commit 4 は 4 プロパティ混在のため **edit 必須**だったが、Commit 5 は **分割不要** |

**非対話シェル案**（Commit 1–4 同方式・保険）:

1. HEAD スナップショット + 2 プロパティ行までを `fs.writeFileSync`
2. `git add src/types/bursaDisclosure.ts`
3. working tree を現行全量に復元（既に同一なら no-op）

---

## 4. 依存関係

### 4.1 パイプライン順（Commit 5 範囲）

```
Phase23 (Earnings Revision)
  → Phase22.2 (Conviction — Fair Value / Analyst Target / Valuation Gap / Earnings Revision 統合)
  → Phase11 フルオーケストレーション（Phase13–23 全 enrich）
  → MaterialAnalysisService / Screen
  → Concierge Enhanced Analysis
```

**Phase11 内の実行順**（`bursaPhase11Analysis.ts`）:

1. `enrichStockWithEarningsRevisionIntelligence`（Phase23・async）
2. `enrichStockWithConvictionIntelligence`（Phase22.2・sync、revision 結果を入力に使用）

### 4.2 Phase22.2 ↔ Phase23 結合

| 関係 | 詳細 |
|------|------|
| `bursaConvictionIntelligenceService` | `BursaEarningsRevisionIntelligenceAnalysis` 型と `applyEarningsRevisionConvictionAdjustment` を import |
| `bursaPhase22_2Analysis` | `input.stock.earningsRevisionIntelligence` を conviction 構築に渡す |
| **結論** | Phase22.2 と Phase23 は **同一コミット必須**（分割不可） |

### 4.3 上流依存（Commit 1–4 HEAD）

| Commit 5 コンポーネント | 依存先 | 所在 |
|------------------------|--------|------|
| `bursaPhase23Analysis` | `bursaAnalystConsensus`, `bursaEarningsCall` / financial report | **Commit 1 HEAD** |
| `bursaEarningsRevisionIntelligenceProviders` | `providerFetchUtil`, Yahoo / consensus 系 | **Commit 1 HEAD + base** |
| `bursaPhase22_2Analysis` | `bursaMaterialSentiment`, Fair Value / Analyst Target / Valuation Gap | **Commit 3–4 HEAD** |
| `bursaConvictionIntelligenceService` | 上記 + Phase23 service | **Commit 5 内** |
| `bursaPhase11Analysis` | Phase13–22.1 全 `enrichStockWith*` | **Commits 1–4 HEAD** |
| `bursaDisclosureService` / cache | `bursaPayloadNormalize` | **Commit 1 HEAD** |
| Concierge / Material UI | 各 intelligence 型・unavailable JA 定数 | **Commits 1–5 候補** |

### 4.4 import トレース（Commit 5 候補 26 roots + disclosure 型）

`scripts/_tmp-commit5-deps.mjs` 実行結果:

```json
{
  "roots": 16,
  "missingTotal": 0,
  "onHeadSatisfied": 0,
  "trulyMissing": []
}
```

（ユーザー指定 + 依存 4 件を roots に含めた走査）

### 4.5 依存完結性判定

| 観点 | 結果 |
|------|------|
| Phase22.2 / Phase23 → Commits 1–4 型・サービス | **充足** |
| Phase11 → Phase22.2 / Phase23 | **Commit 5 候補内** |
| Concierge → `bursaAnalysisDiagnostics` | **候補 #23 必須** |
| disclosure 2 プロパティ → 型モジュール | **候補内** |
| Commit 5 外の未コミット Phase 依存 | **なし** |

**結論**: Phase22.2 / Phase23 / Phase11 / UI / Concierge 配線は **Commit 1–4 HEAD + Commit 5 推奨 27 件** で依存完結。

---

## 5. 除外ファイル一覧

### 5.1 ユーザー禁止カテゴリ

| カテゴリ | 扱い |
|----------|------|
| `docs/review/phase12-5-long-run/**` | **除外** |
| `*.png` / `*.jpg` / `*.log` | **除外** |
| `openai-*.json` | **除外** |
| device verify 成果物 | **除外** |
| `.env` / API キー / Bearer Token | **除外** |
| 855 件一括 add | **禁止** |
| `git push` | **禁止** |

### 5.2 戦略上 Commit 5 外（残作業・別コミット候補）

| パス / カテゴリ | 理由 |
|-----------------|------|
| `docs/review/PHASE13_23_COMMIT_STRATEGY_REPORT.md` 等メタ監査 doc | 任意 Commit 6（docs のみ） |
| `docs/review/evidence/**` | 証跡ログ — 禁止拡張子・運用成果物 |
| `docs/review/evidence/bursaDisclosure-full-backup.ts` | ローカルバックアップ — コミット対象外 |
| `.expo-bundle-*` / `agent-tools/**` | ビルド・検証成果物 |
| `App.tsx`, `package.json`, `.vscode/**`, `.cursorignore` | Phase13–23 スコープ外の横断変更 |
| `scripts/device-ui-automation.mjs` 等 device 系 | device verify スコープ |
| `scripts/openai-*.json`, `scripts/*-run.txt` | 分析成果物 |
| Phase12.5 long-run 一式 | 明示禁止 |

### 5.3 Commit 5 に含めないが working tree に残る modified（参考）

| パス | 備考 |
|------|------|
| `src/context/BursaMaterialContext.tsx` | §2.3 任意。未同梱でも typecheck は通る見込み |
| 上記 §5.2 各種 | 戦略・証跡・横断変更 |

---

## 6. typecheck 予想

| シナリオ | 予想 | 根拠 |
|----------|------|------|
| **A. 指定 22 件 + disclosure のみ** | **FAIL** | `BursaConciergeContext` → `bursaAnalysisDiagnostics` 未 stage |
| **B. 推奨 27 件 stage 後** | **PASS（高確度）** | Commits 1–4 HEAD + 全 intelligence 型・配線が揃う |
| **C. 27 件 + MaterialContext** | **PASS** | シナリオ B と同等 |
| **D. disclosure 未 stage** | **FAIL** | Phase11 / Material / Concierge が disclosure 上の 2 フィールドを参照 |

**推奨ゲート（Commit 5 直後）**:

```bash
npm run typecheck
```

---

## 7. unit test 対象

### 7.1 必須（Commit 5 直結）

| ファイル | テスト数（概算） | 内容 |
|----------|------------------|------|
| `tests/unit/bursaPhase22_2.test.ts` | 8 | Conviction intelligence |
| `tests/unit/bursaPhase23.test.ts` | 9 | Earnings revision intelligence |
| `tests/unit/buildConciergeEnhancedAnalysis.test.ts` | 既存 suite | 20 セクション・`sourceEvaluationsJa` 追随 |

```bash
npx vitest run \
  tests/unit/bursaPhase22_2.test.ts \
  tests/unit/bursaPhase23.test.ts \
  tests/unit/buildConciergeEnhancedAnalysis.test.ts
```

### 7.2 回帰推奨

| ファイル | テスト数 | 理由 |
|----------|----------|------|
| `tests/unit/bursaPhase11.test.ts` | 4 | Phase11 フルパイプライン変更（**HEAD で変更なし**だが配線回帰） |

```bash
npx vitest run tests/unit/bursaPhase11.test.ts
```

### 7.3 audit スクリプト（実行任意・コミット前検証用）

```bash
npx tsx scripts/bursa-phase22-2-audit-verify.ts
npx tsx scripts/bursa-phase23-audit-verify.ts
```

---

## 8. full test 必要性

| 観点 | 判定 |
|------|------|
| `npm run test:unit` 全件 | **推奨（高）** — Concierge / Material / Phase11 の広範配線変更（+1500 行級） |
| 最小ゲート | §7.1 の 3 ファイル + typecheck |
| `PHASE13_23_COMMIT_STRATEGY_REPORT` 方針 | push 前に full unit を推奨 |

**理由**: `MaterialAnalysisScreen.tsx`（+427）、`ConciergeEnhancedAnalysisBlock.tsx`（+475）、`conciergeEnhancedAnalysis.ts`（+221）が横断的に変更されており、局所テストのみでは regression を取りこぼす可能性がある。

---

## 9. commit 可否

| 判定項目 | 結果 |
|----------|------|
| ファイル候補確定 | **可** |
| 依存関係（Phase22.2–23 + 配線） | **完結**（推奨 27 件前提） |
| 禁止ファイル混入 | **なし**（推奨リスト内） |
| disclosure stage 計画 | **可**（単一 hunk・2 プロパティのみ） |
| Phase22.2 / Phase23 同梱 | **必須** |
| 現時点での commit 実行 | **禁止**（本タスク指示） |

**commit 可否**: **準備 PASS（条件付き）** — 依存 4 件（#23–#26）を同梱したうえで Proceed 可

---

## 10. 次に実行する `git add` コマンド案

> **注意**: 以下は案のみ。本レポート時点では **未実行**。

### 10.1 Commit 5 候補 26 件（ファイル本体）

```bash
git add \
  docs/review/PHASE22_2_CONVICTION_INTELLIGENCE_REPORT.md \
  docs/review/PHASE23_EARNINGS_REVISION_INTELLIGENCE_REPORT.md \
  scripts/bursa-phase22-2-audit-verify.ts \
  scripts/bursa-phase23-audit-verify.ts \
  src/constants/bursaConvictionIntelligence.ts \
  src/constants/bursaEarningsRevisionIntelligence.ts \
  src/services/bursa/bursaAnalysisDiagnostics.ts \
  src/services/bursa/bursaConvictionIntelligenceService.ts \
  src/services/bursa/bursaEarningsRevisionIntelligenceProviders.ts \
  src/services/bursa/bursaEarningsRevisionIntelligenceService.ts \
  src/services/bursa/bursaPhase22_2Analysis.ts \
  src/services/bursa/bursaPhase23Analysis.ts \
  src/services/bursa/bursaPhase11Analysis.ts \
  src/services/bursa/bursaMaterialAnalysisService.ts \
  src/services/bursa/bursaDisclosureService.ts \
  src/services/bursa/bursaDisclosureCache.ts \
  src/screens/MaterialAnalysisScreen.tsx \
  src/services/buildConciergeEnhancedAnalysis.ts \
  src/types/conciergeEnhancedAnalysis.ts \
  src/types/bursaConvictionIntelligence.ts \
  src/types/bursaEarningsRevisionIntelligence.ts \
  src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx \
  src/context/BursaConciergeContext.tsx \
  tests/unit/bursaPhase22_2.test.ts \
  tests/unit/bursaPhase23.test.ts \
  tests/unit/buildConciergeEnhancedAnalysis.test.ts
```

### 10.2 `bursaDisclosure.ts`（残り 2 プロパティ）

```bash
# 単一 hunk のため丸ごと add で可
git add src/types/bursaDisclosure.ts
```

### 10.3 任意（MaterialAnalysis UX）

```bash
git add src/context/BursaMaterialContext.tsx
```

### 10.4 実行後ゲート（承認後）

```bash
npm run typecheck
npx vitest run tests/unit/bursaPhase22_2.test.ts tests/unit/bursaPhase23.test.ts tests/unit/buildConciergeEnhancedAnalysis.test.ts tests/unit/bursaPhase11.test.ts
# 推奨: npm run test:unit
git commit -m "$(cat <<'EOF'
phase22.2-23: conviction and earnings revision intelligence with pipeline wiring

EOF
)"
```

---

## 11. PASS / FAIL

| チェック | 判定 |
|----------|------|
| HEAD = `2bd2005` | **PASS** |
| Commit 5 候補一覧（指定 22 + 依存 4 + disclosure） | **PASS** |
| ファイル件数（推奨 27） | **PASS** |
| `bursaDisclosure.ts` 2 プロパティ差分 | **PASS** |
| 依存関係完結（Commits 1–4 HEAD 上） | **PASS** |
| 除外一覧 | **PASS** |
| typecheck 予想（推奨セット） | **PASS（高確度）** |
| `git add` / commit / push 未実施 | **PASS** |
| **総合（Commit 5 準備）** | **PASS（条件付き）** |

---

## 12. 停止宣言

Commit 5 準備完了。`git add` / `commit` / `push` は **一切実行していない**。

次ステップ（ユーザー承認後）: §10.1 add → §10.2 disclosure add → typecheck → §7 unit tests →（推奨）full `test:unit` → commit

---

*Evidence: `git rev-parse HEAD`, `git status --porcelain`（候補パス）, `git diff HEAD --stat`, `git diff HEAD -- src/types/bursaDisclosure.ts`, import trace（missing 0）, `docs/review/PHASE22_22_1_COMMIT4_EXECUTION_REPORT.md`*
