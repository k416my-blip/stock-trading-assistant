/**
 * Portfolio Risk & Exposure Intelligence — rule-based, local, explainable.
 */
import {
  DEFAULT_MAX_POSITION_CAP_PCT,
  FACTOR_LABELS_JA,
  HIDDEN_THEME_LABELS_JA,
  PANIC_CASH_RATIO_PCT,
  PANIC_MAX_POSITION_CAP_PCT,
  PORTFOLIO_RISK_REGULATORY_JA,
  PQE_BASE,
  PQE_DEDUCT_BETA_OVER,
  PQE_DEDUCT_CRITICAL_WARNING,
  PQE_DEDUCT_HIGH_WARNING,
  PQE_DEDUCT_HIDDEN_THEME,
  PQE_DEDUCT_LOW_DATA_RELIABILITY,
  PQE_DEDUCT_LIQUIDITY_CLUSTER,
  PQE_DEDUCT_MACRO_STRESS,
  PQE_DEDUCT_WATCH,
  PQE_DEFENSIVE_THRESHOLD,
  PQE_ESCALATION_THRESHOLD,
  STRESS_SCENARIO_LABELS_JA,
} from '../constants/portfolioRiskExposure';
import type { PortfolioPosition } from '../types';
import type {
  BuildPortfolioRiskExposureInput,
  ContagionLink,
  CorrelationCell,
  CountryExposureId,
  CurrencyExposureId,
  DependencyNode,
  DrawdownAttribution,
  FactorExposureItem,
  FactorId,
  HeatmapCell,
  HiddenExposureItem,
  HiddenExposureThemeId,
  HumanRiskOverride,
  IntegrationSnapshot,
  PortfolioReplayPoint,
  PortfolioRiskExposureBundle,
  RiskBudgetSlice,
  StressScenarioId,
  StressTestResult,
  TailScenarioId,
  WeakThesisItem,
} from '../types/portfolioRiskExposure';
import { analyzePortfolioConstruction } from './portfolioConstructionEngine';
import { findStock } from '../data/sampleStocks';
import { toMYR } from './fx';
import { safeShares, safePrice } from '../utils/safeNumeric';
import type { PortfolioRiskExposurePersisted } from './portfolioRiskExposureStorage';
import {
  appendAllocationHistory,
  loadPortfolioRiskExposureState,
  savePortfolioRiskExposureState,
} from './portfolioRiskExposureStorage';

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n * 10) / 10));
}

function marketToCountry(m: PortfolioPosition['market']): CountryExposureId {
  if (m === 'us') return 'us';
  if (m === 'hk') return 'china';
  if (m === 'bursa') return 'malaysia';
  return 'other';
}

function currencyOf(m: PortfolioPosition['market']): CurrencyExposureId {
  if (m === 'us') return 'USD';
  if (m === 'hk') return 'HKD';
  if (m === 'bursa') return 'MYR';
  return 'mixed';
}

function detectHiddenThemes(
  positions: ReturnType<typeof analyzePortfolioConstruction>['positions'],
): HiddenExposureItem[] {
  const buckets = new Map<HiddenExposureThemeId, { symbols: string[]; weight: number }>();

  const add = (id: HiddenExposureThemeId, sym: string, w: number) => {
    const row = buckets.get(id) ?? { symbols: [], weight: 0 };
    if (!row.symbols.includes(sym)) row.symbols.push(sym);
    row.weight += w;
    buckets.set(id, row);
  };

  for (const p of positions) {
    const stock = findStock(p.symbol);
    const name = (stock?.name ?? p.symbol).toLowerCase();
    if (p.market === 'us' && (p.sector === 'growth' || p.sector === 'technology')) {
      add('nasdaq', p.symbol, p.weightPct);
    }
    if (p.sector === 'technology' || /ai|chip|semi|nvidia|intel/i.test(name)) {
      add('ai', p.symbol, p.weightPct * 0.85);
      add('semiconductor', p.symbol, p.weightPct * 0.7);
    }
    if (p.sector === 'financial') add('rates', p.symbol, p.weightPct);
    if (p.market === 'hk' || /china|hong kong/i.test(name)) add('china', p.symbol, p.weightPct);
    if (p.market === 'us') add('usd', p.symbol, p.weightPct * 0.5);
    if (p.sector === 'energy' || p.investmentTheme === 'commodity') add('energy', p.symbol, p.weightPct);
    if (p.sector === 'financial') add('financials', p.symbol, p.weightPct);
  }

  return [...buckets.entries()]
    .map(([themeId, v]) => ({
      themeId,
      labelJa: HIDDEN_THEME_LABELS_JA[themeId],
      effectiveWeightPct: Math.round(v.weight * 10) / 10,
      symbols: v.symbols,
      detailJa:
        v.weight >= 35
          ? `見た目分散でも実質 ${HIDDEN_THEME_LABELS_JA[themeId]} に ${v.weight.toFixed(0)}% 相当`
          : `テーマ寄与 ${v.weight.toFixed(0)}%`,
    }))
    .filter((x) => x.effectiveWeightPct >= 15)
    .sort((a, b) => b.effectiveWeightPct - a.effectiveWeightPct);
}

