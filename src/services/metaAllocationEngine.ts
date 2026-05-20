import {
  BMA_PRIOR_UNIFORM,
  DISAGREEMENT_FAILSAFE_THRESHOLD,
  ENSEMBLE_ALLOCATOR_LABEL,
  FAILSAFE_MODE,
  META_ROBUSTNESS_FAILSAFE_THRESHOLD,
  META_ROBUSTNESS_PASS,
  REGIME_ALLOCATOR_PRIOR,
} from '../constants/metaAllocation';
import { MARKET_REGIME_LABEL } from '../constants/marketRegime';
import type { Market } from '../types';
import type { MarketRegimeId } from '../types/marketRegime';
import type {
  AllocationEntropyResult,
  AllocatorDisagreementResult,
  AllocatorOutput,
  BayesianModelAveragingResult,
  ConfidenceBlendResult,
  DynamicModelWeight,
  EnsembleAllocatorId,
  FailSafeFallbackResult,
  MetaAllocationInput,
  MetaAllocationReport,
  MetaRobustnessResult,
  ModelDiversificationResult,
  RegimeAllocatorSelection,
} from '../types/metaAllocation';
import type { QuantDataSource } from '../types/quantValidation';
import type { SymbolWeight } from '../types/portfolioOptimization';
import {
  applyWeightStabilityPenalty,
  modelRegimePersistence,
  scaleDynamicUncertainty,
} from './bayesianAllocationEngine';
import { computeBlackLitterman, projectWeights, toSymbolWeights } from './blackLittermanService';
import { estimateCovariance } from './covarianceEstimationService';
import {
  blendMatrices,
  clampCovariance,
  computeEwmaCovariance,
  computeRollingShrinkageCovariance,
} from './ewmaCovarianceService';
import {
  computeCvarOptimizedWeights,
  computeMinimumVarianceWeights,
  computeRiskParityWeights,
} from './portfolioOptimizationEngine';
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rowMeans(returnMatrix: number[][]): number[] {
  return returnMatrix.map((row) => {
    const T = row.length;
    return T > 0 ? row.reduce((s, r) => s + r, 0) / T : 0;
  });
}

function currentWeightVector(
  symbols: string[],
  currentWeightsPct: Map<string, number>,
): number[] {
  const sum = symbols.reduce((s, sym) => s + (currentWeightsPct.get(sym) ?? 0), 0);
  if (sum <= 0) return new Array(symbols.length).fill(1 / symbols.length);
  return symbols.map((sym) => (currentWeightsPct.get(sym) ?? 0) / sum);
}

function toWeights(
  symbols: string[],
  markets: Market[],
  w: number[],
): SymbolWeight[] {
  return toSymbolWeights(symbols, markets, w);
}

function weightEntropy(w: number[]): number {
  const eps = 1e-12;
  let h = 0;
  for (const wi of w) {
    if (wi > eps) h -= wi * Math.log(wi);
  }
  return h;
}

function normalizedEntropy(w: number[]): { entropy: number; normalized: number; effectiveN: number } {
  const n = w.length;
  const h = weightEntropy(w);
  const hMax = n > 1 ? Math.log(n) : 1;
  const norm = hMax > 0 ? h / hMax : 0;
  const effN = Math.exp(h);
  return { entropy: h, normalized: norm, effectiveN: effN };
}

/** 直近サブサンプルでの擬似シャープ（モデルスコア） */
function pseudoModelScore(returnMatrix: number[][], weights: number[]): number {
  const T = returnMatrix[0]?.length ?? 0;
  if (T < 20) return 50;
  const start = Math.max(0, T - 63);
  const portRets: number[] = [];
  for (let t = start; t < T; t++) {
    let pr = 0;
    for (let i = 0; i < weights.length; i++) {
      pr += weights[i] * returnMatrix[i][t];
    }
    portRets.push(pr);
  }
  const mean = portRets.reduce((s, r) => s + r, 0) / portRets.length;
  const variance = portRets.reduce((s, r) => s + (r - mean) ** 2, 0) / portRets.length;
  const vol = Math.sqrt(variance) * Math.sqrt(252);
  if (vol < 1e-8) return 40;
  const sharpe = (mean * 252) / vol;
  return clamp(Math.round(50 + sharpe * 25), 0, 100);
}

