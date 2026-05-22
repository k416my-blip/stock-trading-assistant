import type { CapitalAllocationBundle } from '../types/capitalAllocation';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { ExecutionDashboardBundle } from '../types/paperBroker';

export function attachCapitalAllocationToContext(
  payload: AiStrategyContextPayload,
  bundle: CapitalAllocationBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    capitalAllocation: bundle,
  };
}

/** Merge capital summary into execution dashboard for unified display */
export function enrichExecutionWithCapital(
  execution: ExecutionDashboardBundle,
  capital: CapitalAllocationBundle | null,
): ExecutionDashboardBundle {
  if (!capital) return execution;
  return {
    ...execution,
    capitalAllocationSummary: capital.executionCapitalSummary,
    capitalSizingLineJa: capital.aiSizingSummaryJa,
  };
}
