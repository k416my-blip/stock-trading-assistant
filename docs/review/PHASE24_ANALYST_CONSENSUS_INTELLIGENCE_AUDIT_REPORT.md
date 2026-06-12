# Phase24 Analyst Consensus Intelligence — Offline Audit Report

## 実施日時
2026-06-12T23:18:08.709Z

## Git Commit Hash
da02bcd

## 対象 Phase
Phase24 Analyst Consensus Intelligence — **Step 4 offline audit (mock fixture · no live API)**

## 監査方針
- 6銘柄すべて mock fixture（`fetchLiveExternal=false`）
- 4707 のみ Phase14 派生 partial を追加注入して merge 確認
- 外部 API live fetch **なし**

## Phase14 adapter スモーク
- partial 構築: OK
- source: phase14_consensus
- analystCount: 11

## 6銘柄結果

| 銘柄 | 名称 | Availability | Analysts | Buy/Hold/Sell | Rating | Target | Upside | Target Rev | Dispersion | Score | Confidence | Warnings | Source | 状態 |
|------|------|--------------|----------|---------------|--------|--------|--------|------------|------------|-------|------------|----------|--------|------|
| 1155 | Maybank | available | 18 | 12/5/1 | Buy（買い） | MYR 11.85 | +16.2% | Upgraded（上方改定） | 28% | +20 | High | — | Mock Fixture (offline audit) | 成功 |
| 1023 | CIMB | available | 16 | 10/4/2 | Buy（買い） | MYR 8.45 | +10.9% | Stable（横ばい） | 32% | +7 | High | — | Mock Fixture (offline audit) | 成功 |
| 1295 | Public Bank | available | 14 | 8/5/1 | Hold（中立） | MYR 4.55 | +3.9% | Stable（横ばい） | 38% | +3 | High | — | Mock Fixture (offline audit) | 成功 |
| 5347 | Tenaga | available | 12 | 7/4/1 | Buy（買い） | MYR 14.2 | +10.5% | Upgraded（上方改定） | 35% | +14 | High | — | Mock Fixture (offline audit) | 成功 |
| 4707 | Nestle | available | 10 | 2/5/3 | Hold（中立） | MYR 99 | -2.5% | Downgraded（下方改定） | 50% | -10 | High | — | Phase14 Analyst Consensus | 成功 |
| 6033 | Petronas Gas | available | 9 | 5/3/1 | Buy（買い） | MYR 19.8 | +9.4% | Stable（横ばい） | 42% | +7 | High | — | Mock Fixture (offline audit) | 成功 |

## Warnings 集計
- なし

## 評価スニペット
- **1155:** アナリスト・コンセンサス評価 · Buy（買い） · Buy 67% / Hold 28% / Sell 6% · 目標 MYR 11.85 · 現在 MYR 
- **1023:** アナリスト・コンセンサス評価 · Buy（買い） · Buy 63% / Hold 25% / Sell 13% · 目標 MYR 8.45 · 現在 MYR 
- **1295:** アナリスト・コンセンサス評価 · Hold（中立） · Buy 57% / Hold 36% / Sell 7% · 目標 MYR 4.55 · 現在 MYR 
- **5347:** アナリスト・コンセンサス評価 · Buy（買い） · Buy 58% / Hold 33% / Sell 8% · 目標 MYR 14.2 · 現在 MYR 1
- **4707:** アナリスト・コンセンサス評価 · Hold（中立） · Buy 20% / Hold 50% / Sell 30% · 目標 MYR 99 · 現在 MYR 1
- **6033:** アナリスト・コンセンサス評価 · Buy（買い） · Buy 56% / Hold 33% / Sell 11% · 目標 MYR 19.8 · 現在 MYR 

## PASS/FAIL
**PASS** — 6/6 銘柄 available

## 再実行
```bash
npx vitest run tests/unit/bursaPhase24.test.ts
npx tsx scripts/bursa-phase24-audit-verify.ts
```
