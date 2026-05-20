import {
  CORRELATION_CRITICAL_THRESHOLD,
  DEFAULT_MAX_PORTFOLIO_BETA,
  FACTOR_LABEL,
  HHI_HIGH,
  HHI_WATCH,
  INVESTMENT_THEME_LABEL,
  SECTOR_CONCENTRATION_CRITICAL_PCT,
  SECTOR_CONCENTRATION_HIGH_PCT,
  SECTOR_CONCENTRATION_WATCH_PCT,
  SECTOR_TO_INVESTMENT_THEME,
  THEME_OVERLAP_HIGH_PCT,
  THEME_OVERLAP_WATCH_PCT,
} from '../constants/portfolioConstruction';
import { SECTOR_THEME_LABEL } from '../constants/marketRegime';
import { findStock, getSamplePriceHistory } from '../data/sampleStocks';
import type {
  ConcentrationSeverity,
  CorrelatedPair,
  FactorExposure,
  HeatMapRow,
  InvestmentTheme,
  PortfolioConstructionInput,
  PortfolioConstructionReport,
  PortfolioConstructionWarning,
  PortfolioPositionAnalysis,
  SectorExposure,
  StressScenario,
  ThemeOverlapGroup,
} from '../types/portfolioConstruction';
import type { MarketRegimeId } from '../types/marketRegime';
import type { PortfolioPosition } from '../types';
import {
  analyzeCrisisCorrelation,
  assignStressCorrelationClusters,
} from './crisisCorrelationEngine';
import { buildCrossAssetPortfolioGuidance } from './crossAssetLiquidityFlowEngine';
import { stockToSectorTheme } from './marketIndicators';
import { buildMarketIndicatorsSnapshot } from './marketIndicators';
import { toMYR } from './fx';
import { safeShares, safePrice } from '../utils/safeNumeric';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function severityFromWeight(
  weightPct: number,
  watch: number,
  high: number,
  critical: number,
): ConcentrationSeverity {
  if (weightPct >= critical) return 'critical';
  if (weightPct >= high) return 'high';
  if (weightPct >= watch) return 'watch';
  return 'ok';
}

function intensityFromWeight(weightPct: number, criticalPct: number): number {
  if (weightPct >= criticalPct) return 4;
  if (weightPct >= criticalPct * 0.75) return 3;
  if (weightPct >= criticalPct * 0.5) return 2;
  if (weightPct >= criticalPct * 0.25) return 1;
  return 0;
}

import { dailyReturns } from './crisisCorrelationEngine';

function estimateVolatilityPct(symbol: string): number {
  try {
    const bars = getSamplePriceHistory(symbol);
    const rets = dailyReturns(bars);
    if (rets.length < 5) return 20;
    const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
    const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  } catch {
    return 22;
  }
}

function estimateBeta(symbol: string, marketVolPct: number): number {
  const vol = estimateVolatilityPct(symbol);
  return clamp(vol / Math.max(marketVolPct, 10), 0.5, 2.2);
}

function liquidityScore(volume: number, marketCap: number): number {
  const volScore = Math.min(100, (volume / 1_000_000) * 25);
  const capScore = Math.min(100, Math.log10(Math.max(marketCap, 1)) * 12);
  return (volScore + capScore) / 2;
}

function maxLiquidWeightPct(liquidityScore: number, volume: number): number {
  let cap = 15;
  if (liquidityScore >= 70) cap = 12;
  else if (liquidityScore >= 50) cap = 8;
  else if (liquidityScore >= 35) cap = 5;
  else cap = 3;
  if (volume < 500_000) cap = Math.min(cap, 4);
  return cap;
}

function buildPositionAnalyses(
  portfolio: PortfolioPosition[],
  totalValueMYR: number,
  marketVolPct: number,
): PortfolioPositionAnalysis[] {
  return portfolio
    .filter((p) => safeShares(p.shares, 0) > 0)
    .map((p) => {
      const stock = findStock(p.symbol);
      const shares = safeShares(p.shares, 0);
      const price = safePrice(p.currentPrice, p.averageBuyPrice, 0);
      const valueMYR = toMYR(price * shares, p.currency);
      const weightPct = totalValueMYR > 0 ? (valueMYR / totalValueMYR) * 100 : 0;
      const sector = stock ? stockToSectorTheme(stock) : 'growth';
      const liq = stock ? liquidityScore(stock.volume, stock.marketCap) : 40;
      return {
        positionId: p.id,
        symbol: p.symbol,
        name: stock?.name ?? p.symbol,
        market: p.market,
        sector,
        investmentTheme: SECTOR_TO_INVESTMENT_THEME[sector],
        weightPct,
        valueMYR,
        betaProxy: estimateBeta(p.symbol, marketVolPct),
        liquidityScore: liq,
        maxLiquidWeightPct: maxLiquidWeightPct(liq, stock?.volume ?? 0),
      };
    });
}

