/**
 * Bursa/KLSE 実データから AI 評価用メトリクスを算出（推定値禁止）
 */
import type { BursaDisclosureBundle } from '../../types/bursaDisclosure';
import type { PartialDimensionScores, RealMetricInput } from '../aiRankingEngine';
import { computeDimensionScoresFromRealData } from '../aiRankingEngine';
import { buildBursaFiveYearTrend } from './bursaTrendAnalysis';
import { calendarYearFromFinancialLabel } from './bursaYearUtil';
import { parseFormattedNumber } from './bursaKlseParser';

export type BursaDerivedMetrics = {
  per: number | null;
  dividendYieldPct: number | null;
  marketCap: number | null;
  revenueGrowthPct: number | null;
  epsGrowthPct: number | null;
  profitMarginPct: number | null;
  dividendGrowthPct: number | null;
  dividendContinuityYears: number | null;
  price: number | null;
};

function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function cagrPct(values: number[]): number | null {
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  if (first <= 0 || last <= 0) return null;
  const years = values.length - 1;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
}

function countConsecutiveDividendYears(
  dividendByYear: Map<number, number>,
  fromYear: number,
): number {
  let count = 0;
  for (let y = fromYear; y >= fromYear - 30; y--) {
    const v = dividendByYear.get(y);
    if (v != null && v > 0) count++;
    else break;
  }
  return count;
}

export function extractBursaDerivedMetrics(
  bundle: BursaDisclosureBundle,
  currentPrice: number | null,
): BursaDerivedMetrics {
  const { profile, quarterly, dividend } = bundle;
  const trend = buildBursaFiveYearTrend(bundle);

  const marketCap = profile.marketCap;
  const price =
    currentPrice != null && currentPrice > 0
      ? currentPrice
      : marketCap != null && profile.sharesOutstanding != null && profile.sharesOutstanding > 0
        ? marketCap / profile.sharesOutstanding
        : null;

  const completedAnnual = quarterly.annualRecords.filter((r) => {
    const y = calendarYearFromFinancialLabel(r.financialYear);
    if (y == null) return false;
    return r.revenue != null && r.netProfit != null && r.revenue > 1_000_000_000;
  });

  const latestFy = completedAnnual[0] ?? null;
  const prevFy = completedAnnual[1] ?? null;

  let profitMarginPct: number | null = null;
  if (latestFy?.netMarginPct != null) {
    profitMarginPct = latestFy.netMarginPct;
  } else if (latestFy?.revenue != null && latestFy.netProfit != null && latestFy.revenue > 0) {
    profitMarginPct = (latestFy.netProfit / latestFy.revenue) * 100;
  }

  const revenueGrowthPct =
    trend.revenue.length >= 2
      ? cagrPct(trend.revenue.filter((v): v is number => v != null && v > 0))
      : latestFy?.revenue != null && prevFy?.revenue != null
        ? pctChange(latestFy.revenue, prevFy.revenue)
        : null;

  const epsGrowthPct =
    trend.eps.length >= 2
      ? cagrPct(trend.eps.filter((v): v is number => v != null))
      : latestFy?.eps != null && prevFy?.eps != null
        ? pctChange(latestFy.eps, prevFy.eps)
        : null;

  const dividendGrowthPct =
    trend.dividend.length >= 2
      ? cagrPct(trend.dividend.filter((v): v is number => v != null && v > 0))
      : null;

  const epsForPer = latestFy?.eps ?? quarterly.latestQuarter?.eps;
  let per: number | null = profile.pe ?? null;
  if (per == null && price != null && epsForPer != null && epsForPer > 0) {
    per = price / (epsForPer / 100);
  }

  let dividendYieldPct: number | null = profile.dividendYieldPct ?? null;
  if (dividendYieldPct == null && price != null && price > 0) {
    const lastDiv = trend.dividend[trend.dividend.length - 1];
    if (lastDiv != null && lastDiv > 0) {
      dividendYieldPct = (lastDiv / price) * 100;
    }
  }

  const divMap = new Map<number, number>();
  for (let i = 0; i < trend.years.length; i++) {
    const d = trend.dividend[i];
    if (d != null) divMap.set(trend.years[i], d);
  }
  const latestYear = trend.years[trend.years.length - 1] ?? null;
  const dividendContinuityYears =
    latestYear != null ? countConsecutiveDividendYears(divMap, latestYear) : null;

  if (dividendContinuityYears === 0 && dividend.history.length > 0) {
    /* 配当履歴があれば最低1年 */
  }

  return {
    per,
    dividendYieldPct,
    marketCap,
    revenueGrowthPct,
    epsGrowthPct,
    profitMarginPct,
    dividendGrowthPct,
    dividendContinuityYears:
      dividendContinuityYears != null && dividendContinuityYears > 0
        ? dividendContinuityYears
        : dividend.history.filter((d) => d.amountPerShare != null && d.amountPerShare > 0).length > 0
          ? Math.min(
              5,
              new Set(
                dividend.history
                  .map((d) => calendarYearFromFinancialLabel(d.financialYear))
                  .filter((y): y is number => y != null),
              ).size,
            )
          : null,
    price,
  };
}

