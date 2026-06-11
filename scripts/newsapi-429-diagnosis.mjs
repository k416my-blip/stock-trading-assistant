/**
 * NewsAPI 429 原因診断 — status / headers / body を保存
 * node scripts/newsapi-429-diagnosis.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadAuditApiKeys, probeDeviceSecureStoreKeys } from './loadAuditApiKeys.mjs';

const OUT_DIR = path.join('docs/review/newsapi-429-diagnosis');
const STOCKS = [
  { code: '1155', label: 'Maybank' },
  { code: '1023', label: 'CIMB' },
  { code: '1295', label: 'Public Bank' },
  { code: '5347', label: 'Tenaga' },
  { code: '4707', label: 'Nestle' },
  { code: '6033', label: 'Petronas Gas' },
];

function headersToObject(res) {
  const out = {};
  res.headers.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function parseBody(bodyText) {
  try {
    return JSON.parse(bodyText);
  } catch {
    return null;
  }
}

function classify429(json, headers) {
  const code = json?.code ?? null;
  const message = json?.message ?? '';
  const retryAfter = headers['retry-after'] ?? headers['Retry-After'] ?? null;
  const limit = headers['x-ratelimit-limit'] ?? headers['X-RateLimit-Limit'] ?? null;
  const remaining = headers['x-ratelimit-remaining'] ?? headers['X-RateLimit-Remaining'] ?? null;

  let cause = 'unknown';
  let plan = 'unknown';

  if (/developer accounts are limited/i.test(message)) {
    plan = 'Developer';
  } else if (/business/i.test(message)) {
    plan = 'Business';
  } else if (/enterprise/i.test(message)) {
    plan = 'Enterprise';
  }

  if (code === 'rateLimited' && /24 hour period/i.test(message)) {
    cause = 'D_daily_limit';
  } else if (code === 'rateLimited' && /12 hours/i.test(message)) {
    cause = 'D_daily_limit';
  } else if (retryAfter && Number(retryAfter) <= 60) {
    cause = 'A_per_second_or_burst';
  } else if (retryAfter && Number(retryAfter) <= 3600) {
    cause = 'B_per_minute_or_hour';
  } else if (/monthly/i.test(message)) {
    cause = 'D_monthly_limit';
  } else if (code === 'upgradeRequired' || json?.status === 426) {
    cause = 'E_plan_restriction';
  } else if (code === 'rateLimited') {
    cause = 'D_daily_limit';
  }

  return {
    code,
    message,
    retryAfter,
    limit,
    remaining,
    rateLimitedField: json?.code === 'rateLimited' ? true : null,
    plan,
    cause,
  };
}

async function probeNews(url, apiKey, label) {
  const res = await fetch(url, { headers: { 'X-Api-Key': apiKey } });
  const bodyText = await res.text();
  const headers = headersToObject(res);
  const json = parseBody(bodyText);
  return {
    label,
    requestUrl: url.replace(apiKey, '***'),
    status: res.status,
    ok: res.ok,
    headers,
    bodyText,
    json,
    analysis: res.status === 429 || json?.code === 'rateLimited' ? classify429(json, headers) : {
      code: json?.code ?? null,
      message: json?.message ?? null,
      retryAfter: headers['retry-after'] ?? headers['Retry-After'] ?? null,
      limit: headers['x-ratelimit-limit'] ?? headers['X-RateLimit-Limit'] ?? null,
      remaining: headers['x-ratelimit-remaining'] ?? headers['X-RateLimit-Remaining'] ?? null,
      rateLimitedField: json?.code === 'rateLimited' ? true : null,
      plan: json?.code === 'rateLimited' ? 'Developer' : 'unknown',
      cause: res.ok ? 'ok' : 'other_error',
    },
    articleCount: Array.isArray(json?.articles) ? json.articles.length : 0,
  };
}

async function probeFallbacks(stock) {
  const sym = `${stock.code}.KL`;
  const q = encodeURIComponent(`${stock.label} ${stock.code} Malaysia stock`);
  const urls = {
    yahooRss: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(sym)}&region=US&lang=en-US`,
    googleRss: `https://news.google.com/rss/search?q=${q}&hl=en-MY&gl=MY&ceid=MY:en`,
    redditRss: `https://www.reddit.com/search.rss?q=${encodeURIComponent(`${stock.label} ${stock.code} subreddit:BursaMalaysia`)}&sort=new`,
  };
  const out = {};
  for (const [name, url] of Object.entries(urls)) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      const itemCount = (text.match(/<item>/gi) ?? []).length;
      out[name] = { status: res.status, itemCount, ok: res.ok && itemCount > 0 };
    } catch (e) {
      out[name] = { status: 0, itemCount: 0, ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return out;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const keys = loadAuditApiKeys();
  const secure = probeDeviceSecureStoreKeys();

  const archiveBodyPath = path.join('docs/review/final-review-v2-api/news-api-response-body.txt');
  const archiveBody = fs.existsSync(archiveBodyPath)
    ? fs.readFileSync(archiveBodyPath, 'utf8')
    : '';

  let connection;
  if (keys.newsApiKey) {
    connection = await probeNews(
      'https://newsapi.org/v2/everything?q=Maybank&pageSize=5',
      keys.newsApiKey,
      'connection_everything_maybank',
    );
  } else if (archiveBody) {
    const json = parseBody(archiveBody);
    connection = {
      label: 'archived_device_probe',
      requestUrl: 'https://newsapi.org/v2/everything?q=Maybank&pageSize=5',
      status: 429,
      ok: false,
      headers: {
        note: 'headers not captured in archived device probe — NewsAPI typically omits Retry-After on Developer daily limit',
      },
      bodyText: archiveBody,
      json,
      analysis: classify429(json, {}),
      articleCount: 0,
      source: 'docs/review/final-review-v2-api/news-api-response-body.txt',
    };
  } else {
    console.error('NEWS_API_KEY missing and no archived 429 body');
    process.exit(2);
  }

  const stockProbes = [];
  if (keys.newsApiKey) {
    for (const stock of STOCKS) {
      const q = encodeURIComponent(`${stock.label} ${stock.code} Malaysia`.trim());
      stockProbes.push(
        await probeNews(
          `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=8`,
          keys.newsApiKey,
          `stock_${stock.code}`,
        ),
      );
      await new Promise((r) => setTimeout(r, 400));
    }
  } else {
    for (const stock of STOCKS) {
      stockProbes.push({
        label: `stock_${stock.code}`,
        status: 429,
        ok: false,
        bodyText: archiveBody,
        json: parseBody(archiveBody),
        analysis: classify429(parseBody(archiveBody), {}),
        articleCount: 0,
        source: 'archived_same_quota_window',
      });
    }
  }

  const fallback1155 = await probeFallbacks(STOCKS[0]);

  const payload = {
    generatedAt: new Date().toISOString(),
    keySource: keys.sources.news,
    keyFingerprint: keys.newsApiKey.length > 8
      ? `${keys.newsApiKey.slice(0, 4)}…${keys.newsApiKey.slice(-4)} (${keys.newsApiKey.length}文字)`
      : `(${keys.newsApiKey.length}文字)`,
    secureStore: secure,
    connection,
    stockProbes,
    fallback1155,
    dashboardNoteJa:
      'NewsAPI ダッシュボード（Current/Daily/Monthly Usage）は Web ログイン必須のため API からは取得不可。プラン・上限は 429 body の message から推定。',
    inferredPlan: connection.analysis.plan,
    inferredCause: connection.analysis.cause,
    recoveryJa:
      connection.status === 429
        ? 'Developer プラン: 24時間で100リクエスト（12時間あたり50）。次の12時間ウィンドウまたは24時間経過後にクォータ回復。'
        : connection.ok
          ? '現在は NewsAPI 利用可能'
          : 'HTTP エラー — body.message を確認',
    twelveHourTestJa:
      connection.status === 429
        ? 'NewsAPI は一時制限中だが RSS / Reddit / X フォールバックで材料分析継続可能 → 12時間テスト開始可（NewsAPI_TEMP_RATE_LIMIT 扱い）'
        : connection.ok
          ? 'NewsAPI 利用可能 → 12時間テスト開始可'
          : 'NewsAPI キー/API 異常 — 要調査',
  };

  fs.writeFileSync(path.join(OUT_DIR, '429-response-full.json'), JSON.stringify(payload, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, '429-response-body.txt'),
    connection.bodyText,
    'utf8',
  );
  fs.writeFileSync(
    path.join(OUT_DIR, '429-response-headers.json'),
    JSON.stringify(connection.headers, null, 2),
    'utf8',
  );

  const reportLines = [
    '# NewsAPI 429 診断レポート',
    '',
    `実行: ${payload.generatedAt}`,
    '',
    '## 429 レスポンス全文',
    '',
    `- **status**: ${connection.status}`,
    `- **headers**: \`docs/review/newsapi-429-diagnosis/429-response-headers.json\``,
    `- **body**: \`docs/review/newsapi-429-diagnosis/429-response-body.txt\``,
    '',
    '### body 解析',
    '',
    '```json',
    JSON.stringify(connection.json, null, 2),
    '```',
    '',
    '### レスポンス内フィールド',
    '',
    `| フィールド | 値 |`,
    `|-----------|-----|`,
    `| code (rateLimited) | ${connection.analysis.code ?? '—'} |`,
    `| message | ${connection.analysis.message ?? '—'} |`,
    `| Retry-After (header) | ${connection.analysis.retryAfter ?? 'なし'} |`,
    `| X-RateLimit-Limit | ${connection.analysis.limit ?? 'なし'} |`,
    `| X-RateLimit-Remaining | ${connection.analysis.remaining ?? 'なし'} |`,
    '',
    '## プラン推定',
    '',
    `**${payload.inferredPlan}**（API error message より）`,
    '',
    '## ダッシュボード Usage',
    '',
    payload.dashboardNoteJa,
    '',
    '手動確認: https://newsapi.org/account',
    '',
    '## 429 原因分類',
    '',
    `**${payload.inferredCause}** → ${
      {
        A_per_second_or_burst: 'A. 秒間制限',
        B_per_minute_or_hour: 'B. 分間制限',
        C_daily_limit: 'C. 日次制限',
        D_daily_limit: 'D. 日次制限（Developer 100/24h）',
        D_monthly_limit: 'D. 月次制限',
        E_plan_restriction: 'E. プラン制限',
        ok: '制限なし',
        other_error: 'その他エラー',
        unknown: '不明',
      }[payload.inferredCause] ?? payload.inferredCause
    }`,
    '',
    '## フォールバック（1155 Maybank）',
    '',
    `| ソース | HTTP | 件数 | OK |`,
    `|--------|------|------|-----|`,
    ...Object.entries(fallback1155).map(
      ([name, row]) => `| ${name} | ${row.status} | ${row.itemCount} | ${row.ok ? 'PASS' : 'FAIL'} |`,
    ),
    '',
    '## 回復条件',
    '',
    payload.recoveryJa,
    '',
    '## 12時間テスト開始可否',
    '',
    payload.twelveHourTestJa,
  ];

  fs.writeFileSync(path.join(OUT_DIR, 'NEWSAPI_429_REPORT.md'), reportLines.join('\n'), 'utf8');

  console.log(JSON.stringify({
    status: connection.status,
    code: connection.analysis.code,
    plan: payload.inferredPlan,
    cause: payload.inferredCause,
    recovery: payload.recoveryJa,
    twelveHour: payload.twelveHourTestJa,
    report: path.join(OUT_DIR, 'NEWSAPI_429_REPORT.md'),
  }, null, 2));

  process.exit(connection.status === 429 ? 0 : connection.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
