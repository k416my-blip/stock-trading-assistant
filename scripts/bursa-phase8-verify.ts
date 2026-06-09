/**
 * Bursa Phase8 検証 — Maybank / RHB / Hong Leong / Petronas Chemicals
 * npx tsx scripts/bursa-phase8-verify.ts [--live]
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseBursaCompanyProfileFromHtml } from '../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../src/services/bursa/bursaDividendService';
import { formatTodayTradingReport } from '../src/services/bursa/bursaTodayTradingService';
import {
  buildBursaPhase8Analysis,
  buildBursaPhase8FromBundles,
} from '../src/services/bursa/bursaPhase8Analysis';
import { BURSA_TODAY_BUDGETS_MYR } from '../src/services/bursa/bursaStockUniverse';
import type { BursaDisclosureBundle } from '../src/types/bursaDisclosure';
import type { PortfolioPosition } from '../src/types';

const root = process.cwd();
const useLive = process.argv.includes('--live');

const VERIFY_STOCKS: Array<{ code: string; label: string }> = [
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
  let phase8;

  if (useLive) {
    console.error('Fetching live KLSE data for Phase8...');
    phase8 = await buildBursaPhase8Analysis({
      holdings,
      budgetsMYR: [...BURSA_TODAY_BUDGETS_MYR],
    });
  } else {
    const bundles = VERIFY_STOCKS.map((s) => loadFixtureBundle(s.code)).filter(
      Boolean,
    ) as BursaDisclosureBundle[];
    if (bundles.length < 4) {
      throw new Error(`Expected 4 fixture bundles, got ${bundles.length}`);
    }
    phase8 = buildBursaPhase8FromBundles({
      bundles,
      holdings,
      budgetsMYR: [...BURSA_TODAY_BUDGETS_MYR],
    });
  }

  const report = formatTodayTradingReport(phase8);

  const output = {
    dataSource: 'KLSE Screener',
    mode: useLive ? 'live' : 'fixture (1155/1066/5819/5183)',
    stocks: VERIFY_STOCKS,
    primaryAction: {
      action: report.primaryActionJa,
      reason: report.primaryReasonJa,
    },
    buyTop10: report.buyTop10,
    sellCandidates: report.sellCandidates,
    budgetPlans: BURSA_TODAY_BUDGETS_MYR.map((b) => ({
      budgetMYR: b,
      rows: report.allocations.filter((a) => a.budgetLabelJa === `RM ${b.toLocaleString('en-US')}`),
    })),
    priorityOrder: report.priorityOrder,
    notifications: report.notifications,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
