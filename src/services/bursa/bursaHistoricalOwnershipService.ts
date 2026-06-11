/**
 * Phase16.6 — Historical Institutional Ownership
 */
import type {
  BursaHistoricalOwnershipAnalysis,
  HistoricalOwnershipDisplayFields,
  HistoricalOwnershipSource,
  OwnershipHistoryRecord,
} from '../../types/bursaHistoricalOwnership';
import {
  HISTORICAL_OWNERSHIP_FIELD_MISSING_JA,
  HISTORICAL_OWNERSHIP_UNAVAILABLE_JA,
} from '../../types/bursaHistoricalOwnership';
import type { TrendDirection } from '../../types/bursaInstitutionalTrend';
import {
  parseInstitutionalOwnershipFromHtml,
  type ParsedInstitutionalSnapshot,
} from './bursaInstitutionalOwnershipParser';
import {
  buildInstitutionalAggregateSeries,
  classifyTrendDirection,
  findAggregatePctNearDate,
  formatTrendPct,
  relativeChangePercent,
  type InstitutionalAggregatePoint,
} from './bursaInstitutionalTrendParser';
import {
  fetchKlseShareholdingsHistoryHtml,
  fetchKlseStockPageHtml,
} from './bursaKlseHtmlClient';

const SOURCE_LABEL: Record<HistoricalOwnershipSource, string> = {
  klse_shareholdings_history: 'KLSE Shareholdings History',
  klse_shareholding_changes: 'KLSE Shareholding Changes',
  klse_major_shareholders: 'KLSE Major Shareholders',
  klse_announcement: 'KLSE Announcement',
  none: '—',
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function snapshotDate(s: ParsedInstitutionalSnapshot): string | null {
  return s.transactionDate ?? s.announcedDate ?? null;
}

function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
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

function filterWithinMonths(
  records: OwnershipHistoryRecord[],
  months: number,
  referenceDate: Date,
): OwnershipHistoryRecord[] {
  const cutoff = new Date(referenceDate);
  cutoff.setMonth(cutoff.getMonth() - months);
  return records.filter((r) => {
    const d = new Date(`${r.recordDate}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d >= cutoff;
  });
}

export function buildOwnershipHistoryRecords(
  snapshots: ParsedInstitutionalSnapshot[],
): OwnershipHistoryRecord[] {
  const withPct = snapshots.filter((s) => s.directPct != null && snapshotDate(s));
  const byHolder = new Map<string, ParsedInstitutionalSnapshot[]>();

  for (const snap of withPct) {
    const list = byHolder.get(snap.name) ?? [];
    list.push(snap);
    byHolder.set(snap.name, list);
  }

  const records: OwnershipHistoryRecord[] = [];
  const seen = new Set<string>();

  for (const [holderName, snaps] of byHolder) {
    const sorted = [...snaps].sort((a, b) =>
      (snapshotDate(b) ?? '').localeCompare(snapshotDate(a) ?? ''),
    );

    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i]!;
      const prev = sorted[i + 1];
      const recordDate = snapshotDate(cur);
      if (!recordDate) continue;

      const key = `${holderName}|${recordDate}|${cur.directPct}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const holdingPercent = cur.directPct;
      let changePercent: number | null = null;
      if (prev?.directPct != null && holdingPercent != null && prev.directPct > 0) {
        changePercent = relativeChangePercent(holdingPercent, prev.directPct);
      }

      records.push({ recordDate, holderName, holdingPercent, changePercent });
    }
  }

  return records.sort((a, b) => b.recordDate.localeCompare(a.recordDate));
}

export function pickTrendDirectionFromWindows(input: {
  threeMonthTrend: number | null;
  sixMonthTrend: number | null;
  twelveMonthTrend: number | null;
}): TrendDirection | null {
  const candidate =
    input.twelveMonthTrend ?? input.sixMonthTrend ?? input.threeMonthTrend ?? null;
  if (candidate == null || !Number.isFinite(candidate)) return null;
  return classifyTrendDirection(candidate);
}

function computeTrendConfidence(input: {
  historyCount: number;
  seriesLength: number;
  has3m: boolean;
  has6m: boolean;
  has12m: boolean;
  direction: TrendDirection | null;
}): number {
  let score = 10;
  if (input.historyCount >= 5) score += 15;
  if (input.historyCount >= 20) score += 10;
  if (input.seriesLength >= 3) score += 15;
  if (input.has3m) score += 15;
  if (input.has6m) score += 15;
  if (input.has12m) score += 15;
  if (input.direction && input.direction !== 'Neutral') score += 5;
  return clamp(score);
}

function buildDisplayFields(input: {
  ownershipHistory: OwnershipHistoryRecord[];
  threeMonthTrend: number | null;
  sixMonthTrend: number | null;
  twelveMonthTrend: number | null;
  trendDirection: TrendDirection | null;
  trendConfidence: number;
}): HistoricalOwnershipDisplayFields {
  const top = input.ownershipHistory.slice(0, 3);
  const topHistory =
    top.length > 0
      ? top
          .map(
            (r) =>
              `${r.holderName} ${r.holdingPercent?.toFixed(2) ?? HISTORICAL_OWNERSHIP_FIELD_MISSING_JA}% (${r.recordDate})`,
          )
          .join(' / ')
      : HISTORICAL_OWNERSHIP_FIELD_MISSING_JA;

  return {
    recordCount: String(input.ownershipHistory.length),
    threeMonthTrend: formatTrendPct(input.threeMonthTrend),
    sixMonthTrend: formatTrendPct(input.sixMonthTrend),
    twelveMonthTrend: formatTrendPct(input.twelveMonthTrend),
    trendDirection: input.trendDirection ?? HISTORICAL_OWNERSHIP_FIELD_MISSING_JA,
    trendConfidence: String(input.trendConfidence),
    topHistory,
  };
}

function buildEvaluationJa(input: {
  threeMonthTrend: number | null;
  sixMonthTrend: number | null;
  twelveMonthTrend: number | null;
  trendDirection: TrendDirection | null;
  source: HistoricalOwnershipSource;
}): string {
  const parts = ['Historical Ownership'];
  if (input.twelveMonthTrend != null) parts.push(`12M ${formatTrendPct(input.twelveMonthTrend)}`);
  else if (input.sixMonthTrend != null) parts.push(`6M ${formatTrendPct(input.sixMonthTrend)}`);
  else if (input.threeMonthTrend != null) parts.push(`3M ${formatTrendPct(input.threeMonthTrend)}`);
  if (input.trendDirection) parts.push(input.trendDirection);
  parts.push(`[${SOURCE_LABEL[input.source]}]`);
  return parts.join(' · ');
}

function emptyAnalysis(reason: string | null = null): BursaHistoricalOwnershipAnalysis {
  const missing = HISTORICAL_OWNERSHIP_FIELD_MISSING_JA;
  return {
    availability: 'unavailable',
    availabilityLabelJa: HISTORICAL_OWNERSHIP_UNAVAILABLE_JA,
    ownershipHistory: [],
    threeMonthTrend: null,
    sixMonthTrend: null,
    twelveMonthTrend: null,
    trendDirection: null,
    trendConfidence: 0,
    source: 'none',
    unavailableReason: reason ?? HISTORICAL_OWNERSHIP_UNAVAILABLE_JA,
    displayJa: {
      recordCount: '0',
      threeMonthTrend: missing,
      sixMonthTrend: missing,
      twelveMonthTrend: missing,
      trendDirection: missing,
      trendConfidence: '0',
      topHistory: missing,
    },
    evaluationJa: HISTORICAL_OWNERSHIP_UNAVAILABLE_JA,
    hasExtractableData: false,
    fetchedAt: null,
  };
}

export async function buildHistoricalOwnershipAnalysis(input: {
  stockCode: string;
  stockHtml: string | null;
  shareholdingsHistoryHtml?: string | null;
  fetchLiveExternal: boolean;
  referenceDate?: Date;
}): Promise<BursaHistoricalOwnershipAnalysis> {
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

  if (!stockHtml?.trim() && !shareholdingsHtml?.trim()) {
    return emptyAnalysis('KLSE HTML 未取得');
  }

  const snapshots = parseInstitutionalOwnershipFromHtml({
    stockCode: input.stockCode,
    stockHtml,
    shareholdingsHtml,
  });

  const ownershipHistory = filterWithinMonths(
    buildOwnershipHistoryRecords(snapshots),
    12,
    ref,
  );

  const withPct = snapshots.filter((s) => s.directPct != null);
  if (withPct.length === 0 || ownershipHistory.length === 0) {
    return emptyAnalysis('過去12か月の機関保有履歴なし');
  }

  const series = buildInstitutionalAggregateSeries(snapshots);
  if (series.length < 2) {
    return emptyAnalysis('時系列集計に必要な2時点以上のデータなし');
  }

  const currentHoldingPercent = series[0]!.totalHoldingPercent;

  const d3 = new Date(ref);
  d3.setDate(d3.getDate() - 90);
  const d6 = new Date(ref);
  d6.setDate(d6.getDate() - 180);
  const d12 = new Date(ref);
  d12.setDate(d12.getDate() - 365);

  const pct3mBase =
    findAggregatePctNearDate(series, d3, 60) ??
    findOldestPctInWindow(series, ref, 90);
  const pct6mBase =
    findAggregatePctNearDate(series, d6, 75) ??
    findOldestPctInWindow(series, ref, 180);
  const pct12mBase =
    findAggregatePctNearDate(series, d12, 90) ??
    findOldestPctInWindow(series, ref, 365);

  const threeMonthTrend =
    pct3mBase != null ? relativeChangePercent(currentHoldingPercent, pct3mBase) : null;
  const sixMonthTrend =
    pct6mBase != null ? relativeChangePercent(currentHoldingPercent, pct6mBase) : null;
  const twelveMonthTrend =
    pct12mBase != null ? relativeChangePercent(currentHoldingPercent, pct12mBase) : null;

  if (threeMonthTrend == null && sixMonthTrend == null && twelveMonthTrend == null) {
    return emptyAnalysis('3M/6M/12M 比較に必要な履歴なし');
  }

  const trendDirection = pickTrendDirectionFromWindows({
    threeMonthTrend,
    sixMonthTrend,
    twelveMonthTrend,
  });

  const sources = new Set(withPct.map((s) => s.source));
  const source: HistoricalOwnershipSource = sources.has('klse_shareholdings_page')
    ? 'klse_shareholdings_history'
    : sources.has('klse_major_shareholders')
      ? 'klse_major_shareholders'
      : 'klse_shareholding_changes';

  const trendConfidence = computeTrendConfidence({
    historyCount: ownershipHistory.length,
    seriesLength: series.length,
    has3m: threeMonthTrend != null,
    has6m: sixMonthTrend != null,
    has12m: twelveMonthTrend != null,
    direction: trendDirection,
  });

  return {
    availability: 'available',
    availabilityLabelJa: '取得済',
    ownershipHistory,
    threeMonthTrend,
    sixMonthTrend,
    twelveMonthTrend,
    trendDirection,
    trendConfidence,
    source,
    unavailableReason: null,
    displayJa: buildDisplayFields({
      ownershipHistory,
      threeMonthTrend,
      sixMonthTrend,
      twelveMonthTrend,
      trendDirection,
      trendConfidence,
    }),
    evaluationJa: buildEvaluationJa({
      threeMonthTrend,
      sixMonthTrend,
      twelveMonthTrend,
      trendDirection,
      source,
    }),
    hasExtractableData: true,
    fetchedAt: new Date().toISOString(),
  };
}

export function applyHistoricalToInstitutionalTrend(
  trend: import('../../types/bursaInstitutionalTrend').BursaInstitutionalTrendAnalysis,
  historical: BursaHistoricalOwnershipAnalysis | null | undefined,
): import('../../types/bursaInstitutionalTrend').BursaInstitutionalTrendAnalysis {
  if (!historical?.hasExtractableData || historical.availability !== 'available') {
    return trend;
  }

  const threeMonthTrend = historical.threeMonthTrend ?? trend.threeMonthTrend;
  const sixMonthTrend = historical.sixMonthTrend ?? trend.sixMonthTrend;
  const twelveMonthTrend = historical.twelveMonthTrend ?? trend.twelveMonthTrend;
  const trendDirection =
    historical.trendDirection ??
    pickTrendDirectionFromWindows({ threeMonthTrend, sixMonthTrend, twelveMonthTrend }) ??
    trend.trendDirection;

  const trendConfidence = Math.max(trend.trendConfidence, historical.trendConfidence);

  const displayJa = {
    ...trend.displayJa,
    threeMonthTrend: formatTrendPct(threeMonthTrend),
    sixMonthTrend: formatTrendPct(sixMonthTrend),
    twelveMonthTrend: formatTrendPct(twelveMonthTrend),
    trendDirection: trendDirection ?? trend.displayJa.trendDirection,
    trendConfidence: String(trendConfidence),
  };

  const evalParts = ['Institutional Trend'];
  if (twelveMonthTrend != null) evalParts.push(`12M ${formatTrendPct(twelveMonthTrend)}`);
  else if (sixMonthTrend != null) evalParts.push(`6M ${formatTrendPct(sixMonthTrend)}`);
  else if (threeMonthTrend != null) evalParts.push(`3M ${formatTrendPct(threeMonthTrend)}`);
  if (trendDirection) evalParts.push(trendDirection);
  evalParts.push('[Historical 3M/6M/12M]');

  return {
    ...trend,
    threeMonthTrend,
    sixMonthTrend,
    twelveMonthTrend,
    trendDirection,
    trendConfidence,
    displayJa,
    evaluationJa: evalParts.join(' · '),
  };
}
