# Phase23 GitHub同期監査レポート

## 実施日時
2026-06-11T04:10:00Z

## Git Commit Hash（監査時点）
338ebc4

## 対象
Phase23 レポート §3（Unit Test PASS）と §14（Unit Test FAIL）の矛盾調査

---

## 1. 同期失敗理由（本当の原因）

### 結論: **Typecheck FAIL と Unit Test FAIL の両方**（AND 条件）

`scripts/git-safe-sync-after-report.mjs` は以下を **すべて** 満たさないと push しません。

| チェック | 結果 | 詳細 |
|----------|------|------|
| 秘密情報 | PASS | secretsFound: 0 |
| Typecheck (`npm run typecheck`) | **FAIL** | 101 件 |
| Unit Test (`npm run test:unit`) | **FAIL** | 2 件（321 ファイル中） |
| `--dry-run` | 指定あり | push 自体も停止 |

### dry-run 実行ログ（抜粋）

```
[git-safe-sync] 4/5 typecheck / unit test
[git-safe-sync] push 停止: Typecheck FAIL; Unit Test FAIL; --dry-run 指定

--- GitHub Sync Result ---
{
  "ok": false,
  "typecheckOk": false,
  "unitTestOk": false,
  "skippedReason": "Typecheck FAIL; Unit Test FAIL; --dry-run 指定",
  "commitBefore": "338ebc4",
  "commitAfter": "338ebc4",
  "pushResult": "skipped"
}
```

### レポート矛盾の説明

| 記載箇所 | 内容 | 実態 |
|----------|------|------|
| §3 Unit Test | `bursaPhase23.test.ts` **9/9 PASS** | **部分テストのみ**（正しいが範囲が狭い） |
| §14 skipped reason | **Unit Test FAIL** | **`npm run test:unit` 全件**（321 ファイル / 1392 テスト） |

**矛盾の正体:** §3 は Phase23 専用テストのみ、§14 は sync スクリプトが実行する **フル Unit Test スイート** を指す。  
Phase23 単体は PASS だが、**Phase18 回帰 2 件が FAIL** のため sync 側は FAIL と判定。

#### Phase23 専用テスト（再確認）

```bash
npx vitest run tests/unit/bursaPhase23.test.ts tests/unit/bursaPhase22_2.test.ts
# Test Files  2 passed (2)
# Tests       17 passed (17)
```

#### フル Unit Test（sync が実行）

```bash
npm run test:unit
# Test Files  2 failed | 319 passed (321)
# Tests       2 failed | 1390 passed (1392)
```

#### Unit Test FAIL 詳細（Phase23 起因ではない）

| ファイル | テスト名 | エラー |
|----------|----------|--------|
| `tests/unit/bursaPhase18.test.ts` | material score adjustment is bounded -20 to +20 | `AssertionError: expected 0 to be greater than 0` |
| `tests/unit/bursaPhase18_5.test.ts` | aggregate material score is clamped -20 to +20 | `AssertionError: expected +0 to be 5.2` |

---

## 2. Typecheck FAIL 原因一覧

**合計: 101 件**（`npm run typecheck` / `tsc --noEmit -p tsconfig.typecheck.json`）

### ファイル別件数（降順）

