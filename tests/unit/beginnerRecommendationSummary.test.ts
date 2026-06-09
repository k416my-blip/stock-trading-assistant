import { describe, expect, it } from 'vitest';
import { buildAllocationRecommendationMeta } from '../../src/services/recommendationProvenance';
import { buildBeginnerRecommendationSummary } from '../../src/services/beginnerRecommendationSummary';
import type { AllocationCandidate } from '../../src/types';
import type { StockRecommendation } from '../../src/types/recommendation';

function baseRec(score = 82): StockRecommendation {
  return {
    totalScore: score,
    disclaimer: '参考',
    technical: { score: 70, label: 'テクニカル' },
    fundamental: { score: 65, label: 'ファンダ' },
    news: { score: 60, label: 'ニュース', unavailable: false },
    earnings: { score: 58, label: '決算', unavailable: false },
    sns: { score: 40, label: 'SNS', unavailable: true },
    risk: { score: 70, label: 'リスク' },
    dataSource: { price: 'available', news: 'available', earnings: 'available', sns: 'unavailable' },
    newsDetail: {
      score: 60,
      sentiment: 'ポジティブ',
      headlines: [],
      summary: '',
      explanation: '',
      source: 'available',
    },
    earningsDetail: {
      score: 58,
      revenueGrowthPct: 8,
      profitGrowthPct: 5,
      eps: 1.2,
      guidance: null,
      summary: '',
      explanation: '',
      source: 'available',
    },
    snsDetail: {
      score: 40,
      buzzScore: 0,
      positiveRatePct: 0,
      negativeRatePct: 0,
      summary: '',
      warning: '',
      explanation: '',
      source: 'unavailable',
    },
    historicalDetail: {
      score: 55,
      returnPct90d: 10,
      declinePct90d: null,
      volatilityPct: 18,
      maxDrawdownPct: null,
      winRatePct: null,
      summary: '',
      explanation: '',
      disclaimer: '',
      source: 'available',
    },
    fundamentalDetail: {
      score: 65,
      per: 12,
      pbr: 1.1,
      dividendYield: 4.5,
      roe: 12,
      revenueGrowthPct: 8,
      profitGrowthPct: 5,
      debtRatioPct: null,
      marketCap: null,
      termNotes: {},
      summary: '',
      explanation: '',
      source: 'available',
    },
    whyThisStock: '配当と成長',
    cautions: ['短期過熱'],
    beginnerComment: '',
    aiNote: '',
    symbol: '5347',
    market: 'bursa',
  };
}

function baseCandidate(meta: ReturnType<typeof buildAllocationRecommendationMeta>): AllocationCandidate {
  return {
    symbol: '1155.KL',
    name: 'Malayan Banking',
    market: 'bursa',
    currency: 'MYR',
    category: 'dividend',
    categoryLabel: '高配当',
    allocationMYR: 500,
    allocationPct: 50,
    estimatedShares: 10,
    isFractionalShares: false,
    entryPrice: 10,
    stopLoss: 9,
    takeProfit: 11,
    selectionReason: '配当安定',
    beginnerNote: '',
    recommendation: baseRec(),
    recommendationMeta: meta,
  };
}

describe('beginnerRecommendationSummary', () => {
  it('builds card fields without exposing raw scores', () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '1155.KL',
      name: 'Malayan Banking',
      rec: baseRec(),
      selectionReason: '配当安定',
      allocationPct: 50,
    });
    const summary = buildBeginnerRecommendationSummary(baseCandidate(meta), meta);

    expect(summary.recommendationLabel).toMatch(/買う|保留|見送る/);
    expect(['A', 'B', 'C', 'D']).toContain(summary.gradeLabel);
    expect(['高', '中', '低']).toContain(summary.certaintyLabel);
    expect(summary.reasons.length).toBeLessThanOrEqual(3);
    expect(summary.cautions.length).toBeLessThanOrEqual(3);
    expect(summary.maxAmountLabel).toContain('RM');
    expect(summary.naturalExplanationJa).not.toContain('decisionHash');
    expect(summary.naturalExplanationJa).not.toContain('PER');
  });

  it('does not change underlying decisionHash when building summary', () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '1155.KL',
      name: 'Malayan Banking',
      rec: baseRec(),
      selectionReason: '配当安定',
      allocationPct: 50,
    });
    const hashBefore = meta.decisionHash;
    buildBeginnerRecommendationSummary(baseCandidate(meta), meta);
    expect(meta.decisionHash).toBe(hashBefore);
    expect(meta.adoptionVerdict).toBeTruthy();
  });
});
