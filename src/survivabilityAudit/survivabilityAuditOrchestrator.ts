import type {
  SurvivabilityAuditObserveInput,
  SurvivabilityAuditTimelineEntry,
} from '../types/survivabilityAuditValidation';
import {
  scoreSurvivabilityEffectiveness,
  computeImprovementRate,
} from './survivabilityEffectivenessAuditor';
import {
  scoreRuntimeBlindSpotRisk,
  detectBlindSpots,
  buildBlindSpotMap,
} from './runtimeBlindSpotDetector';
import { scoreObserverSuppressionLoss, isSuppressionExcessive } from './observerSuppressionValidator';
import {
  scoreRecoverySideEffectRisk,
  detectRecoverySideEffectChain,
} from './recoverySideEffectDetector';
import { scoreStabilizationCostEfficiency } from './stabilizationCostEffectivenessAnalyzer';
import {
  scoreSurvivabilityOverfittingRisk,
  buildOverfittingHeatmap,
} from './survivabilityOverfittingDetector';
import { scoreRuntimeEquilibriumIntegrity } from './runtimeEquilibriumValidator';
import {
  scoreContinuityIntegrity,
  validateTradingContinuityFeatures,
} from './tradingContinuityIntegrityValidator';
import { longSessionAuditFlags } from './longSessionSurvivabilityAuditor';
import { noteDegradationSample } from './runtimeDegradationDriftAuditor';
import { noteInterventionAudit } from './runtimeInterventionAuditor';
import { recordSurvivabilityAuditTimeline } from './survivabilityAuditTimeline';

export type SurvivabilityAuditFlowResult = {
  flow: SurvivabilityAuditTimelineEntry['flow'];
  detailJa: string;
};

export function runEffectivenessValidationFlow(input: SurvivabilityAuditObserveInput): SurvivabilityAuditFlowResult {
  const eff = scoreSurvivabilityEffectiveness(input);
  noteDegradationSample(input);
  const lagImprove = 1 - Math.min(1, input.eventLoopLagMs / 500);
  const wsImprove = 1 - Math.min(1, input.reconnectPerMin / 15);
  return {
    flow: 'effectiveness_validation',
    detailJa: `effectiveness ${eff} · lag ${lagImprove} · ws ${wsImprove} · thermal ${input.thermalState}`,
  };
}

export function runBlindSpotDetectionFlow(input: SurvivabilityAuditObserveInput): SurvivabilityAuditFlowResult {
  const risk = scoreRuntimeBlindSpotRisk(input);
  const spots = detectBlindSpots(input);
  void buildBlindSpotMap(input);
  return {
    flow: 'blind_spot_detection',
    detailJa: `risk ${risk} · gaps ${spots.join(',') || 'none'}`,
  };
}

export function runRecoverySideEffectFlow(input: SurvivabilityAuditObserveInput): SurvivabilityAuditFlowResult {
  const risk = scoreRecoverySideEffectRisk(input);
  const chain = detectRecoverySideEffectChain(input);
  return {
    flow: 'recovery_side_effect',
    detailJa: `risk ${risk} · chain ${chain.join('→') || 'none'}`,
  };
}

export function runOverfittingDetectionFlow(input: SurvivabilityAuditObserveInput): SurvivabilityAuditFlowResult {
  const risk = scoreSurvivabilityOverfittingRisk(input);
  const heatmap = buildOverfittingHeatmap(input);
  return {
    flow: 'overfitting_detection',
    detailJa: `risk ${risk} · redmi ${heatmap.redmi ?? 0} · miui ${heatmap.miui_reclaim ?? 0}`,
  };
}

export function runStabilizationCostFlow(input: SurvivabilityAuditObserveInput): SurvivabilityAuditFlowResult {
  const eff = scoreStabilizationCostEfficiency(input);
  return {
    flow: 'stabilization_cost',
    detailJa: `efficiency ${eff} · overhead ${input.observerOverheadRatio} · amp ${input.telemetryAmplificationScore}`,
  };
}

export function runEquilibriumValidationFlow(input: SurvivabilityAuditObserveInput): SurvivabilityAuditFlowResult {
  const integrity = scoreRuntimeEquilibriumIntegrity(input);
  return {
    flow: 'equilibrium_validation',
    detailJa: `integrity ${integrity} · equilibrium ${input.runtimeEquilibriumStability}`,
  };
}

export function runLongSessionAuditFlow(input: SurvivabilityAuditObserveInput): SurvivabilityAuditFlowResult {
  const flags = longSessionAuditFlags(input);
  return {
    flow: 'long_session_audit',
    detailJa: flags.length > 0 ? flags.join(' · ') : `session ${input.sessionMinutes}min ok`,
  };
}

export function runContinuityValidationFlow(input: SurvivabilityAuditObserveInput): SurvivabilityAuditFlowResult {
  const integrity = scoreContinuityIntegrity(input);
  const features = validateTradingContinuityFeatures(input);
  const maintained = Object.entries(features).filter(([, v]) => v).map(([k]) => k);
  return {
    flow: 'continuity_validation',
    detailJa: `integrity ${integrity} · maintained ${maintained.join(',') || 'none'}`,
  };
}

export function runResilienceEvolutionFlow(
  input: SurvivabilityAuditObserveInput,
  effectiveness: number,
): SurvivabilityAuditFlowResult {
  noteInterventionAudit();
  const before = effectiveness * 0.95;
  const rate = computeImprovementRate(before, effectiveness);
  return {
    flow: 'resilience_evolution',
    detailJa: `improvement rate ${rate} · session ${input.sessionMinutes}min`,
  };
}

export function runSurvivabilityAuditFlows(
  input: SurvivabilityAuditObserveInput,
  effectiveness: number,
): SurvivabilityAuditFlowResult[] {
  const results = [
    runEffectivenessValidationFlow(input),
    runBlindSpotDetectionFlow(input),
    runRecoverySideEffectFlow(input),
    runOverfittingDetectionFlow(input),
    runStabilizationCostFlow(input),
    runEquilibriumValidationFlow(input),
    runLongSessionAuditFlow(input),
    runContinuityValidationFlow(input),
    runResilienceEvolutionFlow(input, effectiveness),
  ];
  for (const r of results) recordSurvivabilityAuditTimeline(r.flow, r.detailJa);
  void isSuppressionExcessive(input, scoreRuntimeBlindSpotRisk(input));
  return results;
}
