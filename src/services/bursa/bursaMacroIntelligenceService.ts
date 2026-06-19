/**
 * Phase19 — Macro Intelligence
 */
import {
  MACRO_CHANGE_BEARISH_PCT,
  MACRO_CHANGE_BULLISH_PCT,
  MACRO_INTELLIGENCE_UNAVAILABLE_JA,
  MACRO_LEVEL_THRESHOLDS,
  MACRO_SECTOR_LABEL_JA,
  PHASE19_MACRO_INDICATOR_DEFS,
} from '../../constants/bursaMacroIntelligence';
import type {
  BursaMacroIntelligenceAnalysis,
  MacroDashboard,
  MacroIndicatorId,
  MacroIndicatorRow,
  MacroIntelligenceDisplayFields,
  MacroSentiment,
} from '../../types/bursaMacroIntelligence';
import {
  fetchGlobalMarketSnapshots,
  fetchYahooSnapshotsForSymbols,
  snapshotFor,
  type YahooInstrumentSnapshot,
} from '../globalMarketQuoteService';
import {
  buildAllSectorImpacts,
  computeSectorImpactForStock,
  resolveStockMacroSector,
  scoreToMacroSentiment,
} from './bursaMacroSectorAdjustment';
import {
  fetchMacroLiveIndicators,
  macroLiveIdForIndicator,
  resetMacroLiveCache,
  type MacroLiveIndicatorSnapshot,
} from './bursaMacroLiveProviders';
import type { AnalysisApiKeys } from '../analysisApiKeys';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedGlobal: BursaMacroIntelligenceAnalysis | null = null;
let cachedGlobalAt = 0;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtVal(n: number | null, unit: string): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(2)}${unit}`;
}

function classifyByChange(changePct: number | null, inverse: boolean): MacroSentiment {
  if (changePct == null || !Number.isFinite(changePct)) return 'Neutral';
  const effective = inverse ? -changePct : changePct;
  if (effective >= MACRO_CHANGE_BULLISH_PCT) return 'Bullish';
  if (effective <= MACRO_CHANGE_BEARISH_PCT) return 'Bearish';
  return 'Neutral';
}

function classifyByLevel(
  id: 'fed_rate' | 'my_opr' | 'us_cpi' | 'my_cpi',
  value: number,
): MacroSentiment {
  const th = MACRO_LEVEL_THRESHOLDS[id];
  if (value >= th.bearishAbove) return 'Bearish';
  if (value <= th.bullishBelow) return 'Bullish';
  return 'Neutral';
}

function sentimentToSigned(s: MacroSentiment): number {
  if (s === 'Bullish') return 1;
  if (s === 'Bearish') return -1;
  return 0;
}

function snapshotValue(snap: YahooInstrumentSnapshot): number | null {
  return snap.price;
}

function buildIndicatorRow(
  def: (typeof PHASE19_MACRO_INDICATOR_DEFS)[number],
  snap: YahooInstrumentSnapshot | null,
  live?: MacroLiveIndicatorSnapshot | null,
): MacroIndicatorRow {
  if (def.yahooSymbol && snap) {
    const value = snapshotValue(snap);
    const changePct = snap.changePct;
    const sentiment = classifyByChange(changePct, def.inverseForEquities);
    const rationaleJa = snap.fromLive
      ? `日次 ${fmtPct(changePct)} · ${sentiment}`
      : `未取得 · ${sentiment}`;
    return {
      id: def.id,
      labelJa: def.labelJa,
      value,
      changePct,
      unitJa: def.unitJa,
      sentiment,
      fromLive: snap.fromLive,
      rationaleJa,
    };
  }

  const liveId = macroLiveIdForIndicator(def.id);
  if (liveId && live?.fromLive && live.value != null) {
    const levelId = def.id as 'fed_rate' | 'my_opr' | 'us_cpi' | 'my_cpi';
    const sentiment = classifyByLevel(levelId, live.value);
    const changeLabel =
      live.changePct != null ? fmtPct(live.changePct) : def.id.includes('cpi') ? 'YoY' : '—';
    return {
      id: def.id,
      labelJa: def.labelJa,
      value: live.value,
      changePct: live.changePct,
      unitJa: def.unitJa,
      sentiment,
      fromLive: true,
      rationaleJa: `Live ${live.source} · ${fmtVal(live.value, def.unitJa)} · ${changeLabel} · ${sentiment}`,
    };
  }

  if (liveId) {
    return {
      id: def.id,
      labelJa: def.labelJa,
      value: null,
      changePct: null,
      unitJa: def.unitJa,
      sentiment: 'Neutral',
      fromLive: false,
      rationaleJa: live?.errorJa ?? MACRO_INTELLIGENCE_UNAVAILABLE_JA,
    };
  }

  return {
    id: def.id,
    labelJa: def.labelJa,
    value: null,
    changePct: null,
    unitJa: def.unitJa,
    sentiment: 'Neutral',
    fromLive: false,
    rationaleJa: MACRO_INTELLIGENCE_UNAVAILABLE_JA,
  };
}

export function computeMacroScore(indicators: MacroIndicatorRow[]): number {
  const weights: Partial<Record<MacroIndicatorId, number>> = {
    sp500: 2,
    nasdaq: 2,
    klci: 2,
    fed_rate: 1.5,
    my_opr: 1.5,
    us10y: 1.5,
    us_cpi: 1.5,
    my_cpi: 1.5,
    usd_myr: 1.5,
    dxy: 1.5,
    brent_oil: 1,
    gold: 1,
  };

  let weighted = 0;
  let totalW = 0;
  for (const ind of indicators) {
    const w = weights[ind.id] ?? 1;
    weighted += sentimentToSigned(ind.sentiment) * w;
    totalW += w;
  }
  if (totalW === 0) return 0;
  return clamp(Math.round((weighted / totalW) * 20), -20, 20);
}

export function buildMacroDashboard(indicators: MacroIndicatorRow[]): MacroDashboard {
  const bullishCount = indicators.filter((i) => i.sentiment === 'Bullish').length;
  const bearishCount = indicators.filter((i) => i.sentiment === 'Bearish').length;
  const neutralCount = indicators.filter((i) => i.sentiment === 'Neutral').length;
  const liveCount = indicators.filter((i) => i.fromLive).length;
  const referenceCount = indicators.length - liveCount;
  const fieldAcquisitionRate =
    indicators.length > 0 ? Math.round((liveCount / indicators.length) * 100) : 0;

  return {
    indicators,
    bullishCount,
    bearishCount,
    neutralCount,
    liveCount,
    referenceCount,
    fieldAcquisitionRate,
  };
}

function buildDisplayFields(input: {
  macroScore: number;
  macroSentiment: MacroSentiment;
  dashboard: MacroDashboard;
  sectorLabelJa: string;
  sectorImpactScore: number;
  sectorImpactSentiment: MacroSentiment;
}): MacroIntelligenceDisplayFields {
  const topBullish = input.dashboard.indicators
    .filter((i) => i.sentiment === 'Bullish')
    .map((i) => i.labelJa)
    .slice(0, 3)
    .join(', ');
  const topBearish = input.dashboard.indicators
    .filter((i) => i.sentiment === 'Bearish')
    .map((i) => i.labelJa)
    .slice(0, 3)
    .join(', ');

  return {
    macroScore: `${input.macroScore >= 0 ? '+' : ''}${input.macroScore}`,
    macroSentiment: input.macroSentiment,
    bullishCount: String(input.dashboard.bullishCount),
    bearishCount: String(input.dashboard.bearishCount),
    neutralCount: String(input.dashboard.neutralCount),
    liveIndicators: `${input.dashboard.liveCount}/12`,
    sectorImpact: `${input.sectorImpactScore >= 0 ? '+' : ''}${input.sectorImpactScore}`,
    sectorSentiment: input.sectorImpactSentiment,
    topBullish: topBullish || '—',
    topBearish: topBearish || '—',
    dashboardSummary: `B${input.dashboard.bullishCount}/N${input.dashboard.neutralCount}/Be${input.dashboard.bearishCount} · Live ${input.dashboard.liveCount}`,
  };
}

const PHASE19_EXTRA_YAHOO_SYMBOLS = ['BZ=F', 'GC=F'];

export async function fetchMacroIndicatorSnapshots(
  forceRefresh = false,
): Promise<Record<string, YahooInstrumentSnapshot>> {
  const base = await fetchGlobalMarketSnapshots(forceRefresh);
  const missing = PHASE19_EXTRA_YAHOO_SYMBOLS.filter((s) => !base[s]?.fromLive);
  if (missing.length === 0) return base;
  const extra = await fetchYahooSnapshotsForSymbols(missing);
  return { ...base, ...extra };
}

export async function buildGlobalMacroIntelligenceAnalysis(input?: {
  forceRefresh?: boolean;
  apiKeys?: AnalysisApiKeys;
}): Promise<BursaMacroIntelligenceAnalysis> {
  const now = Date.now();
  if (!input?.forceRefresh && cachedGlobal && now - cachedGlobalAt < CACHE_TTL_MS) {
    return cachedGlobal;
  }

  if (input?.forceRefresh) {
    resetMacroLiveCache();
  }

  const [snapshots, liveIndicators] = await Promise.all([
    fetchMacroIndicatorSnapshots(input?.forceRefresh ?? false),
    fetchMacroLiveIndicators({
      forceRefresh: input?.forceRefresh,
      keys: {
        alphaVantageApiKey: input?.apiKeys?.alphaVantageApiKey,
        fmpApiKey: input?.apiKeys?.fmpApiKey,
      },
    }),
  ]);

  const indicators = PHASE19_MACRO_INDICATOR_DEFS.map((def) => {
    const snap = def.yahooSymbol ? snapshotFor(snapshots, def.yahooSymbol) : null;
    const liveId = macroLiveIdForIndicator(def.id);
    const live = liveId ? liveIndicators[liveId] : null;
    return buildIndicatorRow(def, snap, live);
  });

  const dashboard = buildMacroDashboard(indicators);
  const macroScore = computeMacroScore(indicators);
  const macroSentiment = scoreToMacroSentiment(macroScore);
  const sectorImpacts = buildAllSectorImpacts(dashboard);
  const liveMacroCount = ['fed_rate', 'my_opr', 'us_cpi', 'my_cpi'].filter(
    (id) => liveIndicators[id as keyof typeof liveIndicators]?.fromLive,
  ).length;
  const hasExtractableData = dashboard.liveCount >= 4 || liveMacroCount >= 2;
  const availability = hasExtractableData ? 'available' : 'unavailable';

  const analysis: BursaMacroIntelligenceAnalysis = {
    availability,
    availabilityLabelJa: availability === 'available' ? '取得済' : MACRO_INTELLIGENCE_UNAVAILABLE_JA,
    dashboard,
    macroScore,
    macroSentiment,
    sectorId: null,
    sectorLabelJa: '—',
    sectorImpactScore: 0,
    sectorImpactSentiment: 'Neutral',
    sectorImpacts,
    materialScoreAdjustment: 0,
    fieldAcquisitionRate: dashboard.fieldAcquisitionRate,
    unavailableReason: availability === 'available' ? null : 'マクロ指標の取得が不十分',
    displayJa: buildDisplayFields({
      macroScore,
      macroSentiment,
      dashboard,
      sectorLabelJa: '—',
      sectorImpactScore: 0,
      sectorImpactSentiment: 'Neutral',
    }),
    evaluationJa:
      availability === 'available'
        ? `Macro ${macroScore >= 0 ? '+' : ''}${macroScore} (${macroSentiment}) · B${dashboard.bullishCount}/N${dashboard.neutralCount}/Be${dashboard.bearishCount}`
        : MACRO_INTELLIGENCE_UNAVAILABLE_JA,
    hasExtractableData,
    fetchedAt: new Date().toISOString(),
  };

  cachedGlobal = analysis;
  cachedGlobalAt = now;
  return analysis;
}

export function applyMacroIntelligenceToStock(input: {
  global: BursaMacroIntelligenceAnalysis;
  stockCode: string;
  sector: string | null;
}): BursaMacroIntelligenceAnalysis {
  const sectorId = resolveStockMacroSector(input.stockCode, input.sector);
  const sectorImpact = computeSectorImpactForStock({
    dashboard: input.global.dashboard,
    sectorId,
  });

  const materialScoreAdjustment = clamp(sectorImpact.sectorImpactScore, -20, 20);
  const macroScore = input.global.macroScore;
  const macroSentiment = input.global.macroSentiment;
  const dashboard = input.global.dashboard;
  const availability = input.global.availability;
  const hasExtractableData = input.global.hasExtractableData;

  const evaluationParts = ['Macro Intelligence'];
  if (availability === 'available') {
    evaluationParts.push(
      `Macro ${macroScore >= 0 ? '+' : ''}${macroScore}`,
      `Sector ${sectorImpact.sectorLabelJa} ${materialScoreAdjustment >= 0 ? '+' : ''}${materialScoreAdjustment}`,
    );
  }

  return {
    ...input.global,
    sectorId,
    sectorLabelJa: sectorImpact.sectorLabelJa,
    sectorImpactScore: sectorImpact.sectorImpactScore,
    sectorImpactSentiment: sectorImpact.sectorImpactSentiment,
    materialScoreAdjustment,
    displayJa: buildDisplayFields({
      macroScore,
      macroSentiment,
      dashboard,
      sectorLabelJa: sectorImpact.sectorLabelJa,
      sectorImpactScore: sectorImpact.sectorImpactScore,
      sectorImpactSentiment: sectorImpact.sectorImpactSentiment,
    }),
    evaluationJa:
      availability === 'available'
        ? evaluationParts.join(' · ')
        : MACRO_INTELLIGENCE_UNAVAILABLE_JA,
    hasExtractableData,
  };
}

export function macroIntelligenceMaterialScoreAdjustment(
  analysis: BursaMacroIntelligenceAnalysis | null,
): number {
  if (!analysis || analysis.availability !== 'available') return 0;
  if (analysis.macroIntelligenceScore != null) {
    return Math.max(-20, Math.min(20, analysis.macroIntelligenceScore));
  }
  return analysis.materialScoreAdjustment ?? 0;
}

export function macroIntelligenceToMaterialInputs(
  analysis: BursaMacroIntelligenceAnalysis | null | undefined,
): import('./bursaMaterialSentiment').RawMaterialInput[] {
  if (!analysis || analysis.availability !== 'available' || !analysis.hasExtractableData) {
    return [];
  }
  return [
    {
      source: 'bursa_announcement',
      title: analysis.evaluationJa.slice(0, 180),
      url: null,
      publishedAt: analysis.fetchedAt,
      idSuffix: 'macro-intelligence',
      sourceLabelJa: 'Macro Intelligence (Phase19)',
    },
  ];
}

/** 監査用 — セクター影響テーブル */
export function formatSectorImpactTable(impacts: BursaMacroIntelligenceAnalysis['sectorImpacts']): string {
  return impacts
    .map(
      (s) =>
        `${s.labelJa}: ${s.impactScore >= 0 ? '+' : ''}${s.impactScore} (${s.sentiment})`,
    )
    .join(' | ');
}

export function formatMacroDashboardRows(dashboard: MacroDashboard): string[] {
  return dashboard.indicators.map(
    (i) =>
      `${i.labelJa}: ${i.value != null ? fmtVal(i.value, i.unitJa) : '—'} ${fmtPct(i.changePct)} [${i.sentiment}]${i.fromLive ? '' : ' (参照)'}`,
  );
}

export { MACRO_SECTOR_LABEL_JA };
