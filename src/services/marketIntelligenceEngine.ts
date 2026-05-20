import {
  CORRELATION_BREAKDOWN_DELTA,
  EUPHORIA_BREADTH_THRESHOLD,
  INTELLIGENCE_PROXY,
  INTERMARKET_REGIME_LABEL,
  MACRO_NEUTRAL,
  PANIC_BREADTH_THRESHOLD,
  PANIC_VIX_THRESHOLD,
} from '../constants/marketIntelligence';
import { CORRELATION_REGIME_LABEL } from '../constants/crisisCorrelation';
import { SAMPLE_STOCKS, getSamplePriceHistory } from '../data/sampleStocks';
import { getExtendedFundamentals } from '../data/sampleExtendedFundamentals';
import type { PriceBar } from '../types';
import type { MarketRegimeResult, SectorTheme } from '../types/marketRegime';
import type {
  AssetClassCorrelation,
  CorrelationBreakdownAlert,
  CorrelationMonitor,
  DealerGammaProxy,
  EarningsDriftMetrics,
  FlowImbalanceMetrics,
  IntermarketRegime,
  IntermarketRegimeId,
  LiquidityRegimeSense,
  MacroSurpriseScore,
  MarketBreadthMetrics,
  MarketIntelligenceReport,
  MarketIntelligenceSnapshot,
  NewsSentimentWeighting,
  PanicEuphoriaReading,
  SectorRotationSignal,
  VolatilitySurfaceProxy,
} from '../types/marketIntelligence';
import { analyzeEarningsSync } from './analysis/earningsAnalysis';
import { analyzeNewsSync } from './analysis/newsAnalysis';
import {
  buildCrossAssetIndicators,
  evaluateCrossAssetLiquidityFlow,
} from './crossAssetLiquidityFlowEngine';
import {
  dailyReturns,
  detectCorrelationRegime,
  downsideCorrelation,
  pearsonCorrelation,
} from './crisisCorrelationEngine';
import { buildMarketIndicatorsSnapshot, stockToSectorTheme } from './marketIndicators';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function safeBars(symbol: string): PriceBar[] {
  try {
    return getSamplePriceHistory(symbol);
  } catch {
    return [];
  }
}

function returnPct(bars: PriceBar[]): number {
  if (bars.length < 2) return 0;
  const first = bars[0].close;
  const last = bars[bars.length - 1].close;
  return first > 0 ? ((last - first) / first) * 100 : 0;
}

