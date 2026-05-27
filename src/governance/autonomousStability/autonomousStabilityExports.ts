import type { AutonomousGovernanceExportBundle } from '../../types/autonomousStabilityGovernance';
import { AUTONOMOUS_STABILITY_GOVERNANCE_VERSION } from '../../constants/autonomousStabilityGovernance';
import { getGovernanceTimeline } from './autonomousRuntimeAdaptationTimeline';
import {
  getLastAutonomousGovernanceProfile,
  getSurvivabilityEvolutionTimeline,
} from './autonomousStabilityCoordinator';
import { getObserverSuppressionLog } from './observerSuppressionOptimizer';
import { getRecoveryEfficiency } from './recoveryEffectivenessAnalyzer';

export function buildGovernanceTimelineExport(): AutonomousGovernanceExportBundle['timeline'] {
  return getGovernanceTimeline();
}

export function buildAdaptationTransitionsExport(): AutonomousGovernanceExportBundle['adaptationTransitions'] {
  return getGovernanceTimeline().filter((e) => e.flow === 'adaptation' || e.flow === 'hysteresis');
}

export function buildObserverSuppressionLogExport(): Record<string, unknown>[] {
  return getObserverSuppressionLog();
}

export function buildRecoveryEffectivenessReport(): Record<string, unknown> {
  return {
    recoveryEfficiency: getRecoveryEfficiency(),
    exportedAt: new Date().toISOString(),
  };
}

export function buildAutonomousGovernanceExportBundle(): AutonomousGovernanceExportBundle {
  return {
    version: AUTONOMOUS_STABILITY_GOVERNANCE_VERSION,
    exportedAt: new Date().toISOString(),
    timeline: buildGovernanceTimelineExport(),
    adaptationTransitions: buildAdaptationTransitionsExport(),
    observerSuppressionLog: buildObserverSuppressionLogExport(),
    recoveryEffectivenessReport: buildRecoveryEffectivenessReport(),
    survivabilityEvolutionTimeline: getSurvivabilityEvolutionTimeline(),
    profile: getLastAutonomousGovernanceProfile(),
  };
}

export function formatAutonomousGovernanceExportJson(): string {
  return JSON.stringify(buildAutonomousGovernanceExportBundle(), null, 2);
}
