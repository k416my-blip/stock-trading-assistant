import { REGIME_SECTOR_GUIDANCE } from '../constants/marketRegime';
import {
  BL_RISK_AVERSION,
  BL_TAU,
  BL_VIEW_CONFIDENCE_BASE,
} from '../constants/bayesianAllocation';
import type { MarketRegimeId, SectorTheme } from '../types/marketRegime';
import type { BlackLittermanResult } from '../types/bayesianAllocation';
import type { SymbolWeight } from '../types/portfolioOptimization';
import { dot, invertMatrix, matVec } from './covarianceEstimationService';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function projectWeights(w: number[], maxW: number[]): number[] {
  const n = w.length;
  let x = w.map((wi, i) => clamp(wi, 0, maxW[i] ?? 1));
  const sum = x.reduce((s, v) => s + v, 0);
  if (sum <= 0) return new Array(n).fill(1 / n);
  return x.map((v) => v / sum);
}

function toSymbolWeights(
  symbols: string[],
  markets: import('../types').Market[],
  weights: number[],
): SymbolWeight[] {
  return symbols.map((symbol, i) => ({
    symbol,
    market: markets[i],
    weightPct: Math.round(weights[i] * 1000) / 10,
  }));
}

/** 均衡リターン π = δ Σ w_eq */
function equilibriumReturns(cov: number[][], wEq: number[], delta: number): number[] {
  const sigmaW = matVec(cov, wEq);
  return sigmaW.map((v) => delta * v);
}

/** レジームに基づくビュー Q（年率換算の日次期待リターン調整） */
function buildRegimeViews(
  symbols: string[],
  sectors: string[],
  regimeId: MarketRegimeId,
  regimeConfidence: number,
): { Q: number[]; omegaDiag: number[] } {
  const guidance = REGIME_SECTOR_GUIDANCE[regimeId];
  const preferred = new Set(guidance.preferred);
  const avoid = new Set(guidance.avoid);
  const conf = clamp(regimeConfidence / 100, 0.3, 1);

  const Q: number[] = [];
  const omegaDiag: number[] = [];

  for (let i = 0; i < symbols.length; i++) {
    const sector = sectors[i] as SectorTheme;
    let view = 0;
    if (preferred.has(sector)) view = 0.0004 * conf;
    else if (avoid.has(sector)) view = -0.0003 * conf;
    Q.push(view);
    const baseOmega = (1 - BL_VIEW_CONFIDENCE_BASE) / conf;
    omegaDiag.push(baseOmega * 0.0001);
  }
  return { Q, omegaDiag };
}

/**
 * Black-Litterman 事後期待リターン
 * μ_BL = [(τΣ)⁻¹ + P'Ω⁻¹P]⁻¹ [(τΣ)⁻¹π + P'Ω⁻¹Q]
 * P = I（各資産に直接ビュー）
 */
export function computeBlackLitterman(params: {
  symbols: string[];
  markets: import('../types').Market[];
  cov: number[][];
  wEq: number[];
  maxW: number[];
  regimeId: MarketRegimeId;
  sectors: string[];
  regimeConfidence: number;
  tau?: number;
  delta?: number;
}): BlackLittermanResult {
  const {
    symbols,
    markets,
    cov,
    wEq,
    maxW,
    regimeId,
    sectors,
    regimeConfidence,
    tau = BL_TAU,
    delta = BL_RISK_AVERSION,
  } = params;
  const n = symbols.length;
  if (n === 0) {
    return {
      tau,
      priorReturns: [],
      posteriorReturns: [],
      viewConfidence: 0,
      weights: [],
      noteJa: '銘柄なし',
    };
  }

  const pi = equilibriumReturns(cov, wEq, delta);
  const { Q, omegaDiag } = buildRegimeViews(symbols, sectors, regimeId, regimeConfidence);

  const tauSigma: number[][] = cov.map((row, i) =>
    row.map((v, j) => tau * v),
  );
  const invTauSigma = invertMatrix(tauSigma);
  if (!invTauSigma) {
    const w = projectWeights(wEq, maxW);
    return {
      tau,
      priorReturns: pi.map((r) => Math.round(r * 25200) / 100),
      posteriorReturns: pi.map((r) => Math.round(r * 25200) / 100),
      viewConfidence: regimeConfidence,
      weights: toSymbolWeights(symbols, markets, w),
      noteJa: '逆行列失敗 — 均衡ウェイトにフォールバック',
    };
  }

  const posterior: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let num = 0;
    let den = 0;
    for (let j = 0; j < n; j++) {
      num += invTauSigma[i][j] * pi[j];
      den += invTauSigma[i][j];
    }
    const omega = omegaDiag[i];
    num += Q[i] / omega;
    den += 1 / omega;
    posterior[i] = den > 0 ? num / den : pi[i];
  }

  const invCov = invertMatrix(cov);
  let weights: number[];
  if (invCov) {
    const excess = posterior.map((mu) => mu / delta);
    const raw = matVec(invCov, excess);
    const sum = raw.reduce((s, v) => s + Math.max(v, 0), 0);
    weights =
      sum > 0
        ? projectWeights(
            raw.map((v) => Math.max(v, 0) / sum),
            maxW,
          )
        : projectWeights(wEq, maxW);
  } else {
    weights = projectWeights(wEq, maxW);
  }

  return {
    tau,
    priorReturns: pi.map((r) => Math.round(r * 25200) / 100),
    posteriorReturns: posterior.map((r) => Math.round(r * 25200) / 100),
    viewConfidence: Math.round(regimeConfidence),
    weights: toSymbolWeights(symbols, markets, weights),
    noteJa: `τ=${tau} · レジーム「${regimeId}」ビュー — 事後リターンでMVO`,
  };
}

export function meanVarianceWeights(
  mu: number[],
  cov: number[][],
  maxW: number[],
): number[] {
  const n = mu.length;
  const inv = invertMatrix(cov);
  if (!inv) return new Array(n).fill(1 / n);
  const raw = matVec(inv, mu);
  const pos = raw.map((v) => Math.max(v, 0));
  const sum = pos.reduce((s, v) => s + v, 0);
  if (sum <= 0) return new Array(n).fill(1 / n);
  return projectWeights(
    pos.map((v) => v / sum),
    maxW,
  );
}

export { dot, projectWeights, toSymbolWeights };
