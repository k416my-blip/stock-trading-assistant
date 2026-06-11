# Phase20.1 Valuation Audit レポート

## 1. 実施日時

- **実施:** 2026-06-11T00:34:52.324Z

## 2. Git Commit Hash

- **Commit:** 338ebc4

## 3. 対象Phase

**Phase20.1** — Phase20 Valuation Intelligence の ChatGPT 監査（5確認項目）

| # | 確認項目 |
|---|----------|
| 1 | Nestle: Before 5 → After 24、Valuation Adj -5.9 なのに AI スコア上昇の理由 |
| 2 | Debt/Equity（Tenaga 175.31x / Nestle 103.67x）の取得元・計算式・単位 |
| 3 | 取得率 68% の未取得項目を銘柄別一覧 |
| 4 | Valuation Score → AI 総合スコアへの重み |
| 5 | 6銘柄 PER/PBR/ROE/Valuation Score/AI 総合の相関監査 |

## 4. 監査スクリプト

| ファイル | 内容 |
|----------|------|
| `scripts/bursa-phase20-1-audit-verify.ts` | ライブ取得 · Nestle 分解 · D/E raw · 相関 · レポート生成 |

## 5. 確認項目1 — Nestle スコア上昇の説明

### 観測値

| 指標 | Before | After | Delta |
|------|--------|-------|-------|
| materialScore | 5 | 24 | **+19** |
| AI 総合スコア (overallScore) | 53 | 62 | **+9** |
| Valuation Score | — | -14 | Strong Overvalued |
| Valuation Adj | — | -5.9 | 適用済 |

AI 総合スコア式: `overallScore = clamp(50 + materialScore / 2)` → 5→53、24→62。

### Phase20 材料アイテム分解

| 段階 | 値 |
|------|-----|
| タイトル | `Valuation Strong Overvalued (-14)` |
| `classifyMaterialSentiment` | **好材料**（誤） |
| `scoreMaterialItem`（adj 前） | **+25** |
| `valuationIntelligenceMaterialScoreAdjustment` | **-5.9** |
| 最終材料スコア（adj 後） | **+19.1** |
| 配分先 | `positiveMaterials` |

### 根本原因（Critical）

`bursaMaterialSentiment.ts` の `STRONG_POSITIVE` 正規表現に `\bstrong\b` が含まれる。  
タイトル `Valuation **Strong** Overvalued (-14)` が **好材料** と誤分類される。

```
score = round(12 × 1.5 × 1.4) = 25   // 好材料 × bursa_announcement × strong
final = 25 + (-5.9) = 19.1           // positiveMaterials へ加算
materialScore: 5 + 19 ≈ 24
```

**結論:** Valuation Adj `-5.9` は正しく適用されているが、キーワード誤分類（+25）が上回り、割高銘柄の materialScore / AI スコアが逆方向に動く。

**関連コード:** `valuationIntelligenceToMaterialInputs()` → `scoreMaterialItem()` → `bursaPhase20Analysis.ts`

## 6. 確認項目2 — Debt/Equity 取得元

| Code | 取得元 | Yahoo raw JSON | パース値 | 正しい意味 | UI 表示（誤） |
|------|--------|----------------|----------|------------|---------------|
| 5347 Tenaga | `financialData.debtToEquity` | `{"raw":175.305,"fmt":"175.30%"}` | 175.305 | D/E **175.31%**（比率 1.75） | `175.31x` |
| 4707 Nestle | 同上 | `{"raw":103.668,"fmt":"103.67%"}` | 103.668 | D/E **103.67%**（比率 1.04） | `103.67x` |

| 項目 | 内容 |
|------|------|
| **取得元** | Yahoo Finance `quoteSummary` モジュール `financialData.debtToEquity`（`bursaValuationIntelligenceProviders.ts`） |
| **計算式** | アプリ側計算なし — `parseYahooRawNumber(debtToEquity)` をそのまま格納 |
| **Yahoo 定義** | Total Debt / Total Stockholder Equity × **100**（パーセント） |
| **表示** | `fmtRatio()` が `%` 値に `x` suffix を付与（単位ラベル誤り） |
| **スコアリング副作用** | `computeValuationScore()` のベンチマーク `debtEquityMax`（例: 1.0〜1.8 **倍率**）と `%` 生値を直接比較 → 常に大幅減点 |