function runEnsembleAllocators(params: {
  symbols: string[];
  markets: Market[];
  returnMatrix: number[][];
  maxW: number[];
  wEq: number[];
  wPrior: number[];
  sectorArr: string[];
  regimeId: MarketRegimeId;
  regimeConfidence: number;
  volatilityProxyPct: number;
  regimeScores: Partial<Record<MarketRegimeId, number>>;
}): AllocatorOutput[] {
  const {
    symbols,
    markets,
    returnMatrix,
    maxW,
    wEq,
    wPrior,
    sectorArr,
    regimeId,
    regimeConfidence,
    volatilityProxyPct,
    regimeScores,
  } = params;

  const ewma = computeEwmaCovariance(returnMatrix);
  const rolling = computeRollingShrinkageCovariance(returnMatrix);
  const sample = estimateCovariance(symbols, returnMatrix);
  const blendedCov = clampCovariance(
    blendMatrices(ewma.matrix, rolling.matrix, 0.4),
  );
  const shrunkCov = clampCovariance(
    blendMatrices(blendedCov, sample.shrunkCov, 0.3),
  );

  const persistence = modelRegimePersistence({
    regimeId,
    regimeScores,
    regimeConfidence,
  });
  const uncertainty = scaleDynamicUncertainty({
    regimeConfidence,
    volatilityProxyPct,
    persistenceScore: persistence.persistenceScore,
  });

  const bl = computeBlackLitterman({
    symbols,
    markets,
    cov: blendedCov,
    wEq,
    maxW,
    regimeId,
    sectors: sectorArr,
    regimeConfidence,
    tau: uncertainty.scaledTau,
  });
  const wBl = bl.weights.map((w) => w.weightPct / 100);

  const wRp = computeRiskParityWeights(shrunkCov, maxW);
  const wMv = computeMinimumVarianceWeights(shrunkCov, maxW);
  const wCvar = computeCvarOptimizedWeights(returnMatrix, maxW);

  const stable = applyWeightStabilityPenalty({
    symbols,
    markets,
    targetWeights: wBl,
    priorWeights: wPrior,
    maxW,
  });
  const wStable = stable.weights.map((w) => w.weightPct / 100);

  const outputs: { id: EnsembleAllocatorId; w: number[] }[] = [
    { id: 'black_litterman', w: wBl },
    { id: 'risk_parity', w: wRp },
    { id: 'cvar', w: wCvar },
    { id: 'min_variance', w: wMv },
    { id: 'stability_penalized', w: wStable },
  ];

  return outputs.map(({ id, w }) => {
    const score = pseudoModelScore(returnMatrix, w);
    const confidence = clamp(score / 100, 0.25, 1);
    return {
      allocatorId: id,
      labelJa: ENSEMBLE_ALLOCATOR_LABEL[id],
      weights: toWeights(symbols, markets, w),
      weightVector: w,
      modelScore: score,
      confidence,
    };
  });
}

export function computeAllocatorDisagreement(
  weightVectors: number[][],
): AllocatorDisagreementResult {
  const k = weightVectors.length;
  if (k < 2) {
    return {
      score: 0,
      maxPairwiseL1Pct: 0,
      avgPairwiseL1Pct: 0,
      noteJa: '単一モデルのみ',
    };
  }
  let maxL1 = 0;
  let sumL1 = 0;
  let pairs = 0;
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const l1 =
        weightVectors[i].reduce(
          (s, v, idx) => s + Math.abs(v - weightVectors[j][idx]),
          0,
        ) * 100;
      maxL1 = Math.max(maxL1, l1);
      sumL1 += l1;
      pairs++;
    }
  }
  const avgL1 = pairs > 0 ? sumL1 / pairs : 0;
  const score = Math.round(clamp(avgL1 * 1.2 + maxL1 * 0.3, 0, 100));

  return {
    score,
    maxPairwiseL1Pct: Math.round(maxL1 * 10) / 10,
    avgPairwiseL1Pct: Math.round(avgL1 * 10) / 10,
    noteJa:
      score >= DISAGREEMENT_FAILSAFE_THRESHOLD
        ? `アロケーター不一致が高い（${score}/100）— フェイルセーフ検討`
        : `不一致は許容範囲（${score}/100）`,
  };
}

