/**
 * Constitutional Runtime Coordinator — system-wide equilibrium.
 */
import type {
  ConstitutionalState,
  LayerPressureMap,
  RuntimeLayerId,
} from '../../types/runtimeConstitution';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import { CRISIS_SEVERITY_THRESHOLD, TENSION_SEVERITY_THRESHOLD } from '../../constants/runtimeConstitution';
import { getLastGovernanceState } from '../governance/adaptiveRuntimeGovernance';
import { getSelfHealingPhase } from '../selfHealing/runtimeSelfHealingOrchestrator';
import { getEvolutionHealthState } from '../evolution/runtimeEvolutionMonitor';
import { getJournalStats } from '../observability/runtimeEventJournal';
import { getConstitutionalRecoveryState } from './constitutionalRecoveryProtocol';

let constitutionalState: ConstitutionalState = 'BALANCED';

export function resetConstitutionCoordinatorForTest(): void {
  constitutionalState = 'BALANCED';
}

function phaseToPressure(phase: string, critical: string[], high: string[]): number {
  if (critical.some((p) => phase.includes(p))) return 0.9;
  if (high.some((p) => phase.includes(p))) return 0.65;
  if (phase.includes('HEALTHY') || phase.includes('STABLE') || phase.includes('BALANCED')) return 0.25;
  return 0.45;
}

export function collectLayerPressures(
  metrics: RuntimeTelemetryMetricsSnapshot,
): LayerPressureMap {
  const gov = getLastGovernanceState();
  const drift = gov?.drift.driftScore ?? 0;
  const journal = getJournalStats();
  const heal = getSelfHealingPhase();
  const evo = getEvolutionHealthState();
  const recovery = getConstitutionalRecoveryState();

  const governance = Math.min(1, drift + (gov?.contradictions.length ?? 0) * 0.08);
  const recoveryP = phaseToPressure(heal, ['EMERGENCY', 'SELF_HEALING'], ['RECOVERING']);
  const entropy = evo === 'STAGNATING' || evo === 'OVERFITTED' ? 0.75 : evo === 'EVOLVING' ? 0.35 : 0.5;
  const exploration = evo === 'EVOLVING' ? 0.55 : evo === 'COLLAPSING' ? 0.2 : 0.4;
  const asyncP = Math.min(1, metrics.asyncQueueDepth / 30 + metrics.asyncQueueLatencyMs / 500);
  const observability = Math.min(1, journal.count / 4000 + journal.bytesEstimate / 400_000);
  const survival = Math.min(
    1,
    metrics.memoryTrendPct / 100 + (metrics.thermalState === 'severe' ? 0.4 : 0),
  );

  if (recovery.active) {
    return {
      governance: governance * 0.5,
      recovery: 0.3,
      entropy: entropy * 0.6,
      exploration: 0.25,
      async: asyncP * 0.7,
      observability: observability * 0.6,
      survival: Math.max(survival, 0.6),
    };
  }

  return {
    governance,
    recovery: recoveryP,
    entropy,
    exploration,
    async: asyncP,
    observability,
    survival,
  };
}

export function resolveConstitutionalState(
  pressures: LayerPressureMap,
  conflictSeverity: number,
): ConstitutionalState {
  const values = Object.values(pressures);
  const max = Math.max(...values);
  const spread = max - Math.min(...values);

  if (getConstitutionalRecoveryState().active) return 'CONSTITUTIONAL_CRISIS';
  if (conflictSeverity >= CRISIS_SEVERITY_THRESHOLD || max >= 0.92) return 'CONSTITUTIONAL_CRISIS';
  if (conflictSeverity >= TENSION_SEVERITY_THRESHOLD || spread >= 0.55) return 'POLARIZED';
  if (conflictSeverity >= 0.3 || spread >= 0.38) return 'TENSION';
  if (max >= 0.75) return 'UNSTABLE';
  if (max < 0.55 && spread < 0.3) return 'BALANCED';
  return 'TENSION';
}

export function getConstitutionalState(): ConstitutionalState {
  return constitutionalState;
}

export function updateConstitutionalState(next: ConstitutionalState): void {
  constitutionalState = next;
}

export function computeLayerDominanceIndex(pressures: LayerPressureMap): RuntimeLayerId {
  let dominant: RuntimeLayerId = 'survival';
  let max = 0;
  for (const [layer, p] of Object.entries(pressures) as [RuntimeLayerId, number][]) {
    if (p > max) {
      max = p;
      dominant = layer;
    }
  }
  return dominant;
}

export function computeEquilibriumScore(pressures: LayerPressureMap): number {
  const values = Object.values(pressures);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.round(Math.max(0, 1 - Math.sqrt(variance) * 1.4) * 1000) / 1000;
}
