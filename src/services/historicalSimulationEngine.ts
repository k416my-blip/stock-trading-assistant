import {
  BACKTEST_SLIPPAGE_BPS,
  BACKTEST_TURNOVER_COST_BPS,
  MAX_HOLDINGS,
  REBALANCE_INTERVAL_DAYS,
  REGIME_LABEL,
  RISK_FREE_RATE_ANNUAL,
  STRESS_SCENARIOS,
  TRADING_DAYS_HISTORY,
  WALK_FORWARD_STEP_DAYS,
  WALK_FORWARD_TEST_DAYS,
  WALK_FORWARD_TRAIN_DAYS,
} from '../constants/historicalSimulation';
import { REGIME_RISK_MULTIPLIER } from '../constants/marketRegime';
import { getExtendedPriceHistory, getExtendedTradingDates } from '../data/extendedPriceHistory';
import { SAMPLE_STOCKS } from '../data/sampleStocks';
import type {
  EquityPoint,
  ExposureHeatPoint,
  FactorAttributionRow,
  HistoricalValidationReport,
  MaxDrawdownAnalysis,
  RegimePerformanceRow,
  RiskAdjustedMetrics,
  StressPeriodResult,
  SurvivalAnalysisResult,
  TurnoverImpactAnalysis,
  WalkForwardResult,
  WalkForwardWindow,
} from '../types/historicalSimulation';
import type { MarketRegimeId } from '../types/marketRegime';
import type { StockFundamentals } from '../types';
import { stockToSectorTheme } from './marketIndicators';

const FACTOR_LABELS: Record<string, string> = {
  value: 'バリュー',
  growth: 'グロース',
  momentum: 'モメンタム',
  quality: 'クオリティ',
  size: 'サイズ',
};

function dailyReturnsFromCloses(closes: number[]): number[] {
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return rets;
}

type UniverseData = {
  symbols: string[];
  stocks: StockFundamentals[];
  closes: Map<string, number[]>;
  returns: Map<string, number[]>;
  dates: string[];
};

function buildUniverse(tradingDays: number): UniverseData {
  const stocks = SAMPLE_STOCKS.filter((s) => s.volume > 100_000);
  const symbols = stocks.map((s) => s.symbol);
  const closes = new Map<string, number[]>();
  const returns = new Map<string, number[]>();
  for (const sym of symbols) {
    const bars = getExtendedPriceHistory(sym, tradingDays);
    const c = bars.map((b) => b.close);
    closes.set(sym, c);
    returns.set(sym, dailyReturnsFromCloses(c));
  }
  const dates = getExtendedTradingDates(tradingDays);
  return { symbols, stocks, closes, returns, dates };
}

function momentum20(returns: number[], dayIdx: number): number {
  const start = Math.max(0, dayIdx - 20);
  let cum = 1;
  for (let i = start; i < dayIdx; i++) {
    cum *= 1 + (returns[i] ?? 0);
  }
  return cum - 1;
}

function classifyRegimeDay(universe: UniverseData, dayIdx: number): MarketRegimeId {
  if (dayIdx < 5) return 'recovery_phase';
  let momSum = 0;
  let volSum = 0;
  let pos = 0;
  let n = 0;
  for (const sym of universe.symbols) {
    const rets = universe.returns.get(sym)!;
    const r = rets[dayIdx - 1] ?? 0;
    momSum += momentum20(rets, dayIdx);
    volSum += Math.abs(r);
    if (r > 0) pos += 1;
    n += 1;
  }
  const avgMom = n > 0 ? momSum / n : 0;
  const avgVol = n > 0 ? volSum / n : 0;
  const breadth = n > 0 ? pos / n : 0.5;

  if (avgVol > 0.025 && breadth < 0.4) return 'high_volatility';
  if (avgMom < -0.08 && breadth < 0.45) return 'recession_fear';
  if (avgMom < -0.03 && avgVol > 0.018) return 'risk_off';
  if (avgVol > 0.022) return 'tightening_bear';
  if (avgMom > 0.04 && breadth > 0.55) return 'risk_on';
  if (avgMom > 0.01) return 'recovery_phase';
  return 'liquidity_bull';
}

