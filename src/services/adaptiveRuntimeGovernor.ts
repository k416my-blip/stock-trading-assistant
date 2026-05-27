import { getMobileStabilityWatchdogReport } from './mobileStabilityWatchdog';
import { noteLongSessionGovernorReplay } from './longSessionRuntimeSoak';
import { getPerformanceCostSnapshot } from './performanceCostRuntime';
import { getRuntimeChaosResilienceReport } from './runtimeChaosResilience';
import { getRuntimeFrameTelemetryReport } from './runtimeFrameTelemetry';

export type RuntimePressureTier = 'normal' | 'elevated' | 'high' | 'critical';
export type RuntimeHydrationPriority = 'interaction' | 'normal' | 'proactive' | 'analytics' | 'archive';

export type AdaptiveRuntimeGovernorEventKind =
  | 'pressure_tier_transition'
  | 'governor_activation'
  | 'load_shedding'
  | 'hydration_suppression'
  | 'deferred_cancellation'
  | 'resume_staged_recovery';

export type AdaptiveRuntimeGovernorEvent = {
  at: string;
  kind: AdaptiveRuntimeGovernorEventKind;
  label: string;
  tier: RuntimePressureTier;
  detail?: string;
  value?: number;
};

export type AdaptiveRuntimePressureState = {
  runtimePressureState: RuntimePressureTier;
  hydrationPressureTier: RuntimePressureTier;
  jsStallPressureTier: RuntimePressureTier;
  renderBurstPressureTier: RuntimePressureTier;
  batteryAwareRuntimeTier: RuntimePressureTier;
  offlineRecoveryPressureTier: RuntimePressureTier;
  asyncCollisionPressureTier: RuntimePressureTier;
  backgroundResumePressureTier: RuntimePressureTier;
};

export type AdaptiveHydrationDecision = {
  allow: boolean;
  delayMs: number;
  priority: RuntimeHydrationPriority;
  pressure: AdaptiveRuntimePressureState;
  reason: string;
};

export type AdaptiveRuntimeGovernorReport = {
  governorActivationReport: AdaptiveRuntimeGovernorEvent[];
  pressureTierTransitions: AdaptiveRuntimeGovernorEvent[];
  deferredCancellationDiagnostics: AdaptiveRuntimeGovernorEvent[];
  loadSheddingDiagnostics: AdaptiveRuntimeGovernorEvent[];
  hydrationSuppressionDiagnostics: AdaptiveRuntimeGovernorEvent[];
  pressureState: AdaptiveRuntimePressureState;
  metrics: {
    adaptiveRuntimeSafetyScore: number;
    hydrationGovernorScore: number;
    renderPressureContainmentScore: number;
    mobileGovernorEfficiencyScore: number;
    interactionPrioritySafetyScore: number;
    loadSheddingEffectivenessScore: number;
  };
};

const MAX_EVENTS = 220;
const events: AdaptiveRuntimeGovernorEvent[] = [];
let lastRuntimeTier: RuntimePressureTier = 'normal';
let loadSheddingCount = 0;
let hydrationSuppressionCount = 0;
let deferredCancellationCount = 0;
let interactionAllowCount = 0;
let governorActivationCount = 0;

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function tierForPressure(value: number): RuntimePressureTier {
  if (value >= 0.75) return 'critical';
  if (value >= 0.5) return 'high';
  if (value >= 0.25) return 'elevated';
  return 'normal';
}

function tierWeight(tier: RuntimePressureTier): number {
  switch (tier) {
    case 'critical':
      return 3;
    case 'high':
      return 2;
    case 'elevated':
      return 1;
    case 'normal':
      return 0;
  }
}

function maxTier(...tiers: RuntimePressureTier[]): RuntimePressureTier {
  return tiers.reduce((max, tier) => (tierWeight(tier) > tierWeight(max) ? tier : max), 'normal');
}

function record(
  kind: AdaptiveRuntimeGovernorEventKind,
  label: string,
  tier: RuntimePressureTier,
  detail?: string,
  value?: number,
): void {
  events.push({ at: new Date().toISOString(), kind, label, tier, detail, value });
  if (events.length > MAX_EVENTS) events.shift();
}

