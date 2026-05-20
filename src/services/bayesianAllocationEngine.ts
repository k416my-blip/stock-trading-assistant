import {
  BAYES_CI_Z,
  BL_TAU,
  BOOTSTRAP_CI_SAMPLES,
  FRACTIONAL_KELLY,
  KELLY_MAX_SINGLE_WEIGHT_PCT,
  REGIME_PERSISTENCE_MAX_DAYS,
  REGIME_PERSISTENCE_MIN_DAYS,
  ROBUSTNESS_RANK_PASS,
  SENSITIVITY_COV_PERTURB_PCT,
  SENSITIVITY_RETURN_PERTURB_PCT,
  STABILITY_BLEND_PRIOR,
  STABILITY_PENALTY_LAMBDA,
  UNCERTAINTY_TAU_SCALE_MAX,
  UNCERTAINTY_VOL_THRESHOLD,
} from '../constants/bayesianAllocation';
import { MARKET_REGIME_LABEL } from '../constants/marketRegime';
import type { Market } from '../types';
import type { MarketRegimeId } from '../types/marketRegime';
import type {
  AllocationRobustnessRank,
  BayesianAllocationInput,
  BayesianAllocationReport,
  BayesianConfidenceInterval,
  DynamicUncertaintyResult,
  FractionalKellyResult,
  OptimizationSensitivityResult,
  RegimePersistenceResult,
  WeightStabilityResult,
} from '../types/bayesianAllocation';
import type { QuantDataSource } from '../types/quantValidation';
import type { SymbolWeight } from '../types/portfolioOptimization';
import {
  computeBlackLitterman,
  meanVarianceWeights,
  projectWeights,
  toSymbolWeights,
} from './blackLittermanService';
import {
  annualizedVolFromCov,
  blendMatrices,
  clampCovariance,
  computeEwmaCovariance,
  computeRollingShrinkageCovariance,
} from './ewmaCovarianceService';
import { dot, sampleCovarianceMatrix } from './covarianceEstimationService';
import { computeRiskParityWeights } from './portfolioOptimizationEngine';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rowMeans(returnMatrix: number[][]): number[] {
  return returnMatrix.map((row) => {
    const T = row.length;
    return T > 0 ? row.reduce((s, r) => s + r, 0) / T : 0;
  });
}

function rowStd(returnMatrix: number[][]): number[] {
  return returnMatrix.map((row) => {
    const T = row.length;
    if (T < 2) return 0.01;
    const m = row.reduce((s, r) => s + r, 0) / T;
    const v = row.reduce((s, r) => s + (r - m) ** 2, 0) / (T - 1);
    return Math.sqrt(Math.max(v, 1e-10));
  });
}

function weightL1Change(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + Math.abs(v - (b[i] ?? 0)), 0) * 100;
}

function currentWeightVector(
  symbols: string[],
  currentWeightsPct: Map<string, number>,
): number[] {
  const sum = symbols.reduce((s, sym) => s + (currentWeightsPct.get(sym) ?? 0), 0);
  if (sum <= 0) return new Array(symbols.length).fill(1 / symbols.length);
  return symbols.map((sym) => (currentWeightsPct.get(sym) ?? 0) / sum);
}

/** レジーム持続性モデル */
export function modelRegimePersistence(params: {
  regimeId: MarketRegimeId;
  regimeScores: Partial<Record<MarketRegimeId, number>>;
  regimeConfidence: number;
}): RegimePersistenceResult {
  const entries = Object.entries(params.regimeScores)
    .filter(([, v]) => typeof v === 'number')
    .sort((a, b) => (b[1] as number) - (a[1] as number)) as [MarketRegimeId, number][];

  const top = entries[0]?.[1] ?? params.regimeConfidence;
  const second = entries[1]?.[1] ?? top * 0.5;
  const margin = top > 0 ? (top - second) / top : 0;
  const persistenceScore = Math.round(clamp(margin * 100 + params.regimeConfidence * 0.4, 0, 100));
  const transitionRiskPct = Math.round(clamp((second / Math.max(top, 1)) * 100, 10, 95));
  const expectedDaysInRegime = Math.round(
    clamp(
      REGIME_PERSISTENCE_MIN_DAYS +
        (persistenceScore / 100) * (REGIME_PERSISTENCE_MAX_DAYS - REGIME_PERSISTENCE_MIN_DAYS),
      REGIME_PERSISTENCE_MIN_DAYS,
      REGIME_PERSISTENCE_MAX_DAYS,
    ),
  );

  return {
    currentRegime: params.regimeId,
    persistenceScore,
    expectedDaysInRegime,
    transitionRiskPct,
    dominantScoreMargin: Math.round(margin * 100) / 100,
    noteJa: `「${MARKET_REGIME_LABEL[params.regimeId]}」持続見込み約${expectedDaysInRegime}日 · 遷移リスク${transitionRiskPct}%`,
  };
}

