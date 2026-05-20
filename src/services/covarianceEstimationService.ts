import {
  SHRINKAGE_MAX,
  SHRINKAGE_MIN,
} from '../constants/portfolioOptimization';
import type { CovarianceEstimate } from '../types/portfolioOptimization';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** n銘柄 × T日 のリターン行列から標本共分散 */
export function sampleCovarianceMatrix(returnMatrix: number[][]): number[][] {
  const n = returnMatrix.length;
  const T = returnMatrix[0]?.length ?? 0;
  if (n === 0 || T < 2) return [];

  const means = returnMatrix.map((row) => row.reduce((s, r) => s + r, 0) / T);
  const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let c = 0;
      for (let t = 0; t < T; t++) {
        c += (returnMatrix[i][t] - means[i]) * (returnMatrix[j][t] - means[j]);
      }
      c /= Math.max(1, T - 1);
      cov[i][j] = c;
      cov[j][i] = c;
    }
  }
  return cov;
}

/** Ledoit-Wolf（対角ターゲット収縮） */
export function ledoitWolfShrinkage(
  sampleCov: number[][],
  returnMatrix: number[][],
): { shrunk: number[][]; intensity: number } {
  const n = sampleCov.length;
  const T = returnMatrix[0]?.length ?? 0;
  if (n === 0) return { shrunk: [], intensity: 0 };

  const meanVar = sampleCov.reduce((s, row, i) => s + row[i], 0) / n;
  const target: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? meanVar : 0)),
  );

  let gamma = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const d = sampleCov[i][j] - target[i][j];
      gamma += d * d;
    }
  }

  let pi = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let phi = 0;
      for (let t = 0; t < T; t++) {
        const ri = returnMatrix[i][t] - returnMatrix[i].reduce((a, b) => a + b, 0) / T;
        const rj = returnMatrix[j][t] - returnMatrix[j].reduce((a, b) => a + b, 0) / T;
        const sij = ri * rj;
        const sample = sampleCov[i][j];
        phi += (sij - sample) ** 2;
      }
      pi += phi / T;
    }
  }

  const kappa = gamma > 1e-12 ? pi / gamma : 0;
  const intensity = clamp(kappa / Math.max(1, T), SHRINKAGE_MIN, SHRINKAGE_MAX);

  const shrunk: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      shrunk[i][j] = intensity * target[i][j] + (1 - intensity) * sampleCov[i][j];
    }
  }
  return { shrunk, intensity };
}

function conditionNumber(matrix: number[][]): number {
  const n = matrix.length;
  if (n === 0) return 0;
  let maxEig = 0;
  let minEig = Infinity;
  for (let i = 0; i < n; i++) {
    const eig = matrix[i][i];
    maxEig = Math.max(maxEig, eig);
    minEig = Math.min(minEig, Math.max(eig, 1e-10));
  }
  return Math.round((maxEig / minEig) * 10) / 10;
}

function avgPairwiseCorrelation(cov: number[][]): number {
  const n = cov.length;
  if (n < 2) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const vi = Math.sqrt(Math.max(cov[i][i], 1e-12));
      const vj = Math.sqrt(Math.max(cov[j][j], 1e-12));
      sum += cov[i][j] / (vi * vj);
      count++;
    }
  }
  return count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
}

export function estimateCovariance(
  symbols: string[],
  returnMatrix: number[][],
): CovarianceEstimate {
  const sampleCov = sampleCovarianceMatrix(returnMatrix);
  const { shrunk, intensity } = ledoitWolfShrinkage(sampleCov, returnMatrix);
  const cond = conditionNumber(shrunk);
  const corr = avgPairwiseCorrelation(shrunk);

  return {
    symbols,
    sampleCov,
    shrunkCov: shrunk,
    shrinkageIntensity: Math.round(intensity * 1000) / 1000,
    conditionNumber: cond,
    avgPairwiseCorr: corr,
    noteJa:
      cond > 50
        ? `共分散は収縮済み（λ=${intensity.toFixed(2)}）— 条件数が高め（${cond}）`
        : `Ledoit-Wolf収縮 λ=${intensity.toFixed(2)} · 平均相関 ${corr}`,
  };
}

/** Gauss-Jordan 逆行列（小規模 n≤15） */
export function invertMatrix(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  if (n === 0) return null;
  const a = matrix.map((row, i) => {
    const extended = row.map((v) => v);
    for (let j = 0; j < n; j++) extended.push(i === j ? 1 : 0);
    return extended;
  });

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];

    const div = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= div;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = 0; j < 2 * n; j++) a[row][j] -= factor * a[col][j];
    }
  }

  return a.map((row) => row.slice(n));
}

export function matVec(matrix: number[][], vec: number[]): number[] {
  return matrix.map((row) => row.reduce((s, v, j) => s + v * vec[j], 0));
}

export function dot(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

export function portfolioVol(weights: number[], cov: number[][]): number {
  const sigmaW = matVec(cov, weights);
  return Math.sqrt(Math.max(0, dot(weights, sigmaW))) * Math.sqrt(252) * 100;
}

export function portfolioMeanReturn(weights: number[], means: number[]): number {
  return dot(weights, means) * 252 * 100;
}
