# Phase15 Insider Trading — 実機検証レポート

## 総合判定: **PASS**

| 項目 | 結果 |
|------|------|
| 検証開始 (UTC) | 2026-06-10T06:02:07.945Z |
| 検証終了 (UTC) | 2026-06-10T06:02:35.223Z |
| 対象銘柄 | 1155, 1023, 1295, 5347, 4707, 6033 |
| **取得成功数** | **6 / 6** |
| PASS条件 4/6以上 取得成功 | PASS |
| クラッシュ0 | PASS |
| 未取得時安全表示 | PASS |

---

## 実装ファイル

- `src/types/bursaInsiderTrading.ts`
- `src/services/bursa/bursaInsiderTradingParser.ts`
- `src/services/bursa/bursaInsiderTradingService.ts`
- `src/services/bursa/bursaPhase15Analysis.ts`
- `src/services/bursa/bursaPhase11Analysis.ts`
- `src/services/bursa/bursaMaterialAnalysisService.ts`
- `src/services/buildConciergeEnhancedAnalysis.ts`
- `src/components/concierge/ConciergeEnhancedAnalysisBlock.tsx`
- `src/screens/MaterialAnalysisScreen.tsx`
- `tests/unit/bursaPhase15.test.ts`
- `scripts/bursa-phase15-device-verify.ts`

---

## 取得元

1. KLSE 銘柄ページ `shareholding_changes` テーブル
2. KLSE Shareholdings ページ（銘柄フィルタ）
3. KLSE Recent Announcements（Director / Substantial Shareholder）
4. Yahoo Finance — フォールバック（KL銘柄は通常データなし）

---

## 6銘柄別結果

| 銘柄 | 取得元 | 成功/失敗 | 90日買 | 90日売 | ネット | 最新取引日 | Insider | 役職 | Confidence |
|------|--------|-----------|--------|--------|--------|------------|---------|------|------------|
| 1155 Maybank | KLSE Shareholding Changes | 成功 | 138 | 99 | 買い優勢 | 2026-06-08 | KUMPULAN WANG PERSARAAN  | Substantial Shareholder | 85 |
| 1023 CIMB | KLSE Shareholding Changes | 成功 | 64 | 66 | 売り優勢 | 2026-06-29 | KUMPULAN WANG PERSARAAN  | Shareholder | 85 |
| 1295 Public Bank | KLSE Shareholding Changes | 成功 | 93 | 75 | 買い優勢 | 2026-06-05 | KUMPULAN WANG PERSARAAN  | Shareholder | 85 |
| 5347 Tenaga | KLSE Shareholding Changes | 成功 | 120 | 74 | 買い優勢 | 2026-06-08 | KUMPULAN WANG PERSARAAN  | Shareholder | 85 |
| 4707 Nestle | KLSE Shareholding Changes | 成功 | 46 | 3 | 買い優勢 | 2026-06-05 | EMPLOYEES PROVIDENT FUND | Substantial Shareholder | 85 |
| 6033 Petronas Gas | KLSE Shareholding Changes | 成功 | 35 | 3 | 買い優勢 | 2026-06-08 | KUMPULAN WANG PERSARAAN  | Substantial Shareholder | 85 |

---

## 銘柄別詳細

### 1155 — Maybank

- 評価1行: Insider Trading · KUMPULAN WANG PERSARAAN (DIPERBADANKAN)  · 買い · 90日 買138/売99 · 買い優勢 · [KLSE Shareholding Changes]
- 取得元: KLSE Shareholding Changes
- 90日 買/売: 138/99
- ネット判定: 買い優勢
- 最新取引: 2026-06-08 / 買い
- Insider: KUMPULAN WANG PERSARAAN (DIPERBADANKAN) ("KWAP")（Substantial Shareholder）
- 株数: 2,000,000 株
- Confidence: 85
- 未取得理由: データ未取得


### 1023 — CIMB