function buildFactorExposures(
  constructionFactors: ReturnType<typeof analyzePortfolioConstruction>['factorExposures'],
  positions: ReturnType<typeof analyzePortfolioConstruction>['positions'],
): FactorExposureItem[] {
  const volW = positions.reduce((s, p) => s + p.weightPct * (p.betaProxy > 1.2 ? 1 : 0.5), 0);
  const liqW = positions.reduce((s, p) => s + p.weightPct * (p.liquidityScore < 45 ? 1 : 0.3), 0);
  const divW = positions.filter((p) => p.investmentTheme === 'income').reduce((s, p) => s + p.weightPct, 0);

  const base: FactorExposureItem[] = constructionFactors.map((f) => ({
    factor: f.factor as FactorId,
    labelJa: FACTOR_LABELS_JA[f.factor as FactorId] ?? f.labelJa,
    exposurePct: Math.abs(f.exposure),
    tiltJa: f.tilt === 'overweight' ? '過剰' : f.tilt === 'underweight' ? '不足' : '中立',
  }));

  const extra: FactorExposureItem[] = [
    {
      factor: 'dividend',
      labelJa: FACTOR_LABELS_JA.dividend,
      exposurePct: Math.round(divW),
      tiltJa: divW > 40 ? '過剰' : '中立',
    },
    {
      factor: 'volatility',
      labelJa: FACTOR_LABELS_JA.volatility,
      exposurePct: Math.round(volW),
      tiltJa: volW > 50 ? '過剰' : '中立',
    },
    {
      factor: 'liquidity',
      labelJa: FACTOR_LABELS_JA.liquidity,
      exposurePct: Math.round(liqW),
      tiltJa: liqW > 35 ? '低流動性集中' : '許容',
    },
  ];

  const merged = new Map<FactorId, FactorExposureItem>();
  for (const item of [...base, ...extra]) {
    const prev = merged.get(item.factor);
    if (!prev || item.exposurePct > prev.exposurePct) merged.set(item.factor, item);
  }
  return [...merged.values()];
}

