import {
  BETA_CLUSTER_CRITICAL_WEIGHT_PCT,
  BETA_CLUSTER_HIGH_WEIGHT_PCT,
  BETA_CLUSTER_TOLERANCE,
  BETA_CLUSTER_WATCH_WEIGHT_PCT,
  CORRELATION_REGIME_LABEL,
  CROSS_SECTOR_CORRELATION_BOOST,
  DOWNSIDE_CORRELATION_WEIGHT_PCT,
  SAME_SECTOR_CORRELATION_BOOST,
  STRESS_CORRELATION_THRESHOLD,
} from '../constants/crisisCorrelation';
import { getSamplePriceHistory } from '../data/sampleStocks';
import type {
  BetaCluster,
  CorrelationRegimeId,
  CrisisCorrelationReport,
  StressAdjustedCorrelationPair,
} from '../types/crisisCorrelation';
import type { CrossAssetFlowSnapshot } from '../types/crossAssetFlow';
import type { MarketIndicatorsSnapshot } from '../types/marketRegime';
import type { PortfolioPositionAnalysis } from '../types/portfolioConstruction';
import type { PriceBar } from '../types';
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function dailyReturns(bars: PriceBar[]): number[] {
  const rets: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i - 1].close > 0) {
      rets.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
    }
  }
  return rets;
}

export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 5) return 0;
  const ax = a.slice(-n);
  const bx = b.slice(-n);
  const meanA = ax.reduce((s, v) => s + v, 0) / n;
  const meanB = bx.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = ax[i] - meanA;
    const db = bx[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  if (denA <= 0 || denB <= 0) return 0;
  return clamp(num / Math.sqrt(denA * denB), -1, 1);
}

/** 下方日（両方マイナス）のみの相関 */
export function downsideCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  const downA: number[] = [];
  const downB: number[] = [];
  for (let i = Math.max(0, a.length - n); i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (ai < 0 && bi < 0) {
      downA.push(ai);
      downB.push(bi);
    }
  }
  if (downA.length < 4) return pearsonCorrelation(a, b);
  return pearsonCorrelation(downA, downB);
}

export function detectCorrelationRegime(
  indicators: MarketIndicatorsSnapshot,
  crossAsset?: CrossAssetFlowSnapshot,
): CorrelationRegimeId {
  const vix = crossAsset?.indicators.vixProxy ?? indicators.volatilityProxyPct;
  const liquidity = crossAsset?.liquidityRegime ?? 'neutral';
  const flow = crossAsset?.capitalFlow ?? 'neutral';

  if (
    (vix >= 32 || indicators.volatilityProxyPct >= 30) &&
    (liquidity === 'contraction' || flow === 'risk_off') &&
    indicators.breadthPctAboveMa50 < 42
  ) {
    return 'crisis';
  }
  if (vix >= 24 || indicators.volatilityProxyPct >= 24 || (crossAsset?.indicators.moveProxy ?? 0) >= 22) {
    return 'high_volatility';
  }
  return 'normal_market';
}

function stressAdjustedCorrelation(
  full: number,
  downside: number,
  regime: CorrelationRegimeId,
  crossSector: boolean,
): number {
  const w = DOWNSIDE_CORRELATION_WEIGHT_PCT / 100;
  let blended = full * (1 - w) + downside * w;
  const boost = crossSector
    ? CROSS_SECTOR_CORRELATION_BOOST[regime]
    : SAME_SECTOR_CORRELATION_BOOST[regime];
  if (blended >= 0) blended = Math.min(1, blended + boost);
  else blended = Math.min(1, Math.abs(blended) + boost * 0.5) * Math.sign(blended || 1);
  return Math.round(blended * 100) / 100;
}

function computeStressAdjustedPairs(
  positions: PortfolioPositionAnalysis[],
  regime: CorrelationRegimeId,
): StressAdjustedCorrelationPair[] {
  const symbols = positions.map((p) => p.symbol);
  const sectorBySymbol = new Map(
    positions.map((p) => [p.symbol, p.sector]),
  );
  const returnsCache = new Map<string, number[]>();
  for (const sym of symbols) {
    try {
      returnsCache.set(sym, dailyReturns(getSamplePriceHistory(sym)));
    } catch {
      returnsCache.set(sym, []);
    }
  }

  const threshold = STRESS_CORRELATION_THRESHOLD[regime];
  const pairs: StressAdjustedCorrelationPair[] = [];

  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const symbolA = symbols[i];
      const symbolB = symbols[j];
      const retsA = returnsCache.get(symbolA) ?? [];
      const retsB = returnsCache.get(symbolB) ?? [];
      const full = pearsonCorrelation(retsA, retsB);
      const downside = downsideCorrelation(retsA, retsB);
      const sectorA = sectorBySymbol.get(symbolA)!;
      const sectorB = sectorBySymbol.get(symbolB)!;
      const crossSector = sectorA !== sectorB;
      const stressAdjusted = stressAdjustedCorrelation(full, downside, regime, crossSector);
      if (Math.abs(stressAdjusted) >= threshold) {
        pairs.push({
          symbolA,
          symbolB,
          fullCorrelation: Math.round(full * 100) / 100,
          downsideCorrelation: Math.round(downside * 100) / 100,
          stressAdjustedCorrelation: stressAdjusted,
          crossSector,
        });
      }
    }
  }

  return pairs.sort(
    (x, y) => Math.abs(y.stressAdjustedCorrelation) - Math.abs(x.stressAdjustedCorrelation),
  );
}

