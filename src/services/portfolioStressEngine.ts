import {
  CORRELATION_SHOCK_CRISIS,
  CORRELATION_SHOCK_HIGH_VOL,
  CORRELATION_SHOCK_NORMAL,
  DRAWDOWN_ACCEL_ALERT,
  EXECUTION_GATE_STRESS_SCORE,
  FAT_TAIL_MULTIPLIER,
  DELEVERAGE_TRIGGER_SCORE,
  LIQUIDITY_CASCADE_DAILY_CAP_PCT,
  MIN_CASH_BUFFER_CRISIS_PCT,
  MIN_CASH_BUFFER_NORMAL_PCT,
  RUIN_HORIZON_YEARS,
  RUIN_MAX_DRAWDOWN_PCT,
  STRESS_MC_BLOCK,
  STRESS_MC_HORIZON_DAYS,
  STRESS_MC_PATHS,
  TAIL_Z_95,
  TAIL_Z_99,
} from '../constants/portfolioStress';
import { SECTOR_THEME_LABEL } from '../constants/marketRegime';
import { getSamplePriceHistory } from '../data/sampleStocks';
import type { CorrelationRegimeId } from '../types/crisisCorrelation';
import type { PortfolioPositionAnalysis } from '../types/portfolioConstruction';
import type {
  CorrelationShockResult,
  CrisisAllocationOverride,
  CrisisOverrideMode,
  DependencyGraph,
  DrawdownAcceleration,
  DynamicCashBuffer,
  EmergencyDeleveraging,
  ExposureOverlap,
  HiddenFactorConcentration,
  LiquidityCascadeResult,
  PortfolioConvexity,
  PortfolioStressInput,
  PortfolioStressReport,
  RiskOfRuin,
  SectorContagionResult,
  StressVarEs,
  TailMonteCarloResult,
  VolatilityClustering,
} from '../types/portfolioStress';
import type { MarketRegimeId } from '../types/marketRegime';
import { dailyReturns } from './crisisCorrelationEngine';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function shockMultiplier(regime: CorrelationRegimeId | MarketRegimeId | undefined): number {
  if (regime === 'crisis' || regime === 'risk_off' || regime === 'recession_fear') {
    return CORRELATION_SHOCK_CRISIS;
  }
  if (regime === 'high_volatility') {
    return CORRELATION_SHOCK_HIGH_VOL;
  }
  return CORRELATION_SHOCK_NORMAL;
}

function portfolioDailyReturns(positions: PortfolioPositionAnalysis[]): number[] {
  if (positions.length === 0) return [];
  const weightBySymbol = new Map(positions.map((p) => [p.symbol, p.weightPct / 100]));
  const symbols = positions.map((p) => p.symbol);
  const returnSeries: number[][] = symbols.map((sym) => {
    try {
      return dailyReturns(getSamplePriceHistory(sym));
    } catch {
      return [];
    }
  });
  const n = Math.min(...returnSeries.map((r) => r.length).filter((l) => l > 0), 120);
  if (!Number.isFinite(n) || n < 5) return [];

  const port: number[] = [];
  for (let i = returnSeries[0].length - n; i < returnSeries[0].length; i++) {
    let r = 0;
    for (let j = 0; j < symbols.length; j++) {
      const w = weightBySymbol.get(symbols[j]) ?? 0;
      const series = returnSeries[j];
      const idx = series.length - n + (i - (returnSeries[0].length - n));
      if (idx >= 0 && idx < series.length) r += w * series[idx];
    }
    port.push(r);
  }
  return port;
}

function portfolioVolAnnualized(rets: number[], shock = 1): number {
  if (rets.length < 2) return 15;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100 * shock;
}

