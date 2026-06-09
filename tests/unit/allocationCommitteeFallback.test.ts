import { describe, expect, it } from 'vitest';
import { buildAllocationPlan } from '../../src/services/allocationPlan';
import { userSymbolsToAllocationUniverse } from '../../src/services/userAnalysisSymbols';
import {
  countCommitteeJudgments,
  promoteCandidateForTrustFallback,
  resolveFallbackPickCount,
  selectWatchFallbackCandidates,
} from '../../src/services/allocationCommitteeFallback';
import type { AllocationCandidate } from '../../src/types';
import type { AllocationRecommendationMeta } from '../../src/services/recommendationProvenance';

function mockCandidate(
  symbol: string,
  verdict: 'adopt' | 'hold' | 'reject',
  score: number,
  buyAllowed = verdict === 'adopt',
): AllocationCandidate {
  const meta = {
    adoptionVerdict: verdict,
    buyAllowed,
    recommendationScore: score,
    confidencePct: 60,
  } as AllocationRecommendationMeta;
  return {
    symbol,
    name: symbol,
    market: 'bursa',
    currency: 'MYR',
    category: 'growth',
    categoryLabel: '株',
    allocationMYR: 300,
    allocationPct: 30,
    estimatedShares: 1,
    isFractionalShares: false,
    allocationAdjusted: false,
    entryPrice: 1,
    stopLoss: 1,
    takeProfit: 1,
    selectionReason: 'test',
    beginnerNote: 'test',
    recommendation: { totalScore: score } as AllocationCandidate['recommendation'],
    recommendationMeta: meta,
  };
}

describe('allocationCommitteeFallback', () => {
  it('counts adopt / reject / watch', () => {
    const counts = countCommitteeJudgments([
      mockCandidate('A', 'adopt', 80),
      mockCandidate('B', 'hold', 70),
      mockCandidate('C', 'reject', 50),
    ]);
    expect(counts).toEqual({ adopt: 1, reject: 1, watch: 1 });
  });

  it('selects watch symbols by score first', () => {
    const picks = selectWatchFallbackCandidates(
      [
        mockCandidate('LOW', 'hold', 40),
        mockCandidate('HIGH', 'hold', 90),
        mockCandidate('REJ', 'reject', 95),
      ],
      2,
    );
    expect(picks.map((p) => p.symbol)).toEqual(['HIGH', 'LOW']);
  });

  it('promotes hold candidate to adopt for trust flow', () => {
    const promoted = promoteCandidateForTrustFallback(mockCandidate('X', 'hold', 75));
    expect(promoted.recommendationMeta?.adoptionVerdict).toBe('adopt');
    expect(promoted.recommendationMeta?.buyAllowed).toBe(true);
  });

  it('resolveFallbackPickCount clamps 3-10', () => {
    expect(resolveFallbackPickCount(1)).toBe(3);
    expect(resolveFallbackPickCount(5)).toBe(5);
    expect(resolveFallbackPickCount(20)).toBe(10);
  });
});

describe('buildAllocationPlan committee fallback', () => {
  it('returns plan with candidates when universe has stocks (no committee hard-stop)', () => {
    const refs = [
      { symbol: '3336', market: 'bursa' as const },
      { symbol: '4707', market: 'bursa' as const },
      { symbol: '1023', market: 'bursa' as const },
    ];
    const universe = userSymbolsToAllocationUniverse(refs, 'bursa', [], []);
    const result = buildAllocationPlan({
      depositMYR: 1000,
      market: 'bursa',
      riskLevel: 'standard',
      investmentStyle: 'balanced',
      fractionalSharesEnabled: false,
      userUniverse: universe,
    });
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
  });
});
