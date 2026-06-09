/**
 * Bursa Phase 9 — ランキング・決算・配当変化検出
 */
import type {
  BursaDisclosureBundle,
  BursaDividendChangeStatus,
  BursaMonitoringAlert,
  BursaMonitoringAlertKind,
  BursaMonitoringDividendChange,
  BursaMonitoringEarningsChange,
  BursaMonitoringRankChange,
  BursaMonitoringSnapshot,
  BursaPhase6RankedEntry,
} from '../../types/bursaDisclosure';
import { filterCompleteFyAnnual, buildBursaFiveYearTrend } from './bursaTrendAnalysis';

const MISSING = 'データ未取得';
const RANK_SURGE_THRESHOLD = 2;
const PROFIT_SURGE_THRESHOLD_PCT = 15;

function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function shortName(name: string | null, code: string): string {
  if (!name) return code;
  const first = name.split(/\s+/)[0] ?? name;
  return first.length > 24 ? first.slice(0, 24) : first;
}

export function buildRankChanges(input: {
  previous: BursaMonitoringSnapshot | null;
  currentRanked: BursaPhase6RankedEntry[];
  holdingCodes: Set<string>;
  watchlistCodes: Set<string>;
}): BursaMonitoringRankChange[] {
  const prevMap = new Map(
    (input.previous?.ranks ?? []).map((r) => [r.stockCode, r.rank]),
  );

  return input.currentRanked.map((r) => {
    const prev = prevMap.get(r.stockCode) ?? null;
    const curr = r.rank;
    let delta: number | null = null;
    let changeLabelJa = MISSING;

    if (prev != null && curr != null) {
      delta = prev - curr;
      if (delta === 0) {
        changeLabelJa = `${prev}位 → ${curr}位（変動なし）`;
      } else if (delta > 0) {
        changeLabelJa = `${prev}位 → ${curr}位（↑${delta}）`;
      } else {
        changeLabelJa = `${prev}位 → ${curr}位（↓${Math.abs(delta)}）`;
      }
    } else if (curr != null) {
      changeLabelJa = `— → ${curr}位`;
    }

    return {
      stockCode: r.stockCode,
      companyName: r.companyName,
      previousRank: prev,
      currentRank: curr,
      delta,
      changeLabelJa,
      isHolding: input.holdingCodes.has(r.stockCode),
      isWatchlist: input.watchlistCodes.has(r.stockCode),
    };
  });
}

export function buildEarningsChanges(input: {
  bundles: BursaDisclosureBundle[];
  holdingCodes: Set<string>;
  watchlistCodes: Set<string>;
}): BursaMonitoringEarningsChange[] {
  const out: BursaMonitoringEarningsChange[] = [];

  for (const bundle of input.bundles) {
    if (bundle.dataSource === 'none') continue;
    const code = bundle.stockCode;
    const companyName = bundle.profile.companyName;

    const annual = filterCompleteFyAnnual(bundle.quarterly.annualRecords);
    const latest = annual[0] ?? bundle.quarterly.latestQuarter;
    const previous = annual[1] ?? bundle.quarterly.quarterlyHistory[1] ?? null;

    const trend = buildBursaFiveYearTrend(bundle);
    const divLatest = trend.dividend[trend.dividend.length - 1] ?? null;
    const divPrevious = trend.dividend[trend.dividend.length - 2] ?? null;

    const latestLabel =
      latest?.financialYear != null
        ? `${latest.financialYear}${latest.quarter ? ` Q${latest.quarter}` : ''}`
        : MISSING;
    const previousLabel =
      previous?.financialYear != null
        ? `${previous.financialYear}${previous.quarter ? ` Q${previous.quarter}` : ''}`
        : MISSING;

    if (!latest && !previous) continue;

    out.push({
      stockCode: code,
      companyName,
      latestPeriodJa: latestLabel,
      previousPeriodJa: previousLabel,
      revenueLatest: latest?.revenue ?? null,
      revenuePrevious: previous?.revenue ?? null,
      revenueChangePct: pctChange(latest?.revenue ?? null, previous?.revenue ?? null),
      netProfitLatest: latest?.netProfit ?? null,
      netProfitPrevious: previous?.netProfit ?? null,
      netProfitChangePct: pctChange(latest?.netProfit ?? null, previous?.netProfit ?? null),
      epsLatest: latest?.eps ?? null,
      epsPrevious: previous?.eps ?? null,
      epsChangePct: pctChange(latest?.eps ?? null, previous?.eps ?? null),
      dividendLatest: divLatest,
      dividendPrevious: divPrevious,
      dividendChangePct: pctChange(divLatest, divPrevious),
      isHolding: input.holdingCodes.has(code),
      isWatchlist: input.watchlistCodes.has(code),
    });
  }

  return out;
}

