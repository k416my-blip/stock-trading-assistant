/**
 * 最重要監査その83 — Twelve Data Bursa Malaysia本番接続監査 · v4確定5銘柄 · ルール変更なし
 */
import type {
  ForwardMalaysiaV4TwelveBursaAuditReport,
  ForwardMalaysiaV4TwelveBursaSymbolRow,
  ForwardMalaysiaV4TwelveFailureFix,
  ForwardMalaysiaV4TwelveFormatProbeRow,
  ForwardMalaysiaV4TwelveProductionGrade,
} from '../../types/forwardValidation';
import {
  MARKET_DATA_MIN_INTERVAL_MS,
  MARKET_DATA_SYMBOL_COOLDOWN_MS,
} from '../../constants/marketData';
import { normalizeTwelveDataApiKey, isUsableApiKey } from '../apiKeyValidation';
import { fetchHttpWithRetry } from '../quoteProviders/providerFetchUtil';
import { getBursaQuoteAttempts } from '../bursaSymbolFormat';
import { getDailyOHLCV, getQuoteForMarket, MarketDataError } from '../marketDataService';
import { V4_YAHOO_QUALITY_SYMBOLS } from './forwardValidationMalaysiaV4YahooQualityAudit';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';

const FIXED_CONDITIONS_JA =
  'MY v4 Twelve Bursa本番接続 · TENAGA/CIMB/GAMUDA/YTL/IJM · quote/time_series/symbol変換/Yahoo差/API制限';

const PROBE_OUTPUTSIZE = 30;
const PROBE_TIMEOUT_MS = 20_000;
const PRICE_DIFF_WARN_PCT = 2;
const PRICE_DIFF_FAIL_PCT = 5;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

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

export function buildTwelveUrl(
  path: 'quote' | 'time_series',
  apiKey: string,
  params: { symbol: string; exchange?: string; mic_code?: string },
): string {
  const url = new URL(`https://api.twelvedata.com/${path}`);
  url.searchParams.set('symbol', params.symbol);
  url.searchParams.set('apikey', apiKey);
  if (params.exchange) url.searchParams.set('exchange', params.exchange);
  if (params.mic_code) url.searchParams.set('mic_code', params.mic_code);
  if (path === 'time_series') {
    url.searchParams.set('interval', '1day');
    url.searchParams.set('outputsize', String(PROBE_OUTPUTSIZE));
    url.searchParams.set('order', 'ASC');
  }
  return url.toString();
}

function parseTwelveError(body: unknown, httpOk: boolean): string | null {
  if (!body || typeof body !== 'object') return httpOk ? null : 'HTTPエラー';
  const rec = body as Record<string, unknown>;
  if (rec.status === 'error') {
    return typeof rec.message === 'string' ? rec.message : 'Twelve Data error';
  }
  if (!httpOk) return `HTTP ${String(rec.code ?? 'error')}`;
  return null;
}

function isRateLimitMessage(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('rate limit') ||
    lower.includes('429') ||
    lower.includes('api credit') ||
    lower.includes('run out of')
  );
}

export async function probeTwelveQuote(
  apiKey: string,
  params: { symbol: string; exchange?: string; mic_code?: string },
): Promise<{
  ok: boolean;
  price: number | null;
  errorJa: string | null;
  rateLimited: boolean;
  apiCreditsLeft: number | null;
}> {
  const url = buildTwelveUrl('quote', apiKey, params);
  try {
    const { response, bodyText } = await fetchHttpWithRetry(url, {
      timeoutMs: PROBE_TIMEOUT_MS,
      logLabel: 'forward_validation_twelve_bursa_quote',
      symbol: params.symbol,
    });
    const creditsRaw = response.headers.get('api-credits-left');
    const apiCreditsLeft = creditsRaw != null ? Number(creditsRaw) : null;
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        price: null,
        errorJa: 'JSON解析失敗',
        rateLimited: false,
        apiCreditsLeft: Number.isFinite(apiCreditsLeft) ? apiCreditsLeft : null,
      };
    }
    const err = parseTwelveError(json, response.ok);
    if (err) {
      return {
        ok: false,
        price: null,
        errorJa: err,
        rateLimited: isRateLimitMessage(err),
        apiCreditsLeft: Number.isFinite(apiCreditsLeft) ? apiCreditsLeft : null,
      };
    }
    const price =
      typeof json.close === 'number'
        ? json.close
        : typeof json.price === 'number'
          ? json.price
          : Number(json.close ?? json.price);
    if (!Number.isFinite(price) || price <= 0) {
      return {
        ok: false,
        price: null,
        errorJa: '価格フィールド空',
        rateLimited: false,
        apiCreditsLeft: Number.isFinite(apiCreditsLeft) ? apiCreditsLeft : null,
      };
    }
    return {
      ok: true,
      price,
      errorJa: null,
      rateLimited: false,
      apiCreditsLeft: Number.isFinite(apiCreditsLeft) ? apiCreditsLeft : null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ネットワーク失敗';
    return {
      ok: false,
      price: null,
      errorJa: msg,
      rateLimited: isRateLimitMessage(msg),
      apiCreditsLeft: null,
    };
  }
}

