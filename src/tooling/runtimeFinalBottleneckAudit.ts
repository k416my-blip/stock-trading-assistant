import { buildRuntimeContextSelectorIsolationReport } from './runtimeContextSelectorIsolationReport';
import { buildRuntimePerformanceBaselineReport, type FileHotspot } from './runtimePerformanceBaseline';
import { buildRuntimeUiDecouplingReport } from './runtimeUiDecouplingReport';

export type FinalBottleneckMetricSet = {
  estimatedCursorLatency: number;
  estimatedTSLoadReduction: number;
  estimatedHotReloadGain: number;
  indexingPressureScore: number;
  dependencyComplexityScore: number;
  runtimeFreezeIntegrityScore: number;
};

export type FinalBottleneckAuditReport = {
  freezeTag: 'runtime-freeze-v1';
  runtimeBottleneckReport: {
    top10Bottlenecks: FileHotspot[];
    hydrationBottlenecks: string[];
    slowModuleChains: string[];
    providerPressure: string[];
  };
  tsPressureReport: {
    slowInferenceChains: FileHotspot[];
    recursiveTypeHotspots: FileHotspot[];
    giantGenericPressure: FileHotspot[];
    symbolExplosionSources: string[];
  };
  cursorPressureReport: {
    indexingPressure: number;
    largeFilePressure: FileHotspot[];
    editLatencySources: string[];
    autocompleteLatencySources: string[];
    watcherPressure: string[];
  };
  importGraphReport: {
    importGraphDepth: number;
    oversizedImportHubs: { path: string; importCount: number }[];
    duplicatedImports: { specifier: string; count: number }[];
    coldOnlyDependencyChains: string[];
  };
  rerenderHotspotReport: {
    rerenderHotspots: string[];
    subscriptionDensity: string[];
    contextPropagationChains: string[];
  };
  optimizationRiskAssessment: {
    moreOptimizationWorthIt: 'yes-targeted-only' | 'no-stop' | 'risky';
    estimatedRemainingGains: string;
    optimizationDangerLevel: 'low' | 'medium' | 'high';
    recommendedStoppingPoint: string;
    forbiddenMutationZones: string[];
  };
  metrics: FinalBottleneckMetricSet;
};

function round(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
}