function volatilityPct(bars: PriceBar[], window?: number): number {
  const slice = window && bars.length > window ? bars.slice(-window - 1) : bars;
  if (slice.length < 5) return 15;
  const rets: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    if (slice[i - 1].close > 0) {
      rets.push(((slice[i].close - slice[i - 1].close) / slice[i - 1].close) * 100);
    }
  }
  const mean = rets.reduce((a, b) => a + b, 0) / Math.max(rets.length, 1);
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(rets.length, 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

function buildIntermarketRegime(
  flow: ReturnType<typeof evaluateCrossAssetLiquidityFlow>,
  macro: ReturnType<typeof buildMarketIndicatorsSnapshot>,
): IntermarketRegime {
  const ind = flow.indicators;
  const drivers: string[] = [];
  let regimeId: IntermarketRegimeId = 'mixed_transition';
  let confidence = 45;

  if (flow.liquidityRegime === 'contraction' && ind.vixProxy > PANIC_VIX_THRESHOLD) {
    regimeId = 'liquidity_crunch';
    confidence = 72;
    drivers.push('VIX上昇', '流動性収縮');
  } else if (ind.us10yProxy > 62 && macro.oilTrendPct > 3) {
    regimeId = 'inflation_stress';
    confidence = 65;
    drivers.push('金利圧力', 'コモディティ上昇');
  } else if (macro.indexMomentumPct < -2 && macro.breadthPctAboveMa50 < PANIC_BREADTH_THRESHOLD) {
    regimeId = 'growth_slowdown';
    confidence = 68;
    drivers.push('指数弱含み', 'ブレッドス低下');
  } else if (flow.capitalFlow === 'risk_on' && ind.vixProxy < 22) {
    regimeId = 'global_risk_on';
    confidence = 70;
    drivers.push('リスクオン・フロー', '低ボラ');
  } else if (flow.capitalFlow === 'risk_off' || ind.dxyProxy > 22) {
    regimeId = 'global_risk_off';
    confidence = 66;
    drivers.push('リスクオフ', 'ドル強含み');
  }

  return {
    regimeId,
    labelJa: INTERMARKET_REGIME_LABEL[regimeId],
    confidencePct: confidence,
    driversJa: drivers.length ? drivers : ['混合シグナル'],
  };
}

function buildCorrelationMonitor(
  prior: MarketIntelligenceSnapshot | null,
): CorrelationMonitor {
  const pairDefs = [
    { pairLabelJa: '株 ↔ 債券', key: 'eq_bond', symA: INTELLIGENCE_PROXY.equity, symB: INTELLIGENCE_PROXY.bond },
    { pairLabelJa: '株 ↔ コモディティ', key: 'eq_cmd', symA: INTELLIGENCE_PROXY.equity, symB: INTELLIGENCE_PROXY.commodity },
    { pairLabelJa: '株 ↔ FX(EM)', key: 'eq_fx', symA: INTELLIGENCE_PROXY.fxUs, symB: INTELLIGENCE_PROXY.fxEm },
    { pairLabelJa: 'ハイイールド ↔ 株', key: 'hy_eq', symA: INTELLIGENCE_PROXY.highYield, symB: INTELLIGENCE_PROXY.equity },
  ];
  const pairs: AssetClassCorrelation[] = pairDefs.map((p) => {
    const retA = dailyReturns(safeBars(p.symA));
    const retB = dailyReturns(safeBars(p.symB));
    const correlation = pearsonCorrelation(retA, retB);
    const stressAdjusted = downsideCorrelation(retA, retB);
    const priorCorrelation = prior?.pairCorrelations[p.key] ?? correlation;
    const delta = Math.round((correlation - priorCorrelation) * 100) / 100;
    return {
      pairLabelJa: p.pairLabelJa,
      correlation: Math.round(correlation * 100) / 100,
      priorCorrelation: Math.round(priorCorrelation * 100) / 100,
      delta,
      stressAdjusted: Math.round(stressAdjusted * 100) / 100,
      alert: Math.abs(delta) >= CORRELATION_BREAKDOWN_DELTA,
    };
  });

  const averageCorrelation =
    pairs.reduce((s, p) => s + Math.abs(p.correlation), 0) / Math.max(pairs.length, 1);
  const macro = buildMarketIndicatorsSnapshot();
  const flow = evaluateCrossAssetLiquidityFlow(macro);
  const correlationRegime = detectCorrelationRegime(macro, flow);

  return {
    pairs,
    averageCorrelation: Math.round(averageCorrelation * 100) / 100,
    correlationRegime,
    noteJa: `平均|ρ| ${averageCorrelation.toFixed(2)} · ${CORRELATION_REGIME_LABEL[correlationRegime]}`,
  };
}

function buildLiquidityRegime(flow: ReturnType<typeof evaluateCrossAssetLiquidityFlow>): LiquidityRegimeSense {
  return {
    regimeId: flow.liquidityRegime,
    score: flow.liquidityScore,
    hySpreadProxy: flow.indicators.hySpreadProxy,
    moveProxy: flow.indicators.moveProxy,
    noteJa: flow.liquidityLabelJa,
  };
}

function buildVolSurface(): VolatilitySurfaceProxy {
  const shortVol = volatilityPct(safeBars(INTELLIGENCE_PROXY.volShort), 15);
  const longVol = volatilityPct(safeBars(INTELLIGENCE_PROXY.volLong), 60);
  const termSkew = Math.round((shortVol - longVol) * 10) / 10;
  let surfaceLevel: VolatilitySurfaceProxy['surfaceLevel'] = 'normal';
  if (shortVol > 32 && termSkew > 8) surfaceLevel = 'inverted';
  else if (shortVol > 28) surfaceLevel = 'elevated';
  else if (shortVol < 14) surfaceLevel = 'low';

  return {
    shortVolPct: Math.round(shortVol * 10) / 10,
    longVolPct: Math.round(longVol * 10) / 10,
    termSkew,
    surfaceLevel,
    noteJa:
      surfaceLevel === 'inverted'
        ? '短期ボラ > 長期 — ストレス・サーフェス'
        : `ターム・スキュー ${termSkew.toFixed(1)}%`,
  };
}

function buildDealerGamma(macro: ReturnType<typeof buildMarketIndicatorsSnapshot>): DealerGammaProxy {
  const vol = macro.volatilityProxyPct;
  const mom = macro.indexMomentumPct;
  const volSens = clamp(vol / 30, 0, 1);
  const gammaExposureScore = Math.round(clamp(50 - mom * 2 + vol * 1.2, 0, 100));
  const pinRiskProxy = Math.round(clamp(30 + Math.abs(mom) * 2 - vol * 0.5, 0, 100));
  return {
    gammaExposureScore,
    pinRiskProxy,
    volSensitivity: Math.round(volSens * 100),
    noteJa:
      gammaExposureScore < 40
        ? 'ディーラー・ガンマ負 — ボラ拡大リスク'
        : 'ガンマ環境は中立〜正',
  };
}

function buildEarningsDrift(): EarningsDriftMetrics {
  const stocks = SAMPLE_STOCKS.filter((s) => s.category !== 'etf').slice(0, 12);
  const scores: number[] = [];
  let positive = 0;
  let revisionSum = 0;
  for (const s of stocks) {
    const e = analyzeEarningsSync(s);
    scores.push(e.score);
    if (e.score >= 58) positive += 1;
    const ext = getExtendedFundamentals(s.symbol);
    revisionSum += ext.revenueGrowthPct + ext.profitGrowthPct;
  }
  const avg = scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1);
  return {
    averageDriftScore: Math.round(avg),
    positiveDriftPct: Math.round((positive / Math.max(stocks.length, 1)) * 100),
    revisionMomentum: Math.round((revisionSum / Math.max(stocks.length, 1)) * 10) / 10,
    noteJa: `決算ドリフト ${avg.toFixed(0)} · 上方 ${positive}/${stocks.length}`,
  };
}