export function getAdaptiveRuntimePressureState(): AdaptiveRuntimePressureState {
  const frame = getRuntimeFrameTelemetryReport();
  const mobile = getMobileStabilityWatchdogReport();
  const chaos = getRuntimeChaosResilienceReport();
  const performance = getPerformanceCostSnapshot();

  const hydrationPressureTier = tierForPressure(
    Math.max(
      1 - frame.metrics.hydrationFramePressureScore,
      1 - mobile.metrics.hydrationBacklogReduction,
      chaos.hydrationCollisionReport.hydrationCollisions / 20,
    ),
  );
  const jsStallPressureTier = tierForPressure(
    Math.max(
      1 - frame.metrics.jsThreadHealthScore,
      frame.mobileFramePressureReport.longTaskCount / 20,
    ),
  );
  const renderBurstPressureTier = tierForPressure(
    Math.max(
      1 - frame.metrics.renderBurstScore,
      1 - mobile.metrics.renderBurstContainmentScore,
      mobile.runtimeWatchdogReport.renderBurstCount / 20,
    ),
  );
  const batteryAwareRuntimeTier = performance.batterySaverActive ? 'high' : 'normal';
  const offlineRecoveryPressureTier = tierForPressure(
    Math.max(
      performance.offlineMode ? 0.65 : 0,
      1 - chaos.metrics.offlineRecoverySafetyScore,
      chaos.offlineRecoveryReport.offlineQueueRejected / 12,
    ),
  );
  const asyncCollisionPressureTier = tierForPressure(
    Math.max(
      1 - chaos.metrics.asyncSafetyScore,
      chaos.asyncCollisionReport.duplicateAsyncCount / 16,
      chaos.asyncCollisionReport.pendingScopes / 12,
    ),
  );
  const backgroundResumePressureTier = tierForPressure(
    Math.max(
      frame.mobileFramePressureReport.resumeSpikeCount / 8,
      mobile.renderFreezeDiagnostics.foregroundResumes / 60,
    ),
  );
  const runtimePressureState = maxTier(
    hydrationPressureTier,
    jsStallPressureTier,
    renderBurstPressureTier,
    batteryAwareRuntimeTier,
    offlineRecoveryPressureTier,
    asyncCollisionPressureTier,
    backgroundResumePressureTier,
  );

  if (runtimePressureState !== lastRuntimeTier) {
    record(
      'pressure_tier_transition',
      'adaptive-runtime-governor',
      runtimePressureState,
      `${lastRuntimeTier}->${runtimePressureState}`,
    );
    lastRuntimeTier = runtimePressureState;
  }

  return {
    runtimePressureState,
    hydrationPressureTier,
    jsStallPressureTier,
    renderBurstPressureTier,
    batteryAwareRuntimeTier,
    offlineRecoveryPressureTier,
    asyncCollisionPressureTier,
    backgroundResumePressureTier,
  };
}

function priorityDelay(priority: RuntimeHydrationPriority, tier: RuntimePressureTier): number {
  if (priority === 'interaction') return tier === 'critical' ? 120 : 0;
  if (tier === 'normal') return 0;
  if (tier === 'elevated') {
    if (priority === 'archive') return 1_200;
    if (priority === 'analytics') return 600;
    if (priority === 'proactive') return 300;
    return 120;
  }
  if (tier === 'high') {
    if (priority === 'archive') return 3_000;
    if (priority === 'analytics') return 1_800;
    if (priority === 'proactive') return 900;
    return 300;
  }
  if (priority === 'archive') return 6_000;
  if (priority === 'analytics') return 3_600;
  if (priority === 'proactive') return 1_800;
  return 600;
}

function shouldSuppress(priority: RuntimeHydrationPriority, pressure: AdaptiveRuntimePressureState): boolean {
  if (priority === 'interaction') return false;
  if (pressure.runtimePressureState !== 'critical') return false;
  if (priority === 'archive' || priority === 'analytics') return true;
  return (
    priority === 'proactive' &&
    (pressure.jsStallPressureTier === 'critical' ||
      pressure.offlineRecoveryPressureTier === 'critical' ||
      pressure.hydrationPressureTier === 'critical')
  );
}

