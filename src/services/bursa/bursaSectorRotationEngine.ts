/**
 * Phase19.5 — Sector Rotation Intelligence Engine
 */
import {
  AUDIT_STOCK_ROTATION_SECTOR,
  ROTATION_INDICATOR_IDS,
  ROTATION_SECTOR_LABEL_JA,
  ROTATION_SECTOR_SENSITIVITY,
  SECTOR_ROTATION_UNAVAILABLE_JA,
} from '../../constants/bursaSectorRotation';
import type { MacroDashboard, MacroIndicatorRow, MacroSentiment } from '../../types/bursaMacroIntelligence';
import type {
  BursaSectorRotationAnalysis,
  RotationIndicatorId,
  RotationSectorId,
  SectorRotationDisplayFields,
  SectorRotationRow,
  SectorRotationScoreDistribution,
} from '../../types/bursaSectorRotation';
import { scoreToMacroSentiment } from './bursaMacroSectorAdjustment';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function sentimentToSigned(s: MacroSentiment): number {
  if (s === 'Bullish') return 1;
  if (s === 'Bearish') return -1;
  return 0;
}

export function resolveRotationSectorFromBursaSector(sector: string | null): RotationSectorId | null {
  const s = sector?.toLowerCase() ?? '';
  if (s.includes('bank')) return 'banking';
  if (s.includes('util')) return 'utilities';
  if (s.includes('consumer') || s.includes('food') || s.includes('nestle')) return 'consumer';
  if (s.includes('energy') || s.includes('oil') || s.includes('gas') || s.includes('petro')) {
    return 'energy';
  }
  if (s.includes('tech') || s.includes('software') || s.includes('digital')) return 'technology';
  if (s.includes('industrial') || s.includes('manufact')) return 'industrial';
  if (s.includes('health')) return 'healthcare';
  if (s.includes('reit') || s.includes('property')) return 'reit';
  if (s.includes('telecom') || s.includes('communication')) return 'telecommunication';
  return null;
}

export function resolveStockRotationSector(
  stockCode: string,
  sector: string | null,
): RotationSectorId | null {
  const code = stockCode.replace(/\.KL$/i, '').trim();
  return AUDIT_STOCK_ROTATION_SECTOR[code] ?? resolveRotationSectorFromBursaSector(sector);
}

function pickRotationIndicators(indicators: MacroIndicatorRow[]): MacroIndicatorRow[] {
  const set = new Set<RotationIndicatorId>(ROTATION_INDICATOR_IDS);
  return indicators.filter((i) => set.has(i.id as RotationIndicatorId));
}

function computeSectorStrength(
  indicators: MacroIndicatorRow[],
  sectorId: RotationSectorId,
): { strength: number; rationaleJa: string } {
  const weights = ROTATION_SECTOR_SENSITIVITY[sectorId];
  let weighted = 0;
  let totalAbsW = 0;
  const drivers: string[] = [];

  for (const ind of indicators) {
    const w = weights[ind.id as RotationIndicatorId];
    if (w == null) continue;
    weighted += sentimentToSigned(ind.sentiment) * w;
    totalAbsW += Math.abs(w);
    if (ind.sentiment !== 'Neutral' && Math.abs(w) >= 0.5) {
      drivers.push(`${ind.labelJa}:${ind.sentiment}`);
    }
  }

  if (totalAbsW === 0) {
    return { strength: 0, rationaleJa: 'ローテーション感応度データ不足' };
  }

  const strength = clamp(Math.round((weighted / totalAbsW) * 20), -20, 20);
  const rationaleJa =
    drivers.length > 0
      ? `${ROTATION_SECTOR_LABEL_JA[sectorId]} — ${drivers.slice(0, 3).join(' · ')}`
      : `${ROTATION_SECTOR_LABEL_JA[sectorId]} — 中立`;

  return { strength, rationaleJa };
}

