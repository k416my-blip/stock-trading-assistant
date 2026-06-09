/**
 * Bursa Phase10 検証 — Maybank / RHB / Hong Leong / Petronas Chemicals
 * npx tsx scripts/bursa-phase10-verify.ts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseBursaCompanyProfileFromHtml } from '../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../src/services/bursa/bursaDividendService';
import { formatConciergeNotificationReport } from '../src/services/bursa/bursaConciergeNotificationService';
import { inMemoryConciergeStorageBackend } from '../src/services/bursa/bursaConciergeNotificationStorage';
import { buildBursaPhase10FromBundles } from '../src/services/bursa/bursaPhase10Analysis';
import { inMemoryMonitoringStorageBackend } from '../src/services/bursa/bursaMonitoringStorage';
import type { BursaDisclosureBundle } from '../src/types/bursaDisclosure';
import type { PortfolioPosition } from '../src/types';

const root = process.cwd();

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

const holdings: PortfolioPosition[] = VERIFY_STOCKS.map((s) => ({
  id: `verify-${s.code}`,
  symbol: s.code,
  market: 'bursa',
  shares: 1000,
  currentPrice: null,
  companyName: s.label,
}));

async function main() {
  const bundles = VERIFY_STOCKS.map((s) => loadFixtureBundle(s.code)).filter(
    Boolean,
  ) as BursaDisclosureBundle[];
  if (bundles.length < 4) throw new Error(`Expected 4 bundles, got ${bundles.length}`);

  const phase10 = await buildBursaPhase10FromBundles({
    bundles,
    holdings,
    storage: inMemoryConciergeStorageBackend(),
    monitoringStorage: inMemoryMonitoringStorageBackend(),
    persist: false,
  });

  const report = formatConciergeNotificationReport(phase10);

  const output = {
    dataSource: 'KLSE Screener · Phase6-9 recalc',
    mode: 'fixture (1155/1066/5819/5183)',
    todayAction: report.todayActionJa,
    todayReasons: report.todayReasonsJa,
    topNotification: report.topNotification,
    unreadCount: report.unreadCount,
    holdingsNotifications: report.notifications.filter((n) => n.isHolding),
    allNotifications: report.notifications.map((n) => ({
      stock: n.stockCodeJa,
      category: n.categoryJa,
      importance: n.importanceJa,
      trigger: n.triggerKindJa,
      title: n.titleJa,
      message: n.messageJa,
      isHolding: n.isHolding,
    })),
    notificationCount: report.notifications.length,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
