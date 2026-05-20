import { ENSEMBLE_ALLOCATOR_LABEL } from '../constants/metaAllocation';
import { REGIME_RISK_MULTIPLIER } from '../constants/marketRegime';
import type { MarketRegimeId } from '../types/marketRegime';
import type { AllocationExplanation, SymbolWeightExplanation, WeightContributionFactor } from '../types/governance';
import type { EnsembleAllocatorId, MetaAllocationReport } from '../types/metaAllocation';
import { projectWeights } from './blackLittermanService';
import { applyTurnoverConstrainedRebalance } from './portfolioOptimizationEngine';

const FACTOR_LABEL: Record<WeightContributionFactor['factorId'], string> = {
  black_litterman: 'Black-Litterman',
  risk_parity: 'リスクパリティ',
  cvar: 'CVaR',
  min_variance: '最小分散',
  stability_penalty: '安定性ペナルティ',
  liquidity_cap: '流動性上限',
  regime_adjustment: 'レジーム調整',
  turnover_constraint: 'ターンオーバー制約',
  fail_safe_adjustment: 'フェイルセーフ',
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function applyLiquidityCaps(w: number[], maxW: number[]): number[] {
  return projectWeights(w, maxW);
}

function applyRegimeScale(w: number[], regimeId: MarketRegimeId): number[] {
  const mult = clamp(REGIME_RISK_MULTIPLIER[regimeId] ?? 1, 0.35, 1.05);
  const scaled = w.map((wi) => wi * mult);
  const sum = scaled.reduce((s, v) => s + v, 0);
  return sum > 0 ? scaled.map((v) => v / sum) : w;
}

function factorContrib(
  factorId: WeightContributionFactor['factorId'],
  before: number[],
  after: number[],
  symbolIdx: number,
): WeightContributionFactor {
  const delta = (after[symbolIdx] - before[symbolIdx]) * 100;
  return {
    factorId,
    labelJa: FACTOR_LABEL[factorId],
    contributionPct: Math.round(delta * 10) / 10,
  };
}

/** 「なぜこの配分？」— 各要因の寄与を分解 */
export function buildAllocationExplanation(params: {
  meta: MetaAllocationReport;
  symbols: string[];
  markets: import('../types').Market[];
  maxW: number[];
  currentWeightsPct: Map<string, number>;
  regimeId: MarketRegimeId;
}): AllocationExplanation {
  const { meta, symbols, markets, maxW, currentWeightsPct, regimeId } = params;
  const n = symbols.length;

  const posteriors = new Map(
    meta.bayesianModelAveraging.posteriorWeights.map((p) => [p.allocatorId, p.posterior / 100]),
  );

  const engineBlend = new Array(n).fill(0);
  const engineOnly: Record<EnsembleAllocatorId, number[]> = {
    black_litterman: new Array(n).fill(0),
    risk_parity: new Array(n).fill(0),
    cvar: new Array(n).fill(0),
    min_variance: new Array(n).fill(0),
    stability_penalized: new Array(n).fill(0),
  };

  for (const a of meta.allocators) {
    const p = posteriors.get(a.allocatorId) ?? 0;
    for (let i = 0; i < n; i++) {
      const c = p * a.weightVector[i] * 100;
      engineOnly[a.allocatorId][i] += c;
      engineBlend[i] += p * a.weightVector[i];
    }
  }

  const stages: { name: string; w: number[] }[] = [{ name: 'blend', w: [...engineBlend] }];
  let w = [...engineBlend];
  const afterLiquidity = applyLiquidityCaps(w, maxW);
  stages.push({ name: 'liquidity', w: afterLiquidity });
  w = afterLiquidity;

  const afterRegime = applyRegimeScale(w, regimeId);
  stages.push({ name: 'regime', w: afterRegime });
  w = afterRegime;

  const turnover = applyTurnoverConstrainedRebalance({
    symbols,
    markets,
    currentPct: currentWeightsPct,
    targetWeights: w,
    maxTurnoverPct: 25,
  });
  const afterTurnover = turnover.feasibleWeights.map((fw) => fw.weightPct / 100);
  stages.push({ name: 'turnover', w: afterTurnover });
  w = afterTurnover;

  const finalFromMeta = meta.finalWeights.map((fw) => fw.weightPct / 100);
  const afterFailSafe = meta.failSafe.triggered ? finalFromMeta : w;
  stages.push({ name: 'final', w: afterFailSafe });

  const perSymbol: SymbolWeightExplanation[] = symbols.map((symbol, i) => {
    const factors: WeightContributionFactor[] = [
      {
        factorId: 'black_litterman',
        labelJa: FACTOR_LABEL.black_litterman,
        contributionPct: Math.round(engineOnly.black_litterman[i] * 10) / 10,
      },
      {
        factorId: 'risk_parity',
        labelJa: FACTOR_LABEL.risk_parity,
        contributionPct: Math.round(engineOnly.risk_parity[i] * 10) / 10,
      },
      {
        factorId: 'cvar',
        labelJa: FACTOR_LABEL.cvar,
        contributionPct: Math.round(engineOnly.cvar[i] * 10) / 10,
      },
      {
        factorId: 'min_variance',
        labelJa: FACTOR_LABEL.min_variance,
        contributionPct: Math.round(engineOnly.min_variance[i] * 10) / 10,
      },
      {
        factorId: 'stability_penalty',
        labelJa: FACTOR_LABEL.stability_penalty,
        contributionPct: Math.round(engineOnly.stability_penalized[i] * 10) / 10,
      },
      factorContrib('liquidity_cap', engineBlend, afterLiquidity, i),
      factorContrib('regime_adjustment', afterLiquidity, afterRegime, i),
      factorContrib('turnover_constraint', afterRegime, afterTurnover, i),
    ];

    if (meta.failSafe.triggered) {
      factors.push(factorContrib('fail_safe_adjustment', afterTurnover, afterFailSafe, i));
    }

    const finalWeightPct = Math.round(afterFailSafe[i] * 1000) / 10;
    const top = [...factors].sort((a, b) => Math.abs(b.contributionPct) - Math.abs(a.contributionPct))[0];
    const summaryJa = `${symbol}: 最終 ${finalWeightPct}% — 主因 ${top?.labelJa ?? 'BMA'} (${top?.contributionPct ?? 0}%)`;

    return { symbol, finalWeightPct, summaryJa, factors };
  });

  const primary = meta.regimeSelection.primaryAllocator;
  const headlineJa = meta.failSafe.triggered
    ? `フェイルセーフ適用 — ${meta.failSafe.reasonJa}`
    : `BMAアンサンブル — ${ENSEMBLE_ALLOCATOR_LABEL[primary]}がレジーム主導`;

  const whyJa = [
    `5エンジン（BL・RP・CVaR・MinVar・安定性）をBMAで統合。`,
    `不一致スコア ${meta.disagreement.score}/100 · メタ頑健性 ${meta.metaRobustness.score}/100。`,
    meta.failSafe.triggered
      ? `高不一致/低頑健性のため${ENSEMBLE_ALLOCATOR_LABEL.stability_penalized}へフォールバック。`
      : `流動性・レジーム（${regimeId}）・ターンオーバー制約を順次適用。`,
  ].join(' ');

  return { headlineJa, whyJa, perSymbol };
}
