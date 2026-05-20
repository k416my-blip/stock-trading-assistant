import {
  EXECUTION_DELAY_DAYS,
  GAP_RISK_THRESHOLD_PCT,
  LIQUIDITY_VACUUM_EXTRA_SLIPPAGE_BPS,
  LIQUIDITY_VACUUM_VOLUME_PERCENTILE,
  MONTE_CARLO_BLOCK_SIZE,
  MONTE_CARLO_PATHS,
  PSYCHOLOGICAL_BREAKPOINTS_PCT,
  REGIME_INSTABILITY_WINDOW,
  REGIME_TRANSITION_THRESHOLD,
  TAIL_EVENT_SIGMA,
  TAIL_INJECTION_DAYS,
} from '../constants/quantValidation';
import { RISK_FREE_RATE_ANNUAL } from '../constants/historicalSimulation';
import { REGIME_RISK_MULTIPLIER } from '../constants/marketRegime';
import { SAMPLE_STOCKS } from '../data/sampleStocks';
import type {
  ExecutionDelayResult,
  GapRiskResult,
  LiquidityVacuumResult,
  MonteCarloResult,
  OHLCVDataset,
  PsychologicalStressResult,
  RegimeInstabilityResult,
  TailEventResult,
} from '../types/quantValidation';
import type { MarketRegimeId } from '../types/marketRegime';

type BarIndex = Map<string, Map<string, { adjClose: number; open: number; volume: number }>>;

function buildBarIndex(dataset: OHLCVDataset): { index: BarIndex; dates: string[] } {
  const index: BarIndex = new Map();
  const dateSet = new Set<string>(dataset.alignedDates);
  for (const s of dataset.series) {
    const m = new Map<string, { adjClose: number; open: number; volume: number }>();
    for (const b of s.bars) {
      if (dateSet.size === 0 || dateSet.has(b.date)) {
        m.set(b.date, { adjClose: b.adjClose, open: b.open, volume: b.volume });
      }
    }
    index.set(s.symbol, m);
  }
  const dates =
    dataset.alignedDates.length > 0
      ? [...dataset.alignedDates]
      : [...dateSet].sort();
  return { index, dates };
}

function classifyRegime(avgRet: number, vol: number, breadth: number): MarketRegimeId {
  if (vol > 0.025 && breadth < 0.4) return 'high_volatility';
  if (avgRet < -0.002 && vol > 0.018) return 'risk_off';
  if (avgRet > 0.002 && breadth > 0.55) return 'risk_on';
  return 'recovery_phase';
}

function simulatePortfolio(
  dataset: OHLCVDataset,
  signalLagDays: number,
  extraSlippageBps = 0,
): {
  equity: number[];
  regimes: MarketRegimeId[];
  gaps: number[];
  volumes: number[];
  dailyRets: number[];
} {
  const { index, dates } = buildBarIndex(dataset);
  const symbols = dataset.series.map((s) => s.symbol);
  const stocks = SAMPLE_STOCKS.filter((s) => symbols.includes(s.symbol));
  const equity = [1];
  const regimes: MarketRegimeId[] = [];
  const gaps: number[] = [];
  const volumes: number[] = [];
  const dailyRets: number[] = [];

  let holdings = new Map<string, number>();

  for (let d = 1; d < dates.length; d++) {
    const date = dates[d];
    const prevDate = dates[d - 1];

    let dayRet = 0;
    let gapSum = 0;
    let volSum = 0;
    let n = 0;
    const symRets: number[] = [];

    for (const sym of symbols) {
      const cur = index.get(sym)?.get(date);
      const prev = index.get(sym)?.get(prevDate);
      if (!cur || !prev || prev.adjClose <= 0) continue;
      const r = cur.adjClose / prev.adjClose - 1;
      symRets.push(r);
      const gap = prev.adjClose > 0 ? Math.abs(cur.open / prev.adjClose - 1) * 100 : 0;
      gapSum += gap;
      volSum += cur.volume;
      n += 1;
    }

    const avgRet = symRets.length ? symRets.reduce((a, b) => a + b, 0) / symRets.length : 0;
    const vol =
      symRets.length > 1
        ? Math.sqrt(symRets.reduce((s, r) => s + r * r, 0) / symRets.length)
        : 0;
    const breadth = symRets.filter((r) => r > 0).length / Math.max(symRets.length, 1);
    const regime = classifyRegime(avgRet, vol, breadth);
    regimes.push(regime);

    if (d % 21 === 0 || holdings.size === 0) {
      const lagDate = dates[Math.max(0, d - signalLagDays)] ?? date;
      const scored = stocks
        .map((st) => {
          const b = index.get(st.symbol)?.get(lagDate);
          const b0 = index.get(st.symbol)?.get(dates[Math.max(0, d - 21)] ?? lagDate);
          const mom = b && b0 && b0.adjClose > 0 ? b.adjClose / b0.adjClose - 1 : 0;
          return { sym: st.symbol, mom };
        })
        .sort((a, b) => b.mom - a.mom)
        .slice(0, 6);
      const mult = REGIME_RISK_MULTIPLIER[regime] ?? 0.85;
      holdings = new Map();
      const w = mult / Math.max(scored.length, 1);
      for (const s of scored) holdings.set(s.sym, w);
    }

    for (const [sym, w] of holdings) {
      const cur = index.get(sym)?.get(date);
      const prev = index.get(sym)?.get(prevDate);
      if (cur && prev && prev.adjClose > 0) {
        dayRet += w * (cur.adjClose / prev.adjClose - 1);
      }
    }

    dayRet -= (8 + extraSlippageBps) / 10000;
    dailyRets.push(dayRet);
    equity.push(equity[equity.length - 1] * (1 + dayRet));
    gaps.push(n > 0 ? gapSum / n : 0);
    volumes.push(n > 0 ? volSum / n : 0);
  }

  return { equity, regimes, gaps, volumes, dailyRets };
}

