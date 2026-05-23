/**
 * Runtime orchestrator facade — state ownership lives in RuntimeReducer / RuntimeKernel.
 */
import { ORCHESTRATOR_STATE_LABELS_JA } from '../../constants/runtimeOrchestrator';
import type {
  RuntimeOrchestratorEvaluation,
  RuntimeOrchestratorInput,
  RuntimeOrchestratorSnapshot,
  RuntimeOrchestratorState,
} from '../../types/runtimeOrchestrator';
import { resolveRuntimePolicy } from './runtimePolicyEngine';
import { aggregateRuntimeSignals } from '../kernel/RuntimeSignalAggregator';
import {
  getReducerMachineState,
  reduceRuntimeState,
  resetRuntimeReducerForTest,
} from '../kernel/RuntimeReducer';
import {
  buildOrchestratorSnapshotFromKernel,
} from '../kernel/RuntimeSnapshot';
import { getLastRuntimeKernelSnapshot } from '../kernel/RuntimeKernel';
import { resetRuntimeKernelForTest } from '../kernel/RuntimeKernel';

let lastSnapshot: RuntimeOrchestratorSnapshot | null = null;

export function resetRuntimeOrchestratorForTest(): void {
  resetRuntimeReducerForTest();
  resetRuntimeKernelForTest();
  lastSnapshot = null;
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

/** Metrics-only evaluation (no policy dispatch — use RuntimeKernel for apply). */
export function evaluateRuntimeOrchestrator(input: RuntimeOrchestratorInput): RuntimeOrchestratorEvaluation {
  const renderSpikeCount =
    (input.metrics.render.renderSpikeDetected ? 1 : 0) +
    (input.metrics.render.excessiveRerenderDetected ? 2 : 0) +
    (input.metrics.render.subtreeHotReloadDetected ? 1 : 0);

  const { signals } = aggregateRuntimeSignals({
    metrics: input.metrics,
    performance: input.performance,
    cascadePressure: input.cascadePressure,
    sessionMinutes: input.sessionMinutes,
    renderSpikeCount,
    killRiskScore: input.killRiskScore ?? 0,
    forceMiuiSurvival: input.forceMiuiSurvival ?? false,
  });

  const { candidate, flapSuppressed } = reduceRuntimeState(signals);
  const state = getReducerMachineState();
  const policy = resolveRuntimePolicy(state);

  const kernelInput = {
    telemetry: {
      state: 'TELEMETRY_OK' as const,
      stateLabelJa: '',
      metrics: input.metrics,
      tuning: {
        maxDashboardFps: policy.maxDashboardFps,
        dashboardCompact: policy.compactDashboard,
        asyncConcurrency: 2,
        websocketHeartbeatMs: 15000,
        explanationSamplingRate: policy.telemetrySamplingRate,
        strategyChangeForbidden: true as const,
        governanceOverrideForbidden: true as const,
        appliedAt: new Date().toISOString(),
      },
      summaryJa: '',
      compactDashboard: policy.compactDashboard,
      lastAnomalySummaryJa: null,
    },
    performance: input.performance,
    cascadePressure: input.cascadePressure,
    sessionMinutes: input.sessionMinutes,
  };

  const snapshot = buildOrchestratorSnapshotFromKernel(
    state,
    policy,
    kernelInput,
    signals,
    flapSuppressed,
  );
  lastSnapshot = snapshot;
  return { snapshot, candidateState: candidate, flapSuppressed };
}

export function getLastRuntimeOrchestratorSnapshot(): RuntimeOrchestratorSnapshot | null {
  return getLastRuntimeKernelSnapshot()?.orchestrator ?? lastSnapshot;
}

export function getCurrentRuntimeOrchestratorState(): RuntimeOrchestratorState {
  return getLastRuntimeKernelSnapshot()?.state ?? getReducerMachineState();
}

export function shouldOrchestratorPauseConciergeAi(): boolean {
  const p = getLastRuntimeOrchestratorSnapshot()?.policy;
  return p?.suspendProactiveAi === true;
}

export function shouldOrchestratorThrottleProactive(): boolean {
  const p = getLastRuntimeOrchestratorSnapshot()?.policy;
  return p?.proactiveCooldown === true || p?.suspendProactiveAi === true;
}

export function shouldOrchestratorBlockBackgroundRefresh(): boolean {
  return getLastRuntimeOrchestratorSnapshot()?.policy.disableBackgroundRefresh === true;
}

export function shouldOrchestratorAllowLowPriorityAsync(): boolean {
  const p = getLastRuntimeOrchestratorSnapshot()?.policy;
  if (!p) return true;
  return !p.suspendLowPriorityAsync;
}

export function getRuntimeHealthSummaryJa(): string {
  return getLastRuntimeOrchestratorSnapshot()?.runtimeHealthSummaryJa ?? '【端末ランタイム】観測待ち — 通常応答';
}
