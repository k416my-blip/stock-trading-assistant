import type {
  RuntimeSelfRecursionEnduranceObserveInput,
  SelfRecursionEnduranceTimelineEntry,
} from '../types/runtimeSelfRecursionEndurance';
import { scoreRecursionCircuitRisk, scoreRecursionDepth } from './recursionCircuitDetector';
import { scoreObserverEchoRisk } from './observerEchoRiskScorer';
import { scoreTelemetryEchoRisk } from './telemetryEchoRiskScorer';
import { scoreAuditLoopRisk } from './auditLoopRiskScorer';
import { scoreDashboardPayloadGrowthRisk } from './dashboardPayloadGrowthMonitor';
import { scoreLongSessionDriftRisk } from './longSessionDriftMonitor';
import { scoreMiuiBackgroundStarvationRisk } from './miuiBackgroundStarvationObserver';
import { scoreBatterySaverObserverDelayRisk } from './batterySaverObserverDelayObserver';
import { scoreNarrativeRecursionAmplification } from './narrativeRecursionAmplificationObserver';
import { recordSelfRecursionEnduranceEvolution } from './selfRecursionEnduranceEvolutionCoordinator';
import { scoreRuntimeOperationalEnduranceScore } from './operationalEnduranceEngine';
import { recordSelfRecursionEnduranceTimeline } from './selfRecursionEnduranceTimeline';

export type SelfRecursionEnduranceFlowResult = {
  flow: SelfRecursionEnduranceTimelineEntry['flow'];
  detailJa: string;
};

export function runSelfRecursionEnduranceFlows(
  input: RuntimeSelfRecursionEnduranceObserveInput,
): SelfRecursionEnduranceFlowResult[] {
  const endurance = scoreRuntimeOperationalEnduranceScore(input);
  const results: SelfRecursionEnduranceFlowResult[] = [
    {
      flow: 'self_recursion_circuit_flow',
      detailJa: `circuit ${scoreRecursionCircuitRisk(input)} · depth ${scoreRecursionDepth(input)}`,
    },
    {
      flow: 'observer_audit_loop',
      detailJa: `observer echo ${scoreObserverEchoRisk(input)} · audit ${scoreAuditLoopRisk(input)}`,
    },
    {
      flow: 'telemetry_echo_loop',
      detailJa: `telemetry echo ${scoreTelemetryEchoRisk(input)}`,
    },
    {
      flow: 'recursive_governance_feedback',
      detailJa: `gov mode ${input.governanceMode} · confidence ${input.governanceConfidence}`,
    },
    {
      flow: 'dashboard_payload_growth',
      detailJa: `payload ${scoreDashboardPayloadGrowthRisk(input)} · rows ${input.dashboardRowCount}`,
    },
    {
      flow: 'long_session_drift',
      detailJa: `drift ${scoreLongSessionDriftRisk(input)} · ${input.sessionMinutes}min`,
    },
    {
      flow: 'miui_background_starvation',
      detailJa: `MIUI starvation ${scoreMiuiBackgroundStarvationRisk(input)}`,
    },
    {
      flow: 'battery_saver_observer_delay',
      detailJa: `battery saver delay ${scoreBatterySaverObserverDelayRisk(input)}`,
    },
    {
      flow: 'narrative_recursion_amplification',
      detailJa: `narrative ${scoreNarrativeRecursionAmplification(input)}`,
    },
    {
      flow: 'operational_endurance_evolution',
      detailJa: `endurance ${recordSelfRecursionEnduranceEvolution(input, endurance)}`,
    },
  ];
  for (const r of results) recordSelfRecursionEnduranceTimeline(r.flow, r.detailJa);
  return results;
}