function computeSectorExposures(positions: PortfolioPositionAnalysis[]): SectorExposure[] {
  const map = new Map<string, { weight: number; count: number; sector: PortfolioPositionAnalysis['sector'] }>();
  for (const p of positions) {
    const cur = map.get(p.sector) ?? { weight: 0, count: 0, sector: p.sector };
    cur.weight += p.weightPct;
    cur.count += 1;
    map.set(p.sector, cur);
  }
  return [...map.values()]
    .map((v) => ({
      sector: v.sector,
      weightPct: Math.round(v.weight * 10) / 10,
      positionCount: v.count,
      severity: severityFromWeight(
        v.weight,
        SECTOR_CONCENTRATION_WATCH_PCT,
        SECTOR_CONCENTRATION_HIGH_PCT,
        SECTOR_CONCENTRATION_CRITICAL_PCT,
      ),
    }))
    .sort((a, b) => b.weightPct - a.weightPct);
}

function computeThemeOverlaps(positions: PortfolioPositionAnalysis[]): ThemeOverlapGroup[] {
  const map = new Map<InvestmentTheme, { symbols: string[]; weight: number }>();
  for (const p of positions) {
    const cur = map.get(p.investmentTheme) ?? { symbols: [], weight: 0 };
    cur.symbols.push(p.symbol);
    cur.weight += p.weightPct;
    map.set(p.investmentTheme, cur);
  }
  return [...map.entries()]
    .map(([theme, v]) => ({
      theme,
      symbols: v.symbols,
      combinedWeightPct: Math.round(v.weight * 10) / 10,
      severity: severityFromWeight(v.weight, THEME_OVERLAP_WATCH_PCT, THEME_OVERLAP_HIGH_PCT, 65),
    }))
    .filter((t) => t.combinedWeightPct >= THEME_OVERLAP_WATCH_PCT || t.symbols.length >= 2)
    .sort((a, b) => b.combinedWeightPct - a.combinedWeightPct);
}

function buildHeatMapRows(
  items: { label: string; weightPct: number; severity: ConcentrationSeverity }[],
  criticalPct: number,
): HeatMapRow[] {
  return items.map((item) => ({
    label: item.label,
    weightPct: item.weightPct,
    intensity: intensityFromWeight(item.weightPct, criticalPct),
    severity: item.severity,
  }));
}

function computeHerfindahl(weights: number[]): number {
  const fractions = weights.map((w) => w / 100);
  return fractions.reduce((s, f) => s + f * f, 0);
}

function computePortfolioBeta(positions: PortfolioPositionAnalysis[]): number {
  if (positions.length === 0) return 1;
  const total = positions.reduce((s, p) => s + p.weightPct, 0) || 1;
  return (
    Math.round(
      (positions.reduce((s, p) => s + p.betaProxy * (p.weightPct / total), 0) * 100) / 100,
    )
  );
}