| 件数 | ファイル | 主なエラー内容 |
|------|----------|----------------|
| 21 | `src/services/bursa/bursaValuationIntelligenceService.ts` | 型不整合・プロパティ未定義 |
| 6 | `tests/unit/newsApiRateLimit.test.ts` | `describe`/`it`/`expect` 未定義（vitest 型未参照） |
| 6 | `src/services/bursa/bursaFairValueModelValidationService.ts` | 型不整合 |
| 6 | `tests/unit/bursaPhase22.test.ts` | テストフィクスチャ型不一致 |
| 3 | `src/services/bursa/bursaPhase15Analysis.ts` | `BursaMaterialItem` 型不一致（sentiment string） |
| 3 | `src/services/bursa/bursaPhase16Analysis.ts` | 同上 |
| 3 | `src/services/bursa/bursaPhase16TrendAnalysis.ts` | 同上 |
| 3 | `src/services/bursa/bursaPhase17Analysis.ts` | 同上 |
| 3 | `src/services/bursa/bursaPhase18Analysis.ts` | 同上 |
| 3 | `src/services/bursa/bursaPhase19Analysis.ts` | 同上 |
| 3 | `src/services/bursa/bursaPhase19_5Analysis.ts` | 同上 |
| 3 | `src/services/bursa/bursaPhase20Analysis.ts` | 同上 |
| 3 | `src/services/bursa/bursaPhase21Analysis.ts` | 同上 |
| 3 | `src/services/bursa/bursaPhase22Analysis.ts` | 同上 |
| 3 | `src/services/bursa/bursaPhase22_1Analysis.ts` | 同上 |
| 3 | `src/services/bursa/bursaPhase22_2Analysis.ts` | 同上 |
| 3 | `src/services/bursa/bursaPhase23Analysis.ts` | **Phase23** `BursaMaterialItem` 型不一致 |
| 3 | `src/services/bursa/bursaAnalystTargetIntelligenceService.ts` | `scoreJa` が `BursaMaterialItem` に存在しない |
| 3 | `src/services/bursa/bursaValuationGapIntelligenceService.ts` | `scoreJa` 同上 |
| 2 | `src/services/bursa/bursaPhase11Analysis.ts` | **`withAnalystTarget` 未定義**（Phase23 配線バグ） |
| 1 | `src/services/bursa/bursaEarningsRevisionIntelligenceService.ts` | **Phase23** `scoreJa` 未定義 |
| 1 | `src/services/bursa/bursaConvictionIntelligenceService.ts` | `scoreJa` 未定義 |
| 1 | `src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx` | `ddmFairPrice` プロパティ不存在 |
| 1 | `src/services/bursa/bursaMaterialAnalysisService.ts` | `FixedInstitutionalBasketDisplayFields` 未 export |
| 1 | `src/services/bursa/bursaFixedInstitutionalBasketService.ts` | 型不整合 |
| 1 | `tests/unit/buildConciergeEnhancedAnalysis.test.ts` | `MaterialStockRow` 必須フィールド不足 |
| 1 | `tests/unit/bursaPhase13.test.ts` | フィクスチャ型不一致 |
| 1 | `tests/unit/bursaMaterialWeightCalibration.test.ts` | ソース型不一致 |
| 1 | `tests/unit/bursaPhase18.test.ts` | フィクスチャ型不一致 |
| 1 | `tests/unit/bursaPhase18_5.test.ts` | フィクスチャ型不一致 |
| 1 | `tests/unit/bursaPhase19.test.ts` | フィクスチャ型不一致 |
| 1 | `tests/unit/bursaPhase19_5.test.ts` | フィクスチャ型不一致 |
| 1 | `tests/unit/bursaPhase22_1.test.ts` | フィクスチャ型不一致 |

### Phase23 直接エラー（4 件）

```
src/services/bursa/bursaEarningsRevisionIntelligenceService.ts(362,5): error TS2561: 'scoreJa' does not exist in type 'BursaMaterialItem'
src/services/bursa/bursaPhase23Analysis.ts(58,48): error TS2345: BursaMaterialItem 型不一致（sentiment: string）
src/services/bursa/bursaPhase23Analysis.ts(59,53): 同上
src/services/bursa/bursaPhase23Analysis.ts(60,32): 同上
```

### Phase23 配線バグ（2 件 — 要修正）

```
src/services/bursa/bursaPhase11Analysis.ts(226,61): error TS2304: Cannot find name 'withAnalystTarget'
src/services/bursa/bursaPhase11Analysis.ts(208,11): error TS2353: 'stockHtml' does not exist in type ...
```

---

## 3. Phase23 起因 vs 既存起因 分類

| 分類 | 件数 | 説明 |
|------|------|------|
| **Phase23 直接起因** | **4** | `bursaPhase23Analysis.ts`(3) + `bursaEarningsRevisionIntelligenceService.ts`(1) |
| **Phase23 配線起因** | **2** | `bursaPhase11Analysis.ts` の `withAnalystTarget` 未定義等 |
| **Phase13〜22 未コミット塊起因** | **~90** | 同一パターン（scoreJa / BursaMaterialItem / フィクスチャ不足）が Phase15〜22 に横展開 |
| **既存ワークスペース起因** | **~5** | newsApiRateLimit.test.ts(6), valuation系(21+6), materialAnalysisService(1) 等 |