function buildMacroSurprise(
  ind: ReturnType<typeof buildCrossAssetIndicators>,
  macro: ReturnType<typeof buildMarketIndicatorsSnapshot>,
): MacroSurpriseScore {
  const components = [
    {
      labelJa: 'DXY代理',
      actual: ind.dxyProxy,
      expected: MACRO_NEUTRAL.dxyProxy,
    },
    {
      labelJa: '米10年代理',
      actual: ind.us10yProxy,
      expected: MACRO_NEUTRAL.us10yProxy,
    },
    {
      labelJa: 'VIX代理',
      actual: ind.vixProxy,
      expected: MACRO_NEUTRAL.vixProxy,
    },
    {
      labelJa: '指数モメンタム',
      actual: macro.indexMomentumPct,
      expected: MACRO_NEUTRAL.indexMomentumPct,
    },
    {
      labelJa: 'ブレッドス',
      actual: macro.breadthPctAboveMa50,
      expected: MACRO_NEUTRAL.breadthPct,
    },
  ].map((c) => ({
    ...c,
    surprise: Math.round((c.actual - c.expected) * 10) / 10,
  }));

  const surpriseIndex = Math.round(
    components.reduce((s, c) => s + Math.abs(c.surprise), 0) / components.length,
  );

  return {
    surpriseIndex,
    components,
    noteJa:
      surpriseIndex > 18
        ? `マクロ・サプライズ高 (${surpriseIndex})`
        : `マクロは想定内 (${surpriseIndex})`,
  };
}

