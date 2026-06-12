# Phase17–19.5 Commit 2 準備レポート

監査日: 2026-06-02  
対象コミット: **Commit 2** — `phase17-19.5: dividend, news intelligence, macro and sector rotation`  
前提 HEAD: `cd301812a68fb91a67f1b867532917ff03dfdb9d`（Commit 1 完了）  
実施範囲: **準備のみ**（`git add` / `commit` / `push` は未実施）

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| HEAD 確認 | **PASS** — `cd301812a68fb91a67f1b867532917ff03dfdb9d` |
| Commit 2 候補ファイル数 | **45**（+ `bursaDisclosure.ts` 部分 stage 1） |
| Phase17–19.5 実行依存 | **完結**（Commit 1 + base 既存 macro 基盤で充足） |
| 隔離 typecheck 予想 | **PASS（高確度）** — disclosure Phase20+ 未 stage 前提 |
| Commit 2 準備 | **PASS** |
| **総合判定** | **PASS（条件付き）** — disclosure 4 プロパティのみ部分 stage 必須 |

---

## 1. HEAD 確認

| 項目 | 値 |
|------|-----|
| `git rev-parse HEAD` | `cd301812a68fb91a67f1b867532917ff03dfdb9d` |
| message | `phase13-16: earnings call through institutional intelligence` |
| parent | `338ebc4351ed08046f0a07a79e0dbd0c57b3a720` |

---

## 2. Commit 2 ファイル候補一覧（45 件）

### 2.1 Phase17 — Dividend Intelligence（10 件）

| # | パス | 備考 |
|---|------|------|
| 1 | `docs/review/PHASE16_7_PHASE17_AUDIT_REPORT.md` | 16.7→17 監査 |
| 2 | `docs/review/PHASE16_8_PHASE17_5_AUDIT_REPORT.md` | 16.8→17.5 監査 |
| 3 | `docs/review/PHASE17_DIVIDEND_INTELLIGENCE_REPORT.md` | |
| 4 | `scripts/bursa-phase16-7-phase17-audit-verify.ts` | |
| 5 | `scripts/bursa-phase16-8-phase17-5-audit-verify.ts` | |
| 6 | `src/services/bursa/bursaDividendIntelligenceProviders.ts` | |
| 7 | `src/services/bursa/bursaDividendIntelligenceService.ts` | |
| 8 | `src/services/bursa/bursaPhase17Analysis.ts` | |
| 9 | `src/types/bursaDividendIntelligence.ts` | |
| 10 | `tests/unit/bursaPhase17.test.ts` | |

### 2.2 Phase18 — News Intelligence + 18.5–18.8（22 件）

| # | パス | 備考 |
|---|------|------|
| 11 | `docs/review/PHASE18_NEWS_INTELLIGENCE_AUDIT_REPORT.md` | Phase18 |
| 12 | `docs/review/PHASE18_5_NEWS_IMPACT_ENGINE_AUDIT_REPORT.md` | 18.5 Impact |
| 13 | `docs/review/PHASE18_6_EVENT_VALIDATION_AUDIT_REPORT.md` | 18.6 Validation |
| 14 | `docs/review/PHASE18_7_EVENT_EXPANSION_AUDIT_REPORT.md` | 18.7 Expansion |
| 15 | `docs/review/PHASE18_8_EVENT_CLUSTER_AUDIT_REPORT.md` | 18.8 Cluster |
| 16 | `scripts/bursa-phase18-audit-verify.ts` | |
| 17 | `scripts/bursa-phase18-5-audit-verify.ts` | |
| 18 | `scripts/bursa-phase18-6-audit-verify.ts` | |
| 19 | `scripts/bursa-phase18-7-audit-verify.ts` | |
| 20 | `scripts/bursa-phase18-8-audit-verify.ts` | |
| 21 | `src/services/bursa/bursaNewsEventClusterEngine.ts` | 18.8 |
| 22 | `src/services/bursa/bursaNewsEventExpansionEngine.ts` | 18.7 |
| 23 | `src/services/bursa/bursaNewsEventValidationEngine.ts` | 18.6 |
| 24 | `src/services/bursa/bursaNewsImpactEngine.ts` | 18.5 |
| 25 | `src/services/bursa/bursaNewsIntelligenceService.ts` | Phase18 |
| 26 | `src/services/bursa/bursaPhase18Analysis.ts` | |
| 27 | `src/types/bursaNewsIntelligence.ts` | |
| 28 | `tests/unit/bursaPhase18.test.ts` | |
| 29 | `tests/unit/bursaPhase18_5.test.ts` | |
| 30 | `tests/unit/bursaPhase18_6.test.ts` | |
| 31 | `tests/unit/bursaPhase18_7.test.ts` | |
| 32 | `tests/unit/bursaPhase18_8.test.ts` | |