function computeFactorExposures(positions: PortfolioPositionAnalysis[]): FactorExposure[] {
  const total = positions.reduce((s, p) => s + p.weightPct, 0) || 1;
  let valueW = 0;
  let growthW = 0;
  let momentumW = 0;
  let qualityW = 0;
  let sizeW = 0;

  for (const p of positions) {
    const w = p.weightPct / total;
    const stock = findStock(p.symbol);
    if (!stock) continue;
    const per = stock.per;
    const ret = estimateVolatilityPct(p.symbol);
    const mom = (() => {
      try {
        const bars = getSamplePriceHistory(p.symbol);
        if (bars.length < 2) return 0;
        return ((bars[bars.length - 1].close - bars[0].close) / bars[0].close) * 100;
      } catch {
        return 0;
      }
    })();

    if (per > 0 && per < 18) valueW += w * 80;
    else if (per > 28) valueW -= w * 40;
    if (per > 22 || p.sector === 'technology' || p.sector === 'growth') growthW += w * 70;
    if (mom > 5) momentumW += w * Math.min(100, mom * 3);
    if (mom < -5) momentumW -= w * 30;
    if (stock.dividendYield >= 3) qualityW += w * 60;
    if (stock.marketCap > 50_000_000_000) sizeW += w * 70;
    else if (stock.marketCap < 5_000_000_000) sizeW -= w * 40;
  }

  const toExposure = (
    factor: FactorExposure['factor'],
    labelJa: string,
    raw: number,
  ): FactorExposure => {
    const exposure = Math.round(clamp(raw, -100, 100));
    const tilt: FactorExposure['tilt'] =
      exposure > 25 ? 'overweight' : exposure < -25 ? 'underweight' : 'neutral';
    return { factor, labelJa, exposure, tilt };
  };

  return [
    toExposure('value', FACTOR_LABEL.value, valueW * 100 - 50),
    toExposure('growth', FACTOR_LABEL.growth, growthW * 100 - 50),
    toExposure('momentum', FACTOR_LABEL.momentum, momentumW * 100 - 50),
    toExposure('quality', FACTOR_LABEL.quality, qualityW * 100 - 50),
    toExposure('size', FACTOR_LABEL.size, sizeW * 100 - 50),
  ];
}

export function macroRiskReduction(regimeId?: MarketRegimeId): { pct: number; noteJa: string } {
  switch (regimeId) {
    case 'risk_off':
      return { pct: 25, noteJa: 'リスクオフ環境: 総エクスポージャー25%削減を検討' };
    case 'recession_fear':
      return { pct: 30, noteJa: '景気後退懸念: シクリカル・高ベータを削減' };
    case 'high_volatility':
      return { pct: 20, noteJa: '高ボラ環境: レバー・集中を抑え現金比率を確保' };
    case 'tightening_bear':
      return { pct: 15, noteJa: '引き締め局面: 成長株のウェイトを抑制' };
    case 'inflation_fear':
      return { pct: 10, noteJa: 'インフレ懸念: エネルギー以外の過集中を回避' };
    default:
      return { pct: 0, noteJa: '現在のマクロ環境では大きな削減は不要（ルールベース）' };
  }
}

function runStressTests(
  positions: PortfolioPositionAnalysis[],
  totalValueMYR: number,
): StressScenario[] {
  const beta = computePortfolioBeta(positions);
  const scenarios = [
    { id: 'mkt-10', labelJa: '市場 -10%', shock: -10 },
    { id: 'mkt-20', labelJa: '市場 -20%', shock: -20 },
    { id: 'rates', labelJa: '金利ショック（成長-15%）', shock: -15 * 0.7 },
    { id: 'oil', labelJa: '原油高（エネルギー+、他-5%）', shock: -5 },
    { id: 'fx', labelJa: 'USD急騰（新興-8%）', shock: -8 },
  ];
  return scenarios.map((s) => {
    const impactPct = Math.round(s.shock * beta * 10) / 10;
    return {
      id: s.id,
      labelJa: s.labelJa,
      portfolioImpactPct: impactPct,
      estimatedLossMYR: Math.round(totalValueMYR * (impactPct / 100)),
    };
  });
}

