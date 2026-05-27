import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeSelfHealingSystemStaticReport = {
  freezeTag: 'runtime-freeze-v1';
  anomalyHotspots: string[];
  selfHealingActivationBehavior: string[];
  hydrationSuppressionBehavior: string[];
  retryReconnectContainmentBehavior: string[];
  jsStallContainmentBehavior: string[];
  runtimeRecoveryTimeline: string[];
  instrumentationCoverage: Array<{
    file: string;
    bytes: number;
    anomalyReferences: number;
    selfHealingReferences: number;
    healthScoreReferences: number;
    suppressionReferences: number;
    recoveryReferences: number;
  }>;
  metrics: {
    anomalyContainmentScore: number;
    selfHealingEffectivenessScore: number;
    runtimeRecoveryScore: number;
    hydrationProtectionScore: number;
    jsStallContainmentScore: number;
    reconnectContainmentScore: number;
    degradationRecoveryScore: number;
  };
};

const root = process.cwd();
const files = [
  'src/services/runtimeSelfHealingSystem.ts',
  'src/hooks/useDeferredRenderActivation.ts',
  'App.tsx',
  'src/context/ProactiveConciergeContext.tsx',
  'src/services/productionRuntimeProfiler.ts',
  'src/services/adaptiveRuntimeGovernor.ts',
  'src/services/runtimeMemoryPressureDefense.ts',
  'src/services/runtimeChaosResilience.ts',
  'src/services/longSessionRuntimeSoak.ts',
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

export function buildRuntimeSelfHealingSystemReport(): RuntimeSelfHealingSystemStaticReport {
  const rows = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      anomalyReferences: count(source, /anomaly|freeze_precursor|escalation|RuntimeAnomaly/g),
      selfHealingReferences: count(source, /selfHealing|SelfHealing|noteSelfHealing|shouldSuppressLowPriorityRuntimeActivity/g),
      healthScoreReferences: count(source, /HealthScore|HealthScores|runtimeHealthScore|jsThreadHealthScore/g),
      suppressionReferences: count(source, /suppression|suppress|hydration_suppression|proactive_refresh_suppression/g),
      recoveryReferences: count(source, /recovery|Recovery|staged_recovery|gradual_hydration_replay/g),
    };
  });
  const joined = files.map(sourceFor).join('\n');
  const anomalyRefs = count(joined, /freeze_precursor|js_stall_escalation|hydration_starvation|reconnect_storm|retry_cascade/g);
  const healingRefs = count(joined, /self_healing_action|decideSelfHealingRuntimeActivity|shouldSuppressLowPriorityRuntimeActivity/g);
  const healthRefs = count(joined, /runtimeHealthScore|interactionHealthScore|hydrationHealthScore|memoryHealthScore|reconnectHealthScore|renderHealthScore|jsThreadHealthScore/g);
  const suppressionRefs = count(joined, /low_priority_hydration_suppression|proactive_refresh_suppression|self-healing.*suppression|hydration suppression/gi);
  const recoveryRefs = count(joined, /staged_recovery|interaction_priority_recovery|gradual_hydration_replay|noteSelfHealingRecoveryStage/g);
  const reconnectRefs = count(joined, /reconnect_debounce_escalation|retry_cooldown_extension|reconnect/g);
  const jsRefs = count(joined, /js_stall|JS thread|jsThreadHealthScore/g);

  return {
    freezeTag: 'runtime-freeze-v1',
    anomalyHotspots: [
      'Freeze precursor detection combines JS, render, hydration, memory, queue, and interaction risk.',
      'JS stall escalation is derived from production profile, frame telemetry, and long-session soak samples.',
      'Hydration starvation and deferred queue congestion are derived from hydration replay and memory defense.',
      'Reconnect storms and retry cascades are derived from chaos resilience and production reconnect latency.',
    ],
    selfHealingActivationBehavior: [
      'Critical tier suppresses low-priority hydration and schedules staged retry.',
      'Degraded tier delays analytics/archive/proactive hydration while preserving interaction priority.',
      'Low-priority proactive refresh and deferred boot are suppressible during critical anomaly pressure.',
    ],
    hydrationSuppressionBehavior: [
      'Analytics/archive/proactive hydration are the only automatic suppression targets.',
      'Interaction and normal priority activity are preserved with minimal delay.',
      'Suppression records diagnostics and retry pacing rather than mutating application semantics.',
    ],
    retryReconnectContainmentBehavior: [
      'Critical low-priority scopes record reconnect debounce escalation and proactive refresh suppression.',
      'Degraded low-priority scopes record retry cooldown extension diagnostics.',
      'Reconnect/retry containment is scoped to low-priority runtime activity.',
    ],
    jsStallContainmentBehavior: [
      'JS stall escalation contributes to critical/degraded tiering.',
      'Critical tier prevents heavy low-priority hydration during stall pressure.',
      'Recovery replays hydration gradually after self-healing delay.',
    ],
    runtimeRecoveryTimeline: [
      'Escalation tier transitions are recorded as recovery stages.',
      'Foreground resume records interaction-priority recovery.',
      'Successful proactive refresh records recovery stage completion.',
      'Gradual hydration replay is scheduled after critical/degraded suppression.',
    ],
    instrumentationCoverage: rows,
    metrics: {
      anomalyContainmentScore: round(Math.min(1, anomalyRefs / 18)),
      selfHealingEffectivenessScore: round(Math.min(1, healingRefs / 12)),
      runtimeRecoveryScore: round(Math.min(1, recoveryRefs / 12)),
      hydrationProtectionScore: round(Math.min(1, suppressionRefs / 8)),
      jsStallContainmentScore: round(Math.min(1, jsRefs / 8)),
      reconnectContainmentScore: round(Math.min(1, reconnectRefs / 12)),
      degradationRecoveryScore: round(Math.min(1, (healthRefs + recoveryRefs) / 24)),
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeSelfHealingSystemReport(), null, 2));
}