function sharpeFromRets(rets: number[]): number {
  if (rets.length < 2) return 0;
  const rf = RISK_FREE_RATE_ANNUAL / 252;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const std = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length);
  return std > 0 ? ((mean - rf) / std) * Math.sqrt(252) : 0;
}

function annualizedReturn(equity: number[]): number {
  if (equity.length < 2) return 0;
  const total = equity[equity.length - 1] / equity[0];
  const years = (equity.length - 1) / 252;
  return years > 0 ? (Math.pow(total, 1 / years) - 1) * 100 : 0;
}

export function testRegimeInstability(dataset: OHLCVDataset): RegimeInstabilityResult {
  const { regimes, dailyRets } = simulatePortfolio(dataset, 0);
  let transitions = 0;
  for (let i = 1; i < regimes.length; i++) {
    if (regimes[i] !== regimes[i - 1]) transitions += 1;
  }

  const unstableRets: number[] = [];
  const stableRets: number[] = [];
  for (let i = REGIME_INSTABILITY_WINDOW; i < regimes.length; i++) {
    let localTrans = 0;
    for (let j = i - REGIME_INSTABILITY_WINDOW + 1; j <= i; j++) {
      if (j > 0 && regimes[j] !== regimes[j - 1]) localTrans += 1;
    }
    const r = dailyRets[i] ?? 0;
    if (localTrans >= REGIME_TRANSITION_THRESHOLD) unstableRets.push(r);
    else stableRets.push(r);
  }

  const stdU =
    unstableRets.length > 1
      ? Math.sqrt(
          unstableRets.reduce((s, r) => s + r ** 2, 0) / unstableRets.length -
            (unstableRets.reduce((a, b) => a + b, 0) / unstableRets.length) ** 2,
        )
      : 0;
  const stdS =
    stableRets.length > 1
      ? Math.sqrt(
          stableRets.reduce((s, r) => s + r ** 2, 0) / stableRets.length -
            (stableRets.reduce((a, b) => a + b, 0) / stableRets.length) ** 2,
        )
      : 0;

  const ratio = stdS > 0 ? stdU / stdS : stdU > 0 ? 2 : 1;

  return {
    transitionCount: transitions,
    unstablePeriods: unstableRets.length,
    returnStdDuringTransitions: Math.round(stdU * 10000) / 100,
    returnStdStable: Math.round(stdS * 10000) / 100,
    instabilityRatio: Math.round(ratio * 100) / 100,
    noteJa:
      ratio > 1.4
        ? 'レジーム遷移期はリターン分散が拡大 — ポジション縮小を推奨'
        : 'レジーム遷移は比較的安定',
  };
}