### 2.3 Phase19 — Macro Intelligence（未コミット 6 件）

> **注**: macro 基盤 6 件は **Commit 1 HEAD 以前から既存**（`338ebc4` 系）。Commit 2 では **新規 Bursa Phase19 層のみ** add。

| # | パス | 状態 |
|---|------|------|
| 33 | `scripts/bursa-phase19-audit-verify.ts` | untracked |
| 34 | `src/constants/bursaMacroIntelligence.ts` | untracked |
| 35 | `src/services/bursa/bursaMacroIntelligenceService.ts` | untracked |
| 36 | `src/services/bursa/bursaPhase19Analysis.ts` | untracked |
| 37 | `src/types/bursaMacroIntelligence.ts` | untracked |
| 38 | `tests/unit/bursaPhase19.test.ts` | untracked |

**Commit 1 HEAD 既存（Commit 2 add 不要・依存のみ）**:

```
src/constants/macroIntelligence.ts
src/services/macroIntelligenceEngine.ts
src/services/macroIntelligenceIntegration.ts
src/services/macroIntelligenceStorage.ts
src/types/macroIntelligence.ts
tests/unit/macroIntelligenceEngine.test.ts
```

### 2.4 Phase19.5 — Sector Rotation（7 件）

| # | パス |
|---|------|
| 39 | `docs/review/PHASE19_5_SECTOR_ROTATION_AUDIT_REPORT.md` |
| 40 | `scripts/bursa-phase19-5-audit-verify.ts` |
| 41 | `src/constants/bursaSectorRotation.ts` |
| 42 | `src/services/bursa/bursaPhase19_5Analysis.ts` |
| 43 | `src/services/bursa/bursaSectorRotationEngine.ts` |
| 44 | `src/types/bursaSectorRotation.ts` |
| 45 | `tests/unit/bursaPhase19_5.test.ts` |

### 2.5 Shared — `bursaDisclosure.ts` 部分 stage（+1）

| # | パス | 内容 |
|---|------|------|
| 46 | `src/types/bursaDisclosure.ts` | Phase17–19.5 の 4 optional プロパティのみ |

### 2.6 内訳

| 区分 | 件数 |
|------|------|
| docs | 9 |
| scripts | 11 |
| src | 16 |
| tests | 9 |
| **新規/untracked add** | **45** |
| **disclosure 部分更新** | **1** |
| **stage パス合計** | **46** |

---

## 3. `bursaDisclosure.ts` — Commit 2 に含める差分

### 3.1 現状

- **HEAD（Commit 1）**: Phase13–16 フィールド + `scoreJa` / `detailJa` のみ
- **working tree**: Phase17–23 の 10 プロパティが **unstaged** で残存
- **`git diff HEAD -- src/types/bursaDisclosure.ts`**: 単一 hunk（+20 行、10 プロパティ混在）

### 3.2 Commit 2 で stage する 4 プロパティ（+8 行 + コメント 4 行）

```typescript
  /** Phase17 — Dividend Intelligence（optional） */
  dividendIntelligence?: import('./bursaDividendIntelligence').BursaDividendIntelligenceAnalysis | null;
  /** Phase18 — News Intelligence（optional） */
  newsIntelligence?: import('./bursaNewsIntelligence').BursaNewsIntelligenceAnalysis | null;
  /** Phase19 — Macro Intelligence（optional） */
  macroIntelligence?: import('./bursaMacroIntelligence').BursaMacroIntelligenceAnalysis | null;
  /** Phase19.5 — Sector Rotation Intelligence（optional） */
  sectorRotation?: import('./bursaSectorRotation').BursaSectorRotationAnalysis | null;
```

