/**
 * Phase16.5 — Institutional Trend 集計（スナップショット時系列）
 */
import type { TrendDirection } from '../../types/bursaInstitutionalTrend';
import { INSTITUTIONAL_TREND_FIELD_MISSING_JA } from '../../types/bursaInstitutionalTrend';
import type { ParsedInstitutionalSnapshot } from './bursaInstitutionalOwnershipParser';

export type InstitutionalAggregatePoint = {
  date: string;
  totalHoldingPercent: number;
  institutionCount: number;
};

function snapshotDate(s: ParsedInstitutionalSnapshot): string | null {
  return s.transactionDate ?? s.announcedDate ?? null;
}

function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** 機関投資家の Direct % 合計を日付ごとに集計（推測なし・実データのみ） */
export function buildInstitutionalAggregateSeries(
  snapshots: ParsedInstitutionalSnapshot[],
): InstitutionalAggregatePoint[] {
  const withPct = snapshots.filter((s) => s.directPct != null && snapshotDate(s));
  if (withPct.length === 0) return [];

  const byInst = new Map<string, ParsedInstitutionalSnapshot[]>();
  for (const snap of withPct) {
    const list = byInst.get(snap.name) ?? [];
    list.push(snap);
    byInst.set(snap.name, list);
  }

  const allDates = new Set<string>();
  for (const snap of withPct) {
    const d = snapshotDate(snap);
    if (d) allDates.add(d);
  }

  const sortedDates = [...allDates].sort((a, b) => b.localeCompare(a));
  const points: InstitutionalAggregatePoint[] = [];

  for (const date of sortedDates) {
    const cutoff = parseIsoDate(date);
    let total = 0;
    let count = 0;

    for (const snaps of byInst.values()) {
      const sorted = [...snaps].sort((a, b) =>
        (snapshotDate(b) ?? '').localeCompare(snapshotDate(a) ?? ''),
      );
      const latest = sorted.find((s) => {
        const d = snapshotDate(s);
        if (!d) return false;
        return parseIsoDate(d).getTime() <= cutoff.getTime();
      });
      if (latest?.directPct != null) {
        total += latest.directPct;
        count += 1;
      }
    }

    if (count > 0) {
      points.push({ date, totalHoldingPercent: total, institutionCount: count });
    }
  }

  return points.sort((a, b) => b.date.localeCompare(a.date));
}

export function relativeChangePercent(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function classifyTrendDirection(changePercent: number | null): TrendDirection | null {
  if (changePercent == null || !Number.isFinite(changePercent)) return null;
  if (changePercent > 10) return 'Strong Accumulation';
  if (changePercent > 3) return 'Accumulation';
  if (changePercent < -10) return 'Strong Distribution';
  if (changePercent < -3) return 'Distribution';
  return 'Neutral';
}

export function findAggregatePctNearDate(
  series: InstitutionalAggregatePoint[],
  targetDate: Date,
  slackDays = 45,
): number | null {
  if (series.length === 0) return null;

  const targetMs = targetDate.getTime();
  let best: InstitutionalAggregatePoint | null = null;
  let bestDist = Infinity;

  for (const point of series) {
    const ms = parseIsoDate(point.date).getTime();
    const dist = Math.abs(ms - targetMs);
    if (dist <= slackDays * 86_400_000 && dist < bestDist) {
      bestDist = dist;
      best = point;
    }
  }

  return best?.totalHoldingPercent ?? null;
}

export function formatTrendPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return INSTITUTIONAL_TREND_FIELD_MISSING_JA;
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}
