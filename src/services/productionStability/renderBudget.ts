import { RENDER_BUDGET_MAX_CONCURRENT } from '../../constants/productionStability';

let inFlight = 0;
let blocked = 0;

export function acquireRenderBudget(): boolean {
  if (inFlight >= RENDER_BUDGET_MAX_CONCURRENT) {
    blocked += 1;
    return false;
  }
  inFlight += 1;
  return true;
}

export function releaseRenderBudget(): void {
  inFlight = Math.max(0, inFlight - 1);
}

export function getRenderBudgetBlockedCount(): number {
  return blocked;
}

export function getRenderBudgetInFlight(): number {
  return inFlight;
}

export function resetRenderBudgetForTest(): void {
  inFlight = 0;
  blocked = 0;
}
