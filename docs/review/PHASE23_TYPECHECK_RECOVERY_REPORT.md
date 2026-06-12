# PHASE23 Typecheck Recovery Report

監査日: 2026-06-02  
対象ブランチ: `cursor/top3-maxdd-capital-audit`  
方針: **Phase24以降の新規実装は停止**。GitHub同期は本レポート時点では**未実行**。

---

## サマリー

| 項目 | 開始時 | 修正後 |
|------|--------|--------|
| Typecheck エラー | **101** | **0** |
| Unit Test FAIL | **2** | **0** |
| Unit Test ファイル | 321 passed | **321 passed** |

---

## 1. Typecheck 101件の分類

### A: 同じ修正でまとめて直せるもの — **83件**

| グループ | 件数 | 対応 |
|----------|------|------|
| `scoreJa` / `detailJa` が `BursaMaterialItem` に未定義 | 5 | `src/types/bursaDisclosure.ts` に optional 追加 |
| `sentiment: string` → `BursaMaterialSentiment` 不一致 | 39 | `withAdjustedMaterialScore()` + 各 Phase orchestrator |
| `RawMaterialInput` に `id` / `url` / `publishedAt` 不足 | 2 | `bursaMaterialSentiment.ts` 型拡張 + intelligence services |
| `bursaValuationIntelligenceService` fmt 関数が `undefined` 非対応 | 21 | 引数型を `number \| undefined` に |
| `bursaFairValueModelValidationService` import 不足 | 6 | `BursaFiveYearPoint` / `buildBursaFiveYearTrend` import |
| `newsApiRateLimit.test.ts` vitest import 不足 | 6 | `describe` / `it` / `expect` import 追加 |
| `FixedInstitutionalBasketDisplayFields` 型名誤り | 1 | `FixedBasketDisplayFields` に修正 |
| `conciergeEnhancedAnalysis` に `ddmFairPrice` 不足 | 1 | 型定義追加 |
| Phase15–23 intelligence services 材料行フィールド不足 | 2 | `reasonJa` / `publishedAt` / `url` / source 統一 |

### B: 個別対応が必要なもの — **18件**

| グループ | 件数 | 対応 |
|----------|------|------|
| テスト fixture と型定義の乖離（Phase13/18/19/22 等） | 14 | 各 `tests/unit/*.test.ts` を現行型に合わせて更新 |
| Phase11 配線バグ（到達不能コード / 未定義参照） | 2 | `bursaPhase11Analysis.ts` パイプライン書き直し |
| Phase23 直接起因（material source / sentiment） | 4 | Phase23 service + orchestrator 横断修正（A群と同時） |

---

## 2. 横断修正（scoreJa / BursaMaterialItem / sentiment）

- **`BursaMaterialItem`**: `scoreJa?`, `detailJa?` を追加
- **`bursaMaterialSentiment.ts`**: `materialSentimentFromScore()`, `withAdjustedMaterialScore()`, `RawMaterialInput` 拡張
- **Phase15–23 orchestrators**: 材料スコア調整を `withAdjustedMaterialScore()` 経由に統一
- **Intelligence services**（Analyst Target / Valuation Gap / Earnings Revision / Conviction）: 材料行に `scoreJa`, `reasonJa`, `publishedAt`, `url`, `source: 'bursa_announcement'` を付与

---

## 3. Phase23直接起因 4件 + Phase11配線バグ 2件

### Phase23 直接（4件）

1. `bursaEarningsRevisionIntelligenceService` — 材料行 `sentiment` 型
2. `bursaPhase23Analysis` — `withAdjustedMaterialScore` 適用
3. `bursaConvictionIntelligenceService` — revision adjustment 材料行
4. `bursaPhase11Analysis` — Phase23 パイプライン接続

### Phase11 配線バグ（2件）

1. ネストした `return enrichStockWithAnalystTargetIntelligence(...)` による到達不能コード
2. 未定義変数 `withAnalystTarget` 参照

**修正**: `bursaPhase11Analysis.ts` を Phase13→…→Phase22→Phase22.1→Phase23→Phase22.2 の逐次パイプラインに書き直し。

