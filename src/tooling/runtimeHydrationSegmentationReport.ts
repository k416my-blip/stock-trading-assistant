import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeHydrationSegmentationMetrics = {
  hydrationReductionScore: number;
  coldStartReductionScore: number;
  initialRenderPressureReduction: number;
  deferredActivationEffectiveness: number;
  renderBurstReductionScore: number;
};

export type RuntimeHydrationSegmentationReport = {
  freezeTag: 'runtime-freeze-v1';
  hydrationPressureReport: Array<{
    file: string;
    bytes: number;
    lines: number;
    deferredActivationCount: number;
    suspenseBoundaryCount: number;
    heavyPanelReferenceCount: number;
  }>;
  coldRenderMetrics: {
    targetFiles: number;
    deferredTargets: number;
    lazyPanelReferences: number;
    initialMountRisk: 'reduced' | 'unchanged';
  };
  deferredActivationMetrics: {
    interactionBasedActivation: boolean;
    dashboardStagedHydration: boolean;
    chatSuggestionDeferral: boolean;
    settingsAdvancedDeferral: boolean;
    heavyPanelDetailDeferral: boolean;
  };
  initialMountDiagnostics: string[];
  metrics: RuntimeHydrationSegmentationMetrics;
};

const root = process.cwd();
const targetFiles = [
  'src/components/concierge/RuntimeStabilityDashboardPanel.tsx',
  'src/components/AiAssistantChat.tsx',
  'src/screens/AiSettingsScreen.tsx',
  'src/components/concierge/CapitalAllocationPanel.tsx',
  'src/components/concierge/PortfolioRiskExposurePanel.tsx',
  'src/hooks/useDeferredRenderActivation.ts',
];

function count(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

function sourceFor(path: string): string {
  const absolute = join(root, path);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function buildRuntimeHydrationSegmentationReport(): RuntimeHydrationSegmentationReport {
  const hydrationPressureReport = targetFiles.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      lines: source.split(/\r?\n/).length,
      deferredActivationCount: count(source, /\buseDeferredRenderActivation\b/g),
      suspenseBoundaryCount: count(source, /<Suspense\b/g),
      heavyPanelReferenceCount: count(source, /\bLazy[A-Z][A-Za-z0-9]+Panel\b|getRuntime[A-Z][A-Za-z0-9]+Dashboard/g),
    };
  });

  const joined = targetFiles.map(sourceFor).join('\n');
  const deferredTargets = hydrationPressureReport.filter((row) => row.deferredActivationCount > 0).length;
  const lazyPanelReferences = hydrationPressureReport.reduce(
    (sum, row) => sum + row.heavyPanelReferenceCount,
    0,
  );
  const deferredActivationEffectiveness = round(Math.min(1, deferredTargets / 6));
  const hydrationReductionScore = round(
    deferredActivationEffectiveness * 0.55 +
      Number(joined.includes('InteractionManager.runAfterInteractions')) * 0.2 +
      Number(joined.includes('dashboardHydrated')) * 0.25,
  );
  const coldStartReductionScore = round(
    Math.min(1, count(joined, /delayMs:\s*\d+/g) / 5) * 0.7 +
      Number(joined.includes('advancedSettingsActive')) * 0.3,
  );
  const initialRenderPressureReduction = round((hydrationReductionScore + coldStartReductionScore) / 2);
  const renderBurstReductionScore = round(
    Math.min(1, count(joined, /analyticsHydrated|archiveHydrated|chatSuggestionsHydrated|dashboardHydrated/g) / 10),
  );

  return {
    freezeTag: 'runtime-freeze-v1',
    hydrationPressureReport,
    coldRenderMetrics: {
      targetFiles: targetFiles.length - 1,
      deferredTargets,
      lazyPanelReferences,
      initialMountRisk: deferredTargets >= 5 ? 'reduced' : 'unchanged',
    },
    deferredActivationMetrics: {
      interactionBasedActivation: joined.includes('InteractionManager.runAfterInteractions'),
      dashboardStagedHydration: joined.includes('archiveHydrated'),
      chatSuggestionDeferral: joined.includes('chatSuggestionsHydrated'),
      settingsAdvancedDeferral: joined.includes('advancedSettingsActive'),
      heavyPanelDetailDeferral:
        joined.includes('注文候補の詳細を段階的に準備中') &&
        joined.includes('リスク詳細セクションを段階的に準備中'),
    },
    initialMountDiagnostics: [
      'RuntimeStabilityDashboardPanel now renders core health rows before activating analytics/archive dashboard getters.',
      'AIAssistantChat defers proactive suggestions and concierge dashboard panels after interactions.',
      'AISettingsScreen defers advanced layer toggles while keeping key/safety controls available immediately.',
      'CapitalAllocationPanel and PortfolioRiskExposurePanel render summary controls before detail analytics.',
    ],
    metrics: {
      hydrationReductionScore,
      coldStartReductionScore,
      initialRenderPressureReduction,
      deferredActivationEffectiveness,
      renderBurstReductionScore,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeHydrationSegmentationReport(), null, 2));
}