export function bursaToRealMetricInput(
  derived: BursaDerivedMetrics,
  volume: number | null,
): RealMetricInput {
  const growthPct =
    derived.revenueGrowthPct != null && derived.epsGrowthPct != null
      ? (derived.revenueGrowthPct + derived.epsGrowthPct) / 2
      : derived.revenueGrowthPct ?? derived.epsGrowthPct;

  return {
    per: derived.per,
    dividendYieldPct: derived.dividendYieldPct,
    marketCap: derived.marketCap,
    volume,
    revenueGrowthPct: growthPct,
    profitMarginPct: derived.profitMarginPct,
  };
}

export function computeBursaDimensionScores(
  bundle: BursaDisclosureBundle,
  currentPrice: number | null,
  volume: number | null,
): PartialDimensionScores {
  const derived = extractBursaDerivedMetrics(bundle, currentPrice);
  const base = computeDimensionScoresFromRealData(bursaToRealMetricInput(derived, volume));

  let growth = base.growth;
  if (growth == null && (derived.revenueGrowthPct != null || derived.epsGrowthPct != null)) {
    const parts: number[] = [];
    if (derived.revenueGrowthPct != null) {
      parts.push(Math.max(0, Math.min(100, Math.round(50 + derived.revenueGrowthPct * 2))));
    }
    if (derived.epsGrowthPct != null) {
      parts.push(Math.max(0, Math.min(100, Math.round(50 + derived.epsGrowthPct * 2))));
    }
    growth = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  }

  let profitability = base.profitability;
  if (profitability == null) {
    const parts: number[] = [];
    if (derived.profitMarginPct != null) {
      parts.push(Math.max(0, Math.min(100, Math.round(derived.profitMarginPct * 2.5 + 20))));
    }
    const eps = bundle.quarterly.annualRecords[0]?.eps ?? bundle.quarterly.latestQuarter?.eps;
    if (eps != null && eps > 0) {
      parts.push(Math.max(0, Math.min(100, Math.round(Math.log10(eps + 1) * 25))));
    }
    if (parts.length > 0) {
      profitability = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
    }
  }

  let stability = base.stability;
  if (stability == null && derived.marketCap != null) {
    const capScore = Math.max(0, Math.min(100, Math.round(Math.log10(derived.marketCap + 1) * 12)));
    const divYears = derived.dividendContinuityYears ?? 0;
    const divScore = Math.max(0, Math.min(100, divYears * 8));
    stability = Math.round(capScore * 0.65 + divScore * 0.35);
  }

  let dividendAppeal = base.dividendAppeal;
  if (dividendAppeal == null) {
    const parts: number[] = [];
    if (derived.dividendYieldPct != null) {
      parts.push(Math.max(0, Math.min(100, Math.round(derived.dividendYieldPct * 12))));
    }
    if (derived.dividendGrowthPct != null) {
      parts.push(Math.max(0, Math.min(100, Math.round(50 + derived.dividendGrowthPct * 2))));
    }
    if (parts.length > 0) {
      dividendAppeal = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
    }
  }

  return {
    growth,
    profitability,
    stability,
    value: base.value,
    dividendAppeal,
  };
}

export function mergePartialScores(
  primary: PartialDimensionScores,
  fallback: PartialDimensionScores | null,
): PartialDimensionScores {
  if (!fallback) return primary;
  const keys = ['growth', 'profitability', 'stability', 'value', 'dividendAppeal'] as const;
  const out = { ...primary };
  for (const k of keys) {
    if (out[k] == null && fallback[k] != null) out[k] = fallback[k];
  }
  return out;
}

export function parseKeyRatioPercent(html: string, label: string): number | null {
  const raw = html.match(
    new RegExp(`<td[^>]*>\\s*${label}\\s*</td>\\s*<td[^>]*>\\s*([^<]+)\\s*</td>`, 'i'),
  )?.[1];
  if (!raw) return null;
  return parseFormattedNumber(raw.replace(/%/g, ''));
}
