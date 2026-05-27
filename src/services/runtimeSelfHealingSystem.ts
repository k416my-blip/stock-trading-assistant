import { getAdaptiveRuntimeGovernorReport, type RuntimeHydrationPriority } from './adaptiveRuntimeGovernor';
import { getLongSessionRuntimeSoakReport } from './longSessionRuntimeSoak';
import { getProductionRuntimeProfilingReport } from './productionRuntimeProfiler';
import { getRuntimeChaosResilienceReport } from './runtimeChaosResilience';
import { getRuntimeFrameTelemetryReport } from './runtimeFrameTelemetry';
import { getRuntimeMemoryPressureDefenseReport } from './runtimeMemoryPressureDefense';

export type RuntimeAnomalyTier = 'normal' | 'elevated' | 'degraded' | 'critical';

export type RuntimeAnomalyKind =
  | 'freeze_precursor'
  | 'js_stall_escalation'
  | 'dropped_frame_escalation'
  | 'hydration_starvation'
  | 'reconnect_storm'
  | 'retry_cascade'
  | 'render_burst_escalation'
  | 'queue_congestion'
  | 'memory_pressure_escalation'
  | 'interaction_degradation';

export type RuntimeSelfHealingAction =
  | 'low_priority_hydration_suppression'
  | 'analytics_archive_delayed_activation'
  | 'retry_cooldown_extension'
  | 'reconnect_debounce_escalation'
  | 'hidden_dashboard_throttling'
  | 'proactive_refresh_suppression'
  | 'deferred_queue_cleanup'
  | 'timer_throttling'
  | 'staged_recovery'
  | 'interaction_priority_recovery'
  | 'gradual_hydration_replay';

export type RuntimeAnomalyEvent = {
  at: string;
  kind: RuntimeAnomalyKind | 'self_healing_action' | 'recovery_stage';
  tier: RuntimeAnomalyTier;
  label: string;
  value?: number;
  detail?: string;
};

export type RuntimeSelfHealingDecision = {
  allow: boolean;
  delayMs: number;
  tier: RuntimeAnomalyTier;
  actions: RuntimeSelfHealingAction[];
  reason: string;
};

export type RuntimeHealthScores = {
  runtimeHealthScore: number;
  interactionHealthScore: number;
  hydrationHealthScore: number;
  memoryHealthScore: number;
  reconnectHealthScore: number;
  renderHealthScore: number;
  jsThreadHealthScore: number;
};

