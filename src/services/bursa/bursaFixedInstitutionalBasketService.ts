/**
 * Phase16.7 — Fixed Institutional Basket トレンド（歪み補正）
 */
import type {
  BursaFixedInstitutionalBasketAnalysis,
  FixedBasketComparison,
  FixedBasketDisplayFields,
} from '../../types/bursaFixedInstitutionalBasket';
import { FIXED_BASKET_UNAVAILABLE_JA } from '../../types/bursaFixedInstitutionalBasket';
import type { BursaHistoricalOwnershipAnalysis } from '../../types/bursaHistoricalOwnership';
import type { TrendDirection } from '../../types/bursaInstitutionalTrend';
import {
  FIXED_BASKET_INSTITUTION_LABELS,
  isBasketInstitution,
  isTop30BasketCandidate,
  normalizeInstitutionLabel,
  parseInstitutionalOwnershipFromHtml,
  resolveTop30InstitutionBasket,
  TOP30_BASKET_MAX,
  type ParsedInstitutionalSnapshot,
} from './bursaInstitutionalOwnershipParser';
import { pickTrendDirectionFromWindows } from './bursaHistoricalOwnershipService';
import {
  buildInstitutionalAggregateSeries,
  findAggregatePctNearDate,
  formatTrendPct,
  relativeChangePercent,
  type InstitutionalAggregatePoint,
} from './bursaInstitutionalTrendParser';
import {
  fetchKlseShareholdingsHistoryHtml,
  fetchKlseStockPageHtml,
} from './bursaKlseHtmlClient';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function snapshotDate(s: ParsedInstitutionalSnapshot): string | null {
  return s.transactionDate ?? s.announcedDate ?? null;
}

function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function findInstitutionPctAsOf(
  snapshots: ParsedInstitutionalSnapshot[],
  institutionLabel: string,
  asOfDate: Date,
  slackDays = 60,
): number | null {
  const targetMs = asOfDate.getTime();
  let best: ParsedInstitutionalSnapshot | null = null;
  let bestDist = Infinity;

  for (const snap of snapshots) {
    if (normalizeInstitutionLabel(snap.name) !== institutionLabel) continue;
    if (snap.directPct == null) continue;
    const d = snapshotDate(snap);
    if (!d) continue;
    const ms = parseIsoDate(d).getTime();
    const dist = Math.abs(ms - targetMs);
    if (dist <= slackDays * 86_400_000 && dist < bestDist) {
      bestDist = dist;
      best = snap;
    }
  }

  return best?.directPct ?? null;
}

function findOldestPctInWindow(
  series: InstitutionalAggregatePoint[],
  referenceDate: Date,
  daysBack: number,
): number | null {
  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - daysBack);
  const inWindow = series.filter((p) => parseIsoDate(p.date) >= cutoff);
  if (inWindow.length < 2) return null;
  return inWindow[inWindow.length - 1]!.totalHoldingPercent;
}

function computeLegacyWindowTrend(
  series: InstitutionalAggregatePoint[],
  currentTotal: number,
  referenceDate: Date,
  daysBack: number,
): number | null {
  const target = new Date(referenceDate);
  target.setDate(target.getDate() - daysBack);
  const base =
    findAggregatePctNearDate(series, target, Math.min(90, daysBack / 2 + 30)) ??
    findOldestPctInWindow(series, referenceDate, daysBack);
  if (base == null) return null;
  return relativeChangePercent(currentTotal, base);
}