function pickHoldings(
  universe: UniverseData,
  dayIdx: number,
  regime: MarketRegimeId,
): Map<string, number> {
  const scored = universe.stocks
    .map((stock) => ({
      stock,
      score: momentum20(universe.returns.get(stock.symbol)!, dayIdx),
    }))
    .sort((a, b) => b.score - a.score);

  const weights = new Map<string, number>();
  const categoryCount = new Map<string, number>();
  const exposureMult = REGIME_RISK_MULTIPLIER[regime] ?? 0.85;
  let picked = 0;

  for (const { stock } of scored) {
    if (picked >= MAX_HOLDINGS) break;
    const cat = stock.category;
    const cnt = categoryCount.get(cat) ?? 0;
    if (cnt >= 2) continue;
    categoryCount.set(cat, cnt + 1);
    weights.set(stock.symbol, 1);
    picked += 1;
  }

  const gross = picked > 0 ? exposureMult : 0;
  const w = gross / Math.max(picked, 1);
  for (const sym of weights.keys()) {
    weights.set(sym, w);
  }
  return weights;
}

function sectorLabel(stock: StockFundamentals): string {
  return stockToSectorTheme(stock);
}

type BacktestResult = {
  equity: number[];
  exposure: number[];
  rebalanceCount: number;
  turnoverSum: number;
  factorReturns: Record<string, number>;
  regimeDays: Map<MarketRegimeId, number>;
  regimeReturns: Map<MarketRegimeId, number>;
};

function runSystemBacktest(universe: UniverseData, withCosts: boolean): BacktestResult {
  const n = universe.dates.length;
  const equity: number[] = [1];
  const exposure: number[] = [0];
  let holdings = new Map<string, number>();
  let rebalanceCount = 0;
  let turnoverSum = 0;
  const factorReturns: Record<string, number> = {
    value: 0,
    growth: 0,
    momentum: 0,
    quality: 0,
    size: 0,
  };
  const regimeDays = new Map<MarketRegimeId, number>();
  const regimeReturns = new Map<MarketRegimeId, number>();

  for (let d = 1; d < n; d++) {
    const regime = classifyRegimeDay(universe, d);
    regimeDays.set(regime, (regimeDays.get(regime) ?? 0) + 1);

    let turnoverCost = 0;
    if (d % REBALANCE_INTERVAL_DAYS === 0 || holdings.size === 0) {
      const next = pickHoldings(universe, d, regime);
      let turnover = 0;
      const allSyms = new Set([...holdings.keys(), ...next.keys()]);
      for (const sym of allSyms) {
        turnover += Math.abs((next.get(sym) ?? 0) - (holdings.get(sym) ?? 0));
      }
      turnoverSum += turnover;
      holdings = next;
      rebalanceCount += 1;
      if (withCosts && turnover > 0) {
        turnoverCost = (turnover * BACKTEST_TURNOVER_COST_BPS) / 10000;
      }
    }

    let dayRet = 0;
    let grossExp = 0;
    for (const [sym, w] of holdings) {
      const r = universe.returns.get(sym)?.[d - 1] ?? 0;
      dayRet += w * r;
      grossExp += w;
    }

    if (withCosts) {
      dayRet -= BACKTEST_SLIPPAGE_BPS / 10000 + turnoverCost;
    }

    regimeReturns.set(regime, (regimeReturns.get(regime) ?? 0) + dayRet);

    const stock = universe.stocks.find((s) => holdings.has(s.symbol));
    if (stock) {
      const mom = momentum20(universe.returns.get(stock.symbol)!, d);
      if (mom > 0) factorReturns.momentum += dayRet * 0.3;
      if (stock.per < 15) factorReturns.value += dayRet * 0.2;
      if (stock.per > 25) factorReturns.growth += dayRet * 0.2;
      if (stock.dividendYield >= 3) factorReturns.quality += dayRet * 0.15;
      if (stock.marketCap > 50e9) factorReturns.size += dayRet * 0.15;
    }

    const prev = equity[equity.length - 1];
    equity.push(prev * (1 + dayRet));
    exposure.push(grossExp * 100);
  }

  return {
    equity,
    exposure,
    rebalanceCount,
    turnoverSum,
    factorReturns,
    regimeDays,
    regimeReturns,
  };
}

