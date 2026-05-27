export {
  initRuntimeNarrativeIntegrity,
  observeRuntimeNarrativeIntegrity,
  shouldRunRuntimeNarrativeIntegritySample,
  getLastRuntimeNarrativeIntegrityProfile,
  getRuntimeNarrativeIntegrityDashboard,
  resetRuntimeNarrativeIntegrityForTest,
  setRuntimeNarrativeIntegritySoakHookEnabled,
} from './narrativeIntegrityCoordinator';

export { runNarrativeIntegrityFlows } from './narrativeIntegrityOrchestrator';

export {
  buildRuntimeNarrativeIntegrityExportBundle,
  formatRuntimeNarrativeIntegrityExportJson,
} from './narrativeIntegrityExports';

export {
  simulateRecursiveNarrativeInflationReplay,
  simulateSemanticDriftAccumulationReplay,
  simulateExplanationLoopFixationReplay,
  simulateNarrativeLockInReplay,
  simulateCoherenceMythologyReplay,
  simulateStorylineSelfReinforcementReplay,
  simulateLongSessionNarrativeDriftReplay,
  simulateSemanticHallucinationPersistenceReplay,
} from './narrativeIntegritySoakIntegration';

export { getNarrativeIntegrityTimeline } from './narrativeIntegrityTimeline';
