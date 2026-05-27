export {
  initRuntimeSelfRecursionEndurance,
  observeRuntimeSelfRecursionEndurance,
  shouldRunRuntimeSelfRecursionEnduranceSample,
  getLastRuntimeSelfRecursionEnduranceProfile,
  getRuntimeSelfRecursionEnduranceDashboard,
  resetRuntimeSelfRecursionEnduranceForTest,
  setRuntimeSelfRecursionEnduranceSoakHookEnabled,
} from './selfRecursionEnduranceCoordinator';

export { runSelfRecursionEnduranceFlows } from './selfRecursionEnduranceOrchestrator';
export {
  buildRuntimeSelfRecursionEnduranceExportBundle,
  formatRuntimeSelfRecursionEnduranceExportJson,
} from './selfRecursionEnduranceExports';
export {
  simulateObserverAuditLoopReplay,
  simulateTelemetryEchoLoopReplay,
  simulateRecursiveGovernanceFeedbackReplay,
  simulateDashboardPayloadGrowthReplay,
  simulateLongSessionDriftReplay,
  simulateMiuiBackgroundStarvationReplay,
  simulateBatterySaverObserverDelayReplay,
  simulateNarrativeRecursionAmplificationReplay,
} from './selfRecursionEnduranceSoakIntegration';