function buildWarnings(
  report: Omit<PortfolioConstructionReport, 'warnings' | 'healthScore'>,
): PortfolioConstructionWarning[] {
  const warnings: PortfolioConstructionWarning[] = [];

  for (const s of report.sectorExposures) {
    if (s.severity === 'critical' || s.severity === 'high') {
      warnings.push({
        id: `sector-${s.sector}`,
        severity: s.severity,
        titleJa: `セクター集中: ${SECTOR_THEME_LABEL[s.sector]}`,
        detailJa: `ポートフォリオの${s.weightPct}%が${SECTOR_THEME_LABEL[s.sector]}に集中`,
      });
    }
  }

  for (const t of report.themeOverlaps) {
    if (t.severity !== 'ok') {
      warnings.push({
        id: `theme-${t.theme}`,
        severity: t.severity,
        titleJa: `テーマ重複: ${INVESTMENT_THEME_LABEL[t.theme]}`,
        detailJa: `${t.symbols.join('・')} で合計 ${t.combinedWeightPct}%`,
      });
    }
  }

  for (const pair of report.correlatedPairs.slice(0, 5)) {
    if (pair.correlation >= CORRELATION_CRITICAL_THRESHOLD) {
      warnings.push({
        id: `corr-${pair.symbolA}-${pair.symbolB}`,
        severity: 'high',
        titleJa: `高相関: ${pair.symbolA} × ${pair.symbolB}`,
        detailJa: `ストレス調整相関 ${pair.correlation} — 実質的に同じリスク`,
      });
    }
  }

  for (const cluster of report.crisisCorrelation.betaClusters) {
    if (cluster.severity === 'critical' || cluster.severity === 'high') {
      warnings.push({
        id: `beta-cluster-${cluster.id}`,
        severity: cluster.severity,
        titleJa: `隠れベータ・クラスター ${cluster.id}`,
        detailJa: `${cluster.symbols.join('・')} β≈${cluster.avgBeta} · 合計 ${cluster.combinedWeightPct}%`,
      });
    }
  }

  if (report.crisisCorrelation.regimeId === 'crisis') {
    warnings.push({
      id: 'crisis-corr',
      severity: 'critical',
      titleJa: '危機相関レジーム',
      detailJa: report.crisisCorrelation.summaryJa,
    });
  }

  if (report.crossAssetGuidance.defense.active) {
    warnings.push({
      id: 'crisis-defense',
      severity: 'high',
      titleJa: '危機防御モード',
      detailJa: report.crossAssetGuidance.defense.actionsJa[0] ?? 'エクスポージャー削減を検討',
    });
  }

  if (report.totalExposureReductionPct > 0) {
    warnings.push({
      id: 'exposure-cut',
      severity: 'watch',
      titleJa: 'マクロ連動エクスポージャー削減',
      detailJa: `合計最大 ${report.totalExposureReductionPct}% のポジション縮小を推奨`,
    });
  }

  if (!report.betaWithinLimit) {
    warnings.push({
      id: 'beta',
      severity: 'high',
      titleJa: 'ポートフォリオベータ超過',
      detailJa: `β ${report.portfolioBeta} > 上限 ${report.maxPortfolioBeta}。高ベータ銘柄の削減を検討`,
    });
  }

  for (const p of report.positions) {
    if (p.weightPct > p.maxLiquidWeightPct) {
      warnings.push({
        id: `liq-${p.symbol}`,
        severity: p.weightPct > p.maxLiquidWeightPct * 2 ? 'high' : 'watch',
        titleJa: `流動性: ${p.symbol}`,
        detailJa: `配分 ${p.weightPct.toFixed(1)}% > 流動性上限 ${p.maxLiquidWeightPct}%`,
      });
    }
  }

  if (report.herfindahlIndex >= HHI_HIGH) {
    warnings.push({
      id: 'hhi',
      severity: 'high',
      titleJa: '集中度指数（HHI）が高い',
      detailJa: `HHI ${report.herfindahlIndex.toFixed(2)} — 銘柄・セクター分散を強化`,
    });
  } else if (report.herfindahlIndex >= HHI_WATCH) {
    warnings.push({
      id: 'hhi-watch',
      severity: 'watch',
      titleJa: '集中度指数に注意',
      detailJa: `HHI ${report.herfindahlIndex.toFixed(2)}`,
    });
  }

  if (report.macroRiskReductionPct > 0) {
    warnings.push({
      id: 'macro',
      severity: 'watch',
      titleJa: 'マクロリスク削減',
      detailJa: report.macroRiskNoteJa,
    });
  }

  return warnings;
}

function computeHealthScore(report: Omit<PortfolioConstructionReport, 'healthScore'>): number {
  let score = 100;
  for (const w of report.warnings) {
    if (w.severity === 'critical') score -= 18;
    else if (w.severity === 'high') score -= 10;
    else if (w.severity === 'watch') score -= 4;
  }
  if (!report.betaWithinLimit) score -= 12;
  score -= report.crisisCorrelation.clusterPenaltyScore;
  if (report.crossAssetGuidance.defense.active) score -= 8;
  return clamp(score, 0, 100);
}

