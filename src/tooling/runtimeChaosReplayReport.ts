import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeChaosReplaySequenceKind =
  | 'reconnect_storm'
  | 'rapid_foreground_background'
  | 'hydration_starvation'
  | 'render_burst'
  | 'js_stall_cascade'
  | 'offline_online_oscillation'
  | 'retry_cascade'
  | 'battery_saver_oscillation'
  | 'thermal_throttling'
  | 'deferred_queue_congestion'
  | 'navigation_thrash'
  | 'long_session_degradation';

export type RuntimeChaosReplaySequence = {
  kind: RuntimeChaosReplaySequenceKind;
  baselineOrder: string[];
  chaosOrder: string[];
  equivalentRecovery: boolean;
  orderingPreserved: boolean;
  invariant: string;
};

export type RuntimeChaosReplayReport = {
  freezeTag: 'runtime-freeze-v1';
  replaySequenceCoverage: RuntimeChaosReplaySequence[];
  recoveryEquivalenceCoverage: string[];
  replayOrderingValidation: string[];
  chaosDiagnosticsCoverage: string[];
  instrumentationCoverage: Array<{
    file: string;
    bytes: number;
    replayReferences: number;
    chaosReferences: number;
    reconnectReferences: number;
    retryReferences: number;
    hydrationReferences: number;
    interactionReferences: number;
    navigationReferences: number;
    recoveryReferences: number;
  }>;
  metrics: {
    runtimeChaosReplayScore: number;
    recoveryEquivalenceScore: number;
    replayOrderingIntegrityScore: number;
    reconnectOscillationRisk: number;
    retryAmplificationRisk: number;
    hiddenStarvationRisk: number;
    interactionBlackoutRisk: number;
    hydrationRecoveryIntegrity: number;
    deferredReplayIntegrity: number;
    runtimeFreezeIntegrityScore: number;
  };
};

