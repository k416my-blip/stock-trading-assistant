/**
 * Bursa Phase4 検証 — Maybank (1155)
 * npx tsx scripts/bursa-phase4-verify.ts [--live]
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseBursaCompanyProfileFromHtml } from '../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../src/services/bursa/bursaDividendService';
import { buildBursaPhase3Analysis, buildBursaPhase3FromSnapshots } from '../src/services/bursa/bursaPhase3Analysis';
import { buildBursaPhase4Analysis, buildBursaPhase4FromHtml } from '../src/services/bursa/bursaPhase4Analysis';
import { filterCompleteFyAnnual } from '../src/services/bursa/bursaTrendAnalysis';
import type { BursaDisclosureBundle, BursaPeerSnapshot } from '../src/types/bursaDisclosure';

const root = process.cwd();
const useLive = process.argv.includes('--live');

function loadBundle(): BursaDisclosureBundle {
  const html = readFileSync(join(root, 'scripts/klse-sample-1155.html'), 'utf8');
  return {
    stockCode: '1155',
    profile: parseBursaCompanyProfileFromHtml(html, '1155'),
    quarterly: parseBursaQuarterlyFromHtml(html, '1155'),
    dividend: parseBursaDividendFromHtml(html, '1155'),
    dataSource: 'klse_screener',
    fetchedFields: [],
    missingFields: [],
    apiNotes: [],
  };
}

function snapshotFromFixture(code: string): BursaPeerSnapshot | null {
  const path = join(root, `scripts/klse-sample-${code}.html`);
  if (!existsSync(path)) return null;
  const html = readFileSync(path, 'utf8');
  const profile = parseBursaCompanyProfileFromHtml(html, code);
  const quarterly = parseBursaQuarterlyFromHtml(html, code);
  const annual = filterCompleteFyAnnual(quarterly.annualRecords);
  const latestFy = annual[0] ?? null;
  return {
    stockCode: code,
    companyName: profile.companyName,
    marketCap: profile.marketCap,
    pe: profile.pe,
    dividendYieldPct: profile.dividendYieldPct,
    roePct: null,
    netProfit: latestFy?.netProfit ?? quarterly.latestQuarter?.netProfit ?? null,
    eps: latestFy?.eps ?? quarterly.latestQuarter?.eps ?? null,
    status: profile.marketCap != null ? 'ok' : 'partial',
  };
}

async function main() {
  const bundle = loadBundle();
  const stockHtml = readFileSync(join(root, 'scripts/klse-sample-1155.html'), 'utf8');

  let phase3;
  let phase4;

  if (useLive) {
    console.error('Fetching live Phase3 + Phase4 from KLSE Screener...');
    phase3 = await buildBursaPhase3Analysis(bundle);
    phase4 = await buildBursaPhase4Analysis({ bundle, phase3, negativeNewsCount: 0 });
  } else {
    const codes = ['1155', '1023', '1295', '1066', '5819'];
    const peerSnapshots = codes.map(snapshotFromFixture).filter(Boolean) as BursaPeerSnapshot[];
    phase3 = buildBursaPhase3FromSnapshots(bundle, peerSnapshots);

    const shPath = join(root, 'scripts/klse-shareholdings-1155.html');
    const frPath = join(root, 'scripts/klse-financial-report-1155-2024-12-31.html');
    phase4 = buildBursaPhase4FromHtml({
      bundle,
      phase3,
      negativeNewsCount: 0,
      stockHtml,
      shareholdingsHtml: existsSync(shPath) ? readFileSync(shPath, 'utf8') : null,
      financialReportHtml: existsSync(frPath) ? readFileSync(frPath, 'utf8') : null,
    });
  }

  const report = {
    dataSource: 'KLSE Screener (stock page + shareholdings + financial report HTML)',
    additionalCost: 'USD 0 — HTML スクレイプのみ、API キー不要',
    apiUsed: false,
    mode: useLive ? 'live' : 'fixture+offline',
    company: bundle.profile.companyName,
    majorShareholders: phase4.majorShareholders.map((s) => ({
      name: s.name,
      pct: s.holdingPct,
      asOf: s.asOfDate,
    })),
    shareholderSource: phase4.shareholderSourceNote,
    segmentRevenue: phase4.segmentRevenue,
    geographicRevenue: phase4.geographicRevenue,
    shikihoComments: phase4.comments,
    currentForecast: {
      status: phase4.currentForecastStatus,
      items: phase4.currentPeriodForecast,
      displayJa: phase4.currentForecastStatus === 'none' ? '会社予想なし' : phase4.currentPeriodForecast,
    },
    nextForecast: {
      status: phase4.nextForecastStatus,
      items: phase4.nextPeriodForecast,
      displayJa: phase4.nextForecastStatus === 'undisclosed' ? '未開示' : phase4.nextPeriodForecast,
    },
    fetchedFields: phase4.fetchedFields,
    missingFields: phase4.missingFields,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
