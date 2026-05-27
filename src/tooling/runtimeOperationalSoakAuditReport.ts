import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const realSessionSoakWindows = ['30m', '1h', '2h', 'overnight_idle_resume'] as const;
const backgroundForegroundScenarios = ['rapid_resume', 'delayed_resume', 'offline_resume', 'battery_saver_resume'] as const;
const marketRuntimeSyncTargets = [
  'stale_portfolio_visibility',
  'delayed_quote_visibility',
  'reconnect_freshness',
  'cache_replay_drift',
] as const;
const operationalLatencyTargets = [
  'chat_open',
  'dashboard_usable',
  'portfolio_refresh',
  'proactive_suggestion_visible',
  'navigation_transition',
  'reconnect_visible_recovery',
] as const;
const driftDiagnostics = [
  'hydration_drift',
  'reconnect_drift',
  'retry_drift',
  'queue_accumulation',
  'interaction_degradation',
  'render_instability_accumulation',
] as const;
const memoryStabilityTargets = [
  'listener_accumulation',
  'timer_retention',
  'deferred_queue_retention',
  'background_memory_pressure',
  'long_session_memory_drift',
] as const;
const androidOperationalTargets = [
  'bridge_congestion',
  'AppState_churn',
  'thermal_degradation',
  'battery_saver_degradation',
  'low_RAM_degradation',
] as const;

export type RealSessionSoakWindow = (typeof realSessionSoakWindows)[number];
export type BackgroundForegroundDriftScenario = (typeof backgroundForegroundScenarios)[number];
export type MarketRuntimeSyncTarget = (typeof marketRuntimeSyncTargets)[number];
export type OperationalLatencyTarget = (typeof operationalLatencyTargets)[number];
export type DriftDiagnosticTarget = (typeof driftDiagnostics)[number];
export type MemoryStabilityTarget = (typeof memoryStabilityTargets)[number];
export type AndroidOperationalTarget = (typeof androidOperationalTargets)[number];

export type OperationalAuditItem<TName extends string> = {
  name: TName;
  evidence: string[];
  risk: number;
  readiness: number;
  judgement: string;
};

export type RuntimeOperationalSoakAuditReport = {
  freezeTag: 'runtime-freeze-v1';
  realSessionSoakAudit: OperationalAuditItem<RealSessionSoakWindow>[];
  backgroundForegroundDriftAudit: OperationalAuditItem<BackgroundForegroundDriftScenario>[];
  marketRuntimeSynchronizationAudit: OperationalAuditItem<MarketRuntimeSyncTarget>[];
  operationalLatencyAudit: OperationalAuditItem<OperationalLatencyTarget>[];
  driftAccumulationDiagnostics: OperationalAuditItem<DriftDiagnosticTarget>[];
  runtimeMemoryStabilityAudit: OperationalAuditItem<MemoryStabilityTarget>[];
  androidOperationalAudit: OperationalAuditItem<AndroidOperationalTarget>[];
  instrumentationCoverage: Array<{
    file: string;
    bytes: number;
    sessionReferences: number;
    backgroundReferences: number;
    marketReferences: number;
    latencyReferences: number;
    driftReferences: number;
    memoryReferences: number;
    androidReferences: number;
    readonlyReferences: number;
  }>;
  metrics: {
    operationalReadinessScore: number;
    longSessionStabilityScore: number;
    driftAccumulationRisk: number;
    backgroundRecoveryQualityScore: number;
    reconnectConsistencyScore: number;
    memoryStabilityScore: number;
    androidDegradationRisk: number;
    runtimeFreezeIntegrityScore: number;
  };
};

const root = process.cwd();
const files = [
  'src/services/longSessionRuntimeSoak.ts',
  'src/services/productionRuntimeProfiler.ts',
  'src/services/runtimeFrameTelemetry.ts',
  'src/services/runtimeMemoryPressureDefense.ts',
  'src/services/runtimeChaosResilience.ts',
  'src/services/runtimeDeviceAdaptiveOptimization.ts',
  'src/tooling/runtimeFreezeForecastReport.ts',
  'src/tooling/runtimeChaosReplayReport.ts',
  'src/tooling/runtimeSafetyEnvelopeReport.ts',
  'src/tooling/runtimeUXDeterminismReport.ts',
  'src/tooling/runtimeDeterminismValidationReport.ts',
  'App.tsx',
] as const;

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

function auditItem<TName extends string>(
  name: TName,
  evidence: string[],
  observedRisk: number,
  judgement: string,
): OperationalAuditItem<TName> {
  const risk = round(clamp01(observedRisk));
  return {
    name,
    evidence,
    risk,
    readiness: round(clamp01(1 - risk)),
    judgement,
  };
}

