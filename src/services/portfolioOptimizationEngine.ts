import {
  CVAR_ALPHA,
  CVAR_MAX_ITER,
  DEFAULT_MAX_REBALANCE_TURNOVER_PCT,
  DEFAULT_MAX_SINGLE_WEIGHT_PCT,
  KELLY_MAX_FRACTION,
  KELLY_MAX_SINGLE_WEIGHT_PCT,
  OPT_MC_BLOCK_SIZE,
  OPT_MC_HORIZON_DAYS,
  OPT_MC_PATHS,
  REGIME_EQUITY_SCALE_CAP,
  RISK_PARITY_MAX_ITER,
  RISK_PARITY_TOLERANCE,
  ROBUSTNESS_SCORE_PASS,
  TARGET_PORTFOLIO_BETA,
} from '../constants/portfolioOptimization';
import { REGIME_RISK_MULTIPLIER } from '../constants/marketRegime';
import { RISK_FREE_RATE_ANNUAL } from '../constants/historicalSimulation';
import type { Market } from '../types';
import type { MarketRegimeId } from '../types/marketRegime';
import type {
  ExposureNeutralResult,
  KellyConstraintResult,
  MonteCarloRobustnessResult,
  OptimizedAllocation,
  OptimizationMethodId,
  PortfolioOptimizationInput,
  PortfolioOptimizationReport,
  SymbolWeight,
  TurnoverConstrainedRebalance,
} from '../types/portfolioOptimization';
import {
  dot,
  estimateCovariance,
  invertMatrix,
  matVec,
  portfolioMeanReturn,
  portfolioVol,
} from './covarianceEstimationService';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rowMeans(returnMatrix: number[][]): number[] {
  return returnMatrix.map((row) => {
    const T = row.length;
    return T > 0 ? row.reduce((s, r) => s + r, 0) / T : 0;
  });
}

function projectWeights(
  w: number[],
  maxW: number[],
  minW: number[] = [],
): number[] {
  const n = w.length;
  let x = w.map((wi, i) => clamp(wi, minW[i] ?? 0, maxW[i] ?? 1));
  let sum = x.reduce((s, v) => s + v, 0);
  if (sum <= 0) return new Array(n).fill(1 / n);
  x = x.map((v) => v / sum);
  for (let pass = 0; pass < 8; pass++) {
    let clipped = false;
    for (let i = 0; i < n; i++) {
      if (x[i] > maxW[i]) {
        x[i] = maxW[i];
        clipped = true;
      }
    }
    if (clipped) {
      const total = x.reduce((s, v) => s + v, 0);
      if (total > 0) x = x.map((v) => v / total);
    }
  }
  return x;
}

function toSymbolWeights(
  symbols: string[],
  markets: Market[],
  weights: number[],
): SymbolWeight[] {
  return symbols.map((symbol, i) => ({
    symbol,
    market: markets[i],
    weightPct: Math.round(weights[i] * 1000) / 10,
  }));
}

function cvarFromScenarios(portReturns: number[], alpha: number): number {
  const sorted = [...portReturns].sort((a, b) => a - b);
  const tail = Math.max(1, Math.floor(sorted.length * alpha));
  const tailLosses = sorted.slice(0, tail);
  return (-tailLosses.reduce((s, r) => s + r, 0) / tailLosses.length) * 100;
}

function sharpeFromReturns(dailyRets: number[]): number {
  if (dailyRets.length < 5) return 0;
  const mean = dailyRets.reduce((s, r) => s + r, 0) / dailyRets.length;
  const variance = dailyRets.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyRets.length;
  const vol = Math.sqrt(variance) * Math.sqrt(252);
  if (vol < 1e-8) return 0;
  return (mean * 252 - RISK_FREE_RATE_ANNUAL / 100) / vol;
}

