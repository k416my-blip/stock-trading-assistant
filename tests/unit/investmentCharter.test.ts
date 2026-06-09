import { describe, expect, it } from 'vitest';
import {
  CHARTER_MIN_APPROVAL_REASONS,
  CHARTER_MIN_BUY_CONFIDENCE_PCT,
  CHARTER_MIN_BUY_SCORE,
  CHARTER_MIN_QUALITY_SIGNALS,
  INVESTMENT_PHILOSOPHY_SUMMARY_JA,
} from '../../src/constants/investmentCharter';
import type { ConciergeSymbolActionGuide } from '../../src/types/conciergeActionGuide';
import type { StockRecommendation } from '../../src/types/recommendation';
import { evaluateInvestmentCharter } from '../../src/services/investmentCharterEvaluation';
import {
  buildAllocationRecommendationMeta,
  isAdoptableRecommendation,
} from '../../src/services/recommendationProvenance';

function baseRec(overrides?: Partial<StockRecommendation>): StockRecommendation {
  return {
    totalScore: 82,
    disclaimer: '参考',
    technical: { score: 70, label: 'テクニカル' },
    fundamental: { score: 65, label: 'ファンダ' },
    news: { score: 60, label: 'ニュース', unavailable: false },
    earnings: { score: 58, label: '決算', unavailable: false },
    sns: { score: 40, label: 'SNS', unavailable: true },
    risk: { score: 70, label: 'リスク' },
    dataSource: {
      price: 'available',
      news: 'available',
      earnings: 'available',
      sns: 'unavailable',
    },
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
    whyThisStock: '配当と成長のバランス',
    cautions: ['短期過熱'],
    beginnerComment: '',
    aiNote: '',
    symbol: '5347',
    market: 'bursa',
    ...overrides,
  };
}

function conciergeGuide(): ConciergeSymbolActionGuide {
  return {
    symbol: '5347',
    market: 'bursa',
    displayLabelJa: 'TENAGA',
    primaryCategory: 'opportunity',
    categories: ['opportunity'],
    marketStance: 'bullish',
    marketStanceLabelJa: '強気',
    reasonBulletsJa: ['日中変化 +3.2%'],
    recommendedActionsJa: [],
    attentionPointsJa: ['短期過熱時は利確検討'],
    riskSummaryJa: '過熱に注意',
    confidencePct: 78,
    insufficientData: false,
    insufficientDataLabelJa: null,
    evidenceScores: { priceAction: 60, volume: 55, news: 50, xSentiment: 0, volatility: 40 },
    notificationPriority: 'medium',
    notificationWhyJa: '',
  };
}

describe('investmentCharterEvaluation', () => {
  it('holds when approval reasons fewer than charter minimum', () => {
    const result = evaluateInvestmentCharter({
      rec: baseRec(),
      approvalReasonsJa: ['a', 'b'],
      oppositionReasonsJa: ['反対1'],
      confidencePct: 78,
    });
    expect(result.verdict).toBe('hold');
    expect(result.verdictLabelJa).toBe('判断保留');
  });

  it('rejects on panic / high risk', () => {
    const result = evaluateInvestmentCharter({
      rec: baseRec(),
      approvalReasonsJa: ['a', 'b', 'c'],
      oppositionReasonsJa: ['反対1'],
      confidencePct: 78,
      conciergeGuide: {
        ...conciergeGuide(),
        primaryCategory: 'panic',
        categories: ['panic'],
      },
    });
    expect(result.verdict).toBe('reject');
  });

  it('adopts when charter BUY conditions met', () => {
    const result = evaluateInvestmentCharter({
      rec: baseRec(),
      approvalReasonsJa: ['売上成長', '増配', '業界追い風'],
      oppositionReasonsJa: ['短期過熱'],
      confidencePct: 78,
      conciergeGuide: conciergeGuide(),
    });
    expect(result.matchedQualityCount).toBeGreaterThanOrEqual(CHARTER_MIN_QUALITY_SIGNALS);
    expect(result.verdict).toBe('adopt');
    expect(result.buyEligible).toBe(true);
  });
});

describe('recommendationProvenance — investment charter', () => {
  it('includes philosophy and score in meta', () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '5347',
      name: 'TENAGA',
      rec: baseRec(),
      selectionReason: '配分適合',
      allocationPct: 20,
      conciergeGuide: conciergeGuide(),
    });
    expect(meta.investmentPhilosophyJa).toBe(INVESTMENT_PHILOSOPHY_SUMMARY_JA);
    expect(meta.confidencePct).toBeGreaterThanOrEqual(CHARTER_MIN_BUY_CONFIDENCE_PCT);
    expect(meta.fullRationaleJa).toContain('投資憲章');
    expect(meta.decisionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(meta.narrativeSource).toBe('rule');
  });

  it('requires charter thresholds', () => {
    expect(CHARTER_MIN_APPROVAL_REASONS).toBe(3);
    expect(CHARTER_MIN_BUY_SCORE).toBe(60);
    expect(CHARTER_MIN_BUY_CONFIDENCE_PCT).toBe(60);
  });

  it('blocks BUY when not adoptable', () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '5347',
      rec: baseRec({ totalScore: 45 }),
      selectionReason: '',
      allocationPct: 10,
    });
    expect(isAdoptableRecommendation(meta)).toBe(false);
    expect(meta.buyAllowed).toBe(false);
  });
});
