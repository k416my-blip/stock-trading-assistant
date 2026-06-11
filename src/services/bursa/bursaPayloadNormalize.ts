/**
 * Bursa キャッシュ / 復元ペイロードの正規化（undefined spread 防止）
 */
import type {
  BursaCompanyProfile,
  BursaDisclosureBundle,
  BursaDividendBundle,
  BursaDividendRecord,
  BursaMonitoringSnapshot,
  BursaQuarterlyBundle,
  BursaQuarterlyRecord,
} from '../../types/bursaDisclosure';

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export function asRecordArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeCompanyProfile(
  raw: Partial<BursaCompanyProfile> | null | undefined,
  stockCode: string,
): BursaCompanyProfile {
  const base = raw ?? {};
  return {
    stockCode: base.stockCode ?? stockCode,
    companyName: base.companyName ?? null,
    companyOverview: base.companyOverview ?? null,
    sector: base.sector ?? null,
    subSector: base.subSector ?? null,
    marketCap: base.marketCap ?? null,
    marketCapCurrency: 'MYR',
    sharesOutstanding: base.sharesOutstanding ?? null,
    pe: base.pe ?? null,
    eps: base.eps ?? null,
    dividendYieldPct: base.dividendYieldPct ?? null,
    fetchedFields: asStringArray(base.fetchedFields),
    missingFields: asStringArray(base.missingFields),
    status: base.status ?? 'failed',
    source: base.source ?? 'none',
    fetchedAt: base.fetchedAt ?? new Date(0).toISOString(),
  };
}

export function normalizeQuarterlyBundle(
  raw: Partial<BursaQuarterlyBundle> | null | undefined,
  stockCode: string,
): BursaQuarterlyBundle {
  const base = raw ?? {};
  return {
    stockCode: base.stockCode ?? stockCode,
    latestQuarter: base.latestQuarter ?? null,
    quarterlyHistory: asRecordArray<BursaQuarterlyRecord>(base.quarterlyHistory),
    annualRecords: asRecordArray<BursaQuarterlyRecord>(base.annualRecords),
    fetchedFields: asStringArray(base.fetchedFields),
    missingFields: asStringArray(base.missingFields),
    status: base.status ?? 'failed',
    source: base.source ?? 'none',
    fetchedAt: base.fetchedAt ?? new Date(0).toISOString(),
  };
}

export function normalizeDividendBundle(
  raw: Partial<BursaDividendBundle> | null | undefined,
  stockCode: string,
): BursaDividendBundle {
  const base = raw ?? {};
  return {
    stockCode: base.stockCode ?? stockCode,
    history: asRecordArray<BursaDividendRecord>(base.history),
    fetchedFields: asStringArray(base.fetchedFields),
    missingFields: asStringArray(base.missingFields),
    status: base.status ?? 'failed',
    source: base.source ?? 'none',
    fetchedAt: base.fetchedAt ?? new Date(0).toISOString(),
  };
}

export function normalizeDisclosureBundle(bundle: BursaDisclosureBundle): BursaDisclosureBundle {
  const stockCode = bundle.stockCode;
  const profile = normalizeCompanyProfile(bundle.profile, stockCode);
  const quarterly = normalizeQuarterlyBundle(bundle.quarterly, stockCode);
  const dividend = normalizeDividendBundle(bundle.dividend, stockCode);
  return {
    stockCode,
    profile,
    quarterly,
    dividend,
    dataSource: bundle.dataSource ?? 'none',
    fetchedFields: asStringArray(bundle.fetchedFields),
    missingFields: asStringArray(bundle.missingFields),
    apiNotes: asStringArray(bundle.apiNotes),
  };
}

export function normalizeMonitoringSnapshot(
  raw: unknown,
): BursaMonitoringSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<BursaMonitoringSnapshot>;
  if (!s.capturedAt || !Array.isArray(s.ranks)) return null;
  return {
    capturedAt: s.capturedAt,
    ranks: s.ranks.filter(
      (r) => r && typeof r.stockCode === 'string' && typeof r.rank === 'number',
    ),
  };
}