function runBenchmarkBacktest(universe: UniverseData, withCosts: boolean): number[] {
  const n = universe.dates.length;
  const w = 1 / universe.symbols.length;
  const equity = [1];
  for (let d = 1; d < n; d++) {
    let dayRet = 0;
    for (const sym of universe.symbols) {
      dayRet += w * (universe.returns.get(sym)?.[d - 1] ?? 0);
    }
    if (withCosts) dayRet -= BACKTEST_SLIPPAGE_BPS / 10000;
    equity.push(equity[equity.length - 1] * (1 + dayRet));
  }
  return equity;
}

function equityToCurve(equity: number[], dates: string[], exposure: number[]): EquityPoint[] {
  let peak = equity[0];
  return equity.map((v, i) => {
    peak = Math.max(peak, v);
    const dd = peak > 0 ? ((peak - v) / peak) * 100 : 0;
    return {
      date: dates[i] ?? '',
      dayIndex: i,
      value: Math.round(v * 10000) / 10000,
      drawdownPct: Math.round(dd * 100) / 100,
      exposurePct: Math.round((exposure[i] ?? 0) * 10) / 10,
    };
  });
}

function computeMaxDrawdown(equity: number[], dates: string[]): MaxDrawdownAnalysis {
  let peak = equity[0];
  let maxDd = 0;
  let peakIdx = 0;
  let troughIdx = 0;
  for (let i = 0; i < equity.length; i++) {
    if (equity[i] > peak) {
      peak = equity[i];
      peakIdx = i;
    }
    const dd = peak > 0 ? ((peak - equity[i]) / peak) * 100 : 0;
    if (dd > maxDd) {
      maxDd = dd;
      troughIdx = i;
    }
  }
  let recoveryDays = 0;
  if (troughIdx < equity.length - 1) {
    const target = peak;
    for (let j = troughIdx + 1; j < equity.length; j++) {
      recoveryDays += 1;
      if (equity[j] >= target) break;
    }
  }
  return {
    maxDrawdownPct: Math.round(maxDd * 100) / 100,
    peakDate: dates[peakIdx] ?? '',
    troughDate: dates[troughIdx] ?? '',
    recoveryDays,
    benchmarkMaxDrawdownPct: 0,
  };
}

function annualizedReturn(equity: number[]): number {
  if (equity.length < 2) return 0;
  const total = equity[equity.length - 1] / equity[0];
  const years = (equity.length - 1) / 252;
  return years > 0 ? (Math.pow(total, 1 / years) - 1) * 100 : 0;
}

function dailyReturnsFromEquity(equity: number[]): number[] {
  const rets: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    if (equity[i - 1] > 0) rets.push(equity[i] / equity[i - 1] - 1);
  }
  return rets;
}

