import { describe, expect, it } from 'vitest';
import { buildAllocationRecommendationMeta } from '../../src/services/recommendationProvenance';
import {
  buildTrustConciergeMessageJa,
  buildTrustHomeBriefing,
  buildTrustPlanPresentation,
  buildTrustRecommendationSummary,
  currentMonthLabelJa,
  resolveTrustExpectedRiskLevel,
} from '../../src/services/trustRecommendationSummary';
import type { AllocationCandidate, AllocationPlan } from '../../src/types';
import type { StockRecommendation } from '../../src/types/recommendation';

function baseRec(): StockRecommendation {
  return {
    totalScore: 82,
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

function candidate(meta: ReturnType<typeof buildAllocationRecommendationMeta>): AllocationCandidate {
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

function samplePlan(): AllocationPlan {
  const meta = buildAllocationRecommendationMeta({
    symbol: '1155.KL',
    name: 'Malayan Banking',
    rec: baseRec(),
    selectionReason: '配当安定',
    allocationPct: 50,
  });
  return {
    depositMYR: 1000,
    market: 'bursa',
    riskLevel: 'standard',
    investmentStyle: 'balanced',
    fractionalSharesEnabled: false,
    cashReserveMYR: 100,
    cashReservePct: 10,
    investableMYR: 900,
    candidates: [candidate(meta)],
  };
}

describe('trustRecommendationSummary', () => {
  it('builds minimal trust fields only', () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '1155.KL',
      name: 'Malayan Banking',
      rec: baseRec(),
      selectionReason: '配当安定',
      allocationPct: 50,
    });
    const summary = buildTrustRecommendationSummary(candidate(meta), meta);

    expect(summary.allocationPctLabel).toBe('50%');
    expect(summary.recommendedAmountLabel).toContain('RM');
    expect(['低', '中', '高']).toContain(summary.expectedRiskLevel);
    expect(JSON.stringify(summary)).not.toMatch(/BUY|HOLD|REJECT|score/i);
  });

  it('builds plan presentation with profile type', () => {
    const presentation = buildTrustPlanPresentation(samplePlan());
    expect(presentation.committeeApprovalLabel).toBe('専属MD承認済み');
    expect(presentation.profileTypeLabel).toBe('標準型');
    expect(presentation.totalAmountLabel).toBe('RM1,000');
    expect(['低', '中', '高']).toContain(presentation.expectedRiskLevel);
  });

  it('builds home briefing before and after plan', () => {
    const before = buildTrustHomeBriefing({ hasPlan: false, depositMYR: 1000 });
    expect(before.lines[0]).toContain('市場を分析');
    const after = buildTrustHomeBriefing({
      hasPlan: true,
      profileTypeLabel: '安定型',
      committeeApproved: true,
    });
    expect(after.lines).toContain('専属MD承認済みです。');
  });

  it('does not mutate decisionHash', () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '1155.KL',
      name: 'Malayan Banking',
      rec: baseRec(),
      selectionReason: '配当安定',
      allocationPct: 50,
    });
    const hash = meta.decisionHash;
    buildTrustRecommendationSummary(candidate(meta), meta);
    expect(meta.decisionHash).toBe(hash);
  });

  it('formats current month label', () => {
    expect(currentMonthLabelJa(new Date(2026, 5, 2))).toBe('6月');
  });

  it('maps risk level from meta', () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '1155.KL',
      name: 'Malayan Banking',
      rec: baseRec(),
      selectionReason: '配当安定',
      allocationPct: 50,
    });
    const level = resolveTrustExpectedRiskLevel(meta);
    expect(['低', '中', '高']).toContain(level);
  });

  it('builds concierge message from briefing', () => {
    const message = buildTrustConciergeMessageJa({
      depositMYR: 1000,
      hasPlan: true,
      profileTypeLabel: '標準型',
      committeeApproved: true,
    });
    expect(message).toContain('配分案が完成');
  });
});
