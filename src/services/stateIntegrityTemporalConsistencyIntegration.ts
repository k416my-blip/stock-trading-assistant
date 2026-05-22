import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { StateIntegrityTemporalConsistencyBundle } from '../types/stateIntegrityTemporalConsistency';
import type { StrategyAction, StrategyExecutionBundle } from '../types/strategyExecution';

const WATCH_HOLD: StrategyAction[] = ['watch', 'hold'];

/** Rollback / stale governance: downgrade buy→watch, reduce→hold only — no new trade ideas */
export function applyTemporalRollbackDowngrades(
  strategy: StrategyExecutionBundle | null,
  integrity: StateIntegrityTemporalConsistencyBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !integrity?.rollbackApplied) return strategy;
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
        whyProposedJa: `${r.whyProposedJa} [Temporal rollback: watch/hold only]`,
      };
    }),
  };
}

/** Block buy from stale governance / replay — does not invent new recommendations */
export function applyGovernanceFreshnessDowngrade(
  governance: AiGovernanceDecisionBundle | null,
  integrity: StateIntegrityTemporalConsistencyBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !integrity) return governance;
  if (integrity.governanceFresh && integrity.replayIntegrityOk) return governance;

  const blockBuy =
    !integrity.governanceFresh ||
    !integrity.replayIntegrityOk ||
    integrity.emergencyStateFreeze;

  if (!blockBuy || governance.finalDecision !== 'buy') {
    return {
      ...governance,
      unifiedAiSummaryJa: `${governance.unifiedAiSummaryJa} [Integrity: governance v${integrity.stateVersion}]`,
    };
  }

  return {
    ...governance,
    finalDecision: 'watch',
    finalDecisionLabelJa: '監視',
    vetoReasonJa:
      governance.vetoReasonJa ??
      'Governance/replay stale — buy blocked (temporal integrity)',
    unifiedAiSummaryJa: `${governance.unifiedAiSummaryJa} [Freshness gate: buy→watch]`,
    downgradedRecommendations: governance.downgradedRecommendations.map((d) =>
      d.fromAction === 'buy'
        ? { ...d, toAction: 'watch' as StrategyAction, reasonJa: `${d.reasonJa} [stale governance/replay]` }
        : d,
    ),
  };
}

export function attachStateIntegrityTemporalToContext(
  payload: AiStrategyContextPayload,
  bundle: StateIntegrityTemporalConsistencyBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    stateIntegrityTemporalConsistency: bundle,
  };
}

/** Ensures recommendations stay watch/hold after integrity repair */
export function enforceWatchHoldOnlyAfterRepair(
  action: StrategyAction,
  integrity: StateIntegrityTemporalConsistencyBundle | null,
): StrategyAction {
  if (!integrity?.rollbackApplied && !integrity?.emergencyStateFreeze) return action;
  if (action === 'buy') return 'watch';
  if (action === 'reduce') return 'hold';
  return WATCH_HOLD.includes(action) ? action : 'hold';
}
