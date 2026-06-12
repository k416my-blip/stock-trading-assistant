# Phase13–16 `bursaDisclosure.ts` 分割計画

監査日: 2026-06-02  
対象: `src/types/bursaDisclosure.ts`  
比較基準: `338ebc4`（soft reset 後の parent 想定）  
現状 HEAD: `44f1a2b`（当該ファイルはコミット済み・working tree 差分なし）

**本タスク**: 分割計画の作成のみ — `commit` / `push` / `reset` / `git add` は **未実施**

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| `git diff 338ebc4` の hunk 数 | **3** |
| `git add -p` でそのまま `y` できる hunk | **2**（Hunk 1–2） |
| 分割が必要な hunk | **1**（Hunk 3 — Phase13–16 と Phase17–23 が同一 hunk） |
| Commit 1 単体 typecheck 見込み（分割後） | **PASS（高確度）** |
| 分割計画 | **PASS** |
| 現状（全量のまま Commit 1） | **FAIL** |

---

## 1. 差分概要

`338ebc4` → 現行 HEAD の差分は **+41 行 / 3 hunk** のみ。Phase13 以前の型定義本体に変更はない。

```
@@ -1,4 +1,5 @@                          → Hunk 1: top-level import
@@ -685,6 +686,10 @@ BursaMaterialItem   → Hunk 2: scoreJa / detailJa
@@ -740,6 +745,37 @@ BursaStockMaterialAnalysis → Hunk 3: Phase13–23 optional プロパティ（混在）
```

---

## 2. Commit 1 に含める差分

### 2.1 Hunk 1 — top-level import（L2 付近）

```diff
+import type { BursaEarningsCallAnalysis } from './bursaEarningsCall';
```

| 項目 | 内容 |
|------|------|
| 用途 | Phase13 `earningsCall` プロパティの型 |
| 判定 | **含める** |

### 2.2 Hunk 2 — `BursaMaterialItem` 拡張（L689–692 付近）

```diff
+  /** UI表示用スコア文字列（例: +12） */
+  scoreJa?: string;
+  /** 詳細評価（Phase Intelligence 材料用） */
+  detailJa?: string;
```

| 項目 | 内容 |
|------|------|
| 用途 | Phase13–16 材料スコアの UI 表示・詳細評価 |
| 判定 | **含める** |

### 2.3 Hunk 3 のうち Commit 1 部分 — `BursaStockMaterialAnalysis`（L748–758 相当）

```typescript
  /** Phase13 — Earnings Call 解析（optional） */
  earningsCall?: BursaEarningsCallAnalysis | null;
  /** Phase14 — Analyst Consensus（optional） */
  analystConsensus?: import('./bursaAnalystConsensus').BursaAnalystConsensusAnalysis | null;
  /** Phase15 — Insider Trading（optional） */
  insiderTrading?: import('./bursaInsiderTrading').BursaInsiderTradingAnalysis | null;
  institutionalOwnership?: import('./bursaInstitutionalOwnership').BursaInstitutionalOwnershipAnalysis | null;
  institutionalTrend?: import('./bursaInstitutionalTrend').BursaInstitutionalTrendAnalysis | null;
  historicalOwnership?: import('./bursaHistoricalOwnership').BursaHistoricalOwnershipAnalysis | null;
  /** Phase16.7 — Fixed Institutional Basket（optional） */
  fixedInstitutionalBasket?: import('./bursaFixedInstitutionalBasket').BursaFixedInstitutionalBasketAnalysis | null;
```

| Phase | フィールド | 判定 |
|-------|-----------|------|
| 13 | `earningsCall` | 含める |
| 14 | `analystConsensus` | 含める |
| 15 | `insiderTrading` | 含める |
| 16 | `institutionalOwnership` | 含める |
| 16.5 | `institutionalTrend` | 含める |
| 16.6 | `historicalOwnership` | 含める |
| 16.7 / 16.8 | `fixedInstitutionalBasket` | 含める |

**Commit 1 完成形の末尾イメージ**（`fetchedFields` 直前）:

