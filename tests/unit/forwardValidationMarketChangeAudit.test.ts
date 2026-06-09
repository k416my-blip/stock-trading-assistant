import { describe, expect, it } from 'vitest';
import {
  computeMarketResilienceScore,
  gradeMarketChangeSurvival,
  isScenarioCollapsed,
  resolveVirtualMarketTrades,
} from '../../src/services/forwardValidation/forwardValidationMarketChangeAudit';
import type { ForwardMarketChangeScenarioMetrics } from '../../src/types/forwardValidation';

function row(
  overrides: Partial<ForwardMarketChangeScenarioMetrics>,
): ForwardMarketChangeScenarioMetrics {
  return {
    scenarioId: 'ai_bubble',
    labelJa: 'test',
    tradeCount: 5,
    winRatePct: 90,
    profitFactor: 4,
    sharpe: 2,
    maxDrawdownPct: -5,
    cumulativeReturnPct: 15,
    proxyJa: 'test',
    collapsed: false,
    ruleIdle: false,
    ...overrides,
  };
}

describe('forwardValidationMarketChangeAudit', () => {
  it('resolveVirtualMarketTrades marks ultra_low_vol as rule idle', () => {
    const r = resolveVirtualMarketTrades('ultra_low_vol', []);
    expect(r.ruleIdle).toBe(true);
    expect(r.trades.length).toBe(0);
  });

  it('isScenarioCollapsed detects negative cumulative', () => {
    expect(isScenarioCollapsed(row({ tradeCount: 5, cumulativeReturnPct: -3 }))).toBe(true);
    expect(isScenarioCollapsed(row({ ruleIdle: true, cumulativeReturnPct: 0 }))).toBe(false);
  });

  it('computeMarketResilienceScore returns high for positive scenarios', () => {
    const rows = Array.from({ length: 10 }, () => row({ cumulativeReturnPct: 12 }));
    const score = computeMarketResilienceScore(rows);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('gradeMarketChangeSurvival returns A for strong portfolio', () => {
    const rows = Array.from({ length: 10 }, () => row({ cumulativeReturnPct: 10 }));
    const score = computeMarketResilienceScore(rows);
    const { grade } = gradeMarketChangeSurvival({ rows, resilienceScore: score });
    expect(grade).toBe('A');
  });
});