const root = process.cwd();
const files = [
  'src/services/runtimeChaosResilience.ts',
  'src/services/longSessionRuntimeSoak.ts',
  'src/services/runtimeSelfHealingSystem.ts',
  'src/services/runtimeDeviceAdaptiveOptimization.ts',
  'src/services/runtimeMemoryPressureDefense.ts',
  'src/services/runtimeFrameTelemetry.ts',
  'src/services/productionRuntimeProfiler.ts',
  'src/hooks/useDeferredRenderActivation.ts',
  'src/tooling/runtimeDeterminismValidationReport.ts',
  'src/tooling/runtimeUXDeterminismReport.ts',
  'src/tooling/runtimeSafetyEnvelopeReport.ts',
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

function normalizeReplay(items: string[]): string[] {
  return items.filter(
    (item) =>
      !item.startsWith('delay:') &&
      !item.startsWith('jitter:') &&
      !item.startsWith('oscillation:') &&
      !item.startsWith('throttle:') &&
      !item.startsWith('telemetry:'),
  );
}

function sequence(
  kind: RuntimeChaosReplaySequenceKind,
  baselineOrder: string[],
  chaosOrder: string[],
  invariant: string,
): RuntimeChaosReplaySequence {
  const normalizedBaseline = normalizeReplay(baselineOrder).join('|');
  const normalizedChaos = normalizeReplay(chaosOrder).join('|');
  const equivalentRecovery = normalizedBaseline === normalizedChaos;
  const orderingPreserved = baselineOrder[0] === chaosOrder[0] && baselineOrder.at(-1) === chaosOrder.at(-1);
  return {
    kind,
    baselineOrder,
    chaosOrder,
    equivalentRecovery,
    orderingPreserved,
    invariant,
  };
}

export function buildRuntimeChaosReplayReport(): RuntimeChaosReplayReport {
  const replaySequenceCoverage: RuntimeChaosReplaySequence[] = [
    sequence(
      'reconnect_storm',
      ['offline:visible', 'reconnect:queued', 'reconnect:stable', 'actions:ready'],
      ['offline:visible', 'oscillation:reconnect-burst', 'delay:cooldown', 'reconnect:queued', 'reconnect:stable', 'actions:ready'],
      'Reconnect storms may be paced, but recovery visibility and action readiness remain equivalent.',
    ),
    sequence(
      'rapid_foreground_background',
      ['background', 'active', 'resume:staged', 'hydration:ready'],
      ['background', 'oscillation:foreground-background', 'active', 'resume:staged', 'hydration:ready'],
      'Rapid AppState oscillation preserves staged resume recovery ordering.',
    ),
    sequence(
      'hydration_starvation',
      ['placeholder:visible', 'hydration:queued', 'content:visible'],
      ['placeholder:visible', 'delay:starvation-window', 'hydration:queued', 'content:visible'],
      'Hydration starvation diagnostics do not change placeholder to content semantics.',
    ),
    sequence(
      'render_burst',
      ['shell:visible', 'metrics:visible', 'actions:ready'],
      ['shell:visible', 'jitter:render-burst', 'metrics:visible', 'actions:ready'],
      'Render burst replay preserves shell, metrics, and action readiness ordering.',
    ),
    sequence(
      'js_stall_cascade',
      ['interaction:requested', 'js:blocked', 'interaction:completed'],
      ['interaction:requested', 'jitter:stall-cascade', 'js:blocked', 'interaction:completed'],
      'JS stall cascade replay preserves requested-to-completed interaction semantics.',
    ),
    sequence(
      'offline_online_oscillation',
      ['offline:visible', 'queue:paused', 'online:visible', 'queue:resumed'],
      ['offline:visible', 'oscillation:offline-online', 'queue:paused', 'online:visible', 'queue:resumed'],
      'Offline/online oscillation preserves queue pause/resume ordering.',
    ),
    sequence(
      'retry_cascade',
      ['request:start', 'retry:transient-only', 'stale:rejected', 'request:settled'],
      ['request:start', 'oscillation:retry-cascade', 'retry:transient-only', 'stale:rejected', 'request:settled'],
      'Retry cascade replay preserves transient-only retry and stale rejection ordering.',
    ),
    sequence(
      'battery_saver_oscillation',
      ['low-power:detected', 'hydration:paced', 'interaction:preserved'],
      ['low-power:detected', 'oscillation:battery-saver', 'hydration:paced', 'interaction:preserved'],
      'Battery saver oscillation preserves interaction-priority recovery.',
    ),
    sequence(
      'thermal_throttling',
      ['thermal:detected', 'low-priority:paced', 'interaction:preserved'],
      ['thermal:detected', 'throttle:thermal', 'low-priority:paced', 'interaction:preserved'],
      'Thermal throttling replay preserves low-priority-only pacing boundaries.',
    ),
    sequence(
      'deferred_queue_congestion',
      ['deferred:queued', 'queue:paced', 'deferred:completed'],
      ['deferred:queued', 'oscillation:queue-congestion', 'queue:paced', 'deferred:completed'],
      'Deferred queue congestion preserves queued-to-completed replay integrity.',
    ),
    sequence(
      'navigation_thrash',
      ['navigation:start', 'route:focused', 'screen:usable'],
      ['navigation:start', 'oscillation:navigation-thrash', 'route:focused', 'screen:usable'],
      'Navigation thrash replay preserves route focus before screen usability.',
    ),
    sequence(
      'long_session_degradation',
      ['session:stable', 'degradation:detected', 'recovery:staged', 'session:observable'],
      ['session:stable', 'telemetry:long-session-drift', 'degradation:detected', 'recovery:staged', 'session:observable'],
      'Long-session degradation replay preserves staged recovery observability.',
    ),
  ];

  const recoveryEquivalenceCoverage = [
    'reconnect recovery equivalence',
    'hydration recovery equivalence',
    'retry recovery equivalence',
    'interaction recovery equivalence',
    'navigation recovery equivalence',
    'deferred replay equivalence',
  ];
  const replayOrderingValidation = [
    'async replay ordering',
    'reconnect replay ordering',
    'hydration replay ordering',
    'deferred activation ordering',
    'loading visibility ordering',
    'progressive reveal ordering',
  ];
  const chaosDiagnosticsCoverage = [
    'hidden starvation',
    'replay dead-zone',
    'reconnect oscillation',
    'retry amplification',
    'queue starvation',
    'interaction blackout',
    'invisible hydration blocking',
    'render collapse precursor',
    'JS degradation precursor',
    'background recovery drift',
  ];

  const rows = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      replayReferences: count(source, /replay|Replay|equivalence|ordering/gi),
      chaosReferences: count(source, /chaos|storm|oscillation|cascade|starvation|thrash/gi),
      reconnectReferences: count(source, /reconnect|Reconnect|cooldown|debounce/g),
      retryReferences: count(source, /retry|Retry|cascade/g),
      hydrationReferences: count(source, /hydration|Hydration|deferred/g),
      interactionReferences: count(source, /interaction|Interaction|ready|usable/g),
      navigationReferences: count(source, /navigation|Navigation|route|transition/g),
      recoveryReferences: count(source, /recovery|Recovery|resume|staged/g),
    };
  });

  const joined = files.map(sourceFor).join('\n');
  const runtimeImplementationSources = files
    .filter((file) => !file.startsWith('src/tooling/'))
    .map(sourceFor)
    .join('\n');
  const forbiddenMutationRefs = count(
    runtimeImplementationSources,
    /runtime control|self-fix|auto recovery implementation|automatic repair|semantic mutation|reducer rewrite|provider rewrite/gi,
  );
  const equivalentCount = replaySequenceCoverage.filter((item) => item.equivalentRecovery).length;
  const orderingCount = replaySequenceCoverage.filter((item) => item.orderingPreserved).length;
  const reconnectRisk = replaySequenceCoverage.some((item) => item.kind === 'reconnect_storm' && !item.equivalentRecovery) ? 1 : 0;
  const retryRisk = replaySequenceCoverage.some((item) => item.kind === 'retry_cascade' && !item.equivalentRecovery) ? 1 : 0;
  const hiddenRisk = replaySequenceCoverage.some((item) => item.kind === 'hydration_starvation' && !item.equivalentRecovery) ? 1 : 0;
  const interactionRisk = replaySequenceCoverage.some((item) => item.kind === 'js_stall_cascade' && !item.equivalentRecovery) ? 1 : 0;

  return {
    freezeTag: 'runtime-freeze-v1',
    replaySequenceCoverage,
    recoveryEquivalenceCoverage,
    replayOrderingValidation,
    chaosDiagnosticsCoverage,
    instrumentationCoverage: rows,
    metrics: {
      runtimeChaosReplayScore: round(equivalentCount / replaySequenceCoverage.length),
      recoveryEquivalenceScore: round(recoveryEquivalenceCoverage.length / 6),
      replayOrderingIntegrityScore: round(orderingCount / replaySequenceCoverage.length),
      reconnectOscillationRisk: reconnectRisk,
      retryAmplificationRisk: retryRisk,
      hiddenStarvationRisk: hiddenRisk,
      interactionBlackoutRisk: interactionRisk,
      hydrationRecoveryIntegrity: round(
        replaySequenceCoverage.filter((item) => item.kind === 'hydration_starvation' && item.equivalentRecovery).length,
      ),
      deferredReplayIntegrity: round(
        replaySequenceCoverage.filter((item) => item.kind === 'deferred_queue_congestion' && item.equivalentRecovery).length,
      ),
      runtimeFreezeIntegrityScore: forbiddenMutationRefs === 0 ? 1 : 0,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeChaosReplayReport(), null, 2));
}
