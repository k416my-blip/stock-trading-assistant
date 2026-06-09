import { describe, expect, it } from 'vitest';
import {
  containsTrustDisplayJargon,
  sanitizeTrustDisplayText,
} from '../../src/services/trustDisplaySanitizer';
import { buildTrustPlanPresentation } from '../../src/services/trustRecommendationSummary';
import { buildAllocationRecommendationMeta } from '../../src/services/recommendationProvenance';
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
    cautions: [],
    beginnerComment: '',
    aiNote: '',
    symbol: '5347',
    market: 'bursa',
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
  const candidate: AllocationCandidate = {
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
  return {
    depositMYR: 1000,
    market: 'bursa',
    riskLevel: 'standard',
    investmentStyle: 'balanced',
    fractionalSharesEnabled: false,
    cashReserveMYR: 100,
    cashReservePct: 10,
    investableMYR: 900,
    candidates: [candidate],
  };
}

describe('trustDisplaySanitizer', () => {
  it('removes internal jargon from display text', () => {
    const cleaned = sanitizeTrustDisplayText(
      'BUY confidence 85 recommendationScore 投資株売買 HOLD REJECT',
    );
    expect(cleaned).toBe('85');
    expect(containsTrustDisplayJargon(cleaned)).toBe(false);
  });

  it('keeps trust plan presentation free of internal jargon', () => {
    const presentation = buildTrustPlanPresentation(samplePlan());
    const blob = JSON.stringify(presentation);
    expect(blob).not.toMatch(/BUY|HOLD|REJECT|recommendationScore|confidence|委員会/i);
    expect(presentation.committeeApprovalLabel).toBe('専属MD承認済み');
  });
});
