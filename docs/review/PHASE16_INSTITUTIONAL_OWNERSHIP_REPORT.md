# Phase16 Institutional Ownership — 実機検証レポート

## 総合判定: **PASS**

| 項目 | 結果 |
|------|------|
| 検証開始 (UTC) | 2026-06-10T06:18:00.739Z |
| 検証終了 (UTC) | 2026-06-10T06:18:28.451Z |
| 対象銘柄 | 1155, 1023, 1295, 5347, 4707, 6033 |
| **取得成功数** | **6 / 6** |
| PASS条件 4/6以上 取得成功 | PASS |
| クラッシュ0 | PASS |
| 未取得時安全表示 | PASS |

---

## 取得元

1. KLSE Shareholding Changes（機関名フィルタ）
2. KLSE Major Shareholders / Shareholdings ページ（Direct %）
3. KLSE Announcements（将来拡張）
4. Yahoo Finance — フォールバック（KL銘柄は通常データなし）

---

## 実装ファイル

- `src/types/bursaInstitutionalOwnership.ts`
- `src/services/bursa/bursaInstitutionalOwnershipParser.ts`
- `src/services/bursa/bursaInstitutionalOwnershipService.ts`
- `src/services/bursa/bursaPhase16Analysis.ts`
- `src/services/bursa/bursaPhase11Analysis.ts`
- `src/services/bursa/bursaMaterialAnalysisService.ts`
- `src/services/buildConciergeEnhancedAnalysis.ts`
- `src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx`
- `src/screens/MaterialAnalysisScreen.tsx`
- `tests/unit/bursaPhase16.test.ts`
- `scripts/bursa-phase16-device-verify.ts`

---

## 6銘柄別結果

| 銘柄 | 取得元 | 成功/失敗 | 機関数 | 上位3機関 | Net Flow | Confidence |
|------|--------|-----------|--------|-----------|----------|------------|
| 1155 Maybank | KLSE Major Shareholders | 成功 | 4 | AMANAHRAYA TRUSTEES BERHAD - AMANAH SAHAM BUMIPU | Buying | 100 |
| 1023 CIMB | KLSE Major Shareholders | 成功 | 2 | EPF 17.61% / KWAP 5.86% | Selling | 95 |
| 1295 Public Bank | KLSE Major Shareholders | 成功 | 2 | EPF 17.01% / KWAP 5.40% | Selling | 95 |
| 5347 Tenaga | KLSE Major Shareholders | 成功 | 3 | EPF 24.84% / KWAP 6.97% / AMANAHRAYA TRUSTEES BE | Strong Buying | 100 |
| 4707 Nestle | KLSE Major Shareholders | 成功 | 1 | EPF 14.73% | Strong Buying | 95 |
| 6033 Petronas Gas | KLSE Major Shareholders | 成功 | 2 | EPF 13.88% / KWAP 9.85% | Strong Buying | 95 |

---

## Net Flow 一覧

- **1155 Maybank**: Buying
- **1023 CIMB**: Selling
- **1295 Public Bank**: Selling
- **5347 Tenaga**: Strong Buying
- **4707 Nestle**: Strong Buying
- **6033 Petronas Gas**: Strong Buying

---

## 銘柄別詳細

### 1155 — Maybank

- 評価1行: Institutional Ownership · 機関4件 · AMANAHRAYA TRUSTEES BERHAD - AMANAH SAHAM BUMIPUTERA 27.68% / EPF 12.84% / PNB 6.36% · Buying · [KLSE Major Shareholders]
- 取得元: KLSE Major Shareholders
- 保有機関数: 4
- 上位3機関: AMANAHRAYA TRUSTEES BERHAD - AMANAH SAHAM BUMIPUTERA 27.68% / EPF 12.84% / PNB 6.36%
- 直近増減: AMANAHRAYA TRUSTEES BERHAD - AMANAH SAHAM BUMIPUTERA: 変化なし · EPF: 変化なし · PNB: 変化なし
- Net Flow: Buying
- Confidence: 100
- 未取得理由: データ未取得


### 1023 — CIMB

