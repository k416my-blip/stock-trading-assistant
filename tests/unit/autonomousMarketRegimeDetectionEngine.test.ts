import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BUDGET_CALM,
  BUDGET_VOLATILE,
  CONFIDENCE_CAP_CALM,
  CONFIDENCE_CAP_CRISIS,
  CONFIDENCE_CAP_VOLATILE,
} from '../../src/constants/autonomousMarketRegimeDetection';
import {
  classifyMarketRegime,
  computeRegimeMetrics,
  buildAutonomousMarketRegimeDetectionBundle,
} from '../../src/services/autonomousMarketRegimeDetectionEngine';
import { buildRegimeAdaptation } from '../../src/services/autonomousMarketRegimeAdaptationEngine';
import type { BuildMarketRegimeInput } from '../../src/types/autonomousMarketRegimeDetection';

vi.mock('../../src/services/autonomousMarketRegimeDetectionStorage', () => ({
  loadMarketRegimeState: vi.fn(async () => ({
    version: 1 as const,
    lastRegime: 'SIDEWAYS' as const,
    lastOrchestrationBudgetMax: 85,
    regimeTimeline: [],
    adaptationCooldownUntil: null,
  })),
  saveMarketRegimeState: vi.fn(async () => {}),
  appendRegimeTimelinePoint: vi.fn(async () => {}),
}));

function baseInput(overrides: Partial<BuildMarketRegimeInput> = {}): BuildMarketRegimeInput {
  return {
    macro: {
      generatedAt: new Date().toISOString(),
      regimeId: 'bullish',
      regimeLabelJa: '上昇',
      regimeSummaryJa: 'test',
      regimeConfidencePct: 55,
      insufficientData: false,
      dataGapsJa: [],
      indices: [],
      sectors: [],
      vix: {
        id: 'vix',
        labelJa: 'VIX',
        yahooSymbol: '^VIX',
        value: 20,
        changePct: 0,
        unitJa: 'pt',
        fromLive: false,
      },
      forex: [],
      rates: [],
      correlations: [
        { pairLabelJa: 'US-JP', correlationHintJa: 'moderate', strength: 'moderate' },
      ],
      marketScores: {
        fearScore: 50,
        marketRiskScore: 50,
        momentumScore: 70,
        liquidityScore: 70,
      },
      marketWideFactorsJa: [],
      individualVsMarketNoteJa: 'test',
      macroContextBulletsJa: [],
      sourceNoteJa: 'test',
    },
    governance: null,
    stability: null,
    systemic: null,
    recovery: null,
    orchestration: null,
    reflection: null,
    epistemic: null,
    strategy: null,
    finalDecision: 'hold',
    ...overrides,
  };
}

describe('autonomousMarketRegimeDetectionEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('classifies calm → volatile → panic from mock volatility (classification only)', () => {
    const calm = computeRegimeMetrics(baseInput({ mockVolatilityPct: 25 }));
    expect(
      classifyMarketRegime(
        calm,
        baseInput({
          macro: { ...baseInput().macro!, regimeId: 'bullish', marketScores: { fearScore: 25, marketRiskScore: 30, momentumScore: 60, liquidityScore: 75 } },
        }),
      ),
    ).toBe('CALM_BULL');

    const volatile = computeRegimeMetrics(baseInput({ mockVolatilityPct: 62 }));
    const volatileRegime = classifyMarketRegime(
      volatile,
      baseInput({
        macro: {
          ...baseInput().macro!,
          regimeId: 'bullish',
          marketScores: { fearScore: 62, marketRiskScore: 60, momentumScore: 58, liquidityScore: 55 },
        },
      }),
    );
    expect(['VOLATILE_BULL', 'VOLATILE_BEAR', 'SIDEWAYS']).toContain(volatileRegime);

    const panicInput = baseInput({
      mockVolatilityPct: 95,
      macro: {
        ...baseInput().macro!,
        regimeId: 'panic',
        vix: {
          id: 'vix',
          labelJa: 'VIX',
          yahooSymbol: '^VIX',
          value: 40,
          changePct: 12,
          unitJa: 'pt',
          fromLive: false,
        },
        marketScores: { fearScore: 95, marketRiskScore: 92, momentumScore: 25, liquidityScore: 15 },
      },
      reflection: { contradictionTrendPct: 40 } as BuildMarketRegimeInput['reflection'],
    });
    const panicMetrics = computeRegimeMetrics(panicInput);
    expect(panicMetrics.panicRiskPct).toBeGreaterThan(70);
    expect(classifyMarketRegime(panicMetrics, panicInput)).toBe('PANIC');
  });

  it('PANIC adaptation clamps confidence and uses governance-only budget', () => {
    const metrics = computeRegimeMetrics(baseInput({ mockVolatilityPct: 90 }));
    const adaptation = buildRegimeAdaptation('PANIC', metrics, baseInput());
    expect(adaptation.confidenceClampPct).toBe(CONFIDENCE_CAP_CRISIS);
    expect(adaptation.panicOnlyLayers).toBe(true);
    expect(adaptation.orchestrationBudgetMax).toBe(BUDGET_VOLATILE);
  });

  it('CALM adaptation uses calm confidence cap and budget 95', () => {
    const metrics = computeRegimeMetrics(baseInput({ mockVolatilityPct: 20 }));
    const adaptation = buildRegimeAdaptation('CALM_BULL', metrics, baseInput());
    expect(adaptation.confidenceClampPct).toBe(CONFIDENCE_CAP_CALM);
    expect(adaptation.orchestrationBudgetMax).toBe(BUDGET_CALM);
  });

  it('volatile adaptation clamps to 55', () => {
    const metrics = computeRegimeMetrics(baseInput({ mockVolatilityPct: 60 }));
    const adaptation = buildRegimeAdaptation('VOLATILE_BEAR', metrics, baseInput());
    expect(adaptation.confidenceClampPct).toBe(CONFIDENCE_CAP_VOLATILE);
    expect(adaptation.orchestrationBudgetMax).toBe(BUDGET_VOLATILE);
  });

  it('unsupported environment when uncertainty high', async () => {
    const bundle = await buildAutonomousMarketRegimeDetectionBundle(
      baseInput({
        macro: {
          ...baseInput().macro!,
          insufficientData: true,
          dataGapsJa: ['gap1', 'gap2', 'gap3', 'gap4', 'gap5', 'gap6'],
        },
      }),
    );
    expect(bundle.currentRegime).toBe('UNSUPPORTED_ENVIRONMENT');
    expect(bundle.explanationOnlyMode).toBe(true);
    expect(bundle.realTradingEnabled).toBe(false);
  });

  it('bundle keeps realTradingEnabled false', async () => {
    const bundle = await buildAutonomousMarketRegimeDetectionBundle(baseInput());
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.paperTradingOnly).toBe(true);
    expect(bundle.featureStatuses.length).toBeGreaterThanOrEqual(25);
  });
});
