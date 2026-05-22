import {
  RECOVERY_COOLDOWN_CONFIDENCE_MAX,
  RECOVERY_CONFIDENCE_MAX,
} from '../constants/executionRecoveryAdaptiveConfidence';
import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type {
  ExecutionRecoveryAdaptiveConfidenceBundle,
  RecoveryStage,
} from '../types/executionRecoveryAdaptiveConfidence';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyAction, StrategyExecutionBundle } from '../types/strategyExecution';

const ACTION_RANK: Record<StrategyAction, number> = {
  avoid: 0,
  hold: 1,
  watch: 2,
  reduce: 3,
  buy: 4,
};

function maxActionForStage(stage: RecoveryStage): StrategyAction {
  if (stage === 0) return 'hold';
  if (stage === 1) return 'hold';
  if (stage === 2) return 'hold';
  if (stage === 3) return 'watch';
  return 'watch';
}

function clampActionToMax(action: StrategyAction, maxAction: StrategyAction): StrategyAction {
  if (ACTION_RANK[action] <= ACTION_RANK[maxAction]) return action;
  if (maxAction === 'watch' && action === 'buy') return 'watch';
  if (maxAction === 'hold' && (action === 'buy' || action === 'reduce')) return 'hold';
  return maxAction;
}

function confidenceCap(
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle,
): number {
  if (recovery.recoveryBlocked || recovery.cooldownActive) {
    return RECOVERY_COOLDOWN_CONFIDENCE_MAX;
  }
  return RECOVERY_CONFIDENCE_MAX;
}

/** Never bypass systemic emergency — recovery only annotates when blocked */
function isRecoveryThawAllowed(
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): boolean {
  if (!recovery.safeRecovery || recovery.recoveryBlocked || recovery.recoverySuspended) {
    return false;
  }
  if (systemic?.systemicEmergencySafeMode) return false;
  if (systemic?.cascadeIsolationActive) return false;
  if (systemic?.recursiveFreezeActive && recovery.recursiveRiskPct > 70) return false;
  return true;
}

export function applyAdaptiveThawToStrategy(
  strategy: StrategyExecutionBundle | null,
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !recovery) return strategy;

  const thawAllowed = isRecoveryThawAllowed(recovery, systemic);
  const maxAction = thawAllowed ? maxActionForStage(recovery.recoveryStage) : 'hold';
  const cap = confidenceCap(recovery);

  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      let action = r.action;
      if (action === 'buy') action = 'watch';
      if (!thawAllowed) {
        if (action === 'reduce') action = 'hold';
      } else {
        action = clampActionToMax(action, maxAction);
        if (recovery.recoveryStage === 2 && action === 'reduce') action = 'hold';
      }

      const rehabilitated = thawAllowed
        ? Math.min(
            cap,
            Math.max(
              r.confidencePct,
              Math.round(recovery.adaptiveConfidencePct * 0.35 + recovery.recoveryHealthPct * 0.15),
            ),
          )
        : Math.min(r.confidencePct, cap);

      const changed = action !== r.action || rehabilitated !== r.confidencePct;
      if (!changed) return r;

      return {
        ...r,
        action,
        intent: action === 'watch' ? 'watch' : r.intent,
        confidencePct: rehabilitated,
        whyProposedJa: `${r.whyProposedJa} [Recovery thaw stage ${recovery.recoveryStage}: ${recovery.thawState}]`,
      };
    }),
  };
}

/** Governance: annotate only — never override finalDecision authority */
export function applyExecutionRecoveryToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !recovery) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Recovery health ${recovery.recoveryHealthPct}% · thaw ${recovery.thawLevelPct}% · stage ${recovery.recoveryStage}]`;

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [Recovery respects systemic safe mode — no bypass]`;
  }
  if (recovery.recoveryBlocked) {
    summary = `${summary} [Recovery blocked — remain hold/watch]`;
  } else if (recovery.safeRecovery && recovery.partialRestoreActive) {
    summary = `${summary} [Partial conservative restore active]`;
  }
  if (recovery.cooldownActive) {
    summary = `${summary} [Recovery cooldown: ${recovery.cooldownStatusJa}]`;
  }

  return {
    ...governance,
    unifiedAiSummaryJa: summary.slice(0, 800),
  };
}

export function applyExecutionRecoveryToStrategy(
  strategy: StrategyExecutionBundle | null,
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !recovery) return strategy;
  return applyAdaptiveThawToStrategy(strategy, recovery, systemic);
}

export function attachExecutionRecoveryToContext(
  payload: AiStrategyContextPayload,
  bundle: ExecutionRecoveryAdaptiveConfidenceBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    executionRecoveryAdaptiveConfidence: bundle,
  };
}

export function enforceConservativeRecoveryAction(
  action: StrategyAction,
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyAction {
  if (systemic?.systemicEmergencySafeMode || systemic?.cascadeIsolationActive) {
    if (action === 'buy') return 'watch';
    if (action === 'reduce') return 'hold';
    return action;
  }
  if (!recovery || recovery.recoveryBlocked) {
    if (action === 'buy') return 'watch';
    if (action === 'reduce') return 'hold';
    return action;
  }
  return clampActionToMax(action === 'buy' ? 'watch' : action, maxActionForStage(recovery.recoveryStage));
}
