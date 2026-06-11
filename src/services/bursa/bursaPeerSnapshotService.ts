import type { BursaDisclosureBundle, BursaPeerSnapshot } from '../../types/bursaDisclosure';
import { readBursaCache, writeBursaCache } from './bursaDisclosureCache';
import { fetchKlseStockPageHtml } from './bursaKlseHtmlClient';
import { parseBursaCompanyProfileFromHtml } from './bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from './bursaQuarterlyService';
import { filterCompleteFyAnnual } from './bursaTrendAnalysis';

export async function fetchBursaPeerSnapshot(stockCode: string): Promise<BursaPeerSnapshot> {
  const cached = await readBursaCache<BursaPeerSnapshot>('peerSnapshot', stockCode);
  if (cached) return { ...cached.payload, fromCache: true };

  const fetched = await fetchKlseStockPageHtml(stockCode);
  if (!fetched) {
    return emptySnapshot(stockCode, 'failed');
  }

  const profile = parseBursaCompanyProfileFromHtml(fetched.html, stockCode);
  const quarterly = parseBursaQuarterlyFromHtml(fetched.html, stockCode);
  const annual = filterCompleteFyAnnual(quarterly.annualRecords);
  const latestFy = annual[0] ?? null;

  let roePct: number | null = null;
  for (const q of quarterly.quarterlyHistory ?? []) {
    if (q.quarter === '4' && q.roePct != null) {
      roePct = q.roePct;
      break;
    }
  }
  if (roePct == null) {
    const withRoe = (quarterly.quarterlyHistory ?? []).find((q) => q.roePct != null);
    roePct = withRoe?.roePct ?? null;
  }

  const snap: BursaPeerSnapshot = {
    stockCode,
    companyName: profile.companyName,
    marketCap: profile.marketCap,
    pe: profile.pe,
    dividendYieldPct: profile.dividendYieldPct,
    roePct,
    revenue: latestFy?.revenue ?? quarterly.latestQuarter?.revenue ?? null,
    netProfit: latestFy?.netProfit ?? quarterly.latestQuarter?.netProfit ?? null,
    eps: latestFy?.eps ?? quarterly.latestQuarter?.eps ?? null,
    status: profile.companyName != null && profile.marketCap != null ? 'ok' : 'partial',
    fromCache: false,
  };

  if (snap.status !== 'failed') {
    await writeBursaCache('peerSnapshot', stockCode, snap);
  }
  return snap;
}

/** Disclosure bundle から同業スナップショットを生成（Phase6 一括ランキング用） */
export function peerSnapshotFromBundle(bundle: BursaDisclosureBundle): BursaPeerSnapshot {
  const { profile, quarterly, stockCode } = bundle;
  const annual = filterCompleteFyAnnual(quarterly.annualRecords);
  const latestFy = annual[0] ?? null;

  let roePct: number | null = null;
  for (const q of quarterly.quarterlyHistory ?? []) {
    if (q.quarter === '4' && q.roePct != null) {
      roePct = q.roePct;
      break;
    }
  }
  if (roePct == null) {
    roePct = (quarterly.quarterlyHistory ?? []).find((q) => q.roePct != null)?.roePct ?? null;
  }

  const status: BursaPeerSnapshot['status'] =
    bundle.dataSource === 'none'
      ? 'failed'
      : profile.companyName != null && profile.marketCap != null
        ? 'ok'
        : 'partial';

  return {
    stockCode,
    companyName: profile.companyName,
    marketCap: profile.marketCap,
    pe: profile.pe,
    dividendYieldPct: profile.dividendYieldPct,
    roePct,
    revenue: latestFy?.revenue ?? quarterly.latestQuarter?.revenue ?? null,
    netProfit: latestFy?.netProfit ?? quarterly.latestQuarter?.netProfit ?? null,
    eps: latestFy?.eps ?? quarterly.latestQuarter?.eps ?? null,
    status,
    fromCache: false,
  };
}

function emptySnapshot(stockCode: string, status: BursaPeerSnapshot['status']): BursaPeerSnapshot {
  return {
    stockCode,
    companyName: null,
    marketCap: null,
    pe: null,
    dividendYieldPct: null,
    roePct: null,
    revenue: null,
    netProfit: null,
    eps: null,
    status,
    fromCache: false,
  };
}

export async function fetchSectorPeerSnapshots(
  peerCodes: string[],
  targetCode: string,
): Promise<BursaPeerSnapshot[]> {
  const ordered = [targetCode, ...peerCodes.filter((c) => c !== targetCode)];
  const unique = [...new Set(ordered)];
  const results: BursaPeerSnapshot[] = [];
  for (const code of unique) {
    results.push(await fetchBursaPeerSnapshot(code));
  }
  return results;
}
