/**
 * Dynamic Runtime Orchestrator — state machine with hysteresis over telemetry signals.
 */
import {
  ORCHESTRATOR_CRITICAL_MIN_MS,
  ORCHESTRATOR_DEGRADED_MIN_MS,
  ORCHESTRATOR_STATE_LABELS_JA,
  ORCHESTRATOR_STATE_SEVERITY,
  ORCHESTRATOR_SURVIVAL_MIN_MS,
  ORCHESTRATOR_TRANSITION_HISTORY_MAX,
  ORCHESTRATOR_UPGRADE_CONFIRM_MS,
} from '../../constants/runtimeOrchestrator';
import type {
  RuntimeOrchestratorEvaluation,
  RuntimeOrchestratorInput,
  RuntimeOrchestratorSnapshot,
  RuntimeOrchestratorState,
  RuntimeOrchestratorTransition,
} from '../../types/runtimeOrchestrator';
import { resolveRuntimePolicy } from './runtimePolicyEngine';
import { getLastNativeRuntimeSnapshot } from '../../native/runtime/nativeRuntimeBridge';
import { buildTelemetryConfidenceMap } from '../../native/runtime/telemetryConfidence';

type MachineState = {
  current: RuntimeOrchestratorState;
  previous: RuntimeOrchestratorState;
  enteredAt: number;
  upgradeCandidate: RuntimeOrchestratorState | null;
  upgradeCandidateSince: number;
  transitions: RuntimeOrchestratorTransition[];
  survivalActivations: number;
};

const machine: MachineState = {
  current: 'STABLE',
  previous: 'STABLE',
  enteredAt: Date.now(),
  upgradeCandidate: null,
  upgradeCandidateSince: 0,
  transitions: [],
  survivalActivations: 0,
};

let lastSnapshot: RuntimeOrchestratorSnapshot | null = null;

export function resetRuntimeOrchestratorForTest(): void {
  machine.current = 'STABLE';
  machine.previous = 'STABLE';
  machine.enteredAt = Date.now();
  machine.upgradeCandidate = null;
  machine.upgradeCandidateSince = 0;
  machine.transitions = [];
  machine.survivalActivations = 0;
  lastSnapshot = null;
}

function severity(s: RuntimeOrchestratorState): number {
  return ORCHESTRATOR_STATE_SEVERITY[s];
}

function minHoldMs(state: RuntimeOrchestratorState): number {
  if (state === 'DEGRADED') return ORCHESTRATOR_DEGRADED_MIN_MS;
  if (state === 'CRITICAL') return ORCHESTRATOR_CRITICAL_MIN_MS;
  if (state === 'SURVIVAL') return ORCHESTRATOR_SURVIVAL_MIN_MS;
  return 0;
}

function computeCandidate(input: RuntimeOrchestratorInput): RuntimeOrchestratorState {
  if (input.forceMiuiSurvival) return 'SURVIVAL';
  if ((input.killRiskScore ?? 0) >= 88) return 'CRITICAL';

  const m = input.metrics;
  const native = getLastNativeRuntimeSnapshot();
  const conf = buildTelemetryConfidenceMap(m, native);
  const memoryTrendEffective =
    conf.memoryPressure.source === 'native' && conf.memoryPressure.confidence >= 0.85
      ? conf.memoryPressure.value
      : m.memoryTrendPct;
  const thermalBad =
    m.thermalState === 'severe' ||
    m.thermalState === 'critical' ||
    m.native.thermalThrottlingDetected;
  const survival =
    m.native.miuiAggressiveReclaim &&
    (memoryTrendEffective >= 35 || m.asyncQueueDepth >= 40) &&
    (m.render.renderFPS < 12 || m.longSession.renderDegradationPct >= 25);
  if (survival) return 'SURVIVAL';

  if (
    m.render.renderFPS < 8 ||
    m.asyncQueueDepth >= 52 ||
    m.websocket.reconnectStormDetected ||
    m.eventLoopLatencyMs >= 300 ||
    m.hydrationResume.resumeCascadeRiskPct >= 85 ||
    thermalBad && memoryTrendEffective >= 40
  ) {
    return 'CRITICAL';
  }

  if (
    m.render.renderFPS < 14 ||
    m.asyncQueueDepth >= 32 ||
    m.websocket.wsLatencyMs >= 200 ||
    m.websocket.reconnectAttempts >= 3 ||
    (m.hydrationDurationMs != null && m.hydrationDurationMs > 600) ||
    input.renderSpikeCount >= 3 ||
    m.longSession.asyncQueueGrowthTrend >= 8 ||
    m.longSession.renderDegradationPct >= 18 ||
    input.cascadePressure >= 58
  ) {
    return 'DEGRADED';
  }

  if (
    m.render.renderFPS < 20 ||
    m.asyncQueueDepth >= 18 ||
    m.websocket.wsLatencyMs >= 120 ||
    m.websocket.jitterScore >= 35 ||
    input.performance.batterySaverActive ||
    m.memoryTrendPct >= 15 ||
    m.longSession.orchestrationSlowdownPct >= 12 ||
    input.renderSpikeCount >= 1
  ) {
    return 'LIGHT_PRESSURE';
  }

  return 'STABLE';
}