export function decideAdaptiveHydration(
  label: string,
  priority: RuntimeHydrationPriority = 'normal',
  baseDelayMs = 0,
): AdaptiveHydrationDecision {
  const pressure = getAdaptiveRuntimePressureState();
  const governorDelay = priorityDelay(priority, pressure.runtimePressureState);
  const allow = !shouldSuppress(priority, pressure);
  const delayMs = Math.max(baseDelayMs, governorDelay);
  const reason = allow
    ? `tier=${pressure.runtimePressureState};priority=${priority};delay=${delayMs}`
    : `suppressed;tier=${pressure.runtimePressureState};priority=${priority}`;

  governorActivationCount += 1;
  record('governor_activation', label, pressure.runtimePressureState, reason, delayMs);
  noteLongSessionGovernorReplay(label, reason);
  if (priority === 'interaction' && allow) interactionAllowCount += 1;
  if (!allow) {
    hydrationSuppressionCount += 1;
    loadSheddingCount += 1;
    record('hydration_suppression', label, pressure.runtimePressureState, reason, delayMs);
    record('load_shedding', label, pressure.runtimePressureState, reason, delayMs);
  } else if (delayMs > baseDelayMs) {
    loadSheddingCount += 1;
    record('load_shedding', label, pressure.runtimePressureState, reason, delayMs);
  }

  return { allow, delayMs, priority, pressure, reason };
}

export function noteAdaptiveDeferredCancellation(label: string, reason: string): void {
  const pressure = getAdaptiveRuntimePressureState();
  deferredCancellationCount += 1;
  record('deferred_cancellation', label, pressure.runtimePressureState, reason);
}

export function noteAdaptiveResumeStagedRecovery(label: string): void {
  const pressure = getAdaptiveRuntimePressureState();
  record('resume_staged_recovery', label, pressure.runtimePressureState);
}

export function getAdaptiveRuntimeGovernorReport(): AdaptiveRuntimeGovernorReport {
  const pressureState = getAdaptiveRuntimePressureState();
  const pressureWeight = tierWeight(pressureState.runtimePressureState);
  const adaptiveRuntimeSafetyScore = round(1 - Math.min(0.85, pressureWeight / 4));
  const hydrationGovernorScore = round(
    1 - Math.min(0.85, tierWeight(pressureState.hydrationPressureTier) / 4),
  );
  const renderPressureContainmentScore = round(
    1 - Math.min(0.85, tierWeight(pressureState.renderBurstPressureTier) / 4),
  );
  const mobileGovernorEfficiencyScore = round(
    1 -
      Math.min(
        0.85,
        Math.max(
          tierWeight(pressureState.batteryAwareRuntimeTier),
          tierWeight(pressureState.offlineRecoveryPressureTier),
          tierWeight(pressureState.backgroundResumePressureTier),
        ) / 4,
      ),
  );
  const interactionPrioritySafetyScore = round(
    governorActivationCount > 0 ? Math.min(1, (interactionAllowCount + 1) / (governorActivationCount + 1)) : 1,
  );
  const loadSheddingEffectivenessScore = round(
    1 - Math.min(0.85, (hydrationSuppressionCount + deferredCancellationCount) / Math.max(8, loadSheddingCount + 8)),
  );

  return {
    governorActivationReport: [...events],
    pressureTierTransitions: events.filter((event) => event.kind === 'pressure_tier_transition'),
    deferredCancellationDiagnostics: events.filter((event) => event.kind === 'deferred_cancellation'),
    loadSheddingDiagnostics: events.filter((event) => event.kind === 'load_shedding'),
    hydrationSuppressionDiagnostics: events.filter((event) => event.kind === 'hydration_suppression'),
    pressureState,
    metrics: {
      adaptiveRuntimeSafetyScore,
      hydrationGovernorScore,
      renderPressureContainmentScore,
      mobileGovernorEfficiencyScore,
      interactionPrioritySafetyScore,
      loadSheddingEffectivenessScore,
    },
  };
}

export function resetAdaptiveRuntimeGovernorForTest(): void {
  events.length = 0;
  lastRuntimeTier = 'normal';
  loadSheddingCount = 0;
  hydrationSuppressionCount = 0;
  deferredCancellationCount = 0;
  interactionAllowCount = 0;
  governorActivationCount = 0;
}