/** リスクパリティ（ERC近似） */
export function computeRiskParityWeights(
  cov: number[][],
  maxW: number[],
): number[] {
  const n = cov.length;
  let w = new Array(n).fill(1 / n);
  for (let iter = 0; iter < RISK_PARITY_MAX_ITER; iter++) {
    const sigmaW = matVec(cov, w);
    const portVol = Math.sqrt(Math.max(1e-12, dot(w, sigmaW)));
    const rc = w.map((wi, i) => (wi * sigmaW[i]) / portVol);
    const target = portVol / n;
    const wNew = w.map((wi, i) => wi * (target / Math.max(rc[i], 1e-10)));
    w = projectWeights(wNew, maxW);
    const maxDiff = rc.reduce((m, r) => Math.max(m, Math.abs(r - target)), 0);
    if (maxDiff < RISK_PARITY_TOLERANCE) break;
  }
  return w;
}

/** 最小分散（解析解 + 流動性投影） */
export function computeMinimumVarianceWeights(
  cov: number[][],
  maxW: number[],
): number[] {
  const n = cov.length;
  const inv = invertMatrix(cov);
  if (!inv) return new Array(n).fill(1 / n);
  const ones = new Array(n).fill(1);
  const raw = matVec(inv, ones);
  const sum = raw.reduce((s, v) => s + v, 0);
  if (Math.abs(sum) < 1e-12) return new Array(n).fill(1 / n);
  return projectWeights(raw.map((v) => v / sum), maxW);
}

/** シナリオベース CVaR 最小化（Rockafellar-Uryasev） */
export function computeCvarOptimizedWeights(
  returnMatrix: number[][],
  maxW: number[],
  alpha: number = CVAR_ALPHA,
): number[] {
  const n = returnMatrix.length;
  const T = returnMatrix[0]?.length ?? 0;
  if (n === 0 || T === 0) return [];

  let w = new Array(n).fill(1 / n);
  let eta = 0;
  const lr = 0.05;

  for (let iter = 0; iter < CVAR_MAX_ITER; iter++) {
    const losses: number[] = [];
    for (let t = 0; t < T; t++) {
      let pr = 0;
      for (let i = 0; i < n; i++) pr += w[i] * returnMatrix[i][t];
      losses.push(Math.max(0, -pr - eta));
    }
    const gradEta = 1 - losses.filter((l) => l > 0).length / ((1 - alpha) * T);
    const gradW = new Array(n).fill(0);
    for (let t = 0; t < T; t++) {
      let pr = 0;
      for (let i = 0; i < n; i++) pr += w[i] * returnMatrix[i][t];
      const excess = Math.max(0, -pr - eta);
      if (excess > 0) {
        for (let i = 0; i < n; i++) gradW[i] -= returnMatrix[i][t] / ((1 - alpha) * T);
      }
    }
    eta -= lr * gradEta;
    const wNew = w.map((wi, i) => wi - lr * gradW[i]);
    w = projectWeights(wNew, maxW);
  }
  return w;
}

/** Kelly 分数制約 */
export function computeKellyConstrainedWeights(
  symbols: string[],
  markets: Market[],
  means: number[],
  cov: number[][],
): KellyConstraintResult {
  const n = symbols.length;
  const maxW = new Array(n).fill(KELLY_MAX_SINGLE_WEIGHT_PCT / 100);
  const raw: { symbol: string; fraction: number }[] = [];
  const rawW: number[] = [];

  for (let i = 0; i < n; i++) {
    const variance = Math.max(cov[i][i], 1e-10);
    const kelly = means[i] > 0 ? means[i] / variance : 0;
    const capped = clamp(kelly, 0, KELLY_MAX_FRACTION);
    raw.push({ symbol: symbols[i], fraction: Math.round(capped * 1000) / 1000 });
    rawW.push(capped);
  }

  const sum = rawW.reduce((s, v) => s + v, 0);
  const weights = sum > 0 ? projectWeights(rawW.map((v) => v / sum), maxW) : new Array(n).fill(1 / n);

  return {
    rawKellyFractions: raw,
    cappedWeights: toSymbolWeights(symbols, markets, weights),
    maxKellyFraction: KELLY_MAX_FRACTION,
    noteJa: `Kelly上限 ${KELLY_MAX_FRACTION * 100}%/銘柄 · 単一ウェイト上限 ${KELLY_MAX_SINGLE_WEIGHT_PCT}%`,
  };
}

