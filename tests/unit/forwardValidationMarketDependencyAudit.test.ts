/**
 * npx vitest run tests/unit/forwardValidationMarketDependencyAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildMarketDependencyCohortMetrics,
  evaluateMarketDependency,
  MARKET_DEPENDENCY_ALL_REGIONAL,
  MARKET_EUROPE_ETFS,
} from '../../src/services/forwardValidation/forwardValidationMarketDependencyAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(signalDate: string, symbol: string, returnPct = 3): ForwardPassedTradeRecord {
  return {
    id: `${signalDate}-${symbol}`,
    symbol: symbol as ForwardPassedTradeRecord['symbol'],
    signalDate,
    entryDate: signalDate,
    exitDate: signalDate,
    entryPrice: 25,
    exitPrice: 25 * (1 + returnPct / 100),
    returnPct,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 30,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime: 'down',
  };
}

describe('forwardValidationMarketDependencyAudit', () => {
  it('includes all regional ETF symbols', () => {
    expect(MARKET_DEPENDENCY_ALL_REGIONAL).toContain('VEA');
    expect(MARKET_DEPENDENCY_ALL_REGIONAL).toContain('EWJ');
    expect(MARKET_DEPENDENCY_ALL_REGIONAL).toContain('ACWI');
    expect(MARKET_EUROPE_ETFS).toEqual(['VEA', 'IEFA', 'VGK']);
  });

  it('evaluates universal reversal when regional cohorts match US', () => {
    const usTrades = Array.from({ length: 8 }, (_, i) =>
      mockTrade(`2020-0${(i % 9) + 1}-01`, 'SCHD'),
    );
    const us = buildMarketDependencyCohortMetrics('us', '米国', ['SCHD'], usTrades);
    const europeTrades = Array.from({ length: 6 }, (_, i) =>
      mockTrade(`2020-0${(i % 9) + 1}-02`, 'VEA'),
    );
    const europe = buildMarketDependencyCohortMetrics('europe', '欧州', ['VEA'], europeTrades);
    const globalTrades = Array.from({ length: 6 }, (_, i) =>
      mockTrade(`2020-0${(i % 9) + 1}-03`, 'ACWI'),
    );
    const global = buildMarketDependencyCohortMetrics('global', '全世界', ['ACWI'], globalTrades);
    const { verdict } = evaluateMarketDependency(us, [europe, global]);
    expect(verdict).toBe('universal_reversal');
  });

  it('evaluates us_specific when regional underperforms', () => {
    const usTrades = Array.from({ length: 8 }, (_, i) =>
      mockTrade(`2020-0${(i % 9) + 1}-01`, 'SCHD'),
    );
    const us = buildMarketDependencyCohortMetrics('us', '米国', ['SCHD'], usTrades);
    const europe = buildMarketDependencyCohortMetrics('europe', '欧州', ['VEA'], [
      mockTrade('2020-03-02', 'VEA', -2),
      mockTrade('2020-04-02', 'VEA', -2),
      mockTrade('2020-05-02', 'VEA', -2),
      mockTrade('2020-06-02', 'VEA', 3),
      mockTrade('2020-07-02', 'VEA', -2),
    ]);
    const japan = buildMarketDependencyCohortMetrics('japan', '日本', ['EWJ'], [
      mockTrade('2020-03-03', 'EWJ', -1),
      mockTrade('2020-04-03', 'EWJ', -1),
      mockTrade('2020-05-03', 'EWJ', 3),
    ]);
    const { verdict } = evaluateMarketDependency(us, [europe, japan]);
    expect(verdict).toBe('us_specific');
  });
});