/** 動的不確実性スケール */
export function scaleDynamicUncertainty(params: {
  regimeConfidence: number;
  volatilityProxyPct: number;
  persistenceScore: number;
  baseTau?: number;
}): DynamicUncertaintyResult {
  const baseTau = params.baseTau ?? BL_TAU;
  const volExcess = Math.max(0, params.volatilityProxyPct - UNCERTAINTY_VOL_THRESHOLD);
  const volFactor = 1 + volExcess / UNCERTAINTY_VOL_THRESHOLD;
  const confFactor = 1 + (100 - params.regimeConfidence) / 100;
  const persistFactor = 1 + (100 - params.persistenceScore) / 150;
  const uncertaintyMultiplier = clamp(
    volFactor * confFactor * persistFactor,
    1,
    UNCERTAINTY_TAU_SCALE_MAX,
  );
  const scaledTau = baseTau * uncertaintyMultiplier;
  const viewOmegaScale = uncertaintyMultiplier ** 2;

  return {
    baseTau,
    scaledTau: Math.round(scaledTau * 10000) / 10000,
    uncertaintyMultiplier: Math.round(uncertaintyMultiplier * 100) / 100,
    viewOmegaScale: Math.round(viewOmegaScale * 100) / 100,
    noteJa:
      uncertaintyMultiplier > 1.4
        ? `不確実性拡大（×${uncertaintyMultiplier.toFixed(2)}）— τ・ビュー分散をスケール`
        : `不確実性は穏当（×${uncertaintyMultiplier.toFixed(2)}）`,
  };
}

/** フラクショナル Kelly */
export function computeFractionalKelly(params: {
  symbols: string[];
  markets: Market[];
  means: number[];
  cov: number[][];
  maxW: number[];
  fraction?: number;
}): FractionalKellyResult {
  const { symbols, markets, means, cov, maxW } = params;
  const fraction = params.fraction ?? FRACTIONAL_KELLY;
  const rawFractions: FractionalKellyResult['rawFractions'] = [];
  const rawW: number[] = [];

  for (let i = 0; i < symbols.length; i++) {
    const variance = Math.max(cov[i][i], 1e-10);
    const kelly = means[i] > 0 ? means[i] / variance : 0;
    const frac = clamp(kelly * fraction, 0, KELLY_MAX_SINGLE_WEIGHT_PCT / 100);
    rawFractions.push({
      symbol: symbols[i],
      kelly: Math.round(kelly * 1000) / 1000,
      fractional: Math.round(frac * 1000) / 1000,
    });
    rawW.push(frac);
  }

  const sum = rawW.reduce((s, v) => s + v, 0);
  const weights = sum > 0 ? projectWeights(rawW.map((v) => v / sum), maxW) : new Array(symbols.length).fill(1 / symbols.length);

  return {
    fraction,
    rawFractions,
    weights: toSymbolWeights(symbols, markets, weights),
    noteJa: `フラクショナル Kelly ${(fraction * 100).toFixed(0)}% — 過剰レバレッジ抑制`,
  };
}

