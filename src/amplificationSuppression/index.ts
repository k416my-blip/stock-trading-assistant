export {
  initAmplificationSuppression,
  observeAmplificationSuppression,
  shouldRunAmplificationSuppressionSample,
  getLastAmplificationSuppressionProfile,
  getAmplificationSuppressionDashboard,
  resetAmplificationSuppressionForTest,
  setAmplificationSuppressionSoakHookEnabled,
} from './amplificationSuppressionCoordinator';

export { runAmplificationSuppressionFlows } from './amplificationSuppressionOrchestrator';

export {
  buildAmplificationSuppressionExportBundle,
  formatAmplificationSuppressionExportJson,
  buildAmplificationIncidentReportExport,
  buildRecursionSuppressionReportExport,
  buildStabilizationEquilibriumReportExport,
} from './amplificationSuppressionExports';

export {
  simulateObserverStormReplay,
  simulateTelemetryRecursionReplay,
  simulateWebsocketStormReplay,
  simulateRecoveryCascadeReplay,
  simulateThermalAmplificationReplay,
  simulateMiuiReclaimReplay,
  simulateLongSessionOverloadReplay,
} from './amplificationSuppressionSoakIntegration';

export { getAmplificationTimeline } from './amplificationSuppressionTimeline';