function computeDynamicModelWeights(params: {
  allocators: AllocatorOutput[];
  regimeId: MarketRegimeId;
}): DynamicModelWeight[] {
  const priors = REGIME_ALLOCATOR_PRIOR[params.regimeId] ?? {};
  const raw = params.allocators.map((a) => {
    const boost = priors[a.allocatorId] ?? 1;
    const prior = BMA_PRIOR_UNIFORM * boost;
    const dynamic = prior * a.confidence * (a.modelScore / 100);
    return { a, prior, boost, dynamic };
  });
  const sum = raw.reduce((s, r) => s + r.dynamic, 0);
  return raw.map(({ a, prior, boost, dynamic }) => ({
    allocatorId: a.allocatorId,
    labelJa: a.labelJa,
    priorWeight: Math.round((prior / raw.length) * 1000) / 10,
    dynamicWeight: Math.round((dynamic / Math.max(sum, 1e-10)) * 1000) / 10,
    regimeBoost: boost,
  }));
}

function selectRegimeAllocators(
  regimeId: MarketRegimeId,
  dynamicWeights: DynamicModelWeight[],
): RegimeAllocatorSelection {
  const sorted = [...dynamicWeights].sort((a, b) => b.dynamicWeight - a.dynamicWeight);
  const primary = sorted[0]?.allocatorId ?? 'stability_penalized';
  const secondary = sorted[1]?.allocatorId ?? 'min_variance';
  const suppressed = sorted
    .slice(-2)
    .map((s) => s.allocatorId)
    .filter((id) => id !== primary && id !== secondary);

  return {
    regimeId,
    primaryAllocator: primary,
    secondaryAllocator: secondary,
    suppressedAllocators: suppressed,
    noteJa: `「${MARKET_REGIME_LABEL[regimeId]}」— 主: ${ENSEMBLE_ALLOCATOR_LABEL[primary]} / 副: ${ENSEMBLE_ALLOCATOR_LABEL[secondary]}`,
  };
}

function confidenceWeightedBlend(params: {
  symbols: string[];
  markets: Market[];
  allocators: AllocatorOutput[];
  modelWeights: DynamicModelWeight[];
}): ConfidenceBlendResult {
  const n = params.symbols.length;
  const wMap = new Map(params.modelWeights.map((m) => [m.allocatorId, m.dynamicWeight / 100]));
  const blended = new Array(n).fill(0);
  let confSum = 0;
  let wSum = 0;

  for (const a of params.allocators) {
    const mw = wMap.get(a.allocatorId) ?? 0;
    confSum += a.confidence * mw;
    wSum += mw;
    for (let i = 0; i < n; i++) {
      blended[i] += mw * a.weightVector[i];
    }
  }
  if (wSum > 0) {
    for (let i = 0; i < n; i++) blended[i] /= wSum;
  }

  return {
    blendedWeights: toWeights(params.symbols, params.markets, blended),
    effectiveConfidence: Math.round((confSum / Math.max(wSum, 1e-10)) * 100),
    noteJa: `信頼度加重ブレンド — 実効信頼度 ${Math.round((confSum / Math.max(wSum, 1e-10)) * 100)}%`,
  };
}

