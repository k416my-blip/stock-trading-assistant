import type { SubmitBrokerOrderInput } from '../../types/paperBroker';

export function validateEntryConditions(input: SubmitBrokerOrderInput): {
  ok: boolean;
  warningsJa: string[];
} {
  const warnings: string[] = [];
  if (input.referencePrice <= 0) {
    return { ok: false, warningsJa: ['価格が無効です'] };
  }
  const spread = input.spreadBpsEstimate ?? 10;
  if (spread > 25) {
    warnings.push(`スプレッド大 (${spread.toFixed(1)}bps)`);
  }
  const vol = input.volatilityPct ?? 0;
  if (vol > 35) {
    warnings.push(`ボラティリティ高 (${vol.toFixed(1)}%)`);
  }
  if (input.quantity * input.referencePrice < 100) {
    warnings.push('流動性 — 想定ノーショナルが小さい');
  }
  return { ok: warnings.length < 2, warningsJa: warnings };
}
