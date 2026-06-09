import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCommitteeNarrativeCacheKey,
  clearCommitteeNarrativeCacheForTest,
  clearCommitteeNarrativeMemoryCacheForTest,
  setCommitteeNarrativeCache,
} from '../../src/services/committeeNarrativeCache';
import {
  fetchCommitteeReview,
  validateNarrativeResponse,
} from '../../src/services/investmentCommitteeReviewService';
import {
  fetchRedTeamReview,
  validateRedTeamResponse,
} from '../../src/services/investmentCommitteeRedTeamService';
import {
  buildRedTeamCacheKey,
  clearRedTeamCacheForTest,
  clearRedTeamMemoryCacheForTest,
  setRedTeamCache,
} from '../../src/services/committeeRedTeamCache';
import {
  assertDecisionHashUnchanged,
  assertLockedDecisionFieldsUnchanged,
  enrichRecommendationMeta,
} from '../../src/services/recommendationMetaEnrichment';
import { buildAllocationRecommendationMeta } from '../../src/services/recommendationProvenance';
import { DecisionTamperedError } from '../../src/types/investmentCommitteeNarrative';
import type { StockRecommendation } from '../../src/types/recommendation';

vi.mock('../../src/services/aiApiKey', () => ({
  loadAiApiKey: vi.fn(async () => 'sk-test-key-123456789012345678901234567890'),
}));

vi.mock('../../src/services/productionStability/productionStabilityRuntime', () => ({
  shouldPauseConciergeAi: vi.fn(() => false),
}));

vi.mock('../../src/services/performanceCostRuntime', () => ({
  shouldPauseApiRequests: vi.fn(() => false),
}));

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

const mockReviewJson = JSON.stringify({
  bullCaseJa: ['AI賛成1', 'AI賛成2', 'AI賛成3'],
  bearCaseJa: ['AI反対1', 'AI反対2'],
  riskFactorsJa: ['ボラティリティ', '流動性'],
});

const mockRedTeamJson = JSON.stringify({
  counterArgumentsJa: ['RedTeam反証1', 'RedTeam反証2'],
  redTeamScore: 68,
});

function mockOpenAiFetch() {
  let call = 0;
  return vi.fn(async () => {
    call += 1;
    const payload = call % 2 === 1 ? mockReviewJson : mockRedTeamJson;
    return new Response(
      JSON.stringify({
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: payload }],
          },
        ],
      }),
      { status: 200 },
    );
  });
}

describe('investmentCommitteeReview — validateNarrativeResponse', () => {
  it('accepts valid bull/bear/risk schema', () => {
    const parsed = validateNarrativeResponse(JSON.parse(mockReviewJson));
    expect(parsed?.bullCaseJa).toHaveLength(3);
    expect(parsed?.bearCaseJa).toHaveLength(2);
    expect(parsed?.riskFactorsJa).toHaveLength(2);
  });

  it('rejects forbidden verdict keys', () => {
    expect(
      validateNarrativeResponse({
        bullCaseJa: ['a'],
        bearCaseJa: ['b'],
        riskFactorsJa: ['c'],
        verdict: 'adopt',
      }),
    ).toBeNull();
    expect(
      validateNarrativeResponse({
        bullCaseJa: ['a'],
        bearCaseJa: ['b'],
        riskFactorsJa: ['c'],
        buyAllowed: true,
      }),
    ).toBeNull();
    expect(
      validateNarrativeResponse({
        bullCaseJa: ['a'],
        bearCaseJa: ['b'],
        riskFactorsJa: ['c'],
        adoptionVerdict: 'hold',
      }),
    ).toBeNull();
    expect(
      validateNarrativeResponse({
        bullCaseJa: ['a'],
        bearCaseJa: ['b'],
        riskFactorsJa: ['c'],
        recommendationScore: 90,
      }),
    ).toBeNull();
    expect(
      validateNarrativeResponse({
        bullCaseJa: ['a'],
        bearCaseJa: ['b'],
        riskFactorsJa: ['c'],
        confidencePct: 80,
      }),
    ).toBeNull();
  });
});

describe('investmentCommitteeRedTeam — validateRedTeamResponse', () => {
  it('accepts counterArgumentsJa and redTeamScore', () => {
    const parsed = validateRedTeamResponse(JSON.parse(mockRedTeamJson));
    expect(parsed?.counterArgumentsJa).toHaveLength(2);
    expect(parsed?.redTeamScore).toBe(68);
  });

  it('rejects forbidden keys and extra keys', () => {
    expect(
      validateRedTeamResponse({
        counterArgumentsJa: ['a'],
        verdict: 'adopt',
      }),
    ).toBeNull();
    expect(
      validateRedTeamResponse({
        counterArgumentsJa: ['a'],
        bullCaseJa: ['b'],
      }),
    ).toBeNull();
    expect(
      validateRedTeamResponse({
        counterArgumentsJa: ['a'],
        recommendationScore: 90,
      }),
    ).toBeNull();
  });
});

