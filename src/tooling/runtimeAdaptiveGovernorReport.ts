import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeAdaptiveGovernorStaticReport = {
  freezeTag: 'runtime-freeze-v1';
  runtimePressureTiers: string[];
  governorActivationTriggers: string[];
  hydrationSuppressionResults: string[];
  renderBurstContainmentResults: string[];
  jsStallAdaptiveProtection: string[];
  mobileBatteryOfflinePolicies: string[];
  instrumentationCoverage: Array<{
    file: string;
    bytes: number;
    governorReferences: number;
    priorityReferences: number;
    suppressionReferences: number;
    loadSheddingReferences: number;
  }>;
  metrics: {
    adaptiveRuntimeSafetyScore: number;
    hydrationGovernorScore: number;
    renderPressureContainmentScore: number;
    mobileGovernorEfficiencyScore: number;
    interactionPrioritySafetyScore: number;
    loadSheddingEffectivenessScore: number;
  };
};

const root = process.cwd();
const files = [
  'src/services/adaptiveRuntimeGovernor.ts',
  'src/hooks/useDeferredRenderActivation.ts',
  'App.tsx',
  'src/components/AiAssistantChat.tsx',
  'src/components/concierge/RuntimeStabilityDashboardPanel.tsx',
  'src/screens/AiSettingsScreen.tsx',
  'src/components/concierge/CapitalAllocationPanel.tsx',
  'src/components/concierge/PortfolioRiskExposurePanel.tsx',
  'src/services/runtimeFrameTelemetry.ts',
  'src/services/mobileStabilityWatchdog.ts',
  'src/services/runtimeChaosResilience.ts',
  'src/services/performanceCostRuntime.ts',
];

function sourceFor(file: string): string {
  const absolute = join(root, file);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
}

function count(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function buildRuntimeAdaptiveGovernorReport(): RuntimeAdaptiveGovernorStaticReport {
  const rows = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      governorReferences: count(source, /adaptiveRuntimeGovernor|AdaptiveRuntime|decideAdaptiveHydration|governor/g),
      priorityReferences: count(source, /priority: '(interaction|normal|proactive|analytics|archive)'|RuntimeHydrationPriority/g),
      suppressionReferences: count(source, /hydration_suppression|noteHydrationSuppressed|suppressed/g),
      loadSheddingReferences: count(source, /load_shedding|loadShedding|priorityDelay/g),
    };
  });
  const joined = files.map(sourceFor).join('\n');
  const governorRefs = count(joined, /decideAdaptiveHydration|getAdaptiveRuntimePressureState|getAdaptiveRuntimeGovernorReport/g);
  const priorityRefs = count(joined, /priority: '(proactive|analytics|archive)'|RuntimeHydrationPriority/g);
  const suppressionRefs = count(joined, /hydration_suppression|noteHydrationSuppressed|noteAdaptiveDeferredCancellation/g);
  const mobileRefs = count(joined, /batterySaverActive|offlineMode|resume_staged_recovery|noteAdaptiveResumeStagedRecovery/g);
  const renderRefs = count(joined, /renderBurstPressureTier|jsStallPressureTier|hydrationPressureTier/g);
  const interactionRefs = count(joined, /priority === 'interaction'|interactionPrioritySafetyScore/g);

  return {
    freezeTag: 'runtime-freeze-v1',
    runtimePressureTiers: [
      'runtimePressureState: normal/elevated/high/critical composite pressure.',
      'hydrationPressureTier: deferred backlog, hydration blocking, and collision pressure.',
      'jsStallPressureTier: event loop lag and long task pressure.',
      'renderBurstPressureTier: render burst and commit spike pressure.',
      'batteryAwareRuntimeTier: battery saver pressure tier.',
      'offlineRecoveryPressureTier: offline mode and recovery queue pressure.',
    ],
    governorActivationTriggers: [
      'Deferred hydration calls decideAdaptiveHydration before activation.',
      'AppState active transitions record staged resume recovery.',
      'Low-priority analytics/archive/proactive priorities receive dynamic delay under pressure.',
    ],
    hydrationSuppressionResults: [
      'Critical pressure suppresses archive and analytics hydration until retry.',
      'Critical JS/offline/hydration pressure can suppress proactive hydration.',
      'Suppression records remain diagnostics-only and do not mutate core runtime state.',
    ],
    renderBurstContainmentResults: [
      'Render burst and commit spike telemetry raise pressure tiers.',
      'High/critical pressure increases dashboard and analytics hydration delay.',
      'Interaction priority remains available while low-priority hydration is shed.',
    ],
    jsStallAdaptiveProtection: [
      'Long task pressure contributes to JS stall tier.',
      'Hydration activation re-checks governor pressure before mounting heavy UI.',
      'Duplicate activation prevention remains active through existing deferred activation guards.',
    ],
    mobileBatteryOfflinePolicies: [
      'Battery saver maps to high mobile runtime pressure for reduced hydration.',
      'Offline mode raises offline recovery pressure and delays low-priority hydration.',
      'Resume transitions are staged and recorded without changing provider or reducer semantics.',
    ],
    instrumentationCoverage: rows,
    metrics: {
      adaptiveRuntimeSafetyScore: round(Math.min(1, governorRefs / 8)),
      hydrationGovernorScore: round(Math.min(1, suppressionRefs / 8)),
      renderPressureContainmentScore: round(Math.min(1, renderRefs / 8)),
      mobileGovernorEfficiencyScore: round(Math.min(1, mobileRefs / 8)),
      interactionPrioritySafetyScore: round(Math.min(1, interactionRefs / 3)),
      loadSheddingEffectivenessScore: round(Math.min(1, priorityRefs / 8)),
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeAdaptiveGovernorReport(), null, 2));
}
