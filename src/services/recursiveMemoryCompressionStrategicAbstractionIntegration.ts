import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { RecursiveMemoryCompressionStrategicAbstractionBundle } from '../types/recursiveMemoryCompressionStrategicAbstraction';
import type { StrategyAction, StrategyExecutionBundle } from '../types/strategyExecution';

/** Cognitive stability freeze / emergency collapse: watch/hold only */
export function applyCompressionStabilityFreezeToStrategy(
  strategy: StrategyExecutionBundle | null,
  compression: RecursiveMemoryCompressionStrategicAbstractionBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !compression?.cognitiveStabilityFreeze) return strategy;
  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      let action = r.action;
      if (action === 'buy') action = 'watch';
      else if (action === 'reduce') action = 'hold';
      if (action === r.action) return r;
      return {
        ...r,
        action,
        intent: action === 'watch' ? 'watch' : r.intent,
        whyProposedJa: `${r.whyProposedJa} [Memory freeze: watch/hold only]`,
      };
    }),
  };
}

/** Snapshot recovery: restore truncated governance summary from abstraction */
export function applySnapshotRecoveryToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  compression: RecursiveMemoryCompressionStrategicAbstractionBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !compression) return governance;
  if (!compression.emergencyContextCollapse && compression.recoveryHealthPct >= 55) {
    return {
      ...governance,
      unifiedAiSummaryJa: `${compression.abstractedNarrativeJa.slice(0, 300)} [Compressed context]`.slice(
        0,
        800,
      ),
    };
  }
  const snap = compression.metaSnapshots[compression.metaSnapshots.length - 1];
  return {
    ...governance,
    unifiedAiSummaryJa: `[Snapshot recovery L${snap?.abstractionLevel ?? compression.abstractionLevel}] ${compression.abstractedNarrativeJa}`.slice(
      0,
      800,
    ),
  };
}

export function applyMemoryCompressionToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  compression: RecursiveMemoryCompressionStrategicAbstractionBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !compression) return governance;
  let next: AiGovernanceDecisionBundle =
    applySnapshotRecoveryToGovernance(governance, compression) ?? governance;

  if (compression.replayIsolated) {
    next = {
      ...next,
      unifiedAiSummaryJa: `${next.unifiedAiSummaryJa} [Replay isolated — snapshot only]`.slice(0, 800),
    };
  }
  if (compression.safeCompressionMode) {
    next = {
      ...next,
      unifiedAiSummaryJa: `${next.unifiedAiSummaryJa} [Safe compression ${compression.compressionRatioPct}%]`.slice(
        0,
        800,
      ),
    };
  }
  if (compression.emergencyContextCollapse && next.finalDecision === 'buy') {
    next = { ...next, finalDecision: 'watch', finalDecisionLabelJa: '監視' };
  } else if (compression.emergencyContextCollapse && next.finalDecision === 'reduce') {
    next = { ...next, finalDecision: 'hold', finalDecisionLabelJa: '保有' };
  }
  return next;
}

export function applyMemoryCompressionToStrategy(
  strategy: StrategyExecutionBundle | null,
  compression: RecursiveMemoryCompressionStrategicAbstractionBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !compression) return strategy;
  return applyCompressionStabilityFreezeToStrategy(strategy, compression);
}

export function attachMemoryCompressionToContext(
  payload: AiStrategyContextPayload,
  bundle: RecursiveMemoryCompressionStrategicAbstractionBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    recursiveMemoryCompressionStrategicAbstraction: bundle,
  };
}

export function enforceWatchHoldAfterMemoryFreeze(
  action: StrategyAction,
  compression: RecursiveMemoryCompressionStrategicAbstractionBundle | null,
): StrategyAction {
  if (!compression?.cognitiveStabilityFreeze && !compression?.emergencyContextCollapse) {
    return action;
  }
  if (action === 'buy') return 'watch';
  if (action === 'reduce') return 'hold';
  return action;
}
