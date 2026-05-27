export {
  initRuntimeSemanticCompression,
  observeRuntimeSemanticCompression,
  shouldRunRuntimeSemanticCompressionSample,
  getLastRuntimeSemanticCompressionProfile,
  getRuntimeSemanticCompressionDashboard,
  getRuntimeSemanticCompressionSuggestions,
  resetRuntimeSemanticCompressionForTest,
  setRuntimeSemanticCompressionSoakHookEnabled,
} from './semanticCompressionCoordinator';

export { runSemanticCompressionFlows } from './semanticCompressionOrchestrator';
export {
  buildRuntimeSemanticCompressionExportBundle,
  formatRuntimeSemanticCompressionExportJson,
} from './semanticCompressionExports';
export {
  simulateMetricAliasExplosionReplay,
  simulateSemanticDuplicationStormReplay,
  simulateDashboardSemanticSaturationReplay,
  simulateRecursiveNamingCascadeReplay,
  simulateOntologyCompressionCollapseReplay,
  simulateObserverDependencyDeadlockReplay,
  simulateSemanticIdentityFragmentationReplay,
  simulateCanonicalizationRecursionLoopReplay,
} from './semanticCompressionSoakIntegration';