**必要な型ファイル**（いずれも Commit 2 候補に含む）:

- `src/types/bursaDividendIntelligence.ts`
- `src/types/bursaNewsIntelligence.ts`
- `src/types/bursaMacroIntelligence.ts`
- `src/types/bursaSectorRotation.ts`

---

## 4. `bursaDisclosure.ts` — Commit 2 から除外する差分

以下は working tree に残し、**stage しない**（Commit 3–5 へ延期）:

```typescript
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

### 4.1 `git add -p` 計画（disclosure）

| 操作 | 内容 |
|------|------|
| Hunk 1/1 | **`e`（edit）** — Phase17–19.5 の 4 プロパティ行のみ残す |
| 禁止 | 丸ごと **`y`** — Phase20–23 が混入し隔離 typecheck **FAIL** |
| 禁止 | **`n`** — Phase17–19.5 フィールドも失われる |

**edit 内の行別判定**:

| 行 | 操作 |
|----|------|
| `dividendIntelligence` + コメント | **保持** |
| `newsIntelligence` + コメント | **保持** |
| `macroIntelligence` + コメント | **保持** |
| `sectorRotation` + コメント | **保持** |
| `valuationIntelligence` 〜 `earningsRevisionIntelligence` | **削除** |

非対話環境の場合は Commit 1 と同様、4 プロパティのみ一時書き込み → `git add` → working tree 全量復元が等価。

---

## 5. 依存関係

### 5.1 パイプライン順（Commit 2 範囲）

```
Phase17 (Dividend)
  → Phase18 (News + 18.5 Impact + 18.6 Validation + 18.7 Expansion + 18.8 Cluster)
    → Phase19 (Macro — Bursa 層)
      → Phase19.5 (Sector Rotation)
