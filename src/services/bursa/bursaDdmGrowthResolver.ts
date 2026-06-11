/**
 * Phase21.8 — DDM 永久成長率 g リゾルバー
 * 優先: 5年配当CAGR → 3年配当CAGR → 配当YoY → FR利益成長
 * クリップ: g ∈ [-2%, r−2%]
 */
import type { BursaDividendIntelligenceAnalysis } from '../../types/bursaDividendIntelligence';
import type { BursaDisclosureBundle } from '../../types/bursaDisclosure';
import type { FairValueIntelligenceSource } from '../../types/bursaFairValueIntelligence';
import type { FinancialReportAnalysis } from '../../types/bursaFinancialReportAnalysis';
import {
  DDM_G_MIN_PCT,
  MIN_DDM_SPREAD,
  resolveFairValueSector,
  SECTOR_FAIR_VALUE_PARAMS,
} from '../../constants/bursaFairValueIntelligence';
import { buildBursaFiveYearTrend, type BursaFiveYearPoint } from './bursaTrendAnalysis';

export type DdmGrowthCandidateKey =
  | 'five_year_dividend_cagr'
  | 'three_year_dividend_cagr'
  | 'dividend_yoy'
  | 'fr_profit_growth';

export type DdmGrowthCandidate = {
  key: DdmGrowthCandidateKey;
  valuePct: number | null;
  sourceJa: string;
  detailJa: string;
};

export type ResolvedDdmGrowth = {
  adoptedPct: number | null;
  adoptedKey: DdmGrowthCandidateKey | null;
  sourceJa: string;
  source: FairValueIntelligenceSource;
  rawPct: number | null;
  clippedPct: number | null;
  clipApplied: boolean;
  clipReasonJa: string | null;
  candidates: DdmGrowthCandidate[];
  maxAllowedPct: number;
  minAllowedPct: number;
};

function cagrPct(start: number, end: number, years: number): number | null {
  if (start <= 0 || end <= 0 || years <= 0) return null;
  const v = (Math.pow(end / start, 1 / years) - 1) * 100;
  return Number.isFinite(v) ? v : null;
}

function dividendPointsWithData(points: BursaFiveYearPoint[]) {
  return points.filter((p) => p.dividend != null && p.dividend > 0);
}

export function collectDdmGrowthCandidates(input: {
  bundle: BursaDisclosureBundle | null | undefined;
  financialReport: FinancialReportAnalysis | null | undefined;
  dividendIntelligence: BursaDividendIntelligenceAnalysis | null | undefined;
}): DdmGrowthCandidate[] {
  const candidates: DdmGrowthCandidate[] = [];

  const trend = input.bundle ? buildBursaFiveYearTrend(input.bundle) : null;
  const divs = trend ? dividendPointsWithData(trend.points) : [];

  const phase17Cagr = input.dividendIntelligence?.fiveYearCagr ?? null;
  if (phase17Cagr != null) {
    candidates.push({
      key: 'five_year_dividend_cagr',
      valuePct: phase17Cagr,
      sourceJa: 'Phase17 Dividend（5Y CAGR）',
      detailJa: input.dividendIntelligence?.displayJa?.fiveYearCagr ?? `${phase17Cagr.toFixed(2)}%`,
    });
  } else if (divs.length >= 2) {
    const start = divs[0];
    const end = divs[divs.length - 1];
    const years = end.year - start.year;
    const v = cagrPct(start.dividend!, end.dividend!, years > 0 ? years : divs.length - 1);
    candidates.push({
      key: 'five_year_dividend_cagr',
      valuePct: v,
      sourceJa: 'Bursa配当履歴（5年CAGR）',
      detailJa: `${start.year}→${end.year} RM${start.dividend!.toFixed(3)}→RM${end.dividend!.toFixed(3)}`,
    });
  } else {
    candidates.push({
      key: 'five_year_dividend_cagr',
      valuePct: null,
      sourceJa: '5年配当CAGR',
      detailJa: '未取得',
    });
  }

  if (divs.length >= 4) {
    const start = divs[divs.length - 4];
    const end = divs[divs.length - 1];
    const years = end.year - start.year;
    candidates.push({
      key: 'three_year_dividend_cagr',
      valuePct: cagrPct(start.dividend!, end.dividend!, years > 0 ? years : 3),
      sourceJa: 'Bursa配当履歴（3年CAGR）',
      detailJa: `${start.year}→${end.year} RM${start.dividend!.toFixed(3)}→RM${end.dividend!.toFixed(3)}`,
    });
  } else {
    candidates.push({
      key: 'three_year_dividend_cagr',
      valuePct: null,
      sourceJa: '3年配当CAGR',
      detailJa: '4年分以上の配当データ不足',
    });
  }

  if (divs.length >= 2) {
    const prev = divs[divs.length - 2];
    const last = divs[divs.length - 1];
    candidates.push({
      key: 'dividend_yoy',
      valuePct: ((last.dividend! - prev.dividend!) / prev.dividend!) * 100,
      sourceJa: 'Bursa配当履歴（年次YoY）',
      detailJa: `${prev.year}→${last.year} RM${prev.dividend!.toFixed(3)}→RM${last.dividend!.toFixed(3)}`,
    });
  } else {
    candidates.push({
      key: 'dividend_yoy',
      valuePct: input.dividendIntelligence?.dividendGrowthRate ?? null,
      sourceJa: 'Phase17 Dividend（増配率）',
      detailJa: '配当YoY未取得',
    });
  }

  const profit = input.financialReport?.extracted.profitGrowth?.growthPct ?? null;
  candidates.push({
    key: 'fr_profit_growth',
    valuePct: profit,
    sourceJa: 'Financial Report（四半期純利益YoY）',
    detailJa: input.financialReport?.extracted.profitGrowth?.growthLabelJa ?? 'FR利益成長',
  });

  return candidates;
}