export async function probeTwelveTimeSeries(
  apiKey: string,
  params: { symbol: string; exchange?: string; mic_code?: string },
): Promise<{
  ok: boolean;
  barCount: number;
  latestDate: string | null;
  latestClose: number | null;
  errorJa: string | null;
  rateLimited: boolean;
  apiCreditsLeft: number | null;
}> {
  const url = buildTwelveUrl('time_series', apiKey, params);
  try {
    const { response, bodyText } = await fetchHttpWithRetry(url, {
      timeoutMs: PROBE_TIMEOUT_MS,
      logLabel: 'forward_validation_twelve_bursa_ts',
      symbol: params.symbol,
    });
    const creditsRaw = response.headers.get('api-credits-left');
    const apiCreditsLeft = creditsRaw != null ? Number(creditsRaw) : null;
    let json: { status?: string; message?: string; values?: { datetime: string; close: string }[] };
    try {
      json = JSON.parse(bodyText) as typeof json;
    } catch {
      return {
        ok: false,
        barCount: 0,
        latestDate: null,
        latestClose: null,
        errorJa: 'JSON解析失敗',
        rateLimited: false,
        apiCreditsLeft: Number.isFinite(apiCreditsLeft) ? apiCreditsLeft : null,
      };
    }
    const err = parseTwelveError(json, response.ok);
    if (err) {
      return {
        ok: false,
        barCount: 0,
        latestDate: null,
        latestClose: null,
        errorJa: err,
        rateLimited: isRateLimitMessage(err),
        apiCreditsLeft: Number.isFinite(apiCreditsLeft) ? apiCreditsLeft : null,
      };
    }
    const values = Array.isArray(json.values) ? json.values : [];
    const bars = values
      .map((v) => ({
        date: v.datetime.slice(0, 10),
        close: Number(v.close),
      }))
      .filter((b) => Number.isFinite(b.close) && b.close > 0);
    const last = bars[bars.length - 1];
    return {
      ok: bars.length >= 5,
      barCount: bars.length,
      latestDate: last?.date ?? null,
      latestClose: last?.close ?? null,
      errorJa: bars.length >= 5 ? null : 'バー不足',
      rateLimited: false,
      apiCreditsLeft: Number.isFinite(apiCreditsLeft) ? apiCreditsLeft : null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ネットワーク失敗';
    return {
      ok: false,
      barCount: 0,
      latestDate: null,
      latestClose: null,
      errorJa: msg,
      rateLimited: isRateLimitMessage(msg),
      apiCreditsLeft: null,
    };
  }
}

export function gradeTwelveBursaProduction(input: {
  apiKeyAvailable: boolean;
  productionQuoteSuccessRatePct: number;
  productionTimeSeriesSuccessRatePct: number;
  maxPriceDiffPct: number | null;
  rateLimitHitCount: number;
}): { grade: ForwardMalaysiaV4TwelveProductionGrade; verdictJa: string } {
  if (!input.apiKeyAvailable) {
    return {
      grade: 'C',
      verdictJa: 'C 本番非推奨 — Twelve APIキー未設定',
    };
  }
  if (input.rateLimitHitCount > 0) {
    return {
      grade: 'C',
      verdictJa: `C 本番非推奨 — API制限発生(${input.rateLimitHitCount}回) · 間隔${MARKET_DATA_MIN_INTERVAL_MS}ms以上を厳守`,
    };
  }
  const allQuote = input.productionQuoteSuccessRatePct >= 100;
  const allTs = input.productionTimeSeriesSuccessRatePct >= 100;
  const diffOk = input.maxPriceDiffPct == null || input.maxPriceDiffPct <= PRICE_DIFF_WARN_PCT;
  if (allQuote && allTs && diffOk) {
    return {
      grade: 'A',
      verdictJa: 'A 本番採用可 — quote/time_series全銘柄成功 · Yahoo価格差許容内',
    };
  }
  const mostlyOk =
    input.productionQuoteSuccessRatePct >= 80 &&
    input.productionTimeSeriesSuccessRatePct >= 80;
  const diffWarn =
    input.maxPriceDiffPct == null || input.maxPriceDiffPct <= PRICE_DIFF_FAIL_PCT;
  if (mostlyOk && diffWarn) {
    return {
      grade: 'B',
      verdictJa: `B 条件付き採用 — quote${input.productionQuoteSuccessRatePct}% · time_series${input.productionTimeSeriesSuccessRatePct}% · 最大価格差${input.maxPriceDiffPct ?? '—'}%`,
    };
  }
  return {
    grade: 'C',
    verdictJa: `C 本番非推奨 — quote${input.productionQuoteSuccessRatePct}% · time_series${input.productionTimeSeriesSuccessRatePct}% · 最大価格差${input.maxPriceDiffPct ?? '—'}%`,
  };
}

function buildFailureFixes(
  rows: ForwardMalaysiaV4TwelveBursaSymbolRow[],
  minApiCreditsLeft: number | null,
): ForwardMalaysiaV4TwelveFailureFix[] {
  const fixes: ForwardMalaysiaV4TwelveFailureFix[] = [];
  const allFailed = rows.every((r) => !r.productionQuoteOk && !r.productionTimeSeriesOk);
  if (allFailed && rows.length > 0) {
    fixes.push({
      symbol: 'ALL',
      issueJa: '全5銘柄でTwelve Data 404 symbol invalid',
      causeJa:
        minApiCreditsLeft != null && minApiCreditsLeft <= 20
          ? `API残クレジット${minApiCreditsLeft} · 無料枠枯渇またはBursa未対応プランの可能性`
          : 'Bursa Malaysia (XKLS) が現行APIキー/プランで未提供 · 全形式(5347/5347.KL/BURSA:5347等)404',
      fixFile: 'src/services/quoteProviderChain.ts',
      fixCodeJa:
        'MY v4本番はYahooを主データ源とし、TwelveはUS/HKのみ · portfolioPriceUpdateでbursa→yahooフォールバック維持',
    });
  }
  for (const row of rows) {
    const bareProbe = row.formatProbes.find((p) => p.apiSymbol === row.bursaSymbol);
    const dotKlProbe = row.formatProbes.find((p) => p.apiSymbol === `${row.bursaSymbol}.KL`);
    if (
      bareProbe &&
      !bareProbe.quoteOk &&
      !bareProbe.timeSeriesOk &&
      dotKlProbe &&
      (dotKlProbe.quoteOk || dotKlProbe.timeSeriesOk)
    ) {
      fixes.push({
        symbol: row.bursaSymbol,
        issueJa: '裸銘柄(5347)では取得失敗 · .KL形式で成功',
        causeJa: 'Twelve Data Bursaは{core}.KL+exchange=XKLSが正形式。裸数字はsymbol_invalidまたは空応答',
        fixFile: 'src/services/forwardValidation/forwardValidationMalaysiaV4YahooQualityAudit.ts',
        fixCodeJa:
          'fetchTwelveDailyBars: getTwelveDataQuoteAttempts("bursa", symbol)の先頭候補(5347.KL)を使用',
      });
    }
    if (!row.productionQuoteOk || !row.productionTimeSeriesOk) {
      const win = row.winningApiSymbol;
      if (win && win !== `${row.bursaSymbol}.KL`) {
        fixes.push({
          symbol: row.bursaSymbol,
          issueJa: '本番パス失敗 · 形式プローブは別形式で成功',
          causeJa: 'getDailyOHLCVがtoTwelveDataSymbol先頭候補と実際の成功形式が不一致の可能性',
          fixFile: 'src/services/marketDataSymbols.ts / marketDataService.ts',
          fixCodeJa: 'recordBursaFormatSuccessで記録された形式をtoTwelveDataSymbolで優先',
        });
      }
    }
  }
  return fixes;
}

export async function buildMalaysiaV4TwelveBursaAuditReport(input?: {
  twelveApiKey?: string;
  auditedAt?: string;
  throttleMs?: number;
}): Promise<ForwardMalaysiaV4TwelveBursaAuditReport> {
  const auditedAt = input?.auditedAt ?? new Date().toISOString();
  const throttleMs = input?.throttleMs ?? MARKET_DATA_MIN_INTERVAL_MS;
  const twelveKey = input?.twelveApiKey ?? readTwelveApiKeyFromEnv();
  const twelveApiKeyAvailable = isUsableApiKey(twelveKey);

  let totalApiRequests = 0;
  let rateLimitHitCount = 0;
  let minApiCreditsLeft: number | null = null;

  const symbolRows: ForwardMalaysiaV4TwelveBursaSymbolRow[] = [];

  for (const def of V4_YAHOO_QUALITY_SYMBOLS) {
    const attempts = getBursaQuoteAttempts(def.symbol, { mode: 'full' });
    const formatProbes: ForwardMalaysiaV4TwelveFormatProbeRow[] = [];
    let winningAttempt: string | null = null;
    let winningApiSymbol: string | null = null;

    if (twelveApiKeyAvailable) {
      for (const attempt of attempts) {
        await sleep(throttleMs);
        const quote = await probeTwelveQuote(twelveKey, {
          symbol: attempt.symbol,
          exchange: attempt.exchange,
          mic_code: attempt.mic_code,
        });
        totalApiRequests++;
        if (quote.rateLimited) rateLimitHitCount++;
        if (quote.apiCreditsLeft != null) {
          minApiCreditsLeft =
            minApiCreditsLeft == null
              ? quote.apiCreditsLeft
              : Math.min(minApiCreditsLeft, quote.apiCreditsLeft);
        }

        await sleep(throttleMs);
        const ts = await probeTwelveTimeSeries(twelveKey, {
          symbol: attempt.symbol,
          exchange: attempt.exchange,
          mic_code: attempt.mic_code,
        });
        totalApiRequests++;
        if (ts.rateLimited) rateLimitHitCount++;
        if (ts.apiCreditsLeft != null) {
          minApiCreditsLeft =
            minApiCreditsLeft == null
              ? ts.apiCreditsLeft
              : Math.min(minApiCreditsLeft, ts.apiCreditsLeft);
        }

        formatProbes.push({
          attempt: attempt.attempt,
          apiSymbol: attempt.symbol,
          exchange: attempt.exchange,
          mic_code: attempt.mic_code,
          quoteOk: quote.ok,
          quotePrice: quote.price,
          quoteErrorJa: quote.errorJa,
          timeSeriesOk: ts.ok,
          timeSeriesBarCount: ts.barCount,
          timeSeriesErrorJa: ts.errorJa,
        });

        if (!winningAttempt && quote.ok && ts.ok) {
          winningAttempt = attempt.attempt;
          winningApiSymbol = attempt.symbol;
        }
      }
    }

    const { bars, result: yahooResult } = await fetchForwardOhlcvDetailed(def.yahooSymbol, 30);
    const yahooLatestClose = bars.length > 0 ? bars[bars.length - 1]!.close : null;
    const yahooLatestDate = yahooResult.latestDate;

    let productionQuoteOk = false;
    let productionQuotePrice: number | null = null;
    let productionTimeSeriesOk = false;
    let productionTimeSeriesBarCount = 0;
    let twelveLatestDate: string | null = null;

    if (twelveApiKeyAvailable) {
      await sleep(throttleMs);
      try {
        const quote = await getQuoteForMarket(twelveKey, 'bursa', def.symbol, 'MYR');
        productionQuoteOk = quote.price > 0;
        productionQuotePrice = quote.price;
        totalApiRequests++;
      } catch (err) {
        totalApiRequests++;
        if (err instanceof MarketDataError && err.kind === 'rate_limit') {
          rateLimitHitCount++;
        }
      }

      await sleep(throttleMs);
      try {
        const ts = await getDailyOHLCV(twelveKey, 'bursa', def.symbol, PROBE_OUTPUTSIZE);
        productionTimeSeriesOk = ts.bars.length >= 5;
        productionTimeSeriesBarCount = ts.bars.length;
        twelveLatestDate = ts.bars[ts.bars.length - 1]?.datetime.slice(0, 10) ?? null;
        totalApiRequests++;
      } catch (err) {
        totalApiRequests++;
        if (err instanceof MarketDataError && err.kind === 'rate_limit') {
          rateLimitHitCount++;
        }
      }
    }

    let priceDiffPct: number | null = null;
    const comparePrice = productionQuotePrice ?? formatProbes.find((p) => p.quoteOk)?.quotePrice ?? null;
    if (yahooLatestClose != null && comparePrice != null && yahooLatestClose > 0) {
      priceDiffPct = round3(Math.abs(((comparePrice - yahooLatestClose) / yahooLatestClose) * 100));
    }

    symbolRows.push({
      bursaSymbol: def.symbol,
      yahooSymbol: def.yahooSymbol,
      labelJa: def.labelJa,
      formatProbes,
      winningAttempt,
      winningApiSymbol,
      productionQuoteOk,
      productionQuotePrice,
      productionTimeSeriesOk,
      productionTimeSeriesBarCount,
      yahooLatestClose,
      yahooLatestDate,
      twelveLatestDate,
      priceDiffPct,
    });
  }

  const probeQuoteOk = symbolRows.filter((r) => r.formatProbes.some((p) => p.quoteOk)).length;
  const probeTsOk = symbolRows.filter((r) => r.formatProbes.some((p) => p.timeSeriesOk)).length;
  const prodQuoteOk = symbolRows.filter((r) => r.productionQuoteOk).length;
  const prodTsOk = symbolRows.filter((r) => r.productionTimeSeriesOk).length;
  const n = V4_YAHOO_QUALITY_SYMBOLS.length;

  const quoteSuccessRatePct = round3((probeQuoteOk / n) * 100);
  const timeSeriesSuccessRatePct = round3((probeTsOk / n) * 100);
  const productionQuoteSuccessRatePct = round3((prodQuoteOk / n) * 100);
  const productionTimeSeriesSuccessRatePct = round3((prodTsOk / n) * 100);

  const diffs = symbolRows.map((r) => r.priceDiffPct).filter((v): v is number => v != null);
  const avgPriceDiffPct =
    diffs.length > 0 ? round3(diffs.reduce((s, v) => s + v, 0) / diffs.length) : null;
  const maxPriceDiffPct = diffs.length > 0 ? round3(Math.max(...diffs)) : null;

  const failureFixes = buildFailureFixes(symbolRows, minApiCreditsLeft);

  const { grade, verdictJa } = gradeTwelveBursaProduction({
    apiKeyAvailable: twelveApiKeyAvailable,
    productionQuoteSuccessRatePct,
    productionTimeSeriesSuccessRatePct,
    maxPriceDiffPct,
    rateLimitHitCount,
  });

  const symbolFormatSummary = symbolRows
    .map((r) => `${r.labelJa}:${r.winningApiSymbol ?? '—'}(${r.winningAttempt ?? '失敗'})`)
    .join(' · ');

  const answerAJa = twelveApiKeyAvailable
    ? `A quote取得: プローブ${quoteSuccessRatePct}%(${probeQuoteOk}/5) · 本番${productionQuoteSuccessRatePct}%(${prodQuoteOk}/5) · ${symbolRows.map((r) => `${r.labelJa}:${r.productionQuoteOk ? r.productionQuotePrice : '失敗'}`).join(' ')}`
    : 'A quote取得: APIキー未設定 — スキップ';

  const answerBJa = twelveApiKeyAvailable
    ? `B time_series取得: プローブ${timeSeriesSuccessRatePct}%(${probeTsOk}/5) · 本番${productionTimeSeriesSuccessRatePct}%(${prodTsOk}/5) · ${symbolRows.map((r) => `${r.labelJa}:${r.productionTimeSeriesBarCount}本`).join(' ')}`
    : 'B time_series取得: APIキー未設定 — スキップ';

  const answerCJa = `C 正しいsymbol: ${symbolFormatSummary}`;

  const answerDJa =
    diffs.length > 0
      ? `D Yahoo価格差: 平均${avgPriceDiffPct}% · 最大${maxPriceDiffPct}% · ${symbolRows.map((r) => `${r.labelJa}:${r.priceDiffPct ?? '—'}%`).join(' ')}`
      : 'D Yahoo価格差: 比較不可（TwelveまたはYahoo未取得）';

  const answerEJa = `E API制限: リクエスト${totalApiRequests}回 · 429/制限${rateLimitHitCount}回 · 残クレジット最小${minApiCreditsLeft ?? '—'} · 最小間隔${MARKET_DATA_MIN_INTERVAL_MS}ms · 銘柄クールダウン${MARKET_DATA_SYMBOL_COOLDOWN_MS}ms`;

  const answerFJa = `F 本番採用可否: ${verdictJa}`;

  const apiLimitNoteJa =
    rateLimitHitCount > 0
      ? `制限発生${rateLimitHitCount}回 — 本番は${MARKET_DATA_MIN_INTERVAL_MS}ms間隔+${MARKET_DATA_SYMBOL_COOLDOWN_MS}ms銘柄クールダウン必須`
      : minApiCreditsLeft != null && minApiCreditsLeft <= 20
        ? `残クレジット${minApiCreditsLeft} — 無料枠枯渇寸前 · 本番はYahoo優先推奨`
        : `制限なし — 本番キュー(${MARKET_DATA_MIN_INTERVAL_MS}ms/${MARKET_DATA_SYMBOL_COOLDOWN_MS}ms)で5銘柄運用可`;

  const humanSummaryJa = [
    '監査83 Twelve Data Bursa Malaysia本番接続監査',
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    failureFixes.length > 0
      ? `修正提案: ${failureFixes.map((f) => `${f.symbol}:${f.issueJa}`).join(' · ')}`
      : '修正提案: なし',
    '監査81/82固定 · ルール変更なし',
  ].join('\n');

  return {
    auditedAt,
    twelveApiKeyAvailable,
    symbolRows,
    quoteSuccessRatePct,
    timeSeriesSuccessRatePct,
    productionQuoteSuccessRatePct,
    productionTimeSeriesSuccessRatePct,
    avgPriceDiffPct,
    maxPriceDiffPct,
    totalApiRequests,
    rateLimitHitCount,
    minIntervalMs: MARKET_DATA_MIN_INTERVAL_MS,
    symbolCooldownMs: MARKET_DATA_SYMBOL_COOLDOWN_MS,
    apiLimitNoteJa,
    productionGrade: grade,
    productionVerdictJa: verdictJa,
    failureFixes,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    consistencyNoteJa: '監査81/82固定 · ルール変更なし',
    humanSummaryJa,
  };
}

export async function runMalaysiaV4TwelveBursaAudit(): Promise<ForwardMalaysiaV4TwelveBursaAuditReport> {
  return buildMalaysiaV4TwelveBursaAuditReport();
}

export function formatMalaysiaV4TwelveBursaCsv(
  report: ForwardMalaysiaV4TwelveBursaAuditReport,
): string {
  const lines = [
    `# 最重要監査その83 Twelve Bursa本番接続`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.productionVerdictJa}`,
    '',
    'section,symbol,label,winningSymbol,winningAttempt,prodQuote,prodQuotePrice,prodTsBars,yahooClose,diffPct',
    ...report.symbolRows.map((r) =>
      [
        'symbol',
        r.bursaSymbol,
        r.labelJa,
        r.winningApiSymbol ?? '',
        r.winningAttempt ?? '',
        r.productionQuoteOk,
        r.productionQuotePrice ?? '',
        r.productionTimeSeriesBarCount,
        r.yahooLatestClose ?? '',
        r.priceDiffPct ?? '',
      ].join(','),
    ),
    '',
    'section,attempt,apiSymbol,quoteOk,tsOk,quotePrice,tsBars,quoteErr,tsErr',
    ...report.symbolRows.flatMap((r) =>
      r.formatProbes.map((p) =>
        [
          r.bursaSymbol,
          p.attempt,
          p.apiSymbol,
          p.quoteOk,
          p.timeSeriesOk,
          p.quotePrice ?? '',
          p.timeSeriesBarCount,
          `"${(p.quoteErrorJa ?? '').replace(/"/g, '""')}"`,
          `"${(p.timeSeriesErrorJa ?? '').replace(/"/g, '""')}"`,
        ].join(','),
      ),
    ),
    '',
    'section,metric,value',
    ['aggregate', 'quoteSuccessRatePct', report.quoteSuccessRatePct].join(','),
    ['aggregate', 'timeSeriesSuccessRatePct', report.timeSeriesSuccessRatePct].join(','),
    ['aggregate', 'productionQuoteSuccessRatePct', report.productionQuoteSuccessRatePct].join(','),
    ['aggregate', 'productionTimeSeriesSuccessRatePct', report.productionTimeSeriesSuccessRatePct].join(','),
    ['aggregate', 'avgPriceDiffPct', report.avgPriceDiffPct ?? ''].join(','),
    ['aggregate', 'maxPriceDiffPct', report.maxPriceDiffPct ?? ''].join(','),
    ['aggregate', 'totalApiRequests', report.totalApiRequests].join(','),
    ['aggregate', 'rateLimitHitCount', report.rateLimitHitCount].join(','),
    ['aggregate', 'productionGrade', report.productionGrade].join(','),
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