function buildNewsSentiment(): NewsSentimentWeighting {
  const sample = SAMPLE_STOCKS.slice(0, 10);
  const scores = sample.map((s) => analyzeNewsSync(s).score);
  const aggregateScore = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1));
  const tone = aggregateScore >= 62 ? 'bullish' : aggregateScore <= 42 ? 'bearish' : 'neutral';
  const weightInRegime = clamp((aggregateScore - 50) / 50, -0.3, 0.3);
  return {
    aggregateScore,
    tone,
    weightInRegime: Math.round(weightInRegime * 100) / 100,
    sampleSize: sample.length,
    noteJa: `ニュース・センチメント ${aggregateScore} (${tone})`,
  };
}

function buildSectorRotation(
  flow: ReturnType<typeof evaluateCrossAssetLiquidityFlow>,
): SectorRotationSignal {
  const sectors: SectorTheme[] = [
    'technology',
    'financial',
    'energy',
    'consumer',
    'healthcare',
    'dividend',
    'utilities',
  ];
  const ranked = sectors
    .map((sector) => {
      const stocks = SAMPLE_STOCKS.filter((st) => stockToSectorTheme(st) === sector);
      const ret =
        stocks.length > 0
          ? stocks.reduce((s, st) => s + returnPct(safeBars(st.symbol)), 0) / stocks.length
          : 0;
      return { sector, ret };
    })
    .sort((a, b) => b.ret - a.ret);

  const rotationStrength = Math.round(
    clamp(Math.abs((ranked[0]?.ret ?? 0) - (ranked[ranked.length - 1]?.ret ?? 0)) * 3, 0, 100),
  );

  return {
    leaders: flow.sectorLeadership,
    laggards: flow.sectorLaggards,
    rotationStrength,
    factorRotationJa: flow.factorRotationLabelJa,
    noteJa: `${flow.factorRotationLabelJa} · 強度 ${rotationStrength}`,
  };
}

function buildFlowImbalance(macro: ReturnType<typeof buildMarketIndicatorsSnapshot>): FlowImbalanceMetrics {
  let upVol = 0;
  let downVol = 0;
  for (const s of SAMPLE_STOCKS) {
    const bars = safeBars(s.symbol);
    if (bars.length < 3) continue;
    const r = returnPct(bars);
    const vol = s.volume;
    if (r >= 0) upVol += vol;
    else downVol += vol;
  }
  const total = upVol + downVol || 1;
  const buyPressurePct = Math.round((upVol / total) * 100);
  const sellPressurePct = 100 - buyPressurePct;
  const imbalanceScore = Math.round(buyPressurePct - 50 + macro.indexMomentumPct * 0.5);
  return {
    buyPressurePct,
    sellPressurePct,
    imbalanceScore: clamp(imbalanceScore, -50, 50),
    noteJa: `買い圧力 ${buyPressurePct}% · 不均衡 ${imbalanceScore}`,
  };
}

function buildMarketBreadth(macro: ReturnType<typeof buildMarketIndicatorsSnapshot>): MarketBreadthMetrics {
  let advances = 0;
  let declines = 0;
  for (const s of SAMPLE_STOCKS) {
    const r = returnPct(safeBars(s.symbol));
    if (r > 0.5) advances += 1;
    else if (r < -0.5) declines += 1;
  }
  const advanceDeclineRatio =
    declines > 0 ? Math.round((advances / declines) * 100) / 100 : advances > 0 ? 2 : 1;
  const breadthScore = Math.round(
    clamp(macro.breadthPctAboveMa50 * 0.6 + advanceDeclineRatio * 15, 0, 100),
  );
  return {
    pctAboveMa50: Math.round(macro.breadthPctAboveMa50),
    advanceDeclineRatio,
    newHighLowProxy: Math.round((advances - declines) * 5),
    breadthScore,
    noteJa: `MA50上 ${macro.breadthPctAboveMa50.toFixed(0)}% · A/D ${advanceDeclineRatio.toFixed(2)}`,
  };
}

