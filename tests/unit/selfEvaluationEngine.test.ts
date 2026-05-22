import { describe, expect, it } from 'vitest';
import { buildSelfEvaluationBundle } from '../../src/services/selfEvaluationEngine';
import { defaultSelfEvaluationState } from '../../src/services/selfEvaluationStorage';
import type { TrackedAiRecommendation } from '../../src/types/portfolioRealityValidation';
import type { BuildSelfEvaluationInput } from '../../src/types/selfEvaluation';

function rec(
  overrides: Partial<TrackedAiRecommendation> = {},
): TrackedAiRecommendation {
  return {
    id: 'r1',
    createdAt: new Date().toISOString(),
    symbol: '1155',
    market: 'bursa',
    action: 'buy',
    confidencePct: 80,
    calibratedConfidencePct: 75,
    baselinePrice: 10,
    whyJa: 'テクニカル上昇トレンド継続。出来高増加を確認。',
    regimeId: 'bullish',
    status: 'failed',
    horizon: '1w',
    resolvedAt: new Date().toISOString(),
    returnPct: -3.2,
    benchmarkId: 'klci',
    benchmarkReturnPct: 0.5,
    benchmarkDeltaPct: -3.7,
    thinReasonFlag: false,
    humanReviewOnly: false,
    failureNoteJa: null,
    ...overrides,
  };
}

function baseInput(
  recommendations: TrackedAiRecommendation[],
  overrides: Partial<BuildSelfEvaluationInput> = {},
): BuildSelfEvaluationInput {
  return {
    regimeId: 'sideways',
    marketRiskScore: 55,
    fearScore: 40,
    momentumScore: 45,
    volatilityPctEstimate: 14,
    globalFactorsJa: ['金利は横ばい'],
    macroBulletsJa: ['中国景気の減速懸念'],
    realityBundle: null,
    strategyBundle: null,
    executionTrustScore: null,
    recommendations,
    ...overrides,
  };
}

describe('selfEvaluationEngine', () => {
  it('applies confidence calibration penalty after high-confidence misses', () => {
    const recommendations = [
      rec({ id: 'a', confidencePct: 85, status: 'failed' }),
      rec({ id: 'b', confidencePct: 88, status: 'failed', resolvedAt: new Date().toISOString() }),
    ];
    let state = defaultSelfEvaluationState();
    state.highConfidenceMissStreak = 2;
    const { bundle, state: next } = buildSelfEvaluationBundle(
      state,
      baseInput(recommendations),
    );
    expect(bundle.calibration.penaltyPct).toBeGreaterThan(0);
    expect(next.confidencePenaltyPct).toBeGreaterThan(0);
    expect(bundle.adaptiveConfidencePct).toBeLessThan(70);
  });

  it('detects overtrading bias', () => {
    const now = Date.now();
    const recommendations = Array.from({ length: 8 }, (_, i) =>
      rec({
        id: `t${i}`,
        createdAt: new Date(now - i * 60 * 60 * 1000).toISOString(),
        action: i % 2 === 0 ? 'buy' : 'reduce',
      }),
    );
    const { bundle } = buildSelfEvaluationBundle(
      defaultSelfEvaluationState(),
      baseInput(recommendations),
    );
    expect(bundle.biases.some((b) => b.kind === 'overtrading')).toBe(true);
  });

  it('flags hallucination risk for thin reasons', () => {
    const recommendations = [
      rec({ thinReasonFlag: true, whyJa: 'x', status: 'active' }),
      rec({ id: 't2', thinReasonFlag: true, whyJa: 'y', status: 'active' }),
      rec({ id: 't3', thinReasonFlag: true, whyJa: 'z', status: 'active' }),
    ];
    const { bundle } = buildSelfEvaluationBundle(
      defaultSelfEvaluationState(),
      baseInput(recommendations),
    );
    expect(bundle.hallucination.riskScore).toBeGreaterThanOrEqual(40);
    expect(bundle.hallucination.thinReasonCount).toBeGreaterThanOrEqual(3);
  });

  it('enables humility mode when trust is low', () => {
    const recommendations = Array.from({ length: 6 }, (_, i) =>
      rec({
        id: `f${i}`,
        status: 'failed',
        confidencePct: 75,
        returnPct: -5,
      }),
    );
    const { bundle } = buildSelfEvaluationBundle(
      defaultSelfEvaluationState(),
      baseInput(recommendations, { regimeId: 'panic', fearScore: 80 }),
    );
    expect(bundle.humilityMode).toBe(true);
    expect(bundle.humilityMessageJa).toContain('分からない');
  });

  it('adjusts dynamic alert threshold with volatility', () => {
    const low = buildSelfEvaluationBundle(
      defaultSelfEvaluationState(),
      baseInput([], { volatilityPctEstimate: 8 }),
    ).bundle.dynamicAlertThresholdPct;
    const high = buildSelfEvaluationBundle(
      defaultSelfEvaluationState(),
      baseInput([], { volatilityPctEstimate: 35 }),
    ).bundle.dynamicAlertThresholdPct;
    expect(high).toBeGreaterThan(low);
  });

  it('detects narrative drift for new themes', () => {
    const { bundle } = buildSelfEvaluationBundle(
      {
        ...defaultSelfEvaluationState(),
        lastNarrativeThemes: ['rates'],
      },
      baseInput([], {
        globalFactorsJa: ['AI半導体が市場を牽引'],
        macroBulletsJa: ['エネルギー価格上昇'],
      }),
    );
    const aiTheme = bundle.narrativeDrift.find((n) => n.themeId === 'ai');
    expect(aiTheme?.active).toBe(true);
    expect(aiTheme?.driftNoteJa).toContain('新規');
  });
});