/** ウェイト安定性ペナルティ */
export function applyWeightStabilityPenalty(params: {
  symbols: string[];
  markets: Market[];
  targetWeights: number[];
  priorWeights: number[];
  maxW: number[];
  penaltyLambda?: number;
  blendPrior?: number;
}): WeightStabilityResult {
  const {
    symbols,
    markets,
    targetWeights,
    priorWeights,
    maxW,
    penaltyLambda = STABILITY_PENALTY_LAMBDA,
    blendPrior = STABILITY_BLEND_PRIOR,
  } = params;
  const n = symbols.length;

  const blended = targetWeights.map(
    (w, i) => (1 - blendPrior) * w + blendPrior * (priorWeights[i] ?? 1 / n),
  );
  const penalized = blended.map(
    (w, i) => w - penaltyLambda * (w - (priorWeights[i] ?? 1 / n)),
  );
  const weights = projectWeights(penalized, maxW);
  const turnoverFromPriorPct = Math.round(weightL1Change(weights, priorWeights) * 10) / 10;
  const stabilityScore = Math.round(clamp(100 - turnoverFromPriorPct * 2 - penaltyLambda * 80, 0, 100));

  return {
    penaltyLambda,
    turnoverFromPriorPct,
    stabilityScore,
    weights: toSymbolWeights(symbols, markets, weights),
    noteJa: `安定性スコア ${stabilityScore}/100 · ペナルティλ=${penaltyLambda} · ブレンド${(blendPrior * 100).toFixed(0)}%`,
  };
}

/** 最適化感度分析 */
export function analyzeOptimizationSensitivity(params: {
  symbols: string[];
  means: number[];
  cov: number[][];
  maxW: number[];
  wEq: number[];
}): OptimizationSensitivityResult {
  const { symbols, means, cov, maxW, wEq } = params;
  const base = meanVarianceWeights(means, cov, maxW);
  const perturbations: OptimizationSensitivityResult['perturbations'] = [];

  const tests: { parameter: string; scale: number }[] = [
    { parameter: '期待リターン +', scale: 1 + SENSITIVITY_RETURN_PERTURB_PCT / 100 },
    { parameter: '期待リターン −', scale: 1 - SENSITIVITY_RETURN_PERTURB_PCT / 100 },
    { parameter: '共分散 +', scale: 1 + SENSITIVITY_COV_PERTURB_PCT / 100 },
    { parameter: '共分散 −', scale: 1 - SENSITIVITY_COV_PERTURB_PCT / 100 },
  ];

  let maxChange = 0;
  let sumChange = 0;

  for (const t of tests) {
    let w: number[];
    if (t.parameter.includes('リターン')) {
      const muP = means.map((m) => m * t.scale);
      w = meanVarianceWeights(muP, cov, maxW);
    } else {
      const covP = cov.map((row, i) =>
        row.map((v, j) => (i === j ? v * t.scale : v * Math.sqrt(t.scale))),
      );
      w = meanVarianceWeights(means, covP, maxW);
    }
    const maxD = Math.max(...base.map((b, i) => Math.abs(b - w[i]) * 100));
    const avgD = base.reduce((s, b, i) => s + Math.abs(b - w[i]) * 100, 0) / base.length;
    maxChange = Math.max(maxChange, maxD);
    sumChange += avgD;
    perturbations.push({
      parameter: t.parameter,
      perturbationPct: t.parameter.includes('リターン')
        ? SENSITIVITY_RETURN_PERTURB_PCT
        : SENSITIVITY_COV_PERTURB_PCT,
      maxWeightChangePct: Math.round(maxD * 10) / 10,
      avgWeightChangePct: Math.round(avgD * 10) / 10,
    });
  }

  const fragilityScore = Math.round(clamp(maxChange * 3 + sumChange, 0, 100));

  return {
    perturbations,
    fragilityScore,
    noteJa:
      fragilityScore > 40
        ? `最適化は脆弱（スコア${fragilityScore}）— 安定性ペナルティを強化`
        : `感度は許容範囲（脆弱性${fragilityScore}/100）`,
  };
}