export function buildSectorRotationRankings(dashboard: MacroDashboard): SectorRotationRow[] {
  const indicators = pickRotationIndicators(dashboard.indicators);
  const sectorIds = Object.keys(ROTATION_SECTOR_LABEL_JA) as RotationSectorId[];

  const rows = sectorIds.map((sectorId) => {
    const { strength, rationaleJa } = computeSectorStrength(indicators, sectorId);
    return {
      sectorId,
      labelJa: ROTATION_SECTOR_LABEL_JA[sectorId],
      strength,
      rank: 0,
      sentiment: scoreToMacroSentiment(strength),
      rationaleJa,
    };
  });

  const sorted = [...rows].sort((a, b) => b.strength - a.strength);
  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));
}

export function buildScoreDistribution(rankings: SectorRotationRow[]): SectorRotationScoreDistribution {
  const strengths = rankings.map((r) => r.strength);
  const bullish = rankings.filter((r) => r.sentiment === 'Bullish').length;
  const bearish = rankings.filter((r) => r.sentiment === 'Bearish').length;
  const neutral = rankings.filter((r) => r.sentiment === 'Neutral').length;
  const min = strengths.length ? Math.min(...strengths) : 0;
  const max = strengths.length ? Math.max(...strengths) : 0;
  const avg =
    strengths.length > 0
      ? Math.round((strengths.reduce((a, b) => a + b, 0) / strengths.length) * 10) / 10
      : 0;

  return { bullish, neutral, bearish, min, max, avg };
}

function fmtScore(n: number): string {
  return `${n >= 0 ? '+' : ''}${n}`;
}

function buildDisplayFields(input: {
  macroScore: number;
  sectorRotationScore: number;
  macroIntelligenceScore: number;
  stockSectorLabelJa: string;
  stockRank: number;
  top3: SectorRotationRow[];
  bottom3: SectorRotationRow[];
  distribution: SectorRotationScoreDistribution;
}): SectorRotationDisplayFields {
  return {
    macroScore: fmtScore(input.macroScore),
    sectorRotationScore: fmtScore(input.sectorRotationScore),
    macroIntelligenceScore: fmtScore(input.macroIntelligenceScore),
    top3Sectors: input.top3.map((s) => `${s.labelJa}(${fmtScore(s.strength)})`).join(' · '),
    bottom3Sectors: input.bottom3.map((s) => `${s.labelJa}(${fmtScore(s.strength)})`).join(' · '),
    sectorRank: input.stockRank > 0 ? `#${input.stockRank} ${input.stockSectorLabelJa}` : '—',
    rankingSummary: `Top: ${input.top3[0]?.labelJa ?? '—'} / Bottom: ${input.bottom3[0]?.labelJa ?? '—'}`,
    scoreDistribution: `B${input.distribution.bullish}/N${input.distribution.neutral}/Be${input.distribution.bearish} · avg ${fmtScore(input.distribution.avg)}`,
  };
}

export function buildGlobalSectorRotationAnalysis(input: {
  dashboard: MacroDashboard;
  macroScore: number;
  hasExtractableData: boolean;
}): Pick<
  BursaSectorRotationAnalysis,
  | 'availability'
  | 'availabilityLabelJa'
  | 'rankings'
  | 'top3Sectors'
  | 'bottom3Sectors'
  | 'scoreDistribution'
  | 'hasExtractableData'
> {
  const rankings = buildSectorRotationRankings(input.dashboard);
  const top3Sectors = rankings.slice(0, 3);
  const bottom3Sectors = [...rankings].sort((a, b) => a.strength - b.strength).slice(0, 3);
  const scoreDistribution = buildScoreDistribution(rankings);
  const available = input.hasExtractableData && rankings.length === 9;

  return {
    availability: available ? 'available' : 'unavailable',
    availabilityLabelJa: available ? '取得済' : SECTOR_ROTATION_UNAVAILABLE_JA,
    rankings,
    top3Sectors,
    bottom3Sectors,
    scoreDistribution,
    hasExtractableData: available,
  };
}

