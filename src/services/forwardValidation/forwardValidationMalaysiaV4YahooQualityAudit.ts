/**
 * 最重要監査その81 — Malaysia v4 Yahooデータ品質監査 · Twelve Data比較 · ルール変更なし
 */
import type {
  ForwardMalaysiaV4YahooProductionGrade,
  ForwardMalaysiaV4YahooQualityAuditReport,
  ForwardMalaysiaV4YahooQualitySymbolRow,
} from '../../types/forwardValidation';
import { fetchHttpWithRetry } from '../quoteProviders/providerFetchUtil';
import { normalizeTwelveDataApiKey, isUsableApiKey } from '../apiKeyValidation';
import { getTwelveDataQuoteAttempts } from '../marketDataSymbols';
import { MALAYSIA_V1_AUDIT_START } from './forwardValidationMalaysiaV1Audit';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';
import type { OhlcvBar } from './case4Indicators';
import { fetchMalaysiaV76AuditBundle } from './forwardValidationMalaysiaV4CandidateAudit';

export const V4_YAHOO_QUALITY_SYMBOLS: { symbol: string; yahooSymbol: string; labelJa: string }[] = [
  { symbol: '5347', yahooSymbol: '5347.KL', labelJa: 'TENAGA' },
  { symbol: '1023', yahooSymbol: '1023.KL', labelJa: 'CIMB' },
  { symbol: '5398', yahooSymbol: '5398.KL', labelJa: 'GAMUDA' },
  { symbol: '6742', yahooSymbol: '6742.KL', labelJa: 'YTL' },
  { symbol: '3336', yahooSymbol: '3336.KL', labelJa: 'IJM' },
];

const FIXED_CONDITIONS_JA =
  'MY v4 Yahoo品質 · v4確定5銘柄 · 欠損/異常/遅延 · Twelve Data比較 · ルール変更なし';

const ANOMALY_RETURN_PCT = 25;
const GAP_THRESHOLD_DAYS = 5;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function resolveAuditFromDate(toDate: string): string {
  const tenYearAgo = new Date(`${toDate}T00:00:00Z`);
  tenYearAgo.setUTCFullYear(tenYearAgo.getUTCFullYear() - 10);
  const computedFrom = tenYearAgo.toISOString().slice(0, 10);
  return computedFrom >= MALAYSIA_V1_AUDIT_START ? computedFrom : MALAYSIA_V1_AUDIT_START;
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

function expectedTradingDays(bars: OhlcvBar[]): number {
  if (bars.length < 2) return 0;
  const span = daysBetween(bars[0]!.date, bars[bars.length - 1]!.date);
  return Math.max(1, Math.round(span * (5 / 7)));
}

function countGaps(bars: OhlcvBar[]): number {
  let gaps = 0;
  for (let i = 1; i < bars.length; i++) {
    const d = daysBetween(bars[i - 1]!.date, bars[i]!.date);
    if (d > GAP_THRESHOLD_DAYS) gaps++;
  }
  return gaps;
}

export function analyzeBarQuality(bars: OhlcvBar[]): {
  missingRatePct: number;
  anomalyRatePct: number;
} {
  if (bars.length === 0) return { missingRatePct: 100, anomalyRatePct: 100 };
  const expected = expectedTradingDays(bars);
  const missing = Math.max(0, expected - bars.length);
  const missingRatePct = round3((missing / Math.max(expected, 1)) * 100);

  let anomalies = 0;
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1]!.close;
    const cur = bars[i]!.close;
    if (prev <= 0 || cur <= 0) {
      anomalies++;
      continue;
    }
    const ret = Math.abs(((cur - prev) / prev) * 100);
    if (ret >= ANOMALY_RETURN_PCT) anomalies++;
    if (bars[i]!.high < bars[i]!.low) anomalies++;
    if (bars[i]!.close > bars[i]!.high || bars[i]!.close < bars[i]!.low) anomalies++;
  }
  const anomalyRatePct = round3((anomalies / Math.max(bars.length - 1, 1)) * 100);
  return { missingRatePct, anomalyRatePct };
}