function buildPanicEuphoria(
  ind: ReturnType<typeof buildCrossAssetIndicators>,
  breadth: MarketBreadthMetrics,
): PanicEuphoriaReading {
  const fearGreedScore = Math.round(
    clamp(50 + breadth.breadthScore * 0.35 - ind.vixProxy * 1.2, 0, 100),
  );
  let state: PanicEuphoriaReading['state'] = 'neutral';
  if (ind.vixProxy >= PANIC_VIX_THRESHOLD || breadth.pctAboveMa50 < PANIC_BREADTH_THRESHOLD) {
    state = 'panic';
  } else if (breadth.pctAboveMa50 >= EUPHORIA_BREADTH_THRESHOLD && ind.vixProxy < 16) {
    state = 'euphoria';
  } else if (fearGreedScore < 42) state = 'cautious';

  return {
    state,
    fearGreedScore,
    vixProxy: ind.vixProxy,
    noteJa:
      state === 'panic'
        ? 'パニック検出 — システミックリスク上昇'
        : state === 'euphoria'
          ? 'ユーフォリア — 反転リスク監視'
          : `ファー・グリード ${fearGreedScore}`,
  };
}

function buildCorrelationAlerts(monitor: CorrelationMonitor): CorrelationBreakdownAlert[] {
  const alerts: CorrelationBreakdownAlert[] = [];
  for (const p of monitor.pairs) {
    if (!p.alert) continue;
    const severity =
      Math.abs(p.delta) >= 0.4 ? 'critical' : Math.abs(p.delta) >= 0.3 ? 'high' : 'watch';
    alerts.push({
      id: `corr-${p.pairLabelJa}`,
      severity,
      titleJa: `相関ブレイク: ${p.pairLabelJa}`,
      detailJa: `ρ ${p.priorCorrelation} → ${p.correlation} (Δ ${p.delta})`,
    });
  }
  if (monitor.averageCorrelation > 0.75 && monitor.correlationRegime !== 'normal_market') {
    alerts.push({
      id: 'corr-cluster',
      severity: 'high',
      titleJa: '相関クラスタリング',
      detailJa: `平均|ρ| ${monitor.averageCorrelation} — 分散効果低下`,
    });
  }
  return alerts;
}

function regimeAligned(
  marketRegime: MarketRegimeResult,
  intermarket: IntermarketRegimeId,
): { aligned: boolean; noteJa: string } {
  const riskOnIds: IntermarketRegimeId[] = ['global_risk_on'];
  const riskOffIds: IntermarketRegimeId[] = ['global_risk_off', 'liquidity_crunch', 'growth_slowdown'];
  const isRiskOn = marketRegime.regimeId === 'risk_on' || marketRegime.regimeId === 'liquidity_bull';
  const isRiskOff = marketRegime.regimeId === 'risk_off' || marketRegime.regimeId === 'recession_fear';
  const aligned =
    (isRiskOn && riskOnIds.includes(intermarket)) ||
    (isRiskOff && riskOffIds.includes(intermarket)) ||
    intermarket === 'mixed_transition';
  return {
    aligned,
    noteJa: aligned
      ? '銘柄レジームとインターマーケットが整合'
      : 'レジーム乖離 — 予測・執行に注意',
  };
}

export function snapshotFromMonitor(monitor: CorrelationMonitor): MarketIntelligenceSnapshot {
  const pairCorrelations: Record<string, number> = {};
  const keys = ['eq_bond', 'eq_cmd', 'eq_fx', 'hy_eq'];
  monitor.pairs.forEach((p, i) => {
    pairCorrelations[keys[i] ?? `p${i}`] = p.correlation;
  });
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    averageCorrelation: monitor.averageCorrelation,
    pairCorrelations,
  };
}

