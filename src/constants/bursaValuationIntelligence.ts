import type { ValuationRating } from '../types/bursaValuationIntelligence';

/** Phase20 — 監査対象6銘柄 */
export const AUDIT_VALUATION_STOCKS = [
  { code: '1155', label: 'Maybank', sector: 'Banking' },
  { code: '1023', label: 'CIMB', sector: 'Banking' },
  { code: '1295', label: 'Public Bank', sector: 'Banking' },
  { code: '5347', label: 'Tenaga', sector: 'Utilities' },
  { code: '4707', label: 'Nestle', sector: 'Consumer Products' },
  { code: '6033', label: 'Petronas Gas', sector: 'Energy' },
] as const;

export type ValuationSectorKey = 'Banking' | 'Utilities' | 'Consumer Products' | 'Energy' | 'default';

export const SECTOR_VALUATION_BENCHMARKS: Record<
  ValuationSectorKey,
  { pe: number; pb: number; roe: number; debtEquityMax: number }
> = {
  Banking: { pe: 11, pb: 1.1, roe: 11, debtEquityMax: 1.8 },
  Utilities: { pe: 18, pb: 1.5, roe: 10, debtEquityMax: 1.2 },
  'Consumer Products': { pe: 25, pb: 4.0, roe: 25, debtEquityMax: 1.0 },
  Energy: { pe: 16, pb: 1.8, roe: 12, debtEquityMax: 1.2 },
  default: { pe: 15, pb: 1.5, roe: 12, debtEquityMax: 1.2 },
};

export const VALUATION_SCORE_MIN = -20;
export const VALUATION_SCORE_MAX = 20;
export const BASE_VALUATION_MAX_ADJ = 10;

export function resolveValuationSector(sector: string | null | undefined): ValuationSectorKey {
  const s = (sector ?? '').toLowerCase();
  if (s.includes('bank')) return 'Banking';
  if (s.includes('util')) return 'Utilities';
  if (s.includes('consumer') || s.includes('food') || s.includes('nestle')) return 'Consumer Products';
  if (s.includes('energy') || s.includes('oil') || s.includes('gas')) return 'Energy';
  return 'default';
}

export function ratingFromValuationScore(score: number): ValuationRating {
  if (score >= 12) return 'Strong Undervalued';
  if (score >= 5) return 'Undervalued';
  if (score <= -12) return 'Strong Overvalued';
  if (score <= -5) return 'Overvalued';
  return 'Fair Value';
}

export function fairValueJudgmentJa(rating: ValuationRating): string {
  switch (rating) {
    case 'Strong Undervalued':
      return '割安（強）— バリュエーション・ファンダメンタル共に attractive';
    case 'Undervalued':
      return '割安 — 相対的に買い目';
    case 'Fair Value':
      return '適正 — 割安/割高の極端さなし';
    case 'Overvalued':
      return '割高 — 慎重';
    case 'Strong Overvalued':
      return '割高（強）— バリュエーション面で注意';
  }
}
