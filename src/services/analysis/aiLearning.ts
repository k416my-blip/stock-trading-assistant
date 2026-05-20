import AsyncStorage from '@react-native-async-storage/async-storage';
import { RECOMMENDATION_WEIGHTS } from '../../constants/recommendation';
import { MAX_WEIGHT_DELTA_PER_UPDATE } from '../../constants/modelStability';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { Market } from '../../types';
import { buildModelStabilityReport } from '../modelStabilityEngine';
import {
  peekModelStabilityState,
  recordWeightMutation,
} from '../modelStabilityStorage';
import { evaluateMarketRegime } from '../marketRegimeEngine';

export type ScoreWeights = {
  technical: number;
  fundamental: number;
  news: number;
  earnings: number;
  sns: number;
  risk: number;
};

export interface RecommendationOutcome {
  id: string;
  symbol: string;
  market: Market;
  recommendedAt: string;
  totalScore: number;
  priceAtRecommendation: number;
  /** 各因子スコア（学習用） */
  factorScores: {
    technical: number;
    fundamental: number;
    news: number;
    earnings: number;
    sns: number;
    risk: number;
  };
  priceAfterDays?: number;
  actualReturnPct?: number;
  evaluated: boolean;
}

export interface AiLearningState {
  weights: ScoreWeights;
  outcomes: RecommendationOutcome[];
  lastUpdatedAt: string;
}

const MAX_OUTCOMES = 200;
const EVAL_DAYS = 14;

export function createDefaultAiLearningState(): AiLearningState {
  return {
    weights: { ...RECOMMENDATION_WEIGHTS },
    outcomes: [],
    lastUpdatedAt: new Date().toISOString(),
  };
}

function defaultState(): AiLearningState {
  return createDefaultAiLearningState();
}

export async function resetAiLearningStorage(): Promise<AiLearningState> {
  const fresh = createDefaultAiLearningState();
  await saveAiLearningState(fresh);
  return fresh;
}

export async function loadAiLearningState(): Promise<AiLearningState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.aiLearning);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AiLearningState;
    return {
      weights: { ...RECOMMENDATION_WEIGHTS, ...parsed.weights },
      outcomes: Array.isArray(parsed.outcomes) ? parsed.outcomes : [],
      lastUpdatedAt: parsed.lastUpdatedAt ?? new Date().toISOString(),
    };
  } catch {
    return defaultState();
  }
}

async function saveAiLearningState(state: AiLearningState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.aiLearning, JSON.stringify(state));
}

export function getActiveWeights(state: AiLearningState): ScoreWeights {
  const w = state.weights;
  const sum =
    w.technical + w.fundamental + w.news + w.earnings + w.sns + w.risk || 1;
  return {
    technical: w.technical / sum,
    fundamental: w.fundamental / sum,
    news: w.news / sum,
    earnings: w.earnings / sum,
    sns: w.sns / sum,
    risk: w.risk / sum,
  };
}

export async function recordRecommendationOutcome(
  entry: Omit<RecommendationOutcome, 'id' | 'evaluated'>,
): Promise<void> {
  const state = await loadAiLearningState();
  const item: RecommendationOutcome = {
    ...entry,
    id: `${entry.symbol}-${entry.recommendedAt}`,
    evaluated: false,
  };
  state.outcomes = [item, ...state.outcomes.filter((o) => o.id !== item.id)].slice(0, MAX_OUTCOMES);
  state.lastUpdatedAt = new Date().toISOString();
  await saveAiLearningState(state);
}

