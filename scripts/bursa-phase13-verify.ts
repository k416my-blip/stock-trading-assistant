/**
 * Bursa Phase13 検証 — Earnings Call 解析
 * npx tsx scripts/bursa-phase13-verify.ts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseBursaCompanyProfileFromHtml } from '../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../src/services/bursa/bursaDividendService';
import { buildBursaPhase11FromBundles } from '../src/services/bursa/bursaPhase11Analysis';
import { buildEarningsCallAnalysis } from '../src/services/bursa/bursaEarningsCallService';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import type { BursaDisclosureBundle } from '../src/types/bursaDisclosure';

const root = process.cwd();

const VERIFY_STOCKS = [
  { code: '1155', label: 'Maybank' },
  { code: '1066', label: 'RHB' },
  { code: '5819', label: 'Hong Leong' },
  { code: '5183', label: 'Petronas Chemicals' },
];

function readEnvKey(...names: string[]): string {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v && v.length >= 8) return v;
  }
  return '';
}

function loadVerifyApiKeys(): AnalysisApiKeys {
  return {
    newsApiKey: readEnvKey('EXPO_PUBLIC_NEWS_API_KEY', 'NEWS_API_KEY'),
    snsApiKey: readEnvKey('EXPO_PUBLIC_X_API_BEARER', 'X_API_BEARER'),
    earningsApiKey: readEnvKey('FINNHUB_API_KEY', 'EARNINGS_API_KEY', 'EXPO_PUBLIC_EARNINGS_API_KEY'),
    redditApiKey: readEnvKey('REDDIT_API_KEY'),
    xApiKey: readEnvKey('EXPO_PUBLIC_X_API_BEARER', 'X_API_BEARER'),
  };
}

function loadFixture(code: string): { bundle: BursaDisclosureBundle; html: string } | null {
  const path = join(root, `scripts/klse-sample-${code}.html`);
  if (!existsSync(path)) return null;
  const html = readFileSync(path, 'utf8');
  return {
    html,
    bundle: {
      stockCode: code,
      profile: parseBursaCompanyProfileFromHtml(html, code),
      quarterly: parseBursaQuarterlyFromHtml(html, code),
      dividend: parseBursaDividendFromHtml(html, code),
      dataSource: 'klse_screener',
      fetchedFields: [],
      missingFields: [],
      apiNotes: [],
    },
  };
}

async function main() {
  const apiKeys = loadVerifyApiKeys();
  console.log('=== Phase13 Earnings Call Verify ===');
  console.log('earningsApiKey:', apiKeys.earningsApiKey ? 'SET' : 'NOT SET');

  const loaded = VERIFY_STOCKS.map((s) => loadFixture(s.code)).filter(Boolean) as Array<{
    bundle: BursaDisclosureBundle;
    html: string;
  }>;

  for (const { bundle, html } of loaded) {
    const ec = await buildEarningsCallAnalysis({
      stockCode: bundle.stockCode,
      companyName: bundle.profile.companyName,
      bundle,
      stockHtml: html,
      apiKeys,
      fetchLiveExternal: false,
    });
    console.log('\n---', bundle.stockCode, bundle.profile.companyName, '---');
    console.log('availability:', ec.availability, ec.availabilityLabelJa);
    console.log('evaluation:', ec.evaluationJa);
    console.log('managementTone:', ec.displayJa.managementTone);
    console.log('guidance:', ec.displayJa.guidance);
    console.log('qaWatchpoints:', ec.displayJa.qaWatchpoints);
    console.log('overallScore:', ec.overallScore);
  }

  const phase11 = await buildBursaPhase11FromBundles({
    bundles: loaded.map((l) => l.bundle),
    stockHtmlByCode: Object.fromEntries(loaded.map((l) => [l.bundle.stockCode, l.html])),
    apiKeys,
    fetchLiveExternal: false,
  });

  console.log('\n=== Phase11 + Phase13 integration ===');
  for (const stock of phase11.stocks) {
    console.log(
      stock.stockCode,
      'earningsCall:',
      stock.earningsCall?.evaluationJa ?? 'none',
      'phase13 field:',
      stock.fetchedFields.includes('phase13.earnings_call') ? 'OK' : 'MISSING',
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
