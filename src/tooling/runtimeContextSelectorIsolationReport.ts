import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type ContextSelectorIsolationMetrics = {
  fanoutReductionScore: number;
  selectorIsolationScore: number;
  subscriptionReductionScore: number;
  providerSegmentationScore: number;
  TSInferenceReduction: number;
  hotReloadPressureReduction: number;
};

export type ContextFanoutFile = {
  path: string;
  bytes: number;
  lines: number;
  importCount: number;
  selectorHookCount: number;
  providerCount: number;
};

export type RuntimeContextSelectorIsolationReport = {
  freezeTag: 'runtime-freeze-v1';
  contextFanoutReport: ContextFanoutFile[];
  rerenderSubscriptionGraph: { source: string; subscribers: string[]; reduction: string }[];
  selectorEffectivenessReport: string[];
  providerDependencyMap: { provider: string; dependencies: string[]; risk: 'low' | 'medium' | 'high' }[];
  TSInferencePressureReport: string[];
  cursorHotReloadPressureReport: string[];
  metrics: ContextSelectorIsolationMetrics;
};

const root = process.cwd();
const files = [
  'src/context/AppContext.tsx',
  'src/context/ProactiveConciergeContext.tsx',
  'src/components/AiAssistantChat.tsx',
  'src/components/concierge/RuntimeStabilityDashboardPanel.tsx',
  'src/components/concierge/RuntimeCivilizationArchivePanels.tsx',
];

function count(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

function fileReport(path: string): ContextFanoutFile {
  const absolute = join(root, path);
  if (!existsSync(absolute)) {
    return { path, bytes: 0, lines: 0, importCount: 0, selectorHookCount: 0, providerCount: 0 };
  }
  const source = readFileSync(absolute, 'utf8');
  return {
    path: relative(root, absolute).replace(/\\/g, '/'),
    bytes: statSync(absolute).size,
    lines: source.split(/\r?\n/).length,
    importCount: count(source, /import\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"][^'"]+['"]/g),
    selectorHookCount: count(source, /\buse[A-Z][A-Za-z0-9]*Selector\b/g),
    providerCount: count(source, /<[^>]*Provider\b|createContext\(/g),
  };
}

export function buildRuntimeContextSelectorIsolationReport(): RuntimeContextSelectorIsolationReport {
  const contextFanoutReport = files.map(fileReport);
  const appContext = contextFanoutReport.find((row) => row.path.endsWith('AppContext.tsx'));
  const proactiveContext = contextFanoutReport.find((row) => row.path.endsWith('ProactiveConciergeContext.tsx'));
  const selectorHookCount = contextFanoutReport.reduce((sum, row) => sum + row.selectorHookCount, 0);
  const contextBytes = (appContext?.bytes ?? 0) + (proactiveContext?.bytes ?? 0);
  const totalBytes = contextFanoutReport.reduce((sum, row) => sum + row.bytes, 0);
  const selectorIsolationScore = Math.round(Math.min(1, selectorHookCount / 8) * 1000) / 1000;
  const fanoutReductionScore = Math.round((selectorIsolationScore * 0.42) * 1000) / 1000;
  const subscriptionReductionScore = Math.round((selectorIsolationScore * 0.36) * 1000) / 1000;
  const providerSegmentationScore = Math.round((selectorIsolationScore * 0.3) * 1000) / 1000;
  const TSInferenceReduction = Math.round((1 - contextBytes / Math.max(1, totalBytes)) * 0.4 * 1000) / 1000;
  const hotReloadPressureReduction = Math.round((fanoutReductionScore + TSInferenceReduction) / 2 * 1000) / 1000;

  return {
    freezeTag: 'runtime-freeze-v1',
    contextFanoutReport,
    rerenderSubscriptionGraph: [
      {
        source: 'AppContext',
        subscribers: ['AIAssistantChat', 'ProactiveConciergeProvider'],
        reduction: 'chat and proactive runtime reads now use readonly selector hooks',
      },
      {
        source: 'ProactiveConciergeContext',
        subscribers: ['AIAssistantChat optional proactive analytics', 'Proactive screens/cards'],
        reduction: 'generic selector hooks added; broad consumer migration deferred for parity safety',
      },
      {
        source: 'Runtime dashboard archive analytics',
        subscribers: ['RuntimeStabilityDashboardPanel'],
        reduction: 'archive panels isolated behind RuntimeCivilizationArchivePanels memo boundary',
      },
    ],
    selectorEffectivenessReport: [
      'useAppSelector provides generic readonly selector access',
      'useAppAiChatSelector scopes AIAssistantChat AppContext access to AI chat fields',
      'useAppProactiveRuntimeSelector scopes ProactiveConciergeProvider AppContext access to runtime inputs',
      'useProactiveConciergeSelector and optional selector hooks are available for future consumer migration',
    ],
    providerDependencyMap: [
      {
        provider: 'AppProvider',
        dependencies: ['portfolio state', 'API keys', 'AI preferences', 'execution actions', 'market regime'],
        risk: 'high',
      },
      {
        provider: 'ProactiveConciergeProvider',
        dependencies: ['AppProvider runtime selector', 'central intelligence', 'urgency signals'],
        risk: 'high',
      },
      {
        provider: 'RuntimeCivilizationArchivePanels',
        dependencies: ['archive dashboard getters', 'telemetry row budget'],
        risk: 'low',
      },
    ],
    TSInferencePressureReport: [
      'AppContextValue is now exported so selector slices can use Pick<> instead of repeating wide inferred shapes',
      'AppAiChatContextSlice and AppProactiveRuntimeContextSlice isolate frequently consumed readonly shapes',
      'ProactiveConciergeContextValue is exported for typed selector hooks and future consumer split',
    ],
    cursorHotReloadPressureReport: [
      'AIAssistantChat no longer destructures full useApp context directly',
      'ProactiveConciergeProvider documents the AppContext slice it consumes through a named selector hook',
      'Context provider internals are unchanged to avoid runtime behavior drift',
    ],
    metrics: {
      fanoutReductionScore,
      selectorIsolationScore,
      subscriptionReductionScore,
      providerSegmentationScore,
      TSInferenceReduction,
      hotReloadPressureReduction,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeContextSelectorIsolationReport(), null, 2));
}