function computeRiskMetrics(systemEq: number[], benchEq: number[]): RiskAdjustedMetrics {
  const sysR = dailyReturnsFromEquity(systemEq);
  const benchR = dailyReturnsFromEquity(benchEq);
  const rfDaily = RISK_FREE_RATE_ANNUAL / 252;
  const mean = sysR.reduce((a, b) => a + b, 0) / Math.max(sysR.length, 1);
  const std = Math.sqrt(
    sysR.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(sysR.length, 1),
  );
  const downside = sysR.filter((r) => r < rfDaily);
  const downStd = Math.sqrt(
    downside.reduce((s, r) => s + (r - rfDaily) ** 2, 0) / Math.max(downside.length, 1),
  );
  const sharpe = std > 0 ? ((mean - rfDaily) / std) * Math.sqrt(252) : 0;
  const sortino = downStd > 0 ? ((mean - rfDaily) / downStd) * Math.sqrt(252) : 0;
  const annRet = annualizedReturn(systemEq);
  const maxDd = computeMaxDrawdown(systemEq, []).maxDrawdownPct;
  const calmar = maxDd > 0 ? annRet / maxDd : 0;

  const bMean = benchR.reduce((a, b) => a + b, 0) / Math.max(benchR.length, 1);
  const bStd = Math.sqrt(
    benchR.reduce((s, r) => s + (r - bMean) ** 2, 0) / Math.max(benchR.length, 1),
  );
  const benchSharpe = bStd > 0 ? ((bMean - rfDaily) / bStd) * Math.sqrt(252) : 0;
  const benchCalmar =
    computeMaxDrawdown(benchEq, []).maxDrawdownPct > 0
      ? annualizedReturn(benchEq) / computeMaxDrawdown(benchEq, []).maxDrawdownPct
      : 0;

  return {
    sharpe: Math.round(sharpe * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
    calmar: Math.round(calmar * 100) / 100,
    annualizedReturnPct: Math.round(annRet * 100) / 100,
    annualizedVolPct: Math.round(std * Math.sqrt(252) * 10000) / 100,
    benchmarkSharpe: Math.round(benchSharpe * 100) / 100,
    benchmarkCalmar: Math.round(benchCalmar * 100) / 100,
  };
}

function runWalkForward(universe: UniverseData): WalkForwardResult {
  const windows: WalkForwardWindow[] = [];
  const n = universe.dates.length;
  let wId = 0;

  for (
    let start = WALK_FORWARD_TRAIN_DAYS;
    start + WALK_FORWARD_TEST_DAYS < n;
    start += WALK_FORWARD_STEP_DAYS
  ) {
    const testEnd = start + WALK_FORWARD_TEST_DAYS;
    const sliceUniverse = universe;
    let sysStart = 1;
    let benchStart = 1;
    for (let d = start; d < testEnd; d++) {
      const regime = classifyRegimeDay(sliceUniverse, d);
      const holdings = pickHoldings(sliceUniverse, d, regime);
      let dayRet = 0;
      for (const [sym, w] of holdings) {
        dayRet += w * (sliceUniverse.returns.get(sym)?.[d - 1] ?? 0);
      }
      dayRet -= BACKTEST_SLIPPAGE_BPS / 10000;
      sysStart *= 1 + dayRet;
      let bRet = 0;
      const bw = 1 / universe.symbols.length;
      for (const sym of universe.symbols) {
        bRet += bw * (universe.returns.get(sym)?.[d - 1] ?? 0);
      }
      benchStart *= 1 + bRet - BACKTEST_SLIPPAGE_BPS / 10000;
    }
    const sysPct = (sysStart - 1) * 100;
    const benchPct = (benchStart - 1) * 100;
    windows.push({
      windowId: wId++,
      trainStartIdx: start - WALK_FORWARD_TRAIN_DAYS,
      testEndIdx: testEnd,
      systemReturnPct: Math.round(sysPct * 100) / 100,
      benchmarkReturnPct: Math.round(benchPct * 100) / 100,
      alphaPct: Math.round((sysPct - benchPct) * 100) / 100,
      beatBenchmark: sysPct > benchPct,
    });
  }

  const hit = windows.filter((w) => w.beatBenchmark).length;
  return {
    windows,
    avgSystemReturnPct:
      windows.length > 0
        ? Math.round((windows.reduce((s, w) => s + w.systemReturnPct, 0) / windows.length) * 100) / 100
        : 0,
    avgBenchmarkReturnPct:
      windows.length > 0
        ? Math.round(
            (windows.reduce((s, w) => s + w.benchmarkReturnPct, 0) / windows.length) * 100,
          ) / 100
        : 0,
    hitRatePct: windows.length > 0 ? Math.round((hit / windows.length) * 1000) / 10 : 0,
    windowCount: windows.length,
  };
}

function stressPeriodTests(
  systemEq: number[],
  benchEq: number[],
  dates: string[],
): StressPeriodResult[] {
  return STRESS_SCENARIOS.map((s) => {
    const start = s.startDayIdx;
    const end = Math.min(s.endDayIdx, systemEq.length - 1);
    const sysRet = start < end ? ((systemEq[end] / systemEq[start]) - 1) * 100 : 0;
    const benchRet = start < end ? ((benchEq[end] / benchEq[start]) - 1) * 100 : 0;
    const slice = systemEq.slice(start, end + 1);
    const dd = computeMaxDrawdown(slice, dates.slice(start, end + 1));
    const slipAdj = sysRet - (BACKTEST_SLIPPAGE_BPS * (end - start)) / 100;
    return {
      id: s.id,
      labelJa: s.labelJa,
      returnPct: Math.round(sysRet * 100) / 100,
      benchmarkReturnPct: Math.round(benchRet * 100) / 100,
      maxDrawdownPct: dd.maxDrawdownPct,
      recoveryDays: dd.recoveryDays,
      slippageAdjustedReturnPct: Math.round(slipAdj * 100) / 100,
    };
  });
}

function buildRegimePerformance(
  regimeDays: Map<MarketRegimeId, number>,
  regimeReturns: Map<MarketRegimeId, number>,
): RegimePerformanceRow[] {
  const rows: RegimePerformanceRow[] = [];
  for (const [regimeId, days] of regimeDays) {
    const ret = (regimeReturns.get(regimeId) ?? 0) * 100;
    const vol = days > 0 ? Math.sqrt(Math.abs(ret) / days) * Math.sqrt(252) : 0;
    rows.push({
      regimeId,
      labelJa: REGIME_LABEL[regimeId],
      days,
      returnPct: Math.round(ret * 100) / 100,
      volatilityPct: Math.round(vol * 100) / 100,
      sharpe: vol > 0 ? Math.round((ret / vol) * 100) / 100 : 0,
    });
  }
  return rows.sort((a, b) => b.days - a.days);
}

function buildExposureHeat(
  universe: UniverseData,
  sampleEvery = 21,
): ExposureHeatPoint[] {
  const points: ExposureHeatPoint[] = [];
  for (let d = REBALANCE_INTERVAL_DAYS; d < universe.dates.length; d += sampleEvery) {
    const regime = classifyRegimeDay(universe, d);
    const holdings = pickHoldings(universe, d, regime);
    const sectorMap = new Map<string, number>();
    let gross = 0;
    for (const [sym, w] of holdings) {
      const stock = universe.stocks.find((s) => s.symbol === sym);
      if (!stock) continue;
      const sec = sectorLabel(stock);
      sectorMap.set(sec, (sectorMap.get(sec) ?? 0) + w);
      gross += w;
    }
    points.push({
      date: universe.dates[d] ?? '',
      sectorWeights: [...sectorMap.entries()].map(([sector, weightPct]) => ({
        sector,
        weightPct: Math.round(weightPct * gross * 1000) / 10,
      })),
      grossExposurePct: Math.round(gross * 1000) / 10,
    });
  }
  return points;
}

function buildFactorAttribution(factorReturns: Record<string, number>): FactorAttributionRow[] {
  const total = Object.values(factorReturns).reduce((a, b) => a + Math.abs(b), 0) || 1;
  return Object.entries(factorReturns).map(([factor, raw]) => ({
    factor,
    labelJa: FACTOR_LABELS[factor] ?? factor,
    contributionPct: Math.round((raw / total) * 1000) / 10,
  }));
}

function survivalAnalysis(wf: WalkForwardResult, risk: RiskAdjustedMetrics): SurvivalAnalysisResult {
  const positive = wf.windows.filter((w) => w.systemReturnPct > 0).length;
  const beat = wf.windows.filter((w) => w.beatBenchmark).length;
  const calmarOk = wf.windows.filter((w) => w.systemReturnPct > 0 && w.alphaPct > 0).length;
  let maxLoss = 0;
  let cur = 0;
  for (const w of wf.windows) {
    if (w.systemReturnPct < 0) {
      cur += 1;
      maxLoss = Math.max(maxLoss, cur);
    } else cur = 0;
  }
  const sorted = [...wf.windows].map((w) => w.systemReturnPct).sort((a, b) => a - b);
  const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

  return {
    windowsSurvivedPct:
      wf.windowCount > 0 ? Math.round((positive / wf.windowCount) * 1000) / 10 : 0,
    beatBenchmarkPct: wf.windowCount > 0 ? Math.round((beat / wf.windowCount) * 1000) / 10 : 0,
    positiveCalmarWindowsPct:
      wf.windowCount > 0 ? Math.round((calmarOk / wf.windowCount) * 1000) / 10 : 0,
    maxConsecutiveLossWindows: maxLoss,
    medianWindowReturnPct: Math.round(median * 100) / 100,
    noteJa: `ウォークフォワード ${wf.windowCount}窓 · シャープ ${risk.sharpe} vs BM ${risk.benchmarkSharpe}`,
  };
}

/** 歴史シミュレーション・検証の総合実行 */
export function runHistoricalValidation(
  tradingDays = TRADING_DAYS_HISTORY,
): HistoricalValidationReport {
  const universe = buildUniverse(tradingDays);
  const gross = runSystemBacktest(universe, false);
  const net = runSystemBacktest(universe, true);
  const benchGross = runBenchmarkBacktest(universe, false);
  const benchNet = runBenchmarkBacktest(universe, true);

  const systemCurve = equityToCurve(net.equity, universe.dates, net.exposure);
  const benchExposure = benchNet.map(() => 100);
  const benchCurve = equityToCurve(benchNet, universe.dates, benchExposure);

  const maxDd = computeMaxDrawdown(net.equity, universe.dates);
  maxDd.benchmarkMaxDrawdownPct = computeMaxDrawdown(benchNet, universe.dates).maxDrawdownPct;

  const riskMetrics = computeRiskMetrics(net.equity, benchNet);
  const walkForward = runWalkForward(universe);
  const stressTests = stressPeriodTests(net.equity, benchNet, universe.dates);

  const grossRet = (gross.equity[gross.equity.length - 1] / gross.equity[0] - 1) * 100;
  const netRet = (net.equity[net.equity.length - 1] / net.equity[0] - 1) * 100;

  const turnoverImpact: TurnoverImpactAnalysis = {
    turnoverPctAnnualized: Math.round(
      (gross.turnoverSum / Math.max(gross.rebalanceCount, 1)) *
        (252 / REBALANCE_INTERVAL_DAYS) *
        100,
    ),
    grossReturnPct: Math.round(grossRet * 100) / 100,
    netReturnPct: Math.round(netRet * 100) / 100,
    turnoverDragPct: Math.round((grossRet - netRet) * 100) / 100,
    rebalanceCount: gross.rebalanceCount,
    noteJa: `リバランス${gross.rebalanceCount}回 · スリッページ+ターンオーバー込み`,
  };

  const improves =
    riskMetrics.sharpe > riskMetrics.benchmarkSharpe &&
    riskMetrics.calmar >= riskMetrics.benchmarkCalmar * 0.9 &&
    maxDd.maxDrawdownPct <= maxDd.benchmarkMaxDrawdownPct * 1.05;

  const verdict = improves
    ? '検証: レジーム連動システムはベンチマーク比でリスク調整後リターン・ドローダウン保全に優位（サンプルデータ）'
    : '検証: 現設定ではベンチマーク比で優位性は限定的 — エクスポージャー・ターンオーバー見直しを推奨';

  return {
    computedAt: new Date().toISOString(),
    tradingDays,
    universeSize: universe.symbols.length,
    walkForward,
    regimePerformance: buildRegimePerformance(gross.regimeDays, gross.regimeReturns),
    stressTests,
    turnoverImpact,
    riskMetrics,
    maxDrawdown: maxDd,
    exposureHeatTimeline: buildExposureHeat(universe),
    factorAttribution: buildFactorAttribution(net.factorReturns),
    survivalAnalysis: survivalAnalysis(walkForward, riskMetrics),
    systemEquityCurve: systemCurve,
    benchmarkEquityCurve: benchCurve,
    validationVerdictJa: verdict,
    improvesRiskAdjustedPreservation: improves,
  };
}
