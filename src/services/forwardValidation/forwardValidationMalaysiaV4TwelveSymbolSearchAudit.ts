/**
 * 最重要監査その83.5 — Twelve Data symbol_search最終確定監査 · v4確定5銘柄 · 推測禁止
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ForwardMalaysiaV4TwelveFinalVerdict,
  ForwardMalaysiaV4TwelveRootCauseKind,
  ForwardMalaysiaV4TwelveSymbolSearchAuditReport,
  ForwardMalaysiaV4TwelveSymbolSearchHit,
  ForwardMalaysiaV4TwelveSymbolSearchQueryRow,
  ForwardMalaysiaV4TwelveSymbolSearchRetryRow,
} from '../../types/forwardValidation';
import { normalizeTwelveDataApiKey, isUsableApiKey } from '../apiKeyValidation';
import { V4_YAHOO_QUALITY_SYMBOLS } from './forwardValidationMalaysiaV4YahooQualityAudit';

const FIXED_CONDITIONS_JA =
  'MY v4 Twelve symbol_search最終確定 · 5347/1023/5398/6742/3336 · quote/time_series再試行 · 実レスポンス判定';

const DEFAULT_THROTTLE_MS = 8_000;
const REQUEST_TIMEOUT_MS = 25_000;
const TWELVE_BASE = 'https://api.twelvedata.com';

export const V4_TWELVE_SEARCH_CODES = V4_YAHOO_QUALITY_SYMBOLS.map((s) => ({
  bursaCode: s.symbol,
  labelJa: s.labelJa,
}));

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readTwelveApiKeyFromEnv(): string {
  for (const name of ['EXPO_PUBLIC_TWELVE_DATA_API_KEY', 'TWELVE_DATA_API_KEY'] as const) {
    const v = process.env[name];
    const k = normalizeTwelveDataApiKey(v ?? '');
    if (isUsableApiKey(k)) return k;
  }
  return '';
}

function maskApiKeyInUrl(url: string): string {
  return url.replace(/apikey=[^&]+/i, 'apikey=***');
}

function isMalaysiaHit(hit: ForwardMalaysiaV4TwelveSymbolSearchHit): boolean {
  const blob = `${hit.symbol} ${hit.exchange} ${hit.micCode} ${hit.country} ${hit.instrumentName}`.toUpperCase();
  return (
    blob.includes('XKLS') ||
    blob.includes('MYX') ||
    blob.includes('KLSE') ||
    blob.includes('BURSA') ||
    blob.includes('MALAYSIA') ||
    hit.country.toUpperCase() === 'MALAYSIA' ||
    hit.country.toUpperCase() === 'MY'
  );
}

function formatAccessField(access: unknown): string {
  if (access == null) return '';
  if (typeof access === 'string') return access;
  if (typeof access === 'object') {
    try {
      return JSON.stringify(access);
    } catch {
      return String(access);
    }
  }
  return String(access);
}

function parseSearchHit(raw: Record<string, unknown>, searchQuery: string): ForwardMalaysiaV4TwelveSymbolSearchHit {
  return {
    symbol: String(raw.symbol ?? raw.ticker ?? ''),
    instrumentName: String(raw.instrument_name ?? raw.name ?? raw.description ?? ''),
    exchange: String(raw.exchange ?? ''),
    micCode: String(raw.mic_code ?? ''),
    country: String(raw.country ?? ''),
    currency: String(raw.currency ?? ''),
    instrumentType: String(raw.instrument_type ?? raw.type ?? ''),
    access: formatAccessField(raw.access ?? raw.access_level),
    searchQuery,
  };
}

export async function fetchTwelveRaw(
  path: string,
  params: Record<string, string>,
): Promise<{
  httpStatus: number;
  responseBodyFull: string;
  headers: Record<string, string>;
}> {
  const url = new URL(`${TWELVE_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    const responseBodyFull = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return { httpStatus: res.status, responseBodyFull, headers };
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractErrorMessage(bodyText: string): string | null {
  try {
    const json = JSON.parse(bodyText) as Record<string, unknown>;
    if (typeof json.message === 'string') return json.message;
    if (json.status === 'error') return String(json.message ?? 'error');
    return null;
  } catch {
    return bodyText.slice(0, 200) || null;
  }
}

function messageImpliesPlanLimit(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('run out of api credits') ||
    m.includes('api credit') ||
    m.includes('too many requests') ||
    /\b429\b/.test(m)
  );
}

function messageImpliesProPlan(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('pro plan') ||
    m.includes('venture plan') ||
    m.includes('ultra plan') ||
    m.includes('consider upgrading') ||
    m.includes('consider switching to a higher tier') ||
    m.includes('available starting with') ||
    m.includes('not available on your plan') ||
    m.includes('upgrade your plan')
  );
}

function messageImpliesSymbolInvalid(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('symbol') &&
    (m.includes('invalid') || m.includes('missing') || m.includes('not found') || m.includes('figi'))
  );
}

export async function runSymbolSearchQuery(
  apiKey: string,
  bursaCode: string,
  labelJa: string,
): Promise<ForwardMalaysiaV4TwelveSymbolSearchQueryRow> {
  const { httpStatus, responseBodyFull } = await fetchTwelveRaw('symbol_search', {
    symbol: bursaCode,
    outputsize: '120',
    show_plan: 'true',
    apikey: apiKey,
  });

  let hits: ForwardMalaysiaV4TwelveSymbolSearchHit[] = [];
  try {
    const json = JSON.parse(responseBodyFull) as { data?: Record<string, unknown>[] };
    const data = Array.isArray(json.data) ? json.data : [];
    hits = data.map((row) => parseSearchHit(row, bursaCode));
  } catch {
    hits = [];
  }

  const malaysiaHits = hits.filter(isMalaysiaHit);

  return {
    bursaCode,
    labelJa,
    httpStatus,
    matchCount: hits.length,
    malaysiaMatchCount: malaysiaHits.length,
    responseBodyFull,
    errorMessage: extractErrorMessage(responseBodyFull),
    hits,
  };
}

function parseQuotePrice(bodyText: string): number | null {
  try {
    const json = JSON.parse(bodyText) as Record<string, unknown>;
    const price =
      typeof json.close === 'number'
        ? json.close
        : typeof json.price === 'number'
          ? json.price
          : Number(json.close ?? json.price);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

function parseTimeSeriesBarCount(bodyText: string): number {
  try {
    const json = JSON.parse(bodyText) as { values?: unknown[]; status?: string };
    if (json.status === 'error') return 0;
    return Array.isArray(json.values) ? json.values.length : 0;
  } catch {
    return 0;
  }
}

export async function retryQuoteOrTimeSeries(
  apiKey: string,
  hit: ForwardMalaysiaV4TwelveSymbolSearchHit,
  bursaCode: string,
  labelJa: string,
  endpoint: 'quote' | 'time_series',
): Promise<ForwardMalaysiaV4TwelveSymbolSearchRetryRow> {
  const params: Record<string, string> = {
    symbol: hit.symbol,
    apikey: apiKey,
  };
  if (hit.exchange) params.exchange = hit.exchange;
  if (hit.micCode) params.mic_code = hit.micCode;
  if (endpoint === 'time_series') {
    params.interval = '1day';
    params.outputsize = '10';
    params.order = 'ASC';
  }

  const { httpStatus, responseBodyFull } = await fetchTwelveRaw(endpoint, params);
  const err = extractErrorMessage(responseBodyFull);
  const quotePrice = endpoint === 'quote' ? parseQuotePrice(responseBodyFull) : null;
  const timeSeriesBarCount = endpoint === 'time_series' ? parseTimeSeriesBarCount(responseBodyFull) : 0;
  const ok =
    endpoint === 'quote'
      ? quotePrice != null
      : timeSeriesBarCount >= 1 && !err;

  return {
    bursaCode,
    labelJa,
    officialSymbol: hit.symbol,
    exchange: hit.exchange,
    micCode: hit.micCode,
    endpoint,
    httpStatus,
    ok,
    responseBodyFull,
    errorMessage: err,
    quotePrice,
    timeSeriesBarCount,
  };
}

export function dedupeOfficialSymbols(
  searchRows: ForwardMalaysiaV4TwelveSymbolSearchQueryRow[],
): ForwardMalaysiaV4TwelveSymbolSearchHit[] {
  const seen = new Set<string>();
  const out: ForwardMalaysiaV4TwelveSymbolSearchHit[] = [];
  for (const row of searchRows) {
    for (const hit of row.hits.filter(isMalaysiaHit)) {
      const key = `${hit.symbol}|${hit.exchange}|${hit.micCode}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(hit);
    }
  }
  return out;
}

export function classifyRootCause(input: {
  searchRows: ForwardMalaysiaV4TwelveSymbolSearchQueryRow[];
  officialSymbols: ForwardMalaysiaV4TwelveSymbolSearchHit[];
  retryRows: ForwardMalaysiaV4TwelveSymbolSearchRetryRow[];
}): {
  kind: ForwardMalaysiaV4TwelveRootCauseKind;
  evidence: string[];
  verdict: ForwardMalaysiaV4TwelveFinalVerdict;
} {
  const evidence: string[] = [];
  const allMessages = [
    ...input.searchRows.map((r) => r.errorMessage).filter(Boolean) as string[],
    ...input.retryRows.map((r) => r.errorMessage).filter(Boolean) as string[],
  ];

  for (const msg of allMessages) {
    if (messageImpliesProPlan(msg)) {
      evidence.push(`symbol_search/retry応答: "${msg}"`);
    }
    if (messageImpliesPlanLimit(msg)) {
      evidence.push(`レート/クレジット制限応答: "${msg}"`);
    }
    if (messageImpliesSymbolInvalid(msg)) {
      evidence.push(`symbol invalid応答: "${msg}"`);
    }
  }

  const anyRetryOk = input.retryRows.some((r) => r.ok);
  if (anyRetryOk) {
    const okRows = input.retryRows.filter((r) => r.ok);
    for (const r of okRows) {
      evidence.push(`${r.labelJa} ${r.endpoint} HTTP${r.httpStatus} symbol=${r.officialSymbol} 成功`);
    }
    return { kind: 'data_available', evidence, verdict: 'available' };
  }

  const hasProEvidence = allMessages.some(messageImpliesProPlan);
  if (hasProEvidence) {
    return { kind: 'plan_upgrade_required', evidence, verdict: 'pro_plan_required' };
  }

  const totalMalaysiaMatches = input.searchRows.reduce((s, r) => s + r.malaysiaMatchCount, 0);
  if (totalMalaysiaMatches === 0) {
    for (const row of input.searchRows) {
      evidence.push(
        `symbol_search(${row.bursaCode}): HTTP${row.httpStatus} · 全${row.matchCount}件 · Malaysia/XKLS該当0件`,
      );
    }
    const onlyRateLimit =
      allMessages.length > 0 && allMessages.every((m) => messageImpliesPlanLimit(m) || messageImpliesProPlan(m));
    if (onlyRateLimit && allMessages.some(messageImpliesPlanLimit)) {
      return { kind: 'plan_rate_limit', evidence, verdict: 'pro_plan_required' };
    }
    return { kind: 'exchange_not_in_catalog', evidence, verdict: 'bursa_unsupported' };
  }

  const accessHints = input.officialSymbols.map((h) => h.access).filter((a) => a.trim() !== '');
  for (const a of accessHints) {
    evidence.push(`symbol_search accessフィールド: "${a}"`);
  }

  const retryInvalidOnly =
    input.retryRows.length > 0 &&
    input.retryRows.every((r) => !r.ok) &&
    input.retryRows.every(
      (r) => r.errorMessage != null && messageImpliesSymbolInvalid(r.errorMessage),
    );
  if (retryInvalidOnly) {
    return { kind: 'symbol_format_invalid', evidence, verdict: 'bursa_unsupported' };
  }

  const retryPlanHints = input.retryRows
    .map((r) => r.errorMessage)
    .filter((m): m is string => m != null && messageImpliesProPlan(m));
  if (retryPlanHints.length > 0) {
    return { kind: 'plan_upgrade_required', evidence, verdict: 'pro_plan_required' };
  }

  evidence.push(
    `Malaysia該当${totalMalaysiaMatches}件あるが quote/time_series再試行は全失敗`,
  );
  return { kind: 'exchange_not_in_catalog', evidence, verdict: 'bursa_unsupported' };
}

function verdictLabelJa(v: ForwardMalaysiaV4TwelveFinalVerdict): string {
  switch (v) {
    case 'available':
      return '利用可能';
    case 'pro_plan_required':
      return 'Proプラン必要';
    case 'bursa_unsupported':
      return 'Bursa未対応';
  }
}

export async function buildMalaysiaV4TwelveSymbolSearchAuditReport(input?: {
  twelveApiKey?: string;
  auditedAt?: string;
  throttleMs?: number;
}): Promise<ForwardMalaysiaV4TwelveSymbolSearchAuditReport> {
  const auditedAt = input?.auditedAt ?? new Date().toISOString();
  const throttleMs = input?.throttleMs ?? DEFAULT_THROTTLE_MS;
  const twelveKey = input?.twelveApiKey ?? readTwelveApiKeyFromEnv();
  const twelveApiKeyAvailable = isUsableApiKey(twelveKey);

  const searchRows: ForwardMalaysiaV4TwelveSymbolSearchQueryRow[] = [];
  const retryRows: ForwardMalaysiaV4TwelveSymbolSearchRetryRow[] = [];

  if (twelveApiKeyAvailable) {
    for (const def of V4_TWELVE_SEARCH_CODES) {
      await sleep(throttleMs);
      searchRows.push(await runSymbolSearchQuery(twelveKey, def.bursaCode, def.labelJa));
    }

    const officialSymbols = dedupeOfficialSymbols(searchRows);

    for (const hit of officialSymbols) {
      const def = V4_TWELVE_SEARCH_CODES.find((d) => d.bursaCode === hit.searchQuery) ??
        V4_TWELVE_SEARCH_CODES.find((d) => hit.symbol.includes(d.bursaCode)) ?? {
          bursaCode: hit.searchQuery,
          labelJa: hit.instrumentName || hit.symbol,
        };

      await sleep(throttleMs);
      retryRows.push(
        await retryQuoteOrTimeSeries(twelveKey, hit, def.bursaCode, def.labelJa, 'quote'),
      );
      await sleep(throttleMs);
      retryRows.push(
        await retryQuoteOrTimeSeries(twelveKey, hit, def.bursaCode, def.labelJa, 'time_series'),
      );
    }

    if (officialSymbols.length === 0) {
      for (const def of V4_TWELVE_SEARCH_CODES) {
        const topHit = searchRows
          .find((r) => r.bursaCode === def.bursaCode)
          ?.hits[0];
        if (!topHit) continue;
        await sleep(throttleMs);
        retryRows.push(
          await retryQuoteOrTimeSeries(twelveKey, topHit, def.bursaCode, def.labelJa, 'quote'),
        );
        await sleep(throttleMs);
        retryRows.push(
          await retryQuoteOrTimeSeries(twelveKey, topHit, def.bursaCode, def.labelJa, 'time_series'),
        );
      }
    }
  }

  const officialSymbols = dedupeOfficialSymbols(searchRows);
  const { kind, evidence, verdict } = classifyRootCause({
    searchRows,
    officialSymbols,
    retryRows,
  });

  const answerAJa = twelveApiKeyAvailable
    ? `A symbol_search: ${searchRows
        .map(
          (r) =>
            `${r.labelJa}(${r.bursaCode}) HTTP${r.httpStatus} 全${r.matchCount}件 Malaysia${r.malaysiaMatchCount}件`,
        )
        .join(' · ')}`
    : 'A symbol_search: APIキー未設定';

  const answerBJa =
    officialSymbols.length > 0
      ? `B 正式symbol: ${officialSymbols
          .map((h) => `${h.symbol}@${h.exchange}/${h.micCode} (${h.instrumentName})`)
          .join(' · ')}`
      : 'B 正式symbol: Malaysia/XKLS該当なし';

  const quoteRetries = retryRows.filter((r) => r.endpoint === 'quote');
  const answerCJa =
    quoteRetries.length > 0
      ? `C quote: ${quoteRetries
          .map(
            (r) =>
              `${r.labelJa} ${r.officialSymbol} HTTP${r.httpStatus} ${r.ok ? `価格${r.quotePrice}` : r.errorMessage ?? '失敗'}`,
          )
          .join(' · ')}`
      : 'C quote: 再試行なし';

  const tsRetries = retryRows.filter((r) => r.endpoint === 'time_series');
  const answerDJa =
    tsRetries.length > 0
      ? `D time_series: ${tsRetries
          .map(
            (r) =>
              `${r.labelJa} ${r.officialSymbol} HTTP${r.httpStatus} ${r.ok ? `${r.timeSeriesBarCount}本` : r.errorMessage ?? '失敗'}`,
          )
          .join(' · ')}`
      : 'D time_series: 再試行なし';

  const answerEJa = `E 真因(${kind}): ${evidence.join(' | ')}`;
  const answerFJa = `F 最終判定: ${verdictLabelJa(verdict)}`;

  const humanSummaryJa = [
    '監査83.5 Twelve Data symbol_search最終確定',
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
  ].join('\n');

  return {
    auditedAt,
    twelveApiKeyAvailable,
    throttleMs,
    searchRows,
    officialSymbols,
    retryRows,
    rootCauseKind: kind,
    rootCauseEvidenceJa: evidence,
    finalVerdict: verdict,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    humanSummaryJa,
  };
}

export function formatMalaysiaV4TwelveSymbolSearchCsv(
  report: ForwardMalaysiaV4TwelveSymbolSearchAuditReport,
): string {
  const lines = [
    `# 最重要監査その83.5 Twelve symbol_search最終確定`,
    `# ${report.fixedConditionsJa}`,
    `# F ${report.finalVerdict}`,
    '',
    'section,bursaCode,label,httpStatus,matchCount,malaysiaCount,error',
    ...report.searchRows.map((r) =>
      [
        'search',
        r.bursaCode,
        r.labelJa,
        r.httpStatus,
        r.matchCount,
        r.malaysiaMatchCount,
        `"${(r.errorMessage ?? '').replace(/"/g, '""')}"`,
      ].join(','),
    ),
    '',
    'section,symbol,exchange,mic,country,access,instrumentName,searchQuery',
    ...report.officialSymbols.map((h) =>
      [
        'official',
        h.symbol,
        h.exchange,
        h.micCode,
        h.country,
        `"${h.access.replace(/"/g, '""')}"`,
        `"${h.instrumentName.replace(/"/g, '""')}"`,
        h.searchQuery,
      ].join(','),
    ),
    '',
    'section,bursaCode,endpoint,symbol,exchange,httpStatus,ok,price,bars,error',
    ...report.retryRows.map((r) =>
      [
        'retry',
        r.bursaCode,
        r.endpoint,
        r.officialSymbol,
        r.exchange,
        r.httpStatus,
        r.ok,
        r.quotePrice ?? '',
        r.timeSeriesBarCount,
        `"${(r.errorMessage ?? '').replace(/"/g, '""')}"`,
      ].join(','),
    ),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['answer', 'F', `"${report.answerFJa}"`].join(','),
  ];
  return lines.join('\n');
}

export type TwelveSymbolSearchArtifacts = {
  reportJsonPath: string;
  csvPath: string;
  responsesDir: string;
};

export function saveTwelveSymbolSearchArtifacts(
  report: ForwardMalaysiaV4TwelveSymbolSearchAuditReport,
  baseDir: string,
): TwelveSymbolSearchArtifacts {
  const responsesDir = join(baseDir, 'forward-validation-malaysia-v4-twelve-symbol-search-responses');
  mkdirSync(responsesDir, { recursive: true });

  for (const row of report.searchRows) {
    const file = join(responsesDir, `symbol_search_${row.bursaCode}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        {
          bursaCode: row.bursaCode,
          labelJa: row.labelJa,
          httpStatus: row.httpStatus,
          responseBodyFull: row.responseBodyFull,
          parsedHits: row.hits,
        },
        null,
        2,
      ),
      'utf8',
    );
  }

  for (const row of report.retryRows) {
    const safeSym = row.officialSymbol.replace(/[^a-zA-Z0-9._:-]/g, '_');
    const file = join(responsesDir, `retry_${row.bursaCode}_${row.endpoint}_${safeSym}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        {
          bursaCode: row.bursaCode,
          endpoint: row.endpoint,
          officialSymbol: row.officialSymbol,
          exchange: row.exchange,
          micCode: row.micCode,
          httpStatus: row.httpStatus,
          ok: row.ok,
          responseBodyFull: row.responseBodyFull,
        },
        null,
        2,
      ),
      'utf8',
    );
  }

  const reportJsonPath = join(baseDir, 'forward-validation-malaysia-v4-twelve-symbol-search-audit.json');
  writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), 'utf8');

  const csvPath = join(baseDir, 'forward-validation-malaysia-v4-twelve-symbol-search-audit.csv');
  writeFileSync(csvPath, formatMalaysiaV4TwelveSymbolSearchCsv(report), 'utf8');

  return { reportJsonPath, csvPath, responsesDir };
}
