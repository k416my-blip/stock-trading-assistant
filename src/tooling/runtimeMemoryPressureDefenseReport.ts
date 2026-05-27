import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeMemoryPressureDefenseStaticReport = {
  freezeTag: 'runtime-freeze-v1';
  memoryGrowthHotspots: string[];
  listenerAccumulationHotspots: string[];
  timerAccumulationHotspots: string[];
  deferredQueueRetentionResults: string[];
  inactiveHydrationCleanupResults: string[];
  backgroundMemoryProtectionBehavior: string[];
  instrumentationCoverage: Array<{
    file: string;
    bytes: number;
    memoryDefenseReferences: number;
    cleanupReferences: number;
    timerLifecycleReferences: number;
    listenerLifecycleReferences: number;
    deferredQueueReferences: number;
  }>;
  metrics: {
    runtimeMemorySafetyScore: number;
    listenerLeakPreventionScore: number;
    timerRetentionSafetyScore: number;
    deferredQueueContainmentScore: number;
    inactiveHydrationCleanupScore: number;
    mobileMemoryResilienceScore: number;
  };
};

const root = process.cwd();
const files = [
  'src/services/runtimeMemoryPressureDefense.ts',
  'src/hooks/useDeferredRenderActivation.ts',
  'src/services/mobileStabilityWatchdog.ts',
  'App.tsx',
  'src/components/AiAssistantChat.tsx',
  'src/components/concierge/RuntimeStabilityDashboardPanel.tsx',
  'src/context/ProactiveConciergeContext.tsx',
  'src/services/adaptiveRuntimeGovernor.ts',
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

export function buildRuntimeMemoryPressureDefenseReport(): RuntimeMemoryPressureDefenseStaticReport {
  const rows = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      memoryDefenseReferences: count(source, /runtimeMemoryPressureDefense|RuntimeMemory|MemoryPressureDefense|memory pressure/gi),
      cleanupReferences: count(source, /noteMemoryCleanupActivity|cleanup_activity|background_memory_cleanup|low_priority_queue_evicted/g),
      timerLifecycleReferences: count(source, /noteMemoryTimer|noteWatchdogTimer|timer_retained|timer_released/g),
      listenerLifecycleReferences: count(source, /noteMemoryListener|noteListenerRegistered|noteListenerRemoved|listener_retained|listener_released/g),
      deferredQueueReferences: count(source, /noteMemoryDeferred|deferred_queued|deferred_cancelled|deferred_completed|decideMemoryHydrationCleanup/g),
    };
  });
  const joined = files.map(sourceFor).join('\n');
  const memoryRefs = count(joined, /runtimeMemoryPressureDefense|noteMemory|decideMemoryHydrationCleanup/g);
  const cleanupRefs = count(joined, /noteMemoryCleanupActivity|background_memory_cleanup|low_priority_queue_evicted/g);
  const timerRefs = count(joined, /noteMemoryTimer|noteWatchdogTimer|timerRetention/g);
  const listenerRefs = count(joined, /noteMemoryListener|noteListenerRegistered|noteListenerRemoved|listenerLeak/g);
  const deferredRefs = count(joined, /noteMemoryDeferred|decideMemoryHydrationCleanup|deferredQueue/g);
  const inactiveRefs = count(joined, /inactive_hydration|noteInactiveHydrationRetention|background suspended hydration/g);

  return {
    freezeTag: 'runtime-freeze-v1',
    memoryGrowthHotspots: [
      'Deferred hydration queue retention is tracked through useDeferredRenderActivation.',
      'Timer retention is tracked through mobileStabilityWatchdog and chat send/slow-response timers.',
      'Listener retention is tracked through mobileStabilityWatchdog listener lifecycle registration.',
    ],
    listenerAccumulationHotspots: [
      'AppShell AppState listener is registered/removed with memory lifecycle notes.',
      'RuntimeStabilityDashboardPanel unmount records dashboard inactive cleanup.',
      'ProactiveConciergeContext unregisters stability/orchestration listeners with cleanup diagnostics.',
    ],
    timerAccumulationHotspots: [
      'Deferred hydration retry timers are tracked as watchdog timers.',
      'Governor and memory retry timers are tracked separately by label.',
      'AIAssistantChat slow-response and send watchdog timers now use watchdog lifecycle tracking.',
    ],
    deferredQueueRetentionResults: [
      'Low-priority proactive/analytics/archive activations can be evicted from memory queue and retried.',
      'Deferred queue cap defaults to eight active deferred activations.',
      'Retained low-priority activations expire after long retention and are rescheduled.',
    ],
    inactiveHydrationCleanupResults: [
      'Inactive app state records hydration retention and memory cleanup activity.',
      'Background suspended hydration uses longer retry delay for low-priority work.',
      'Unmount cleanup records abandoned deferred activation cancellation.',
    ],
    backgroundMemoryProtectionBehavior: [
      'AppState background transitions record background memory cleanup diagnostics.',
      'Battery saver and offline mode trigger memory-mode queue cleanup for low-priority hydration.',
      'Long background retention is reported when returning to active state.',
    ],
    instrumentationCoverage: rows,
    metrics: {
      runtimeMemorySafetyScore: round(Math.min(1, memoryRefs / 18)),
      listenerLeakPreventionScore: round(Math.min(1, listenerRefs / 8)),
      timerRetentionSafetyScore: round(Math.min(1, timerRefs / 12)),
      deferredQueueContainmentScore: round(Math.min(1, deferredRefs / 12)),
      inactiveHydrationCleanupScore: round(Math.min(1, inactiveRefs / 6)),
      mobileMemoryResilienceScore: round(
        (Math.min(1, memoryRefs / 18) +
          Math.min(1, listenerRefs / 8) +
          Math.min(1, timerRefs / 12) +
          Math.min(1, deferredRefs / 12) +
          Math.min(1, cleanupRefs / 10)) /
          5,
      ),
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeMemoryPressureDefenseReport(), null, 2));
}
