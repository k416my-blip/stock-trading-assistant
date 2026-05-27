import type { CausalIntelligenceExportBundle } from '../types/runtimeCausalIntelligence';
import { RUNTIME_CAUSAL_INTELLIGENCE_VERSION } from '../constants/runtimeCausalIntelligence';
import { getCausalTimeline, getSurvivabilityCausalityEvolution } from './survivabilityCausalityTimeline';
import {
  getLastCausalIntelligenceProfile,
  getLastCausalGraphSnapshot,
} from './causalIntelligenceCoordinator';
import { getDependencyEdges } from './runtimeEventDependencyTracker';

export function buildCausalTimelineExport(): CausalIntelligenceExportBundle['causalTimeline'] {
  return getCausalTimeline();
}

export function buildIncidentGraphExport(): CausalIntelligenceExportBundle['incidentGraph'] {
  return (
    getLastCausalGraphSnapshot() ?? {
      nodes: [],
      edges: [],
      measuredAt: new Date().toISOString(),
    }
  );
}

export function buildRecoveryAttributionReportExport(): Record<string, unknown> {
  const profile = getLastCausalIntelligenceProfile();
  return {
    recoveryAttribution: profile?.recoveryAttribution ?? 0,
    exportedAt: new Date().toISOString(),
  };
}

export function buildDegradationPropagationMapExport(): CausalIntelligenceExportBundle['degradationPropagationMap'] {
  return getDependencyEdges();
}

export function buildCausalIntelligenceExportBundle(): CausalIntelligenceExportBundle {
  return {
    version: RUNTIME_CAUSAL_INTELLIGENCE_VERSION,
    exportedAt: new Date().toISOString(),
    causalTimeline: buildCausalTimelineExport(),
    incidentGraph: buildIncidentGraphExport(),
    recoveryAttributionReport: buildRecoveryAttributionReportExport(),
    degradationPropagationMap: buildDegradationPropagationMapExport(),
    survivabilityCausalityEvolution: getSurvivabilityCausalityEvolution(),
    profile: getLastCausalIntelligenceProfile(),
  };
}

export function formatCausalIntelligenceExportJson(): string {
  return JSON.stringify(buildCausalIntelligenceExportBundle(), null, 2);
}