export function runMonteCarloPerturbation(dataset: OHLCVDataset): MonteCarloResult {
  const { dailyRets } = simulatePortfolio(dataset, 0);
  if (dailyRets.length < MONTE_CARLO_BLOCK_SIZE + 5) {
    return {
      paths: 0,
      medianReturnPct: 0,
      p5ReturnPct: 0,
      p95ReturnPct: 0,
      probLossPct: 0,
      noteJa: '履歴不足のためモンテカルロをスキップ',
    };
  }

  const pathReturns: number[] = [];
  const n = dailyRets.length;

  for (let p = 0; p < MONTE_CARLO_PATHS; p++) {
    let eq = 1;
    let i = 0;
    while (i < n) {
      const start = Math.floor(Math.random() * Math.max(1, n - MONTE_CARLO_BLOCK_SIZE));
      for (let b = 0; b < MONTE_CARLO_BLOCK_SIZE && i < n; b++, i++) {
        eq *= 1 + dailyRets[(start + b) % n];
      }
    }
    pathReturns.push((eq - 1) * 100);
  }

  pathReturns.sort((a, b) => a - b);
  const pct = (q: number) => pathReturns[Math.floor(pathReturns.length * q)] ?? 0;

  return {
    paths: MONTE_CARLO_PATHS,
    medianReturnPct: Math.round(pct(0.5) * 100) / 100,
    p5ReturnPct: Math.round(pct(0.05) * 100) / 100,
    p95ReturnPct: Math.round(pct(0.95) * 100) / 100,
    probLossPct: Math.round((pathReturns.filter((r) => r < 0).length / pathReturns.length) * 1000) / 10,
    noteJa: `ブロック・ブートストラップ ${MONTE_CARLO_PATHS}パス`,
  };
}

export function runTailEventSimulation(dataset: OHLCVDataset): TailEventResult[] {
  const { dailyRets } = simulatePortfolio(dataset, 0);
  const sorted = [...dailyRets].sort((a, b) => a - b);
  const sigma = Math.sqrt(
    dailyRets.reduce((s, r) => s + r ** 2, 0) / Math.max(dailyRets.length, 1),
  );
  const shock = -TAIL_EVENT_SIGMA * sigma;

  const scenarios = [
    { scenario: '単発テール', days: 1, mult: 1 },
    { scenario: '連続テール', days: TAIL_INJECTION_DAYS, mult: 1 },
    { scenario: 'フラッシュクラッシュ', days: 1, mult: 1.5 },
  ];

  return scenarios.map((sc) => {
    let eq = 1;
    for (let i = 0; i < dailyRets.length; i++) {
      let r = dailyRets[i];
      if (i < sc.days) r = shock * sc.mult;
      eq *= 1 + r;
    }
    const impact = (eq - 1) * 100;
    let peak = 1;
    let maxDd = 0;
    let e = 1;
    for (let i = 0; i < Math.min(sc.days + 5, dailyRets.length); i++) {
      e *= 1 + (i < sc.days ? shock * sc.mult : dailyRets[i]);
      peak = Math.max(peak, e);
      maxDd = Math.max(maxDd, ((peak - e) / peak) * 100);
    }
    return {
      scenario: sc.scenario,
      injectedShockPct: Math.round(shock * sc.mult * 10000) / 100,
      portfolioImpactPct: Math.round(impact * 100) / 100,
      maxDrawdownPct: Math.round(maxDd * 100) / 100,
      noteJa: `${sc.days}日間の${TAIL_EVENT_SIGMA}σショック注入`,
    };
  });
}

export function testExecutionDelays(dataset: OHLCVDataset): ExecutionDelayResult[] {
  const immediate = simulatePortfolio(dataset, 0);
  const immAnn = annualizedReturn(immediate.equity);
  const immSharpe = sharpeFromRets(immediate.dailyRets);

  return EXECUTION_DELAY_DAYS.map((delayDays) => {
    const sim = simulatePortfolio(dataset, delayDays);
    const ann = annualizedReturn(sim.equity);
    return {
      delayDays,
      annualizedReturnPct: Math.round(ann * 100) / 100,
      sharpe: Math.round(sharpeFromRets(sim.dailyRets) * 100) / 100,
      dragVsImmediatePct: Math.round((ann - immAnn) * 100) / 100,
    };
  });
}

