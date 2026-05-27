export {
  initRuntimeMetaCognition,
  observeRuntimeMetaCognition,
  shouldRunRuntimeMetaCognitionSample,
  getLastRuntimeMetaCognitionProfile,
  getRuntimeMetaCognitionDashboard,
  resetRuntimeMetaCognitionForTest,
  setRuntimeMetaCognitionSoakHookEnabled,
} from './metaCognitionCoordinator';

export { runMetaCognitionFlows } from './metaCognitionOrchestrator';

export {
  buildRuntimeMetaCognitionExportBundle,
  formatRuntimeMetaCognitionExportJson,
} from './metaCognitionExports';

export {
  simulateRecursiveSelfObservationReplay,
  simulateObserverSelfReferenceLockReplay,
  simulateCoherenceFixationSpiralReplay,
  simulateRecursiveAuditPersistenceReplay,
  simulateIntrospectionDependencyLockReplay,
  simulateSelfModelDriftCascadeReplay,
  simulateLongSessionIntrospectionDriftReplay,
  simulateSelfExplanationHallucinationReplay,
} from './metaCognitionSoakIntegration';

export { getMetaCognitionTimeline } from './metaCognitionTimeline';
