import { describe, expect, it } from 'vitest';
import {
  resolveConciergeAnalysisTargets,
  userNamesExplicitStockTarget,
} from '../../src/services/conciergeEvidenceBuilder';
import type { PortfolioPosition } from '../../src/types';

const onlyEtfHolding: PortfolioPosition[] = [
  {
    id: 'p-0820ea',
    symbol: '0820EA',
    market: 'bursa',
    currency: 'MYR',
    shares: 100,
    averageBuyPrice: 1.5,
    currentPrice: 1.6,
    isStale: false,
    quoteAgeSeconds: 0,
    openedAt: new Date().toISOString(),
  },
];

describe('concierge evidence targets', () => {
  it('detects explicit Maybank analysis intent', () => {
    expect(userNamesExplicitStockTarget('Maybankを分析して')).toBe(true);
    expect(userNamesExplicitStockTarget('今日の市場は？')).toBe(false);
  });

  it('resolves Maybank to 1155 even when portfolio only holds 0820EA', () => {
    const targets = resolveConciergeAnalysisTargets('Maybankを分析して', onlyEtfHolding);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.symbol).toBe('1155.KL');
  });
});
