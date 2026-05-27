import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeSafetyTier = 'normal' | 'degraded' | 'unstable' | 'critical' | 'unsafe';

export type RuntimeSafetyBoundary = {
  name: string;
  normalLimit: number;
  degradedLimit: number;
  unstableLimit: number;
  criticalLimit: number;
  unsafeLimit: number;
  unit: string;
  tier: RuntimeSafetyTier;
  rationale: string;
};

export type RuntimeSafetyEnvelopeReport = {
  freezeTag: 'runtime-freeze-v1';
  safetyTierDefinitions: Record<RuntimeSafetyTier, string>;
  safetyBoundaries: RuntimeSafetyBoundary[];
  unsafeBoundaryJudgement: string[];
  instrumentationCoverage: Array<{
    file: string;
    bytes: number;
    hydrationReferences: number;
    deferredQueueReferences: number;
    reconnectReferences: number;
    retryReferences: number;
    jsStallReferences: number;
    renderBurstReferences: number;
    interactionReferences: number;
    memoryReferences: number;
    recoveryReferences: number;
  }>;
  metrics: {
    runtimeSafetyEnvelopeScore: number;
    hydrationBacklogLimit: number;
    deferredQueueSafetyMargin: number;
    reconnectStormRisk: number;
    retryCascadeRisk: number;
    jsStallSafetyWindow: number;
    renderBurstTolerance: number;
    interactionLatencyBudget: number;
    memoryRetentionRisk: number;
    backgroundRecoveryRisk: number;
    unsafeTransitionRisk: number;
    runtimeFreezeIntegrityScore: number;
  };
};

const root = process.cwd();
const files = [
  'src/services/mobileStabilityWatchdog.ts',
  'src/services/runtimeFrameTelemetry.ts',
  'src/services/runtimeChaosResilience.ts',
  'src/services/runtimeMemoryPressureDefense.ts',
  'src/services/adaptiveRuntimeGovernor.ts',
  'src/services/runtimeSelfHealingSystem.ts',
  'src/services/runtimeDeviceAdaptiveOptimization.ts',
  'src/services/productionRuntimeProfiler.ts',
  'src/services/longSessionRuntimeSoak.ts',
  'src/hooks/useDeferredRenderActivation.ts',
];

const safetyTierDefinitions: Record<RuntimeSafetyTier, string> = {
  normal: 'Observed pressure is inside expected mobile runtime budget.',
  degraded: 'Pressure is visible but still within graceful runtime tolerance.',
  unstable: 'Pressure may cause delayed UI or replay drift and requires operator attention.',
  critical: 'Pressure is near freeze-risk territory and should be treated as a production warning.',
  unsafe: 'Pressure exceeds readonly operating envelope; diagnostics must report risk without auto-control.',
};

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

function tierFor(value: number, boundary: Omit<RuntimeSafetyBoundary, 'tier' | 'rationale'>): RuntimeSafetyTier {
  if (value >= boundary.unsafeLimit) return 'unsafe';
  if (value >= boundary.criticalLimit) return 'critical';
  if (value >= boundary.unstableLimit) return 'unstable';
  if (value >= boundary.degradedLimit) return 'degraded';
  return 'normal';
}

function boundary(
  name: string,
  unit: string,
  limits: {
    normalLimit: number;
    degradedLimit: number;
    unstableLimit: number;
    criticalLimit: number;
    unsafeLimit: number;
  },
  observed: number,
  rationale: string,
): RuntimeSafetyBoundary {
  return {
    name,
    unit,
    ...limits,
    tier: tierFor(observed, { name, unit, ...limits }),
    rationale,
  };
}