/** レジーム別株式スケール */
export function applyRegimeScaling(
  weights: number[],
  regimeId: MarketRegimeId,
): { weights: number[]; cashPct: number; noteJa: string } {
  const mult = clamp(REGIME_RISK_MULTIPLIER[regimeId] ?? 1, 0.35, REGIME_EQUITY_SCALE_CAP);
  const scaled = weights.map((w) => w * mult);
  const equitySum = scaled.reduce((s, v) => s + v, 0);
  const cashPct = Math.round((1 - equitySum) * 1000) / 10;
  const normalized =
    equitySum > 0 ? scaled.map((w) => w / equitySum) : weights;
  return {
    weights: normalized,
    cashPct: Math.max(0, cashPct),
    noteJa: `レジーム「${regimeId}」— 株式スケール ${(mult * 100).toFixed(0)}% · 推奨現金 ${cashPct}%`,
  };
}

/** ターンオーバー制約付きリバランス */
export function applyTurnoverConstrainedRebalance(params: {
  symbols: string[];
  markets: Market[];
  currentPct: Map<string, number>;
  targetWeights: number[];
  maxTurnoverPct: number;
}): TurnoverConstrainedRebalance {
  const { symbols, markets, currentPct, targetWeights, maxTurnoverPct } = params;
  const current = symbols.map((s) => (currentPct.get(s) ?? 0) / 100);
  const target = targetWeights;
  const delta = target.map((t, i) => t - current[i]);
  let l1 = delta.reduce((s, d) => s + Math.abs(d), 0) * 100;
  const maxL1 = maxTurnoverPct / 100;

  let feasible = [...target];
  if (l1 > maxTurnoverPct) {
    const scale = maxL1 / (l1 / 100);
    feasible = current.map((c, i) => c + delta[i] * scale);
    const sum = feasible.reduce((s, v) => s + v, 0);
    if (sum > 0) feasible = feasible.map((v) => v / sum);
    l1 = maxTurnoverPct;
  }

  const actions = symbols.map((symbol, i) => {
    const cur = Math.round(current[i] * 1000) / 10;
    const tgt = Math.round(target[i] * 1000) / 10;
    const feas = Math.round(feasible[i] * 1000) / 10;
    const d = Math.round((feas - cur) * 10) / 10;
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    if (d > 1) action = 'buy';
    else if (d < -1) action = 'sell';
    return { symbol, currentPct: cur, targetPct: tgt, feasiblePct: feas, deltaPct: d, action };
  });

  return {
    maxTurnoverPct,
    turnoverUsedPct: Math.round(l1 * 10) / 10,
    feasibleWeights: toSymbolWeights(symbols, markets, feasible),
    actions,
    noteJa:
      l1 >= maxTurnoverPct * 0.95
        ? `ターンオーバー上限 ${maxTurnoverPct}% に達するまで段階リバランス`
        : `ターンオーバー ${Math.round(l1 * 10) / 10}% / 上限 ${maxTurnoverPct}%`,
  };
}