const PRIORITY: DdmGrowthCandidateKey[] = [
  'five_year_dividend_cagr',
  'three_year_dividend_cagr',
  'dividend_yoy',
  'fr_profit_growth',
];

export function clipDdmGrowthPct(
  gPct: number,
  requiredReturn: number,
): { clippedPct: number; clipApplied: boolean; clipReasonJa: string | null; maxAllowedPct: number; minAllowedPct: number } {
  const maxAllowedPct = (requiredReturn - MIN_DDM_SPREAD) * 100;
  const minAllowedPct = DDM_G_MIN_PCT;
  let clipped = gPct;
  let clipApplied = false;
  const reasons: string[] = [];

  if (clipped > maxAllowedPct) {
    clipped = maxAllowedPct;
    clipApplied = true;
    reasons.push(`g>${maxAllowedPct.toFixed(1)}%（r−2%）→ ${clipped.toFixed(1)}%にクリップ`);
  }
  if (clipped < minAllowedPct) {
    clipped = minAllowedPct;
    clipApplied = true;
    reasons.push(`g<${minAllowedPct}% → ${clipped.toFixed(1)}%にクリップ`);
  }

  return {
    clippedPct: clipped,
    clipApplied,
    clipReasonJa: reasons.length ? reasons.join(' · ') : null,
    maxAllowedPct,
    minAllowedPct,
  };
}

function sourceFromCandidateKey(key: DdmGrowthCandidateKey): FairValueIntelligenceSource {
  switch (key) {
    case 'fr_profit_growth':
      return 'financial_report';
    case 'five_year_dividend_cagr':
    case 'three_year_dividend_cagr':
    case 'dividend_yoy':
      return 'bursa_disclosure';
  }
}

export function resolveDdmGrowthRate(input: {
  bundle: BursaDisclosureBundle | null | undefined;
  financialReport: FinancialReportAnalysis | null | undefined;
  dividendIntelligence: BursaDividendIntelligenceAnalysis | null | undefined;
  sector: string | null | undefined;
}): ResolvedDdmGrowth {
  const params = SECTOR_FAIR_VALUE_PARAMS[resolveFairValueSector(input.sector)];
  const r = params.ddmRequiredReturn;
  const maxAllowedPct = (r - MIN_DDM_SPREAD) * 100;
  const minAllowedPct = DDM_G_MIN_PCT;

  const candidates = collectDdmGrowthCandidates(input);
  const picked = PRIORITY.map((key) => candidates.find((c) => c.key === key)).find(
    (c) => c != null && c.valuePct != null && Number.isFinite(c.valuePct),
  );

  if (!picked || picked.valuePct == null) {
    return {
      adoptedPct: null,
      adoptedKey: null,
      sourceJa: '未取得',
      source: 'none',
      rawPct: null,
      clippedPct: null,
      clipApplied: false,
      clipReasonJa: null,
      candidates,
      maxAllowedPct,
      minAllowedPct,
    };
  }

  const clip = clipDdmGrowthPct(picked.valuePct, r);
  return {
    adoptedPct: clip.clippedPct,
    adoptedKey: picked.key,
    sourceJa: picked.sourceJa,
    source: sourceFromCandidateKey(picked.key),
    rawPct: picked.valuePct,
    clippedPct: clip.clippedPct,
    clipApplied: clip.clipApplied,
    clipReasonJa: clip.clipReasonJa,
    candidates,
    maxAllowedPct: clip.maxAllowedPct,
    minAllowedPct: clip.minAllowedPct,
  };
}

/** Phase21.8 監査 — 修正前（FR利益YoY優先）の g */
export function resolveLegacyFrProfitDdmGrowth(input: {
  financialReport: FinancialReportAnalysis | null | undefined;
  fallbackPct: number | null;
  sector: string | null | undefined;
}): number | null {
  const raw = input.financialReport?.extracted.profitGrowth?.growthPct ?? input.fallbackPct;
  if (raw == null) return null;
  const r = SECTOR_FAIR_VALUE_PARAMS[resolveFairValueSector(input.sector)].ddmRequiredReturn;
  return clipDdmGrowthPct(raw, r).clippedPct;
}

export const DDM_GROWTH_CANDIDATE_LABEL_JA: Record<DdmGrowthCandidateKey, string> = {
  five_year_dividend_cagr: '5年配当CAGR',
  three_year_dividend_cagr: '3年配当CAGR',
  dividend_yoy: '配当YoY',
  fr_profit_growth: 'FR利益成長',
};