function bayesianModelAveraging(params: {
  symbols: string[];
  markets: Market[];
  allocators: AllocatorOutput[];
  dynamicWeights: DynamicModelWeight[];
  disagreementScore: number;
}): BayesianModelAveragingResult {
  const n = params.symbols.length;
  const posteriors = params.allocators.map((a) => {
    const dw = params.dynamicWeights.find((d) => d.allocatorId === a.allocatorId);
    const prior = dw?.priorWeight ?? BMA_PRIOR_UNIFORM * 100;
    const likelihood = a.modelScore / 100;
    const disagreePenalty = 1 - params.disagreementScore / 200;
    const posterior = (prior / 100) * likelihood * disagreePenalty * a.confidence;
    return { allocatorId: a.allocatorId, posterior };
  });
  const pSum = posteriors.reduce((s, p) => s + p.posterior, 0);
  const normalized = posteriors.map((p) => ({
    allocatorId: p.allocatorId,
    posterior: Math.round((p.posterior / Math.max(pSum, 1e-10)) * 1000) / 10,
  }));

  const bma = new Array(n).fill(0);
  for (const a of params.allocators) {
    const p =
      normalized.find((x) => x.allocatorId === a.allocatorId)?.posterior ?? 0;
    for (let i = 0; i < n; i++) {
      bma[i] += (p / 100) * a.weightVector[i];
    }
  }

  return {
    posteriorWeights: normalized,
    bmaWeights: toWeights(params.symbols, params.markets, bma),
    noteJa: 'ベイズモデル平均 — 事後確率で5アロケーターを統合',
  };
}

function computeMetaRobustness(params: {
  disagreement: AllocatorDisagreementResult;
  allocationEntropy: AllocationEntropyResult;
  modelDiversification: ModelDiversificationResult;
  bma: BayesianModelAveragingResult;
}): MetaRobustnessResult {
  const disagreementComponent = Math.round(
    clamp(100 - params.disagreement.score, 0, 100),
  );
  const entropyComponent = Math.round(params.allocationEntropy.normalizedEntropy * 100);
  const modelDivComponent = Math.round(params.modelDiversification.entropy * 40);
  const posteriorSpread = params.bma.posteriorWeights.map((p) => p.posterior);
  const hMax = Math.log(posteriorSpread.length);
  const h = weightEntropy(posteriorSpread.map((p) => p / 100));
  const bmaStabilityComponent = Math.round(clamp((h / Math.max(hMax, 1e-6)) * 100, 0, 100));

  const score = Math.round(
    disagreementComponent * 0.3 +
      entropyComponent * 0.2 +
      modelDivComponent * 0.25 +
      bmaStabilityComponent * 0.25,
  );

  return {
    score,
    disagreementComponent,
    entropyComponent,
    modelDivComponent,
    bmaStabilityComponent,
    noteJa:
      score >= META_ROBUSTNESS_PASS
        ? `メタ頑健性 ${score}/100 — アンサンブル信頼可`
        : `メタ頑健性 ${score}/100 — フェイルセーフを優先`,
  };
}

function applyFailSafe(params: {
  symbols: string[];
  markets: Market[];
  maxW: number[];
  allocators: AllocatorOutput[];
  disagreement: AllocatorDisagreementResult;
  metaRobustness: MetaRobustnessResult;
  bmaWeights: number[];
}): FailSafeFallbackResult {
  const triggered =
    params.disagreement.score >= DISAGREEMENT_FAILSAFE_THRESHOLD ||
    params.metaRobustness.score < META_ROBUSTNESS_FAILSAFE_THRESHOLD;

  if (!triggered) {
    return {
      triggered: false,
      mode: FAILSAFE_MODE,
      reasonJa: 'フェイルセーフ未発動 — BMAブレンドを使用',
      weights: toWeights(params.symbols, params.markets, params.bmaWeights),
    };
  }

  let w: number[];
  let mode = FAILSAFE_MODE;
  let reasonJa: string;

  if (mode === 'equal_weight') {
    w = new Array(params.symbols.length).fill(1 / params.symbols.length);
    reasonJa = '高不一致 — 等ウェイトにフォールバック';
  } else if (mode === 'min_variance') {
    const mv = params.allocators.find((a) => a.allocatorId === 'min_variance');
    w = mv?.weightVector ?? params.bmaWeights;
    reasonJa = '低メタ頑健性 — 最小分散にフォールバック';
  } else {
    const st = params.allocators.find((a) => a.allocatorId === 'stability_penalized');
    w = st?.weightVector ?? params.bmaWeights;
    reasonJa = 'モデル不確実性 — 安定性ペナルティにフォールバック';
  }

  w = projectWeights(w, params.maxW);

  return {
    triggered: true,
    mode,
    reasonJa,
    weights: toWeights(params.symbols, params.markets, w),
  };
}

