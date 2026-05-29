import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

const cwd = process.cwd();
loadEnvFile(path.join(cwd, '.env'));
loadEnvFile(path.join(cwd, '.env.local'));

const apiKey = (process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY ?? process.env.TWELVE_DATA_API_KEY ?? '').trim();
if (!apiKey) {
  console.error('No Twelve Data API key in .env');
  process.exit(1);
}

const QUERIES = [
  '0820EA.KL',
  '0820EA',
  '0820EA:KLSE',
  '0820EA Bursa Malaysia',
  'AHAM Shariah KLCI ETF',
];

function pickRow(item) {
  return {
    symbol: item.symbol ?? item.ticker ?? '',
    exchange: item.exchange ?? item.mic_code ?? '',
    instrument_name: item.instrument_name ?? item.name ?? item.description ?? '',
    isActive: item.isActive ?? item.is_active ?? item.active ?? '',
  };
}

async function symbolSearch(query) {
  const url = new URL('https://api.twelvedata.com/symbol_search');
  url.searchParams.set('symbol', query);
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('outputsize', '120');
  const res = await fetch(url.toString());
  const json = await res.json();
  const data = Array.isArray(json.data) ? json.data : [];
  return { httpStatus: res.status, query, count: data.length, rows: data.map(pickRow), error: json.message ?? json.status };
}

console.log('# Twelve Data symbol_search — 0820EA investigation\n');
console.log('| query | http | matches |');
console.log('|-------|------|---------|');

const allRows = [];
for (const q of QUERIES) {
  const result = await symbolSearch(q);
  console.log(`| ${q} | ${result.httpStatus} | ${result.count} |`);
  if (result.error && result.count === 0) {
    console.log(`  error: ${String(result.error).slice(0, 100)}`);
  }
  for (const row of result.rows) {
    allRows.push({ ...row, searchQuery: q });
  }
  await new Promise((r) => setTimeout(r, 400));
}

// Dedupe by symbol+exchange+name
const seen = new Set();
const unique = [];
for (const r of allRows) {
  const key = `${r.symbol}|${r.exchange}|${r.instrument_name}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(r);
}

// Filter Malaysia / 0820 / AHAM relevance
const relevant = unique.filter((r) => {
  const blob = `${r.symbol} ${r.exchange} ${r.instrument_name}`.toUpperCase();
  return (
    blob.includes('0820') ||
    blob.includes('AHAM') ||
    blob.includes('SHARIAH') ||
    blob.includes('KLCI') ||
    blob.includes('BURSA') ||
    blob.includes('MALAYSIA') ||
    blob.includes('XKLS') ||
    blob.includes('KLSE')
  );
});

console.log('\n## All matches (deduped)\n');
console.log('| searchQuery | symbol | exchange | instrument_name | isActive |');
console.log('|-------------|--------|----------|-----------------|----------|');
for (const r of unique) {
  console.log(`| ${r.searchQuery} | ${r.symbol} | ${r.exchange} | ${r.instrument_name} | ${r.isActive} |`);
}

console.log('\n## Likely relevant (0820EA / AHAM / Bursa)\n');
if (relevant.length === 0) {
  console.log('(no rows matched relevance filter — see full list above)');
} else {
  console.log('| symbol | exchange | instrument_name | isActive | foundVia |');
  console.log('|--------|----------|-----------------|----------|----------|');
  for (const r of relevant) {
    console.log(`| ${r.symbol} | ${r.exchange} | ${r.instrument_name} | ${r.isActive} | ${r.searchQuery} |`);
  }
}

// Extra: direct time_series probe on top candidates
const probeSymbols = [
  ...new Set(
    relevant
      .filter((r) => String(r.symbol).includes('0820') || String(r.instrument_name).toUpperCase().includes('0820'))
      .map((r) => ({ symbol: r.symbol, exchange: r.exchange })),
  ),
];
if (probeSymbols.length > 0) {
  console.log('\n## time_series probe (1day, outputsize=5)\n');
  for (const { symbol, exchange } of probeSymbols.slice(0, 8)) {
    const url = new URL('https://api.twelvedata.com/time_series');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', '1day');
    url.searchParams.set('outputsize', '5');
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('order', 'ASC');
    if (exchange) url.searchParams.set('exchange', exchange);
    const res = await fetch(url.toString());
    const json = await res.json();
    const bars = Array.isArray(json.values) ? json.values.length : 0;
    console.log(`- ${symbol} @ ${exchange || '(default)'} → HTTP ${res.status}, bars=${bars}, msg=${String(json.message ?? '').slice(0, 60)}`);
    await new Promise((r) => setTimeout(r, 400));
  }
}
