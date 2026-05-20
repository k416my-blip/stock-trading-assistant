import {
  MARKET_REGIME_LABEL,
  REGIME_RISK_MULTIPLIER,
  REGIME_SECTOR_GUIDANCE,
} from '../constants/marketRegime';
import type { MarketIndicatorsSnapshot, MarketRegimeId, MarketRegimeResult } from '../types/marketRegime';
import { buildMarketIndicatorsSnapshot } from './marketIndicators';

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function normHigh(v: number, low: number, high: number): number {
  if (high <= low) return 50;
  return clamp(((v - low) / (high - low)) * 100);
}

function normLow(v: number, low: number, high: number): number {
  return 100 - normHigh(v, low, high);
}

type RegimeScorer = (ind: MarketIndicatorsSnapshot) => number;

const REGIME_SCORERS: Record<MarketRegimeId, RegimeScorer> = {
  risk_on: (ind) =>
    normHigh(ind.indexMomentumPct, -5, 12) * 0.35 +
    normLow(ind.volatilityProxyPct, 12, 28) * 0.25 +
    normHigh(ind.breadthPctAboveMa50, 35, 70) * 0.25 +
    normHigh(ind.maTrendScore, 35, 65) * 0.15,

  risk_off: (ind) =>
    normLow(ind.indexMomentumPct, -8, 5) * 0.35 +
    normHigh(ind.volatilityProxyPct, 18, 35) * 0.3 +
    normLow(ind.breadthPctAboveMa50, 25, 55) * 0.2 +
    normHigh(ind.defensiveVsGrowthSpread, 0, 8) * 0.15,

  inflation_fear: (ind) =>
    normHigh(ind.oilTrendPct, -3, 10) * 0.35 +
    normHigh(ind.ratePressureProxy, 55, 80) * 0.3 +
    normHigh(ind.usdStrengthProxy, 0, 0.6) * 0.15 +
    normLow(ind.indexMomentumPct, -5, 8) * 0.2,

  recession_fear: (ind) =>
    normLow(ind.indexMomentumPct, -10, 3) * 0.3 +
    normHigh(ind.defensiveVsGrowthSpread, 2, 12) * 0.3 +
    normLow(ind.breadthPctAboveMa50, 20, 50) * 0.25 +
    normHigh(ind.volatilityProxyPct, 20, 32) * 0.15,

  liquidity_bull: (ind) =>
    normHigh(ind.liquidityProxy, 45, 75) * 0.4 +
    normHigh(ind.indexMomentumPct, 0, 10) * 0.35 +
    normLow(ind.ratePressureProxy, 40, 65) * 0.25,

  tightening_bear: (ind) =>
    normHigh(ind.ratePressureProxy, 58, 85) * 0.4 +
    normLow(ind.indexMomentumPct, -5, 6) * 0.25 +
    normLow(ind.sectorRotationScore, -5, 5) * 0.2 +
    normHigh(ind.volatilityProxyPct, 16, 26) * 0.15,

  recovery_phase: (ind) =>
    normHigh(ind.indexMomentumPct, -2, 8) * 0.3 +
    normHigh(ind.breadthPctAboveMa50, 40, 62) * 0.3 +
    normHigh(ind.maTrendScore, 45, 60) * 0.2 +
    normLow(ind.volatilityProxyPct, 14, 24) * 0.2,

  high_volatility: (ind) =>
    normHigh(ind.volatilityProxyPct, 22, 40) * 0.5 +
    normLow(ind.breadthPctAboveMa50, 30, 55) * 0.25 +
    normHigh(Math.abs(ind.sectorRotationScore), 3, 12) * 0.25,
};

function computeRiskScore(regimeId: MarketRegimeId, ind: MarketIndicatorsSnapshot): number {
  const base = 100 - (REGIME_RISK_MULTIPLIER[regimeId] ?? 0.8) * 50;
  const volAdj = normHigh(ind.volatilityProxyPct, 12, 35) * 0.35;
  const momAdj = normLow(ind.indexMomentumPct, -8, 8) * 0.25;
  return clamp(base * 0.4 + volAdj * 0.35 + momAdj * 0.25);
}

/** 決定論的スコアで現在のマーケットレジームを分類 */
export function evaluateMarketRegime(
  indicators?: MarketIndicatorsSnapshot,
): MarketRegimeResult {
  const ind = indicators ?? buildMarketIndicatorsSnapshot();

  const regimeScores = {} as Record<MarketRegimeId, number>;
  for (const id of Object.keys(REGIME_SCORERS) as MarketRegimeId[]) {
    regimeScores[id] = clamp(REGIME_SCORERS[id](ind));
  }

  const ranked = (Object.entries(regimeScores) as [MarketRegimeId, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  const [topId, topScore] = ranked[0];
  const secondScore = ranked[1]?.[1] ?? 0;
  const confidenceScore = clamp(topScore * 0.7 + Math.max(0, topScore - secondScore) * 0.6);

  const guidance = REGIME_SECTOR_GUIDANCE[topId];

  return {
    regimeId: topId,
    labelJa: MARKET_REGIME_LABEL[topId],
    confidenceScore,
    riskScore: computeRiskScore(topId, ind),
    preferredSectors: guidance.preferred,
    avoidSectors: guidance.avoid,
    summaryJa: guidance.summaryJa,
    indicators: ind,
    regimeScores,
  };
}