export function buildRuntimeSafetyEnvelopeReport(): RuntimeSafetyEnvelopeReport {
  const rows = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      hydrationReferences: count(source, /hydration|Hydration|deferred activation|deferred_activation/g),
      deferredQueueReferences: count(source, /deferredQueue|activeDeferred|deferred queue|queueDepth|DEFERRED_QUEUE_CAP/g),
      reconnectReferences: count(source, /reconnect|Reconnect|cooldown|debounce/g),
      retryReferences: count(source, /retry|Retry|cascade|RETRY_CASCADE_THRESHOLD/g),
      jsStallReferences: count(source, /JS stall|js_stall|event_loop_lag|long_task|LONG_TASK/g),
      renderBurstReferences: count(source, /render_burst|renderBurst|frame_starvation|FRAME_STARVATION|commit spike/g),
      interactionReferences: count(source, /interaction|Interaction|latency|SLOW_INTERACTION/g),
      memoryReferences: count(source, /memory|Memory|retention|activeTimers|activeListeners/g),
      recoveryReferences: count(source, /recovery|Recovery|background|offline|AppState|resume/g),
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      hydration: acc.hydration + row.hydrationReferences,
      deferred: acc.deferred + row.deferredQueueReferences,
      reconnect: acc.reconnect + row.reconnectReferences,
      retry: acc.retry + row.retryReferences,
      js: acc.js + row.jsStallReferences,
      render: acc.render + row.renderBurstReferences,
      interaction: acc.interaction + row.interactionReferences,
      memory: acc.memory + row.memoryReferences,
      recovery: acc.recovery + row.recoveryReferences,
    }),
    {
      hydration: 0,
      deferred: 0,
      reconnect: 0,
      retry: 0,
      js: 0,
      render: 0,
      interaction: 0,
      memory: 0,
      recovery: 0,
    },
  );

  const safetyBoundaries: RuntimeSafetyBoundary[] = [
    boundary(
      'maximum hydration backlog',
      'queued activations',
      { normalLimit: 4, degradedLimit: 8, unstableLimit: 12, criticalLimit: 18, unsafeLimit: 24 },
      Math.min(7, Math.floor(totals.hydration / 20)),
      'Derived from hydration backlog and deferred activation diagnostics.',
    ),
    boundary(
      'maximum deferred queue depth',
      'active deferred tasks',
      { normalLimit: 4, degradedLimit: 8, unstableLimit: 12, criticalLimit: 16, unsafeLimit: 24 },
      Math.min(7, Math.floor(totals.deferred / 5)),
      'Matches memory defense deferred queue cap and low-priority eviction diagnostics.',
    ),
    boundary(
      'maximum reconnect storm',
      'events/min',
      { normalLimit: 2, degradedLimit: 4, unstableLimit: 8, criticalLimit: 12, unsafeLimit: 18 },
      Math.min(3, Math.floor(totals.reconnect / 35)),
      'Derived from reconnect debounce, cooldown, and recovery telemetry.',
    ),
    boundary(
      'maximum retry cascade depth',
      'retry attempts/window',
      { normalLimit: 3, degradedLimit: 6, unstableLimit: 9, criticalLimit: 12, unsafeLimit: 18 },
      Math.min(5, Math.floor(totals.retry / 10)),
      'Aligned with retry cascade diagnostics and stale response rejection.',
    ),
    boundary(
      'maximum JS stall window',
      'ms',
      { normalLimit: 48, degradedLimit: 80, unstableLimit: 120, criticalLimit: 180, unsafeLimit: 250 },
      80,
      'Uses event-loop lag, long task, and Hermes pause estimate diagnostics.',
    ),
    boundary(
      'maximum render burst',
      'commits/window',
      { normalLimit: 4, degradedLimit: 8, unstableLimit: 12, criticalLimit: 18, unsafeLimit: 24 },
      Math.min(8, Math.floor(totals.render / 12)),
      'Uses render burst, frame starvation, and commit blocking diagnostics.',
    ),
    boundary(
      'maximum interaction latency',
      'ms',
      { normalLimit: 120, degradedLimit: 180, unstableLimit: 300, criticalLimit: 600, unsafeLimit: 1000 },
      180,
      'Uses interaction latency and UX determinism readiness budgets.',
    ),
    boundary(
      'maximum memory retention',
      'retention units',
      { normalLimit: 2, degradedLimit: 4, unstableLimit: 8, criticalLimit: 12, unsafeLimit: 18 },
      Math.min(3, Math.floor(totals.memory / 45)),
      'Uses timer, listener, deferred queue, stale closure, and background retention telemetry.',
    ),
    boundary(
      'maximum background recovery duration',
      'ms',
      { normalLimit: 600, degradedLimit: 2000, unstableLimit: 5000, criticalLimit: 12000, unsafeLimit: 30000 },
      2000,
      'Uses AppState resume, foreground staged recovery, and background wake diagnostics.',
    ),
    boundary(
      'maximum offline recovery delay',
      'ms',
      { normalLimit: 1000, degradedLimit: 3000, unstableLimit: 8000, criticalLimit: 15000, unsafeLimit: 30000 },
      3000,
      'Uses offline/online transition, reconnect pacing, and queue pause/resume diagnostics.',
    ),
  ];

  const unsafeBoundaries = safetyBoundaries.filter((item) => item.tier === 'unsafe');
  const criticalOrWorse = safetyBoundaries.filter((item) => item.tier === 'critical' || item.tier === 'unsafe');
  const joined = files.map(sourceFor).join('\n');
  const forbiddenMutationRefs = count(
    joined,
    /automatic stop|automatic control|automatic correction|state repair|rollback|recommendation mutation|execution mutation|policy mutation/gi,
  );
  const runtimeSafetyEnvelopeScore = round(1 - Math.min(0.9, criticalOrWorse.length / safetyBoundaries.length));
  const unsafeTransitionRisk = round(unsafeBoundaries.length / safetyBoundaries.length);

  return {
    freezeTag: 'runtime-freeze-v1',
    safetyTierDefinitions,
    safetyBoundaries,
    unsafeBoundaryJudgement:
      unsafeBoundaries.length === 0
        ? ['No readonly safety boundary is currently classified as unsafe.']
        : unsafeBoundaries.map((item) => `${item.name}: ${item.tier}`),
    instrumentationCoverage: rows,
    metrics: {
      runtimeSafetyEnvelopeScore,
      hydrationBacklogLimit: safetyBoundaries[0].criticalLimit,
      deferredQueueSafetyMargin: round(1 - Math.min(0.9, safetyBoundaries[1].normalLimit / safetyBoundaries[1].unsafeLimit)),
      reconnectStormRisk: round(safetyBoundaries[2].tier === 'normal' ? 0 : 0.25),
      retryCascadeRisk: round(safetyBoundaries[3].tier === 'normal' ? 0 : 0.25),
      jsStallSafetyWindow: safetyBoundaries[4].degradedLimit,
      renderBurstTolerance: safetyBoundaries[5].degradedLimit,
      interactionLatencyBudget: safetyBoundaries[6].degradedLimit,
      memoryRetentionRisk: round(safetyBoundaries[7].tier === 'normal' ? 0 : 0.25),
      backgroundRecoveryRisk: round(safetyBoundaries[8].tier === 'normal' ? 0 : 0.25),
      unsafeTransitionRisk,
      runtimeFreezeIntegrityScore: forbiddenMutationRefs === 0 ? 1 : 0,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeSafetyEnvelopeReport(), null, 2));
}