/** ベータ・セクター中立化（ロングオンリー） */
export function applyExposureNeutralAdjust(params: {
  weights: number[];
  betas: number[];
  sectors: string[];
}): { weights: number[]; result: ExposureNeutralResult } {
  const { betas, sectors } = params;
  let w = [...params.weights];
  const n = w.length;

  const betaBefore = dot(w, betas);
  const sectorWeights = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    sectorWeights.set(sectors[i], (sectorWeights.get(sectors[i]) ?? 0) + w[i]);
  }
  const sectorVals = [...sectorWeights.values()];
  const imbBefore =
    sectorVals.length > 0
      ? Math.max(...sectorVals) - Math.min(...sectorVals)
      : 0;

  const target = TARGET_PORTFOLIO_BETA;
  for (let pass = 0; pass < 12; pass++) {
    const portBeta = dot(w, betas);
    if (Math.abs(portBeta - target) < 0.05) break;
    const adj = target / Math.max(portBeta, 0.3);
    w = w.map((wi, i) => wi * (1 + (adj - 1) * (betas[i] / Math.max(betas[i], 0.5))));
    const sum = w.reduce((s, v) => s + v, 0);
    if (sum > 0) w = w.map((v) => v / sum);
  }

  const sectorSet = [...new Set(sectors)];
  const targetSector = 1 / Math.max(1, sectorSet.length);
  for (let pass = 0; pass < 8; pass++) {
    const sw = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      sw.set(sectors[i], (sw.get(sectors[i]) ?? 0) + w[i]);
    }
    for (let i = 0; i < n; i++) {
      const cur = sw.get(sectors[i]) ?? 0;
      if (cur > targetSector * 1.35) w[i] *= 0.92;
      else if (cur < targetSector * 0.65) w[i] *= 1.06;
    }
    const sum = w.reduce((s, v) => s + v, 0);
    if (sum > 0) w = w.map((v) => v / sum);
  }

  const betaAfter = dot(w, betas);
  const sw2 = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    sw2.set(sectors[i], (sw2.get(sectors[i]) ?? 0) + w[i]);
  }
  const sv2 = [...sw2.values()];
  const imbAfter = sv2.length > 0 ? Math.max(...sv2) - Math.min(...sv2) : 0;

  return {
    weights: w,
    result: {
      portfolioBetaBefore: Math.round(betaBefore * 100) / 100,
      portfolioBetaAfter: Math.round(betaAfter * 100) / 100,
      targetBeta: TARGET_PORTFOLIO_BETA,
      sectorImbalanceBefore: Math.round(imbBefore * 1000) / 10,
      sectorImbalanceAfter: Math.round(imbAfter * 1000) / 10,
      noteJa: `ベータ ${betaBefore.toFixed(2)}→${betaAfter.toFixed(2)} · セクター格差 ${imbBefore.toFixed(1)}→${imbAfter.toFixed(1)}`,
    },
  };
}

/** モンテカルロ頑健性スコア */
export function scoreMonteCarloRobustness(
  weights: number[],
  returnMatrix: number[][],
): MonteCarloRobustnessResult {
  const n = returnMatrix.length;
  const T = returnMatrix[0]?.length ?? 0;
  if (n === 0 || T < OPT_MC_HORIZON_DAYS + 10) {
    return {
      paths: 0,
      medianReturnPct: 0,
      p5ReturnPct: 0,
      p95ReturnPct: 0,
      probLossPct: 100,
      medianSharpe: 0,
      robustnessScore: 0,
      noteJa: '履歴不足のためモンテカルロ未実行',
    };
  }

  const pathReturns: number[] = [];
  const pathSharpes: number[] = [];

  for (let p = 0; p < OPT_MC_PATHS; p++) {
    const daily: number[] = [];
    let idx = Math.floor(Math.random() * (T - OPT_MC_BLOCK_SIZE));
    while (daily.length < OPT_MC_HORIZON_DAYS) {
      for (let b = 0; b < OPT_MC_BLOCK_SIZE && daily.length < OPT_MC_HORIZON_DAYS; b++) {
        const t = Math.min(idx + b, T - 1);
        let pr = 0;
        for (let i = 0; i < n; i++) pr += weights[i] * returnMatrix[i][t];
        daily.push(pr);
      }
      idx = Math.floor(Math.random() * (T - OPT_MC_BLOCK_SIZE));
    }
    const cum = daily.reduce((acc, r) => acc * (1 + r), 1);
    pathReturns.push((cum - 1) * 100);
    pathSharpes.push(sharpeFromReturns(daily));
  }

  pathReturns.sort((a, b) => a - b);
  const median = pathReturns[Math.floor(pathReturns.length / 2)];
  const p5 = pathReturns[Math.floor(pathReturns.length * 0.05)];
  const p95 = pathReturns[Math.floor(pathReturns.length * 0.95)];
  const probLoss = (pathReturns.filter((r) => r < 0).length / pathReturns.length) * 100;
  pathSharpes.sort((a, b) => a - b);
  const medSharpe = pathSharpes[Math.floor(pathSharpes.length / 2)];

  let score = 50;
  score += clamp(median, -10, 10) * 2;
  score += clamp(p5, -20, 5) * 1.5;
  score -= probLoss * 0.25;
  score += clamp(medSharpe, -1, 2) * 10;
  score = clamp(Math.round(score), 0, 100);

  return {
    paths: OPT_MC_PATHS,
    medianReturnPct: Math.round(median * 10) / 10,
    p5ReturnPct: Math.round(p5 * 10) / 10,
    p95ReturnPct: Math.round(p95 * 10) / 10,
    probLossPct: Math.round(probLoss * 10) / 10,
    medianSharpe: Math.round(medSharpe * 100) / 100,
    robustnessScore: score,
    noteJa:
      score >= ROBUSTNESS_SCORE_PASS
        ? `頑健性スコア ${score}/100 — カオス下でも許容範囲`
        : `頑健性スコア ${score}/100 — 配分の見直しを推奨`,
  };
}