---

## 4. 検証結果

```bash
npm run typecheck   # 0 errors
npm run test:unit   # 321 files passed, 0 failed
```

### Unit Test 修正（2件）

| テスト | 原因 | 修正 |
|--------|------|------|
| `bursaPhase18.test.ts` bounded adjustment | Phase18.8 で `newsIntelligenceMaterialScoreAdjustment` がクラスタ経路に変更、`materialScoreAdjustment188: 0` が即返却 | Phase18.7 記事単位 API `newsIntelligenceArticleMaterialScoreAdjustment` を検証対象に変更 |
| `bursaPhase18_5.test.ts` aggregate clamp | 同上（188 経路との混同） | `newsIntelligenceArticleMaterialScoreAdjustment` + `materialScoreAdjustment187: adj` |

---

## 必須項目

| 項目 | 値 |
|------|-----|
| **現在件数（Typecheck）** | **0** |
| **現在件数（Unit Test FAIL）** | **0** |
| **修正件数（Typecheck）** | **101** |
| **修正件数（Unit Test）** | **2** |
| **残件数（Typecheck）** | **0** |
| **残件数（Unit Test FAIL）** | **0** |
| **推定完了率** | **100%**（Typecheck + Unit Test ブロッカー解消） |

---

## 修正ファイル一覧

### 本番コード（型・横断・Phase11/23）

- `src/types/bursaDisclosure.ts`
- `src/types/conciergeEnhancedAnalysis.ts`
- `src/services/bursa/bursaMaterialSentiment.ts`
- `src/services/bursa/bursaMaterialAnalysisService.ts`
- `src/services/bursa/bursaPhase11Analysis.ts`
- `src/services/bursa/bursaPhase15Analysis.ts`
- `src/services/bursa/bursaPhase16Analysis.ts`
- `src/services/bursa/bursaPhase17Analysis.ts`
- `src/services/bursa/bursaPhase18Analysis.ts`
- `src/services/bursa/bursaPhase19Analysis.ts`
- `src/services/bursa/bursaPhase20Analysis.ts`
- `src/services/bursa/bursaPhase21Analysis.ts`
- `src/services/bursa/bursaPhase22Analysis.ts`
- `src/services/bursa/bursaPhase22_1Analysis.ts`
- `src/services/bursa/bursaPhase22_2Analysis.ts`
- `src/services/bursa/bursaPhase23Analysis.ts`
- `src/services/bursa/bursaAnalystTargetIntelligenceService.ts`
- `src/services/bursa/bursaValuationGapIntelligenceService.ts`
- `src/services/bursa/bursaEarningsRevisionIntelligenceService.ts`
- `src/services/bursa/bursaConvictionIntelligenceService.ts`
- `src/services/bursa/bursaValuationIntelligenceService.ts`
- `src/services/bursa/bursaFairValueModelValidationService.ts`
- `src/services/bursa/bursaFixedInstitutionalBasketService.ts`

### テスト

- `tests/unit/newsApiRateLimit.test.ts`
- `tests/unit/buildConciergeEnhancedAnalysis.test.ts`
- `tests/unit/bursaMaterialWeightCalibration.test.ts`
- `tests/unit/bursaPhase13.test.ts`
- `tests/unit/bursaPhase18.test.ts`
- `tests/unit/bursaPhase18_5.test.ts`
- `tests/unit/bursaPhase19.test.ts`
- `tests/unit/bursaPhase19_5.test.ts`
- `tests/unit/bursaPhase22.test.ts`
- `tests/unit/bursaPhase22_1.test.ts`

---

## GitHub同期について

**本タスクでは GitHub 同期は実行していません。**

Typecheck / Unit Test ブロッカーは解消済みです。同期前に Phase23 未コミットファイルの整理・コミット方針の確認を推奨します。

---

## 次のアクション（推奨）

1. Phase23 関連変更のレビュー・コミット分割
2. GitHub 同期 dry-run 再実行
3. Phase24 以降の実装再開（同期成功後）