function buildStressTests(
  report: ReturnType<typeof analyzePortfolioConstruction>,
  totalMYR: number,
  macroStress: number,
): StressTestResult[] {
  const extra: Array<{ id: StressScenarioId; impactPct: number; basis: string }> = [
    { id: 'vix_spike', impactPct: -8 - macroStress * 0.05, basis: 'VIX proxy × beta' },
    { id: 'rate_shock', impactPct: -6, basis: '金融・グロース感応' },
    { id: 'oil_shock', impactPct: -5, basis: 'エネルギー以外マイナス' },
    { id: 'ai_bubble_collapse', impactPct: -14, basis: 'テッククラスター' },
    { id: 'china_slowdown', impactPct: -7, basis: 'HK/中国関連' },
    { id: 'usd_spike', impactPct: -4, basis: '新興・輸出株' },
    { id: 'panic', impactPct: -18 - macroStress * 0.08, basis: '相関→1 近似' },
    { id: 'liquidity_crisis', impactPct: -22, basis: '低流動性銘柄倍' },
    { id: 'recession', impactPct: -12, basis: 'シクリカル集中' },
  ];

  const fromConstruction = report.stressTests.map((s) => ({
    id: s.id as StressScenarioId,
    labelJa: s.labelJa,
    portfolioImpactPct: s.portfolioImpactPct,
    estimatedLossMYR: s.estimatedLossMYR,
    ruleBasisJa: 'portfolioConstructionEngine',
  }));

  const extraResults = extra.map((e) => ({
    id: e.id,
    labelJa: STRESS_SCENARIO_LABELS_JA[e.id] ?? e.id,
    portfolioImpactPct: Math.round(e.impactPct * 10) / 10,
    estimatedLossMYR: Math.round(totalMYR * (e.impactPct / 100)),
    ruleBasisJa: e.basis,
  }));

  const byId = new Map<string, StressTestResult>();
  for (const r of [...fromConstruction, ...extraResults]) byId.set(r.id, r);
  return [...byId.values()].slice(0, 12);
}

function buildTailRisk(stress: StressTestResult[], totalMYR: number) {
  const ids: TailScenarioId[] = ['panic', 'liquidity_crisis', 'recession'];
  return ids.map((id) => {
    const row = stress.find((s) => s.id === id);
    return {
      id,
      labelJa: STRESS_SCENARIO_LABELS_JA[id],
      lossMYR: row ? Math.abs(row.estimatedLossMYR) : 0,
      lossPct: row ? Math.abs(row.portfolioImpactPct) : 0,
    };
  });
}

function buildContagion(correlated: CorrelationCell[], positions: { symbol: string; weightPct: number }[]): ContagionLink[] {
  const top = positions.sort((a, b) => b.weightPct - a.weightPct)[0];
  if (!top) return [];
  return correlated
    .filter((c) => c.symbolA === top.symbol || c.symbolB === top.symbol)
    .slice(0, 5)
    .map((c) => ({
      fromSymbol: top.symbol,
      toSymbol: c.symbolA === top.symbol ? c.symbolB : c.symbolA,
      impactPct: Math.round(c.correlation * top.weightPct * 0.35),
      noteJa: `相関 ${c.correlation.toFixed(2)} — 連鎖下落リスク`,
    }));
}

function computeQualityScore(input: {
  constructionHealth: number;
  criticalWarnings: number;
  highWarnings: number;
  watchWarnings: number;
  betaOver: boolean;
  hiddenHigh: number;
  dataReliability: number | null;
  macroStress: number;
  lowLiquidityPct: number;
}): number {
  let score = Math.min(PQE_BASE, input.constructionHealth);
  score -= input.criticalWarnings * PQE_DEDUCT_CRITICAL_WARNING;
  score -= input.highWarnings * PQE_DEDUCT_HIGH_WARNING;
  score -= input.watchWarnings * PQE_DEDUCT_WATCH;
  if (input.betaOver) score -= PQE_DEDUCT_BETA_OVER;
  score -= input.hiddenHigh * PQE_DEDUCT_HIDDEN_THEME;
  if (input.dataReliability != null && input.dataReliability < 50) {
    score -= PQE_DEDUCT_LOW_DATA_RELIABILITY;
  }
  if (input.macroStress > 65) score -= PQE_DEDUCT_MACRO_STRESS;
  if (input.lowLiquidityPct > 25) score -= PQE_DEDUCT_LIQUIDITY_CLUSTER;
  return clamp(score);
}

