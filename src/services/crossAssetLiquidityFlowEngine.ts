import {
  CAPITAL_FLOW_LABEL,
  CROSS_ASSET_PROXY,
  DEFAULT_MAX_BETA_CRISIS,
  DEFAULT_MAX_BETA_HIGH_VOL,
  DEFAULT_MAX_BETA_NORMAL,
  DRAWDOWN_REDUCTION_TIERS,
  FACTOR_ROTATION_LABEL,
  LIQUIDITY_REGIME_LABEL,
} from '../constants/crossAssetFlow';
import { SAMPLE_STOCKS, getSamplePriceHistory } from '../data/sampleStocks';
import type { CorrelationRegimeId } from '../types/crisisCorrelation';
import type {
  CapitalFlowId,
  CrisisDefensePlan,
  CrossAssetFlowSnapshot,
  CrossAssetIndicators,
  CrossAssetPortfolioGuidance,
  DrawdownExposureReduction,
  DynamicBetaTarget,
  FactorRotationId,
  LiquidityRegimeId,
} from '../types/crossAssetFlow';
import type { MarketIndicatorsSnapshot, SectorTheme } from '../types/marketRegime';
import type { PerformancePoint } from '../types';
import type { PriceBar } from '../types';
import { buildMarketIndicatorsSnapshot, stockToSectorTheme } from './marketIndicators';
import { detectCorrelationRegime } from './crisisCorrelationEngine';

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