/** メタ配分・アンサンブル頑健性メイン */
export function runMetaAllocation(
  input: MetaAllocationInput,
  dataSource: QuantDataSource,
): MetaAllocationReport {
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
  const maxW = symbols.map((s) => (liquidityMaxPct.get(s) ?? 25) / 100);
  const wEq = currentWeightVector(symbols, currentWeightsPct);
  const wPrior = [...wEq];
  const sectorArr = symbols.map((s) => sectors.get(s) ?? 'growth');

  const allocators = runEnsembleAllocators({
    symbols,
    markets,
    returnMatrix,
    maxW,
    wEq,
    wPrior,
    sectorArr,
    regimeId,
    regimeConfidence,
    volatilityProxyPct,
    regimeScores,
  });

  const disagreement = computeAllocatorDisagreement(
    allocators.map((a) => a.weightVector),
  );

  allocators.forEach((a) => {
    const disagreeFactor = 1 - disagreement.score / 150;
    a.confidence = clamp(a.confidence * disagreeFactor, 0.2, 1);
  });

  const dynamicModelWeights = computeDynamicModelWeights({ allocators, regimeId });
  const regimeSelection = selectRegimeAllocators(regimeId, dynamicModelWeights);
  const confidenceBlend = confidenceWeightedBlend({
    symbols,
    markets,
    allocators,
    modelWeights: dynamicModelWeights,
  });

  const bma = bayesianModelAveraging({
    symbols,
    markets,
    allocators,
    dynamicWeights: dynamicModelWeights,
    disagreementScore: disagreement.score,
  });

  const bmaW = bma.bmaWeights.map((w) => w.weightPct / 100);
  const allocEntropy = normalizedEntropy(bmaW);
  const allocationEntropy: AllocationEntropyResult = {
    entropy: Math.round(allocEntropy.entropy * 1000) / 1000,
    normalizedEntropy: Math.round(allocEntropy.normalized * 100) / 100,
    effectiveN: Math.round(allocEntropy.effectiveN * 10) / 10,
    noteJa: `配分エントロピー H=${allocEntropy.entropy.toFixed(2)} · 実効銘柄数≈${allocEntropy.effectiveN.toFixed(1)}`,
  };

  const modelW = dynamicModelWeights.map((m) => m.dynamicWeight / 100);
  const modelEnt = normalizedEntropy(modelW);
  const herfindahl = modelW.reduce((s, w) => s + w * w, 0);
  const modelDiversification: ModelDiversificationResult = {
    entropy: Math.round(modelEnt.entropy * 1000) / 1000,
    effectiveModels: Math.round(modelEnt.effectiveN * 10) / 10,
    herfindahl: Math.round(herfindahl * 1000) / 1000,
    noteJa: `モデル分散 — 実効${modelEnt.effectiveN.toFixed(1)}モデル · HHI=${herfindahl.toFixed(2)}`,
  };

  const metaRobustness = computeMetaRobustness({
    disagreement,
    allocationEntropy,
    modelDiversification,
    bma,
  });

  const failSafe = applyFailSafe({
    symbols,
    markets,
    maxW,
    allocators,
    disagreement,
    metaRobustness,
    bmaWeights: bmaW,
  });

  const finalWeights = failSafe.triggered ? failSafe.weights : bma.bmaWeights;
  const pass =
    metaRobustness.score >= META_ROBUSTNESS_PASS && !failSafe.triggered;

  return {
    generatedAt: new Date().toISOString(),
    dataSource,
    tradingDays: returnMatrix[0]?.length ?? 0,
    allocators,
    dynamicModelWeights,
    regimeSelection,
    disagreement,
    confidenceBlend,
    bayesianModelAveraging: bma,
    allocationEntropy,
    modelDiversification,
    failSafe,
    metaRobustness,
    finalWeights,
    verdictJa: pass
      ? `メタ配分確定 — メタ頑健性 ${metaRobustness.score}/100 · ${regimeSelection.primaryAllocator}主導`
      : failSafe.triggered
        ? `フェイルセーフ: ${failSafe.reasonJa}`
        : `要監視 — メタ頑健性 ${metaRobustness.score}/100`,
  };
}
