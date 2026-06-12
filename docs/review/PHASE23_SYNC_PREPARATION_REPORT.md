# Phase23 Sync Preparation Report

監査日: 2026-06-02  
方針: **GitHub push / commit は本レポート作成時点では未実施**  
前提: Phase23 は PASS 判定。870件超の working tree を Phase23 同期対象に整理する。

---

## サマリー

| 項目 | 件数 |
|------|------|
| **現在 git status 総数** | **872** |
| **同期対象（推奨 KEEP）** | **18** |
| **パイプライン依存（要判断・追加候補）** | **6** |
| **除外（REMOVE）** | **854** |
| **自動除外ルール該当** | **180** |

---

## 1. git status 分類（A–G）

| 区分 | 内容 | 件数 |
|------|------|------|
| **A. Phase23本体** | `bursaPhase23*`, `EarningsRevision*`, audit script | **6** |
| **B. Phase22.2関連** | Conviction / ValuationGap / `bursaPhase22_2*` | **7** |
| **C. テスト** | `tests/unit/*` 全体 | **31** |
| **D. docs/review** | レポート・監査文書（`phase12-5-long-run` 除く） | **73** |
| **E. 画像** | `*.png`, `*.jpg` 等 | **35** |
| **F. ログ・長時間Run** | `phase12-5-long-run/**`, `*.log`, telemetry, checkpoint, `.expo-bundle-*` | **75** |
| **G. その他** | `src/` 変更134 + `scripts/` 555 + 設定ファイル等 | **645** |
| **合計** | | **872** |

### G（その他）内訳（参考）

| サブ区分 | 件数 |
|----------|------|
| `scripts/` 配下（監査JSON・device verify・openai分析等） | **555** |
| `src/` 配下（Phase13–22 未コミット本体 + 既存変更） | **134** |
| その他（`.cursorignore`, `package.json`, `App.tsx` 等） | **残り** |

### A. Phase23本体（6件）

```
scripts/bursa-phase23-audit-verify.ts
src/constants/bursaEarningsRevisionIntelligence.ts
src/services/bursa/bursaEarningsRevisionIntelligenceProviders.ts
src/services/bursa/bursaEarningsRevisionIntelligenceService.ts
src/services/bursa/bursaPhase23Analysis.ts
src/types/bursaEarningsRevisionIntelligence.ts
```

### B. Phase22.2関連（7件）

```
src/constants/bursaConvictionIntelligence.ts
src/constants/bursaValuationGapIntelligence.ts
src/services/bursa/bursaConvictionIntelligenceService.ts
src/services/bursa/bursaPhase22_2Analysis.ts
src/services/bursa/bursaValuationGapIntelligenceService.ts
src/types/bursaConvictionIntelligence.ts
src/types/bursaValuationGapIntelligence.ts
```

（`tests/unit/bursaPhase22_2.test.ts` は C 区分）

---

## 2. 同期対象候補一覧（KEEP / REMOVE）

### KEEP（18件）— Phase23 同期推奨

```
scripts/bursa-phase23-audit-verify.ts
src/constants/bursaEarningsRevisionIntelligence.ts
src/services/bursa/bursaEarningsRevisionIntelligenceProviders.ts
src/services/bursa/bursaEarningsRevisionIntelligenceService.ts
src/services/bursa/bursaPhase23Analysis.ts
src/types/bursaEarningsRevisionIntelligence.ts
tests/unit/bursaPhase23.test.ts
src/services/bursa/bursaPhase11Analysis.ts
src/services/bursa/bursaMaterialSentiment.ts
src/types/bursaDisclosure.ts
src/services/bursa/bursaConvictionIntelligenceService.ts
src/screens/MaterialAnalysisScreen.tsx
src/services/buildConciergeEnhancedAnalysis.ts
src/types/conciergeEnhancedAnalysis.ts
src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx
src/context/BursaConciergeContext.tsx
src/services/bursa/bursaMaterialAnalysisService.ts
```

### KEEP（依存追加候補 +6件）— Phase11 import により typecheck 必須

`bursaPhase11Analysis.ts` が `bursaPhase22_2Analysis` を import しているため、Phase23 単独より **先行または同時コミット推奨**:

```
src/constants/bursaConvictionIntelligence.ts
src/services/bursa/bursaPhase22_2Analysis.ts
src/types/bursaConvictionIntelligence.ts
```

（ValuationGap 3件は Phase22.2 の深い依存 — **別PR推奨**、同コミットに含める場合は B 区分7件すべて）

### REMOVE（854件）— 同期対象外

以下を含む **872件中 854件**:

| 除外理由 | 代表例 | 件数目安 |
|----------|--------|----------|
| 自動除外ルール | `docs/review/**`, `*.png`, `phase12-5-long-run/**` | **180** |
| Phase13–22 本体（Phase23以外） | `bursaPhase13–22*.ts`, 各 intelligence service | **100+** |
| テスト（Phase23以外） | `bursaPhase13–22*.test.ts`, `newsApiRateLimit.test.ts` 等 | **29** |
| scripts 監査・分析成果物 | `openai-*.json`, `*-device-verify/*`, walkforward 等 | **555** |
| Phase12.5 / device 証跡 | XML, logcat, telemetry | **75** |
| 設定・無関係 UI 変更 | `.cursorignore`, `SettingsScreen.tsx`, `package.json` 等 | **残り** |

---

## 3. 自動除外候補（ルール）

以下パターンは **REMOVE 固定**（`git add` しない）:

```
docs/review/**
*.png
*.jpg
*.log
phase12-5-long-run/**
runner-console.txt
checkpoint.json
telemetry.json
```