function pearsonCorrelation(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 5) return null;
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i]! - meanA;
    const db = b[i]! - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den > 0 ? round3(num / den) : null;
}

function alignCloses(yahoo: OhlcvBar[], twelve: OhlcvBar[]): {
  correlation: number | null;
  avgAbsReturnDiffPct: number | null;
} {
  const twelveMap = new Map(twelve.map((b) => [b.date, b.close]));
  const yahooCloses: number[] = [];
  const twelveCloses: number[] = [];
  const diffs: number[] = [];
  for (let i = 1; i < yahoo.length; i++) {
    const d = yahoo[i]!.date;
    const tc = twelveMap.get(d);
    if (tc == null) continue;
    const yPrev = yahoo[i - 1]!.close;
    const yCur = yahoo[i]!.close;
    const tPrev = twelveMap.get(yahoo[i - 1]!.date);
    if (tPrev == null || yPrev <= 0 || tPrev <= 0) continue;
    yahooCloses.push(yCur);
    twelveCloses.push(tc);
    const yRet = ((yCur - yPrev) / yPrev) * 100;
    const tRet = ((tc - tPrev) / tPrev) * 100;
    diffs.push(Math.abs(yRet - tRet));
  }
  return {
    correlation: pearsonCorrelation(yahooCloses, twelveCloses),
    avgAbsReturnDiffPct: diffs.length > 0 ? round3(diffs.reduce((s, v) => s + v, 0) / diffs.length) : null,
  };
}

type TwelveBar = { date: string; close: number };

