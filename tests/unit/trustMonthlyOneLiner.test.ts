import { describe, expect, it } from 'vitest';
import { buildAllocationRecommendationMeta } from '../../src/services/recommendationProvenance';
import {
  buildTrustMonthlyOneLinerJa,
  collectCharterApprovalReasonsFromPlan,
} from '../../src/services/trustMonthlyOneLiner';
import { buildTrustPlanPresentation } from '../../src/services/trustRecommendationSummary';
import type { AllocationCandidate, AllocationPlan } from '../../src/types';
import type { StockRecommendation } from '../../src/types/recommendation';

function baseRec(why = '配当と成長'): StockRecommendation {
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
    whyThisStock: why,
    cautions: ['短期過熱'],
    beginnerComment: '',
    aiNote: '',
    symbol: '5347',
    market: 'bursa',
  };
}

function planWithStyle(style: AllocationPlan['investmentStyle'], why = '配当安定'): AllocationPlan {
  const meta = buildAllocationRecommendationMeta({
    symbol: '1155.KL',
    name: 'Malayan Banking',
    rec: baseRec(why),
    selectionReason: why,
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
    selectionReason: why,
    beginnerNote: '',
    recommendation: baseRec(why),
    recommendationMeta: meta,
  };
  return {
    depositMYR: 1000,
    market: 'bursa',
    riskLevel: style === 'dividend' ? 'low' : style === 'short_term' ? 'high' : 'standard',
    investmentStyle: style,
    fractionalSharesEnabled: false,
    cashReserveMYR: 100,
    cashReservePct: 10,
    investableMYR: 900,
    candidates: [candidate],
  };
}

describe('trustMonthlyOneLiner', () => {
  it('collects charterApprovalReasons from plan meta', () => {
    const plan = planWithStyle('balanced');
    const reasons = collectCharterApprovalReasonsFromPlan(plan);
    expect(reasons.length).toBeGreaterThan(0);
  });

  it('generates dividend themed one-liner', () => {
    const line = buildTrustMonthlyOneLinerJa({
      approvalReasonsJa: ['高配当銘柄で配当が安定'],
      profileTypeLabel: '安定型',
      expectedRiskLevel: '低',
    });
    expect(line).toContain('配当');
    expect(line.length).toBeGreaterThanOrEqual(20);
    expect(line.length).toBeLessThanOrEqual(50);
    expect(line).not.toMatch(/PER|PBR|Malaysia v4/i);
  });

  it('generates defensive one-liner when risk is high', () => {
    const line = buildTrustMonthlyOneLinerJa({
      approvalReasonsJa: ['市場の変動が大きい'],
      profileTypeLabel: '標準型',
      expectedRiskLevel: '高',
    });
    expect(line).toContain('守り');
  });

  it('falls back to profile type without jargon', () => {
    const line = buildTrustMonthlyOneLinerJa({
      approvalReasonsJa: [],
      profileTypeLabel: '安定型',
      expectedRiskLevel: '低',
    });
    expect(line).toContain('安定型');
    expect(line.length).toBeGreaterThanOrEqual(20);
  });

  it('is included in trust plan presentation', () => {
    const presentation = buildTrustPlanPresentation(planWithStyle('dividend', '配当が安定'));
    expect(presentation.monthlyOneLinerJa.length).toBeGreaterThanOrEqual(20);
    expect(presentation.monthlyOneLinerJa.length).toBeLessThanOrEqual(50);
  });
});