/** ベイズ信頼区間（ブートストラップ近似） */
export function computeBayesianConfidenceIntervals(params: {
  symbols: string[];
  returnMatrix: number[][];
  weights: number[];
  means: number[];
  stds: number[];
}): BayesianConfidenceInterval[] {
  const { symbols, returnMatrix, weights, means, stds } = params;
  const n = symbols.length;
  const T = returnMatrix[0]?.length ?? 0;
  const weightSamples: number[][] = Array.from({ length: n }, () => []);

  for (let b = 0; b < BOOTSTRAP_CI_SAMPLES; b++) {
    const idx: number[] = [];
    for (let t = 0; t < Math.min(T, 120); t++) {
      idx.push(Math.floor(Math.random() * T));
    }
    const slice = returnMatrix.map((row) => idx.map((i) => row[i]));
    const mu = rowMeans(slice);
    const cov = sampleCovarianceMatrix(slice);
    const w = meanVarianceWeights(mu, cov, new Array(n).fill(0.25));
    w.forEach((wi, i) => weightSamples[i].push(wi));
  }

  return symbols.map((symbol, i) => {
    const samples = weightSamples[i].sort((a, b) => a - b);
    const lo = samples[Math.floor(samples.length * 0.025)] ?? weights[i];
    const hi = samples[Math.floor(samples.length * 0.975)] ?? weights[i];
    const se = stds[i] / Math.sqrt(Math.max(T, 5));
    const retMean = means[i] * 252 * 100;
    const retSe = se * Math.sqrt(252) * 100;

    return {
      symbol,
      weightPct: Math.round(weights[i] * 1000) / 10,
      weightLowerPct: Math.round(lo * 1000) / 10,
      weightUpperPct: Math.round(hi * 1000) / 10,
      returnMeanPct: Math.round(retMean * 10) / 10,
      returnLowerPct: Math.round((retMean - BAYES_CI_Z * retSe) * 10) / 10,
      returnUpperPct: Math.round((retMean + BAYES_CI_Z * retSe) * 10) / 10,
    };
  });
}

function ciWidthScore(intervals: BayesianConfidenceInterval[]): number {
  if (intervals.length === 0) return 0;
  const avgWidth =
    intervals.reduce((s, c) => s + (c.weightUpperPct - c.weightLowerPct), 0) /
    intervals.length;
  return Math.round(clamp(100 - avgWidth * 4, 0, 100));
}

