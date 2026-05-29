/**
 * 実運用APIテスト — node scripts/operational-api-test.mjs
 * .env からキーを読み込み、各プロバイダへ実リクエストしてレポート出力
 */
import fs from 'node:fs';

const SYMBOLS = ['AAPL', 'NVDA', 'TSLA', 'MSFT'];
const TIMEOUT_MS = 12_000;

function loadEnvFile() {
  try {
    const text = fs.readFileSync('.env', 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* .env optional */
  }
}

function pickEnv(...names) {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return '';
}

function keyPresent(...names) {
  return pickEnv(...names).length > 0;
}

async function timedFetch(url, init = {}) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const bodyText = await res.text();
    const elapsedMs = Date.now() - started;
    let json = null;
    try {
      json = JSON.parse(bodyText);
    } catch {
      /* raw */
    }
    return { ok: res.ok, status: res.status, elapsedMs, bodyText, json, url: res.url || url };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Date.now() - started,
      bodyText: e instanceof Error ? e.message : String(e),
      json: null,
      url,
      error: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseTwelveData(json) {
  const price = Number(json?.price ?? json?.close);
  return Number.isFinite(price) ? price : null;
}

function parseFinnhub(json) {
  const price = Number(json?.c);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function parseAlphaVantage(json) {
  const q = json?.['Global Quote'];
  const price = Number(q?.['05. price']);
  return Number.isFinite(price) ? price : null;
}

function parsePolygon(json) {
  const c = json?.results?.[0]?.c;
  const price = Number(c);
  return Number.isFinite(price) ? price : null;
}

function parseFmp(json) {
  const row = Array.isArray(json) ? json[0] : json;
  const price = Number(row?.price ?? row?.regularMarketPrice ?? row?.close);
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function fetchQuote(provider, symbol, apiKey) {
  let url = '';
  let parse = () => null;
  switch (provider) {
    case 'Twelve Data':
      url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
      parse = parseTwelveData;
      break;
    case 'Finnhub':
      url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
      parse = parseFinnhub;
      break;
    case 'Alpha Vantage':
      url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
      parse = parseAlphaVantage;
      break;
    case 'Polygon':
      url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${encodeURIComponent(apiKey)}`;
      parse = parsePolygon;
      break;
    case 'FMP':
      url = `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
      parse = parseFmp;
      break;
    default:
      throw new Error(`unknown provider ${provider}`);
  }
  const res = await timedFetch(url, { headers: { Accept: 'application/json' } });
  const price = res.json ? parse(res.json) : null;
  const fetchedAt = new Date().toISOString();
  return {
    provider,
    symbol,
    price,
    fetchedAt,
    elapsedMs: res.elapsedMs,
    status: res.status,
    ok: res.ok && price != null,
    error: res.ok && price == null ? 'parse_failed' : res.error ? 'network' : !res.ok ? `http_${res.status}` : null,
    bodyPreview: res.bodyText.slice(0, 180).replace(/\s+/g, ' '),
  };
}

async function testNews(apiKey) {
  const url = `https://newsapi.org/v2/top-headlines?category=business&country=us&pageSize=5&apiKey=${encodeURIComponent(apiKey)}`;
  const res = await timedFetch(url);
  const articles = res.json?.articles ?? [];
  return {
    ok: res.ok && articles.length > 0,
    status: res.status,
    elapsedMs: res.elapsedMs,
    count: articles.length,
    headlines: articles.slice(0, 5).map((a) => ({
      title: a?.title ?? '(no title)',
      source: a?.source?.name ?? '?',
      publishedAt: a?.publishedAt ?? null,
    })),
    error: res.ok && articles.length === 0 ? 'no_articles' : !res.ok ? `http_${res.status}` : null,
  };
}

async function testOpenAi(apiKey) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: 'AAPLの株価動向を1文で簡潔に分析してください。',
        max_output_tokens: 80,
      }),
      signal: controller.signal,
    });
    const bodyText = await res.text();
    const elapsedMs = Date.now() - started;
    let json = null;
    try {
      json = JSON.parse(bodyText);
    } catch {
      /* */
    }
    const text =
      json?.output_text ??
      json?.output?.flatMap((o) => o?.content ?? [])?.find((c) => c?.text)?.text ??
      null;
    return {
      ok: res.ok && Boolean(text),
      status: res.status,
      elapsedMs,
      analysisPreview: text ? String(text).slice(0, 200) : null,
      error: !res.ok ? `http_${res.status}` : !text ? 'parse_failed' : null,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Date.now() - started,
      analysisPreview: null,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function testX(apiKey) {
  const bearer = apiKey.replace(/^Bearer\s+/i, '').trim();
  const url = 'https://api.twitter.com/2/tweets/search/recent?query=bitcoin&max_results=10';
  const res = await timedFetch(url, {
    headers: { Authorization: `Bearer ${bearer}` },
  });
  const tweets = res.json?.data ?? [];
  return {
    ok: res.ok && tweets.length > 0,
    status: res.status,
    elapsedMs: res.elapsedMs,
    tweetCount: tweets.length,
    sample: tweets.slice(0, 3).map((t) => ({
      id: t?.id,
      text: t?.text?.slice(0, 100) ?? '',
    })),
    error: res.ok && tweets.length === 0 ? 'no_tweets' : !res.ok ? `http_${res.status}` : null,
  };
}

loadEnvFile();

const keys = {
  twelveData: pickEnv('EXPO_PUBLIC_TWELVE_DATA_API_KEY', 'TWELVE_DATA_API_KEY'),
  finnhub: pickEnv('EXPO_PUBLIC_FINNHUB_API_KEY', 'FINNHUB_API_KEY', 'FINNHUB_TOKEN'),
  alphaVantage: pickEnv('EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY', 'ALPHA_VANTAGE_API_KEY'),
  polygon: pickEnv('EXPO_PUBLIC_POLYGON_API_KEY', 'POLYGON_API_KEY'),
  fmp: pickEnv('EXPO_PUBLIC_FMP_API_KEY', 'FMP_API_KEY'),
  news: pickEnv('EXPO_PUBLIC_NEWS_API_KEY', 'NEWS_API_KEY'),
  openai: pickEnv('EXPO_PUBLIC_OPENAI_API_KEY', 'OPENAI_API_KEY'),
  x: pickEnv('EXPO_PUBLIC_X_BEARER_TOKEN', 'X_BEARER_TOKEN', 'EXPO_PUBLIC_X_API_KEY', 'X_API_KEY'),
};

const stockProviders = [
  { name: 'Twelve Data', key: keys.twelveData },
  { name: 'Finnhub', key: keys.finnhub },
  { name: 'Alpha Vantage', key: keys.alphaVantage },
  { name: 'Polygon', key: keys.polygon },
  { name: 'FMP', key: keys.fmp },
];

const stockResults = [];
for (const provider of stockProviders) {
  if (!provider.key) {
    for (const symbol of SYMBOLS) {
      stockResults.push({
        provider: provider.name,
        symbol,
        price: null,
        fetchedAt: null,
        elapsedMs: 0,
        ok: false,
        error: 'api_key_missing_in_env',
      });
    }
    continue;
  }
  for (const symbol of SYMBOLS) {
    stockResults.push(await fetchQuote(provider.name, symbol, provider.key));
    await new Promise((r) => setTimeout(r, 350));
  }
}

const newsResult = keys.news
  ? await testNews(keys.news)
  : { ok: false, error: 'api_key_missing_in_env', count: 0, headlines: [] };

const aiResult = keys.openai
  ? await testOpenAi(keys.openai)
  : { ok: false, error: 'api_key_missing_in_env' };

const xResult = keys.x ? await testX(keys.x) : { ok: false, error: 'api_key_missing_in_env' };

const report = {
  generatedAt: new Date().toISOString(),
  keysPresent: {
    twelveData: keyPresent('EXPO_PUBLIC_TWELVE_DATA_API_KEY', 'TWELVE_DATA_API_KEY'),
    finnhub: keyPresent('EXPO_PUBLIC_FINNHUB_API_KEY', 'FINNHUB_API_KEY', 'FINNHUB_TOKEN'),
    alphaVantage: keyPresent('EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY', 'ALPHA_VANTAGE_API_KEY'),
    polygon: keyPresent('EXPO_PUBLIC_POLYGON_API_KEY', 'POLYGON_API_KEY'),
    fmp: keyPresent('EXPO_PUBLIC_FMP_API_KEY', 'FMP_API_KEY'),
    news: keyPresent('EXPO_PUBLIC_NEWS_API_KEY', 'NEWS_API_KEY'),
    openai: keyPresent('EXPO_PUBLIC_OPENAI_API_KEY', 'OPENAI_API_KEY'),
    x: keyPresent('EXPO_PUBLIC_X_BEARER_TOKEN', 'X_BEARER_TOKEN', 'EXPO_PUBLIC_X_API_KEY', 'X_API_KEY'),
  },
  note: '端末 SecureStore のキーは .env に無い場合スキップされます。接続テスト成功キーは実機側にあります。',
  stockQuotes: stockResults,
  news: newsResult,
  openAi: aiResult,
  xApi: xResult,
  homeScreenChecklist: [
    'DegradedModeBanner',
    'ProactiveSuggestionsHomeCard (AI無効時は非表示)',
    'CentralIntelligencePanel',
    'BuyingPowerCard / PracticeSummaryCard',
    'MarketSessionPanel',
    'MarketRegimeCard',
    'CrossAssetFlowCard',
    'AiTradeQueueSection',
    'Header: ProactiveBadge + UrgencyBadge + Settings',
  ],
};

console.log(JSON.stringify(report, null, 2));
