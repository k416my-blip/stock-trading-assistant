import {
  ADAPTATION_FLOW_JA,
  BUDGET_CALM,
  BUDGET_DEFAULT,
  BUDGET_VOLATILE,
  CONFIDENCE_CAP_CALM,
  CONFIDENCE_CAP_CRISIS,
  CONFIDENCE_CAP_VOLATILE,
  ORCHESTRATION_HANDOFF_JA,
} from '../constants/autonomousMarketRegimeDetection';
import type {
  BuildMarketRegimeInput,
  MarketRegimeCategory,
  RegimeAdaptationMode,
} from '../types/autonomousMarketRegimeDetection';
import type { RegimeMetrics } from './autonomousMarketRegimeDetectionEngine';

export type RegimeAdaptationResult = {
  adaptationMode: RegimeAdaptationMode;
  confidenceClampPct: number;
  orchestrationBudgetMax: number;
  governancePriorityMode: boolean;
  freezeAdaptiveLayers: boolean;
  explanationOnlyMode: boolean;
  panicOnlyLayers: boolean;
  mobileRuntimeStateJa: string;
  summaryJa: string;
  adaptationFlowJa: string[];
  orchestrationHandoffJa: string[];
};

export function buildRegimeAdaptation(
  regime: MarketRegimeCategory,
  metrics: RegimeMetrics,
  input: BuildMarketRegimeInput,
): RegimeAdaptationResult {
  if (input.systemic?.systemicEmergencySafeMode) {
    return {
      adaptationMode: 'panic_governance_only',
      confidenceClampPct: CONFIDENCE_CAP_CRISIS,
      orchestrationBudgetMax: BUDGET_VOLATILE,
      governancePriorityMode: true,
      freezeAdaptiveLayers: true,
      explanationOnlyMode: false,
      panicOnlyLayers: true,
      mobileRuntimeStateJa: 'systemic emergency — governance priority (regime deferred)',
      summaryJa: 'Systemic safe mode active — regime adaptation respects freeze',
      adaptationFlowJa: [...ADAPTATION_FLOW_JA],
      orchestrationHandoffJa: [...ORCHESTRATION_HANDOFF_JA],
    };
  }

  switch (regime) {
    case 'PANIC':
      return {
        adaptationMode: 'panic_governance_only',
        confidenceClampPct: CONFIDENCE_CAP_CRISIS,
        orchestrationBudgetMax: BUDGET_VOLATILE,
        governancePriorityMode: true,
        freezeAdaptiveLayers: true,
        explanationOnlyMode: false,
        panicOnlyLayers: true,
        mobileRuntimeStateJa: 'panic — safety/governance only · background heavy sleep',
        summaryJa: 'PANIC: watch/hold only, adaptive thaw frozen, governance priority',
        adaptationFlowJa: ['confidence≤35', 'freeze thaw', 'governance only'],
        orchestrationHandoffJa: ['panic: safety/governance layers only'],
      };
    case 'UNSUPPORTED_ENVIRONMENT':
      return {
        adaptationMode: 'explanation_only',
        confidenceClampPct: CONFIDENCE_CAP_CRISIS,
        orchestrationBudgetMax: BUDGET_DEFAULT,
        governancePriorityMode: false,
        freezeAdaptiveLayers: true,
        explanationOnlyMode: true,
        panicOnlyLayers: false,
        mobileRuntimeStateJa: 'unsupported — explanation-only, no escalation',
        summaryJa: 'UNSUPPORTED: explanation-only, no recommendation escalation',
        adaptationFlowJa: ['explanation-only mode'],
        orchestrationHandoffJa: ['defer heavy recompute'],
      };
    case 'LIQUIDITY_STRESS':
      return {
        adaptationMode: 'macro_freeze',
        confidenceClampPct: CONFIDENCE_CAP_VOLATILE,
        orchestrationBudgetMax: BUDGET_VOLATILE,
        governancePriorityMode: metrics.governanceStressPct > 80,
        freezeAdaptiveLayers: false,
        explanationOnlyMode: false,
        panicOnlyLayers: false,
        mobileRuntimeStateJa: 'liquidity stress — macro freeze, emergency monitoring',
        summaryJa: 'LIQUIDITY_STRESS: macro escalation frozen, heavy recompute off',
        adaptationFlowJa: ['macro freeze', 'emergency monitoring'],
        orchestrationHandoffJa: ['budget 65'],
      };
    case 'VOLATILE_BULL':
    case 'VOLATILE_BEAR':
      return {
        adaptationMode: regime === 'VOLATILE_BEAR' ? 'downgrade_watch_hold' : 'selective_layers',
        confidenceClampPct: CONFIDENCE_CAP_VOLATILE,
        orchestrationBudgetMax: BUDGET_VOLATILE,
        governancePriorityMode: false,
        freezeAdaptiveLayers: false,
        explanationOnlyMode: false,
        panicOnlyLayers: false,
        mobileRuntimeStateJa: 'volatile — budget 65, selective layers, compression aggressive',
        summaryJa:
          regime === 'VOLATILE_BEAR'
            ? 'VOLATILE_BEAR: buy→watch, recovery sensitivity up'
            : 'VOLATILE_BULL: confidence clamp ≤55, selective layers',
        adaptationFlowJa: ['volatile clamp', 'selective orchestration'],
        orchestrationHandoffJa: ['volatile: budget 65'],
      };
    case 'SIDEWAYS':
      return {
        adaptationMode: 'low_confidence',
        confidenceClampPct: CONFIDENCE_CAP_VOLATILE,
        orchestrationBudgetMax: BUDGET_DEFAULT,
        governancePriorityMode: false,
        freezeAdaptiveLayers: false,
        explanationOnlyMode: false,
        panicOnlyLayers: false,
        mobileRuntimeStateJa: 'sideways — suppress overtrading, slower refresh',
        summaryJa: 'SIDEWAYS: low-confidence mode, reduced refresh appetite',
        adaptationFlowJa: ['suppress overtrading'],
        orchestrationHandoffJa: ['standard budget'],
      };
    case 'RECOVERY_TRANSITION':
      return {
        adaptationMode: 'gradual_thaw',
        confidenceClampPct: CONFIDENCE_CAP_VOLATILE,
        orchestrationBudgetMax: BUDGET_DEFAULT,
        governancePriorityMode: false,
        freezeAdaptiveLayers: false,
        explanationOnlyMode: false,
        panicOnlyLayers: false,
        mobileRuntimeStateJa: 'recovery transition — gradual thaw only',
        summaryJa: 'RECOVERY_TRANSITION: gradual thaw, confidence recovery capped',
        adaptationFlowJa: ['gradual thaw only'],
        orchestrationHandoffJa: ['recovery-aware budget'],
      };
    case 'CALM_BULL':
    case 'CALM_BEAR':
    default:
      return {
        adaptationMode: 'standard',
        confidenceClampPct: CONFIDENCE_CAP_CALM,
        orchestrationBudgetMax: BUDGET_CALM,
        governancePriorityMode: false,
        freezeAdaptiveLayers: metrics.stabilityHealthPct < 35,
        explanationOnlyMode: false,
        panicOnlyLayers: false,
        mobileRuntimeStateJa: 'calm — budget 95, standard orchestration',
        summaryJa: 'CALM: moderate confidence, normal refresh',
        adaptationFlowJa: ['standard orchestration'],
        orchestrationHandoffJa: ['calm: budget 95'],
      };
  }
}
