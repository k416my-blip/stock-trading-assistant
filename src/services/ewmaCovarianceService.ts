import {
  EWMA_HALFLIFE_DAYS,
  EWMA_LAMBDA,
  ROLLING_SHRINK_STEP,
  ROLLING_SHRINK_WINDOW,
} from '../constants/bayesianAllocation';
import type { EwmaCovarianceResult, RollingShrinkageResult } from '../types/bayesianAllocation';
import { ledoitWolfShrinkage, sampleCovarianceMatrix } from './covarianceEstimationService';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** EWMA共分散 Σ_t = λ Σ_{t-1} + (1-λ) r_t r_t' */
export function computeEwmaCovariance(
  returnMatrix: number[][],
  lambda: number = EWMA_LAMBDA,
): EwmaCovarianceResult {
  const n = returnMatrix.length;
  const T = returnMatrix[0]?.length ?? 0;
  if (n === 0 || T < 2) {
    return {
      lambda,
      matrix: [],
      halflifeDays: EWMA_HALFLIFE_DAYS,
      noteJa: '履歴不足',
    };
  }

  let cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let t = 0; t < T; t++) {
    const r = returnMatrix.map((row) => row[t]);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        cov[i][j] = lambda * cov[i][j] + (1 - lambda) * r[i] * r[j];
      }
    }
  }

  return {
    lambda,
    matrix: cov,
    halflifeDays: EWMA_HALFLIFE_DAYS,
    noteJa: `EWMA λ=${lambda} · 半減期約${EWMA_HALFLIFE_DAYS}日 — 直近ボラに敏感`,
  };
}

/** ローリングウィンドウ Ledoit-Wolf 収縮の平均 */
export function computeRollingShrinkageCovariance(
  returnMatrix: number[][],
  windowDays: number = ROLLING_SHRINK_WINDOW,
  step: number = ROLLING_SHRINK_STEP,
): RollingShrinkageResult {
  const n = returnMatrix.length;
  const T = returnMatrix[0]?.length ?? 0;
  if (n === 0 || T < windowDays) {
    const fallback = sampleCovarianceMatrix(returnMatrix);
    const { shrunk, intensity } = ledoitWolfShrinkage(fallback, returnMatrix);
    return {
      windowDays,
      windowsUsed: 1,
      avgShrinkageIntensity: intensity,
      matrix: shrunk,
      noteJa: '履歴不足 — 全期間収縮を使用',
    };
  }

  const accum: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  let windowsUsed = 0;
  let shrinkSum = 0;

  for (let start = T - windowDays; start >= 0; start -= step) {
    const slice = returnMatrix.map((row) => row.slice(start, start + windowDays));
    const sample = sampleCovarianceMatrix(slice);
    const { shrunk, intensity } = ledoitWolfShrinkage(sample, slice);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        accum[i][j] += shrunk[i][j];
      }
    }
    shrinkSum += intensity;
    windowsUsed++;
    if (start < step) break;
  }

  const matrix = accum.map((row) => row.map((v) => v / windowsUsed));
  const avgShrinkageIntensity = Math.round((shrinkSum / windowsUsed) * 1000) / 1000;

  return {
    windowDays,
    windowsUsed,
    avgShrinkageIntensity,
    matrix,
    noteJa: `${windowsUsed}ウィンドウ（${windowDays}日）の収縮共分散を平均 — λ̄=${avgShrinkageIntensity}`,
  };
}

export function annualizedVolFromCov(cov: number[][], weights: number[]): number {
  let v = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      v += weights[i] * weights[j] * cov[i][j];
    }
  }
  return Math.sqrt(Math.max(0, v)) * Math.sqrt(252) * 100;
}

export function clampCovariance(cov: number[][]): number[][] {
  const n = cov.length;
  return cov.map((row, i) =>
    row.map((v, j) => {
      if (i === j) return Math.max(v, 1e-8);
      return v;
    }),
  );
}

export function blendMatrices(a: number[][], b: number[][], wA: number): number[][] {
  const n = a.length;
  const w = clamp(wA, 0, 1);
  return a.map((row, i) => row.map((v, j) => w * v + (1 - w) * b[i][j]));
}