export function buildPortfolioRiskExposureBundle(
  persisted: PortfolioRiskExposurePersisted,
  input: BuildPortfolioRiskExposureInput,
): { bundle: PortfolioRiskExposureBundle; state: PortfolioRiskExposurePersisted } {
  const holdings = input.holdings.filter((p) => safeShares(p.shares, 0) > 0);
  let totalMYR = input.totalValueMYR;
  if (totalMYR <= 0) {
    totalMYR = holdings.reduce((s, p) => {
      const px = input.priceBySymbol[p.symbol] ?? safePrice(p.currentPrice, p.averageBuyPrice, 0);
      return s + toMYR(px * safeShares(p.shares, 0), p.currency);
    }, 0);
  }
  const cashMYR = input.cashMYR ?? 0;
  const cashRatioPct = totalMYR + cashMYR > 0 ? (cashMYR / (totalMYR + cashMYR)) * 100 : 0;

  const construction = analyzePortfolioConstruction({
    portfolio: holdings,
    totalPortfolioValueMYR: totalMYR,
    portfolioDrawdownPct: input.executionBundle?.maxDrawdownPct ?? input.realityBundle?.dashboard.maxDrawdownPct ?? 0,
  });

  const macroStress = input.macroBundle?.stressScore ?? 50;
  const macroRegime = input.macroBundle?.worldRegime.id ?? null;
  const defensiveMacro =
    macroRegime === 'panic' ||
    macroRegime === 'liquidity_crisis' ||
    macroRegime === 'recession' ||
    macroRegime === 'risk_off';

  const maxCap =
    persisted.humanOverride.maxExposurePct ??
    (defensiveMacro ? PANIC_MAX_POSITION_CAP_PCT : DEFAULT_MAX_POSITION_CAP_PCT);

  const recommendedCash = defensiveMacro
    ? Math.max(PANIC_CASH_RATIO_PCT, cashRatioPct, input.macroBundle?.integration.recommendedTacticalMode === 'defensive' ? 28 : 0)
    : Math.max(10, cashRatioPct);

  const correlationMatrix: CorrelationCell[] = construction.correlatedPairs.map((p) => ({
    ...p,
    labelJa: `${p.symbolA}↔${p.symbolB}: ${p.correlation.toFixed(2)}`,
  }));

  const clusters = new Map<string, string[]>();
  for (const p of construction.positions) {
    const id = p.correlationClusterId ?? 'c0';
    const list = clusters.get(id) ?? [];
    list.push(p.symbol);
    clusters.set(id, list);
  }

  const hiddenExposures = detectHiddenThemes(construction.positions);
  const factorExposures = buildFactorExposures(construction.factorExposures, construction.positions);

  const countryMap = new Map<CountryExposureId, number>();
  const currencyMap = new Map<CurrencyExposureId, number>();
  for (const p of construction.positions) {
    const pos = holdings.find((h) => h.symbol === p.symbol);
    if (!pos) continue;
    const c = marketToCountry(pos.market);
    countryMap.set(c, (countryMap.get(c) ?? 0) + p.weightPct);
    const cur = currencyOf(pos.market);
    currencyMap.set(cur, (currencyMap.get(cur) ?? 0) + p.weightPct);
  }

  const lowLiqPct = construction.positions
    .filter((p) => p.liquidityScore < 40)
    .reduce((s, p) => s + p.weightPct, 0);

  const stressTests = buildStressTests(construction, totalMYR, macroStress);
  const tailRisk = buildTailRisk(stressTests, totalMYR);

  const heatmap: HeatmapCell[] = [
    ...construction.sectorHeatMap.map((r) => ({
      labelJa: r.label,
      weightPct: r.weightPct,
      riskIntensity: r.intensity,
      severity: r.severity,
    })),
    ...hiddenExposures.slice(0, 3).map((h) => ({
      labelJa: h.labelJa,
      weightPct: h.effectiveWeightPct,
      riskIntensity: h.effectiveWeightPct >= 40 ? 4 : 2,
      severity: (h.effectiveWeightPct >= 45 ? 'critical' : h.effectiveWeightPct >= 30 ? 'high' : 'watch') as HeatmapCell['severity'],
    })),
  ];

  const contagionMap = buildContagion(correlationMatrix, construction.positions);
  const dependencyGraph: DependencyNode[] = construction.positions.map((p) => ({
    symbol: p.symbol,
    weightPct: p.weightPct,
    dependsOn: correlationMatrix
      .filter((c) => c.correlation >= 0.65 && (c.symbolA === p.symbol || c.symbolB === p.symbol))
      .map((c) => (c.symbolA === p.symbol ? c.symbolB : c.symbolA))
      .slice(0, 4),
  }));

  const sectorTop = construction.sectorExposures.sort((a, b) => b.weightPct - a.weightPct)[0];
  const sectorCap = persisted.humanOverride.sectorCapPct ?? 40;
  const sectorGuardJa =
    sectorTop && sectorTop.weightPct > sectorCap
      ? `${sectorTop.sector} ${sectorTop.weightPct.toFixed(0)}% — 上限 ${sectorCap}% 超過`
      : 'セクター集中は許容範囲';

  const weakTheses: WeakThesisItem[] = (input.evidenceThinSymbols ?? []).map((sym) => ({
    symbol: sym,
    reasonJa: '根拠薄い / データ品質低',
    dataQualityScore: input.symbolDataQuality?.[sym.toUpperCase()] ?? null,
  }));

  const drawdownAttribution: DrawdownAttribution[] = construction.positions
    .filter((p) => p.betaProxy > 1.1)
    .sort((a, b) => b.weightPct * b.betaProxy - a.weightPct * a.betaProxy)
    .slice(0, 5)
    .map((p) => ({
      symbol: p.symbol,
      contributionPct: Math.round(p.weightPct * p.betaProxy * 0.4),
      noteJa: `高beta ${p.betaProxy.toFixed(2)} × ウェイト ${p.weightPct.toFixed(0)}%`,
    }));

  const dataRelScore = input.dataReliabilityBundle?.globalDataQualityScore ?? null;
  const crit = construction.warnings.filter((w) => w.severity === 'critical').length;
  const high = construction.warnings.filter((w) => w.severity === 'high').length;
  const watch = construction.warnings.filter((w) => w.severity === 'watch').length;

  const portfolioQualityScore = computeQualityScore({
    constructionHealth: construction.healthScore,
    criticalWarnings: crit,
    highWarnings: high,
    watchWarnings: watch,
    betaOver: !construction.betaWithinLimit,
    hiddenHigh: hiddenExposures.filter((h) => h.effectiveWeightPct >= 40).length,
    dataReliability: dataRelScore,
    macroStress,
    lowLiquidityPct: lowLiqPct,
  });

  const riskEscalationActive = portfolioQualityScore < PQE_ESCALATION_THRESHOLD;
  const defensiveModeActive =
    portfolioQualityScore < PQE_DEFENSIVE_THRESHOLD || defensiveMacro;

  const integration: IntegrationSnapshot = {
    macroRegime: macroRegime,
    macroStressScore: macroStress,
    selfTrustScore: input.selfEvalBundle?.trustScore ?? null,
    dataReliabilityScore: dataRelScore,
    paperDrawdownPct: input.executionBundle?.maxDrawdownPct ?? null,
    realityTrustScore: input.realityBundle?.trustScore ?? null,
  };

  const aiPortfolioSummaryJa = [
    `品質スコア ${portfolioQualityScore}/100 — ${riskEscalationActive ? '危険集中あり' : 'おおむね管理可能'}`,
    `最大リスク: ${hiddenExposures[0]?.labelJa ?? sectorTop?.sector ?? '分散'}`,
    `守備力: 推奨現金 ${Math.round(recommendedCash)}% · 最大ポジション ${maxCap}%`,
    `破綻ポイント: ${stressTests.sort((a, b) => a.portfolioImpactPct - b.portfolioImpactPct)[0]?.labelJa ?? '—'}`,
  ].join(' — ');

  const replayPoint: PortfolioReplayPoint = {
    at: new Date().toISOString(),
    cashRatioPct: Math.round(cashRatioPct),
    qualityScore: portfolioQualityScore,
    regimeId: macroRegime,
  };
  const working = {
    ...persisted,
    allocationHistory: appendAllocationHistory(persisted.allocationHistory, replayPoint),
  };

  const bundle: PortfolioRiskExposureBundle = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: PORTFOLIO_RISK_REGULATORY_JA,
    portfolioQualityScore,
    qualityLabelJa:
      portfolioQualityScore >= 72 ? '健全' : portfolioQualityScore >= 45 ? '注意' : '危険',
    riskEscalationActive,
    riskEscalationBannerJa: riskEscalationActive
      ? 'ポートフォリオリスク警戒 — 集中・ストレス・データ品質を確認'
      : null,
    defensiveModeActive,
    dynamicMaxPositionCapPct: maxCap,
    recommendedCashRatioPct: Math.round(recommendedCash),
    cashReserveNoteJa: defensiveMacro
      ? 'マクロ逆風 — 現金比率を引き上げ（ルール）'
      : '通常 — 現金バッファを維持',
    volatilityTargetingNoteJa:
      macroStress > 60
        ? '高ボラ環境 — ベータ・サイズを縮小'
        : 'ボラターゲット中立',
    convictionWeightingNoteJa:
      (input.selfEvalBundle?.adaptiveConfidencePct ?? 60) < 50
        ? 'confidence低 — 大きなベットを避ける'
        : '高confidence銘柄のみサイズ拡大可',
    betaExposure: construction.portfolioBeta,
    betaWarningJa: construction.betaWithinLimit
      ? null
      : `ポートフォリオβ ${construction.portfolioBeta.toFixed(2)} > 上限 ${construction.maxPortfolioBeta}`,
    sectorConcentrationPct: sectorTop?.weightPct ?? 0,
    sectorGuardJa,
    correlationMatrix,
    correlationClusters: [...clusters.entries()].map(([clusterId, symbols]) => ({
      clusterId,
      symbols,
    })),
    hiddenExposures,
    factorExposures,
    countryExposures: [...countryMap.entries()].map(([country, weightPct]) => ({
      country,
      labelJa: country,
      weightPct: Math.round(weightPct),
    })),
    currencyExposures: [...currencyMap.entries()].map(([currency, weightPct]) => ({
      currency,
      labelJa: currency,
      weightPct: Math.round(weightPct),
    })),
    liquidityExposureJa:
      lowLiqPct > 20
        ? `低流動性銘柄に ${lowLiqPct.toFixed(0)}% 相当 — 逃げ遅れリスク`
        : '流動性エクスポーザーは許容',
    tailRisk,
    stressTests,
    heatmap,
    contagionMap,
    dependencyGraph,
    riskBudget: [
      { bucketJa: '株式', allocatedPct: 100 - recommendedCash, usedPct: 100 - cashRatioPct, headroomPct: Math.max(0, recommendedCash - cashRatioPct) },
      { bucketJa: '現金', allocatedPct: recommendedCash, usedPct: cashRatioPct, headroomPct: Math.max(0, recommendedCash - cashRatioPct) },
      { bucketJa: 'テーマ', allocatedPct: 100, usedPct: hiddenExposures[0]?.effectiveWeightPct ?? 0, headroomPct: Math.max(0, 100 - (hiddenExposures[0]?.effectiveWeightPct ?? 0)) },
    ],
    weakTheses,
    drawdownAttribution,
    opportunityCostNoteJa:
      input.realityBundle?.virtualReturnPct != null
        ? `紙上PF ${input.realityBundle.virtualReturnPct}% — 未保有のベンチマーク差は戦略ログで追跡`
        : '機会損失 — Reality Validation 有効時に比較',
    driftNoteJa: input.strategyTacticalMode
      ? `戦略モード ${input.strategyTacticalMode} — マクロ推奨と乖離がないか確認`
      : '戦略配分 — Strategy Execution 層で比較',
    regimeAllocationJa: input.macroBundle?.integration.macroSummaryJa ?? 'マクロ未連携',
    aiPortfolioSummaryJa,
    humanOverride: persisted.humanOverride,
    integration,
    portfolioReplay: working.allocationHistory.slice(-8),
    explainRuleBasisJa:
      'portfolioConstructionEngine + マクロ/データ信頼/自己評価のルール合成。相関はサンプルリターン推定。',
  };

  return { bundle, state: working };
}

export async function refreshPortfolioRiskExposureBundle(
  input: BuildPortfolioRiskExposureInput,
): Promise<PortfolioRiskExposureBundle> {
  const loaded = await loadPortfolioRiskExposureState();
  const { bundle, state } = buildPortfolioRiskExposureBundle(loaded, input);
  await savePortfolioRiskExposureState(state);
  return bundle;
}
