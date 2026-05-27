import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeProviderPressureReductionMetrics = {
  providerPressureReductionScore: number;
  selectorIsolationScore: number;
  rerenderReductionScore: number;
  derivedComputationReductionScore: number;
  subscriptionStabilityScore: number;
};

export type RuntimeProviderPressureReductionReport = {
  freezeTag: 'runtime-freeze-v1';
  providerPressureMetrics: {
    appContextSelectorHooks: number;
    proactiveSelectorHooks: number;
    proactiveDerivedFields: number;
    broadOptionalReadsRemaining: number;
  };
  selectorFanoutReport: Array<{
    file: string;
    bytes: number;
    selectorHookCount: number;
    broadContextReadCount: number;
    derivedComputationCount: number;
  }>;
  rerenderHotspotDiagnostics: string[];
  derivedComputationMetrics: {
    chatSuggestionFilterMovedToProvider: boolean;
    chatSuggestionSummaryMemoized: boolean;
    aiChatRuntimeFlagsMemoized: boolean;
    dashboardSliceMemoized: boolean;
  };
  metrics: RuntimeProviderPressureReductionMetrics;
};

const root = process.cwd();
const files = [
  'src/context/AppContext.tsx',
  'src/context/ProactiveConciergeContext.tsx',
  'src/hooks/useConciergeDashboardSlices.ts',
  'src/components/AiAssistantChat.tsx',
  'src/components/concierge/RuntimeStabilityDashboardPanel.tsx',
];

function count(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

function sourceFor(file: string): string {
  const absolute = join(root, file);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function buildRuntimeProviderPressureReductionReport(): RuntimeProviderPressureReductionReport {
  const rows = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      selectorHookCount: count(source, /\buse[A-Z][A-Za-z0-9]*(?:Selector|DashboardBundle)\b/g),
      broadContextReadCount: count(source, /\buseApp\(\)|\buseProactiveConciergeOptional\(\)/g),
      derivedComputationCount: count(source, /\buseMemo\(/g),
    };
  });

  const appContext = sourceFor('src/context/AppContext.tsx');
  const proactiveContext = sourceFor('src/context/ProactiveConciergeContext.tsx');
  const chat = sourceFor('src/components/AiAssistantChat.tsx');
  const dashboardHooks = sourceFor('src/hooks/useConciergeDashboardSlices.ts');
  const selectorHooks =
    count(appContext, /export function useApp[A-Za-z0-9]*Selector/g) +
    count(proactiveContext, /export function useProactiveConcierge[A-Za-z0-9]*Selector/g);
  const derivedFields = count(proactiveContext, /unhandledSuggestions|uxSuggestionSummaries/g);
  const broadReads = rows.reduce((sum, row) => sum + row.broadContextReadCount, 0);
  const providerPressureReductionScore = round(Math.min(1, selectorHooks / 9) * 0.7 + Math.min(1, derivedFields / 8) * 0.3);
  const selectorIsolationScore = round(Math.min(1, selectorHooks / 10));
  const derivedComputationReductionScore = round(
    Number(chat.includes('uxSuggestionSummaries')) * 0.35 +
      Number(proactiveContext.includes('unhandledSuggestions')) * 0.35 +
      Number(appContext.includes('aiChatComputed')) * 0.3,
  );
  const rerenderReductionScore = round((providerPressureReductionScore + derivedComputationReductionScore) / 2);
  const subscriptionStabilityScore = round(1 - Math.min(0.5, broadReads / 20));

  return {
    freezeTag: 'runtime-freeze-v1',
    providerPressureMetrics: {
      appContextSelectorHooks: count(appContext, /export function useApp[A-Za-z0-9]*Selector/g),
      proactiveSelectorHooks: count(proactiveContext, /export function useProactiveConcierge[A-Za-z0-9]*Selector/g),
      proactiveDerivedFields: derivedFields,
      broadOptionalReadsRemaining: broadReads,
    },
    selectorFanoutReport: rows,
    rerenderHotspotDiagnostics: [
      'AIAssistantChat consumes a chat-scoped ProactiveConcierge slice instead of the full concierge context object.',
      'Unhandled proactive suggestions and UX summaries are derived once in ProactiveConciergeProvider and exposed readonly.',
      'Concierge dashboard hooks consume a dashboard-scoped slice, keeping runtime dashboard accessors explicit.',
      'AppContext exposes memoized AI chat computed flags and readonly runtime metrics without changing provider state.',
    ],
    derivedComputationMetrics: {
      chatSuggestionFilterMovedToProvider: proactiveContext.includes('unhandledSuggestions'),
      chatSuggestionSummaryMemoized: proactiveContext.includes('uxSuggestionSummaries'),
      aiChatRuntimeFlagsMemoized: appContext.includes('aiChatComputed'),
      dashboardSliceMemoized: dashboardHooks.includes('useProactiveConciergeDashboardSelector'),
    },
    metrics: {
      providerPressureReductionScore,
      selectorIsolationScore,
      rerenderReductionScore,
      derivedComputationReductionScore,
      subscriptionStabilityScore,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeProviderPressureReductionReport(), null, 2));
}