**修正推奨:** 保存時に `value / 100` 正規化、または表示を `fmtPct` に変更。

## 7. 確認項目3 — 取得率 68% · 未取得項目（銘柄別）

平均取得率: **68.2%**（22 項目中 · 6 銘柄平均）

### 1155 Maybank — 13/22（59%）

**未取得:** FCF Margin, FCF Growth, PSR, EV/EBITDA, Debt/Equity, Current Ratio, Interest Coverage, Cash Ratio, Payout Ratio

### 1023 CIMB — 13/22（59%）

**未取得:** FCF Margin, FCF Growth, PSR, EV/EBITDA, Debt/Equity, Current Ratio, Interest Coverage, Cash Ratio, Payout Ratio

### 1295 Public Bank — 13/22（59%）

**未取得:** FCF Margin, FCF Growth, PSR, EV/EBITDA, Debt/Equity, Current Ratio, Interest Coverage, Cash Ratio, Payout Ratio

### 5347 Tenaga — 17/22（77%）

**未取得:** FCF Growth, PSR, Interest Coverage, Cash Ratio, Payout Ratio

### 4707 Nestle — 17/22（77%）

**未取得:** FCF Growth, PSR, Interest Coverage, Cash Ratio, Payout Ratio

### 6033 Petronas Gas — 17/22（77%）

**未取得:** FCF Growth, PSR, Interest Coverage, Cash Ratio, Payout Ratio

### サマリー

| 区分 | 未取得項目 |
|------|------------|
| **全 6 銘柄共通** | FCF Growth, PSR, Interest Coverage, Cash Ratio, Payout Ratio |
| **銀行 3 社のみ追加** | FCF Margin, EV/EBITDA, Debt/Equity, Current Ratio |
| **取得済（全銘柄）** | Share Buyback, Forward PER, PEG 等 |

## 8. 確認項目4 — Valuation Score → AI 総合スコアの重み

Valuation Score は **AI 総合スコアに直接加算されない**。2 段の間接反映。

```
Valuation Score (-20 .. +20)
  │
  ├─① scoreMaterialItem(title)           … キーワード判定（±最大 ~25）※現状バグあり
  │     + valuationIntelligenceMaterialScoreAdjustment(adj)
  │     → Phase20 材料 item.score
  │
  └─ aggregateMaterialScore() → materialScore (clamp ±100)
        │
        └─② materialScoreToOverallScore()
              overallScore = clamp(50 + materialScore / 2)   … 0..100
```

### adj 計算式

```
maxAdj = 10 × (0.35 + 0.65 × fieldAcquisitionRate)
adj    = clamp(valuationScore / 20 × maxAdj, -maxAdj, +maxAdj)
```

| 取得率 | maxAdj | Val Score -14 の adj | overall 換算（adj のみ） |
|--------|--------|----------------------|--------------------------|
| 59%（銀行） | 6.8 | -4.8 | -2.4 pt |
| 77%（非銀行） | 8.5 | -5.9 | -3.0 pt |

### 実効重み（正常時 vs 現状）

| 経路 | materialScore | overallScore（÷2） |
|------|---------------|-------------------|
| adj のみ（設計意図） | ±maxAdj（最大 ~8.5） | ±~4.3 pt |
| 材料キーワード（現状） | ±~25 | ±~12.5 pt |

Nestle 実測: material +19.1 → overall **+9.5 pt**（53→62）。adj -5.9 単体では -3 pt 程度。

## 9. 確認項目5 — 6 銘柄相関監査

### Pearson 相関（n=6 · 2026-06-11 ライブ）

| ペア | r | 判定 |
|------|---|------|
| PER ↔ Valuation Score | **-0.862** | 強い負 — 高 PER → 低 Val Score（期待通り） |
| PBR ↔ Valuation Score | **-0.822** | 強い負 — 高 PBR → 低 Val Score（期待通り） |
| ROE ↔ Valuation Score | **+0.625** | 中程度正 — 高 ROE → 高 Val Score（期待通り） |
| Valuation Score ↔ AI 総合 | **+0.181** | **弱い正 — Nestle バグで歪み**（-14 なのに AI 62） |
| PER ↔ AI 総合 | **-0.418** | 中程度負 — Nestle 外れ値で PER 連動が弱まる |

