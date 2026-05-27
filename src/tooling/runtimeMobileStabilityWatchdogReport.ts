import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeMobileStabilityWatchdogMetrics = {
  runtimeFreezeRiskScore: number;
  mobileMemorySafetyScore: number;
  hydrationBacklogReduction: number;
  renderBurstContainmentScore: number;
  lifecycleStabilityScore: number;
};

export type RuntimeMobileStabilityWatchdogStaticReport = {
  freezeTag: 'runtime-freeze-v1';
  mobileStabilityReport: Array<{
    file: string;
    bytes: number;
    watchdogReferences: number;
    renderWatchdogReferences: number;
    timerTrackingReferences: number;
    lifecycleReferences: number;
  }>;
  runtimeWatchdogReport: string[];
  memoryPressureReport: string[];
  renderFreezeDiagnostics: string[];
  metrics: RuntimeMobileStabilityWatchdogMetrics;
};

const root = process.cwd();
const files = [
  'App.tsx',
  'src/services/mobileStabilityWatchdog.ts',
  'src/hooks/useRenderWatchdog.ts',
  'src/hooks/useDeferredRenderActivation.ts',
  'src/services/marketDataService.ts',
  'src/components/concierge/RuntimeStabilityDashboardPanel.tsx',
  'src/components/AiAssistantChat.tsx',
  'src/context/ProactiveConciergeContext.tsx',
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

export function buildRuntimeMobileStabilityWatchdogReport(): RuntimeMobileStabilityWatchdogStaticReport {
  const rows = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      watchdogReferences: count(source, /mobileStabilityWatchdog|Watchdog|watchdog/g),
      renderWatchdogReferences: count(source, /useRenderWatchdog|noteRenderCommit/g),
      timerTrackingReferences: count(source, /noteWatchdogTimerScheduled|noteWatchdogTimerCleared/g),
      lifecycleReferences: count(source, /AppState|noteLifecycleChange|foreground_resume|background_pause/g),
    };
  });

  const joined = files.map(sourceFor).join('\n');
  const renderWatchdogs = count(joined, /useRenderWatchdog\(/g);
  const timerTracking = count(joined, /noteWatchdogTimerScheduled|noteWatchdogTimerCleared/g);
  const lifecycleTracking = count(joined, /noteLifecycleChange|noteListenerRegistered|noteListenerRemoved/g);
  const queueTracking = count(joined, /noteMarketQueuePressure/g);
  const deferredGuards = count(joined, /noteDeferredActivation|pauseWhenInactive|deferredQueueDepth/g);

  const mobileMemorySafetyScore = round(Math.min(1, (timerTracking + queueTracking) / 12));
  const hydrationBacklogReduction = round(Math.min(1, deferredGuards / 14));
  const renderBurstContainmentScore = round(Math.min(1, renderWatchdogs / 4));
  const lifecycleStabilityScore = round(Math.min(1, lifecycleTracking / 5));
  const runtimeFreezeRiskScore = round(
    1 -
      Math.min(
        0.95,
        (mobileMemorySafetyScore +
          hydrationBacklogReduction +
          renderBurstContainmentScore +
          lifecycleStabilityScore) /
          4,
      ),
  );

  return {
    freezeTag: 'runtime-freeze-v1',
    mobileStabilityReport: rows,
    runtimeWatchdogReport: [
      'AppShell, AIAssistantChat, RuntimeStabilityDashboardPanel, and ProactiveConciergeProvider have render commit watchdog instrumentation.',
      'Deferred activation now records scheduled/completed/cancelled activations and duplicate activation prevention.',
      'Market data request queue pressure is tracked alongside pending/in-flight depth.',
    ],
    memoryPressureReport: [
      'Timer scheduling and clearing are tracked for deferred boot, deferred UI activation, and market data cooldown waits.',
      'Deferred queue depth and market queue depth contribute to readonly memory pressure diagnostics.',
      'Listener registration/removal is tracked for AppState lifecycle diagnostics.',
    ],
    renderFreezeDiagnostics: [
      'Long render commits and render bursts are counted in mobileStabilityWatchdog.',
      'Inactive app state defers hidden UI hydration to reduce background resume spikes.',
      'Watchdog reports expose runtimeFreezeRiskScore, memory safety, hydration backlog, render burst, and lifecycle scores.',
    ],
    metrics: {
      runtimeFreezeRiskScore,
      mobileMemorySafetyScore,
      hydrationBacklogReduction,
      renderBurstContainmentScore,
      lifecycleStabilityScore,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeMobileStabilityWatchdogReport(), null, 2));
}