export function computeFixedBasketWindowTrend(
  snapshots: ParsedInstitutionalSnapshot[],
  referenceDate: Date,
  daysBack: number,
  basketLabels: readonly string[] = FIXED_BASKET_INSTITUTION_LABELS,
): { trend: number | null; pairedInstitutions: string[] } {
  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - daysBack);
  const refSlackMs = 30 * 86_400_000;

  const paired: string[] = [];
  let currentTotal = 0;
  let baseTotal = 0;

  for (const inst of basketLabels) {
    const inWindow = snapshots.filter((snap) => {
      if (normalizeInstitutionLabel(snap.name) !== inst) return false;
      if (snap.directPct == null) return false;
      const d = snapshotDate(snap);
      if (!d) return false;
      const ms = parseIsoDate(d).getTime();
      return ms >= cutoff.getTime() && ms <= referenceDate.getTime() + refSlackMs;
    });

    let cur: number | null = null;
    let base: number | null = null;

    if (inWindow.length >= 2) {
      const sorted = [...inWindow].sort((a, b) =>
        (snapshotDate(a) ?? '').localeCompare(snapshotDate(b) ?? ''),
      );
      const oldest = sorted[0]!;
      const newest = sorted[sorted.length - 1]!;
      if (snapshotDate(oldest) !== snapshotDate(newest)) {
        base = oldest.directPct;
        cur = newest.directPct;
      }
    } else {
      const slack = Math.min(90, Math.max(45, Math.round(daysBack / 4)));
      const baseDate = new Date(referenceDate);
      baseDate.setDate(baseDate.getDate() - daysBack);
      cur = findInstitutionPctAsOf(snapshots, inst, referenceDate, slack);
      base = findInstitutionPctAsOf(snapshots, inst, baseDate, slack);
    }

    if (cur != null && base != null) {
      paired.push(inst);
      currentTotal += cur;
      baseTotal += base;
    }
  }

  if (paired.length === 0 || baseTotal <= 0) {
    return { trend: null, pairedInstitutions: [] };
  }

  return {
    trend: relativeChangePercent(currentTotal, baseTotal),
    pairedInstitutions: paired,
  };
}

function buildDisplayFields(input: {
  pairedInstitutions: string[];
  threeMonthTrend: number | null;
  sixMonthTrend: number | null;
  twelveMonthTrend: number | null;
  trendDirection: TrendDirection | null;
  trendConfidence: number;
  comparisons: FixedBasketComparison[];
}): FixedBasketDisplayFields {
  const comparisonSummary = input.comparisons
    .map((c) => {
      const leg = c.legacyTrendPct != null ? formatTrendPct(c.legacyTrendPct) : '未取得';
      const fix = c.fixedBasketTrendPct != null ? formatTrendPct(c.fixedBasketTrendPct) : '未取得';
      return `${c.window} 旧${leg}→新${fix}`;
    })
    .join(' · ');

  return {
    pairedCount: String(input.pairedInstitutions.length),
    pairedInstitutions: input.pairedInstitutions.join(', ') || '—',
    threeMonthTrend: formatTrendPct(input.threeMonthTrend),
    sixMonthTrend: formatTrendPct(input.sixMonthTrend),
    twelveMonthTrend: formatTrendPct(input.twelveMonthTrend),
    trendDirection: input.trendDirection ?? '未取得',
    trendConfidence: String(input.trendConfidence),
    comparisonSummary,
  };
}

function emptyAnalysis(reason: string | null = null): BursaFixedInstitutionalBasketAnalysis {
  return {
    availability: 'unavailable',
    availabilityLabelJa: FIXED_BASKET_UNAVAILABLE_JA,
    basketMode: 'legacy8',
    basketMaxSize: 8,
    pairedInstitutionCount: 0,
    pairedInstitutions: [],
    legacy8PairedCount: 0,
    legacy8TwelveMonthTrend: null,
    threeMonthTrend: null,
    sixMonthTrend: null,
    twelveMonthTrend: null,
    trendDirection: null,
    trendConfidence: 0,
    comparisons: [],
    unavailableReason: reason ?? FIXED_BASKET_UNAVAILABLE_JA,
    displayJa: {
      pairedCount: '0',
      pairedInstitutions: '—',
      threeMonthTrend: '未取得',
      sixMonthTrend: '未取得',
      twelveMonthTrend: '未取得',
      trendDirection: '未取得',
      trendConfidence: '0',
      comparisonSummary: '—',
    },
    evaluationJa: FIXED_BASKET_UNAVAILABLE_JA,
    hasExtractableData: false,
    fetchedAt: null,
  };
}