### 6 銘柄データ

| Code | PER | PBR | ROE% | Val Score | materialScore | AI Overall |
|------|-----|-----|------|-----------|---------------|------------|
| 1155 | 12.42 | 1.43 | 11.3 | -2 | 32 | 66 |
| 1023 | 10.28 | 1.16 | 11.3 | -2 | 32 | 66 |
| 1295 | 12.97 | 1.57 | 12.3 | -2 | 32 | 66 |
| 5347 | 17.34 | 1.65 | 8.4 | +1 | 16 | 58 |
| **4707** | **39.57** | **38.64** | **1.0** | **-14** | **24** | **62** |
| 6033 | 20.02 | 2.40 | 12.5 | -9 | 20 | 60 |

### 相関所見

- Valuation Score 算出（PER/PBR/ROE）は **統計的に妥当**
- AI 総合スコアは materialScore 経由のため、Nestle で **Val Score -14 なのに AI 62**（Tenaga Val +1 → AI 58 より高い）という逆転が発生
- Phase20.1-fix 適用後、Val Score ↔ AI 総合は負相関に近づく見込み

## 10. テスト結果

| テスト | 結果 | Commit |
|--------|------|--------|
| `npx tsx scripts/bursa-phase20-1-audit-verify.ts` | PASS（6/6 銘柄取得 · レポート生成） | 338ebc4 |
| `npx vitest run tests/unit/bursaPhase20.test.ts` | 未再実行（監査のみ · コード変更なし） | — |

## 11. PASS/FAIL 判定

**総合判定: FAIL**

| 重要度 | 件数 | 内容 |
|--------|------|------|
| Critical | 1 | `Strong Overvalued` → 好材料誤分類 → materialScore / AI 逆転 |
| Warning | 2 | D/E 表示単位 `%` vs `x` 不一致 · D/E スコアリング単位不一致 |

## 12. 残課題

1. **Phase20.1-fix:** Valuation 材料は `valuationRating` から sentiment を直接決定（キーワード分類をバイパス）
2. **D/E 正規化:** Yahoo `%` → 比率 `÷100` で保存・表示・スコアリング統一
3. **銀行 D/E 取得:** Yahoo `financialData` 空時の KLSE/Bursa フォールバック

## 13. 次に実施すべきこと

- **Phase20.1-fix** — Critical/Warning 修正 + ユニットテスト追加 + 再監査
- **Phase20.5** — セクター中央値 · FR 深度統合で取得率向上

## 14. 再実行コマンド

```bash
npx tsx scripts/bursa-phase20-1-audit-verify.ts
npx vitest run tests/unit/bursaPhase20.test.ts
```

## 15. 注意点

- 本監査は **コード修正なし** · ライブ Yahoo API 依存（再実行で数値が微変動しうる）
- Nestle 逆転は **再現性 100%**（タイトル文字列が固定のため）
- 銀行 3 社は Yahoo `financialData` 不足で取得率 59%

## 16. 実機監査結果

| 項目 | 値 |
|------|-----|
| heartbeatCount | N/A（本 Phase は API 監査） |
| testEnded | true |
| AsyncStorage保存確認 | N/A |
| battery optimization状態 | 未確認 |
| foreground時間 | N/A |
| background時間 | N/A |

## 17. 前回レポートとの差分

**前回:** `PHASE20_VALUATION_INTELLIGENCE_REPORT.md`（Commit 338ebc4 · PASS 6/6）

| 区分 | 内容 |
|------|------|
| **追加** | Phase20.1 監査スクリプト · Nestle 逆転根因 · D/E 単位監査 · 銘柄別未取得一覧 · 相関分析 |
| **修正** | なし |
| **判定変化** | PASS → **FAIL**（Critical 1 件新規検出） |

---

## 【監査サマリー】

| 項目 | 値 |
|------|-----|
| Commit | 338ebc4 |
| PASS/FAIL | **FAIL** |
| 次回テスト実施可否 | **CONDITIONAL PASS** |
| 残課題件数 | 3 |
| Critical 課題件数 | 1 |
| Warning 件数 | 2 |

## 【次回テスト実施可否】

**CONDITIONAL PASS** — Phase20.1-fix（キーワード誤分類 + D/E 単位）適用後に再監査推奨。