```typescript
  redditFetchDiagnostics?: BursaRedditFetchDiagnostics;
  /** Phase13 — Earnings Call 解析（optional） */
  earningsCall?: BursaEarningsCallAnalysis | null;
  /** Phase14 — Analyst Consensus（optional） */
  analystConsensus?: import('./bursaAnalystConsensus').BursaAnalystConsensusAnalysis | null;
  /** Phase15 — Insider Trading（optional） */
  insiderTrading?: import('./bursaInsiderTrading').BursaInsiderTradingAnalysis | null;
  institutionalOwnership?: import('./bursaInstitutionalOwnership').BursaInstitutionalOwnershipAnalysis | null;
  institutionalTrend?: import('./bursaInstitutionalTrend').BursaInstitutionalTrendAnalysis | null;
  historicalOwnership?: import('./bursaHistoricalOwnership').BursaHistoricalOwnershipAnalysis | null;
  /** Phase16.7 — Fixed Institutional Basket（optional） */
  fixedInstitutionalBasket?: import('./bursaFixedInstitutionalBasket').BursaFixedInstitutionalBasketAnalysis | null;
  fetchedFields: string[];
  missingFields: string[];
};
```

---

## 3. Commit 1 から除外する差分

### 3.1 Hunk 3 のうち Phase17–23 部分（L759–778 相当）

```typescript
  /** Phase17 — Dividend Intelligence（optional） */
  dividendIntelligence?: import('./bursaDividendIntelligence').BursaDividendIntelligenceAnalysis | null;
  /** Phase18 — News Intelligence（optional） */
  newsIntelligence?: import('./bursaNewsIntelligence').BursaNewsIntelligenceAnalysis | null;
  /** Phase19 — Macro Intelligence（optional） */
  macroIntelligence?: import('./bursaMacroIntelligence').BursaMacroIntelligenceAnalysis | null;
  /** Phase19.5 — Sector Rotation Intelligence（optional） */
  sectorRotation?: import('./bursaSectorRotation').BursaSectorRotationAnalysis | null;
  /** Phase20 — Valuation Intelligence（optional） */
  valuationIntelligence?: import('./bursaValuationIntelligence').BursaValuationIntelligenceAnalysis | null;
  /** Phase21 — Fair Value Intelligence（optional） */
  fairValueIntelligence?: import('./bursaFairValueIntelligence').BursaFairValueIntelligenceAnalysis | null;
  /** Phase22 — Analyst Target Intelligence（optional） */
  analystTargetIntelligence?: import('./bursaAnalystTargetIntelligence').BursaAnalystTargetIntelligenceAnalysis | null;
  /** Phase22.1 — Valuation Gap Intelligence（optional） */
  valuationGapIntelligence?: import('./bursaValuationGapIntelligence').BursaValuationGapIntelligenceAnalysis | null;
  /** Phase22.2 — Conviction Intelligence（optional） */
  convictionIntelligence?: import('./bursaConvictionIntelligence').BursaConvictionIntelligenceAnalysis | null;
  /** Phase23 — Earnings Revision Intelligence（optional） */
  earningsRevisionIntelligence?: import('./bursaEarningsRevisionIntelligence').BursaEarningsRevisionIntelligenceAnalysis | null;
```

| プロパティ | 延期先コミット |
|-----------|--------------|
| `dividendIntelligence` | Commit 2（Phase17） |
| `newsIntelligence` | Commit 2（Phase18） |
| `macroIntelligence` | Commit 2（Phase19） |
| `sectorRotation` | Commit 2（Phase19.5） |
| `valuationIntelligence` | Commit 3（Phase20） |
| `fairValueIntelligence` | Commit 3（Phase21） |
| `analystTargetIntelligence` | Commit 4（Phase22） |
| `valuationGapIntelligence` | Commit 4（Phase22.1） |
| `convictionIntelligence` | Commit 5（Phase22.2） |
| `earningsRevisionIntelligence` | Commit 5（Phase23） |

> **注**: Phase17–23 向け **top-level import は追加されていない**（すべて `import('...')` インライン型参照）。除外対象は上記 10 プロパティ行 + コメント行のみ。

