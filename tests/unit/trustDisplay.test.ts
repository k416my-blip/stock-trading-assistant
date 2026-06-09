import { describe, expect, it } from 'vitest';
import { mapToTrustProfileTypeLabel } from '../../src/constants/trustDisplay';
import {
  buildTrustHomeBriefing,
  buildTrustPlanPresentation,
  buildTrustConciergeMessageJa,
} from '../../src/services/trustRecommendationSummary';
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
    cautions: ['短期過熱'],
    beginnerComment: '',
    aiNote: '',
    symbol: '5347',
    market: 'bursa',
  };
}

function samplePlan(style: AllocationPlan['investmentStyle'] = 'balanced'): AllocationPlan {
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
    riskLevel: style === 'dividend' ? 'low' : style === 'short_term' ? 'high' : 'standard',
    investmentStyle: style,
    fractionalSharesEnabled: false,
    cashReserveMYR: 100,
    cashReservePct: 10,
    investableMYR: 900,
    candidates: [candidate],
  };
}

describe('trustDisplay final UI', () => {
  it('maps investment style to 安定型/標準型/積極型', () => {
    expect(
      mapToTrustProfileTypeLabel({ investmentStyle: 'dividend', riskLevel: 'low' }),
    ).toBe('安定型');
    expect(
      mapToTrustProfileTypeLabel({ investmentStyle: 'balanced', riskLevel: 'standard' }),
    ).toBe('標準型');
    expect(
      mapToTrustProfileTypeLabel({ investmentStyle: 'short_term', riskLevel: 'high' }),
    ).toBe('積極型');
  });

  it('builds MD-style home briefing lines', () => {
    const briefing = buildTrustHomeBriefing({
      hasPlan: true,
      profileTypeLabel: '安定型',
      committeeApproved: true,
    });
    expect(briefing.lines[0]).toBe('今月の配分案が完成しました。');
    expect(briefing.lines[1]).toBe('今回は安定型を推奨します。');
    expect(briefing.lines[2]).toBe('専属MD承認済みです。');
  });

  it('presentation exposes profile type instead of default stock list emphasis', () => {
    const presentation = buildTrustPlanPresentation(samplePlan('dividend'));
    expect(presentation.profileTypeLabel).toBe('安定型');
    expect(presentation.allocationLines).toHaveLength(1);
    expect(JSON.stringify(presentation)).not.toMatch(/BUY|HOLD|REJECT|score/i);
  });

  it('concierge message uses natural language briefing', () => {
    const message = buildTrustConciergeMessageJa({
      depositMYR: 1000,
      hasPlan: true,
      profileTypeLabel: '標準型',
      committeeApproved: true,
    });
    expect(message).toContain('今月の配分案が完成しました');
    expect(message).toContain('標準型');
    expect(message).toContain('専属MD承認済み');
  });
});
