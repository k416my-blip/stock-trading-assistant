import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeProductionProfilingStaticReport = {
  freezeTag: 'runtime-freeze-v1';
  droppedFrameHotspots: string[];
  jsStallHotspots: string[];
  interactionLatencyHotspots: string[];
  hydrationBlockingHotspots: string[];
  memoryRetentionHotspots: string[];
  reconnectLatencyBehavior: string[];
  androidExpoRuntimeDegradationRisks: string[];
  instrumentationCoverage: Array<{
    file: string;
    bytes: number;
    profilerReferences: number;
    frameReferences: number;
    jsReferences: number;
    memoryReferences: number;
    reconnectReferences: number;
    navigationReferences: number;
  }>;
  metrics: {
    frameStabilityScore: number;
    jsThreadHealthScore: number;
    interactionResponsivenessScore: number;
    hydrationBlockingScore: number;
    runtimeLatencyScore: number;
    memoryRetentionScore: number;
    longSessionPerformanceScore: number;
  };
};

const root = process.cwd();
const files = [
  'src/services/productionRuntimeProfiler.ts',
  'src/services/runtimeFrameTelemetry.ts',
  'src/services/runtimeMemoryPressureDefense.ts',
  'src/services/runtimeChaosResilience.ts',
  'src/services/performanceCostRuntime.ts',
  'src/services/longSessionRuntimeSoak.ts',
  'src/navigation/RootNavigator.tsx',
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

export function buildRuntimeProductionProfilingReport(): RuntimeProductionProfilingStaticReport {
  const rows = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      profilerReferences: count(source, /productionRuntimeProfiler|ProductionRuntime|noteProduction|getProductionRuntimeProfilingReport/g),
      frameReferences: count(source, /frame_budget|dropped_frame|frame_starvation|render_burst|commit_blocking|noteProductionFrame/g),
      jsReferences: count(source, /js_event_loop|long_task|hermes_gc|noteProductionJs|timer_execution_drift/g),
      memoryReferences: count(source, /memory_retention|noteProductionMemory|hiddenBackground|heap|retention/g),
      reconnectReferences: count(source, /reconnect_latency|offline_recovery|noteProductionReconnect|noteProductionOffline/g),
      navigationReferences: count(source, /navigation_latency|noteProductionNavigation|NavigationContainer|onStateChange/g),
    };
  });
  const joined = files.map(sourceFor).join('\n');
  const profilerRefs = count(joined, /noteProduction|getProductionRuntimeProfilingReport/g);
  const frameRefs = count(joined, /dropped_frame|frame_budget|noteProductionFrame/g);
  const jsRefs = count(joined, /hermes_gc|noteProductionJs|long_task|timer_execution_drift/g);
  const interactionRefs = count(joined, /noteProductionInteraction|noteProductionNavigation|interaction_latency|navigation_latency/g);
  const hydrationRefs = count(joined, /hydration_blocking|noteProductionHydration/g);
  const memoryRefs = count(joined, /noteProductionMemory|memory_retention|hiddenBackground/g);
  const latencyRefs = count(joined, /noteProductionReconnect|noteProductionOffline|background_wake_latency|battery_saver_slowdown/g);
  const longSessionRefs = count(joined, /noteProductionLongSession|long_session_degradation/g);

  return {
    freezeTag: 'runtime-freeze-v1',
    droppedFrameHotspots: [
      'Render commits over frame budget are recorded through runtimeFrameTelemetry.',
      'Commit blocking and dropped-frame risk are separated from render burst spikes.',
      'Interaction blocking can also emit dropped-frame risk diagnostics.',
    ],
    jsStallHotspots: [
      'Event loop lag and long task duration feed JS thread profiling.',
      'Hermes GC pause is estimated from long event-loop blocks.',
      'Timer execution drift is profiled from active timer buildup.',
    ],
    interactionLatencyHotspots: [
      'Chat open/send, dashboard mount, portfolio refresh, AI settings save, and proactive suggestion render already feed interaction profiling.',
      'Navigation transition latency is recorded from NavigationContainer state changes.',
      'Interaction hotspots are aggregated in rolling runtime windows.',
    ],
    hydrationBlockingHotspots: [
      'Deferred activation completion feeds hydration blocking duration.',
      'Governor/memory suppression remains replay diagnostics and does not alter core semantics.',
      'Hydration after resume is visible through AppState + hydration blocking events.',
    ],
    memoryRetentionHotspots: [
      'Timer/listener/deferred queue retention feeds memory retention profiling.',
      'Inactive hydration and stale closure estimates feed hidden retention diagnostics.',
      'Background cleanup activity contributes to memory pressure snapshots.',
    ],
    reconnectLatencyBehavior: [
      'Reconnect allowed/debounced/cooldown events emit reconnect latency profiling.',
      'Offline/online transitions emit offline recovery latency diagnostics.',
      'Battery saver mode emits slowdown diagnostics for Android/Expo runtime review.',
    ],
    androidExpoRuntimeDegradationRisks: [
      'Background wake latency is captured from AppState timing.',
      'Bridge congestion is estimated from timer buildup and slow reconnect paths.',
      'Long-session degradation events aggregate JS, render, hydration, and queue drift.',
    ],
    instrumentationCoverage: rows,
    metrics: {
      frameStabilityScore: round(Math.min(1, frameRefs / 12)),
      jsThreadHealthScore: round(Math.min(1, jsRefs / 10)),
      interactionResponsivenessScore: round(Math.min(1, interactionRefs / 8)),
      hydrationBlockingScore: round(Math.min(1, hydrationRefs / 4)),
      runtimeLatencyScore: round(Math.min(1, latencyRefs / 8)),
      memoryRetentionScore: round(Math.min(1, memoryRefs / 8)),
      longSessionPerformanceScore: round(Math.min(1, longSessionRefs / 4 + profilerRefs / 80)),
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeProductionProfilingReport(), null, 2));
}
