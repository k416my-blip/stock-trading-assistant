import { RECOMMENDATION_WEIGHTS } from '../constants/recommendation';
import type { AiLearningState } from './analysis/aiLearning';
import { loadAdaptiveLearningState } from './adaptiveExecutionStorage';
import { evaluateMarketRegime } from './marketRegimeEngine';
import type { InstitutionalRiskInput } from '../types/institutionalRisk';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { ModelStabilityInput, ModelStabilityReport } from '../types/modelStability';
import {
  appendWeightSnapshot,
  loadModelStabilityState,
  peekModelStabilityState,
  setControlMode,
  updateRegimeMemory,
} from './modelStabilityStorage';
import {
  buildModelStabilityReport,
  shouldCaptureSnapshot,
  shouldEnterQuarantine,
} from './modelStabilityEngine';

export function runModelStabilityAnalysis(params: {
  aiLearning: AiLearningState;
  regime: MarketRegimeResult;
  liveReturnEwmaPct?: number;
  shadowReturnEwmaPct?: number;
  useCachedState?: boolean;
}): ModelStabilityReport {
  return buildModelStabilityReport({
    aiLearning: params.aiLearning,
    adaptiveLearning: null,
    baselineWeights: { ...RECOMMENDATION_WEIGHTS },
    regime: params.regime,
    controlState: params.useCachedState !== false ? peekModelStabilityState() : undefined,
    liveReturnEwmaPct: params.liveReturnEwmaPct,
    shadowReturnEwmaPct: params.shadowReturnEwmaPct,
  });
}

export async function refreshModelStabilityAnalysis(params: {
  aiLearning: AiLearningState;
  regime: MarketRegimeResult;
  liveReturnEwmaPct?: number;
  shadowReturnEwmaPct?: number;
}): Promise<ModelStabilityReport> {
  const [controlState, adaptiveLearning] = await Promise.all([
    loadModelStabilityState(),
    loadAdaptiveLearningState(),
  ]);
  await updateRegimeMemory(params.regime.regimeId);

  const shadow =
    params.shadowReturnEwmaPct ?? adaptiveLearning.shadowReturnEwmaPct ?? undefined;

  let report = buildModelStabilityReport({
    aiLearning: params.aiLearning,
    adaptiveLearning,
    baselineWeights: { ...RECOMMENDATION_WEIGHTS },
    regime: params.regime,
    controlState,
    liveReturnEwmaPct: params.liveReturnEwmaPct,
    shadowReturnEwmaPct: shadow,
  });

  if (shouldEnterQuarantine(report) && report.controlMode === 'normal') {
    await setControlMode('quarantine');
    const refreshed = await loadModelStabilityState();
    report = buildModelStabilityReport({
      aiLearning: params.aiLearning,
      adaptiveLearning,
      baselineWeights: { ...RECOMMENDATION_WEIGHTS },
      regime: params.regime,
      controlState: refreshed,
      liveReturnEwmaPct: params.liveReturnEwmaPct,
      shadowReturnEwmaPct: shadow,
    });
  }

  if (shouldCaptureSnapshot(report)) {
    await appendWeightSnapshot({
      weights: params.aiLearning.weights,
      stabilityScore: report.stabilityScore.score,
    });
  }

  return report;
}

export function enrichInstitutionalRiskWithModelStability(
  input: InstitutionalRiskInput,
  params: { aiLearning: AiLearningState; liveReturnEwmaPct?: number },
): InstitutionalRiskInput {
  const report = runModelStabilityAnalysis({
    aiLearning: params.aiLearning,
    regime: input.regime,
    liveReturnEwmaPct: params.liveReturnEwmaPct,
  });
  return { ...input, modelStability: report };
}

export function runDemoModelStability(): ModelStabilityReport {
  const drifted: AiLearningState = {
    weights: {
      technical: 0.38,
      fundamental: 0.12,
      news: 0.18,
      earnings: 0.12,
      sns: 0.12,
      risk: 0.08,
    },
    outcomes: Array.from({ length: 12 }, (_, i) => ({
      id: `demo-${i}`,
      symbol: '1155',
      market: 'bursa' as const,
      recommendedAt: new Date(Date.now() - (i + 20) * MS_DAY).toISOString(),
      totalScore: 72 + (i % 3) * 5,
      priceAtRecommendation: 10,
      factorScores: {
        technical: 80,
        fundamental: 60,
        news: 50,
        earnings: 55,
        sns: 45,
        risk: 40,
      },
      evaluated: true,
      actualReturnPct: i < 8 ? 2.5 : -3.2,
    })),
    lastUpdatedAt: new Date().toISOString(),
  };
  return buildModelStabilityReport({
    aiLearning: drifted,
    adaptiveLearning: {
      version: 1,
      updatedAt: new Date().toISOString(),
      ewmaSlippageBps: 14,
      ewmaFillRate: 0.82,
      ewmaImplementationShortfallBps: 11,
      ewmaSignalHitRate: 0.55,
      fillSampleCount: 40,
      shadowReturnEwmaPct: 1.8,
      regimeTransitionMatrix: {},
      reinforcementWeights: { timing: 1.4, sliceAggression: 0.6, volTarget: 1.1 },
    },
    baselineWeights: { ...RECOMMENDATION_WEIGHTS },
    regime: evaluateMarketRegime(),
    liveReturnEwmaPct: -2.1,
    shadowReturnEwmaPct: 1.8,
    controlState: {
      version: 1,
      updatedAt: new Date().toISOString(),
      controlMode: 'normal',
      snapshots: [],
      weightHistory: [
        {
          capturedAt: new Date(Date.now() - MS_DAY).toISOString(),
          weights: { ...RECOMMENDATION_WEIGHTS },
        },
        {
          capturedAt: new Date().toISOString(),
          weights: drifted.weights,
        },
      ],
      mutationsLast24h: 5,
      governedLearningRate: 0.12,
      lastRegimeId: 'risk_on',
      regimeEnteredAt: new Date(Date.now() - 50 * MS_DAY).toISOString(),
    },
  });
}

const MS_DAY = 86400000;