### Unit Test 分類

| 分類 | 件数 | ファイル |
|------|------|----------|
| Phase23 起因 | **0** | — |
| 既存起因 | **2** | bursaPhase18.test.ts, bursaPhase18_5.test.ts |

---

## 4. GitHub 同期再実行条件（PASS に必要な修正数）

`git-safe-sync-after-report.mjs` の **�strict 条件**（skip フラグ不使用）:

| ブロッカー | 現状 | PASS に必要 |
|------------|------|-------------|
| Typecheck | 101 FAIL | **101 件すべて解消** |
| Unit Test (test:unit) | 2 FAIL | **2 件解消** |
| 秘密情報 | 0 | 維持 |
| protected branch | 対象外 | 維持 |
| `--dry-run` 未指定 | — | dry-run を外す |

### 最小修正シナリオ（Phase23 のみ）

Phase23 ファイル 4 件 + Phase11 配線 2 件 = **6 件** を直しても、**残り ~95 Typecheck + 2 Unit Test** により sync は **依然 FAIL**。

### 現実的な PASS までの作業量

1. **Typecheck 101 件解消**（主因: `BursaMaterialItem` / `scoreJa` パターンを Phase15〜23 横断修正）
2. **Unit Test 2 件解消**（Phase18 / Phase18.5 材料スコア clamp テスト）
3. **Phase11 `withAnalystTarget` バグ修正**（実行時クラッシュリスクあり）
4. `--dry-run` を外して再実行

---

## 5. dry-run 再実行結果

### 実行コマンド

```bash
git status --short          # 大量 modified/untracked（Phase12.5 + Phase13〜23 未コミット塊）
npm run typecheck           # exit 2, 101 errors
npm run sync:report -- \
  --report docs/review/PHASE23_EARNINGS_REVISION_INTELLIGENCE_REPORT.md \
  --phase 23 \
  --summary "add earnings revision intelligence and conviction integration" \
  --pass-fail PASS \
  --critical-count 0 \
  --dry-run
```

### dry-run 結果

| 項目 | 値 |
|------|-----|
| typecheckOk | **false** |
| unitTestOk | **false** |
| pushResult | **skipped** |
| skippedReason | `Typecheck FAIL; Unit Test FAIL; --dry-run 指定` |
| commitBefore / After | `338ebc4` / `338ebc4` |

---

## 6. 総合判定

| 項目 | 判定 |
|------|------|
| Phase23 実装 | **済**（ワーキングツリー） |
| Phase23 専用 Unit Test | **PASS**（9/9） |
| sync 用フル Unit Test | **FAIL**（2/1392） |
| Typecheck | **FAIL**（101） |
| GitHub 同期可否 | **不可**（現状） |
| **PASS/FAIL** | **FAIL**（GitHub 同期観点） |

### レポート §3 修正推奨

§3 の「Unit Test PASS」は誤解を招くため、以下に変更すべき:

```
Unit Test bursaPhase23.test.ts     PASS  9/9
Unit Test npm run test:unit        FAIL  2 failed / 1392 (Phase18, Phase18.5)
```

---

## 7. 次のアクション

1. `bursaPhase11Analysis.ts` の `withAnalystTarget` 参照バグを修正（実行時リスク）
2. `scoreJa` / `BursaMaterialItem.sentiment` 型問題を Phase15〜23 横断で修正
3. Phase18 / Phase18.5 の FAIL テスト 2 件を修正
4. Typecheck 0 件・test:unit 0 fail 確認後、`--dry-run` なしで `sync:report` 再実行

---

## 再実行コマンド

```bash
npm run typecheck
npm run test:unit
npm run sync:report -- \
  --report docs/review/PHASE23_EARNINGS_REVISION_INTELLIGENCE_REPORT.md \
  --phase 23 \
  --summary "add earnings revision intelligence and conviction integration" \
  --pass-fail PASS \
  --critical-count 0 \
  --dry-run
```