/** 過去の推奨とその後の価格を比較し、重みをわずかに調整（端末内のみ） */
export async function evaluateOutcomesAndAdjustWeights(
  getPrice: (symbol: string, market: Market) => number | undefined,
): Promise<AiLearningState> {
  const state = await loadAiLearningState();
  const stability = buildModelStabilityReport({
    aiLearning: state,
    baselineWeights: { ...RECOMMENDATION_WEIGHTS },
    regime: evaluateMarketRegime(),
    controlState: peekModelStabilityState(),
  });
  if (stability.learningQuarantine.mutationsBlocked) {
    return state;
  }

  const now = Date.now();
  let adjusted = false;
  const governedRate = stability.learningRateGovernor.governedRate;

  const outcomes = state.outcomes.map((o) => {
    if (o.evaluated) return o;
    const ageDays = (now - new Date(o.recommendedAt).getTime()) / 86400000;
    if (ageDays < EVAL_DAYS) return o;

    const current = getPrice(o.symbol, o.market);
    if (current == null || o.priceAtRecommendation <= 0) return { ...o, evaluated: true };

    const actualReturnPct = ((current - o.priceAtRecommendation) / o.priceAtRecommendation) * 100;
    return { ...o, evaluated: true, priceAfterDays: current, actualReturnPct };
  });

  const evaluated = outcomes.filter((o) => o.evaluated && o.actualReturnPct != null);
  if (evaluated.length >= 5) {
    const deltas = { technical: 0, fundamental: 0, news: 0, earnings: 0, sns: 0, risk: 0 };
    for (const o of evaluated.slice(0, 30)) {
      const ret = o.actualReturnPct ?? 0;
      const sign = ret > 0 ? 1 : ret < 0 ? -1 : 0;
      if (sign === 0) continue;
      const scale = governedRate / 0.12;
      deltas.technical += sign * (o.factorScores.technical / 100 - 0.5) * 0.002 * scale;
      deltas.fundamental += sign * (o.factorScores.fundamental / 100 - 0.5) * 0.002 * scale;
      deltas.news += sign * (o.factorScores.news / 100 - 0.5) * 0.0015 * scale;
      deltas.earnings += sign * (o.factorScores.earnings / 100 - 0.5) * 0.0015 * scale;
      deltas.sns += sign * (o.factorScores.sns / 100 - 0.5) * 0.001 * scale;
      deltas.risk += sign * (o.factorScores.risk / 100 - 0.5) * 0.001 * scale;
    }
    const w = { ...state.weights };
    const cap = MAX_WEIGHT_DELTA_PER_UPDATE;
    w.technical = clampWeight(w.technical + clampDelta(deltas.technical, cap));
    w.fundamental = clampWeight(w.fundamental + clampDelta(deltas.fundamental, cap));
    w.news = clampWeight(w.news + clampDelta(deltas.news, cap));
    w.earnings = clampWeight(w.earnings + clampDelta(deltas.earnings, cap));
    w.sns = clampWeight(w.sns + clampDelta(deltas.sns, cap));
    w.risk = clampWeight(w.risk + clampDelta(deltas.risk, cap));
    state.weights = normalizeWeights(w);
    adjusted = true;
  }

  state.outcomes = outcomes;
  if (adjusted) {
    state.lastUpdatedAt = new Date().toISOString();
    await recordWeightMutation();
  }
  await saveAiLearningState(state);
  return state;
}

function clampWeight(v: number): number {
  return Math.max(0.05, Math.min(0.45, v));
}

function clampDelta(v: number, cap: number): number {
  return Math.max(-cap, Math.min(cap, v));
}

function normalizeWeights(w: ScoreWeights): ScoreWeights {
  const sum = w.technical + w.fundamental + w.news + w.earnings + w.sns + w.risk;
  return {
    technical: w.technical / sum,
    fundamental: w.fundamental / sum,
    news: w.news / sum,
    earnings: w.earnings / sum,
    sns: w.sns / sum,
    risk: w.risk / sum,
  };
}

export function formatAiLearningNote(state: AiLearningState): string {
  const n = state.outcomes.filter((o) => o.evaluated).length;
  if (n === 0) {
    return '端末内で推奨結果を記録し、あとから重みを少し調整します（予測の保証ではありません）。';
  }
  return `端末内の過去${n}件の推奨を参考に、スコアの重みをわずかに調整しています（予測の保証ではありません）。`;
}
