/**
 * Bursa Phase 9 — 市場監視オーケストレータ
 */
import type { PortfolioPosition } from '../../types';
import type {
  BursaAlertHistoryEntry,
  BursaDisclosureBundle,
  BursaMonitoringSnapshot,
  BursaPhase9Analysis,
  BursaWatchlistEntry,
} from '../../types/bursaDisclosure';
import { fetchBursaDisclosureBundle } from './bursaDisclosureService';
import {
  buildConciergeMonitoringNotifications,
  buildDividendChanges,
  buildEarningsChanges,
  buildMonitoringAlerts,
  buildMonitoringSnapshot,
  buildRankChanges,
} from './bursaMonitoringDetectors';
import {
  type BursaMonitoringStorageBackend,
  defaultMonitoringStorageBackend,
} from './bursaMonitoringStorage';
import { buildBursaPhase6FromBundles } from './bursaPhase6Analysis';
import { getBursaUniverseStockCodes } from './bursaStockUniverse';

function normalizeCode(symbol: string): string {
  return symbol.replace(/\.KL$/i, '').trim();
}

function holdingCodes(holdings: PortfolioPosition[]): Set<string> {
  return new Set(
    holdings
      .filter((h) => h.market === 'bursa' && (h.shares ?? 0) > 0)
      .map((h) => normalizeCode(h.symbol)),
  );
}

function watchlistCodes(watchlist: BursaWatchlistEntry[]): Set<string> {
  return new Set(watchlist.map((w) => normalizeCode(w.stockCode)));
}

function filterHoldings<T extends { stockCode: string; isHolding: boolean }>(rows: T[]): T[] {
  return rows.filter((r) => r.isHolding);
}

function assemblePhase9(input: {
  bundles: BursaDisclosureBundle[];
  holdings: PortfolioPosition[];
  watchlist: BursaWatchlistEntry[];
  previousSnapshot: BursaMonitoringSnapshot | null;
  alertHistory: BursaAlertHistoryEntry[];
  capturedAt: string;
  persistSnapshot: boolean;
  storage: BursaMonitoringStorageBackend;
}): Promise<BursaPhase9Analysis> {
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];
  const held = holdingCodes(input.holdings);
  const watched = watchlistCodes(input.watchlist);

  const phase6 = buildBursaPhase6FromBundles({
    bundles: input.bundles,
    holdings: input.holdings,
  });
  fetchedFields.push('phase9.ranking');

  const rankChanges = buildRankChanges({
    previous: input.previousSnapshot,
    currentRanked: phase6.rankedTop100,
    holdingCodes: held,
    watchlistCodes: watched,
  });

  if (input.previousSnapshot) fetchedFields.push('phase9.rankChanges');
  else missingFields.push('phase9.rankChanges.previousSnapshot');

  const earningsChanges = buildEarningsChanges({
    bundles: input.bundles,
    holdingCodes: held,
    watchlistCodes: watched,
  });
  if (earningsChanges.length > 0) fetchedFields.push('phase9.earningsChanges');
  else missingFields.push('phase9.earningsChanges');

  const dividendChanges = buildDividendChanges({
    bundles: input.bundles,
    holdingCodes: held,
    watchlistCodes: watched,
  });
  if (dividendChanges.some((d) => d.status != null)) fetchedFields.push('phase9.dividendChanges');
  else missingFields.push('phase9.dividendChanges');

  const alerts = buildMonitoringAlerts({
    rankChanges,
    earningsChanges,
    dividendChanges,
    at: input.capturedAt,
  });

  const notifications = buildConciergeMonitoringNotifications(alerts);

  const newHistoryEntries: BursaAlertHistoryEntry[] = alerts.map((a) => ({
    id: a.id,
    at: a.at,
    stockCode: a.stockCode,
    companyName: a.companyName,
    kind: a.kind,
    messageJa: a.messageJa,
  }));

  const snapshot = buildMonitoringSnapshot(phase6.rankedTop100, input.capturedAt);

  return (async () => {
    let alertHistory = input.alertHistory;
    if (newHistoryEntries.length > 0) {
      alertHistory = await input.storage.appendAlertHistory(newHistoryEntries);
    }
    if (input.persistSnapshot) {
      await input.storage.writeSnapshot(snapshot);
    }

    return {
      rankChanges,
      earningsChanges,
      dividendChanges,
      holdingsMonitor: {
        rankChanges: filterHoldings(rankChanges),
        earningsChanges: filterHoldings(earningsChanges),
        dividendChanges: filterHoldings(dividendChanges),
      },
      watchlist: input.watchlist,
      alerts,
      alertHistory,
      notifications,
      snapshotCapturedAt: snapshot.capturedAt,
      previousSnapshotAt: input.previousSnapshot?.capturedAt ?? null,
      fetchedFields,
      missingFields,
    };
  })();
}

export async function buildBursaPhase9Analysis(input: {
  holdings?: PortfolioPosition[];
  storage?: BursaMonitoringStorageBackend;
  persistSnapshot?: boolean;
}): Promise<BursaPhase9Analysis> {
  const storage = input.storage ?? defaultMonitoringStorageBackend();
  const holdings = input.holdings ?? [];
  const capturedAt = new Date().toISOString();

  const [previousSnapshot, watchlist, alertHistory] = await Promise.all([
    storage.readSnapshot(),
    storage.readWatchlist(),
    storage.readAlertHistory(),
  ]);

  const universeCodes = getBursaUniverseStockCodes();
  const holdingCodeList = [...holdingCodes(holdings)];
  const watchCodeList = [...watchlistCodes(watchlist)];
  const monitorCodes = [...new Set([...universeCodes, ...holdingCodeList, ...watchCodeList])];

  const bundles = await Promise.all(monitorCodes.map((c) => fetchBursaDisclosureBundle(c)));
  const universeBundles = bundles.filter((b) => universeCodes.includes(b.stockCode));
  const useBundles = universeBundles.length > 0 ? universeBundles : bundles;

  return assemblePhase9({
    bundles: useBundles,
    holdings,
    watchlist,
    previousSnapshot,
    alertHistory,
    capturedAt,
    persistSnapshot: input.persistSnapshot !== false,
    storage,
  });
}

export function buildBursaPhase9FromBundles(input: {
  bundles: BursaDisclosureBundle[];
  holdings?: PortfolioPosition[];
  watchlist?: BursaWatchlistEntry[];
  previousSnapshot?: BursaMonitoringSnapshot | null;
  alertHistory?: BursaAlertHistoryEntry[];
  storage?: BursaMonitoringStorageBackend;
  persistSnapshot?: boolean;
}): Promise<BursaPhase9Analysis> {
  const storage = input.storage ?? defaultMonitoringStorageBackend();
  const capturedAt = new Date().toISOString();

  return assemblePhase9({
    bundles: input.bundles,
    holdings: input.holdings ?? [],
    watchlist: input.watchlist ?? [],
    previousSnapshot: input.previousSnapshot ?? null,
    alertHistory: input.alertHistory ?? [],
    capturedAt,
    persistSnapshot: input.persistSnapshot ?? false,
    storage,
  });
}