describe('investmentCommitteeReview safety', () => {
  beforeEach(async () => {
    await clearCommitteeNarrativeCacheForTest();
    clearCommitteeNarrativeMemoryCacheForTest();
    await clearRedTeamCacheForTest();
    clearRedTeamMemoryCacheForTest();
    await AsyncStorage.clear();
    vi.clearAllMocks();
  });

  it('buildAllocationRecommendationMeta includes decisionHash and fallback review fields', () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '5347',
      rec: baseRec(),
      selectionReason: '配分',
      allocationPct: 20,
    });
    expect(meta.decisionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(meta.bullCaseJa.length).toBeGreaterThan(0);
    expect(meta.bearCaseJa.length).toBeGreaterThan(0);
    expect(meta.riskFactorsJa.length).toBeGreaterThan(0);
    expect(meta.counterArgumentsJa.length).toBeGreaterThan(0);
  });

  it('throws ERROR_DECISION_TAMPERED when verdict changes after enrichment', () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '5347',
      rec: baseRec(),
      selectionReason: '配分',
      allocationPct: 20,
    });
    const tampered = {
      ...meta,
      adoptionVerdict: meta.adoptionVerdict === 'adopt' ? ('reject' as const) : ('adopt' as const),
      buyAllowed: meta.adoptionVerdict === 'adopt' ? false : true,
    };
    expect(() => assertDecisionHashUnchanged('5347', meta, tampered)).toThrow(DecisionTamperedError);
    expect(() => assertLockedDecisionFieldsUnchanged('5347', meta, tampered)).toThrow(
      DecisionTamperedError,
    );
  });

  it('cache hit skips OpenAI fetch (apiCalled=false)', async () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '5347',
      rec: baseRec(),
      selectionReason: '配分',
      allocationPct: 20,
    });
    const cacheKey = buildCommitteeNarrativeCacheKey({
      symbol: '5347',
      lockedVerdict: meta.adoptionVerdict,
      recommendationScore: meta.recommendationScore,
      confidencePct: meta.confidencePct,
    });
    await setCommitteeNarrativeCache(cacheKey, {
      bullCaseJa: ['cached1', 'cached2', 'cached3'],
      bearCaseJa: ['cachedOpp1', 'cachedOpp2'],
      riskFactorsJa: ['cached risk'],
      generatedAt: new Date().toISOString(),
    });

    const fetchSpy = vi.fn();
    const result = await fetchCommitteeReview(
      {
        symbol: '5347',
        lockedVerdict: meta.adoptionVerdict,
        lockedVerdictLabelJa: meta.adoptionLabelJa,
        recommendationScore: meta.recommendationScore,
        confidencePct: meta.confidencePct,
        charterApprovalReasonsJa: meta.charterApprovalReasonsJa,
        charterOppositionReasonsJa: meta.charterOppositionReasonsJa,
        qualitySignalsSummaryJa: [],
      },
      { fetchImpl: fetchSpy as unknown as typeof fetch },
    );

    expect(result?.cacheStatus).toBe('hit');
    expect(result?.apiCalled).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('red team cache hit skips OpenAI fetch', async () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '5347',
      rec: baseRec(),
      selectionReason: '配分',
      allocationPct: 20,
    });
    const cacheKey = buildRedTeamCacheKey({
      symbol: '5347',
      lockedVerdict: meta.adoptionVerdict,
      recommendationScore: meta.recommendationScore,
      confidencePct: meta.confidencePct,
    });
    await setRedTeamCache(cacheKey, {
      counterArgumentsJa: ['cached red 1', 'cached red 2'],
      redTeamScore: 55,
      generatedAt: new Date().toISOString(),
    });

    const fetchSpy = vi.fn();
    const result = await fetchRedTeamReview(
      {
        symbol: '5347',
        lockedVerdict: meta.adoptionVerdict,
        lockedVerdictLabelJa: meta.adoptionLabelJa,
        recommendationScore: meta.recommendationScore,
        confidencePct: meta.confidencePct,
        charterApprovalReasonsJa: meta.charterApprovalReasonsJa,
        charterOppositionReasonsJa: meta.charterOppositionReasonsJa,
      },
      { fetchImpl: fetchSpy as unknown as typeof fetch },
    );

    expect(result?.cacheStatus).toBe('hit');
    expect(result?.apiCalled).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('enrichment preserves locked decision fields and applies red team counterArguments', async () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '5347',
      rec: baseRec(),
      selectionReason: '配分',
      allocationPct: 20,
    });
    const fetchImpl = mockOpenAiFetch();

    const first = await enrichRecommendationMeta('5347', meta, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      forceApi: true,
    });
    expect(first.audit.decisionHashBefore).toBe(meta.decisionHash);
    expect(first.audit.decisionHashAfter).toBe(meta.decisionHash);
    expect(first.audit.counterArgumentCount).toBeGreaterThan(0);
    expect(first.meta.adoptionVerdict).toBe(meta.adoptionVerdict);
    expect(first.meta.buyAllowed).toBe(meta.buyAllowed);
    expect(first.meta.recommendationScore).toBe(meta.recommendationScore);
    expect(first.meta.confidencePct).toBe(meta.confidencePct);
    expect(first.meta.bullCaseJa[0]).toContain('AI賛成');
    expect(first.meta.counterArgumentsJa[0]).toContain('RedTeam');
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const second = await enrichRecommendationMeta('5347', meta);
    expect(second.audit.narrativeCacheStatus).toBe('hit');
    expect(second.audit.redTeamCacheStatus).toBe('hit');
    expect(second.audit.decisionHashBefore).toBe(meta.decisionHash);
    expect(second.audit.decisionHashAfter).toBe(meta.decisionHash);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('counterArgumentsJa change does not affect decisionHash', () => {
    const meta = buildAllocationRecommendationMeta({
      symbol: '5347',
      rec: baseRec(),
      selectionReason: '配分',
      allocationPct: 20,
    });
    const withRedTeam = {
      ...meta,
      counterArgumentsJa: ['完全に異なる反証'],
      redTeamGeneratedAt: new Date().toISOString(),
    };
    expect(() => assertLockedDecisionFieldsUnchanged('5347', meta, withRedTeam)).not.toThrow();
    expect(withRedTeam.decisionHash).toBe(meta.decisionHash);
  });
});
