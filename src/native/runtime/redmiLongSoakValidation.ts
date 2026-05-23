/**
 * Redmi Note 13 Pro long soak validation — session recorder, scenario log, export.
 * Diagnostic only — no policy mutations.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  RedmiLongSoakDashboardReport,
  RedmiLongSoakExport,
  RedmiSoakCheckpoint,
  RedmiSoakCriticalCheck,
  RedmiSoakFailureEvent,
  RedmiSoakScenarioEvent,
  RedmiSoakScenarioId,
  RedmiSoakSummary,
} from '../../types/redmiLongSoakValidation';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import {
  REDMI_SOAK_CHECKPOINT_INTERVAL_MS,
  REDMI_SOAK_CRITICAL_CHECKS,
  REDMI_SOAK_MIN_HOURS,
  REDMI_SOAK_PERSIST_INTERVAL_MS,
  REDMI_SOAK_RECONNECT_STORM_PER_MIN,
  REDMI_SOAK_RESUME_LATENCY_MS,
  REDMI_SOAK_SCENARIO_LABELS,
  REDMI_SOAK_STORAGE_KEY,
  REDMI_SOAK_TIMER_DRIFT_MS,
  REDMI_SOAK_VALIDATION_VERSION,
  REDMI_SOAK_LONG_SUSPEND_MS,
} from '../../constants/redmiLongSoakValidation';
import { getLastNativeRuntimeSnapshot } from './nativeRuntimeBridge';
import { buildNativeBoundaryValidationReport } from './nativeBoundaryValidation';
import { exportTrackerReplaySnapshot } from '../../runtime/stability/trackerReplaySnapshot';
import { getMiuiDiagnostics } from '../../runtime/stability/miuiBatteryDiagnostics';
import { getReconnectPerMin, getWsDuplicateCount } from '../../runtime/stability/RuntimeReconnectTracker';
import { getHydrationLockState } from '../../runtime/stability/hydrationLock';
import { getResumeTransitionCount } from '../../services/mobileRedmiRuntime';

type SessionState = {
  active: boolean;
  startedAt: number;
  targetHours: number;
  lastCheckpointAt: number;
  lastPersistAt: number;
  lastBatterySaver: boolean | null;
  lastNetworkQuality: string | null;
  lastResumeTransitionCount: number;
  resumeSpamWindowStart: number;
  resumeSpamCount: number;
};

const scenarioLog: RedmiSoakScenarioEvent[] = [];
const failureTimeline: RedmiSoakFailureEvent[] = [];
const checkpoints: RedmiSoakCheckpoint[] = [];
const checkCounts: Record<RedmiSoakCriticalCheck, { occurrences: number; lastAt: string | null }> =
  Object.fromEntries(REDMI_SOAK_CRITICAL_CHECKS.map((c) => [c, { occurrences: 0, lastAt: null }])) as Record<
    RedmiSoakCriticalCheck,
    { occurrences: number; lastAt: string | null }
  >;

const session: SessionState = {
  active: false,
  startedAt: 0,
  targetHours: REDMI_SOAK_MIN_HOURS,
  lastCheckpointAt: 0,
  lastPersistAt: 0,
  lastBatterySaver: null,
  lastNetworkQuality: null,
  lastResumeTransitionCount: 0,
  resumeSpamWindowStart: 0,
  resumeSpamCount: 0,
};

const scenariosSeen = new Set<RedmiSoakScenarioId>();

export function resetRedmiLongSoakValidationForTest(): void {
  session.active = false;
  session.startedAt = 0;
  session.lastCheckpointAt = 0;
  session.lastPersistAt = 0;
  session.lastBatterySaver = null;
  session.lastNetworkQuality = null;
  session.lastResumeTransitionCount = 0;
  session.resumeSpamWindowStart = 0;
  session.resumeSpamCount = 0;
  scenarioLog.length = 0;
  failureTimeline.length = 0;
  checkpoints.length = 0;
  scenariosSeen.clear();
  for (const key of REDMI_SOAK_CRITICAL_CHECKS) {
    checkCounts[key] = { occurrences: 0, lastAt: null };
  }
}

export function startRedmiLongSoakSession(targetHours = REDMI_SOAK_MIN_HOURS): void {
  session.active = true;
  session.startedAt = Date.now();
  session.targetHours = Math.max(REDMI_SOAK_MIN_HOURS, targetHours);
  session.lastCheckpointAt = 0;
  session.lastPersistAt = 0;
  noteRedmiSoakScenario('overnight_idle', false, 'soak session started');
}

export function isRedmiLongSoakActive(): boolean {
  return session.active;
}

export function getRedmiSoakElapsedMs(): number {
  if (!session.active) return 0;
  return Date.now() - session.startedAt;
}

export function noteRedmiSoakScenario(
  scenario: RedmiSoakScenarioId,
  autoDetected: boolean,
  detailJa: string,
): void {
  if (!session.active && scenario !== 'overnight_idle') return;
  scenariosSeen.add(scenario);
  scenarioLog.push({
    at: new Date().toISOString(),
    scenario,
    autoDetected,
    detailJa,
  });
  if (scenarioLog.length > 500) scenarioLog.shift();
}

function recordFailure(check: RedmiSoakCriticalCheck, severity: RedmiSoakFailureEvent['severity'], detailJa: string): void {
  const at = new Date().toISOString();
  checkCounts[check].occurrences += 1;
  checkCounts[check].lastAt = at;
  failureTimeline.push({ at, check, severity, detailJa });
  if (failureTimeline.length > 200) failureTimeline.shift();
}

function evaluateCriticalChecks(metrics: RuntimeTelemetryMetricsSnapshot): void {
  const boundary = buildNativeBoundaryValidationReport();
  const miui = getMiuiDiagnostics();
  const hydration = getHydrationLockState();

  if (boundary.bypassDetected) {
    recordFailure('native_reconnect_bypass', 'critical', boundary.bypassDetailJa);
  }
  if (boundary.comparison.duplicateSocketCount > 0) {
    recordFailure(
      'duplicate_reconnect',
      'warn',
      `duplicate sockets ${boundary.comparison.duplicateSocketCount}`,
    );
  }
  if (!boundary.comparison.ownershipConsistent) {
    recordFailure('coordinator_ownership_violation', 'critical', 'ownership inconsistent');
  }
  if (getReconnectPerMin() >= REDMI_SOAK_RECONNECT_STORM_PER_MIN) {
    recordFailure('reconnect_storm', 'critical', `reconnect ${getReconnectPerMin()}/min`);
  }
  if (hydration.overlapCount >= 1) {
    recordFailure('hydration_race', 'warn', `hydration overlap ${hydration.overlapCount}`);
  }
  if (miui.timerDriftMs >= REDMI_SOAK_TIMER_DRIFT_MS) {
    recordFailure('timer_resurrection', 'warn', `timer drift ${miui.timerDriftMs}ms`);
  }
  if (miui.silentDisconnectCount >= 1) {
    recordFailure(
      'silent_websocket_disconnect',
      'warn',
      `silent disconnects ${miui.silentDisconnectCount}`,
    );
  }
  if (miui.resumeLatencyMs >= REDMI_SOAK_RESUME_LATENCY_MS) {
    recordFailure('miui_delayed_resume', 'warn', `resume latency ${miui.resumeLatencyMs}ms`);
  }
  void metrics;
}

function maybeCheckpoint(metrics: RuntimeTelemetryMetricsSnapshot): void {
  const now = Date.now();
  if (now - session.lastCheckpointAt < REDMI_SOAK_CHECKPOINT_INTERVAL_MS) return;
  session.lastCheckpointAt = now;

  const boundary = buildNativeBoundaryValidationReport();
  const miui = getMiuiDiagnostics();
  checkpoints.push({
    at: new Date().toISOString(),
    elapsedMs: getRedmiSoakElapsedMs(),
    reconnectPerMin: getReconnectPerMin(),
    duplicateSockets: getWsDuplicateCount(),
    asyncQueueDepth: metrics.asyncQueueDepth,
    asyncQueueLagMs: metrics.asyncQueueLatencyMs,
    memoryPressurePct: metrics.memoryTrendPct,
    thermalLevel: metrics.thermalState,
    resumeLatencyMs: miui.resumeLatencyMs,
    bypassDetected: boundary.bypassDetected,
    ownershipConsistent: boundary.comparison.ownershipConsistent,
  });
  if (checkpoints.length > 300) checkpoints.shift();
  evaluateCriticalChecks(metrics);
}

function detectScenarios(metrics: RuntimeTelemetryMetricsSnapshot, appForeground: boolean): void {
  const native = getLastNativeRuntimeSnapshot();
  const miui = getMiuiDiagnostics();

  if (appForeground && miui.resumeLatencyMs > 0) {
    noteRedmiSoakScenario('background_foreground', true, `resume ${miui.resumeLatencyMs}ms`);
  }
  if (miui.resumeLatencyMs >= REDMI_SOAK_RESUME_LATENCY_MS) {
    noteRedmiSoakScenario('screen_off_unlock', true, `unlock latency ${miui.resumeLatencyMs}ms`);
  }
  if (native && session.lastBatterySaver != null && native.batterySaverActive !== session.lastBatterySaver) {
    noteRedmiSoakScenario(
      'battery_saver_toggle',
      true,
      native.batterySaverActive ? 'saver ON' : 'saver OFF',
    );
  }
  if (
    native &&
    session.lastNetworkQuality != null &&
    native.networkTransportQuality !== session.lastNetworkQuality
  ) {
    noteRedmiSoakScenario(
      'wifi_mobile_switch',
      true,
      `${session.lastNetworkQuality} → ${native.networkTransportQuality}`,
    );
  }
  if (native?.networkTransportQuality === 'offline') {
    noteRedmiSoakScenario('network_loss', true, 'network offline');
  }
  if (miui.backgroundDurationMs >= REDMI_SOAK_LONG_SUSPEND_MS) {
    noteRedmiSoakScenario('long_suspend', true, `${miui.backgroundDurationMs}ms background`);
  }

  const transitions = getResumeTransitionCount();
  if (transitions > session.lastResumeTransitionCount) {
    const now = Date.now();
    if (now - session.resumeSpamWindowStart > 60_000) {
      session.resumeSpamWindowStart = now;
      session.resumeSpamCount = 0;
    }
    session.resumeSpamCount += transitions - session.lastResumeTransitionCount;
    session.lastResumeTransitionCount = transitions;
    if (session.resumeSpamCount >= 5) {
      noteRedmiSoakScenario('resume_spam', true, `${session.resumeSpamCount} resumes/min`);
    }
  }

  if (miui.silentDisconnectCount > 0) {
    noteRedmiSoakScenario('ws_forced_disconnect', true, `silent ${miui.silentDisconnectCount}`);
  }
  if (getHydrationLockState().overlapCount >= 1) {
    noteRedmiSoakScenario('hydration_overlap', true, 'hydration lock overlap');
  }
  if (['severe', 'critical', 'emergency', 'shutdown'].includes(metrics.thermalState)) {
    noteRedmiSoakScenario('thermal_throttle', true, metrics.thermalState);
  }
  if (native && native.trimLevel !== 'none') {
    noteRedmiSoakScenario('low_memory_trim', true, native.trimLevel);
  }
  if (miui.resumeLatencyMs >= 5000 && (native?.trimMemoryBurstCount ?? 0) >= 2) {
    noteRedmiSoakScenario('activity_recreation', true, 'trim burst + slow resume');
  }
  if (native?.backgroundReclaimDetected && appForeground) {
    noteRedmiSoakScenario('swipe_away_recovery', true, 'reclaim + foreground');
  }
  if (getRedmiSoakElapsedMs() >= REDMI_SOAK_MIN_HOURS * 3_600_000) {
    noteRedmiSoakScenario('overnight_idle', true, `${(getRedmiSoakElapsedMs() / 3_600_000).toFixed(1)}h elapsed`);
  }

  if (native) {
    session.lastBatterySaver = native.batterySaverActive;
    session.lastNetworkQuality = native.networkTransportQuality;
  }
}

export function tickRedmiLongSoakValidation(
  metrics: RuntimeTelemetryMetricsSnapshot,
  appForeground: boolean,
): void {
  if (!session.active) return;
  detectScenarios(metrics, appForeground);
  maybeCheckpoint(metrics);

  const now = Date.now();
  if (now - session.lastPersistAt >= REDMI_SOAK_PERSIST_INTERVAL_MS) {
    session.lastPersistAt = now;
    void persistRedmiLongSoakExport();
  }
}

export function buildRedmiSoakSummary(): RedmiSoakSummary {
  const native = getLastNativeRuntimeSnapshot();
  const elapsedMs = getRedmiSoakElapsedMs();
  const minDurationMet = elapsedMs >= session.targetHours * 3_600_000;
  const criticalChecks = Object.fromEntries(
    REDMI_SOAK_CRITICAL_CHECKS.map((check) => [
      check,
      {
        passed: checkCounts[check].occurrences === 0,
        occurrences: checkCounts[check].occurrences,
        lastAt: checkCounts[check].lastAt,
      },
    ]),
  ) as RedmiSoakSummary['criticalChecks'];

  const criticalFails = REDMI_SOAK_CRITICAL_CHECKS.filter((c) => checkCounts[c].occurrences > 0);
  const productionReady =
    minDurationMet &&
    criticalFails.filter((c) =>
      ['native_reconnect_bypass', 'coordinator_ownership_violation', 'reconnect_storm'].includes(c),
    ).length === 0;

  return {
    version: REDMI_SOAK_VALIDATION_VERSION,
    session: {
      startedAt: session.startedAt ? new Date(session.startedAt).toISOString() : '',
      targetHours: session.targetHours,
      elapsedMs,
      deviceModel: native?.model ?? 'unknown',
      isXiaomiFamily: native?.isXiaomiFamily ?? false,
      metricSource: native?.source ?? 'heuristic',
      active: session.active,
      scenariosObserved: [...scenariosSeen],
      checkpointsCount: checkpoints.length,
      failuresCount: failureTimeline.length,
    },
    criticalChecks,
    minDurationMet,
    productionReady,
    headlineJa: productionReady
      ? 'Redmi soak PASS — critical checks clear'
      : minDurationMet
        ? 'Redmi soak INCOMPLETE — failures detected'
        : 'Redmi soak IN PROGRESS',
    riskJa:
      criticalFails.length === 0
        ? 'no critical failures yet'
        : `failures: ${criticalFails.join(', ')}`,
  };
}

export function buildRedmiLongSoakDashboardReport(): RedmiLongSoakDashboardReport {
  const summary = buildRedmiSoakSummary();
  const boundary = buildNativeBoundaryValidationReport();
  const progress = session.targetHours > 0 ? summary.session.elapsedMs / (session.targetHours * 3_600_000) : 0;
  return {
    soakProgressPct: Math.min(100, Math.round(progress * 100)),
    elapsedHours: summary.session.elapsedMs / 3_600_000,
    targetHours: session.targetHours,
    failuresCount: summary.session.failuresCount,
    scenariosCount: summary.session.scenariosObserved.length,
    lastFailureJa: failureTimeline.at(-1)?.detailJa ?? null,
    bypassDetected: boundary.bypassDetected,
    duplicateSockets: boundary.comparison.duplicateSocketCount,
  };
}

export function buildRedmiLongSoakExport(): RedmiLongSoakExport {
  return {
    version: REDMI_SOAK_VALIDATION_VERSION,
    exportedAt: new Date().toISOString(),
    summary: buildRedmiSoakSummary(),
    failureTimeline: [...failureTimeline],
    scenarioLog: [...scenarioLog],
    checkpoints: [...checkpoints],
    boundaryValidation: buildNativeBoundaryValidationReport(),
    anomalyReplaySnapshot: exportTrackerReplaySnapshot(),
    dashboardReport: buildRedmiLongSoakDashboardReport(),
  };
}

export function exportRedmiLongSoakJson(): string {
  return JSON.stringify(buildRedmiLongSoakExport(), null, 2);
}

export function formatRedmiLongSoakSummaryText(): string {
  const exp = buildRedmiLongSoakExport();
  const lines = [
    `# Redmi Long Soak Validation v${exp.version}`,
    `exported: ${exp.exportedAt}`,
    `device: ${exp.summary.session.deviceModel} xiaomi=${exp.summary.session.isXiaomiFamily}`,
    `elapsed: ${(exp.summary.session.elapsedMs / 3_600_000).toFixed(2)}h / target ${exp.summary.session.targetHours}h`,
    `headline: ${exp.summary.headlineJa}`,
    `productionReady: ${exp.summary.productionReady}`,
    '',
    '## Critical checks (A–H)',
  ];
  for (const [check, result] of Object.entries(exp.summary.criticalChecks)) {
    lines.push(`- ${check}: ${result.passed ? 'PASS' : 'FAIL'} (${result.occurrences}x)`);
  }
  lines.push('', '## Scenarios observed', exp.summary.session.scenariosObserved.join(', ') || 'none');
  if (exp.failureTimeline.length > 0) {
    lines.push('', '## Failure timeline (last 5)');
    for (const f of exp.failureTimeline.slice(-5)) {
      lines.push(`- [${f.at}] ${f.check}: ${f.detailJa}`);
    }
  }
  return lines.join('\n');
}

export async function persistRedmiLongSoakExport(): Promise<void> {
  const payload = buildRedmiLongSoakExport();
  await AsyncStorage.setItem(REDMI_SOAK_STORAGE_KEY, JSON.stringify(payload));
}

export async function loadPersistedRedmiLongSoakExport(): Promise<RedmiLongSoakExport | null> {
  try {
    const raw = await AsyncStorage.getItem(REDMI_SOAK_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RedmiLongSoakExport;
  } catch {
    return null;
  }
}

/** Enable via EXPO_PUBLIC_REDMI_SOAK=1 on device builds. */
export function maybeAutoStartRedmiSoakValidation(): void {
  const flag =
    typeof process !== 'undefined' &&
    process.env?.EXPO_PUBLIC_REDMI_SOAK === '1';
  if (flag && !session.active) {
    startRedmiLongSoakSession(REDMI_SOAK_MIN_HOURS);
  }
}

export { REDMI_SOAK_SCENARIO_LABELS };
