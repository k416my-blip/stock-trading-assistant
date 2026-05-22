/**
 * AI回答の数値が evidenceData と整合するか検証
 */
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { ParsedAiApiJson } from './aiResponseSanitizer';

export type ExplanationValidationResult = {
  ok: boolean;
  mismatches: string[];
  groundedNumbers: number;
};

function extractPctNumbers(text: string): number[] {
  const matches = text.match(/-?\d+(?:\.\d+)?\s*%/g) ?? [];
  return matches.map((m) => parseFloat(m.replace('%', '').trim())).filter((n) => Number.isFinite(n));
}

function extractPlainNumbers(text: string): number[] {
  const matches = text.match(/-?\d+(?:\.\d+)?/g) ?? [];
  return matches
    .map((m) => parseFloat(m))
    .filter((n) => Number.isFinite(n) && Math.abs(n) > 0.05 && Math.abs(n) < 1_000_000);
}

function nearMatch(a: number, b: number, tolerance = 1.2): boolean {
  return Math.abs(a - b) <= tolerance || (b !== 0 && Math.abs((a - b) / b) < 0.08);
}

function collectEvidenceNumbers(context: AiStrategyContextPayload): number[] {
  const nums: number[] = [];
  for (const sym of context.evidenceData.symbols) {
    if (sym.intradayChangePct != null) nums.push(sym.intradayChangePct);
    if (sym.volumeSurgeRatio != null) {
      nums.push(sym.volumeSurgeRatio);
      nums.push((sym.volumeSurgeRatio - 1) * 100);
    }
    if (sym.currentPrice != null) nums.push(sym.currentPrice);
    if (sym.previousClose != null) nums.push(sym.previousClose);
    const xs = sym.xSentiment;
    if (xs) {
      nums.push(xs.bullishPct, xs.bearishPct, xs.panicPct, xs.hypePct);
      if (xs.postSurgeRatePct != null) nums.push(xs.postSurgeRatePct);
    }
  }
  if (context.globalMarketAnalysis?.vix?.value != null) {
    nums.push(context.globalMarketAnalysis.vix.value);
  }
  for (const idx of context.globalMarketAnalysis?.indices ?? []) {
    if (idx.changePct != null) nums.push(idx.changePct);
  }
  nums.push(context.evidenceData.actionGuide.overallConfidencePct);
  nums.push(context.evidenceData.riskControl.overallDataQualityScore);
  return nums;
}

function collectEvidenceSymbols(context: AiStrategyContextPayload): Set<string> {
  const set = new Set<string>();
  for (const sym of context.evidenceData.symbols) {
    set.add(sym.symbol.toUpperCase());
  }
  for (const h of context.holdings) {
    set.add(h.symbol.toUpperCase());
  }
  return set;
}

/** 本文中の銘柄コードが根拠外か */
function findUngroundedTickers(text: string, allowed: Set<string>): string[] {
  const found = text.match(/\b[A-Z]{1,5}(?:\.KL)?\b/g) ?? [];
  const bad: string[] = [];
  for (const t of found) {
    const u = t.toUpperCase();
    if (u.length < 2 || u.length > 6) continue;
    if (!allowed.has(u) && !allowed.has(u.replace(/\.KL$/, ''))) {
      bad.push(u);
    }
  }
  return [...new Set(bad)].slice(0, 5);
}

export function validateAiExplanationAgainstEvidence(
  parsed: ParsedAiApiJson,
  displayText: string,
  context: AiStrategyContextPayload,
): ExplanationValidationResult {
  const combined = [
    parsed.conclusion,
    parsed.reason,
    parsed.technicalReason,
    parsed.macroReason,
    parsed.body,
    displayText,
  ]
    .filter(Boolean)
    .join(' ');

  const evidenceNums = collectEvidenceNumbers(context);
  const pcts = extractPctNumbers(combined);
  const plain = extractPlainNumbers(combined).filter((n) => Math.abs(n) > 2 || n % 1 !== 0);
  const allNums = [...pcts, ...plain];

  const mismatches: string[] = [];
  let grounded = 0;

  for (const n of allNums) {
    const match = evidenceNums.some((e) => nearMatch(n, e));
    if (match) grounded += 1;
    else if (Math.abs(n) >= 3) {
      mismatches.push(`根拠外の数値の可能性: ${n}`);
    }
  }

  const ungroundedTickers = findUngroundedTickers(combined, collectEvidenceSymbols(context));
  for (const t of ungroundedTickers) {
    mismatches.push(`根拠外銘柄の言及: ${t}`);
  }

  const maxMismatches = context.evidenceData.riskControl.allowSpeculativeAi ? 4 : 2;
  const ok = mismatches.length <= maxMismatches;

  return { ok, mismatches: mismatches.slice(0, 6), groundedNumbers: grounded };
}
