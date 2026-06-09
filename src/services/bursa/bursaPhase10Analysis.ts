/**
 * Bursa Phase 10 — AIコンシェルジュ自発通知オーケストレータ
 */
import type { PortfolioPosition } from '../../types';
import type { BursaDisclosureBundle, BursaPhase10Analysis } from '../../types/bursaDisclosure';
import {
  buildConciergeNotifications,
  buildTodayAction,
  sortNotifications,
} from './bursaConciergeNotificationBuilder';
import {
  defaultConciergeStorageBackend,
  mergeConciergeNotifications,
  type ConciergeNotificationStorageBackend,
} from './bursaConciergeNotificationStorage';
import { buildBursaPhase6FromBundles } from './bursaPhase6Analysis';
import { buildBursaPhase7FromBundles } from './bursaPhase7Analysis';
import { buildBursaPhase8FromBundles } from './bursaPhase8Analysis';
import { buildBursaPhase9FromBundles } from './bursaPhase9Analysis';
import { fetchBursaDisclosureBundle } from './bursaDisclosureService';
import {
  defaultMonitoringStorageBackend,
  type BursaMonitoringStorageBackend,
} from './bursaMonitoringStorage';
import { getBursaUniverseStockCodes } from './bursaStockUniverse';

async function fetchBundles(holdings: PortfolioPosition[]): Promise<BursaDisclosureBundle[]> {
  const universeCodes = getBursaUniverseStockCodes();
  const holdingCodes = holdings
    .filter((h) => h.market === 'bursa' && (h.shares ?? 0) > 0)
    .map((h) => h.symbol.replace(/\.KL$/i, '').trim());
  const allCodes = [...new Set([...universeCodes, ...holdingCodes])];
  const bundles = await Promise.all(allCodes.map((c) => fetchBursaDisclosureBundle(c)));
  const universeBundles = bundles.filter((b) => universeCodes.includes(b.stockCode));
  return universeBundles.length > 0 ? universeBundles : bundles;
}

async function assemblePhase10(input: {
  bundles: BursaDisclosureBundle[];
  holdings: PortfolioPosition[];
  at: string;
  storage: ConciergeNotificationStorageBackend;
  monitoringStorage: BursaMonitoringStorageBackend;
  persist: boolean;
}): Promise<BursaPhase10Analysis> {
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];

  const phase6 = buildBursaPhase6FromBundles({
    bundles: input.bundles,
    holdings: input.holdings,
  });
  const phase7 = buildBursaPhase7FromBundles({
    bundles: input.bundles,
    holdings: input.holdings,
  });
  const phase8 = buildBursaPhase8FromBundles({
    bundles: input.bundles,
    holdings: input.holdings,
  });
  const phase9 = await buildBursaPhase9FromBundles({
    bundles: input.bundles,
    holdings: input.holdings,
    storage: input.monitoringStorage,
    persistSnapshot: input.persist,
  });

  fetchedFields.push('phase10.phase6', 'phase10.phase7', 'phase10.phase8', 'phase10.phase9');

  const generated = buildConciergeNotifications({
    phase7,
    phase8,
    phase9,
    at: input.at,
  });

  const existing = await input.storage.readNotifications();
  const { merged, newCount } = mergeConciergeNotifications(existing, generated);
  const sorted = sortNotifications(merged);

  if (input.persist) {
    await input.storage.writeNotifications(sorted);
  }

  const soundEnabled = await input.storage.readSoundEnabled();
  const todayAction = buildTodayAction({
    notifications: sorted,
    phase6,
    phase7,
    phase8,
    phase9,
  });

  const topNotification = sorted.find((n) => !n.isRead) ?? sorted[0] ?? null;

  if (sorted.length === 0) missingFields.push('phase10.notifications');
  else fetchedFields.push('phase10.notifications');

  return {
    notifications: sorted,
    todayAction,
    topNotification,
    soundEnabled,
    newCount,
    fetchedFields,
    missingFields,
  };
}

export async function buildBursaPhase10Analysis(input: {
  holdings?: PortfolioPosition[];
  storage?: ConciergeNotificationStorageBackend;
  monitoringStorage?: BursaMonitoringStorageBackend;
  persist?: boolean;
}): Promise<BursaPhase10Analysis> {
  const holdings = input.holdings ?? [];
  const bundles = await fetchBundles(holdings);
  return assemblePhase10({
    bundles,
    holdings,
    at: new Date().toISOString(),
    storage: input.storage ?? defaultConciergeStorageBackend(),
    monitoringStorage: input.monitoringStorage ?? defaultMonitoringStorageBackend(),
    persist: input.persist !== false,
  });
}

export async function buildBursaPhase10FromBundles(input: {
  bundles: BursaDisclosureBundle[];
  holdings?: PortfolioPosition[];
  storage?: ConciergeNotificationStorageBackend;
  monitoringStorage?: BursaMonitoringStorageBackend;
  persist?: boolean;
}): Promise<BursaPhase10Analysis> {
  return assemblePhase10({
    bundles: input.bundles,
    holdings: input.holdings ?? [],
    at: new Date().toISOString(),
    storage: input.storage ?? defaultConciergeStorageBackend(),
    monitoringStorage: input.monitoringStorage ?? defaultMonitoringStorageBackend(),
    persist: input.persist ?? false,
  });
}

export async function refreshBursaConciergeOnBoot(input: {
  holdings: PortfolioPosition[];
}): Promise<BursaPhase10Analysis> {
  return buildBursaPhase10Analysis({ holdings: input.holdings, persist: true });
}