**例外（任意）**: 同期時に Phase23 公式レポートのみ追加する場合:

```
docs/review/PHASE23_EARNINGS_REVISION_INTELLIGENCE_REPORT.md
```

（上記は自動除外ルールの意図的例外。監査・復旧レポート3件は除外推奨）

---

## 4. Phase23 実装に必要なファイル（最小抽出）

### コア（7件）

| パス | 役割 |
|------|------|
| `src/types/bursaEarningsRevisionIntelligence.ts` | 型定義 |
| `src/constants/bursaEarningsRevisionIntelligence.ts` | 定数 |
| `src/services/bursa/bursaEarningsRevisionIntelligenceProviders.ts` | データ取得 |
| `src/services/bursa/bursaEarningsRevisionIntelligenceService.ts` | 分析ロジック |
| `src/services/bursa/bursaPhase23Analysis.ts` | オーケストレータ |
| `tests/unit/bursaPhase23.test.ts` | 単体テスト |
| `scripts/bursa-phase23-audit-verify.ts` | 監査スクリプト |

### 配線・型整合（11件 — KEEP に含む）

Phase23 をパイプライン/UI に接続するための最小変更:

- `bursaPhase11Analysis.ts` — Phase23 enrich 呼び出し
- `bursaMaterialSentiment.ts` / `bursaDisclosure.ts` — 材料型・scoreJa 整合
- `bursaConvictionIntelligenceService.ts` — revision adjustment
- UI / Concierge 4ファイル + `bursaMaterialAnalysisService.ts`

### 注意（リモート HEAD `338ebc4`）

リモートには **Phase13–22 ファイルが未存在**。Phase23 の18件だけを push しても、**Phase13–22 未コミットのままではローカル全体の typecheck 前提と乖離**する。  
Phase23 同期は **18件（+依存6件）の部分コミット**として設計し、870件一括 push は禁止。

---

## 5. 推奨 git add 一覧

### 第1段（Phase23 本体 — 7件）

```bash
git add scripts/bursa-phase23-audit-verify.ts
git add src/constants/bursaEarningsRevisionIntelligence.ts
git add src/services/bursa/bursaEarningsRevisionIntelligenceProviders.ts
git add src/services/bursa/bursaEarningsRevisionIntelligenceService.ts
git add src/services/bursa/bursaPhase23Analysis.ts
git add src/types/bursaEarningsRevisionIntelligence.ts
git add tests/unit/bursaPhase23.test.ts
```

### 第2段（配線 — 11件）

```bash
git add src/services/bursa/bursaPhase11Analysis.ts
git add src/services/bursa/bursaMaterialSentiment.ts
git add src/types/bursaDisclosure.ts
git add src/services/bursa/bursaConvictionIntelligenceService.ts
git add src/screens/MaterialAnalysisScreen.tsx
git add src/services/buildConciergeEnhancedAnalysis.ts
git add src/types/conciergeEnhancedAnalysis.ts
git add src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx
git add src/context/BursaConciergeContext.tsx
git add src/services/bursa/bursaMaterialAnalysisService.ts
```

### 第3段（Phase11 import 依存 — 3件、推奨）

```bash
git add src/services/bursa/bursaPhase22_2Analysis.ts
git add src/constants/bursaConvictionIntelligence.ts
git add src/types/bursaConvictionIntelligence.ts
```

### 任意（公式レポート1件のみ）

```bash
git add docs/review/PHASE23_EARNINGS_REVISION_INTELLIGENCE_REPORT.md
```

**推奨 add 合計: 18〜21件**（レポート含め最大22件）

---

## 6. 推奨 commit message

```
phase23: add earnings revision intelligence and pipeline wiring

- Add Phase23 types, providers, service, and orchestrator
- Wire Phase11 pipeline and conviction revision adjustment
- Update material sentiment types and UI/concierge display
- Add bursaPhase23 unit tests and audit verify script
```

---

## 7. GitHub 同期可否

| 条件 | 判定 |
|------|------|
| 現状 872件一括 push | **不可**（禁止） |
| 推奨 18–22件に整理後 | **条件付き可**（未実施） |
| 現時点 commit / push | **未実施**（本タスク範囲外） |
| typecheck / unit test | 直接実行は PASS（前回検証済み） |
| sync script ENOBUFS | 870件規模では false negative リスクあり — 部分コミット後に再検証推奨 |

**結論: GitHub同期は現時点では不可。18–22件に stage 整理後、別タスクで dry-run → commit → push を推奨。**

---

## 8. 必須項目チェックリスト

| 必須項目 | 値 |
|----------|-----|
| 現在872件の内訳 | A6 / B7 / C31 / D73 / E35 / F75 / G645 |
| 同期対象件数 | **18**（+依存3〜6） |
| 除外件数 | **854** |
| 推奨 git add 一覧 | 上記 §5 |
| 推奨 commit message | 上記 §6 |
| GitHub同期可否 | **不可（整理前）→ 整理後は条件付き可** |

---

## 証拠ファイル

| ファイル | 内容 |
|----------|------|
| `docs/review/evidence/phase23-git-status-full.txt` | git status 全文（872行） |
| `docs/review/evidence/phase23-classify-v2.json` | 分類スクリプト出力 |

---

## 【監査サマリー】

- **872件**の working tree を A–G に分類し、**Phase23 同期推奨は18件**に絞った
- **854件は REMOVE**（画像・ログ・Phase12.5・scripts 成果物・Phase13–22 本体等）
- **commit / push は未実施** — 整理レポートのみ
- 次ステップ: §5 の `git add` を実行 → typecheck → 部分 commit → dry-run 再検証
