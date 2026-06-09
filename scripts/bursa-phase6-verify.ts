/**
 * Bursa Phase6 検証
 * npx tsx scripts/bursa-phase6-verify.ts [--live]
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseBursaCompanyProfileFromHtml } from '../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../src/services/bursa/bursaDividendService';
import { buildBursaPhase6Analysis, buildBursaPhase6FromBundles } from '../src/services/bursa/bursaPhase6Analysis';
import { getBursaUniverseStockCodes } from '../src/services/bursa/bursaStockUniverse';
import type { BursaDisclosureBundle } from '../src/types/bursaDisclosure';

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

async function main() {
  let phase6;

  if (useLive) {
    console.error('Fetching live KLSE data for Bursa universe...');
    phase6 = await buildBursaPhase6Analysis({ holdings: [] });
  } else {
    const fixtureCodes = getBursaUniverseStockCodes().filter((c) =>
      existsSync(join(root, `scripts/klse-sample-${c}.html`)),
    );
    const bundles = fixtureCodes.map(loadFixtureBundle).filter(Boolean) as BursaDisclosureBundle[];
    if (bundles.length === 0) {
      const fallback = ['1155', '1066', '5819', '5183']
        .map(loadFixtureBundle)
        .filter(Boolean) as BursaDisclosureBundle[];
      phase6 = buildBursaPhase6FromBundles({ bundles: fallback });
    } else {
      phase6 = buildBursaPhase6FromBundles({ bundles });
    }
  }

  const report = {
    dataSource: 'KLSE Screener (sector universe)',
    additionalCost: 'USD 0 — HTML スクレイプのみ',
    apiUsed: false,
    mode: useLive ? 'live' : 'fixture+offline',
    universeSize: phase6.universeSize,
    scoredCount: phase6.scoredCount,
    top10: phase6.rankedTop100.slice(0, 10).map((r) => ({
      rank: r.rank,
      code: r.stockCode,
      name: r.companyName,
      score: r.compositeScore,
      growth: r.growth,
      profitability: r.profitability,
      stability: r.stability,
      value: r.value,
      dividend: r.dividendAppeal,
      competitive: r.competitiveAdvantage,
    })),
    styleCounts: {
      dividend: phase6.styleRankings.dividend.length,
      growth: phase6.styleRankings.growth.length,
      value: phase6.styleRankings.value.length,
      stability: phase6.styleRankings.stability.length,
      beginner: phase6.styleRankings.beginner.length,
    },
    portfolioSuggestions: phase6.portfolioSuggestions.map((p) => ({
      budget: p.budgetMYR,
      rows: p.rows.map((r) => ({
        code: r.stockCode,
        name: r.companyName,
        allocationMYR: r.allocationMYR,
        pct: r.allocationPct,
        shares: r.sharesApprox,
      })),
    })),
    replacementCount: phase6.replacementSuggestions.length,
    fetchedFields: phase6.fetchedFields.length,
    missingFields: phase6.missingFields.length,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
