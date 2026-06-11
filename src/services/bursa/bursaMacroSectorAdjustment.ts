/**
 * Phase19 — セクター別マクロ感応度
 */
import {
  MACRO_SECTOR_LABEL_JA,
  SECTOR_INDICATOR_SENSITIVITY,
} from '../../constants/bursaMacroIntelligence';
import type {
  MacroDashboard,
  MacroIndicatorRow,
  MacroSectorId,
  MacroSectorImpactRow,
  MacroSentiment,
} from '../../types/bursaMacroIntelligence';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function sentimentToSigned(s: MacroSentiment): number {
  if (s === 'Bullish') return 1;
  if (s === 'Bearish') return -1;
  return 0;
}

export function scoreToMacroSentiment(score: number): MacroSentiment {
  if (score >= 4) return 'Bullish';
  if (score <= -4) return 'Bearish';
  return 'Neutral';
}

export function resolveMacroSectorFromBursaSector(sector: string | null): MacroSectorId | null {
  const s = sector?.toLowerCase() ?? '';
  if (s.includes('bank')) return 'banking';
  if (s.includes('util')) return 'utilities';
  if (s.includes('consumer') || s.includes('food') || s.includes('nestle')) return 'consumer';
  if (s.includes('energy') || s.includes('oil') || s.includes('gas') || s.includes('petro')) {
    return 'energy';
  }
  if (s.includes('tech') || s.includes('software') || s.includes('digital')) return 'technology';
  return null;
}

/** 監査6銘柄の既知セクターマッピング */
export const AUDIT_STOCK_MACRO_SECTOR: Record<string, MacroSectorId> = {
  '1155': 'banking',
  '1023': 'banking',
  '1295': 'banking',
  '5347': 'utilities',
  '4707': 'consumer',
  '6033': 'energy',
};

export function resolveStockMacroSector(
  stockCode: string,
  sector: string | null,
): MacroSectorId | null {
  const code = stockCode.replace(/\.KL$/i, '').trim();
  return AUDIT_STOCK_MACRO_SECTOR[code] ?? resolveMacroSectorFromBursaSector(sector);
}

function computeSectorImpactFromIndicators(
  indicators: MacroIndicatorRow[],
  sectorId: MacroSectorId,
): { impactScore: number; rationaleJa: string } {
  const weights = SECTOR_INDICATOR_SENSITIVITY[sectorId];
  let weighted = 0;
  let totalAbsW = 0;
  const drivers: string[] = [];

  for (const ind of indicators) {
    const w = weights[ind.id];
    if (w == null) continue;
    const signed = sentimentToSigned(ind.sentiment) * w;
    weighted += signed;
    totalAbsW += Math.abs(w);
    if (ind.sentiment !== 'Neutral' && Math.abs(w) >= 0.8) {
      drivers.push(`${ind.labelJa}:${ind.sentiment}`);
    }
  }

  if (totalAbsW === 0) {
    return { impactScore: 0, rationaleJa: 'セクター感応度データ不足' };
  }

  const impactScore = clamp(Math.round((weighted / totalAbsW) * 20), -20, 20);
  const rationaleJa =
    drivers.length > 0
      ? `${MACRO_SECTOR_LABEL_JA[sectorId]} — ${drivers.slice(0, 3).join(' · ')}`
      : `${MACRO_SECTOR_LABEL_JA[sectorId]} — マクロ中立`;

  return { impactScore, rationaleJa };
}

export function buildAllSectorImpacts(dashboard: MacroDashboard): MacroSectorImpactRow[] {
  const sectorIds = Object.keys(MACRO_SECTOR_LABEL_JA) as MacroSectorId[];
  return sectorIds.map((sectorId) => {
    const { impactScore, rationaleJa } = computeSectorImpactFromIndicators(
      dashboard.indicators,
      sectorId,
    );
    return {
      sectorId,
      labelJa: MACRO_SECTOR_LABEL_JA[sectorId],
      impactScore,
      sentiment: scoreToMacroSentiment(impactScore),
      rationaleJa,
    };
  });
}

export function computeSectorImpactForStock(input: {
  dashboard: MacroDashboard;
  sectorId: MacroSectorId | null;
}): {
  sectorImpactScore: number;
  sectorImpactSentiment: MacroSentiment;
  sectorLabelJa: string;
  rationaleJa: string;
} {
  if (!input.sectorId) {
    return {
      sectorImpactScore: 0,
      sectorImpactSentiment: 'Neutral',
      sectorLabelJa: 'データ未取得',
      rationaleJa: 'セクター分類未取得',
    };
  }

  const { impactScore, rationaleJa } = computeSectorImpactFromIndicators(
    input.dashboard.indicators,
    input.sectorId,
  );

  return {
    sectorImpactScore: impactScore,
    sectorImpactSentiment: scoreToMacroSentiment(impactScore),
    sectorLabelJa: MACRO_SECTOR_LABEL_JA[input.sectorId],
    rationaleJa,
  };
}