function volatilityPct(bars: PriceBar[]): number {
  if (bars.length < 5) return 15;
  const rets: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i - 1].close > 0) {
      rets.push(((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100);
    }
  }
  const mean = rets.reduce((a, b) => a + b, 0) / Math.max(rets.length, 1);
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(rets.length, 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

/** ボラのボラ（MOVE代理） */
function volOfVolPct(bars: PriceBar[], window = 10): number {
  if (bars.length < window + 5) return 12;
  const rolling: number[] = [];
  for (let end = window; end < bars.length; end++) {
    const slice = bars.slice(end - window, end + 1);
    rolling.push(volatilityPct(slice));
  }
  if (rolling.length < 3) return 12;
  const mean = rolling.reduce((a, b) => a + b, 0) / rolling.length;
  const variance =
    rolling.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(rolling.length, 1);
  return Math.sqrt(variance);
}

function sectorReturn(sector: SectorTheme): number {
  const stocks = SAMPLE_STOCKS.filter((s) => stockToSectorTheme(s) === sector);
  if (stocks.length === 0) return 0;
  const rets = stocks.map((s) => returnPct(safeBars(s.symbol)));
  return rets.reduce((a, b) => a + b, 0) / rets.length;
}

/** DXY, US10Y, VIX, MOVE, HYスプレッド（サンプル代理） */
export function buildCrossAssetIndicators(): CrossAssetIndicators {
  const usMom = returnPct(safeBars(CROSS_ASSET_PROXY.dxyBasket));
  const emMom =
    (returnPct(safeBars('0820EA')) + returnPct(safeBars('0700'))) / 2;
  const dxyProxy = Math.round(clamp((usMom - emMom) * 2.5, -100, 100) * 10) / 10;

  const financial = returnPct(safeBars(CROSS_ASSET_PROXY.usRates));
  const growth = returnPct(safeBars(CROSS_ASSET_PROXY.growth));
  const us10yProxy = Math.round(clamp(50 + (financial - growth) * 3, 0, 100));

  const vixProxy = Math.round(volatilityPct(safeBars(CROSS_ASSET_PROXY.volIndex)) * 10) / 10;

  const moveProxy = Math.round(volOfVolPct(safeBars(CROSS_ASSET_PROXY.bondVol)) * 10) / 10;

  const hy = returnPct(safeBars(CROSS_ASSET_PROXY.highYield));
  const lv = returnPct(safeBars(CROSS_ASSET_PROXY.lowVol));
  const hySpreadProxy = Math.round(clamp(3 + (lv - hy) * 0.4, 0, 15) * 100) / 100;

  return {
    dxyProxy,
    us10yProxy,
    vixProxy,
    moveProxy,
    hySpreadProxy,
    computedAt: new Date().toISOString(),
  };
}

function detectLiquidityRegime(
  indicators: CrossAssetIndicators,
  macro: MarketIndicatorsSnapshot,
): LiquidityRegimeId {
  const score =
    macro.liquidityProxy * 0.5 +
    (100 - indicators.hySpreadProxy * 8) * 0.25 +
    (40 - indicators.moveProxy) * 0.5 +
    macro.indexMomentumPct * 0.3;
  if (score >= 58 && indicators.hySpreadProxy < 5) return 'expansion';
  if (score < 42 || indicators.hySpreadProxy > 8 || indicators.vixProxy > 28) return 'contraction';
  return 'neutral';
}

function detectCapitalFlow(
  indicators: CrossAssetIndicators,
  macro: MarketIndicatorsSnapshot,
): CapitalFlowId {
  let score = 0;
  if (macro.indexMomentumPct > 2) score += 1;
  if (macro.breadthPctAboveMa50 > 55) score += 1;
  if (indicators.vixProxy < 22) score += 1;
  if (indicators.dxyProxy < 15) score += 0.5;
  if (macro.defensiveVsGrowthSpread > 3) score -= 1;
  if (indicators.hySpreadProxy > 6) score -= 1;
  if (indicators.vixProxy > 26) score -= 2;
  if (indicators.dxyProxy > 25) score -= 1;
  if (score >= 2) return 'risk_on';
  if (score <= -1) return 'risk_off';
  return 'neutral';
}

function detectFactorRotation(
  macro: MarketIndicatorsSnapshot,
  flow: CapitalFlowId,
): FactorRotationId {
  const rot = macro.sectorRotationScore;
  const def = macro.defensiveVsGrowthSpread;
  if (def > 4 && flow === 'risk_off') return 'defensive_rotation';
  if (rot > 5 && flow === 'risk_on') return 'cyclical_rotation';
  if (rot < -4) return 'growth_to_value';
  if (rot > 4) return 'value_to_growth';
  return 'stable';
}

function rankSectorLeadership(): { leaders: SectorTheme[]; laggards: SectorTheme[] } {
  const sectors: SectorTheme[] = [
    'technology',
    'financial',
    'energy',
    'consumer',
    'healthcare',
    'dividend',
    'etf',
    'utilities',
    'industrial',
    'growth',
  ];
  const ranked = sectors
    .map((sector) => ({ sector, ret: sectorReturn(sector) }))
    .sort((a, b) => b.ret - a.ret);
  return {
    leaders: ranked.slice(0, 3).map((r) => r.sector),
    laggards: ranked.slice(-2).map((r) => r.sector),
  };
}

export function evaluateCrossAssetLiquidityFlow(
  macro?: MarketIndicatorsSnapshot,
): CrossAssetFlowSnapshot {
  const indicators = buildCrossAssetIndicators();
  const macroSnap = macro ?? buildMarketIndicatorsSnapshot();
  const liquidityRegime = detectLiquidityRegime(indicators, macroSnap);
  const capitalFlow = detectCapitalFlow(indicators, macroSnap);
  const factorRotation = detectFactorRotation(macroSnap, capitalFlow);
  const { leaders, laggards } = rankSectorLeadership();

  const liquidityScore = Math.round(
    clamp(
      macroSnap.liquidityProxy * 0.6 +
        (liquidityRegime === 'expansion' ? 20 : liquidityRegime === 'contraction' ? -20 : 0) -
        indicators.hySpreadProxy * 4,
      0,
      100,
    ),
  );

  const flowScore = Math.round(
    clamp(
      50 +
        (capitalFlow === 'risk_on' ? 25 : capitalFlow === 'risk_off' ? -25 : 0) +
        macroSnap.indexMomentumPct * 0.5 -
        indicators.vixProxy * 0.8,
      0,
      100,
    ),
  );

  const summaryJa = `${LIQUIDITY_REGIME_LABEL[liquidityRegime]} · ${CAPITAL_FLOW_LABEL[capitalFlow]} · ${FACTOR_ROTATION_LABEL[factorRotation]}`;

  return {
    indicators,
    liquidityRegime,
    liquidityLabelJa: LIQUIDITY_REGIME_LABEL[liquidityRegime],
    capitalFlow,
    capitalFlowLabelJa: CAPITAL_FLOW_LABEL[capitalFlow],
    factorRotation,
    factorRotationLabelJa: FACTOR_ROTATION_LABEL[factorRotation],
    sectorLeadership: leaders,
    sectorLaggards: laggards,
    liquidityScore,
    flowScore,
    summaryJa,
  };
}

export function computePortfolioDrawdownPct(
  history: PerformancePoint[],
  currentValueMYR: number,
): number {
  const values = [...history.map((h) => h.portfolioValueMYR), currentValueMYR].filter(
    (v) => Number.isFinite(v) && v > 0,
  );
  if (values.length === 0) return 0;
  const peak = Math.max(...values);
  if (peak <= 0) return 0;
  return Math.round(clamp(((peak - currentValueMYR) / peak) * 100, 0, 100) * 10) / 10;
}

export function drawdownExposureReduction(drawdownPct: number): DrawdownExposureReduction {
  for (const tier of DRAWDOWN_REDUCTION_TIERS) {
    if (drawdownPct >= tier.minPct) {
      return {
        drawdownPct,
        reductionPct: tier.reductionPct,
        noteJa: `ドローダウン ${drawdownPct.toFixed(1)}%: エクスポージャー ${tier.reductionPct}% 削減を推奨`,
      };
    }
  }
  return {
    drawdownPct,
    reductionPct: 0,
    noteJa: 'ドローダウンは許容範囲内',
  };
}

export function dynamicBetaTarget(
  correlationRegime: CorrelationRegimeId,
  flow: CrossAssetFlowSnapshot,
): DynamicBetaTarget {
  let maxPortfolioBeta = DEFAULT_MAX_BETA_NORMAL;
  let rationaleJa = '通常環境: ベータ上限 1.2';

  if (correlationRegime === 'crisis') {
    maxPortfolioBeta = DEFAULT_MAX_BETA_CRISIS;
    rationaleJa = '危機相関: ベータ上限を 0.85 に引き下げ';
  } else if (correlationRegime === 'high_volatility') {
    maxPortfolioBeta = DEFAULT_MAX_BETA_HIGH_VOL;
    rationaleJa = '高ボラ: ベータ上限を 1.0 に調整';
  }

  if (flow.capitalFlow === 'risk_off') {
    maxPortfolioBeta = Math.round((maxPortfolioBeta - 0.08) * 100) / 100;
    rationaleJa += ' · リスクオフフローでさらに抑制';
  } else if (flow.liquidityRegime === 'contraction') {
    maxPortfolioBeta = Math.round((maxPortfolioBeta - 0.05) * 100) / 100;
    rationaleJa += ' · 流動性収縮';
  }

  maxPortfolioBeta = clamp(maxPortfolioBeta, 0.7, 1.3);

  return { maxPortfolioBeta, rationaleJa };
}

export function buildCrisisDefensePlan(
  flow: CrossAssetFlowSnapshot,
  correlationRegime: CorrelationRegimeId,
  drawdownPct: number,
  macro?: MarketIndicatorsSnapshot,
): CrisisDefensePlan {
  const macroSnap = macro ?? buildMarketIndicatorsSnapshot();
  const drawdownReduction = drawdownExposureReduction(drawdownPct);
  const dynamicTarget = dynamicBetaTarget(correlationRegime, flow);

  const active =
    correlationRegime === 'crisis' ||
    flow.liquidityRegime === 'contraction' ||
    flow.capitalFlow === 'risk_off' ||
    drawdownReduction.reductionPct > 0;

  let exposureReductionPct = drawdownReduction.reductionPct;
  if (correlationRegime === 'crisis') exposureReductionPct = Math.max(exposureReductionPct, 30);
  else if (correlationRegime === 'high_volatility') {
    exposureReductionPct = Math.max(exposureReductionPct, 15);
  }
  if (flow.capitalFlow === 'risk_off') {
    exposureReductionPct = Math.max(exposureReductionPct, 20);
  }
  if (flow.liquidityRegime === 'contraction') {
    exposureReductionPct = Math.max(exposureReductionPct, 12);
  }

  const actionsJa: string[] = [];
  if (active) {
    actionsJa.push(`総エクスポージャー最大 ${exposureReductionPct}% 削減`);
    actionsJa.push(dynamicTarget.rationaleJa);
    if (flow.capitalFlow === 'risk_off') {
      actionsJa.push('高ベータ・シクリカル銘柄を優先的に縮小');
    }
    if (flow.liquidityRegime === 'contraction') {
      actionsJa.push('低流動性銘柄のウェイトを削減し現金比率を確保');
    }
    if (drawdownReduction.reductionPct > 0) {
      actionsJa.push(drawdownReduction.noteJa);
    }
    if (macroSnap.volatilityProxyPct > 26) {
      actionsJa.push('VIX/MOVE代理が高水準: ヘッジまたは分散強化');
    }
  } else {
    actionsJa.push('危機防御モードは非活性 — 通常のリスク管理を継続');
  }

  return {
    active,
    exposureReductionPct,
    dynamicBetaTarget: dynamicTarget,
    drawdownReduction,
    actionsJa,
  };
}

export function buildCrossAssetPortfolioGuidance(
  portfolioDrawdownPct: number,
  macro?: MarketIndicatorsSnapshot,
): CrossAssetPortfolioGuidance {
  const macroSnap = macro ?? buildMarketIndicatorsSnapshot();
  const flow = evaluateCrossAssetLiquidityFlow(macroSnap);
  const correlationRegime = detectCorrelationRegime(macroSnap, flow);
  const defense = buildCrisisDefensePlan(flow, correlationRegime, portfolioDrawdownPct, macroSnap);

  const totalExposureReductionPct = Math.min(
    50,
    defense.exposureReductionPct +
      (defense.dynamicBetaTarget.maxPortfolioBeta < 1 ? 5 : 0),
  );

  return {
    flow,
    defense,
    totalExposureReductionPct,
  };
}
