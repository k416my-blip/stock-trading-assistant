import type { AllocationPlan } from '../types';
import { fitAllocationCandidatesToCashNetOfFees } from './realAccountOrderFunding';

export function adjustAllocationPlanToLiveCash(
  plan: AllocationPlan,
  cashMYR: number,
): AllocationPlan & { feeAdjustmentJa?: string } {
  const fitted = fitAllocationCandidatesToCashNetOfFees(plan.candidates, cashMYR);
  if (fitted.canPlaceOrders && fitted.reductions.length === 0) {
    return plan;
  }

  const cashReserveMYR = Math.max(0, cashMYR - fitted.grandTotalMYR);
  const investableMYR = cashMYR - cashReserveMYR;
  const reductionSummary =
    fitted.reductions.length > 0
      ? fitted.reductions
          .map((r) => `${r.labelJa}−${r.sharesRemoved}株`)
          .join(' · ')
      : 'なし';

  return {
    ...plan,
    candidates: fitted.candidates,
    investableMYR,
    cashReserveMYR,
    cashReservePct: cashMYR > 0 ? (cashReserveMYR / cashMYR) * 100 : 0,
    affordabilityWarning: [
      plan.affordabilityWarning,
      `手数料込み株数調整（指値固定）: ${reductionSummary}（注文${fitted.orderTotalMYR}MYR + 手数料${fitted.estimatedFeesMYR}MYR ≤ 現金${cashMYR}MYR）`,
    ]
      .filter(Boolean)
      .join(' · '),
    feeAdjustmentJa: `shares=${fitted.reductions.length} steps · order=${fitted.orderTotalMYR} · fee=${fitted.estimatedFeesMYR}`,
  };
}
