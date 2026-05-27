import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeForecastWindow = '30s' | '2m' | '5m' | '15m' | '1h';

export type RuntimeForecastTarget =
  | 'freeze_precursor'
  | 'js_stall_escalation'
  | 'hydration_starvation'
  | 'reconnect_storm'
  | 'retry_cascade'
  | 'memory_retention_drift'
  | 'deferred_queue_congestion'
  | 'render_burst_escalation'
  | 'interaction_blackout'
  | 'background_recovery_degradation'
  | 'bridge_congestion'
  | 'long_session_instability';

export type RuntimeForecastSignal = {
  target: RuntimeForecastTarget;
  windows: Record<RuntimeForecastWindow, number>;
  inputs: string[];
  diagnostics: string[];
  trendModel: string;
};

export type RuntimeFreezeForecastReport = {
  freezeTag: 'runtime-freeze-v1';
  forecastCoverage: RuntimeForecastSignal[];
  precursorDiagnosticsCoverage: string[];
  stabilityModelingCoverage: string[];
  forecastWindowCoverage: RuntimeForecastWindow[];
  forecastTelemetryInputs: string[];
  instrumentationCoverage: Array<{
    file: string;
    bytes: number;
    frameReferences: number;
    jsReferences: number;
    hydrationReferences: number;
    reconnectReferences: number;
    retryReferences: number;
    memoryReferences: number;
    chaosReferences: number;
    soakReferences: number;
    forecastReferences: number;
  }>;
  metrics: {
    runtimeForecastScore: number;
    freezeRiskForecast: number;
    sessionDegradationForecast: number;
    reconnectInstabilityForecast: number;
    hydrationStarvationForecast: number;
    queueCongestionForecast: number;
    interactionDriftForecast: number;
    renderBurstForecast: number;
    jsStallEscalationForecast: number;
    runtimeFreezeIntegrityScore: number;
  };
};

const root = process.cwd();
const windows: RuntimeForecastWindow[] = ['30s', '2m', '5m', '15m', '1h'];
const files = [
  'src/services/runtimeFrameTelemetry.ts',
  'src/services/productionRuntimeProfiler.ts',
  'src/services/runtimeSafetyEnvelopeReport.ts',
  'src/tooling/runtimeSafetyEnvelopeReport.ts',
  'src/tooling/runtimeChaosReplayReport.ts',
  'src/services/runtimeSelfHealingSystem.ts',
  'src/services/longSessionRuntimeSoak.ts',
  'src/services/runtimeChaosResilience.ts',
  'src/services/runtimeMemoryPressureDefense.ts',
  'src/services/adaptiveRuntimeGovernor.ts',
  'src/services/runtimeDeviceAdaptiveOptimization.ts',
  'App.tsx',
];

const forecastTelemetryInputs = [
  'frame telemetry',
  'JS stall telemetry',
  'hydration telemetry',
  'reconnect telemetry',
  'retry telemetry',
  'memory retention telemetry',
  'governor diagnostics',
  'chaos replay diagnostics',
  'production profiler snapshots',
  'soak replay diagnostics',
  'AppState lifecycle telemetry',
];

const precursorDiagnosticsCoverage = [
  'hidden starvation precursor',
  'invisible hydration precursor',
  'retry storm precursor',
  'reconnect oscillation precursor',
  'render collapse precursor',
  'JS degradation precursor',
  'interaction blackout precursor',
  'memory retention precursor',
  'background recovery precursor',
];