---

## 4. Phase13–16 に必要な import 一覧

### 4.1 top-level import（Commit 1 に含める）

| import | 参照元型 |
|--------|---------|
| `import type { BursaEarningsCallAnalysis } from './bursaEarningsCall'` | `earningsCall` |

### 4.2 インライン `import('...')` 型参照（Commit 1 に含める）

| モジュール | 型 | Phase |
|-----------|-----|-------|
| `./bursaAnalystConsensus` | `BursaAnalystConsensusAnalysis` | 14 |
| `./bursaInsiderTrading` | `BursaInsiderTradingAnalysis` | 15 |
| `./bursaInstitutionalOwnership` | `BursaInstitutionalOwnershipAnalysis` | 16 |
| `./bursaInstitutionalTrend` | `BursaInstitutionalTrendAnalysis` | 16.5 |
| `./bursaHistoricalOwnership` | `BursaHistoricalOwnershipAnalysis` | 16.6 |
| `./bursaFixedInstitutionalBasket` | `BursaFixedInstitutionalBasketAnalysis` | 16.7 |

**Commit 1 時点で同時に存在が必要な型ファイル**（`PHASE13_16_COMMIT1_PREPARATION_REPORT.md` 候補と一致）:

```
src/types/bursaEarningsCall.ts
src/types/bursaAnalystConsensus.ts
src/types/bursaInsiderTrading.ts
src/types/bursaInstitutionalOwnership.ts
src/types/bursaInstitutionalTrend.ts
src/types/bursaHistoricalOwnership.ts
src/types/bursaFixedInstitutionalBasket.ts
```

---

## 5. Phase17–23 に延期する import 一覧

| モジュール | 型 | プロパティ | 延期先 |
|-----------|-----|-----------|--------|
| `./bursaDividendIntelligence` | `BursaDividendIntelligenceAnalysis` | `dividendIntelligence` | Commit 2 |
| `./bursaNewsIntelligence` | `BursaNewsIntelligenceAnalysis` | `newsIntelligence` | Commit 2 |
| `./bursaMacroIntelligence` | `BursaMacroIntelligenceAnalysis` | `macroIntelligence` | Commit 2 |
| `./bursaSectorRotation` | `BursaSectorRotationAnalysis` | `sectorRotation` | Commit 2 |
| `./bursaValuationIntelligence` | `BursaValuationIntelligenceAnalysis` | `valuationIntelligence` | Commit 3 |
| `./bursaFairValueIntelligence` | `BursaFairValueIntelligenceAnalysis` | `fairValueIntelligence` | Commit 3 |
| `./bursaAnalystTargetIntelligence` | `BursaAnalystTargetIntelligenceAnalysis` | `analystTargetIntelligence` | Commit 4 |
| `./bursaValuationGapIntelligence` | `BursaValuationGapIntelligenceAnalysis` | `valuationGapIntelligence` | Commit 4 |
| `./bursaConvictionIntelligence` | `BursaConvictionIntelligenceAnalysis` | `convictionIntelligence` | Commit 5 |
| `./bursaEarningsRevisionIntelligence` | `BursaEarningsRevisionIntelligenceAnalysis` | `earningsRevisionIntelligence` | Commit 5 |

---

## 6. Commit 1 用 stage 計画

### 6.1 前提（Commit 1 実行フェーズ — 本レポートでは未実行）

```text
1. git reset --soft 338ebc4          ← ユーザー承認後
2. git reset HEAD src/types/bursaDisclosure.ts   ← 全量を unstage（Phase17–23 混入防止）
3. git add -p src/types/bursaDisclosure.ts       ← §7 の y/n/e 計画に従う
4. （残り Commit 1 候補 62 件を git add）
5. npm run typecheck
6. git commit -m "phase13-16: earnings call through institutional intelligence"
```

> **重要**: `44f1a2b` には `bursaDisclosure.ts` 全量が含まれる。soft reset 直後は index に Phase17–23 付き全量が staged になるため、**Commit 1 前に必ず unstage → 部分 stage** すること。

### 6.2 ワーキングツリー上の残差分