/** マーケット・インテリジェンス統合レポート */
export function buildMarketIntelligenceReport(params: {
  regime?: MarketRegimeResult;
  priorSnapshot?: MarketIntelligenceSnapshot | null;
}): { report: MarketIntelligenceReport; snapshot: MarketIntelligenceSnapshot } {
  const macro = buildMarketIndicatorsSnapshot();
  const ind = buildCrossAssetIndicators();
  const flow = evaluateCrossAssetLiquidityFlow(macro);
  const marketRegime =
    params.regime ??
    ({
      regimeId: 'risk_on',
      labelJa: '',
      confidenceScore: 50,
      riskScore: 50,
      preferredSectors: [],
      avoidSectors: [],
      summaryJa: '',
      indicators: macro,
      regimeScores: {},
    } satisfies MarketRegimeResult);

  const correlationMonitor = buildCorrelationMonitor(params.priorSnapshot ?? null);
  const intermarketRegime = buildIntermarketRegime(flow, macro);
  const liquidityRegime = buildLiquidityRegime(flow);
  const volSurface = buildVolSurface();
  const dealerGamma = buildDealerGamma(macro);
  const earningsDrift = buildEarningsDrift();
  const macroSurprise = buildMacroSurprise(ind, macro);
  const newsSentiment = buildNewsSentiment();
  const sectorRotation = buildSectorRotation(flow);
  const flowImbalance = buildFlowImbalance(macro);
  const marketBreadth = buildMarketBreadth(macro);
  const panicEuphoria = buildPanicEuphoria(ind, marketBreadth);
  const correlationAlerts = buildCorrelationAlerts(correlationMonitor);
  const alignment = regimeAligned(marketRegime, intermarketRegime.regimeId);

  const systemicRiskScore = Math.round(
    clamp(
      ind.vixProxy * 1.5 +
        (100 - marketBreadth.breadthScore) * 0.4 +
        macroSurprise.surpriseIndex * 0.8 +
        (panicEuphoria.state === 'panic' ? 25 : panicEuphoria.state === 'euphoria' ? 10 : 0) +
        correlationAlerts.length * 8,
      0,
      100,
    ),
  );

  const executionTimingBias = Math.round(
    clamp(
      50 +
        flowImbalance.imbalanceScore * 0.4 +
        newsSentiment.weightInRegime * 30 -
        (panicEuphoria.state === 'panic' ? 25 : 0) -
        (volSurface.surfaceLevel === 'inverted' ? 15 : 0),
      0,
      100,
    ),
  );

  let healthStatus: 'green' | 'yellow' | 'red' = 'green';
  if (panicEuphoria.state === 'panic' || systemicRiskScore >= 70) healthStatus = 'red';
  else if (
    !alignment.aligned ||
    correlationAlerts.some((a) => a.severity === 'critical') ||
    liquidityRegime.regimeId === 'contraction'
  ) {
    healthStatus = 'yellow';
  }

  const verdictJa =
    healthStatus === 'green'
      ? `${intermarketRegime.labelJa} · 執行バイアス ${executionTimingBias}`
      : healthStatus === 'yellow'
        ? `構造変化の兆候 — ${correlationAlerts[0]?.titleJa ?? liquidityRegime.noteJa}`
        : `システミックリスク — ${panicEuphoria.noteJa}`;

  const report: MarketIntelligenceReport = {
    generatedAt: new Date().toISOString(),
    intermarketRegime,
    correlationMonitor,
    liquidityRegime,
    volSurface,
    dealerGamma,
    earningsDrift,
    macroSurprise,
    newsSentiment,
    sectorRotation,
    flowImbalance,
    marketBreadth,
    panicEuphoria,
    correlationAlerts,
    crossAssetFlow: flow,
    regimeAlignment: {
      marketRegimeId: marketRegime.regimeId,
      intermarketRegimeId: intermarketRegime.regimeId,
      aligned: alignment.aligned,
      noteJa: alignment.noteJa,
    },
    systemicRiskScore,
    executionTimingBias,
    healthStatus,
    verdictJa,
  };

  return { report, snapshot: snapshotFromMonitor(correlationMonitor) };
}

/** 適応執行・レジーム予測へのブースト */
export function intelligenceRegimeBoost(report: MarketIntelligenceReport): number {
  return clamp((report.executionTimingBias - 50) / 50, -0.2, 0.2);
}

export function intelligenceTimingAdjust(report: MarketIntelligenceReport): number {
  if (report.panicEuphoria.state === 'panic') return -18;
  if (report.panicEuphoria.state === 'euphoria') return -8;
  if (report.flowImbalance.imbalanceScore > 15) return 10;
  if (report.volSurface.surfaceLevel === 'inverted') return -12;
  return report.executionTimingBias > 60 ? 8 : 0;
}