- 評価1行: Insider Trading · KUMPULAN WANG PERSARAAN (DIPERBADANKAN) · 売り · 90日 買64/売66 · 売り優勢 · [KLSE Shareholding Changes]
- 取得元: KLSE Shareholding Changes
- 90日 買/売: 64/66
- ネット判定: 売り優勢
- 最新取引: 2026-06-29 / 売り
- Insider: KUMPULAN WANG PERSARAAN (DIPERBADANKAN)（Shareholder）
- 株数: 2,250,000 株
- Confidence: 85
- 未取得理由: データ未取得


### 1295 — Public Bank

- 評価1行: Insider Trading · KUMPULAN WANG PERSARAAN (DIPERBADANKAN) · 買い · 90日 買93/売75 · 買い優勢 · [KLSE Shareholding Changes]
- 取得元: KLSE Shareholding Changes
- 90日 買/売: 93/75
- ネット判定: 買い優勢
- 最新取引: 2026-06-05 / 買い
- Insider: KUMPULAN WANG PERSARAAN (DIPERBADANKAN)（Shareholder）
- 株数: 62,600 株
- Confidence: 85
- 未取得理由: データ未取得


### 5347 — Tenaga

- 評価1行: Insider Trading · KUMPULAN WANG PERSARAAN (DIPERBADANKAN) · 買い · 90日 買120/売74 · 買い優勢 · [KLSE Shareholding Changes]
- 取得元: KLSE Shareholding Changes
- 90日 買/売: 120/74
- ネット判定: 買い優勢
- 最新取引: 2026-06-08 / 買い
- Insider: KUMPULAN WANG PERSARAAN (DIPERBADANKAN)（Shareholder）
- 株数: 121,800 株
- Confidence: 85
- 未取得理由: データ未取得


### 4707 — Nestle

- 評価1行: Insider Trading · EMPLOYEES PROVIDENT FUND BOARD · 買い · 90日 買46/売3 · 買い優勢 · [KLSE Shareholding Changes]
- 取得元: KLSE Shareholding Changes
- 90日 買/売: 46/3
- ネット判定: 買い優勢
- 最新取引: 2026-06-05 / 買い
- Insider: EMPLOYEES PROVIDENT FUND BOARD（Substantial Shareholder）
- 株数: 94,300 株
- Confidence: 85
- 未取得理由: データ未取得


### 6033 — Petronas Gas

- 評価1行: Insider Trading · KUMPULAN WANG PERSARAAN (DIPERBADANKAN)  · 買い · 90日 買35/売3 · 買い優勢 · [KLSE Shareholding Changes]
- 取得元: KLSE Shareholding Changes
- 90日 買/売: 35/3
- ネット判定: 買い優勢
- 最新取引: 2026-06-08 / 買い
- Insider: KUMPULAN WANG PERSARAAN (DIPERBADANKAN) ("KWAP")（Substantial Shareholder）
- 株数: 14,000 株
- Confidence: 85
- 未取得理由: データ未取得


---

## AI分析への反映

- AI分析20項目 **項目10 Insider売買評価** に `evaluationJa` を表示
- `insiderTradingDetailJa` で最新取引・90日集計・ネット判定・Confidence を表示
- 材料スコアへ **補助材料** として反映（買い優勢 +4〜12 / 売り優勢 -3〜8）
- **Insider売却のみで自動売り判断はしない**（総合判定ロジックは変更なし）

---

## テスト結果

- `tests/unit/bursaPhase15.test.ts` — **6/6 PASS**（shareholding changes / shareholdings page パース / 90日フィルタ / analysis build / unavailable / 売りスコア上限）
- 本スクリプト — **6/6 ライブ取得** / クラッシュ 0 件

---

## 残課題

- Bursa 開示 HTML から Director Dealings 詳細（金額・役職）の直接パース
- 個人取締役の Dealings と Institutional Substantial の分離精度向上
- Yahoo Finance Insider モジュール（KL銘柄対応時）

---

## 再実行

```powershell
npx vitest run tests/unit/bursaPhase15.test.ts
npx tsx scripts/bursa-phase15-device-verify.ts
```