- 評価1行: Institutional Ownership · 機関2件 · EPF 17.61% / KWAP 5.86% · Selling · [KLSE Major Shareholders]
- 取得元: KLSE Major Shareholders
- 保有機関数: 2
- 上位3機関: EPF 17.61% / KWAP 5.86%
- 直近増減: EPF: 変化なし · KWAP: -0.04pt
- Net Flow: Selling
- Confidence: 95
- 未取得理由: データ未取得


### 1295 — Public Bank

- 評価1行: Institutional Ownership · 機関2件 · EPF 17.01% / KWAP 5.40% · Selling · [KLSE Major Shareholders]
- 取得元: KLSE Major Shareholders
- 保有機関数: 2
- 上位3機関: EPF 17.01% / KWAP 5.40%
- 直近増減: EPF: 変化なし · KWAP: 変化なし
- Net Flow: Selling
- Confidence: 95
- 未取得理由: データ未取得


### 5347 — Tenaga

- 評価1行: Institutional Ownership · 機関3件 · EPF 24.84% / KWAP 6.97% / AMANAHRAYA TRUSTEES BERHAD - AMANAH SAHAM BUMIPUTERA 未取得 · Strong Buying · [KLSE Major Shareholders]
- 取得元: KLSE Major Shareholders
- 保有機関数: 3
- 上位3機関: EPF 24.84% / KWAP 6.97% / AMANAHRAYA TRUSTEES BERHAD - AMANAH SAHAM BUMIPUTERA 未取得
- 直近増減: EPF: 変化なし · KWAP: 変化なし · AMANAHRAYA TRUSTEES BERHAD - AMANAH SAHAM BUMIPUTERA: 変化なし
- Net Flow: Strong Buying
- Confidence: 100
- 未取得理由: データ未取得


### 4707 — Nestle

- 評価1行: Institutional Ownership · 機関1件 · EPF 14.73% · Strong Buying · [KLSE Major Shareholders]
- 取得元: KLSE Major Shareholders
- 保有機関数: 1
- 上位3機関: EPF 14.73%
- 直近増減: EPF: 変化なし
- Net Flow: Strong Buying
- Confidence: 95
- 未取得理由: データ未取得


### 6033 — Petronas Gas

- 評価1行: Institutional Ownership · 機関2件 · EPF 13.88% / KWAP 9.85% · Strong Buying · [KLSE Major Shareholders]
- 取得元: KLSE Major Shareholders
- 保有機関数: 2
- 上位3機関: EPF 13.88% / KWAP 9.85%
- 直近増減: EPF: 変化なし · KWAP: 変化なし
- Net Flow: Strong Buying
- Confidence: 95
- 未取得理由: データ未取得


---

## AI分析への反映

- AI分析20項目 **項目11 Institutional Ownership評価** に `evaluationJa` を表示
- `institutionalOwnershipDetailJa` で保有機関数・上位3・増減・Net Flow・Confidence を表示
- 材料スコアへ **補助材料** として反映（Strong Buying +15 / Buying +8 / Selling -8 / Strong Selling -15）
- **単独では売買判定を決定しない**

---

## 既存機能への影響

- Phase13 Earnings Call / Phase14 Analyst Consensus / Phase15 Insider Trading — 変更なし
- News / X / Reddit — 変更なし
- 実注文・自動売買 — 追加なし

---

## テスト結果

- `tests/unit/bursaPhase16.test.ts` — **6/6 PASS**（機関名検出 / パース / holder records / unavailable / analysis build / スコア調整）
- 本スクリプト — **6/6 ライブ取得** / クラッシュ **0** 件

---

## 残課題

- Bursa 開示 HTML からの機関別詳細（金額・役職）直接パース
- 個人取締役と機関投資家の分離精度向上
- Yahoo Finance Institutional Holdings（KL銘柄対応時）
- Phase17 Dividend Intelligence への移行準備

---

## 再実行

```powershell
npx vitest run tests/unit/bursaPhase16.test.ts
npx tsx scripts/bursa-phase16-device-verify.ts
```