```

### 5.2 上流依存（Commit 1 / base 既存）

| Commit 2 コンポーネント | 依存先 | 所在 |
|------------------------|--------|------|
| `bursaPhase17Analysis` | `bursaMaterialSentiment`, `bursaDisclosure` | **Commit 1 HEAD** |
| `bursaPhase18Analysis` | 同上 + `bursaAnnouncementParser`, `bursaKlseHtmlClient` | Commit 1 + **base** |
| `bursaPhase19Analysis` | `macroIntelligenceEngine` 等 | **base 既存（HEAD）** |
| `bursaPhase19_5Analysis` | `bursaPhase19Analysis`, `bursaNewsIntelligenceService` | Commit 2 内 + Commit 1 |
| Phase17 providers | KLSE / disclosure bundle | **base** |

### 5.3 Phase17–19.5 が Phase20+ を import するか

**なし**（ソース走査確認）。

### 5.4 依存完結性判定

| 観点 | 結果 |
|------|------|
| Phase17–19.5 実行コード → Phase20+ | **なし** |
| Phase17–19.5 → Phase11 / UI / Concierge 配線 | **なし**（単体オーケストレータ） |
| Phase19 macro 基盤 | **HEAD 既存 6 件で充足** |
| disclosure 型参照 | 4 プロパティ + 4 type ファイル（Commit 2 候補内） |
| import トレース missing | **0** |

**結論**: Phase17–19.5 は **Commit 1 HEAD + base macro 基盤 + Commit 2 候補** で依存完結。

---

## 6. 除外ファイル一覧

### 6.1 ユーザー禁止カテゴリ

| カテゴリ | 例 |
|----------|-----|
| Phase20 以降 | §6.2 |
| Phase22.2 / Phase23 | §6.3 |
| `docs/review/phase12-5-long-run/**` | 全件 |
| `*.png` / `*.jpg` / `*.log` | 全 working tree から除外 |
| `openai-*.json` | `scripts/openai-*.json` 等 |
| device verify 成果物 | `scripts/ai-enhanced-analysis-device-verify/**` 等 |

### 6.2 Phase20 以降（Commit 2 対象外）

**Phase20（12）**, **Phase21（20）**, **Phase21.8（3）**, **Phase22（7）**, **Phase22.1（7）** — 全ファイル

### 6.3 Phase22.2 / Phase23（Commit 5 向け）

```
src/constants/bursaConvictionIntelligence.ts
src/constants/bursaEarningsRevisionIntelligence.ts
src/services/bursa/bursaConvictionIntelligenceService.ts
src/services/bursa/bursaEarningsRevisionIntelligenceProviders.ts
src/services/bursa/bursaEarningsRevisionIntelligenceService.ts
src/services/bursa/bursaPhase22_2Analysis.ts
src/services/bursa/bursaPhase23Analysis.ts
src/types/bursaConvictionIntelligence.ts
src/types/bursaEarningsRevisionIntelligence.ts
scripts/bursa-phase23-audit-verify.ts
tests/unit/bursaPhase23.test.ts
(+ UI/Concierge/Phase11 配線 — Commit 5)
```

### 6.4 Shared — Commit 2 に含めない

| パス | 理由 |
|------|------|
| `src/services/bursa/bursaPhase11Analysis.ts` | Phase20+ 全配線 |
| `src/services/bursa/bursaMaterialAnalysisService.ts` | フルパイプライン |
| `src/screens/MaterialAnalysisScreen.tsx` | UI |
| `src/services/buildConciergeEnhancedAnalysis.ts` | Concierge |
| `src/types/conciergeEnhancedAnalysis.ts` | Concierge |
| `src/components/concierge/*` | Concierge |
| `src/context/BursaConciergeContext.tsx` | Concierge |
| `src/services/bursa/bursaDisclosureService.ts` | payload normalize 配線（Commit 1 で normalize 済み・Phase17–19.5 テスト非依存） |
| `src/services/bursa/bursaDisclosureCache.ts` | 同上 |

### 6.5 `bursaDisclosure.ts` 内除外（Commit 2 stage 禁止）

- `valuationIntelligence`
- `fairValueIntelligence`
- `analystTargetIntelligence`
- `valuationGapIntelligence`
- `convictionIntelligence`
- `earningsRevisionIntelligence`

### 6.6 Phase19 既存 6 件（再 add 不要）

§2.3「Commit 1 HEAD 既存」参照 — 依存として存在するが Commit 2 `git add` リストには含めない。

---

## 7. typecheck 予想

| シナリオ | 予想 | 根拠 |
|----------|------|------|
| **A. 候補 45 件 + disclosure 全量（Phase17–23）** | **FAIL** | Phase20+ type モジュール不在 |
| **B. 候補 45 件 + disclosure 4 プロパティのみ** | **PASS（高確度）** | Commit 1 + 4 type ファイルで compile 可能 |
| **C. Commit 2 後 Phase17–19.5 unit test のみ** | **PASS（高確度）** | シナリオ B 前提 |

**推奨ゲート（Commit 2 直後）**:

```bash
npm run typecheck
npx vitest run tests/unit/bursaPhase17.test.ts \
  tests/unit/bursaPhase18.test.ts tests/unit/bursaPhase18_5.test.ts \
  tests/unit/bursaPhase18_6.test.ts tests/unit/bursaPhase18_7.test.ts \
  tests/unit/bursaPhase18_8.test.ts tests/unit/bursaPhase19.test.ts \
  tests/unit/bursaPhase19_5.test.ts
```

---

## 8. commit 可否

| 判定項目 | 結果 |
|----------|------|
| ファイル候補確定 | **可** |
| 依存関係（Phase17–19.5） | **完結** |
| 禁止ファイル混入 | **なし** |
| disclosure 部分 stage 計画 | **可** |
| 現時点での commit 実行 | **禁止**（本タスク指示） |

**commit 可否**: **準備 PASS — disclosure 4 プロパティ分割後に Proceed 可**

---

## 9. 次に実行する `git add` コマンド案

> **注意**: 以下は案のみ。本レポート時点では **未実行**。

### 9.1 Commit 2 候補 45 件

```bash
git add \
  docs/review/PHASE16_7_PHASE17_AUDIT_REPORT.md \
  docs/review/PHASE16_8_PHASE17_5_AUDIT_REPORT.md \
  docs/review/PHASE17_DIVIDEND_INTELLIGENCE_REPORT.md \
  docs/review/PHASE18_5_NEWS_IMPACT_ENGINE_AUDIT_REPORT.md \
  docs/review/PHASE18_6_EVENT_VALIDATION_AUDIT_REPORT.md \
  docs/review/PHASE18_7_EVENT_EXPANSION_AUDIT_REPORT.md \
  docs/review/PHASE18_8_EVENT_CLUSTER_AUDIT_REPORT.md \
  docs/review/PHASE18_NEWS_INTELLIGENCE_AUDIT_REPORT.md \
  docs/review/PHASE19_5_SECTOR_ROTATION_AUDIT_REPORT.md \
  scripts/bursa-phase16-7-phase17-audit-verify.ts \
  scripts/bursa-phase16-8-phase17-5-audit-verify.ts \
  scripts/bursa-phase18-5-audit-verify.ts \
  scripts/bursa-phase18-6-audit-verify.ts \
  scripts/bursa-phase18-7-audit-verify.ts \
  scripts/bursa-phase18-8-audit-verify.ts \
  scripts/bursa-phase18-audit-verify.ts \
  scripts/bursa-phase19-5-audit-verify.ts \
  scripts/bursa-phase19-audit-verify.ts \
  src/constants/bursaMacroIntelligence.ts \
  src/constants/bursaSectorRotation.ts \
  src/services/bursa/bursaDividendIntelligenceProviders.ts \
  src/services/bursa/bursaDividendIntelligenceService.ts \
  src/services/bursa/bursaMacroIntelligenceService.ts \
  src/services/bursa/bursaNewsEventClusterEngine.ts \
  src/services/bursa/bursaNewsEventExpansionEngine.ts \
  src/services/bursa/bursaNewsEventValidationEngine.ts \
  src/services/bursa/bursaNewsImpactEngine.ts \
  src/services/bursa/bursaNewsIntelligenceService.ts \
  src/services/bursa/bursaPhase17Analysis.ts \
  src/services/bursa/bursaPhase18Analysis.ts \
  src/services/bursa/bursaPhase19Analysis.ts \
  src/services/bursa/bursaPhase19_5Analysis.ts \
  src/services/bursa/bursaSectorRotationEngine.ts \
  src/types/bursaDividendIntelligence.ts \
  src/types/bursaMacroIntelligence.ts \
  src/types/bursaNewsIntelligence.ts \
  src/types/bursaSectorRotation.ts \
  tests/unit/bursaPhase17.test.ts \
  tests/unit/bursaPhase18.test.ts \
  tests/unit/bursaPhase18_5.test.ts \
  tests/unit/bursaPhase18_6.test.ts \
  tests/unit/bursaPhase18_7.test.ts \
  tests/unit/bursaPhase18_8.test.ts \
  tests/unit/bursaPhase19.test.ts \
  tests/unit/bursaPhase19_5.test.ts
```

### 9.2 `bursaDisclosure.ts` 部分 stage

```bash
git add -p src/types/bursaDisclosure.ts
# Hunk 1/1 → e → Phase17–19.5 の 4 プロパティのみ残す → y
```

---

## 10. PASS / FAIL

| チェック | 判定 |
|----------|------|
| HEAD = `cd30181` | **PASS** |
| Commit 2 候補一覧 | **PASS**（45 + disclosure 部分） |
| disclosure 含める/除外差分 | **PASS** |
| 依存関係完結 | **PASS** |
| 除外一覧 | **PASS** |
| typecheck 予想（分割後） | **PASS** |
| `git add` / commit / push 未実施 | **PASS** |
| **総合（Commit 2 準備）** | **PASS（条件付き）** |

---

## 11. 停止宣言

Commit 2 準備完了。`git add` / `commit` / `push` は **一切実行していない**。

次ステップ（ユーザー承認後）: §9.1 add → §9.2 disclosure 部分 stage → typecheck → Phase17–19.5 unit tests → commit

---

*Evidence: `docs/review/evidence/phase13-23-classify-v2.json`, `git diff HEAD -- src/types/bursaDisclosure.ts`, import trace（missing 0）*