`git add -p` で Phase13–16 のみ stage した場合:

| 状態 | 内容 |
|------|------|
| **staged** | Phase13–16 スライス（+14 行相当） |
| **unstaged** | Phase17–23 プロパティ 10 件（+20 行 + コメント） |
| **working tree** | 現行全量を維持（後続コミット用に保持） |

後続 Commit 2–5 では、unstaged の Phase17–23 行を段階的に stage していく。

### 6.3 代替手段（`git add -p` edit が難しい場合）

1. 作業用コピーから Phase17–23 行を一時削除した `bursaDisclosure.ts` を作成
2. `git add src/types/bursaDisclosure.ts` で Commit 1 版を stage
3. 削除行を working tree に復元（`git checkout --` しない — 手動で Phase17–23 行を戻す）

---

## 7. `git add -p` の y / n / e 計画

比較基準: `338ebc4`（unstage 後の `git add -p src/types/bursaDisclosure.ts`）

| Hunk | 位置 | 内容 | 操作 | 理由 |
|------|------|------|------|------|
| **1** | L1 付近 | `import type { BursaEarningsCallAnalysis } ...` | **`y`** | Phase13 必須 top-level import |
| **2** | L685 付近 | `scoreJa` / `detailJa` on `BursaMaterialItem` | **`y`** | Phase13–16 材料 UI 用 |
| **3** | L740 付近 | `BursaStockMaterialAnalysis` optional 11 ブロック混在 | **`e`（edit）** | Phase13–16 と Phase17–23 が **同一 hunk** — 丸ごと `y` 禁止 |

### 7.1 Hunk 3 — `e`（edit）内の行別判定

`git add -p` で Hunk 3 表示 → **`e`** を選択 → 以下のとおり `+` 行を編集:

| 行内容（`+` プレフィックス） | edit 操作 | 理由 |
|------------------------------|-----------|------|
| `+  /** Phase13 — Earnings Call...` | **保持** | Phase13 |
| `+  earningsCall?: BursaEarningsCallAnalysis...` | **保持** | Phase13 |
| `+  /** Phase14 — Analyst Consensus...` | **保持** | Phase14 |
| `+  analystConsensus?: import('./bursaAnalystConsensus')...` | **保持** | Phase14 |
| `+  /** Phase15 — Insider Trading...` | **保持** | Phase15 |
| `+  insiderTrading?: import('./bursaInsiderTrading')...` | **保持** | Phase15 |
| `+  institutionalOwnership?: import('./bursaInstitutionalOwnership')...` | **保持** | Phase16 |
| `+  institutionalTrend?: import('./bursaInstitutionalTrend')...` | **保持** | Phase16.5 |
| `+  historicalOwnership?: import('./bursaHistoricalOwnership')...` | **保持** | Phase16.6 |
| `+  /** Phase16.7 — Fixed Institutional Basket...` | **保持** | Phase16.7 |
| `+  fixedInstitutionalBasket?: import('./bursaFixedInstitutionalBasket')...` | **保持** | Phase16.7 |
| `+  /** Phase17 — Dividend Intelligence...` | **削除**（`-` または行除去） | Phase17 — 延期 |
| `+  dividendIntelligence?: import('./bursaDividendIntelligence')...` | **削除** | Phase17 — 延期 |
| `+  /** Phase18 — News Intelligence...` | **削除** | Phase18 — 延期 |
| `+  newsIntelligence?: import('./bursaNewsIntelligence')...` | **削除** | Phase18 — 延期 |
| `+  /** Phase19 — Macro Intelligence...` | **削除** | Phase19 — 延期 |
| `+  macroIntelligence?: import('./bursaMacroIntelligence')...` | **削除** | Phase19 — 延期 |
| `+  /** Phase19.5 — Sector Rotation...` | **削除** | Phase19.5 — 延期 |
| `+  sectorRotation?: import('./bursaSectorRotation')...` | **削除** | Phase19.5 — 延期 |
| `+  /** Phase20 — Valuation Intelligence...` | **削除** | Phase20 — 延期 |
| `+  valuationIntelligence?: import('./bursaValuationIntelligence')...` | **削除** | Phase20 — 延期 |
| `+  /** Phase21 — Fair Value Intelligence...` | **削除** | Phase21 — 延期 |
| `+  fairValueIntelligence?: import('./bursaFairValueIntelligence')...` | **削除** | Phase21 — 延期 |
| `+  /** Phase22 — Analyst Target Intelligence...` | **削除** | Phase22 — 延期 |
| `+  analystTargetIntelligence?: import('./bursaAnalystTargetIntelligence')...` | **削除** | Phase22 — 延期 |
| `+  /** Phase22.1 — Valuation Gap Intelligence...` | **削除** | Phase22.1 — 延期 |
| `+  valuationGapIntelligence?: import('./bursaValuationGapIntelligence')...` | **削除** | Phase22.1 — 延期 |
| `+  /** Phase22.2 — Conviction Intelligence...` | **削除** | Phase22.2 — 延期 |
| `+  convictionIntelligence?: import('./bursaConvictionIntelligence')...` | **削除** | Phase22.2 — 延期 |
| `+  /** Phase23 — Earnings Revision Intelligence...` | **削除** | Phase23 — 延期 |
| `+  earningsRevisionIntelligence?: import('./bursaEarningsRevisionIntelligence')...` | **削除** | Phase23 — 延期 |