export async function buildFixedInstitutionalBasketAnalysis(input: {
  stockCode: string;
  stockHtml: string | null;
  shareholdingsHistoryHtml?: string | null;
  legacyHistorical?: BursaHistoricalOwnershipAnalysis | null;
  fetchLiveExternal: boolean;
  referenceDate?: Date;
}): Promise<BursaFixedInstitutionalBasketAnalysis> {
  if (!input.fetchLiveExternal) {
    return emptyAnalysis('fetchLiveExternal=false');
  }

  const ref = input.referenceDate ?? new Date();

  let stockHtml = input.stockHtml;
  if (!stockHtml?.trim()) {
    const page = await fetchKlseStockPageHtml(input.stockCode);
    stockHtml = page?.html ?? null;
  }

  let shareholdingsHtml = input.shareholdingsHistoryHtml ?? null;
  if (!shareholdingsHtml?.trim()) {
    const hist = await fetchKlseShareholdingsHistoryHtml(input.stockCode);
    shareholdingsHtml = hist?.html ?? null;
  }

  if (!shareholdingsHtml?.trim()) {
    return emptyAnalysis('Shareholdings 履歴未取得');
  }

  const allSnapshots = parseInstitutionalOwnershipFromHtml({
    stockCode: input.stockCode,
    stockHtml,
    shareholdingsHtml,
  }).filter((s) => isTop30BasketCandidate(s.name) && s.directPct != null);

  if (allSnapshots.length === 0) {
    return emptyAnalysis('機関保有データなし');
  }

  const top30Basket = resolveTop30InstitutionBasket(allSnapshots);
  const snapshots = allSnapshots.filter((s) => isBasketInstitution(s.name, top30Basket));

  const t3 = computeFixedBasketWindowTrend(snapshots, ref, 90, top30Basket);
  const t6 = computeFixedBasketWindowTrend(snapshots, ref, 180, top30Basket);
  const t12 = computeFixedBasketWindowTrend(snapshots, ref, 365, top30Basket);
  const legacy8_12 = computeFixedBasketWindowTrend(
    snapshots,
    ref,
    365,
    FIXED_BASKET_INSTITUTION_LABELS,
  );

  const threeMonthTrend = t3.trend;
  const sixMonthTrend = t6.trend;
  const twelveMonthTrend = t12.trend;

  if (threeMonthTrend == null && sixMonthTrend == null && twelveMonthTrend == null) {
    return emptyAnalysis('TOP30バスケット 3M/6M/12M 比較不可');
  }

  const allPaired = [...new Set([...t3.pairedInstitutions, ...t6.pairedInstitutions, ...t12.pairedInstitutions])];

  const trendDirection = pickTrendDirectionFromWindows({
    threeMonthTrend,
    sixMonthTrend,
    twelveMonthTrend,
  });

  const legacy = input.legacyHistorical;
  const series = buildInstitutionalAggregateSeries(
    parseInstitutionalOwnershipFromHtml({
      stockCode: input.stockCode,
      stockHtml,
      shareholdingsHtml,
    }),
  );
  const legacyCurrent = series[0]?.totalHoldingPercent ?? null;

  const comparisons: FixedBasketComparison[] = [
    {
      window: '3M',
      legacyTrendPct: legacy?.threeMonthTrend ?? (legacyCurrent != null ? computeLegacyWindowTrend(series, legacyCurrent, ref, 90) : null),
      fixedBasketTrendPct: threeMonthTrend,
      pairedInstitutions: t3.pairedInstitutions,
    },
    {
      window: '6M',
      legacyTrendPct: legacy?.sixMonthTrend ?? (legacyCurrent != null ? computeLegacyWindowTrend(series, legacyCurrent, ref, 180) : null),
      fixedBasketTrendPct: sixMonthTrend,
      pairedInstitutions: t6.pairedInstitutions,
    },
    {
      window: '12M',
      legacyTrendPct: legacy?.twelveMonthTrend ?? (legacyCurrent != null ? computeLegacyWindowTrend(series, legacyCurrent, ref, 365) : null),
      fixedBasketTrendPct: twelveMonthTrend,
      pairedInstitutions: t12.pairedInstitutions,
    },
  ];

  const trendConfidence = clamp(
    40 +
      (threeMonthTrend != null ? 15 : 0) +
      (sixMonthTrend != null ? 15 : 0) +
      (twelveMonthTrend != null ? 15 : 0) +
      allPaired.length * 2 +
      (trendDirection && trendDirection !== 'Neutral' ? 5 : 0),
  );

  const evalParts = ['TOP30 Basket'];
  evalParts.push(`対象${allPaired.length}/${top30Basket.length}機関`);
  if (twelveMonthTrend != null) evalParts.push(`12M ${formatTrendPct(twelveMonthTrend)}`);
  else if (sixMonthTrend != null) evalParts.push(`6M ${formatTrendPct(sixMonthTrend)}`);
  else if (threeMonthTrend != null) evalParts.push(`3M ${formatTrendPct(threeMonthTrend)}`);
  if (trendDirection) evalParts.push(trendDirection);

  return {
    availability: 'available',
    availabilityLabelJa: '取得済',
    basketMode: 'top30',
    basketMaxSize: TOP30_BASKET_MAX,
    pairedInstitutionCount: allPaired.length,
    pairedInstitutions: allPaired,
    legacy8PairedCount: legacy8_12.pairedInstitutions.length,
    legacy8TwelveMonthTrend: legacy8_12.trend,
    threeMonthTrend,
    sixMonthTrend,
    twelveMonthTrend,
    trendDirection,
    trendConfidence,
    comparisons,
    unavailableReason: null,
    displayJa: buildDisplayFields({
      pairedInstitutions: allPaired,
      threeMonthTrend,
      sixMonthTrend,
      twelveMonthTrend,
      trendDirection,
      trendConfidence,
      comparisons,
    }),
    evaluationJa: evalParts.join(' · '),
    hasExtractableData: true,
    fetchedAt: new Date().toISOString(),
  };
}

