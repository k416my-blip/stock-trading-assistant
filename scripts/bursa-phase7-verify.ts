/**
 * Bursa Phase7 検証
 * npx tsx scripts/bursa-phase7-verify.ts [--live]
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseBursaCompanyProfileFromHtml } from '../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../src/services/bursa/bursaDividendService';
import { formatAssetManagementReport } from '../src/services/bursa/bursaAssetManagementService';
import {
  buildBursaPhase7Analysis,
  buildBursaPhase7FromBundles,
} from '../src/services/bursa/bursaPhase7Analysis';
import { getBursaUniverseStockCodes } from '../src/services/bursa/bursaStockUniverse';
import type { BursaDisclosureBundle } from '../src/types/bursaDisclosure';
import type { PortfolioPosition } from '../src/types';

const root = process.cwd();
const useLive = process.argv.includes('--live');

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

const sampleHoldings: PortfolioPosition[] = [
  {
    id: 'verify-maybank',
    symbol: '1155',
    market: 'bursa',
    shares: 1000,
    currentPrice: 10.5,
    companyName: 'Malayan Banking Berhad',
  },
];

async function main() {
  let phase7;

  if (useLive) {
    console.error('Fetching live KLSE data for Phase7...');
    phase7 = await buildBursaPhase7Analysis({ holdings: sampleHoldings });
  } else {
    const fixtureCodes = getBursaUniverseStockCodes().filter((c) =>
      existsSync(join(root, `scripts/klse-sample-${c}.html`)),
    );
    let bundles = fixtureCodes.map(loadFixtureBundle).filter(Boolean) as BursaDisclosureBundle[];
    if (bundles.length === 0) {
      bundles = ['1155', '1066', '5819', '5183']
        .map(loadFixtureBundle)
        .filter(Boolean) as BursaDisclosureBundle[];
    }
    phase7 = buildBursaPhase7FromBundles({ bundles, holdings: sampleHoldings });
  }

  const report = formatAssetManagementReport(phase7);

  const output = {
    dataSource: 'KLSE Screener',
    additionalCost: 'USD 0 — HTML スクレイプのみ',
    apiUsed: false,
    mode: useLive ? 'live' : 'fixture+offline',
    investorType: report.investorTypeJa,
    portfolioHealthScore: report.portfolioHealthScoreJa,
    holdings: report.holdings,
    addPosition: report.addPosition,
    takeProfit: report.takeProfit,
    stopLossWarnings: report.stopLoss.filter((s) => s.hasWarning),
    reconstructionCount: report.reconstruction.length,
    fetchedFields: phase7.fetchedFields.length,
    missingFields: phase7.missingFields,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