function clusterSeverity(
  weightPct: number,
): BetaCluster['severity'] {
  if (weightPct >= BETA_CLUSTER_CRITICAL_WEIGHT_PCT) return 'critical';
  if (weightPct >= BETA_CLUSTER_HIGH_WEIGHT_PCT) return 'high';
  if (weightPct >= BETA_CLUSTER_WATCH_WEIGHT_PCT) return 'watch';
  return 'ok';
}

/** 隠れベータ・クラスター（類似β + 相関クラスター統合） */
export function computeBetaClusters(
  positions: PortfolioPositionAnalysis[],
  stressPairs: StressAdjustedCorrelationPair[],
): BetaCluster[] {
  if (positions.length === 0) return [];

  const parent = new Map<string, string>();
  const find = (s: string): string => {
    const p = parent.get(s) ?? s;
    if (p === s) return s;
    const root = find(p);
    parent.set(s, root);
    return root;
  };
  const union = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };

  for (const p of positions) parent.set(p.symbol, p.symbol);

  for (const pair of stressPairs) {
    if (pair.stressAdjustedCorrelation >= STRESS_CORRELATION_THRESHOLD.crisis - 0.05) {
      union(pair.symbolA, pair.symbolB);
    }
  }

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const bi = positions[i].betaProxy;
      const bj = positions[j].betaProxy;
      if (Math.abs(bi - bj) <= BETA_CLUSTER_TOLERANCE && bi >= 1.1) {
        union(positions[i].symbol, positions[j].symbol);
      }
    }
  }

  const groups = new Map<string, PortfolioPositionAnalysis[]>();
  for (const p of positions) {
    const root = find(p.symbol);
    const g = groups.get(root) ?? [];
    g.push(p);
    groups.set(root, g);
  }

  const clusters: BetaCluster[] = [];
  let idx = 0;
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const combinedWeightPct = members.reduce((s, m) => s + m.weightPct, 0);
    const avgBeta =
      Math.round(
        (members.reduce((s, m) => s + m.betaProxy, 0) / members.length) * 100,
      ) / 100;
    const hiddenRiskScore = Math.round(
      combinedWeightPct * avgBeta * (members.length / positions.length) * 10,
    );
    idx += 1;
    clusters.push({
      id: `B${idx}`,
      symbols: members.map((m) => m.symbol),
      avgBeta,
      combinedWeightPct: Math.round(combinedWeightPct * 10) / 10,
      hiddenRiskScore,
      severity: clusterSeverity(combinedWeightPct),
    });
  }

  return clusters.sort((a, b) => b.hiddenRiskScore - a.hiddenRiskScore);
}

export function analyzeCrisisCorrelation(
  positions: PortfolioPositionAnalysis[],
  indicators: MarketIndicatorsSnapshot,
  crossAsset?: CrossAssetFlowSnapshot,
): CrisisCorrelationReport {
  const regimeId = detectCorrelationRegime(indicators, crossAsset);
  const stressAdjustedPairs = computeStressAdjustedPairs(positions, regimeId);
  const betaClusters = computeBetaClusters(positions, stressAdjustedPairs);
  const clusterPenaltyScore = betaClusters.reduce((s, c) => {
    if (c.severity === 'critical') return s + 25;
    if (c.severity === 'high') return s + 14;
    if (c.severity === 'watch') return s + 6;
    return s;
  }, 0);

  const crossSectorBoostApplied = CROSS_SECTOR_CORRELATION_BOOST[regimeId];
  const summaryJa =
    regimeId === 'crisis'
      ? `危機相関モード: 異セクター相関+${(crossSectorBoostApplied * 100).toFixed(0)}%、下方相関${DOWNSIDE_CORRELATION_WEIGHT_PCT}%加重`
      : regimeId === 'high_volatility'
        ? `高ボラ: ストレス調整相関で分散効果が低下する可能性`
        : '通常相関レジーム: 標準的な相関閾値を適用';

  return {
    regimeId,
    regimeLabelJa: CORRELATION_REGIME_LABEL[regimeId],
    crossSectorBoostApplied,
    downsideWeightPct: DOWNSIDE_CORRELATION_WEIGHT_PCT,
    stressAdjustedPairs,
    betaClusters,
    effectiveCorrelationThreshold: STRESS_CORRELATION_THRESHOLD[regimeId],
    clusterPenaltyScore,
    summaryJa,
  };
}

/** ストレス調整相関に基づくクラスターID付与 */
export function assignStressCorrelationClusters(
  positions: PortfolioPositionAnalysis[],
  stressPairs: StressAdjustedCorrelationPair[],
  threshold: number,
): PortfolioPositionAnalysis[] {
  const parent = new Map<string, string>();
  const find = (s: string): string => {
    const p = parent.get(s) ?? s;
    if (p === s) return s;
    const root = find(p);
    parent.set(s, root);
    return root;
  };
  const union = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };
  for (const p of positions) parent.set(p.symbol, p.symbol);
  for (const pair of stressPairs) {
    if (pair.stressAdjustedCorrelation >= threshold) {
      union(pair.symbolA, pair.symbolB);
    }
  }
  const clusters = new Map<string, string>();
  let clusterNum = 0;
  for (const p of positions) {
    const root = find(p.symbol);
    if (!clusters.has(root)) {
      clusterNum += 1;
      clusters.set(root, `C${clusterNum}`);
    }
  }
  const inCluster = new Set<string>();
  for (const pair of stressPairs) {
    if (pair.stressAdjustedCorrelation >= threshold) {
      inCluster.add(pair.symbolA);
      inCluster.add(pair.symbolB);
    }
  }
  return positions.map((p) => ({
    ...p,
    correlationClusterId: inCluster.has(p.symbol) ? clusters.get(find(p.symbol)) : undefined,
  }));
}