function rankAllocations(
  candidates: {
    methodId: import('../types/bayesianAllocation').BayesianAllocationMethodId;
    methodLabelJa: string;
    weights: SymbolWeight[];
    stabilityScore: number;
    fragilityScore: number;
    ciWidthScore: number;
  }[],
): AllocationRobustnessRank[] {
  const scored = candidates.map((c) => {
    const sensitivityScore = Math.round(clamp(100 - c.fragilityScore, 0, 100));
    const compositeScore = Math.round(
      c.stabilityScore * 0.4 + sensitivityScore * 0.35 + c.ciWidthScore * 0.25,
    );
    return { ...c, sensitivityScore, compositeScore };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  return scored.map((s, idx) => ({
    methodId: s.methodId,
    methodLabelJa: s.methodLabelJa,
    rank: idx + 1,
    compositeScore: s.compositeScore,
    stabilityScore: s.stabilityScore,
    sensitivityScore: s.sensitivityScore,
    ciWidthScore: s.ciWidthScore,
    weights: s.weights,
  }));
}

/** ベイズ動的配分メイン */
export function runBayesianAllocation(
  input: BayesianAllocationInput,
  dataSource: QuantDataSource,
): BayesianAllocationReport {
  const {
    symbols,
    markets,
    returnMatrix,
    currentWeightsPct,
    liquidityMaxPct,
    sectors,
    regimeId,
    regimeScores,
    regimeConfidence,
    volatilityProxyPct,
  } = input;

  const n = symbols.length;
  const maxW = symbols.map(
    (s) => (liquidityMaxPct.get(s) ?? 25) / 100,
  );
  const sectorArr = symbols.map((s) => sectors.get(s) ?? 'growth');
  const wEq = currentWeightVector(symbols, currentWeightsPct);
  const wPrior = [...wEq];
  const means = rowMeans(returnMatrix);
  const stds = rowStd(returnMatrix);

  const ewmaCovariance = computeEwmaCovariance(returnMatrix);
  const rollingShrinkage = computeRollingShrinkageCovariance(returnMatrix);
  const blendedCov = clampCovariance(
    blendMatrices(ewmaCovariance.matrix, rollingShrinkage.matrix, 0.45),
  );

  const regimePersistence = modelRegimePersistence({
    regimeId,
    regimeScores,
    regimeConfidence,
  });
  const dynamicUncertainty = scaleDynamicUncertainty({
    regimeConfidence,
    volatilityProxyPct,
    persistenceScore: regimePersistence.persistenceScore,
  });

  const blackLitterman = computeBlackLitterman({
    symbols,
    markets,
    cov: blendedCov,
    wEq,
    maxW,
    regimeId,
    sectors: sectorArr,
    regimeConfidence,
    tau: dynamicUncertainty.scaledTau,
  });

  const blWeights = blackLitterman.weights.map((w) => w.weightPct / 100);

  const fractionalKelly = computeFractionalKelly({
    symbols,
    markets,
    means,
    cov: blendedCov,
    maxW,
  });
  const kellyW = fractionalKelly.weights.map((w) => w.weightPct / 100);

  const ewmaRpW = computeRiskParityWeights(blendedCov, maxW);
  const rollingMvoW = meanVarianceWeights(
    blackLitterman.posteriorReturns.map((r) => r / 25200),
    rollingShrinkage.matrix,
    maxW,
  );

  const stabilityTarget = blWeights;
  const weightStability = applyWeightStabilityPenalty({
    symbols,
    markets,
    targetWeights: stabilityTarget,
    priorWeights: wPrior,
    maxW,
  });
  const stableW = weightStability.weights.map((w) => w.weightPct / 100);

  const sensitivity = analyzeOptimizationSensitivity({
    symbols,
    means,
    cov: blendedCov,
    maxW,
    wEq,
  });

  const confidenceIntervals = computeBayesianConfidenceIntervals({
    symbols,
    returnMatrix,
    weights: stableW,
    means,
    stds,
  });
  const ciScore = ciWidthScore(confidenceIntervals);

  const rpStability = Math.round(
    clamp(100 - weightL1Change(ewmaRpW, wPrior) * 1.5, 0, 100),
  );
  const mvoStability = Math.round(
    clamp(100 - weightL1Change(rollingMvoW, wPrior) * 1.5, 0, 100),
  );
  const kellyStability = Math.round(
    clamp(100 - weightL1Change(kellyW, wPrior) * 1.5, 0, 100),
  );
  const blStability = Math.round(
    clamp(100 - weightL1Change(blWeights, wPrior) * 1.5, 0, 100),
  );

  const robustnessRanking = rankAllocations([
    {
      methodId: 'stability_penalized',
      methodLabelJa: '安定性ペナルティ',
      weights: weightStability.weights,
      stabilityScore: weightStability.stabilityScore,
      fragilityScore: sensitivity.fragilityScore,
      ciWidthScore: ciScore,
    },
    {
      methodId: 'black_litterman',
      methodLabelJa: 'Black-Litterman',
      weights: blackLitterman.weights,
      stabilityScore: blStability,
      fragilityScore: sensitivity.fragilityScore,
      ciWidthScore: ciScore,
    },
    {
      methodId: 'ewma_risk_parity',
      methodLabelJa: 'EWMAリスクパリティ',
      weights: toSymbolWeights(symbols, markets, ewmaRpW),
      stabilityScore: rpStability,
      fragilityScore: sensitivity.fragilityScore + 5,
      ciWidthScore: ciScore,
    },
    {
      methodId: 'fractional_kelly',
      methodLabelJa: 'フラクショナルKelly',
      weights: fractionalKelly.weights,
      stabilityScore: kellyStability,
      fragilityScore: sensitivity.fragilityScore + 10,
      ciWidthScore: ciScore,
    },
    {
      methodId: 'rolling_shrink_mvo',
      methodLabelJa: 'ローリング収縮MVO',
      weights: toSymbolWeights(symbols, markets, rollingMvoW),
      stabilityScore: mvoStability,
      fragilityScore: sensitivity.fragilityScore + 8,
      ciWidthScore: ciScore,
    },
  ]);

  const recommended = robustnessRanking[0]!;
  const portVol = annualizedVolFromCov(blendedCov, stableW);

  const pass =
    recommended.compositeScore >= ROBUSTNESS_RANK_PASS &&
    sensitivity.fragilityScore < 45 &&
    regimePersistence.persistenceScore >= 40;

  return {
    generatedAt: new Date().toISOString(),
    dataSource,
    tradingDays: returnMatrix[0]?.length ?? 0,
    ewmaCovariance,
    rollingShrinkage,
    blackLitterman,
    fractionalKelly,
    weightStability,
    regimePersistence,
    dynamicUncertainty,
    confidenceIntervals,
    sensitivity,
    robustnessRanking,
    recommendedMethodId: recommended.methodId,
    recommendedWeights: recommended.weights,
    verdictJa: pass
      ? `頑健配分: ${recommended.methodLabelJa}（スコア${recommended.compositeScore}）· 年率ボラ約${Math.round(portVol)}%`
      : `配分不安定 — ${recommended.methodLabelJa}でも要監視（スコア${recommended.compositeScore}）`,
  };
}
