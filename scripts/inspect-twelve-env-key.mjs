import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function maskKey(key) {
  if (!key) return '(empty)';
  if (key.length <= 16) return `${key.slice(0, 4)}…${key.slice(-4)} (len=${key.length})`;
  return `${key.slice(0, 8)}…${key.slice(-8)} (len=${key.length})`;
}

function maskUrl(url) {
  return url.replace(/apikey=[^&]+/i, 'apikey=***MASKED***');
}

const cwd = process.cwd();
const envPath = path.join(cwd, '.env');
const envLocalPath = path.join(cwd, '.env.local');

console.log('=== .env file paths ===');
console.log('.env exists', fs.existsSync(envPath));
console.log('.env.local exists', fs.existsSync(envLocalPath));

// Fresh process.env snapshot before load
const beforeExpo = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY;
const beforeTwelve = process.env.TWELVE_DATA_API_KEY;

loadEnvFile(envPath);
loadEnvFile(envLocalPath);

const fromExpoPublic = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY ?? '';
const fromTwelve = process.env.TWELVE_DATA_API_KEY ?? '';
const resolved = fromExpoPublic || fromTwelve;

console.log('\n=== process.env (before explicit .env load in this script) ===');
console.log('EXPO_PUBLIC_TWELVE_DATA_API_KEY (pre-load)', beforeExpo == null ? 'undefined' : `len=${String(beforeExpo).length}`);
console.log('TWELVE_DATA_API_KEY (pre-load)', beforeTwelve == null ? 'undefined' : `len=${String(beforeTwelve).length}`);

console.log('\n=== after loadEnvFile(.env + .env.local) ===');
console.log('source', fromExpoPublic ? 'EXPO_PUBLIC_TWELVE_DATA_API_KEY' : fromTwelve ? 'TWELVE_DATA_API_KEY' : 'none');
console.log('keyLength', resolved.length);
console.log('head8', resolved ? resolved.slice(0, 8) : '(empty)');
console.log('tail8', resolved ? resolved.slice(-8) : '(empty)');
console.log('masked', maskKey(resolved));

// Check for whitespace / BOM issues
if (resolved) {
  console.log('hasLeadingSpace', resolved !== resolved.trimStart());
  console.log('hasTrailingSpace', resolved !== resolved.trimEnd());
  console.log('hasNewline', /[\r\n]/.test(resolved));
  console.log('charCodesHead', [...resolved.slice(0, 3)].map((c) => c.charCodeAt(0)).join(','));
}

// Same resolution as marketDataApiKey.ts readTwelveDataKeyFromEnv
console.log('\n=== marketDataApiKey read order ===');
const ENV_KEY_NAMES = ['EXPO_PUBLIC_TWELVE_DATA_API_KEY', 'TWELVE_DATA_API_KEY'];
let marketDataResolved = '';
for (const name of ENV_KEY_NAMES) {
  const v = process.env[name];
  if (typeof v === 'string' && v.trim().length > 8) {
    marketDataResolved = v.trim();
    console.log('picked', name, 'len', marketDataResolved.length);
    break;
  }
}

// Twelve Data URL (0820EA probe symbol)
const apiKey = marketDataResolved;
const url = new URL('https://api.twelvedata.com/time_series');
url.searchParams.set('symbol', '0820EA.KL');
url.searchParams.set('interval', '1day');
url.searchParams.set('outputsize', '60');
url.searchParams.set('apikey', apiKey);
url.searchParams.set('order', 'ASC');
url.searchParams.set('exchange', 'XKLS');

console.log('\n=== Twelve Data request (apikey masked) ===');
console.log('actualUrl', maskUrl(url.toString()));
console.log('apikeyParamLength', apiKey.length);
console.log('apikeyHead8', apiKey ? apiKey.slice(0, 8) : '(empty)');
console.log('apikeyTail8', apiKey ? apiKey.slice(-8) : '(empty)');

// Validate HTTP (0820EA probe symbol)
if (apiKey) {
  const res = await fetch(url.toString());
  const json = await res.json();
  const bars0820 = Array.isArray(json.values) ? json.values.length : 0;
  console.log('\n=== Twelve Data probe response (0820EA.KL) ===');
  console.log('httpStatus', res.status);
  console.log('apiCode', json.code ?? '(none)');
  console.log('message', String(json.message ?? '').slice(0, 120));
  console.log('barCount', bars0820);

  const aaplUrl = new URL('https://api.twelvedata.com/time_series');
  aaplUrl.searchParams.set('symbol', 'AAPL');
  aaplUrl.searchParams.set('interval', '1day');
  aaplUrl.searchParams.set('outputsize', '30');
  aaplUrl.searchParams.set('apikey', apiKey);
  aaplUrl.searchParams.set('order', 'ASC');
  const aaplRes = await fetch(aaplUrl.toString());
  const aaplJson = await aaplRes.json();
  const aaplBars = Array.isArray(aaplJson.values) ? aaplJson.values.length : 0;
  const twelveDataKeyValid = aaplRes.ok && aaplBars > 0;
  console.log('\n=== Twelve Data key validation (AAPL, same as marketDataApiKey) ===');
  console.log('twelveDataKeyValid', twelveDataKeyValid);
  console.log('httpStatus', aaplRes.status);
  console.log('barCount', aaplBars);
}

// Constants.expoConfig — only in Expo runtime
console.log('\n=== Constants.expoConfig?.extra ===');
console.log('not available in Node (Expo app runtime only)');
