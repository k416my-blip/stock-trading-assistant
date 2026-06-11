import { writeFileSync } from 'fs';
import { join } from 'path';
import { fetchHttpWithRetry } from '../src/services/quoteProviders/providerFetchUtil';

async function main() {
  const code = '1155';
  const date = '2024-12-31';
  const url = `https://www.klsescreener.com/v2/stock/financial-report/${code}/${date}`;

  const { bodyText } = await fetchHttpWithRetry(url, {
    timeoutMs: 20000,
    logLabel: 'probe_fr',
    symbol: code,
  });

  const out = join(process.cwd(), `scripts/klse-financial-report-${code}-${date}.html`);
  writeFileSync(out, bodyText, 'utf8');
  console.log('saved', out, 'len', bodyText.length);

  for (const k of [
    'Substantial Shareholders',
    'Segment Reporting',
    'Geographical',
    'Business Review',
    'Management Discussion',
    'guidance',
    'forecast',
    'Malaysia',
    'Singapore',
    'Indonesia',
    'Thailand',
  ]) {
    const i = bodyText.toLowerCase().indexOf(k.toLowerCase());
    console.log(k, i >= 0 ? i : 'NOT FOUND');
  }
}

main().catch(console.error);