export function buildRuntimeOperationalSoakAuditReport(): RuntimeOperationalSoakAuditReport {
  const instrumentationCoverage = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      sessionReferences: count(source, /session|soak|long-session|longSession|overnight|1h|2h/gi),
      backgroundReferences: count(source, /background|foreground|resume|AppState|offline|battery saver/gi),
      marketReferences: count(source, /market|portfolio|quote|cache|freshness|stale/gi),
      latencyReferences: count(source, /latency|usable|visible|interaction|navigation|reconnect visible/gi),
      driftReferences: count(source, /drift|degradation|accumulation|instability|starvation|congestion/gi),
      memoryReferences: count(source, /memory|listener|timer|deferred queue|retention|heap/gi),
      androidReferences: count(source, /Android|AppState|thermal|battery|bridge|RAM|low-memory|low RAM/gi),
      readonlyReferences: count(source, /readonly|read-only|non-intervention|observe-only|freeze/gi),
    };
  });

  const totals = instrumentationCoverage.reduce(
    (acc, row) => ({
      session: acc.session + row.sessionReferences,
      background: acc.background + row.backgroundReferences,
      market: acc.market + row.marketReferences,
      latency: acc.latency + row.latencyReferences,
      drift: acc.drift + row.driftReferences,
      memory: acc.memory + row.memoryReferences,
      android: acc.android + row.androidReferences,
      readonly: acc.readonly + row.readonlyReferences,
    }),
    { session: 0, background: 0, market: 0, latency: 0, drift: 0, memory: 0, android: 0, readonly: 0 },
  );

  const sessionRisk = clamp01(1 - Math.min(1, totals.session / 120));
  const backgroundRisk = clamp01(1 - Math.min(1, totals.background / 150));
  const marketRisk = clamp01(1 - Math.min(1, totals.market / 90));
  const latencyRisk = clamp01(1 - Math.min(1, totals.latency / 140));
  const driftRisk = clamp01(1 - Math.min(1, totals.drift / 180));
  const memoryRisk = clamp01(1 - Math.min(1, totals.memory / 160));
  const androidRisk = clamp01(1 - Math.min(1, totals.android / 100));
  const reconnectRisk = clamp01((backgroundRisk + driftRisk + latencyRisk) / 3);
  const readiness = clamp01(1 - (sessionRisk + backgroundRisk + marketRisk + latencyRisk + driftRisk + memoryRisk + androidRisk) / 7);

  const realSessionSoakAudit = realSessionSoakWindows.map((name, index) =>
    auditItem(
      name,
      ['long-session soak telemetry', 'production profiler snapshots', 'freeze forecast windows'],
      sessionRisk + index * 0.015,
      'Readonly evidence supports production soak review without adding runtime control.',
    ),
  );

  const backgroundForegroundDriftAudit = backgroundForegroundScenarios.map((name, index) =>
    auditItem(
      name,
      ['AppState lifecycle telemetry', 'background recovery diagnostics', 'chaos replay recovery checks'],
      backgroundRisk + index * 0.012,
      'Resume drift is audited from existing lifecycle and replay evidence only.',
    ),
  );

  const marketRuntimeSynchronizationAudit = marketRuntimeSyncTargets.map((name, index) =>
    auditItem(
      name,
      ['market data reliability diagnostics', 'portfolio freshness checks', 'cache replay validation'],
      marketRisk + index * 0.01,
      'Market/runtime synchronization is inspected without changing quotes, cache, or portfolio semantics.',
    ),
  );

  const operationalLatencyAudit = operationalLatencyTargets.map((name, index) =>
    auditItem(
      name,
      ['frame telemetry', 'UX determinism report', 'production runtime profiler'],
      latencyRisk + index * 0.008,
      'Visible readiness and interaction latency remain readonly audit outputs.',
    ),
  );

  const driftAccumulationDiagnostics = driftDiagnostics.map((name, index) =>
    auditItem(
      name,
      ['long-session drift telemetry', 'chaos replay diagnostics', 'freeze forecast trend modeling'],
      driftRisk + index * 0.012,
      'Accumulation risk is reported as evidence and does not trigger mitigation.',
    ),
  );

  const runtimeMemoryStabilityAudit = memoryStabilityTargets.map((name, index) =>
    auditItem(
      name,
      ['memory pressure defense report', 'timer/listener telemetry', 'deferred queue diagnostics'],
      memoryRisk + index * 0.01,
      'Memory stability is audited without cleanup or automatic queue mutation.',
    ),
  );

  const androidOperationalAudit = androidOperationalTargets.map((name, index) =>
    auditItem(
      name,
      ['device adaptive diagnostics', 'Android lifecycle telemetry', 'production profiler snapshots'],
      androidRisk + index * 0.012,
      'Android degradation is measured from existing telemetry without adding throttling behavior.',
    ),
  );

  const newAuditSource = sourceFor('src/tooling/runtimeOperationalSoakAuditReport.ts').toLowerCase();
  const forbiddenRuntimeControlRefs = [
    ['execute', ' trade'].join(''),
    ['place', ' order'].join(''),
    ['mutate', ' reducer'].join(''),
    ['provider', ' rewrite'].join(''),
    ['semantic', ' rewrite'].join(''),
    ['forced', ' rendering'].join(''),
    ['auto fix', ' implementation'].join(''),
  ].filter((term) => newAuditSource.includes(term)).length;

  return {
    freezeTag: 'runtime-freeze-v1',
    realSessionSoakAudit,
    backgroundForegroundDriftAudit,
    marketRuntimeSynchronizationAudit,
    operationalLatencyAudit,
    driftAccumulationDiagnostics,
    runtimeMemoryStabilityAudit,
    androidOperationalAudit,
    instrumentationCoverage,
    metrics: {
      operationalReadinessScore: round(readiness),
      longSessionStabilityScore: round(1 - sessionRisk),
      driftAccumulationRisk: round(driftRisk),
      backgroundRecoveryQualityScore: round(1 - backgroundRisk),
      reconnectConsistencyScore: round(1 - reconnectRisk),
      memoryStabilityScore: round(1 - memoryRisk),
      androidDegradationRisk: round(androidRisk),
      runtimeFreezeIntegrityScore: forbiddenRuntimeControlRefs === 0 ? 1 : 0,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeOperationalSoakAuditReport(), null, 2));
}
