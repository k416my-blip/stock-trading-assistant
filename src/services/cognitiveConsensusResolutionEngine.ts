import {
  BUDGET_HARD_CONFLICT,
  BUDGET_PANIC_CONSENSUS,
  BUDGET_SOFT_CONFLICT,
  BUDGET_CONSENSUS_OK,
  CONSENSUS_STATE_LABELS_JA,
} from '../constants/cognitiveArbitrationConsensus';
import type {
  ConsensusState,
  ParticipantSignal,
} from '../types/cognitiveArbitrationConsensus';

export type ArbitrationMetrics = {
  contradictionRiskPct: number;
  semanticAlignmentPct: number;
  semanticConflictPct: number;
  recommendationDivergencePct: number;
  confidenceSpreadPct: number;
  rollbackInstabilityPct: number;
  governanceStressPct: number;
  panicRiskPct: number;
  stabilityHealthPct: number;
  uncertaintyPct: number;
  freezeSignalPct: number;
  macroAgreementPct: number;
  finalConsensusPct: number;
  consensusHealthPct: number;
};

export type ConsensusResolution = {
  consensusState: ConsensusState;
  orchestrationBudgetMax: number;
  governanceOverrideActive: boolean;
  explanationOnlyMode: boolean;
  watchHoldOnly: boolean;
  governancePriorityOnly: boolean;
  orchestrationImpactJa: string;
  downgradeReasonJa: string;
  panicInteractionJa: string;
  suppressedLayersJa: string;
  mobileRuntimeStateJa: string;
};

const ACTION_SCORE: Record<string, number> = {
  avoid: 0,
  hold: 1,
  watch: 2,
  reduce: 3,
  buy: 4,
};

export function computeWeightedConsensus(
  participants: ParticipantSignal[],
): { finalConsensusPct: number; semanticAlignmentPct: number } {
  let weighted = 0;
  let totalWeight = 0;
  let alignSum = 0;
  let alignCount = 0;
  for (const p of participants) {
    if (!p.active) continue;
    const w = p.layerPriority * (p.semanticAlignmentPct / 100);
    weighted += p.layerConfidencePct * w;
    totalWeight += w;
    alignSum += p.semanticAlignmentPct;
    alignCount += 1;
  }
  const finalConsensusPct =
    totalWeight > 0 ? Math.round(weighted / totalWeight) : 50;
  const semanticAlignmentPct =
    alignCount > 0 ? Math.round(alignSum / alignCount) : 50;
  return { finalConsensusPct, semanticAlignmentPct };
}

export function computeContradictionRisk(
  participants: ParticipantSignal[],
  metrics: Pick<
    ArbitrationMetrics,
    'semanticConflictPct' | 'recommendationDivergencePct' | 'confidenceSpreadPct' | 'rollbackInstabilityPct'
  >,
  mockBoost = 0,
): number {
  const active = participants.filter((p) => p.active);
  const scores = active.map((p) => ACTION_SCORE[p.actionLean] ?? 1);
  const spread =
    scores.length > 1 ? Math.max(...scores) - Math.min(...scores) : 0;
  const divergencePct = Math.min(100, spread * 22 + metrics.recommendationDivergencePct);
  return Math.min(
    100,
    Math.round(
      metrics.semanticConflictPct * 0.3 +
        divergencePct * 0.3 +
        metrics.confidenceSpreadPct * 0.25 +
        metrics.rollbackInstabilityPct * 0.15 +
        mockBoost,
    ),
  );
}

export function classifyConsensusState(
  metrics: ArbitrationMetrics,
  systemicEmergency: boolean,
): ConsensusState {
  if (systemicEmergency) return 'GOVERNANCE_OVERRIDE';
  if (metrics.governanceStressPct > 80) return 'GOVERNANCE_OVERRIDE';
  if (metrics.panicRiskPct > 70) return 'PANIC_CONSENSUS';
  if (metrics.uncertaintyPct > 75) return 'UNSUPPORTED_STATE';
  if (metrics.contradictionRiskPct > 70) return 'HARD_CONFLICT';
  if (metrics.contradictionRiskPct > 45 || metrics.confidenceSpreadPct > 35) {
    return 'SOFT_CONFLICT';
  }
  return 'CONSENSUS_OK';
}

export function resolveConsensus(
  state: ConsensusState,
  metrics: ArbitrationMetrics,
  regimePanic: boolean,
): ConsensusResolution {
  const base: ConsensusResolution = {
    consensusState: state,
    orchestrationBudgetMax: BUDGET_CONSENSUS_OK,
    governanceOverrideActive: false,
    explanationOnlyMode: false,
    watchHoldOnly: false,
    governancePriorityOnly: false,
    orchestrationImpactJa: 'standard layers',
    downgradeReasonJa: 'none',
    panicInteractionJa: regimePanic ? 'regime panic — simplified arbitration' : 'none',
    suppressedLayersJa: '—',
    mobileRuntimeStateJa: 'standard arbitration',
  };

  switch (state) {
    case 'GOVERNANCE_OVERRIDE':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_PANIC_CONSENSUS,
        governanceOverrideActive: true,
        governancePriorityOnly: true,
        orchestrationImpactJa: 'governance absolute priority',
        downgradeReasonJa: 'governance stress > 80 or systemic emergency',
        suppressedLayersJa: 'non-governance layers deferred',
        mobileRuntimeStateJa: 'governance override — emergency simplified',
      };
    case 'PANIC_CONSENSUS':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_PANIC_CONSENSUS,
        governancePriorityOnly: true,
        watchHoldOnly: true,
        orchestrationImpactJa: 'safety/governance only active',
        downgradeReasonJa: 'panicRisk > 70 — simplified consensus',
        suppressedLayersJa: 'aggressive + heavy recompute sleeping',
        mobileRuntimeStateJa: 'panic — lightweight emergency consensus',
      };
    case 'UNSUPPORTED_STATE':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_SOFT_CONFLICT,
        explanationOnlyMode: true,
        orchestrationImpactJa: 'explanation-only, no escalation',
        downgradeReasonJa: 'uncertainty > 75',
        mobileRuntimeStateJa: 'unsupported — explanation-only',
      };
    case 'HARD_CONFLICT':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_HARD_CONFLICT,
        watchHoldOnly: true,
        orchestrationImpactJa: 'budget 65, aggressive layers sleep',
        downgradeReasonJa: 'contradictionRisk > 70 — buy→watch, reduce→hold',
        suppressedLayersJa: 'macro, reflection, memory (heavy)',
        mobileRuntimeStateJa: 'hard conflict — watch/hold only',
      };
    case 'SOFT_CONFLICT':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_SOFT_CONFLICT,
        orchestrationImpactJa: 'retain previous stable snapshot',
        downgradeReasonJa: 'soft conflict — stale consensus retain',
        mobileRuntimeStateJa: 'soft conflict — debounce + stale retain',
      };
    default:
      return {
        ...base,
        orchestrationImpactJa: `consensus ${metrics.finalConsensusPct}% — ${CONSENSUS_STATE_LABELS_JA.CONSENSUS_OK}`,
      };
  }
}