edit 完了後 → **`y`**（編集済み hunk を stage）

### 7.2 操作サマリー（一覧）

```
Hunk 1/3 → y
Hunk 2/3 → y
Hunk 3/3 → e  → Phase13–16 行のみ残す → y
```

**禁止操作**:

```
Hunk 3/3 → y   # NG — Phase17–23 が Commit 1 に混入し隔離 typecheck FAIL
Hunk 3/3 → n   # NG — Phase13–16 フィールドも失われる
```

---

## 8. Commit 1 単体 typecheck 見込み

| 条件 | 見込み | 根拠 |
|------|--------|------|
| `bursaDisclosure.ts` 全量（現状） | **FAIL** | 10 個の Phase17+ type モジュールが Commit 1 に不在 |
| §2 の Phase13–16 スライスのみ + Commit 1 候補 62 件 | **PASS** | Phase13–16 オーケストレータは Phase17+ を import しない。必要 type 7 件は Commit 1 候補に含まれる |
| base `338ebc4` 既存インフラ | 影響なし | KLSE parser / `providerFetchUtil` 等は base 済み |

**検証コマンド（Commit 1 直後想定）**:

```bash
npm run typecheck
npx vitest run tests/unit/bursaPhase13.test.ts tests/unit/bursaPhase14.test.ts \
  tests/unit/bursaPhase15.test.ts tests/unit/bursaPhase16*.test.ts
```

**注意**: ローカル working tree には Phase17–23 行が **unstaged として残る**ため、Commit 1 コミット後の `npm run typecheck` は **コミット内容（index/HEAD）** で判定すること。working tree 全量ではなく、Commit 1 スナップショットで隔離検証する。

---

## 9. PASS / FAIL

| チェック | 判定 |
|----------|------|
| 含める差分の分類 | **PASS** |
| 除外差分の分類 | **PASS** |
| Phase13–16 import 一覧 | **PASS** |
| Phase17–23 延期 import 一覧 | **PASS** |
| `git add -p` y/n/e 計画 | **PASS**（Hunk 3 は `e` 必須を明記） |
| Commit 1 単体 typecheck 見込み | **PASS**（分割後） |
| 現状全量のまま | **FAIL** |
| **分割計画総合** | **PASS** |

---

## 10. 停止宣言

- `bursaDisclosure.ts` の **ワーキングツリーは未変更**（分割は計画のみ）
- `git add` / `git add -p` / `commit` / `push` / `reset` は **一切未実行**

次ステップ（ユーザー承認後）: §6.1 の stage 手順 → §7 の `git add -p` → Commit 1 残り 62 件 add → typecheck → commit

---

*根拠: `git diff 338ebc4 -- src/types/bursaDisclosure.ts`（3 hunk, +41 行）*
