import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';
import { OVERFITTING_CONDITIONS } from '../constants/survivabilityAuditValidation';

const conditionScores: Record<string, number> = {};

export function resetSurvivabilityOverfittingDetectorForTest(): void {
  for (const k of Object.keys(conditionScores)) delete conditionScores[k];
}

export function noteConditionScore(input: SurvivabilityAuditObserveInput): void {
  if (input.miuiAggressiveReclaim) conditionScores.miui_reclaim = input.recoverySuccessRate;
  if (input.screenOff) conditionScores.screen_off = input.continuityScore / 100;
  if (input.sessionMinutes >= 120) conditionScores.long_session = input.runtimeEquilibriumStability;
  if (input.reconnectPerMin > 4) conditionScores.websocket_instability = 1 - input.reconnectPerMin / 20;
  conditionScores.redmi = input.miuiAggressiveReclaim ? input.metaCoordinationStability : 0.7;
}

export function scoreSurvivabilityOverfittingRisk(input: SurvivabilityAuditObserveInput): number {
  noteConditionScore(input);
  const values = OVERFITTING_CONDITIONS.map((c) => conditionScores[c] ?? 0.5);
  if (values.length < 2) return 0.1;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.round(Math.min(1, variance * 3) * 1000) / 1000;
}

export function buildOverfittingHeatmap(input: SurvivabilityAuditObserveInput): Record<string, number> {
  noteConditionScore(input);
  const heatmap: Record<string, number> = {};
  for (const c of OVERFITTING_CONDITIONS) {
    heatmap[c] = Math.round((conditionScores[c] ?? 0.5) * 1000) / 1000;
  }
  return heatmap;
}
