/**
 * Phase13.3 — Earnings / Financial Report AI Summary（推測禁止）
 */
import type { EarningsCallAiSummary } from '../../types/bursaFinancialReportAnalysis';
import type { FinancialReportAnalysis } from '../../types/bursaFinancialReportAnalysis';
import type { EarningsCallToneScores } from '../../types/bursaEarningsCall';
import { EARNINGS_CALL_UNAVAILABLE_JA } from '../../types/bursaEarningsCall';
import { isUsableApiKey, normalizeStoredApiKey } from '../apiKeyValidation';

const AI_TIMEOUT_MS = 25_000;

function readOpenAiKeyFromEnv(): string {
  if (typeof process === 'undefined' || !process.env) return '';
  for (const name of ['EXPO_PUBLIC_OPENAI_API_KEY', 'OPENAI_API_KEY'] as const) {
    const value = process.env[name];
    if (typeof value === 'string' && isUsableApiKey(value)) {
      return normalizeStoredApiKey(value);
    }
  }
  return '';
}

async function loadOpenAiKeyForSummary(): Promise<string> {
  const fromEnv = readOpenAiKeyFromEnv();
  if (fromEnv) return fromEnv;
  try {
    const { loadAiApiKey } = await import('../aiApiKey');
    return await loadAiApiKey();
  } catch {
    return '';
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toneFromScore(score: number): string {
  if (score >= 20) return '強気';
  if (score >= 8) return 'やや強気';
  if (score <= -20) return '弱気';
  if (score <= -8) return 'やや弱気';
  return '中立';
}

export function buildRuleBasedEarningsSummary(input: {
  report: FinancialReportAnalysis;
  tone: EarningsCallToneScores | null;
}): EarningsCallAiSummary {
  const { extracted } = input.report;
  const rev = extracted.revenueGrowth?.growthLabelJa;
  const prof = extracted.profitGrowth?.growthLabelJa;
  const lines: string[] = [];
  if (rev && rev !== EARNINGS_CALL_UNAVAILABLE_JA) lines.push(`売上成長 ${rev}`);
  if (prof && prof !== EARNINGS_CALL_UNAVAILABLE_JA) lines.push(`利益成長 ${prof}`);
  if (extracted.guidance[0]) lines.push(extracted.guidance[0].slice(0, 120));
  else if (extracted.outlook[0]) lines.push(extracted.outlook[0].slice(0, 120));

  const executiveSummaryJa =
    lines.length > 0
      ? `Financial Report Analysis — ${lines.join(' · ')}`
      : EARNINGS_CALL_UNAVAILABLE_JA;

  const bullish: string[] = [];
  const bearish: string[] = [];
  if ((extracted.revenueGrowth?.growthPct ?? 0) > 0) bullish.push(`売上 YoY ${rev}`);
  if ((extracted.profitGrowth?.growthPct ?? 0) > 0) bullish.push(`利益 YoY ${prof}`);
  if ((extracted.revenueGrowth?.growthPct ?? 0) < 0) bearish.push(`売上 YoY ${rev}`);
  if ((extracted.profitGrowth?.growthPct ?? 0) < 0) bearish.push(`利益 YoY ${prof}`);
  for (const o of extracted.opportunities.slice(0, 2)) bullish.push(o.slice(0, 100));
  for (const r of extracted.risks.slice(0, 2)) bearish.push(r.slice(0, 100));

  const toneScore = input.tone?.managementToneScore ?? 0;
  let confidence = 40;
  if (extracted.revenueGrowth?.growthPct != null) confidence += 15;
  if (extracted.profitGrowth?.growthPct != null) confidence += 15;
  if (extracted.guidance.length > 0 || extracted.outlook.length > 0) confidence += 10;
  if (extracted.managementCommentary.length > 0) confidence += 10;

  return {
    source: 'rule_based',
    executiveSummaryJa,
    bullishFactorsJa: bullish.length > 0 ? bullish : [EARNINGS_CALL_UNAVAILABLE_JA],
    bearishFactorsJa: bearish.length > 0 ? bearish : [EARNINGS_CALL_UNAVAILABLE_JA],
    managementToneJa: input.tone ? toneFromScore(toneScore) : EARNINGS_CALL_UNAVAILABLE_JA,
    confidenceScore: clamp(confidence),
    generatedAt: new Date().toISOString(),
    apiStatusJa: 'OpenAI未使用（ルールベース）',
  };
}

async function callOpenAiSummary(context: string): Promise<EarningsCallAiSummary | null> {
  const apiKey = await loadOpenAiKeyForSummary();
  if (!apiKey.trim()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: `以下はKLSE Financial Reportから抽出した事実のみです。記載にない数値・予想は創作禁止。JSONのみ返答。

${context.slice(0, 6000)}

JSON形式:
{"executiveSummaryJa":"...","bullishFactorsJa":["..."],"bearishFactorsJa":["..."],"managementToneJa":"強気|やや強気|中立|やや弱気|弱気","confidenceScore":0-100}`,
        max_output_tokens: 500,
      }),
      signal: controller.signal,
    });
    const bodyText = await res.text();
    if (!res.ok) return null;
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      return null;
    }
    const text =
      (typeof json.output_text === 'string' ? json.output_text : null) ??
      (Array.isArray(json.output)
        ? (json.output as Array<{ content?: Array<{ text?: string }> }>)
            .flatMap((o) => o.content ?? [])
            .map((c) => c.text)
            .filter(Boolean)
            .join('\n')
        : null);
    if (!text) return null;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as {
      executiveSummaryJa?: string;
      bullishFactorsJa?: string[];
      bearishFactorsJa?: string[];
      managementToneJa?: string;
      confidenceScore?: number;
    };
    if (!parsed.executiveSummaryJa?.trim()) return null;
    return {
      source: 'openai',
      executiveSummaryJa: parsed.executiveSummaryJa.trim(),
      bullishFactorsJa: Array.isArray(parsed.bullishFactorsJa) ? parsed.bullishFactorsJa.filter(Boolean) : [],
      bearishFactorsJa: Array.isArray(parsed.bearishFactorsJa) ? parsed.bearishFactorsJa.filter(Boolean) : [],
      managementToneJa: parsed.managementToneJa?.trim() || EARNINGS_CALL_UNAVAILABLE_JA,
      confidenceScore: clamp(Number(parsed.confidenceScore ?? 50)),
      generatedAt: new Date().toISOString(),
      apiStatusJa: 'OpenAI接続済',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateEarningsCallAiSummary(input: {
  report: FinancialReportAnalysis;
  tone: EarningsCallToneScores | null;
}): Promise<EarningsCallAiSummary> {
  if (!input.report.hasExtractableData) {
    return {
      source: 'rule_based',
      executiveSummaryJa: EARNINGS_CALL_UNAVAILABLE_JA,
      bullishFactorsJa: [EARNINGS_CALL_UNAVAILABLE_JA],
      bearishFactorsJa: [EARNINGS_CALL_UNAVAILABLE_JA],
      managementToneJa: EARNINGS_CALL_UNAVAILABLE_JA,
      confidenceScore: 0,
      generatedAt: new Date().toISOString(),
      apiStatusJa: '抽出データなし',
    };
  }

  const ai = await callOpenAiSummary(input.report.analysisContextJa);
  if (ai) return ai;
  return buildRuleBasedEarningsSummary(input);
}

export function hasGeneratedSummary(summary: EarningsCallAiSummary | null | undefined): boolean {
  const t = summary?.executiveSummaryJa?.trim();
  return Boolean(t && t !== EARNINGS_CALL_UNAVAILABLE_JA);
}