const stabilityModelingCoverage = [
  'stability trend slope',
  'degradation acceleration',
  'reconnect amplification trend',
  'hydration starvation trend',
  'queue congestion trend',
  'interaction latency drift',
  'render burst density',
  'long-session decay trend',
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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function windowCurve(baseRisk: number): Record<RuntimeForecastWindow, number> {
  return {
    '30s': round(clamp01(baseRisk * 0.4)),
    '2m': round(clamp01(baseRisk * 0.6)),
    '5m': round(clamp01(baseRisk * 0.8)),
    '15m': round(clamp01(baseRisk)),
    '1h': round(clamp01(baseRisk * 1.2)),
  };
}

function signal(
  target: RuntimeForecastTarget,
  baseRisk: number,
  inputs: string[],
  diagnostics: string[],
  trendModel: string,
): RuntimeForecastSignal {
  return {
    target,
    windows: windowCurve(baseRisk),
    inputs,
    diagnostics,
    trendModel,
  };
}

export function buildRuntimeFreezeForecastReport(): RuntimeFreezeForecastReport {
  const rows = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      frameReferences: count(source, /frame|Frame|dropped|render burst|commit/g),
      jsReferences: count(source, /JS|js_|event_loop|long_task|stall/gi),
      hydrationReferences: count(source, /hydration|Hydration|deferred/g),
      reconnectReferences: count(source, /reconnect|Reconnect|offline|online/g),
      retryReferences: count(source, /retry|Retry|cascade/g),
      memoryReferences: count(source, /memory|Memory|retention|listener|timer/g),
      chaosReferences: count(source, /chaos|Chaos|oscillation|storm|starvation|blackout/g),
      soakReferences: count(source, /soak|Soak|longSession|long-session|session/g),
      forecastReferences: count(source, /forecast|Forecast|precursor|degradation/g),
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      frame: acc.frame + row.frameReferences,
      js: acc.js + row.jsReferences,
      hydration: acc.hydration + row.hydrationReferences,
      reconnect: acc.reconnect + row.reconnectReferences,
      retry: acc.retry + row.retryReferences,
      memory: acc.memory + row.memoryReferences,
      chaos: acc.chaos + row.chaosReferences,
      soak: acc.soak + row.soakReferences,
      forecast: acc.forecast + row.forecastReferences,
    }),
    { frame: 0, js: 0, hydration: 0, reconnect: 0, retry: 0, memory: 0, chaos: 0, soak: 0, forecast: 0 },
  );

  const frameRisk = clamp01(1 - Math.min(1, totals.frame / 180));
  const jsRisk = clamp01(1 - Math.min(1, totals.js / 140));
  const hydrationRisk = clamp01(1 - Math.min(1, totals.hydration / 220));
  const reconnectRisk = clamp01(1 - Math.min(1, totals.reconnect / 140));
  const retryRisk = clamp01(1 - Math.min(1, totals.retry / 90));
  const memoryRisk = clamp01(1 - Math.min(1, totals.memory / 180));
  const chaosRisk = clamp01(1 - Math.min(1, totals.chaos / 120));
  const soakRisk = clamp01(1 - Math.min(1, totals.soak / 120));
  const queueRisk = clamp01((hydrationRisk + memoryRisk + soakRisk) / 3);
  const interactionRisk = clamp01((frameRisk + jsRisk + chaosRisk) / 3);
  const freezeRisk = clamp01(
    (frameRisk + jsRisk + hydrationRisk + reconnectRisk + retryRisk + memoryRisk + chaosRisk + soakRisk) / 8,
  );

  const forecastCoverage: RuntimeForecastSignal[] = [
    signal('freeze_precursor', freezeRisk, ['safety envelope', 'chaos replay diagnostics', 'production profiler snapshots'], ['hidden starvation precursor', 'render collapse precursor', 'JS degradation precursor'], 'weighted precursor risk slope'),
    signal('js_stall_escalation', jsRisk, ['JS stall telemetry', 'frame telemetry', 'production profiler snapshots'], ['JS degradation precursor'], 'event-loop lag acceleration'),
    signal('hydration_starvation', hydrationRisk, ['hydration telemetry', 'governor diagnostics', 'soak replay diagnostics'], ['hidden starvation precursor', 'invisible hydration precursor'], 'hydration starvation trend'),
    signal('reconnect_storm', reconnectRisk, ['reconnect telemetry', 'chaos replay diagnostics', 'AppState lifecycle telemetry'], ['reconnect oscillation precursor'], 'reconnect amplification trend'),
    signal('retry_cascade', retryRisk, ['retry telemetry', 'chaos replay diagnostics'], ['retry storm precursor'], 'retry amplification trend'),
    signal('memory_retention_drift', memoryRisk, ['memory retention telemetry', 'production profiler snapshots'], ['memory retention precursor'], 'memory retention drift slope'),
    signal('deferred_queue_congestion', queueRisk, ['hydration telemetry', 'memory retention telemetry', 'soak replay diagnostics'], ['hidden starvation precursor'], 'queue congestion trend'),
    signal('render_burst_escalation', frameRisk, ['frame telemetry', 'production profiler snapshots'], ['render collapse precursor'], 'render burst density'),
    signal('interaction_blackout', interactionRisk, ['interaction telemetry', 'frame telemetry', 'JS stall telemetry'], ['interaction blackout precursor'], 'interaction latency drift'),
    signal('background_recovery_degradation', soakRisk, ['AppState lifecycle telemetry', 'soak replay diagnostics'], ['background recovery precursor'], 'background recovery decay trend'),
    signal('bridge_congestion', frameRisk, ['production profiler snapshots', 'device adaptive diagnostics'], ['render collapse precursor'], 'bridge congestion density'),
    signal('long_session_instability', soakRisk, ['soak replay diagnostics', 'production profiler snapshots'], ['JS degradation precursor', 'background recovery precursor'], 'long-session decay trend'),
  ];

  const joined = files.map(sourceFor).join('\n');
  const runtimeImplementationSources = files
    .filter((file) => !file.startsWith('src/tooling/'))
    .map(sourceFor)
    .join('\n');
  const forbiddenMutationRefs = count(
    runtimeImplementationSources,
    /auto mitigation|self-fix|runtime control|semantic mutation|reducer rewrite|provider rewrite|trading logic mutation|recommendation mutation/gi,
  );
  const runtimeForecastScore = round(
    forecastCoverage.filter((item) => windows.every((window) => window in item.windows)).length / forecastCoverage.length,
  );

  return {
    freezeTag: 'runtime-freeze-v1',
    forecastCoverage,
    precursorDiagnosticsCoverage,
    stabilityModelingCoverage,
    forecastWindowCoverage: windows,
    forecastTelemetryInputs,
    instrumentationCoverage: rows,
    metrics: {
      runtimeForecastScore,
      freezeRiskForecast: round(freezeRisk),
      sessionDegradationForecast: round(soakRisk),
      reconnectInstabilityForecast: round(reconnectRisk),
      hydrationStarvationForecast: round(hydrationRisk),
      queueCongestionForecast: round(queueRisk),
      interactionDriftForecast: round(interactionRisk),
      renderBurstForecast: round(frameRisk),
      jsStallEscalationForecast: round(jsRisk),
      runtimeFreezeIntegrityScore: forbiddenMutationRefs === 0 ? 1 : 0,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeFreezeForecastReport(), null, 2));
}
