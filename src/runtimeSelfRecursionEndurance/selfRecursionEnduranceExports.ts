import type { RuntimeSelfRecursionEnduranceExportBundle } from '../types/runtimeSelfRecursionEndurance';
import { RUNTIME_SELF_RECURSION_ENDURANCE_VERSION } from '../constants/runtimeSelfRecursionEndurance';
import { getLastRuntimeSelfRecursionEnduranceProfile } from './selfRecursionEnduranceCoordinator';
import { getSelfRecursionEnduranceEvolution } from './selfRecursionEnduranceEvolutionCoordinator';
import { getSuppressionSuggestionsRecent } from './observeOnlyCircuitBreakerScorer';
import { getSelfRecursionEnduranceTimeline } from './selfRecursionEnduranceTimeline';

export function buildRuntimeSelfRecursionEnduranceExportBundle(): RuntimeSelfRecursionEnduranceExportBundle {
  const profile = getLastRuntimeSelfRecursionEnduranceProfile();
  return {
    version: RUNTIME_SELF_RECURSION_ENDURANCE_VERSION,
    exportedAt: new Date().toISOString(),
    circuitBreakerReport: {
      suggestions: getSuppressionSuggestionsRecent(24),
      observeOnly: true,
    },
    recursionCircuitReport: { profile, evolution: getSelfRecursionEnduranceEvolution() },
    operationalEnduranceReport: { profile, timeline: getSelfRecursionEnduranceTimeline() },
    miuiEnduranceReport: {
      miuiBackgroundStarvationRisk: profile?.miuiBackgroundStarvationRisk,
      batterySaverObserverDelayRisk: profile?.batterySaverObserverDelayRisk,
    },
    suppressionSuggestions: getSuppressionSuggestionsRecent(24),
    profile,
  };
}

export function formatRuntimeSelfRecursionEnduranceExportJson(): string {
  return JSON.stringify(buildRuntimeSelfRecursionEnduranceExportBundle(), null, 2);
}
