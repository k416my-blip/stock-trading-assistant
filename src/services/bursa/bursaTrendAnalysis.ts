/**
 * Bursa Phase 2 — 過去5年推移（KLSE 年次・配当・ROE 実データ）
 */
import type { BursaDisclosureBundle } from '../../types/bursaDisclosure';
import type { BursaQuarterlyRecord } from '../../types/bursaDisclosure';
import { calendarYearFromDividendLabel, calendarYearFromFinancialLabel } from './bursaYearUtil';

export type BursaFiveYearPoint = {
  year: number;
  revenue: number | null;
  netProfit: number | null;
  eps: number | null;
  dividend: number | null;
  roePct: number | null;
  dividendPayoutPct: number | null;
};

export type BursaFiveYearTrend = {
  years: number[];
  revenue: (number | null)[];
  netProfit: (number | null)[];
  eps: (number | null)[];
  dividend: (number | null)[];
  roePct: (number | null)[];
  dividendPayoutPct: (number | null)[];
  points: BursaFiveYearPoint[];
  fetchedFields: string[];
  missingFields: string[];
};

const TREND_YEARS = 5;

function isCompleteFyRow(r: BursaQuarterlyRecord): boolean {
  const y = calendarYearFromFinancialLabel(r.financialYear);
  if (y == null) return false;
  if (r.revenue == null || r.netProfit == null) return false;
  if (r.revenue < 500_000_000) return false;
  return true;
}

function roeByYear(quarterlyRows: BursaQuarterlyRecord[] | null | undefined): Map<number, number> {
  const map = new Map<number, number>();
  for (const r of quarterlyRows ?? []) {
    const y = calendarYearFromFinancialLabel(r.financialYear);
    if (y == null || r.roePct == null) continue;
    const q = Number.parseInt(r.quarter ?? '', 10);
    if (q === 4) {
      map.set(y, r.roePct);
      continue;
    }
    if (!map.has(y)) map.set(y, r.roePct);
  }
  return map;
}

export function filterCompleteFyAnnual(
  records: BursaQuarterlyRecord[] | null | undefined,
): BursaQuarterlyRecord[] {
  const rows = (records ?? []).filter(isCompleteFyRow);
  if (rows.length >= 2 && rows[0].revenue != null && rows[1].revenue != null) {
    if (rows[0].revenue < rows[1].revenue * 0.35) return rows.slice(1);
  }
  return rows;
}

function dividendByYear(bundle: BursaDisclosureBundle): Map<number, number> {
  const map = new Map<number, number>();
  for (const d of bundle.dividend.history) {
    const y = calendarYearFromDividendLabel(d.financialYear);
    const amt = d.amountPerShare;
    if (y == null || amt == null || amt <= 0) continue;
    map.set(y, (map.get(y) ?? 0) + amt);
  }
  return map;
}

export function buildBursaFiveYearTrend(bundle: BursaDisclosureBundle): BursaFiveYearTrend {
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];

  const annualByYear = new Map<number, BursaQuarterlyRecord>();
  for (const r of filterCompleteFyAnnual(bundle.quarterly.annualRecords)) {
    const y = calendarYearFromFinancialLabel(r.financialYear);
    if (y == null) continue;
    if (!annualByYear.has(y)) annualByYear.set(y, r);
  }

  const roeMap = roeByYear(bundle.quarterly.quarterlyHistory ?? []);

  const divMap = dividendByYear(bundle);

  const allYears = new Set<number>([
    ...annualByYear.keys(),
    ...divMap.keys(),
    ...roeMap.keys(),
  ]);

  const sortedYears = [...allYears].sort((a, b) => a - b);
  const years = sortedYears.slice(-TREND_YEARS);

  if (years.length === 0 && annualByYear.size > 0) {
    const fallback = [...annualByYear.keys()].sort((a, b) => a - b).slice(-TREND_YEARS);
    years.push(...fallback);
  }

  const points: BursaFiveYearPoint[] = years.map((year) => {
    const ann = annualByYear.get(year);
    return {
      year,
      revenue: ann?.revenue ?? null,
      netProfit: ann?.netProfit ?? null,
      eps: ann?.eps ?? null,
      dividend: divMap.get(year) ?? null,
      roePct: ann?.roePct ?? roeMap.get(year) ?? null,
      dividendPayoutPct: ann?.dividendPayoutPct ?? null,
    };
  });

  const revenue = points.map((p) => p.revenue);
  const netProfit = points.map((p) => p.netProfit);
  const eps = points.map((p) => p.eps);
  const dividend = points.map((p) => p.dividend);
  const roePct = points.map((p) => p.roePct);
  const dividendPayoutPct = points.map((p) => p.dividendPayoutPct);

  if (revenue.some((v) => v != null)) fetchedFields.push('trend.revenue');
  else missingFields.push('trend.revenue');
  if (netProfit.some((v) => v != null)) fetchedFields.push('trend.netProfit');
  else missingFields.push('trend.netProfit');
  if (eps.some((v) => v != null)) fetchedFields.push('trend.eps');
  else missingFields.push('trend.eps');
  if (dividend.some((v) => v != null)) fetchedFields.push('trend.dividend');
  else missingFields.push('trend.dividend');
  if (roePct.some((v) => v != null)) fetchedFields.push('trend.roe');
  else missingFields.push('trend.roe');
  if (dividendPayoutPct.some((v) => v != null)) fetchedFields.push('trend.dividendPayout');
  else missingFields.push('trend.dividendPayout');

  return {
    years,
    revenue,
    netProfit,
    eps,
    dividend,
    roePct,
    dividendPayoutPct,
    points,
    fetchedFields,
    missingFields,
  };
}
