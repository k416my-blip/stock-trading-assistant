export {
  initRuntimeOntology,
  observeRuntimeOntology,
  shouldRunRuntimeOntologySample,
  getLastRuntimeOntologyProfile,
  getRuntimeOntologyDashboard,
  getRuntimeOntologyWarnings,
  resetRuntimeOntologyForTest,
  setRuntimeOntologySoakHookEnabled,
} from './ontologyCoordinator';

export { runOntologyFlows } from './ontologyOrchestrator';
export {
  buildRuntimeOntologyExportBundle,
  formatRuntimeOntologyExportJson,
} from './ontologyExports';
export {
  simulateSymbolicMeaningCollapseReplay,
  simulateRecursiveOntologyAmplificationReplay,
  simulateObserverGeneratedUniverseLoopReplay,
  simulateSemanticAnchorErosionReplay,
  simulateNarrativeRealityInversionReplay,
  simulateSymbolicClosedLoopExplosionReplay,
  simulateOntologyFragmentationStormReplay,
  simulateSemanticGravityCollapseReplay,
  simulateRecursiveSymbolicInflationReplay,
} from './ontologySoakIntegration';
