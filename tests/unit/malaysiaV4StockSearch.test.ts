import { describe, expect, it } from 'vitest';
import { findStock } from '../../src/data/sampleStocks';
import { filterRankedStocks, rankAllStocks } from '../../src/services/stockSearch';
import { V4_YAHOO_QUALITY_SYMBOLS } from '../../src/services/forwardValidation/forwardValidationMalaysiaV4YahooQualityAudit';
import {
  buildAllStockSearchProbes,
  probeStockSearch,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4GoLiveAudit';

describe('Malaysia v4 stock search (GAMUDA fix)', () => {
  const v4Symbols = V4_YAHOO_QUALITY_SYMBOLS.map((s) => s.symbol);

  it('has all 5 v4 symbols in stocks master', () => {
    for (const sym of v4Symbols) {
      expect(findStock(sym), sym).toBeDefined();
    }
  });

  it('has all 5 v4 symbols in search index', () => {
    const ranked = rankAllStocks();
    for (const sym of v4Symbols) {
      expect(ranked.some((s) => s.symbol === sym), sym).toBe(true);
    }
  });

  it('hits GAMUDA for GAMUDA, 5398, and Gamuda queries', () => {
    for (const q of ['GAMUDA', '5398', 'Gamuda']) {
      const hits = filterRankedStocks(rankAllStocks(), q, new Set());
      expect(hits.some((s) => s.symbol === '5398'), q).toBe(true);
    }
  });

  it('hits all 5 v4 symbols by symbol and name search', () => {
    for (const def of V4_YAHOO_QUALITY_SYMBOLS) {
      const bySymbol = filterRankedStocks(rankAllStocks(), def.symbol, new Set());
      expect(bySymbol.some((s) => s.symbol === def.symbol), def.symbol).toBe(true);

      const byName = filterRankedStocks(rankAllStocks(), def.labelJa, new Set());
      expect(byName.some((s) => s.symbol === def.symbol), def.labelJa).toBe(true);
    }
  });

  it('includes all v4 bursa symbols in recommended (bursa filter) search', () => {
    const probes = probeStockSearch('', 'recommended');
    for (const sym of v4Symbols) {
      const row = probes.find((p) => p.symbol === sym);
      expect(row?.hit, sym).toBe(true);
    }
  });

  it('buildAllStockSearchProbes reports master and index presence', () => {
    const probes = buildAllStockSearchProbes();
    for (const sym of v4Symbols) {
      const master = probes.filter((p) => p.symbol === sym);
      expect(master.every((p) => p.inStocksMaster), sym).toBe(true);
      expect(master.every((p) => p.inSearchIndex), sym).toBe(true);
    }
  });
});
