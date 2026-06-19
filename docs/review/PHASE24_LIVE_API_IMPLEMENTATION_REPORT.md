# Phase24 Live API Implementation Report

**Date:** 2026-06-19T01:49:19.827Z
**Commit:** ec8d8f3
**API strategy:** Yahoo Finance (primary, no key) → Finnhub → Alpha Vantage → FMP · Phase14 merge fallback

## Result: **PASS** (6/6)

| Code | Name | Phase14 | Phase24 Source | Avail | Analysts | Rating | Target | Upside | Score | Conf | Warnings | Status |
|------|------|---------|----------------|-------|----------|--------|--------|--------|-------|------|----------|--------|
| 1155 | Maybank | yahoo_finance | yahoo_finance | available | 19 | Buy（買い） | MYR 12.01 | +7.5% | +7 | High | — | PASS |
| 1023 | CIMB | yahoo_finance | yahoo_finance | available | 20 | Buy（買い） | MYR 9.03 | +17.1% | +14 | High | — | PASS |
| 1295 | Public Bank | yahoo_finance | yahoo_finance | available | 19 | Buy（買い） | MYR 5.45 | +11.1% | +10 | High | — | PASS |
| 5347 | Tenaga | yahoo_finance | yahoo_finance | available | 21 | Buy（買い） | MYR 16.42 | +13.1% | +10 | High | — | PASS |
| 4707 | Nestle | yahoo_finance | yahoo_finance | available | 12 | Hold（中立） | MYR 113.27 | +19.1% | +11 | Medium | high_dispersion | PASS |
| 6033 | Petronas Gas | yahoo_finance | yahoo_finance | available | 14 | Hold（中立） | MYR 18.69 | +7.5% | +4 | High | — | PASS |

## Implementation

- `fetchLiveAnalystConsensusIntelligencePartials` — reuses Phase14 fetchers
- `bursaPhase24Analysis.ts` — passes `fetchLiveExternal` + `apiKeys`
- `bursaPhase11Analysis.ts` — Phase24 wired after Phase14

## Re-run

```bash
npx vitest run tests/unit/bursaPhase24.test.ts
npx tsx scripts/bursa-phase24-live-verify.ts
```
