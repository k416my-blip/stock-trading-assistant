# Phase22.2 Conviction Intelligence 監査レポート

## 実施日時
2026-06-11T03:15:10.322Z

## Commit Hash
338ebc4

## 1. 6銘柄結果

| 銘柄 | 名称 | Fair Value | Analyst | Coverage | Trend | FV Conf | DCF | DDM | Gap | 信頼 | Conviction | Confidence | Score | 状態 |
|------|------|------------|---------|----------|-------|---------|-----|-----|-----|------|------------|------------|-------|------|
| 1155 | Maybank | RM 10.20 | RM 11.90 | 19 | Stable | High | No | Yes | +16.7% | Blended（双方整合） | Hold（中立） | High | +4 | 成功 |
| 1023 | CIMB | RM 7.92 | RM 9.05 | 20 | Stable | Medium | No | No | +14.3% | Blended（双方整合） | Buy（買い） | High | +6 | 成功 |
| 1295 | Public Bank | RM 4.07 | RM 5.45 | 19 | Stable | Medium | No | No | +33.9% | Analyst Target（アナリスト優先） | Buy（買い） | Medium | +7 | 成功 |
| 5347 | Tenaga | RM 20.94 | RM 16.50 | 21 | Stable | High | No | Yes | -21.2% | Fair Value（モデル優先） | Strong Buy（強気） | High | +15 | 成功 |
| 4707 | Nestle | RM 65.90 | RM 113.00 | 12 | Stable | High | Yes | Yes | +71.5% | Analyst Target（アナリスト優先） | Buy（買い） | Medium | +9 | 成功 |
| 6033 | Petronas Gas | RM 10.59 | RM 18.80 | 13 | Stable | High | No | Yes | +77.5% | Analyst Target（アナリスト優先） | Hold（中立） | Medium | +1 | 成功 |

## 2. 理由（3行要約 · 1行目）

- **1155 Maybank:** 信頼ソース: Blended（双方整合） — Gap +16.7%（Consensus（概ね一致））
- **1023 CIMB:** 信頼ソース: Blended（双方整合） — Gap +14.3%（Consensus（概ね一致））
- **1295 Public Bank:** 信頼ソース: Analyst Target（アナリスト優先） — Gap +33.9%（Analyst Premium（アナリスト上方））
- **5347 Tenaga:** 信頼ソース: Fair Value（モデル優先） — Gap -21.2%（Model Premium（モデル上方））
- **4707 Nestle:** 信頼ソース: Analyst Target（アナリスト優先） — Gap +71.5%（Strong Analyst Premium（アナリスト大幅上方））
- **6033 Petronas Gas:** 信頼ソース: Analyst Target（アナリスト優先） — Gap +77.5%（Strong Analyst Premium（アナリスト大幅上方））

## 3. Convictionランキング（Score降順）

| 順位 | 銘柄 | Score | Level | Confidence | 信頼ソース |
|------|------|-------|-------|------------|------------|
| 1 | 5347 | +15 | Strong Buy | High | Fair Value（モデル優先） |
| 2 | 4707 | +9 | Buy | Medium | Analyst Target（アナリスト優先） |
| 3 | 1295 | +7 | Buy | Medium | Analyst Target（アナリスト優先） |
| 4 | 1023 | +6 | Buy | High | Blended（双方整合） |
| 5 | 1155 | +4 | Hold | High | Blended（双方整合） |
| 6 | 6033 | +1 | Hold | Medium | Analyst Target（アナリスト優先） |

## 4. PASS/FAIL
**PASS** — 6銘柄中 6 銘柄で Conviction 算出成功

## エラー詳細
- なし