export function applySectorRotationToStock(input: {
  global: Pick<
    BursaSectorRotationAnalysis,
    | 'availability'
    | 'rankings'
    | 'top3Sectors'
    | 'bottom3Sectors'
    | 'scoreDistribution'
    | 'hasExtractableData'
  >;
  macroScore: number;
  stockCode: string;
  sector: string | null;
}): BursaSectorRotationAnalysis {
  const stockSectorId = resolveStockRotationSector(input.stockCode, input.sector);
  const stockRow = input.global.rankings.find((r) => r.sectorId === stockSectorId) ?? null;
  const sectorRotationScore = stockRow?.strength ?? 0;
  const sectorRotationSentiment = stockRow?.sentiment ?? 'Neutral';
  const stockSectorLabelJa = stockRow?.labelJa ?? 'データ未取得';
  const stockRank = stockRow?.rank ?? 0;

  const macroIntelligenceScore = input.macroScore + sectorRotationScore;
  const macroIntelligenceSentiment = scoreToMacroSentiment(
    clamp(macroIntelligenceScore, -20, 20),
  );
  const materialScoreAdjustment = clamp(macroIntelligenceScore, -20, 20);

  const evaluationJa =
    input.global.availability === 'available'
      ? [
          'Sector Rotation',
          `Macro ${fmtScore(input.macroScore)}`,
          `Rotation ${fmtScore(sectorRotationScore)}`,
          `MI ${fmtScore(macroIntelligenceScore)}`,
          `Rank #${stockRank || '—'}`,
        ].join(' · ')
      : SECTOR_ROTATION_UNAVAILABLE_JA;

  return {
    availability: input.global.availability,
    availabilityLabelJa: input.global.availability === 'available' ? '取得済' : SECTOR_ROTATION_UNAVAILABLE_JA,
    rankings: input.global.rankings,
    top3Sectors: input.global.top3Sectors,
    bottom3Sectors: input.global.bottom3Sectors,
    scoreDistribution: input.global.scoreDistribution,
    stockSectorId,
    stockSectorLabelJa,
    sectorRotationScore,
    sectorRotationSentiment,
    macroScore: input.macroScore,
    macroIntelligenceScore,
    macroIntelligenceSentiment,
    materialScoreAdjustment,
    displayJa: buildDisplayFields({
      macroScore: input.macroScore,
      sectorRotationScore,
      macroIntelligenceScore,
      stockSectorLabelJa,
      stockRank,
      top3: input.global.top3Sectors,
      bottom3: input.global.bottom3Sectors,
      distribution: input.global.scoreDistribution,
    }),
    evaluationJa,
    hasExtractableData: input.global.hasExtractableData,
  };
}

export function sectorRotationMaterialScoreAdjustment(
  analysis: BursaSectorRotationAnalysis | null,
): number {
  if (!analysis || analysis.availability !== 'available') return 0;
  return analysis.materialScoreAdjustment ?? 0;
}

export function sectorRotationToMaterialInputs(
  analysis: BursaSectorRotationAnalysis | null | undefined,
): import('./bursaMaterialSentiment').RawMaterialInput[] {
  if (!analysis || analysis.availability !== 'available' || !analysis.hasExtractableData) {
    return [];
  }
  return [
    {
      source: 'bursa_announcement',
      title: analysis.evaluationJa.slice(0, 180),
      url: null,
      publishedAt: null,
      idSuffix: 'sector-rotation',
      sourceLabelJa: 'Sector Rotation (Phase19.5)',
    },
  ];
}

/** 監査用 — ランキング表 */
export function formatSectorRankingTable(rankings: SectorRotationRow[]): string {
  return rankings
    .map((r) => `#${r.rank} ${r.labelJa}: ${fmtScore(r.strength)} (${r.sentiment})`)
    .join(' | ');
}
