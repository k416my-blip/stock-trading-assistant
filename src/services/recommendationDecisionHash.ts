import type { AdoptionVerdict } from '../types/investmentCharter';
import { sha256Hex } from '../utils/sha256Hex';
import { normalizeSymbolKey } from './userAnalysisSymbols';

export type DecisionHashInput = {
  symbol: string;
  adoptionVerdict: AdoptionVerdict;
  buyAllowed: boolean;
  recommendationScore: number;
  confidencePct: number;
};

/** SHA256(symbol + adoptionVerdict + buyAllowed + recommendationScore + confidencePct) */
export function buildDecisionHashPayload(input: DecisionHashInput): string {
  const symbol = normalizeSymbolKey(input.symbol);
  return (
    symbol +
    input.adoptionVerdict +
    String(input.buyAllowed) +
    String(input.recommendationScore) +
    String(input.confidencePct)
  );
}

export function computeDecisionHash(input: DecisionHashInput): string {
  return sha256Hex(buildDecisionHashPayload(input));
}

export function decisionHashesMatch(before: string, after: string): boolean {
  return Boolean(before) && before === after;
}