export function analyzeGapRisk(dataset: OHLCVDataset): GapRiskResult {
  const { gaps, dailyRets } = simulatePortfolio(dataset, 0);
  const gapDays = gaps.filter((g) => g >= GAP_RISK_THRESHOLD_PCT).length;
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const maxGap = gaps.length ? Math.max(...gaps) : 0;
  const gapLoss = dailyRets
    .filter((_, i) => (gaps[i] ?? 0) >= GAP_RISK_THRESHOLD_PCT)
    .reduce((s, r) => s + Math.min(0, r), 0);

  return {
    avgGapPct: Math.round(avgGap * 100) / 100,
    maxGapPct: Math.round(maxGap * 100) / 100,
    gapLossContributionPct: Math.round(gapLoss * 10000) / 100,
    gapDaysCount: gapDays,
    noteJa: `ギャップ${GAP_RISK_THRESHOLD_PCT}%超の日: ${gapDays}日`,
  };
}

export function analyzeLiquidityVacuum(dataset: OHLCVDataset): LiquidityVacuumResult {
  const { volumes, dailyRets } = simulatePortfolio(dataset, 0);
  const sorted = [...volumes].sort((a, b) => a - b);
  const thresh = sorted[Math.floor((sorted.length * LIQUIDITY_VACUUM_VOLUME_PERCENTILE) / 100)] ?? 0;

  let drag = 0;
  let worst = 0;
  let vacuumDays = 0;
  for (let i = 0; i < dailyRets.length; i++) {
    if ((volumes[i] ?? 0) <= thresh && thresh > 0) {
      vacuumDays += 1;
      drag += LIQUIDITY_VACUUM_EXTRA_SLIPPAGE_BPS / 10000;
      worst = Math.min(worst, dailyRets[i]);
    }
  }

  return {
    vacuumDays,
    extraSlippageDragPct: Math.round(drag * 10000) / 100,
    worstDayImpactPct: Math.round(worst * 10000) / 100,
    noteJa: `低流動性日（下位${LIQUIDITY_VACUUM_VOLUME_PERCENTILE}%）: ${vacuumDays}日`,
  };
}

export function analyzePsychologicalStress(dataset: OHLCVDataset): PsychologicalStressResult {
  const { equity } = simulatePortfolio(dataset, 0);
  let peak = equity[0];
  let maxConsec = 0;
  let consec = 0;
  let maxRecovery = 0;
  let recovery = 0;
  let trough = peak;
  const breakpointsHit = PSYCHOLOGICAL_BREAKPOINTS_PCT.map((thresholdPct) => ({
    thresholdPct,
    daysToHit: null as number | null,
  }));

  for (let i = 0; i < equity.length; i++) {
    const v = equity[i];
    if (v >= peak) {
      peak = v;
      consec = 0;
      if (recovery > 0) maxRecovery = Math.max(maxRecovery, recovery);
      recovery = 0;
    } else {
      consec += 1;
      maxConsec = Math.max(maxConsec, consec);
      recovery += 1;
    }
    const dd = peak > 0 ? ((peak - v) / peak) * 100 : 0;
    for (const bp of breakpointsHit) {
      if (bp.daysToHit == null && dd >= bp.thresholdPct) {
        bp.daysToHit = i;
      }
    }
    if (v < trough) trough = v;
  }

  const maxDd = peak > 0 ? ((peak - trough) / peak) * 100 : 0;
  const stressScore = Math.round(
    Math.min(100, maxConsec * 3 + maxRecovery * 0.5 + maxDd * 0.8),
  );

  return {
    maxConsecutiveDrawdownDays: maxConsec,
    maxRecoveryDays: maxRecovery,
    breakpointsHit,
    stressScore,
    noteJa: `最大連続水下${maxConsec}日 · 回復${maxRecovery}日 · ストレススコア${stressScore}`,
  };
}

export function runQuantValidationSuite(dataset: OHLCVDataset) {
  return {
    regimeInstability: testRegimeInstability(dataset),
    monteCarlo: runMonteCarloPerturbation(dataset),
    tailEvents: runTailEventSimulation(dataset),
    executionDelays: testExecutionDelays(dataset),
    gapRisk: analyzeGapRisk(dataset),
    liquidityVacuum: analyzeLiquidityVacuum(dataset),
    psychologicalStress: analyzePsychologicalStress(dataset),
  };
}