export function applyFixedBasketToHistoricalOwnership(
  historical: BursaHistoricalOwnershipAnalysis,
  basket: BursaFixedInstitutionalBasketAnalysis | null | undefined,
): BursaHistoricalOwnershipAnalysis {
  if (!basket?.hasExtractableData || basket.availability !== 'available') {
    return historical;
  }

  const trendDirection =
    basket.trendDirection ??
    pickTrendDirectionFromWindows({
      threeMonthTrend: basket.threeMonthTrend,
      sixMonthTrend: basket.sixMonthTrend,
      twelveMonthTrend: basket.twelveMonthTrend,
    });

  return {
    ...historical,
    threeMonthTrend: basket.threeMonthTrend ?? historical.threeMonthTrend,
    sixMonthTrend: basket.sixMonthTrend ?? historical.sixMonthTrend,
    twelveMonthTrend: basket.twelveMonthTrend ?? historical.twelveMonthTrend,
    trendDirection,
    trendConfidence: Math.max(historical.trendConfidence, basket.trendConfidence),
    displayJa: {
      ...historical.displayJa,
      threeMonthTrend: formatTrendPct(basket.threeMonthTrend ?? historical.threeMonthTrend),
      sixMonthTrend: formatTrendPct(basket.sixMonthTrend ?? historical.sixMonthTrend),
      twelveMonthTrend: formatTrendPct(basket.twelveMonthTrend ?? historical.twelveMonthTrend),
      trendDirection: trendDirection ?? historical.displayJa.trendDirection,
      trendConfidence: String(Math.max(historical.trendConfidence, basket.trendConfidence)),
    },
    evaluationJa: `${historical.evaluationJa} · [TOP30 Basket補正]`,
  };
}