/** ポートフォリオ構成の総合分析（決定論的） */
export function analyzePortfolioConstruction(
  input: PortfolioConstructionInput,
): PortfolioConstructionReport {
  const portfolio = input.portfolio.filter((p) => safeShares(p.shares, 0) > 0);
  const indicators = buildMarketIndicatorsSnapshot();
  const marketVol = indicators.volatilityProxyPct;

  let totalValueMYR = input.totalPortfolioValueMYR;
  if (totalValueMYR <= 0) {
    totalValueMYR = portfolio.reduce((s, p) => {
      const price = safePrice(p.currentPrice, p.averageBuyPrice, 0);
      return s + toMYR(price * safeShares(p.shares, 0), p.currency);
    }, 0);
  }

  const crossAssetGuidance = buildCrossAssetPortfolioGuidance(
    input.portfolioDrawdownPct ?? 0,
    indicators,
  );
  const dynamicMaxPortfolioBeta =
    input.maxPortfolioBeta ?? crossAssetGuidance.defense.dynamicBetaTarget.maxPortfolioBeta;
  const maxPortfolioBeta = dynamicMaxPortfolioBeta;

  let positions = buildPositionAnalyses(portfolio, totalValueMYR, marketVol);
  const crisisCorrelation = analyzeCrisisCorrelation(
    positions,
    indicators,
    crossAssetGuidance.flow,
  );
  positions = assignStressCorrelationClusters(
    positions,
    crisisCorrelation.stressAdjustedPairs,
    crisisCorrelation.effectiveCorrelationThreshold,
  );
  const correlatedPairs: CorrelatedPair[] = crisisCorrelation.stressAdjustedPairs.map((p) => ({
    symbolA: p.symbolA,
    symbolB: p.symbolB,
    correlation: p.stressAdjustedCorrelation,
  }));

  const sectorExposures = computeSectorExposures(positions);
  const themeOverlaps = computeThemeOverlaps(positions);
  const weights = positions.map((p) => p.weightPct);
  const herfindahlIndex = Math.round(computeHerfindahl(weights) * 1000) / 1000;

  const sectorHeatMap = buildHeatMapRows(
    sectorExposures.map((s) => ({
      label: SECTOR_THEME_LABEL[s.sector],
      weightPct: s.weightPct,
      severity: s.severity,
    })),
    SECTOR_CONCENTRATION_CRITICAL_PCT,
  );

  const themeHeatMap = buildHeatMapRows(
    themeOverlaps.map((t) => ({
      label: INVESTMENT_THEME_LABEL[t.theme],
      weightPct: t.combinedWeightPct,
      severity: t.severity,
    })),
    55,
  );

  const portfolioBeta = computePortfolioBeta(positions);
  const betaWithinLimit = portfolioBeta <= maxPortfolioBeta;
  const betaReductionSuggestionPct = betaWithinLimit
    ? 0
    : Math.round(((portfolioBeta - maxPortfolioBeta) / portfolioBeta) * 100);

  const factorExposures = computeFactorExposures(positions);
  const macro = macroRiskReduction(input.regime?.regimeId);
  const stressTests = runStressTests(positions, totalValueMYR);

  const partial: Omit<PortfolioConstructionReport, 'warnings' | 'healthScore'> = {
    computedAt: new Date().toISOString(),
    positionCount: positions.length,
    totalValueMYR,
    positions,
    sectorExposures,
    themeOverlaps,
    correlatedPairs,
    sectorHeatMap,
    themeHeatMap,
    portfolioBeta,
    maxPortfolioBeta,
    betaWithinLimit,
    betaReductionSuggestionPct,
    factorExposures,
    herfindahlIndex,
    macroRiskReductionPct: macro.pct,
    macroRiskNoteJa: macro.noteJa,
    stressTests,
    crisisCorrelation,
    crossAssetGuidance,
    dynamicMaxPortfolioBeta,
    totalExposureReductionPct: crossAssetGuidance.totalExposureReductionPct,
  };

  const warnings = buildWarnings(partial);
  const healthScore = computeHealthScore({ ...partial, warnings });

  return { ...partial, warnings, healthScore };
}

/** 流動性調整後の最大配分%（サイジング連携） */
export function liquidityAdjustedMaxAllocationPct(
  symbol: string,
  portfolio: PortfolioPosition[],
  totalValueMYR: number,
): number | null {
  if (portfolio.length === 0 || totalValueMYR <= 0) return null;
  const report = analyzePortfolioConstruction({ portfolio, totalPortfolioValueMYR: totalValueMYR });
  const row = report.positions.find((p) => p.symbol === symbol);
  return row?.maxLiquidWeightPct ?? null;
}
