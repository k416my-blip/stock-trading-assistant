import { describe, expect, it } from 'vitest';
import { evaluateMarketSignals, estimateDividendExDateMs } from '../../src/services/signal-engine';
import type { PortfolioPosition } from '../../src/types';
import type { MarketRegimeResult } from '../../src/types/marketRegime';

function pos(partial: Partial<PortfolioPosition>): PortfolioPosition {
  return {
    id: 'p1',
    symbol: '4707',
    market: 'bursa',
    currency: 'MYR',
    shares: 100,
    averageBuyPrice: 80,
    currentPrice: 95,
    openedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('signal-engine', () => {
  it('detects high dividend screener when not held', () => {
    const signals = evaluateMarketSignals({ holdings: [], nowMs: Date.parse('2026-05-20T12:00:00.000Z') });
    const value = signals.find((s) => s.kind === 'high_dividend_value');
    expect(value).toBeDefined();
    expect(value?.reasonsJa.some((r) => r.includes('配当利回り'))).toBe(true);
  });

  it('attaches RSI reasons on held symbols', () => {
    const signals = evaluateMarketSignals({
      holdings: [pos({ symbol: '1155', currentPrice: 10.24 })],
      nowMs: Date.parse('2026-05-20T12:00:00.000Z'),
    });
    expect(signals.some((s) => s.reasonsJa.some((r) => r.startsWith('RSI')))).toBe(true);
  });

  it('flags weak market regime', () => {
    const regime: MarketRegimeResult = {
      regimeId: 'risk_off',
      labelJa: 'リスクオフ',
      confidenceScore: 70,
      riskScore: 80,
      preferredSectors: [],
      avoidSectors: [],
      summaryJa: '弱い',
      indicators: {
        indexMomentumPct: -2,
        volatilityProxyPct: 3,
        oilTrendPct: 0,
        usdStrengthProxy: 0,
        breadthPctAboveMa50: 40,
        defensiveVsGrowthSpread: 1,
        ratePressureProxy: 0,
        liquidityProxy: 0,
        sectorRotationScore: 0,
        maTrendScore: -1,
        computedAt: new Date().toISOString(),
      },
      regimeScores: {},
    };
    const signals = evaluateMarketSignals({ holdings: [], marketRegime: regime });
    expect(signals.some((s) => s.kind === 'market_weak')).toBe(true);
  });

  it('estimateDividendExDateMs is stable per symbol', () => {
    const a = estimateDividendExDateMs('4707', 1_000_000);
    const b = estimateDividendExDateMs('4707', 1_000_000);
    expect(a).toBe(b);
  });
});