function buildCorrelationShock(
  positions: PortfolioPositionAnalysis[],
  crisis: PortfolioStressInput['crisisCorrelation'],
  regime?: MarketRegimeId,
): CorrelationShockResult {
  const pairs = crisis?.stressAdjustedPairs ?? [];
  const baseline =
    pairs.length > 0
      ? pairs.reduce((s, p) => s + Math.abs(p.stressAdjustedCorrelation), 0) / pairs.length
      : 0.35;
  const mult = shockMultiplier(crisis?.regimeId ?? regime);
  const shocked = clamp(baseline * mult, 0, 1);
  const rets = portfolioDailyReturns(positions);
  const volBase = portfolioVolAnnualized(rets, 1);
  const volShock = portfolioVolAnnualized(rets, mult);
  return {
    baselineAvgCorrelation: Math.round(baseline * 100) / 100,
    shockedAvgCorrelation: Math.round(shocked * 100) / 100,
    shockMultiplier: mult,
    portfolioVolBaselinePct: Math.round(volBase * 10) / 10,
    portfolioVolShockedPct: Math.round(volShock * 10) / 10,
    noteJa: `相関ショック ×${mult.toFixed(2)} → ボラ ${volBase.toFixed(1)}% → ${volShock.toFixed(1)}%`,
  };
}