export function buildDividendChanges(input: {
  bundles: BursaDisclosureBundle[];
  holdingCodes: Set<string>;
  watchlistCodes: Set<string>;
}): BursaMonitoringDividendChange[] {
  const out: BursaMonitoringDividendChange[] = [];

  for (const bundle of input.bundles) {
    if (bundle.dataSource === 'none') continue;
    const trend = buildBursaFiveYearTrend(bundle);
    const years = trend.years;
    const divs = trend.dividend;

    let status: BursaDividendChangeStatus | null = null;
    let reasonJa = MISSING;
    let latestYear: number | null = null;
    let previousYear: number | null = null;
    let latestAmount: number | null = null;
    let previousAmount: number | null = null;

    const paidYears: Array<{ year: number; amount: number }> = [];
    for (let i = 0; i < years.length; i++) {
      const amt = divs[i];
      if (amt != null && amt > 0) paidYears.push({ year: years[i]!, amount: amt });
    }

    if (paidYears.length >= 2) {
      const latest = paidYears[paidYears.length - 1]!;
      const previous = paidYears[paidYears.length - 2]!;
      latestYear = latest.year;
      previousYear = previous.year;
      latestAmount = latest.amount;
      previousAmount = previous.amount;

      if (latestAmount > previousAmount * 1.01) {
        status = '増配';
        reasonJa = `${previousYear}年 RM ${previousAmount.toFixed(2)} → ${latestYear}年 RM ${latestAmount.toFixed(2)}`;
      } else if (latestAmount < previousAmount * 0.99) {
        status = '減配';
        reasonJa = `${previousYear}年 RM ${previousAmount.toFixed(2)} → ${latestYear}年 RM ${latestAmount.toFixed(2)}`;
      } else {
        status = '維持';
        reasonJa = `${latestYear}年 RM ${latestAmount.toFixed(2)}（前年同水準）`;
      }
    } else if (paidYears.length === 1) {
      latestYear = paidYears[0]!.year;
      latestAmount = paidYears[0]!.amount;
      status = '維持';
      reasonJa = `${latestYear}年 RM ${latestAmount.toFixed(2)}（比較期間1年のみ）`;
    } else if (years.length >= 1) {
      latestYear = years[years.length - 1] ?? null;
      status = '無配';
      reasonJa = `${latestYear}年 配当なし（KLSE実データ）`;
    }

    out.push({
      stockCode: bundle.stockCode,
      companyName: bundle.profile.companyName,
      status,
      latestYear,
      previousYear,
      latestAmount,
      previousAmount,
      reasonJa,
      isHolding: input.holdingCodes.has(bundle.stockCode),
      isWatchlist: input.watchlistCodes.has(bundle.stockCode),
    });
  }

  return out;
}

export function buildMonitoringAlerts(input: {
  rankChanges: BursaMonitoringRankChange[];
  earningsChanges: BursaMonitoringEarningsChange[];
  dividendChanges: BursaMonitoringDividendChange[];
  at: string;
}): BursaMonitoringAlert[] {
  const alerts: BursaMonitoringAlert[] = [];
  let seq = 0;

  const push = (
    stockCode: string,
    companyName: string | null,
    kind: BursaMonitoringAlertKind,
    messageJa: string,
    isHolding: boolean,
  ) => {
    alerts.push({
      id: `${input.at}-${stockCode}-${kind}-${seq++}`,
      at: input.at,
      stockCode,
      companyName,
      kind,
      messageJa,
      isHolding,
    });
  };

  for (const r of input.rankChanges) {
    if (r.delta == null || r.previousRank == null || r.currentRank == null) continue;
    const label = shortName(r.companyName, r.stockCode);
    if (r.delta >= RANK_SURGE_THRESHOLD) {
      push(
        r.stockCode,
        r.companyName,
        '順位急上昇',
        `${label}が前回${r.previousRank}位から${r.currentRank}位へ上昇しました`,
        r.isHolding,
      );
    } else if (r.delta <= -RANK_SURGE_THRESHOLD) {
      push(
        r.stockCode,
        r.companyName,
        '順位急落',
        `${label}が前回${r.previousRank}位から${r.currentRank}位へ下落しました`,
        r.isHolding,
      );
    }
  }

  for (const d of input.dividendChanges) {
    if (!d.status || d.status === '維持' || d.status === '無配') continue;
    const label = shortName(d.companyName, d.stockCode);
    if (d.status === '増配') {
      push(
        d.stockCode,
        d.companyName,
        '増配',
        `${label}が増配を発表しました（${d.reasonJa}）`,
        d.isHolding,
      );
    } else if (d.status === '減配') {
      push(
        d.stockCode,
        d.companyName,
        '減配',
        `${label}が減配しました（${d.reasonJa}）`,
        d.isHolding,
      );
    }
  }

  for (const e of input.earningsChanges) {
    const label = shortName(e.companyName, e.stockCode);
    const pct = e.netProfitChangePct;
    if (pct != null && pct >= PROFIT_SURGE_THRESHOLD_PCT) {
      push(
        e.stockCode,
        e.companyName,
        '利益急増',
        `${label}の純利益が${pct.toFixed(1)}%増加（${e.previousPeriodJa} → ${e.latestPeriodJa}）`,
        e.isHolding,
      );
    } else if (pct != null && pct <= -PROFIT_SURGE_THRESHOLD_PCT) {
      push(
        e.stockCode,
        e.companyName,
        '利益急減',
        `${label}の純利益が${Math.abs(pct).toFixed(1)}%減少（${e.previousPeriodJa} → ${e.latestPeriodJa}）`,
        e.isHolding,
      );
    }
  }

  return alerts;
}

export function buildMonitoringSnapshot(
  ranked: BursaPhase6RankedEntry[],
  capturedAt: string,
): BursaMonitoringSnapshot {
  return {
    capturedAt,
    ranks: ranked
      .filter((r) => r.rank != null)
      .map((r) => ({
        stockCode: r.stockCode,
        companyName: r.companyName,
        rank: r.rank,
        compositeScore: r.compositeScore,
      })),
  };
}

export function buildConciergeMonitoringNotifications(
  alerts: BursaMonitoringAlert[],
): string[] {
  return alerts.map((a) => a.messageJa);
}
