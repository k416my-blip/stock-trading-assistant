import fs from 'node:fs';

function loadEnv() {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();
const key = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY ?? '';
console.log('len', key.length, 'head', key.slice(0, 4));
const url = `https://api.twelvedata.com/time_series?symbol=0820EA.KL&interval=1day&outputsize=30&apikey=${encodeURIComponent(key)}&order=ASC&exchange=XKLS`;
const res = await fetch(url);
const json = await res.json();
console.log('http', res.status, 'code', json.code, 'bars', json.values?.length ?? 0);