function buildSectorContagion(positions: PortfolioPositionAnalysis[]): SectorContagionResult {
  const bySector = new Map<string, number>();
  for (const p of positions) {
    const label = SECTOR_THEME_LABEL[p.sector] ?? p.sector;
    bySector.set(label, (bySector.get(label) ?? 0) + p.weightPct);
  }
  const sectorImpacts = [...bySector.entries()]
    .map(([sector, weightPct]) => ({
      sector,
      weightPct: Math.round(weightPct * 10) / 10,
      contagionPct: Math.round(weightPct * 0.35 * 10) / 10,
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  const worst = sectorImpacts[0];
  const spillover = sectorImpacts.reduce((s, x) => s + x.contagionPct * 0.4, 0);
  return {
    worstSector: worst?.sector ?? '—',
    spilloverLossPct: Math.round(spillover * 10) / 10,
    sectorImpacts,
    noteJa: `セクター伝染 — 最大 ${worst?.sector} ${worst?.weightPct}%`,
  };
}

function buildTailMonteCarlo(positions: PortfolioPositionAnalysis[]): TailMonteCarloResult {
  const rets = portfolioDailyReturns(positions);
  if (rets.length < STRESS_MC_BLOCK + 3) {
    return {
      paths: 0,
      horizonDays: STRESS_MC_HORIZON_DAYS,
      p1ReturnPct: 0,
      p5ReturnPct: 0,
      medianReturnPct: 0,
      probTailLossPct: 0,
      noteJa: '履歴不足',
    };
  }

  const pathReturns: number[] = [];
  const n = rets.length;
  for (let p = 0; p < STRESS_MC_PATHS; p++) {
    let eq = 1;
    let i = 0;
    while (i < STRESS_MC_HORIZON_DAYS) {
      const start = Math.floor(Math.random() * Math.max(1, n - STRESS_MC_BLOCK));
      for (let b = 0; b < STRESS_MC_BLOCK && i < STRESS_MC_HORIZON_DAYS; b++, i++) {
        const r = rets[(start + b) % n] * (Math.random() < 0.08 ? -FAT_TAIL_MULTIPLIER : 1);
        eq *= 1 + r;
      }
    }
    pathReturns.push((eq - 1) * 100);
  }
  pathReturns.sort((a, b) => a - b);
  const pct = (q: number) => pathReturns[Math.floor(pathReturns.length * q)] ?? 0;

  return {
    paths: STRESS_MC_PATHS,
    horizonDays: STRESS_MC_HORIZON_DAYS,
    p1ReturnPct: Math.round(pct(0.01) * 100) / 100,
    p5ReturnPct: Math.round(pct(0.05) * 100) / 100,
    medianReturnPct: Math.round(pct(0.5) * 100) / 100,
    probTailLossPct: Math.round(
      (pathReturns.filter((r) => r < -12).length / pathReturns.length) * 1000,
    ) / 10,
    noteJa: `テールMC ${STRESS_MC_PATHS}パス · P5 ${pct(0.05).toFixed(1)}%`,
  };
}

function buildLiquidityCascade(
  positions: PortfolioPositionAnalysis[],
  totalValue: number,
): LiquidityCascadeResult {
  const sorted = [...positions].sort((a, b) => a.liquidityScore - b.liquidityScore);
  let remaining = 100;
  let loss = 0;
  const atRisk: string[] = [];
  for (const p of sorted) {
    if (p.liquidityScore < 45) {
      atRisk.push(p.symbol);
      const trim = Math.min(p.weightPct, LIQUIDITY_CASCADE_DAILY_CAP_PCT);
      const slip = ((100 - p.liquidityScore) / 100) * 0.8;
      loss += trim * slip;
      remaining -= trim;
    }
  }
  const days = Math.ceil(
    positions.reduce((s, p) => s + (p.liquidityScore < 50 ? p.weightPct : 0), 0) /
      Math.max(LIQUIDITY_CASCADE_DAILY_CAP_PCT, 1),
  );
  return {
    cascadeLossPct: Math.round(loss * 10) / 10,
    liquidationDays: days,
    symbolsAtRisk: atRisk.slice(0, 6),
    noteJa:
      atRisk.length > 0
        ? `流動性カスケード — 推定損失 ${loss.toFixed(1)}% · ${days}日`
        : '流動性カスケード耐性あり',
  };
}

function buildHiddenFactors(
  input: PortfolioStressInput,
): HiddenFactorConcentration {
  const hhi = input.herfindahlIndex ?? 0.15;
  const factors = input.factorExposures ?? [];
  const dominant = factors.reduce(
    (best, f) => (Math.abs(f.exposure) > Math.abs(best.exposure) ? f : best),
    factors[0] ?? { factor: 'growth', labelJa: '—', exposure: 0, tilt: 'neutral' },
  );
  const hiddenScore = Math.round(hhi * 100 + Math.abs(dominant.exposure) * 0.3);
  return {
    herfindahl: Math.round(hhi * 1000) / 1000,
    dominantFactor: dominant.labelJa,
    dominantExposure: Math.round(dominant.exposure),
    hiddenScore,
    noteJa:
      hiddenScore > 45
        ? `隠れ集中 HHI ${hhi.toFixed(2)} · ${dominant.labelJa}`
        : 'ファクター分散は許容範囲',
  };
}

function buildExposureOverlaps(positions: PortfolioPositionAnalysis[]): ExposureOverlap[] {
  const byTheme = new Map<string, PortfolioPositionAnalysis[]>();
  for (const p of positions) {
    const key = p.investmentTheme;
    if (!byTheme.has(key)) byTheme.set(key, []);
    byTheme.get(key)!.push(p);
  }
  return [...byTheme.entries()]
    .map(([theme, group]) => {
      const w = group.reduce((s, p) => s + p.weightPct, 0);
      return {
        groupLabelJa: theme,
        symbols: group.map((p) => p.symbol),
        combinedWeightPct: Math.round(w * 10) / 10,
        overlapScore: Math.round(w * group.length * 0.5),
      };
    })
    .filter((g) => g.combinedWeightPct >= 15)
    .sort((a, b) => b.combinedWeightPct - a.combinedWeightPct);
}

function buildVolClustering(positions: PortfolioPositionAnalysis[]): VolatilityClustering {
  const rets = portfolioDailyReturns(positions);
  if (rets.length < 10) {
    return { clusterScore: 0, volAutocorrelation: 0, elevated: false, noteJa: 'データ不足' };
  }
  const absRets = rets.map((r) => Math.abs(r));
  const mean = absRets.reduce((a, b) => a + b, 0) / absRets.length;
  let num = 0;
  let den = 0;
  for (let i = 1; i < absRets.length; i++) {
    num += (absRets[i] - mean) * (absRets[i - 1] - mean);
    den += (absRets[i] - mean) ** 2;
  }
  const autocorr = den > 0 ? num / den : 0;
  const clusterScore = Math.round(clamp(autocorr * 100 + 20, 0, 100));
  return {
    clusterScore,
    volAutocorrelation: Math.round(autocorr * 100) / 100,
    elevated: autocorr > 0.35,
    noteJa: autocorr > 0.35 ? 'ボラ・クラスタリング検出' : 'ボラクラスタは平常',
  };
}

function buildDrawdownAccel(
  drawdownPct: number,
  equityCurve?: PortfolioStressInput['equityCurve'],
): DrawdownAcceleration {
  let acceleration = 0;
  if (equityCurve && equityCurve.length >= 4) {
    const vals = equityCurve.map((e) => e.portfolioValueMYR);
    const dds: number[] = [];
    let peak = vals[0];
    for (const v of vals) {
      peak = Math.max(peak, v);
      dds.push(peak > 0 ? ((peak - v) / peak) * 100 : 0);
    }
    acceleration = dds[dds.length - 1] - dds[dds.length - 3];
  } else {
    acceleration = drawdownPct > 8 ? drawdownPct * 0.15 : 0;
  }
  const alert = acceleration > DRAWDOWN_ACCEL_ALERT || drawdownPct > 15;
  return {
    currentDrawdownPct: Math.round(drawdownPct * 10) / 10,
    acceleration: Math.round(acceleration * 100) / 100,
    alert,
    noteJa: alert ? 'ドローダウン加速 — 縮小検討' : 'ドローダウン加速なし',
  };
}

function buildConvexity(positions: PortfolioPositionAnalysis[]): PortfolioConvexity {
  const rets = portfolioDailyReturns(positions);
  if (rets.length < 5) {
    return { upsideCapture: 1, downsideCapture: 1, convexityScore: 50, noteJa: '—' };
  }
  const up = rets.filter((r) => r > 0);
  const down = rets.filter((r) => r < 0);
  const upAvg = up.length ? up.reduce((a, b) => a + b, 0) / up.length : 0;
  const downAvg = down.length ? Math.abs(down.reduce((a, b) => a + b, 0) / down.length) : 0;
  const upsideCapture = Math.round((upAvg / Math.max(downAvg, 1e-6)) * 100) / 100;
  const downsideCapture = Math.round(downAvg * 10000) / 100;
  const convexityScore = Math.round(clamp(50 + (upsideCapture - 1) * 30 - downAvg * 800, 0, 100));
  return {
    upsideCapture,
    downsideCapture,
    convexityScore,
    noteJa:
      convexityScore < 40
        ? '負のコンベクシティ — 下落が拡大しやすい'
        : 'コンベクシティ中立〜正',
  };
}

function buildDependencyGraph(
  positions: PortfolioPositionAnalysis[],
  crisis: PortfolioStressInput['crisisCorrelation'],
): DependencyGraph {
  const nodes = positions.map((p) => p.symbol);
  const edges = (crisis?.stressAdjustedPairs ?? [])
    .slice(0, 12)
    .map((p) => ({
      from: p.symbolA,
      to: p.symbolB,
      weight: Math.abs(p.stressAdjustedCorrelation),
    }));
  const centrality = new Map<string, number>();
  for (const e of edges) {
    centrality.set(e.from, (centrality.get(e.from) ?? 0) + e.weight);
    centrality.set(e.to, (centrality.get(e.to) ?? 0) + e.weight);
  }
  let maxSym = nodes[0] ?? '—';
  let maxVal = 0;
  for (const [sym, v] of centrality) {
    if (v > maxVal) {
      maxVal = v;
      maxSym = sym;
    }
  }
  return {
    nodes,
    edges,
    maxCentralitySymbol: maxSym,
    noteJa: `依存グラフ — ハブ ${maxSym} · エッジ ${edges.length}`,
  };
}

function buildCrisisOverride(
  systemicScore: number,
  regime?: MarketRegimeId,
): CrisisAllocationOverride {
  let mode: CrisisOverrideMode = 'normal';
  if (systemicScore >= 75 || regime === 'risk_off' || regime === 'recession_fear') {
    mode = 'crisis';
  } else if (systemicScore >= 50 || regime === 'high_volatility') {
    mode = 'defensive';
  }
  const targetCashPct =
    mode === 'crisis'
      ? MIN_CASH_BUFFER_CRISIS_PCT
      : mode === 'defensive'
        ? 15
        : MIN_CASH_BUFFER_NORMAL_PCT;
  return {
    mode,
    targetCashPct,
    maxEquityPct: 100 - targetCashPct,
    blockedSectors: mode === 'crisis' ? ['technology', 'growth'] : [],
    noteJa:
      mode === 'crisis'
        ? '危機モード — 現金化・低ベータ優先'
        : mode === 'defensive'
          ? '防御モード — エクスポージャー縮小'
          : '通常配分',
  };
}

function buildDeleveraging(
  positions: PortfolioPositionAnalysis[],
  systemicScore: number,
  totalValue: number,
): EmergencyDeleveraging {
  const active = systemicScore >= DELEVERAGE_TRIGGER_SCORE;
  if (!active) {
    return {
      active: false,
      targetReductionPct: 0,
      actions: [],
      noteJa: '緊急デレバレッジ不要',
    };
  }
  const targetReductionPct = Math.min(40, Math.round((systemicScore - 50) * 0.6));
  const sorted = [...positions].sort((a, b) => {
    const scoreA = a.weightPct * (1 + (100 - a.liquidityScore) / 100) + a.betaProxy * 5;
    const scoreB = b.weightPct * (1 + (100 - b.liquidityScore) / 100) + b.betaProxy * 5;
    return scoreB - scoreA;
  });
  const actions = sorted.slice(0, 5).map((p, i) => {
    const trim = Math.min(p.weightPct * 0.5, targetReductionPct / 3);
    return {
      symbol: p.symbol,
      trimWeightPct: Math.round(trim * 10) / 10,
      trimSharesEstimate: Math.round((totalValue * trim) / 100 / Math.max(p.valueMYR / Math.max(p.weightPct, 0.1), 1)),
      priority: i + 1,
      reasonJa: `流動性 ${p.liquidityScore} · β ${p.betaProxy}`,
    };
  });
  return {
    active: true,
    targetReductionPct,
    actions,
    noteJa: `緊急デレバレッジ — 目標 ${targetReductionPct}% 縮小`,
  };
}

function buildCashBuffer(
  cashBalance: number,
  totalValue: number,
  override: CrisisAllocationOverride,
): DynamicCashBuffer {
  const total = totalValue + cashBalance;
  const currentCashPct = total > 0 ? (cashBalance / total) * 100 : 100;
  const minCashPct = override.targetCashPct;
  const recommendedCashMYR = Math.max(0, (total * minCashPct) / 100 - cashBalance);
  return {
    minCashPct,
    recommendedCashMYR: Math.round(recommendedCashMYR),
    currentCashPct: Math.round(currentCashPct * 10) / 10,
    noteJa:
      currentCashPct >= minCashPct
        ? `現金バッファ充足 ${currentCashPct.toFixed(1)}%`
        : `あと RM${Math.round(recommendedCashMYR)} 現金推奨`,
  };
}

function buildStressVarEs(
  positions: PortfolioPositionAnalysis[],
  shock: CorrelationShockResult,
): StressVarEs {
  const rets = portfolioDailyReturns(positions);
  if (rets.length < 10) {
    return {
      var95Pct: 0,
      var99Pct: 0,
      expectedShortfall95Pct: 0,
      stressedVar95Pct: 0,
      noteJa: '履歴不足',
    };
  }
  const sorted = [...rets].sort((a, b) => a - b);
  const var95Idx = Math.floor(sorted.length * 0.05);
  const var99Idx = Math.floor(sorted.length * 0.01);
  const var95 = Math.abs((sorted[var95Idx] ?? 0) * 100);
  const var99 = Math.abs((sorted[var99Idx] ?? 0) * 100);
  const tail = sorted.slice(0, var95Idx + 1);
  const es95 =
    tail.length > 0
      ? Math.abs((tail.reduce((a, b) => a + b, 0) / tail.length) * 100)
      : var95;
  const stressedVar95 = var95 * shock.shockMultiplier * FAT_TAIL_MULTIPLIER;
  return {
    var95Pct: Math.round(var95 * 100) / 100,
    var99Pct: Math.round(var99 * 100) / 100,
    expectedShortfall95Pct: Math.round(es95 * 100) / 100,
    stressedVar95Pct: Math.round(stressedVar95 * 100) / 100,
    noteJa: `VaR95 ${var95.toFixed(2)}% · ES95 ${es95.toFixed(2)}% · ストレス ${stressedVar95.toFixed(2)}%`,
  };
}

function buildRiskOfRuin(
  volPct: number,
  drawdownPct: number,
): RiskOfRuin {
  const vol = volPct / 100;
  const maxDd = RUIN_MAX_DRAWDOWN_PCT / 100;
  const years = RUIN_HORIZON_YEARS;
  const prob = clamp(
    (drawdownPct / RUIN_MAX_DRAWDOWN_PCT) * 30 + vol * 120 * Math.sqrt(years),
    0,
    95,
  );
  return {
    ruinProbabilityPct: Math.round(prob * 10) / 10,
    horizonYears: years,
    maxToleratedDrawdownPct: RUIN_MAX_DRAWDOWN_PCT,
    noteJa: `破産確率（代理） ${prob.toFixed(1)}% · ${years}年`,
  };
}

/** ポートフォリオ・ストレス統合レポート */
export function buildPortfolioStressReport(input: PortfolioStressInput): PortfolioStressReport {
  const drawdown = input.portfolioDrawdownPct ?? 0;
  const correlationShock = buildCorrelationShock(
    input.positions,
    input.crisisCorrelation,
    input.regimeId,
  );
  const sectorContagion = buildSectorContagion(input.positions);
  const tailMonteCarlo = buildTailMonteCarlo(input.positions);
  const liquidityCascade = buildLiquidityCascade(
    input.positions,
    input.totalPortfolioValueMYR,
  );
  const hiddenFactors = buildHiddenFactors(input);
  const exposureOverlaps = buildExposureOverlaps(input.positions);
  const volatilityClustering = buildVolClustering(input.positions);
  const drawdownAcceleration = buildDrawdownAccel(drawdown, input.equityCurve);
  const convexity = buildConvexity(input.positions);
  const dependencyGraph = buildDependencyGraph(input.positions, input.crisisCorrelation);

  const clusterPenalty = input.crisisCorrelation?.clusterPenaltyScore ?? 0;
  const systemicStressScore = Math.round(
    clamp(
      correlationShock.shockedAvgCorrelation * 35 +
        tailMonteCarlo.probTailLossPct * 0.4 +
        liquidityCascade.cascadeLossPct * 1.2 +
        hiddenFactors.hiddenScore * 0.5 +
        drawdown * 0.8 +
        clusterPenalty +
        (volatilityClustering.elevated ? 8 : 0),
      0,
      100,
    ),
  );

  const crisisOverride = buildCrisisOverride(systemicStressScore, input.regimeId);
  const deleveraging = buildDeleveraging(
    input.positions,
    systemicStressScore,
    input.totalPortfolioValueMYR,
  );
  const cashBuffer = buildCashBuffer(
    input.cashBalanceMYR,
    input.totalPortfolioValueMYR,
    crisisOverride,
  );
  const stressVarEs = buildStressVarEs(input.positions, correlationShock);
  const riskOfRuin = buildRiskOfRuin(correlationShock.portfolioVolShockedPct, drawdown);

  const executionGateActive = systemicStressScore >= EXECUTION_GATE_STRESS_SCORE || deleveraging.active;

  let healthStatus: 'green' | 'yellow' | 'red' = 'green';
  if (systemicStressScore >= 75 || deleveraging.active) healthStatus = 'red';
  else if (systemicStressScore >= 50 || drawdownAcceleration.alert) healthStatus = 'yellow';

  const verdictJa = executionGateActive
    ? `ストレス超過 — スコア ${systemicStressScore} · 執行ゲート推奨`
    : healthStatus === 'green'
      ? `テールリスク許容 — スコア ${systemicStressScore}`
      : `監視 — ${stressVarEs.noteJa}`;

  return {
    generatedAt: new Date().toISOString(),
    correlationShock,
    sectorContagion,
    tailMonteCarlo,
    liquidityCascade,
    hiddenFactors,
    exposureOverlaps,
    volatilityClustering,
    drawdownAcceleration,
    convexity,
    dependencyGraph,
    crisisOverride,
    deleveraging,
    cashBuffer,
    stressVarEs,
    riskOfRuin,
    crisisCorrelation: input.crisisCorrelation ?? null,
    systemicStressScore,
    executionGateActive,
    healthStatus,
    verdictJa,
  };
}

export function stressExecutionBlocked(report: PortfolioStressReport): boolean {
  return report.executionGateActive && report.healthStatus === 'red';
}
