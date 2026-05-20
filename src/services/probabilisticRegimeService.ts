import { REGIME_TO_MIXTURE_BUCKET } from '../constants/governance';
import type { MarketRegimeId } from '../types/marketRegime';
import type { ProbabilisticRegimeMixture } from '../types/governance';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** レジームスコアを確率混合（risk-on / risk-off / 高ボラ / インフレ / 危機 / 遷移）に変換 */
export function computeProbabilisticRegimeMixture(params: {
  regimeId: MarketRegimeId;
  regimeScores: Partial<Record<MarketRegimeId, number>>;
  regimeConfidence: number;
  volatilityProxyPct: number;
  breadthPct: number;
}): ProbabilisticRegimeMixture {
  const scores = params.regimeScores as Record<string, number>;
  const entries = Object.entries(scores).filter(([, v]) => typeof v === 'number' && v > 0) as [
    MarketRegimeId,
    number,
  ][];
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;

  const buckets = {
    riskOn: 0,
    riskOff: 0,
    highVol: 0,
    inflation: 0,
    crisis: 0,
    transition: 0,
  };

  for (const [id, score] of entries) {
    const share = score / total;
    const tags = REGIME_TO_MIXTURE_BUCKET[id] ?? ['transition'];
    for (const tag of tags) {
      buckets[tag] += share / tags.length;
    }
  }

  const ranked = [...entries].sort((a, b) => b[1] - a[1]);
  const top = ranked[0]?.[1] ?? 0;
  const second = ranked[1]?.[1] ?? 0;
  const margin = top > 0 ? (top - second) / top : 0;
  buckets.transition += clamp((1 - margin) * 0.4, 0, 0.35);
  buckets.transition += clamp((100 - params.regimeConfidence) / 400, 0, 0.2);

  if (params.volatilityProxyPct >= 28 && params.breadthPct < 45) {
    buckets.crisis += 0.12;
  }
  if (params.volatilityProxyPct >= 32) {
    buckets.highVol += 0.08;
  }

  const sum =
    buckets.riskOn +
    buckets.riskOff +
    buckets.highVol +
    buckets.inflation +
    buckets.crisis +
    buckets.transition;
  const norm = sum > 0 ? 100 / sum : 100;

  const riskOnPct = Math.round(buckets.riskOn * norm * 10) / 10;
  const riskOffPct = Math.round(buckets.riskOff * norm * 10) / 10;
  const highVolPct = Math.round(buckets.highVol * norm * 10) / 10;
  const inflationPct = Math.round(buckets.inflation * norm * 10) / 10;
  const crisisPct = Math.round(buckets.crisis * norm * 10) / 10;
  const transitionPct = Math.round(buckets.transition * norm * 10) / 10;

  const dominant = Math.max(riskOnPct, riskOffPct, highVolPct, inflationPct, crisisPct);
  const noteJa =
    transitionPct >= 30
      ? `遷移局面 ${transitionPct}% — レジーム不確実性が高い`
      : `支配的状態 ${dominant.toFixed(0)}%帯 — 信頼度 ${params.regimeConfidence}%`;

  return {
    riskOnPct,
    riskOffPct,
    highVolPct,
    inflationPct,
    crisisPct,
    transitionPct,
    noteJa,
  };
}