function recordTransition(from: RuntimeOrchestratorState, to: RuntimeOrchestratorState, reasonJa: string): void {
  if (from === to) return;
  machine.transitions.push({
    at: new Date().toISOString(),
    from,
    to,
    reasonJa,
  });
  if (machine.transitions.length > ORCHESTRATOR_TRANSITION_HISTORY_MAX) {
    machine.transitions.shift();
  }
  if (to === 'SURVIVAL') machine.survivalActivations += 1;
}

function applyTransition(next: RuntimeOrchestratorState, reasonJa: string): void {
  if (next === machine.current) return;
  machine.previous = machine.current;
  recordTransition(machine.current, next, reasonJa);
  machine.current = next;
  machine.enteredAt = Date.now();
  machine.upgradeCandidate = null;
  machine.upgradeCandidateSince = 0;
}

function resolveWithHysteresis(candidate: RuntimeOrchestratorState): { state: RuntimeOrchestratorState; flapSuppressed: boolean } {
  const now = Date.now();
  const cur = machine.current;
  const curSev = severity(cur);
  const candSev = severity(candidate);

  if (candSev > curSev) {
    if (machine.upgradeCandidate !== candidate) {
      machine.upgradeCandidate = candidate;
      machine.upgradeCandidateSince = now;
      return { state: cur, flapSuppressed: true };
    }
    if (now - machine.upgradeCandidateSince < ORCHESTRATOR_UPGRADE_CONFIRM_MS) {
      return { state: cur, flapSuppressed: true };
    }
    applyTransition(candidate, `upgrade · ${ORCHESTRATOR_STATE_LABELS_JA[candidate]}`);
    return { state: machine.current, flapSuppressed: false };
  }

  machine.upgradeCandidate = null;
  machine.upgradeCandidateSince = 0;

  if (candSev < curSev) {
    const dwell = now - machine.enteredAt;
    const hold = minHoldMs(cur);
    if (dwell < hold) {
      return { state: cur, flapSuppressed: true };
    }
    applyTransition(candidate, `recovery · ${ORCHESTRATOR_STATE_LABELS_JA[candidate]}`);
    return { state: machine.current, flapSuppressed: false };
  }

  return { state: cur, flapSuppressed: false };
}

export function buildRuntimeHealthSummaryJa(
  state: RuntimeOrchestratorState,
  input: RuntimeOrchestratorInput,
  policy: ReturnType<typeof resolveRuntimePolicy>,
): string {
  const m = input.metrics;
  const lines = [
    `【端末ランタイム】${ORCHESTRATOR_STATE_LABELS_JA[state]}`,
    `FPS ${m.renderFPS} · JS heap推定 ${m.jsHeapEstimateMb}MB (trend ${m.memoryTrendPct}%)`,
    `async queue ${m.asyncQueueDepth} · WS RTT ${m.websocketRttMs}ms`,
    `thermal ${m.thermalState} · session ${input.sessionMinutes}m`,
  ];
  if (policy.suspendProactiveAi) lines.push('自発提案は一時停止中。ユーザー質問への短い応答を優先。');
  if (policy.suppressAiOnReconnectStorm && m.websocket.reconnectStormDetected) {
    lines.push('WebSocket再接続ストーム — 発言を抑え、接続安定を優先。');
  }
  if (policy.lightweightAiResponses) lines.push('軽量応答モード — 段落を短く、再計算を避ける。');
  if (policy.aiChatOnly) lines.push('サバイバル — AIチャットのみ、背景処理は停止。');
  if (input.performance.batterySaverActive) lines.push('バッテリーセーバー — proactive停止。');
  return lines.join('\n');
}