function buildAllocation(
  methodId: OptimizationMethodId,
  methodLabelJa: string,
  symbols: string[],
  markets: Market[],
  weights: number[],
  cov: number[][],
  returnMatrix: number[][],
  cashPct: number,
  noteJa: string,
): OptimizedAllocation {
  const means = rowMeans(returnMatrix);
  const vol = portfolioVol(weights, cov);
  const expRet = portfolioMeanReturn(weights, means);
  const T = returnMatrix[0]?.length ?? 0;
  const portRets: number[] = [];
  for (let t = 0; t < T; t++) {
    let pr = 0;
    for (let i = 0; i < symbols.length; i++) pr += weights[i] * returnMatrix[i][t];
    portRets.push(pr);
  }
  const cvar = cvarFromScenarios(portRets, CVAR_ALPHA);
  const sharpe = sharpeFromReturns(portRets);

  return {
    methodId,
    methodLabelJa,
    weights: toSymbolWeights(symbols, markets, weights),
    cashWeightPct: cashPct,
    expectedVolPct: Math.round(vol * 10) / 10,
    expectedReturnPct: Math.round(expRet * 10) / 10,
    cvar95Pct: Math.round(cvar * 10) / 10,
    sharpe: Math.round(sharpe * 100) / 100,
    noteJa,
  };
}

function pickRecommended(
  allocations: OptimizedAllocation[],
  regimeId: MarketRegimeId,
  mcScore: number,
): OptimizationMethodId {
  if (regimeId === 'risk_off' || regimeId === 'recession_fear' || regimeId === 'high_volatility') {
    const mv = allocations.find((a) => a.methodId === 'min_variance');
    if (mv) return 'min_variance';
  }
  if (mcScore < ROBUSTNESS_SCORE_PASS) {
    const cvar = allocations.find((a) => a.methodId === 'cvar');
    if (cvar) return 'cvar';
  }
  const blend = allocations.find((a) => a.methodId === 'regime_blend');
  return blend?.methodId ?? allocations[0]?.methodId ?? 'risk_parity';
}