async function fetchTwelveDailyBars(
  bursaSymbol: string,
  apiKey: string,
  startDate: string,
): Promise<{ bars: TwelveBar[]; ok: boolean }> {
  const attempts = getTwelveDataQuoteAttempts('bursa', `${bursaSymbol}.KL`);
  for (const attempt of attempts) {
    const url = new URL('https://api.twelvedata.com/time_series');
    url.searchParams.set('symbol', attempt.symbol);
    if (attempt.exchange) url.searchParams.set('exchange', attempt.exchange);
    if (attempt.mic_code) url.searchParams.set('mic_code', attempt.mic_code);
    url.searchParams.set('interval', '1day');
    url.searchParams.set('outputsize', '5000');
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('start_date', startDate);

    try {
      const { response, bodyText } = await fetchHttpWithRetry(url.toString(), {
        timeoutMs: 20_000,
        logLabel: 'forward_validation_twelve_quality',
        symbol: attempt.symbol,
      });
      if (!response.ok) continue;
      const json = JSON.parse(bodyText) as {
        status?: string;
        values?: { datetime: string; close: string }[];
      };
      if (json.status === 'error' || !json.values?.length) continue;
      const bars = json.values
        .map((v) => ({
          date: v.datetime.slice(0, 10),
          close: Number(v.close),
        }))
        .filter((b) => Number.isFinite(b.close) && b.close > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (bars.length >= 80) return { bars, ok: true };
    } catch {
      continue;
    }
  }
  return { bars: [], ok: false };
}

function readTwelveApiKeyFromEnv(): string {
  for (const name of ['EXPO_PUBLIC_TWELVE_DATA_API_KEY', 'TWELVE_DATA_API_KEY'] as const) {
    const v = process.env[name];
    const k = normalizeTwelveDataApiKey(v ?? '');
    if (isUsableApiKey(k)) return k;
  }
  return '';
}

export function gradeYahooProduction(input: {
  missingRatePct: number;
  anomalyRatePct: number;
  updateDelayDays: number;
  successRatePct: number;
  twelveAvailable: boolean;
  avgCorrelation: number | null;
}): { grade: ForwardMalaysiaV4YahooProductionGrade; verdictJa: string } {
  if (
    input.successRatePct >= 100 &&
    input.missingRatePct <= 5 &&
    input.anomalyRatePct <= 2 &&
    input.updateDelayDays <= 3 &&
    (!input.twelveAvailable || (input.avgCorrelation ?? 0) >= 0.95)
  ) {
    return { grade: 'A', verdictJa: 'A 本番採用可 — Yahoo品質良好 · 欠損/異常/遅延とも許容内' };
  }
  if (
    input.successRatePct >= 80 &&
    input.missingRatePct <= 15 &&
    input.anomalyRatePct <= 5 &&
    input.updateDelayDays <= 7
  ) {
    return {
      grade: 'B',
      verdictJa: `B 条件付き採用 — 取得成功${input.successRatePct}% · 欠損${input.missingRatePct}% · 遅延${input.updateDelayDays}日`,
    };
  }
  return {
    grade: 'C',
    verdictJa: `C 本番非推奨 — 欠損${input.missingRatePct}% · 異常${input.anomalyRatePct}% · 遅延${input.updateDelayDays}日`,
  };
}

export async function buildMalaysiaV4YahooQualityAuditReport(input: {
  fromDate: string;
  toDate: string;
  twelveApiKey?: string;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV4YahooQualityAuditReport> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const twelveKey = input.twelveApiKey ?? readTwelveApiKeyFromEnv();
  const twelveDataAvailable = isUsableApiKey(twelveKey);

  const symbolRows: ForwardMalaysiaV4YahooQualitySymbolRow[] = [];
  const correlations: number[] = [];

  for (const def of V4_YAHOO_QUALITY_SYMBOLS) {
    const { bars, result } = await fetchForwardOhlcvDetailed(def.yahooSymbol, 15_000, input.fromDate);
    const quality = analyzeBarQuality(bars);
    const latestDate = result.latestDate;
    const updateDelayDays = latestDate ? daysBetween(latestDate, input.toDate) : 99;

    let twelveOk = false;
    let twelveBarCount = 0;
    let twelveLatestDate: string | null = null;
    let priceCorrelation: number | null = null;
    let avgAbsReturnDiffPct: number | null = null;

    if (twelveDataAvailable) {
      const twelve = await fetchTwelveDailyBars(def.symbol, twelveKey, input.fromDate);
      twelveOk = twelve.ok;
      twelveBarCount = twelve.bars.length;
      twelveLatestDate = twelve.bars[twelve.bars.length - 1]?.date ?? null;
      if (bars.length > 0 && twelve.bars.length > 0) {
        const twelveOhlcv: OhlcvBar[] = twelve.bars.map((b) => ({
          date: b.date,
          open: b.close,
          high: b.close,
          low: b.close,
          close: b.close,
          volume: 0,
        }));
        const cmp = alignCloses(bars, twelveOhlcv);
        priceCorrelation = cmp.correlation;
        avgAbsReturnDiffPct = cmp.avgAbsReturnDiffPct;
        if (priceCorrelation != null) correlations.push(priceCorrelation);
      }
    }

    symbolRows.push({
      symbol: def.symbol,
      yahooSymbol: def.yahooSymbol,
      yahooOk: result.ok,
      twelveOk,
      yahooBarCount: result.barCount,
      twelveBarCount,
      missingRatePct: quality.missingRatePct,
      anomalyRatePct: quality.anomalyRatePct,
      updateDelayDays,
      latestDate,
      twelveLatestDate,
      priceCorrelation,
      avgAbsReturnDiffPct,
    });
  }

  const okYahoo = symbolRows.filter((r) => r.yahooOk).length;
  const okTwelve = symbolRows.filter((r) => r.twelveOk).length;
  const aggregateMissingRatePct = round3(
    symbolRows.reduce((s, r) => s + r.missingRatePct, 0) / symbolRows.length,
  );
  const aggregateAnomalyRatePct = round3(
    symbolRows.reduce((s, r) => s + r.anomalyRatePct, 0) / symbolRows.length,
  );
  const aggregateUpdateDelayDays = round3(
    symbolRows.reduce((s, r) => s + r.updateDelayDays, 0) / symbolRows.length,
  );
  const yahooSuccessRatePct = round3((okYahoo / symbolRows.length) * 100);
  const twelveSuccessRatePct = twelveDataAvailable
    ? round3((okTwelve / symbolRows.length) * 100)
    : 0;
  const avgCorrelation =
    correlations.length > 0
      ? round3(correlations.reduce((s, v) => s + v, 0) / correlations.length)
      : null;

  const { grade, verdictJa } = gradeYahooProduction({
    missingRatePct: aggregateMissingRatePct,
    anomalyRatePct: aggregateAnomalyRatePct,
    updateDelayDays: aggregateUpdateDelayDays,
    successRatePct: yahooSuccessRatePct,
    twelveAvailable: twelveDataAvailable,
    avgCorrelation,
  });

  const answerAJa = `A 欠損率: 平均${aggregateMissingRatePct}% · ${symbolRows.map((r) => `${r.symbol}:${r.missingRatePct}%`).join(' ')}`;
  const answerBJa = `B 異常値率: 平均${aggregateAnomalyRatePct}% · ${symbolRows.map((r) => `${r.symbol}:${r.anomalyRatePct}%`).join(' ')}`;
  const answerCJa = `C 更新遅延: 平均${aggregateUpdateDelayDays}日 · ${symbolRows.map((r) => `${r.symbol}:${r.updateDelayDays}日`).join(' ')}`;
  const answerDJa = `D 銘柄別取得率: Yahoo${yahooSuccessRatePct}%(${okYahoo}/5) · Twelve${twelveDataAvailable ? `${twelveSuccessRatePct}%(${okTwelve}/5)` : 'キー未設定'}`;
  const answerEJa = twelveDataAvailable
    ? `E Yahoo vs Twelve: 平均相関${avgCorrelation ?? '—'} · ${symbolRows.map((r) => `${r.symbol}:${r.priceCorrelation ?? '—'}`).join(' ')}`
    : 'E Yahoo vs Twelve: Twelve APIキー未設定 — 比較スキップ';
  const answerFJa = `F 本番採用判定: ${verdictJa}`;

  const humanSummaryJa = [
    '監査81 Malaysia v4 Yahooデータ品質監査',
    `期間 ${input.fromDate}〜${input.toDate}`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    '監査80運用準備 · ルール変更なし',
  ].join('\n');

  return {
    auditedAt,
    fromDate: input.fromDate,
    toDate: input.toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    symbolRows,
    aggregateMissingRatePct,
    aggregateAnomalyRatePct,
    aggregateUpdateDelayDays,
    yahooSuccessRatePct,
    twelveSuccessRatePct,
    twelveDataAvailable,
    productionGrade: grade,
    productionVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    consistencyNoteJa: '監査80運用準備 · ルール変更なし',
    humanSummaryJa,
  };
}

export async function runMalaysiaV4YahooQualityAudit(): Promise<ForwardMalaysiaV4YahooQualityAuditReport | null> {
  const bundle = await fetchMalaysiaV76AuditBundle();
  if (!bundle) return null;
  const toDate = bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);
  return buildMalaysiaV4YahooQualityAuditReport({ fromDate, toDate });
}

export function formatMalaysiaV4YahooQualityCsv(
  report: ForwardMalaysiaV4YahooQualityAuditReport,
): string {
  const lines = [
    `# 最重要監査その81 Yahoo品質 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.productionVerdictJa}`,
    '',
    'section,symbol,yahooOk,twelveOk,bars,missingPct,anomalyPct,delayDays,corr,diffPct',
    ...report.symbolRows.map((r) =>
      [
        'symbol',
        r.symbol,
        r.yahooOk,
        r.twelveOk,
        r.yahooBarCount,
        r.missingRatePct,
        r.anomalyRatePct,
        r.updateDelayDays,
        r.priceCorrelation ?? '',
        r.avgAbsReturnDiffPct ?? '',
      ].join(','),
    ),
    '',
    'section,metric,value',
    ['aggregate', 'missingRatePct', report.aggregateMissingRatePct].join(','),
    ['aggregate', 'anomalyRatePct', report.aggregateAnomalyRatePct].join(','),
    ['aggregate', 'updateDelayDays', report.aggregateUpdateDelayDays].join(','),
    ['aggregate', 'yahooSuccessRatePct', report.yahooSuccessRatePct].join(','),
    ['aggregate', 'twelveSuccessRatePct', report.twelveSuccessRatePct].join(','),
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