export async function buildRuntimeFinalBottleneckAudit(): Promise<FinalBottleneckAuditReport> {
  const baseline = await buildRuntimePerformanceBaselineReport();
  const ui = buildRuntimeUiDecouplingReport();
  const selector = buildRuntimeContextSelectorIsolationReport();
  const top10Bottlenecks = baseline.typeScriptOptimizationReport.compileAmplificationZones;
  const largeFilePressure = baseline.heaviestFilesTop10;
  const contextFiles = selector.contextFanoutReport.filter((file) => file.path.includes('/context/'));
  const contextBytes = contextFiles.reduce((sum, file) => sum + file.bytes, 0);
  const topBytes = largeFilePressure.reduce((sum, file) => sum + file.bytes, 0);
  const contextPressure = contextBytes / Math.max(1, topBytes);
  const dependencyComplexityScore = round(
    baseline.cursorLoadAnalysis.importGraphDepth / 12 * 0.45 +
      baseline.cursorLoadAnalysis.verifyDependencyDepth / 10 * 0.25 +
      baseline.cursorLoadAnalysis.scenarioLookupComplexity / 26 * 0.3,
  );
  const estimatedTSLoadReduction = round(
    (baseline.archiveEfficiencyReport.verifyTierEffectiveness +
      ui.metrics.TSComplexityReduction +
      selector.metrics.TSInferenceReduction) /
      3,
  );
  const estimatedHotReloadGain = round(
    (ui.metrics.cursorIndexPressureReduction + selector.metrics.hotReloadPressureReduction) / 2,
  );

  return {
    freezeTag: 'runtime-freeze-v1',
    runtimeBottleneckReport: {
      top10Bottlenecks,
      hydrationBottlenecks: [
        `cold registry hydration ${baseline.measuredHydration.registryHydrationMs}ms`,
        `cold dashboard metadata load ${baseline.measuredHydration.dashboardMetadataLoadMs}ms`,
        `module hydration reduction ${baseline.staticCosts.importHydrationReduction}`,
      ],
      slowModuleChains: top10Bottlenecks.slice(0, 5).map((file) => file.path),
      providerPressure: contextFiles.map(
        (file) => `${file.path}: ${file.bytes} bytes, ${file.importCount} imports, ${file.selectorHookCount} selector refs`,
      ),
    },
    tsPressureReport: {
      slowInferenceChains: baseline.typeScriptOptimizationReport.slowestInferredTypes,
      recursiveTypeHotspots: baseline.typeScriptOptimizationReport.deepestConditionalTypes,
      giantGenericPressure: baseline.dependencyGraphAnalysis.expensiveGenericTypes,
      symbolExplosionSources: [
        'large React context value surfaces',
        'dashboard archive analytics JSX',
        'AI chat structured response rendering',
        'settings screens with wide provider access',
      ],
    },
    cursorPressureReport: {
      indexingPressure: baseline.cursorLoadAnalysis.fileIndexingPressure,
      largeFilePressure,
      editLatencySources: [
        'large context providers',
        'dashboard JSX density',
        'AI assistant chat component breadth',
        'settings screen provider fan-out',
      ],
      autocompleteLatencySources: baseline.tsHotspotsTop10.slice(0, 5).map((file) => file.path),
      watcherPressure: [
        `${baseline.staticCosts.tsFileCount} TypeScript files scanned`,
        `${baseline.staticCosts.totalImportCount} import edges counted`,
        `${baseline.staticCosts.totalTsBytes} TypeScript bytes indexed`,
      ],
    },
    importGraphReport: {
      importGraphDepth: baseline.cursorLoadAnalysis.importGraphDepth,
      oversizedImportHubs: largeFilePressure
        .filter((file) => file.importCount >= 40)
        .map((file) => ({ path: file.path, importCount: file.importCount })),
      duplicatedImports: baseline.dependencyGraphAnalysis.duplicatedImports,
      coldOnlyDependencyChains: [
        'runtime archive dashboard analytics',
        'freeze/economics/operational-core tooling reports',
        'nightly/full runtime verification registry',
      ],
    },
    rerenderHotspotReport: {
      rerenderHotspots: ui.rerenderHotspots.map((hotspot) => hotspot.path),
      subscriptionDensity: selector.contextFanoutReport.map(
        (file) => `${file.path}: ${file.selectorHookCount} selector refs, ${file.providerCount} providers`,
      ),
      contextPropagationChains: selector.rerenderSubscriptionGraph.map(
        (row) => `${row.source} -> ${row.subscribers.join(', ')}`,
      ),
    },
    optimizationRiskAssessment: {
      moreOptimizationWorthIt: 'yes-targeted-only',
      estimatedRemainingGains:
        'Remaining gains are concentrated in AppContext, ProactiveConciergeContext, AIAssistantChat, and AISettingsScreen. Broad architecture changes are not worth the behavior risk.',
      optimizationDangerLevel: contextPressure >= 0.35 ? 'high' : 'medium',
      recommendedStoppingPoint:
        'Stop broad runtime/civilization optimization here. Only perform targeted UI/context extractions with parity tests and no provider/reducer semantics changes.',
      forbiddenMutationZones: [
        'runtime behavior',
        'recommendation logic',
        'execution logic',
        'AI reasoning',
        'orchestration',
        'trading logic',
        'policy semantics',
        'state machines',
        'reducers',
        'provider behavior',
      ],
    },
    metrics: {
      estimatedCursorLatency: round(
        baseline.cursorLoadAnalysis.tsServerPressure * 0.35 +
          baseline.cursorLoadAnalysis.fileIndexingPressure / 3 * 0.35 +
          contextPressure * 0.3,
      ),
      estimatedTSLoadReduction,
      estimatedHotReloadGain,
      indexingPressureScore: round(baseline.cursorLoadAnalysis.fileIndexingPressure / 3),
      dependencyComplexityScore,
      runtimeFreezeIntegrityScore: 1,
    },
  };
}

if (require.main === module) {
  buildRuntimeFinalBottleneckAudit()
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