export type RuntimeSelfHealingSystemReport = {
  anomalyDetectionReport: RuntimeAnomalyEvent[];
  selfHealingReport: RuntimeAnomalyEvent[];
  runtimeRecoveryReport: RuntimeAnomalyEvent[];
  escalationTimelineReport: RuntimeAnomalyEvent[];
  runtimeHealthDashboard: RuntimeHealthScores;
  androidDegradationReport: {
    backgroundWakeRisk: number;
    bridgeCongestionRisk: number;
    batterySaverRisk: number;
    offlineRecoveryRisk: number;
    longSessionRisk: number;
  };
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

const MAX_EVENTS = 260;
const events: RuntimeAnomalyEvent[] = [];
let lastTier: RuntimeAnomalyTier = 'normal';
let selfHealingActivations = 0;
let recoveryStages = 0;
let hydrationSuppressions = 0;
let reconnectSuppressions = 0;
let jsStallSuppressions = 0;

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function tierWeight(tier: RuntimeAnomalyTier): number {
  switch (tier) {
    case 'critical':
      return 3;
    case 'degraded':
      return 2;
    case 'elevated':
      return 1;
    case 'normal':
      return 0;
  }
}

function tierForRisk(value: number): RuntimeAnomalyTier {
  if (value >= 0.75) return 'critical';
  if (value >= 0.5) return 'degraded';
  if (value >= 0.25) return 'elevated';
  return 'normal';
}

function maxTier(...tiers: RuntimeAnomalyTier[]): RuntimeAnomalyTier {
  return tiers.reduce((max, tier) => (tierWeight(tier) > tierWeight(max) ? tier : max), 'normal');
}

function record(
  kind: RuntimeAnomalyEvent['kind'],
  tier: RuntimeAnomalyTier,
  label: string,
  value?: number,
  detail?: string,
): void {
  events.push({ at: new Date().toISOString(), kind, tier, label, value, detail });
  if (events.length > MAX_EVENTS) events.shift();
}

function recordAction(tier: RuntimeAnomalyTier, label: string, action: RuntimeSelfHealingAction, detail?: string): void {
  selfHealingActivations += 1;
  record('self_healing_action', tier, label, undefined, `${action}${detail ? `:${detail}` : ''}`);
}

function buildHealthScores(): RuntimeHealthScores {
  const production = getProductionRuntimeProfilingReport();
  const frame = getRuntimeFrameTelemetryReport();
  const memory = getRuntimeMemoryPressureDefenseReport();
  const chaos = getRuntimeChaosResilienceReport();
  const soak = getLongSessionRuntimeSoakReport();
  const interactionHealthScore = production.metrics.interactionResponsivenessScore;
  const hydrationHealthScore = Math.min(
    production.metrics.hydrationBlockingScore,
    frame.metrics.hydrationFramePressureScore,
    soak.metrics.hydrationReplaySafetyScore,
  );
  const memoryHealthScore = Math.min(
    production.metrics.memoryRetentionScore,
    memory.metrics.mobileMemoryResilienceScore,
  );
  const reconnectHealthScore = Math.min(
    production.metrics.runtimeLatencyScore,
    chaos.metrics.reconnectStabilityScore,
    soak.metrics.reconnectRecoveryScore,
  );
  const renderHealthScore = Math.min(
    production.metrics.frameStabilityScore,
    frame.metrics.renderBurstScore,
  );
  const jsThreadHealthScore = Math.min(
    production.metrics.jsThreadHealthScore,
    frame.metrics.jsThreadHealthScore,
    soak.metrics.jsThreadStabilityScore,
  );
  const runtimeHealthScore = round(
    (interactionHealthScore +
      hydrationHealthScore +
      memoryHealthScore +
      reconnectHealthScore +
      renderHealthScore +
      jsThreadHealthScore) /
      6,
  );
  return {
    runtimeHealthScore: round(runtimeHealthScore),
    interactionHealthScore: round(interactionHealthScore),
    hydrationHealthScore: round(hydrationHealthScore),
    memoryHealthScore: round(memoryHealthScore),
    reconnectHealthScore: round(reconnectHealthScore),
    renderHealthScore: round(renderHealthScore),
    jsThreadHealthScore: round(jsThreadHealthScore),
  };
}

export function evaluateRuntimeAnomalies(): RuntimeSelfHealingSystemReport {
  const production = getProductionRuntimeProfilingReport();
  const frame = getRuntimeFrameTelemetryReport();
  const memory = getRuntimeMemoryPressureDefenseReport();
  const chaos = getRuntimeChaosResilienceReport();
  const governor = getAdaptiveRuntimeGovernorReport();
  const soak = getLongSessionRuntimeSoakReport();
  const health = buildHealthScores();

  const jsRisk = Math.max(
    1 - health.jsThreadHealthScore,
    production.jsThreadReport.hermesGcPauseEstimates / 12,
    frame.mobileFramePressureReport.longTaskCount / 20,
  );
  const renderRisk = Math.max(
    1 - health.renderHealthScore,
    production.frameStabilityReport.frameStarvationEvents / 12,
    production.frameStabilityReport.renderBurstSpikes / 12,
  );
  const hydrationRisk = Math.max(
    1 - health.hydrationHealthScore,
    soak.hydrationReplayReport.hydrationStarvationCount / 8,
    governor.hydrationSuppressionDiagnostics.length / 16,
  );
  const reconnectRisk = Math.max(
    1 - health.reconnectHealthScore,
    chaos.retryStormReport.retryCascadeCount / 8,
    production.androidRecoveryReport.reconnectLatencyEvents / 20,
  );
  const memoryRisk = Math.max(
    1 - health.memoryHealthScore,
    memory.deferredQueueDiagnostics.queueEvictions / 12,
    memory.memoryPressureReport.filter((event) => event.kind === 'memory_growth_sample').length / 160,
  );
  const interactionRisk = Math.max(
    1 - health.interactionHealthScore,
    production.interactionLatencyReport.maxInteractionMs / 2_000,
  );
  const queueRisk = Math.max(
    memory.deferredQueueDiagnostics.activeDeferred / 10,
    soak.hydrationReplayReport.deferredQueueBuildupCount / 8,
  );
  const freezeRisk = Math.max(jsRisk, renderRisk, hydrationRisk, memoryRisk, queueRisk, interactionRisk);

  const jsTier = tierForRisk(jsRisk);
  const renderTier = tierForRisk(renderRisk);
  const hydrationTier = tierForRisk(hydrationRisk);
  const reconnectTier = tierForRisk(reconnectRisk);
  const memoryTier = tierForRisk(memoryRisk);
  const interactionTier = tierForRisk(interactionRisk);
  const queueTier = tierForRisk(queueRisk);
  const freezeTier = tierForRisk(freezeRisk);
  const escalationTier = maxTier(
    jsTier,
    renderTier,
    hydrationTier,
    reconnectTier,
    memoryTier,
    interactionTier,
    queueTier,
    freezeTier,
  );

  if (escalationTier !== lastTier) {
    record('recovery_stage', escalationTier, 'runtime-escalation-tier', undefined, `${lastTier}->${escalationTier}`);
    recoveryStages += 1;
    lastTier = escalationTier;
  }
  if (jsTier !== 'normal') record('js_stall_escalation', jsTier, 'JS thread', jsRisk);
  if (renderTier !== 'normal') record('render_burst_escalation', renderTier, 'render burst', renderRisk);
  if (renderTier === 'critical' || renderTier === 'degraded') record('dropped_frame_escalation', renderTier, 'frame drops', renderRisk);
  if (hydrationTier !== 'normal') record('hydration_starvation', hydrationTier, 'hydration', hydrationRisk);
  if (reconnectTier !== 'normal') record('reconnect_storm', reconnectTier, 'reconnect', reconnectRisk);
  if (chaos.retryStormReport.retryCascadeCount > 0) record('retry_cascade', reconnectTier, 'retry cascade', chaos.retryStormReport.retryCascadeCount);
  if (queueTier !== 'normal') record('queue_congestion', queueTier, 'deferred queue', queueRisk);
  if (memoryTier !== 'normal') record('memory_pressure_escalation', memoryTier, 'memory retention', memoryRisk);
  if (interactionTier !== 'normal') record('interaction_degradation', interactionTier, 'interaction latency', interactionRisk);
  if (freezeTier !== 'normal') record('freeze_precursor', freezeTier, 'freeze precursor', freezeRisk);

  const backgroundWakeRisk = Math.min(1, production.androidRecoveryReport.backgroundWakeLatencyEvents / 12);
  const bridgeCongestionRisk = Math.min(1, production.expoRuntimeReport.bridgeCongestionEstimates / 12);
  const batterySaverRisk = Math.min(1, production.androidRecoveryReport.batterySaverSlowdownEvents / 12);
  const offlineRecoveryRisk = Math.min(1, production.androidRecoveryReport.offlineRecoveryLatencyEvents / 24);
  const longSessionRisk = Math.min(1, production.expoRuntimeReport.longSessionDegradationEvents / 16);

  return {
    anomalyDetectionReport: events.filter((event) => event.kind !== 'self_healing_action' && event.kind !== 'recovery_stage'),
    selfHealingReport: events.filter((event) => event.kind === 'self_healing_action'),
    runtimeRecoveryReport: events.filter((event) => event.kind === 'recovery_stage'),
    escalationTimelineReport: [...events],
    runtimeHealthDashboard: health,
    androidDegradationReport: {
      backgroundWakeRisk: round(backgroundWakeRisk),
      bridgeCongestionRisk: round(bridgeCongestionRisk),
      batterySaverRisk: round(batterySaverRisk),
      offlineRecoveryRisk: round(offlineRecoveryRisk),
      longSessionRisk: round(longSessionRisk),
    },
    metrics: {
      anomalyContainmentScore: round(1 - Math.min(0.9, tierWeight(escalationTier) / 4)),
      selfHealingEffectivenessScore: round(1 - Math.min(0.85, selfHealingActivations / 120)),
      runtimeRecoveryScore: round(1 - Math.min(0.85, recoveryStages / 60)),
      hydrationProtectionScore: round(1 - Math.min(0.85, hydrationSuppressions / 60)),
      jsStallContainmentScore: round(1 - Math.min(0.85, jsStallSuppressions / 60)),
      reconnectContainmentScore: round(1 - Math.min(0.85, reconnectSuppressions / 60)),
      degradationRecoveryScore: round(1 - Math.min(0.85, (backgroundWakeRisk + bridgeCongestionRisk + longSessionRisk) / 3)),
    },
  };
}

export function decideSelfHealingRuntimeActivity(
  label: string,
  priority: RuntimeHydrationPriority,
): RuntimeSelfHealingDecision {
  const report = evaluateRuntimeAnomalies();
  const tier = report.escalationTimelineReport.at(-1)?.tier ?? 'normal';
  const lowPriority = priority === 'archive' || priority === 'analytics' || priority === 'proactive';
  const critical = tier === 'critical';
  const degraded = tier === 'degraded';
  const actions: RuntimeSelfHealingAction[] = [];
  if (!lowPriority) {
    return {
      allow: true,
      delayMs: tier === 'critical' ? 120 : 0,
      tier,
      actions: ['interaction_priority_recovery'],
      reason: `interaction/normal priority preserved;tier=${tier}`,
    };
  }

  if (critical) {
    actions.push(
      'low_priority_hydration_suppression',
      'analytics_archive_delayed_activation',
      'hidden_dashboard_throttling',
      'deferred_queue_cleanup',
      'staged_recovery',
    );
    hydrationSuppressions += 1;
    recordAction(tier, label, 'low_priority_hydration_suppression', priority);
    return {
      allow: false,
      delayMs: 15_000,
      tier,
      actions,
      reason: `critical self-healing suppression;priority=${priority}`,
    };
  }

  if (degraded) {
    actions.push('analytics_archive_delayed_activation', 'hidden_dashboard_throttling', 'gradual_hydration_replay');
    recordAction(tier, label, 'analytics_archive_delayed_activation', priority);
    return {
      allow: true,
      delayMs: priority === 'proactive' ? 3_000 : 8_000,
      tier,
      actions,
      reason: `degraded self-healing delay;priority=${priority}`,
    };
  }

  if (tier === 'elevated') {
    actions.push('gradual_hydration_replay');
    return {
      allow: true,
      delayMs: priority === 'archive' ? 2_000 : 800,
      tier,
      actions,
      reason: `elevated gradual hydration replay;priority=${priority}`,
    };
  }

  return { allow: true, delayMs: 0, tier, actions, reason: 'normal runtime health' };
}

export function shouldSuppressLowPriorityRuntimeActivity(scope: string): boolean {
  const report = evaluateRuntimeAnomalies();
  const tier = report.escalationTimelineReport.at(-1)?.tier ?? 'normal';
  const lowPriorityScope =
    scope.includes('proactive') ||
    scope.includes('deferred') ||
    scope.includes('dashboard') ||
    scope.includes('archive') ||
    scope.includes('analytics');
  if (!lowPriorityScope) return false;
  if (tier === 'critical') {
    reconnectSuppressions += 1;
    recordAction(tier, scope, 'reconnect_debounce_escalation', 'critical low-priority suppression');
    recordAction(tier, scope, 'proactive_refresh_suppression');
    return true;
  }
  if (tier === 'degraded') {
    recordAction(tier, scope, 'retry_cooldown_extension', 'degraded low-priority pacing');
  }
  return false;
}

export function noteSelfHealingRecoveryStage(label: string, detail?: string): void {
  const report = evaluateRuntimeAnomalies();
  const tier = report.escalationTimelineReport.at(-1)?.tier ?? 'normal';
  recoveryStages += 1;
  record('recovery_stage', tier, label, undefined, detail);
}

export function resetRuntimeSelfHealingSystemForTest(): void {
  events.length = 0;
  lastTier = 'normal';
  selfHealingActivations = 0;
  recoveryStages = 0;
  hydrationSuppressions = 0;
  reconnectSuppressions = 0;
  jsStallSuppressions = 0;
}
