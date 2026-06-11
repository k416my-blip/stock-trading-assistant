import type {
  DcfUnavailableReasonCode,
  DdmUnavailableReasonCode,
  FairValueConfidence,
  FairValueModelKey,
  FairValueRecommendation,
} from '../types/bursaFairValueIntelligence';
import { AUDIT_VALUATION_STOCKS } from './bursaValuationIntelligence';

/** Phase21 — 監査対象6銘柄（Phase20 と同一） */
export const AUDIT_FAIR_VALUE_STOCKS = AUDIT_VALUATION_STOCKS;

export type FairValueSectorKey =
  | 'Banking'
  | 'Utilities'
  | 'Consumer Products'
  | 'Energy'
  | 'default';

/** セクター別 DCF/DDM パラメータ（出典: マレーシア長期金利+セクターリスクプレミアム定数） */
export const SECTOR_FAIR_VALUE_PARAMS: Record<
  FairValueSectorKey,
  { discountRate: number; terminalGrowth: number; ddmRequiredReturn: number }
> = {
  Banking: { discountRate: 0.1, terminalGrowth: 0.025, ddmRequiredReturn: 0.09 },
  Utilities: { discountRate: 0.08, terminalGrowth: 0.02, ddmRequiredReturn: 0.07 },
  'Consumer Products': { discountRate: 0.09, terminalGrowth: 0.025, ddmRequiredReturn: 0.08 },
  Energy: { discountRate: 0.085, terminalGrowth: 0.02, ddmRequiredReturn: 0.075 },
  default: { discountRate: 0.09, terminalGrowth: 0.025, ddmRequiredReturn: 0.08 },
};

export const FAIR_VALUE_SCORE_MIN = -20;
export const FAIR_VALUE_SCORE_MAX = 20;
export const BASE_FAIR_VALUE_MAX_ADJ = 10;
export const DCF_PROJECTION_YEARS = 5;
/** DDM: g が r からこれ未満離れる場合は算出不可 */
export const MIN_DDM_SPREAD = 0.02;
/** Phase21.8 — DDM g 下限（%） */
export const DDM_G_MIN_PCT = -2;
/** 適正株価が現在株価の何倍以内なら受理するか */
export const FAIR_PRICE_SANITY_MIN_RATIO = 0.25;
export const FAIR_PRICE_SANITY_MAX_RATIO = 4.0;

export function resolveFairValueSector(sector: string | null | undefined): FairValueSectorKey {
  const s = (sector ?? '').toLowerCase();
  if (s.includes('bank')) return 'Banking';
  if (s.includes('util')) return 'Utilities';
  if (s.includes('consumer') || s.includes('food') || s.includes('nestle')) return 'Consumer Products';
  if (s.includes('energy') || s.includes('oil') || s.includes('gas')) return 'Energy';
  return 'default';
}

export function recommendationFromFairValueScore(score: number): FairValueRecommendation {
  if (score >= 12) return 'Strong Buy';
  if (score >= 5) return 'Buy';
  if (score <= -12) return 'Avoid';
  if (score <= -5) return 'Reduce';
  return 'Hold';
}

export const DCF_UNAVAILABLE_REASON_JA: Record<DcfUnavailableReasonCode, string> = {
  computed_ok: '算出成功',
  fcf_missing: 'FCF未取得（Yahoo/FR/Bursaいずれも未取得）',
  fcf_non_positive: 'FCF≤0（銀行等は営業CFフォールバック後も≤0）',
  fcf_growth_missing: 'FCF成長率未取得（Yahoo/Financial Reportいずれも未取得）',
  shares_missing: '発行株式数未取得',
  discount_condition_failed: '割引率≤永久成長率でDCF条件不成立',
  sanity_range_rejected: '適正株価が現在株価の0.25–4.0倍レンジ外',
};

export const DDM_UNAVAILABLE_REASON_JA: Record<DdmUnavailableReasonCode, string> = {
  computed_ok: '算出成功',
  not_dividend_stock: '非配当銘柄',
  dividend_fetch_failed: '配当取得失敗（配当額・利回りいずれも未取得）',
  growth_rate_missing: '配当成長率不足（Phase17/FR/Bursaいずれも未取得）',
  growth_rate_spread_insufficient: '成長率不足（g≥r-2%でGordon Growth不成立）',
  calculation_failed: '計算条件不成立（配当≤0等）',
  sanity_range_rejected: '適正株価が現在株価の0.25–4.0倍レンジ外',
};

export const FAIR_VALUE_MODEL_LABEL_JA: Record<FairValueModelKey, string> = {
  dcf: 'DCF',
  ddm: 'DDM',
  per: 'PER補完',
};

export const FAIR_VALUE_CONFIDENCE_JA: Record<FairValueConfidence, string> = {
  High: 'High（複数モデル・高取得率）',
  Medium: 'Medium（単一モデルまたはフォールバック混在）',
  Low: 'Low（PERのみまたは低取得率）',
};

export function recommendationJa(rec: FairValueRecommendation): string {
  switch (rec) {
    case 'Strong Buy':
      return '強い買い — 大幅な割安・マージンオブセーフティ十分';
    case 'Buy':
      return '買い — 適正株価を下回る';
    case 'Hold':
      return '保有 — 適正圏内';
    case 'Reduce':
      return '減らす — 割高圏';
    case 'Avoid':
      return '回避 — 大幅割高';
  }
}