/** 機関投資家ポートフォリオ最適化メイン */
export function runPortfolioOptimization(
  input: PortfolioOptimizationInput,
  dataSource: PortfolioOptimizationReport['dataSource'],
): PortfolioOptimizationReport {
  const {
    symbols,
    markets,
    returnMatrix,
    currentWeightsPct,
    liquidityMaxPct,
    betas,
    sectors,
    regimeId,
    maxTurnoverPct = DEFAULT_MAX_REBALANCE_TURNOVER_PCT,
  } = input;

  const n = symbols.length;
  const maxW = symbols.map(
    (s) =>
      (liquidityMaxPct.get(s) ?? DEFAULT_MAX_SINGLE_WEIGHT_PCT) / 100,
  );
  const betaArr = symbols.map((s) => betas.get(s) ?? 1);
  const sectorArr = symbols.map((s) => sectors.get(s) ?? 'unknown');

  const covariance = estimateCovariance(symbols, returnMatrix);
  const cov = covariance.shrunkCov;
  const means = rowMeans(returnMatrix);

  const rpW = computeRiskParityWeights(cov, maxW);
  const mvW = computeMinimumVarianceWeights(cov, maxW);
  const cvarW = computeCvarOptimizedWeights(returnMatrix, maxW);
  const kelly = computeKellyConstrainedWeights(symbols, markets, means, cov);
  const kellyW = kelly.cappedWeights.map((w) => w.weightPct / 100);

  const blendBase = rpW.map((v, i) => v * 0.35 + mvW[i] * 0.35 + cvarW[i] * 0.2 + kellyW[i] * 0.1);
  const regimeScaled = applyRegimeScaling(projectWeights(blendBase, maxW), regimeId);
  const neutral = applyExposureNeutralAdjust({
    weights: regimeScaled.weights,
    betas: betaArr,
    sectors: sectorArr,
  });

  const allocations: OptimizedAllocation[] = [
    buildAllocation(
      'risk_parity',
      'リスクパリティ',
      symbols,
      markets,
      rpW,
      cov,
      returnMatrix,
      0,
      '各資産のリスク寄与を均等化',
    ),
    buildAllocation(
      'min_variance',
      '最小分散',
      symbols,
      markets,
      mvW,
      cov,
      returnMatrix,
      0,
      '収縮共分散に基づく最小ボラティリティ',
    ),
    buildAllocation(
      'cvar',
      'CVaR最適化',
      symbols,
      markets,
      cvarW,
      cov,
      returnMatrix,
      0,
      `左尾 ${(CVAR_ALPHA * 100).toFixed(0)}% CVaR を最小化`,
    ),
    buildAllocation(
      'kelly_capped',
      'Kelly制約',
      symbols,
      markets,
      kellyW,
      cov,
      returnMatrix,
      0,
      kelly.noteJa,
    ),
    buildAllocation(
      'regime_blend',
      'レジーム・ブレンド',
      symbols,
      markets,
      neutral.weights,
      cov,
      returnMatrix,
      regimeScaled.cashPct,
      `${regimeScaled.noteJa} · ${neutral.result.noteJa}`,
    ),
  ];

  const mc = scoreMonteCarloRobustness(neutral.weights, returnMatrix);
  const recommendedMethodId = pickRecommended(allocations, regimeId, mc.robustnessScore);
  const recommended = allocations.find((a) => a.methodId === recommendedMethodId)!;

  const turnoverRebalance = applyTurnoverConstrainedRebalance({
    symbols,
    markets,
    currentPct: currentWeightsPct,
    targetWeights: neutral.weights,
    maxTurnoverPct,
  });

  const pass =
    mc.robustnessScore >= ROBUSTNESS_SCORE_PASS &&
    recommended.cvar95Pct < 25 &&
    covariance.conditionNumber < 80;

  return {
    generatedAt: new Date().toISOString(),
    dataSource,
    tradingDays: returnMatrix[0]?.length ?? 0,
    covariance,
    allocations,
    recommendedMethodId,
    recommendedWeights: recommended.weights,
    kelly,
    regimeNoteJa: regimeScaled.noteJa,
    turnoverRebalance,
    exposureNeutral: neutral.result,
    monteCarloRobustness: mc,
    verdictJa: pass
      ? `機関最適化: ${recommended.methodLabelJa} を推奨 — 頑健性 ${mc.robustnessScore}/100`
      : `要再検討 — 頑健性 ${mc.robustnessScore}/100 · CVaR ${recommended.cvar95Pct}%`,
  };
}
