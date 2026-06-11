/**
 * Phase13.1 — KLSE Financial Report 全文解析（数値・コメンタリー抽出）
 */
import type {
  FinancialReportAnalysis,
  FinancialReportExtractedFields,
  FinancialReportMetricGrowth,
} from '../../types/bursaFinancialReportAnalysis';
import { EARNINGS_CALL_UNAVAILABLE_JA } from '../../types/bursaEarningsCall';
import { stripHtml } from './bursaKlseParser';

const FORWARD_LOOKING =
  /\b(expect(?:s|ed|ing)?|forecast(?:s|ed|ing)?|outlook|guidance|anticipate(?:s|d|ing)?|target(?:s|ed|ing)?|projection(?:s)?|project(?:s|ed|ing)?)\b/i;

const RISK_WORDS = /\b(risk(?:s)?|uncertain(?:ty)?|headwind(?:s)?|challenge(?:s)?|volatil(?:e|ity)|pressure|slowdown|decline|loss|impairment)\b/i;
const OPPORTUNITY_WORDS =
  /\b(opportunit(?:y|ies)|growth|expansion|strong|momentum|recovery|improv(?:e|ing|ement)|record|dividend)\b/i;
const MANAGEMENT_WORDS =
  /\b(management|board|director(?:s)?|ceo|cfo|chairman|group|company|we\s+(?:expect|anticipate|forecast|believe|remain))\b/i;

const METRIC_ROW_RES: Array<{ key: 'revenue' | 'profit'; pattern: RegExp }> = [
  { key: 'revenue', pattern: /<b>\s*Revenue\s*<\/b>[\s\S]*?<div[^>]*align="?right"?[^>]*>\s*([\d,.\-()]+)\s*<\/div>[\s\S]*?<div[^>]*align="?right"?[^>]*>\s*([\d,.\-()]+)\s*<\/div>/i },
  {
    key: 'profit',
    pattern:
      /<b>\s*Profit\/\(loss\) for the period\s*<\/b>[\s\S]*?<div[^>]*align="?right"?[^>]*>\s*([\d,.\-()]+)\s*<\/div>[\s\S]*?<div[^>]*align="?right"?[^>]*>\s*([\d,.\-()]+)\s*<\/div>/i,
  },
];

function parseNum(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  let v = raw.trim().replace(/,/g, '');
  let neg = false;
  if (v.startsWith('(') && v.endsWith(')')) {
    neg = true;
    v = v.slice(1, -1);
  }
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

function growthPct(current: number | null, prior: number | null): number | null {
  if (current == null || prior == null || prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return EARNINGS_CALL_UNAVAILABLE_JA;
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function buildMetricGrowth(label: string, current: number | null, prior: number | null): FinancialReportMetricGrowth {
  const pct = growthPct(current, prior);
  return {
    label,
    currentQuarter: current,
    priorYearQuarter: prior,
    growthPct: pct,
    growthLabelJa: pct != null ? fmtPct(pct) : EARNINGS_CALL_UNAVAILABLE_JA,
  };
}

export function extractFinancialReportPlainText(html: string): string {
  const start = html.indexOf('class="col-md-9 bursa-ann"');
  const slice = start >= 0 ? html.slice(start, start + 250_000) : html;
  const noScript = slice.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  return stripHtml(noScript).replace(/\s+/g, ' ').trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 320);
}

function pickSentences(text: string, pattern: RegExp, max: number): string[] {
  const out: string[] = [];
  for (const s of splitSentences(text)) {
    if (!pattern.test(s)) continue;
    if (out.includes(s)) continue;
    out.push(s.slice(0, 220));
    if (out.length >= max) break;
  }
  return out;
}

function extractMetricsFromHtml(html: string): {
  revenue: FinancialReportMetricGrowth | null;
  profit: FinancialReportMetricGrowth | null;
} {
  let revenue: FinancialReportMetricGrowth | null = null;
  let profit: FinancialReportMetricGrowth | null = null;
  for (const row of METRIC_ROW_RES) {
    const m = html.match(row.pattern);
    if (!m) continue;
    const current = parseNum(m[1]);
    const prior = parseNum(m[2]);
    const metric = buildMetricGrowth(row.key === 'revenue' ? 'Revenue' : 'Profit for period', current, prior);
    if (row.key === 'revenue') revenue = metric;
    else profit = metric;
  }
  return { revenue, profit };
}

function classifyForwardLooking(sentences: string[]): {
  outlook: string[];
  guidance: string[];
} {
  const outlook: string[] = [];
  const guidance: string[] = [];
  for (const s of sentences) {
    if (/\bguidance\b/i.test(s)) guidance.push(s);
    else if (FORWARD_LOOKING.test(s)) outlook.push(s);
    if (outlook.length >= 3 && guidance.length >= 3) break;
  }
  return { outlook: outlook.slice(0, 3), guidance: guidance.slice(0, 3) };
}

export function analyzeFinancialReportHtml(input: {
  stockCode: string;
  html: string;
  quarterEndDate: string | null;
}): FinancialReportAnalysis {
  const plain = extractFinancialReportPlainText(input.html);
  const forwardSentences = pickSentences(plain, FORWARD_LOOKING, 12);
  const { outlook, guidance } = classifyForwardLooking(forwardSentences);
  const metrics = extractMetricsFromHtml(input.html);

  const extracted: FinancialReportExtractedFields = {
    revenueGrowth: metrics.revenue,
    profitGrowth: metrics.profit,
    outlook,
    guidance,
    risks: pickSentences(plain, RISK_WORDS, 3),
    opportunities: pickSentences(plain, OPPORTUNITY_WORDS, 3),
    managementCommentary: pickSentences(plain, MANAGEMENT_WORDS, 3),
  };

  const parts: string[] = [];
  if (metrics.revenue?.growthPct != null) {
    parts.push(
      `Revenue growth YoY (quarter): ${fmtPct(metrics.revenue.growthPct)} (${metrics.revenue.currentQuarter?.toLocaleString()} vs ${metrics.revenue.priorYearQuarter?.toLocaleString()} MYR'000)`,
    );
  }
  if (metrics.profit?.growthPct != null) {
    parts.push(
      `Profit growth YoY (quarter): ${fmtPct(metrics.profit.growthPct)} (${metrics.profit.currentQuarter?.toLocaleString()} vs ${metrics.profit.priorYearQuarter?.toLocaleString()} MYR'000)`,
    );
  }
  for (const g of guidance) parts.push(`Guidance: ${g}`);
  for (const o of outlook) parts.push(`Outlook: ${o}`);
  for (const r of extracted.risks) parts.push(`Risk: ${r}`);
  for (const o of extracted.opportunities) parts.push(`Opportunity: ${o}`);
  for (const m of extracted.managementCommentary) parts.push(`Commentary: ${m}`);

  const hasExtractableData =
    metrics.revenue?.growthPct != null ||
    metrics.profit?.growthPct != null ||
    outlook.length > 0 ||
    guidance.length > 0 ||
    extracted.risks.length > 0 ||
    extracted.opportunities.length > 0 ||
    extracted.managementCommentary.length > 0;

  return {
    stockCode: input.stockCode,
    quarterEndDate: input.quarterEndDate,
    plainTextLength: plain.length,
    extracted,
    analysisContextJa: parts.length > 0 ? parts.join('\n') : EARNINGS_CALL_UNAVAILABLE_JA,
    hasExtractableData,
  };
}