function buildSnapshot(
  input: RuntimeOrchestratorInput,
  flapSuppressed: boolean,
): RuntimeOrchestratorSnapshot {
  const policy = resolveRuntimePolicy(machine.current);
  const dwellMs = Date.now() - machine.enteredAt;
  const queuePressurePct = Math.min(100, Math.round(input.metrics.asyncQueueDepth * 1.8));
  const summaryJa = [
    ORCHESTRATOR_STATE_LABELS_JA[machine.current],
    flapSuppressed ? 'hysteresis hold' : 'applied',
    `FPS ${input.metrics.renderFPS}`,
    `queue ${input.metrics.asyncQueueDepth}`,
  ].join(' · ');

  const snapshot: RuntimeOrchestratorSnapshot = {
    state: machine.current,
    stateLabelJa: ORCHESTRATOR_STATE_LABELS_JA[machine.current],
    previousState: machine.previous,
    stateSince: new Date(machine.enteredAt).toISOString(),
    dwellMs,
    policy,
    summaryJa,
    runtimeHealthSummaryJa: buildRuntimeHealthSummaryJa(machine.current, input, policy),
    transitionHistory: [...machine.transitions],
    survivalActivationCount: machine.survivalActivations,
    aiSuppressionActive: policy.suspendProactiveAi || policy.suppressAiOnReconnectStorm,
    memoryPressureTrendPct: input.metrics.memoryTrendPct,
    queuePressurePct,
    measuredAt: new Date().toISOString(),
  };
  lastSnapshot = snapshot;
  return snapshot;
}

export function evaluateRuntimeOrchestrator(input: RuntimeOrchestratorInput): RuntimeOrchestratorEvaluation {
  if (input.forceMiuiSurvival) {
    applyTransition('SURVIVAL', 'MIUI native reclaim — immediate escalation');
    const snapshot = buildSnapshot(input, false);
    return {
      snapshot,
      candidateState: 'SURVIVAL',
      flapSuppressed: false,
    };
  }

  const candidate = computeCandidate(input);
  const { state, flapSuppressed } = resolveWithHysteresis(candidate);
  void state;
  const snapshot = buildSnapshot(input, flapSuppressed);
  return {
    snapshot,
    candidateState: candidate,
    flapSuppressed,
  };
}

export function getLastRuntimeOrchestratorSnapshot(): RuntimeOrchestratorSnapshot | null {
  return lastSnapshot;
}

export function getCurrentRuntimeOrchestratorState(): RuntimeOrchestratorState {
  return machine.current;
}

export function shouldOrchestratorPauseConciergeAi(): boolean {
  const p = lastSnapshot?.policy;
  return p?.suspendProactiveAi === true;
}

export function shouldOrchestratorThrottleProactive(): boolean {
  const p = lastSnapshot?.policy;
  return p?.proactiveCooldown === true || p?.suspendProactiveAi === true;
}

export function shouldOrchestratorBlockBackgroundRefresh(): boolean {
  return lastSnapshot?.policy.disableBackgroundRefresh === true;
}

export function shouldOrchestratorAllowLowPriorityAsync(): boolean {
  const p = lastSnapshot?.policy;
  if (!p) return true;
  return !p.suspendLowPriorityAsync;
}

export function getRuntimeHealthSummaryJa(): string {
  return lastSnapshot?.runtimeHealthSummaryJa ?? '【端末ランタイム】観測待ち — 通常応答';
}
