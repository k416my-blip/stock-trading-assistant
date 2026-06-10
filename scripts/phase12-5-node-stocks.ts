/**
 * Phase12.5 — 6銘柄 Node 側材料分析検証
 * npx tsx scripts/phase12-5-node-stocks.ts
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseBursaCompanyProfileFromHtml } from '../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../src/services/bursa/bursaDividendService';
import { buildBursaPhase11FromBundles } from '../src/services/bursa/bursaPhase11Analysis';
import type { BursaDisclosureBundle } from '../src/types/bursaDisclosure';
import type { PortfolioPosition } from '../src/types';

const STOCKS = [
  { code: '1155', label: 'Maybank' },
  { code: '1023', label: 'CIMB' },
  { code: '1295', label: 'Public Bank' },
  { code: '5347', label: 'Tenaga' },
  { code: '4707', label: 'Nestle' },
  { code: '6033', label: 'Petronas Gas' },
];

const OUT = join(process.cwd(), 'docs/review/phase12-5-long-run');

function loadBundle(code: string): BursaDisclosureBundle | null {
  const path = join(process.cwd(), `scripts/klse-sample-${code}.html`);
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
  mkdirSync(OUT, { recursive: true });
  const bundles: BursaDisclosureBundle[] = [];
  const stockHtmlByCode: Record<string, string> = {};
  const rows: Array<{ code: string; label: string; ok: boolean; reason: string }> = [];

  for (const s of STOCKS) {
    const b = loadBundle(s.code);
    if (!b) {
      rows.push({ code: s.code, label: s.label, ok: false, reason: 'fixture missing' });
      continue;
    }
    bundles.push(b);
    stockHtmlByCode[s.code] = readFileSync(join(process.cwd(), `scripts/klse-sample-${s.code}.html`), 'utf8');
  }

  if (bundles.length > 0) {
    const holdings: PortfolioPosition[] = bundles.map((b) => ({
      id: `p125-${b.stockCode}`,
      symbol: b.stockCode,
      market: 'bursa',
      currency: 'MYR',
      shares: 100,
      averageBuyPrice: 1,
      currentPrice: 1,
      priceSource: 'api',
      priceFetchStatus: 'ok',
      openedAt: new Date().toISOString(),
    }));
    const result = await buildBursaPhase11FromBundles({
      bundles,
      holdings,
      stockHtmlByCode,
      apiKeys: { newsApiKey: '', snsApiKey: '', earningsApiKey: '', redditApiKey: '', xApiKey: '' },
      fetchLiveExternal: false,
    });
    for (const s of STOCKS) {
      const stock = result.stocks.find((r) => r.stockCode === s.code);
      if (stock && !stock.missingFields.includes('phase11.materials')) {
        rows.push({ code: s.code, label: s.label, ok: true, reason: 'phase11 ok' });
      } else if (!rows.find((r) => r.code === s.code)) {
        rows.push({
          code: s.code,
          label: s.label,
          ok: false,
          reason: stock ? 'materials missing' : 'not in result',
        });
      }
    }
  }

  for (const s of STOCKS) {
    if (!rows.find((r) => r.code === s.code)) {
      rows.push({ code: s.code, label: s.label, ok: false, reason: 'fixture missing' });
    }
  }

  const payload = { at: new Date().toISOString(), rows, allOk: rows.every((r) => r.ok) };
  writeFileSync(join(OUT, 'node-stocks.json'), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
  process.exit(payload.allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
