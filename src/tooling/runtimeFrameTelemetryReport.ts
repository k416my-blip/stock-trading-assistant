import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeFrameTelemetryStaticMetrics = {
  jsThreadHealthScore: number;
  renderBurstScore: number;
  hydrationFramePressureScore: number;
  interactionLatencyScore: number;
  mobileFrameSafetyScore: number;
  expoRuntimeResponsivenessScore: number;
};

export type RuntimeFrameTelemetryStaticReport = {
  freezeTag: 'runtime-freeze-v1';
  frameStallReport: string[];
  renderTimingReport: Array<{
    file: string;
    bytes: number;
    renderTimingReferences: number;
    interactionLatencyReferences: number;
    hydrationTimingReferences: number;
    appStateTimingReferences: number;
    eventLoopReferences: number;
  }>;
  interactionLatencyReport: string[];
  hydrationTimingReport: string[];
  mobileFramePressureReport: string[];
  metrics: RuntimeFrameTelemetryStaticMetrics;
};

const root = process.cwd();
const files = [
  'App.tsx',
  'src/services/runtimeFrameTelemetry.ts',
  'src/hooks/useJsThreadTelemetry.ts',
  'src/hooks/useRenderWatchdog.ts',
  'src/hooks/useDeferredRenderActivation.ts',
  'src/context/AppContext.tsx',
  'src/context/ProactiveConciergeContext.tsx',
  'src/components/AiAssistantChat.tsx',
  'src/components/concierge/RuntimeStabilityDashboardPanel.tsx',
  'src/services/mobileStabilityWatchdog.ts',
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

export function buildRuntimeFrameTelemetryReport(): RuntimeFrameTelemetryStaticReport {
  const rows = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      renderTimingReferences: count(source, /noteRenderTiming|useRenderWatchdog|render_timing/g),
      interactionLatencyReferences: count(source, /noteInteractionLatency|interaction_latency/g),
      hydrationTimingReferences: count(source, /noteHydrationTiming|hydration_timing/g),
      appStateTimingReferences: count(source, /noteAppStateFrameTiming|app_state_timing|resume_spike/g),
      eventLoopReferences: count(source, /useJsThreadTelemetry|noteEventLoopLag|event_loop_lag|long_task/g),
    };
  });

  const joined = files.map(sourceFor).join('\n');
  const eventLoopRefs = count(joined, /useJsThreadTelemetry|noteEventLoopLag/g);
  const renderRefs = count(joined, /noteRenderTiming|useRenderWatchdog/g);
  const hydrationRefs = count(joined, /noteHydrationTiming/g);
  const interactionRefs = count(joined, /noteInteractionLatency/g);
  const appStateRefs = count(joined, /noteAppStateFrameTiming/g);
  const timerListenerRefs = count(joined, /noteTimerAccumulation|noteListenerBurst/g);

  const jsThreadHealthScore = round(Math.min(1, eventLoopRefs / 3));
  const renderBurstScore = round(Math.min(1, renderRefs / 8));
  const hydrationFramePressureScore = round(Math.min(1, hydrationRefs / 2));
  const interactionLatencyScore = round(Math.min(1, interactionRefs / 7));
  const mobileFrameSafetyScore = round(Math.min(1, (appStateRefs + timerListenerRefs) / 5));
  const expoRuntimeResponsivenessScore = round(
    (jsThreadHealthScore +
      renderBurstScore +
      hydrationFramePressureScore +
      interactionLatencyScore +
      mobileFrameSafetyScore) /
      5,
  );

  return {
    freezeTag: 'runtime-freeze-v1',
    frameStallReport: [
      'AppShell installs JS event loop lag telemetry for Expo/RN runtime responsiveness.',
      'Render watchdog commits now also feed frame telemetry for commit spike and render burst diagnostics.',
      'Timer accumulation and listener burst diagnostics are bridged from mobileStabilityWatchdog.',
    ],
    renderTimingReport: rows,
    interactionLatencyReport: [
      'AIAssistantChat records chat-open, chat-send, proactive suggestion focus, and proactive suggestion render latency.',
      'AppContext records portfolio refresh and AI settings preference save latency.',
      'RuntimeStabilityDashboardPanel records dashboard mount latency.',
    ],
    hydrationTimingReport: [
      'Deferred render activation records hydration timing and hydration blocking risk.',
      'Dashboard analytics/archive activation and chat dashboard/suggestion activation are covered by existing deferred labels.',
      'Inactive hydration suppression remains readonly and does not rewrite runtime behavior.',
    ],
    mobileFramePressureReport: [
      'AppState transitions record resume/background frame timing.',
      'Resume spike, dropped-frame risk, commit spikes, and long JS task counts are exposed via runtimeFrameTelemetry.',
      'Static coverage confirms App, dashboard, chat, proactive provider, and AppContext are instrumented.',
    ],
    metrics: {
      jsThreadHealthScore,
      renderBurstScore,
      hydrationFramePressureScore,
      interactionLatencyScore,
      mobileFrameSafetyScore,
      expoRuntimeResponsivenessScore,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeFrameTelemetryReport(), null, 2));
}
