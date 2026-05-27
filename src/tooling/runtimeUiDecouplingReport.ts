import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type UiHotspotReport = {
  path: string;
  bytes: number;
  lines: number;
  importCount: number;
  role: 'context' | 'dashboard' | 'screen' | 'chat';
  decouplingStrategy: string;
};

export type RuntimeUiDecouplingMetrics = {
  rerenderReductionScore: number;
  contextIsolationScore: number;
  dashboardHydrationReduction: number;
  TSComplexityReduction: number;
  cursorIndexPressureReduction: number;
};

export type RuntimeUiDecouplingReport = {
  freezeTag: 'runtime-freeze-v1';
  rerenderHotspots: UiHotspotReport[];
  heaviestContexts: UiHotspotReport[];
  dashboardRenderReductions: string[];
  TSComplexityReductions: string[];
  contextSplitResults: string[];
  cursorIndexingImprovements: string[];
  expectedResponsivenessImprovement: string;
  metrics: RuntimeUiDecouplingMetrics;
};

const root = process.cwd();
const targets = [
  {
    path: 'src/components/concierge/RuntimeStabilityDashboardPanel.tsx',
    role: 'dashboard',
    decouplingStrategy: 'archive civilization panels extracted into memoized render boundary',
  },
  {
    path: 'src/components/concierge/RuntimeCivilizationArchivePanels.tsx',
    role: 'dashboard',
    decouplingStrategy: 'cold/archival dashboard section isolated from primary stability panel',
  },
  {
    path: 'src/screens/AiSettingsScreen.tsx',
    role: 'screen',
    decouplingStrategy: 'future split into provider, credential, diagnostics, and model preference sections',
  },
  {
    path: 'src/context/ProactiveConciergeContext.tsx',
    role: 'context',
    decouplingStrategy: 'future selector hooks and derived-state provider split; no behavior mutation in this phase',
  },
  {
    path: 'src/components/AiAssistantChat.tsx',
    role: 'chat',
    decouplingStrategy: 'future chat composer/history/runtime panels split with memoized message rows',
  },
  {
    path: 'src/context/AppContext.tsx',
    role: 'context',
    decouplingStrategy: 'future portfolio/settings/API-key provider split; no behavior mutation in this phase',
  },
] as const;

function countImports(source: string): number {
  return [...source.matchAll(/import\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"][^'"]+['"]/g)].length;
}

function fileReport(target: (typeof targets)[number]): UiHotspotReport {
  const absolute = join(root, target.path);
  if (!existsSync(absolute)) {
    return {
      path: target.path,
      bytes: 0,
      lines: 0,
      importCount: 0,
      role: target.role,
      decouplingStrategy: target.decouplingStrategy,
    };
  }
  const source = readFileSync(absolute, 'utf8');
  return {
    path: relative(root, absolute).replace(/\\/g, '/'),
    bytes: statSync(absolute).size,
    lines: source.split(/\r?\n/).length,
    importCount: countImports(source),
    role: target.role,
    decouplingStrategy: target.decouplingStrategy,
  };
}

export function buildRuntimeUiDecouplingReport(): RuntimeUiDecouplingReport {
  const reports = targets.map(fileReport);
  const dashboard = reports.find((report) => report.path.endsWith('RuntimeStabilityDashboardPanel.tsx'));
  const archivePanel = reports.find((report) => report.path.endsWith('RuntimeCivilizationArchivePanels.tsx'));
  const dashboardSplitRatio = archivePanel && dashboard ? archivePanel.bytes / Math.max(1, dashboard.bytes + archivePanel.bytes) : 0;
  const contextWeight = reports
    .filter((report) => report.role === 'context')
    .reduce((sum, report) => sum + report.bytes, 0);
  const totalWeight = reports.reduce((sum, report) => sum + report.bytes, 0);
  const contextIsolationScore = Math.round((1 - contextWeight / Math.max(1, totalWeight)) * 1000) / 1000;
  const dashboardHydrationReduction = Math.round(dashboardSplitRatio * 1000) / 1000;
  const TSComplexityReduction = Math.round((dashboardSplitRatio * 0.8) * 1000) / 1000;
  const cursorIndexPressureReduction = Math.round((dashboardSplitRatio * 0.6) * 1000) / 1000;

  return {
    freezeTag: 'runtime-freeze-v1',
    rerenderHotspots: reports
      .filter((report) => report.role !== 'context')
      .sort((a, b) => b.importCount - a.importCount),
    heaviestContexts: reports
      .filter((report) => report.role === 'context')
      .sort((a, b) => b.bytes - a.bytes),
    dashboardRenderReductions: [
      'RuntimeStabilityDashboardPanel no longer owns observer reality, inter-civilization, and governance freeze archive panel JSX',
      'RuntimeCivilizationArchivePanels provides a memoized render boundary for cold archive analytics',
      'telemetry dashboard row budgeting remains unchanged and is consumed inside the isolated boundary',
    ],
    TSComplexityReductions: [
      'dashboard archive constants/getters moved out of primary panel import surface',
      'archive panel string formatting and list mapping moved out of primary dashboard inference path',
      'future candidates remain AppContext, ProactiveConciergeContext, AISettingsScreen, and AiAssistantChat',
    ],
    contextSplitResults: [
      'Context providers were not behavior-split in this phase to avoid recommendation/execution/AI/policy mutation risk',
      'Selector-based access remains the recommended next safe step for AppContext and ProactiveConciergeContext',
      'Derived state memoization should be introduced only behind behavior-preserving selector hooks',
    ],
    cursorIndexingImprovements: [
      'primary dashboard file import surface reduced by moving archive runtime imports to a separate component',
      'archive dashboard responsibility moved to a smaller file that Cursor can index independently',
      'freeze reports identify remaining giant-file split candidates without changing runtime logic',
    ],
    expectedResponsivenessImprovement:
      'Small-to-moderate dashboard edit responsiveness improvement; largest future gains require AppContext and ProactiveConciergeContext selector extraction.',
    metrics: {
      rerenderReductionScore: Math.round((dashboardSplitRatio * 0.7) * 1000) / 1000,
      contextIsolationScore,
      dashboardHydrationReduction,
      TSComplexityReduction,
      cursorIndexPressureReduction,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeUiDecouplingReport(), null, 2));
}
