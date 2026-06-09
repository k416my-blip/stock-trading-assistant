/**
 * Bursa Phase9 検証 — Maybank / RHB / Hong Leong / Petronas Chemicals
 * npx tsx scripts/bursa-phase9-verify.ts [--live]
 *
 * 前回スナップショット: scripts/.bursa-monitoring-snapshot.json（前回実行時に自動保存）
 */
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseBursaCompanyProfileFromHtml } from '../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../src/services/bursa/bursaDividendService';
import { formatMarketMonitoringReport } from '../src/services/bursa/bursaMarketMonitoringService';
import {
  inMemoryMonitoringStorageBackend,
  type BursaMonitoringStorageBackend,
} from '../src/services/bursa/bursaMonitoringStorage';
import {
  buildBursaPhase9Analysis,
  buildBursaPhase9FromBundles,
} from '../src/services/bursa/bursaPhase9Analysis';
import type { BursaDisclosureBundle, BursaMonitoringSnapshot } from '../src/types/bursaDisclosure';
import type { PortfolioPosition } from '../src/types';

const root = process.cwd();
const useLive = process.argv.includes('--live');
const SNAPSHOT_PATH = join(root, 'scripts/.bursa-monitoring-snapshot.json');

const VERIFY_STOCKS = [
  { code: '1155', label: 'Maybank' },
  { code: '1066', label: 'RHB' },
  { code: '5819', label: 'Hong Leong' },
  { code: '5183', label: 'Petronas Chemicals' },
];

function loadFixtureBundle(code: string): BursaDisclosureBundle | null {
  const path = join(root, `scripts/klse-sample-${code}.html`);
  if (!existsSync(path)) return null;
  const html = readFileSync(path, 'utf8');
  return {
    stockCode: code,
    profile: parseBursaCompanyProfileFromHtml(html, code),
    quarterly: parseBursaQuarterlyFromHtml(html, code),
    dividend: parseBursaDividendFromHtml(html, code),
    dataSource: 'klse_screener',
    fetchedFields: [],
    missingFields: [],
    apiNotes: [],
  };
}

function loadPreviousSnapshot(): BursaMonitoringSnapshot | null {
  if (!existsSync(SNAPSHOT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as BursaMonitoringSnapshot;
  } catch {
    return null;
  }
}

function fileBackedStorage(): BursaMonitoringStorageBackend {
  const mem = inMemoryMonitoringStorageBackend({
    snapshot: loadPreviousSnapshot(),
  });
  const originalWrite = mem.writeSnapshot.bind(mem);
  mem.writeSnapshot = async (s) => {
    await originalWrite(s);
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(s, null, 2), 'utf8');
  };
  return mem;
}

const holdings: PortfolioPosition[] = VERIFY_STOCKS.map((s) => ({
  id: `verify-${s.code}`,
  symbol: s.code,
  market: 'bursa',
  shares: 1000,
  currentPrice: null,
  companyName: s.label,
}));

async function main() {
  const storage = fileBackedStorage();
  const watchlist = VERIFY_STOCKS.map((s) => ({
    stockCode: s.code,
    companyName: s.label,
    addedAt: new Date().toISOString(),
  }));

  let phase9;

  if (useLive) {
    console.error('Fetching live KLSE data for Phase9...');
    phase9 = await buildBursaPhase9Analysis({ holdings, storage });
  } else {
    const bundles = VERIFY_STOCKS.map((s) => loadFixtureBundle(s.code)).filter(
      Boolean,
    ) as BursaDisclosureBundle[];
    if (bundles.length < 4) throw new Error(`Expected 4 bundles, got ${bundles.length}`);

    phase9 = await buildBursaPhase9FromBundles({
      bundles,
      holdings,
      watchlist,
      previousSnapshot: loadPreviousSnapshot(),
      storage,
      persistSnapshot: true,
    });
  }

  const report = formatMarketMonitoringReport(phase9);

  const output = {
    dataSource: 'KLSE Screener',
    mode: useLive ? 'live' : 'fixture (1155/1066/5819/5183)',
    previousSnapshotAt: report.previousSnapshotAtJa,
    snapshotNote: existsSync(SNAPSHOT_PATH)
      ? '前回スナップショットと比較（scripts/.bursa-monitoring-snapshot.json）'
      : '初回実行 — 次回から順位変動を検出',
    rankChanges: report.rankChanges,
    earningsChanges: report.earningsChanges,
    dividendChanges: report.dividendChanges,
    holdingsMonitor: {
      rankChanges: report.holdingsRankChanges,
      earningsChanges: report.holdingsEarningsChanges,
      dividendChanges: report.holdingsDividendChanges,
    },
    alerts: report.alerts,
    notifications: report.notifications,
    alertHistoryCount: report.alertHistory.length,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
