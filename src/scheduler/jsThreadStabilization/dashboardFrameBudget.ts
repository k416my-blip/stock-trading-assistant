import { JS_FRAME_BUDGET_MS } from '../../constants/jsThreadSchedulerStabilization';

let frameCostMs = 0;
let frames = 0;

export function resetDashboardFrameBudgetForTest(): void {
  frameCostMs = 0;
  frames = 0;
}

export function beginDashboardFrame(): void {
  frames += 1;
}

export function endDashboardFrame(startedAt: number): void {
  frameCostMs = Math.max(frameCostMs, Date.now() - startedAt);
}

export function getRenderFrameCost(): number {
  return frameCostMs;
}

export function isFrameBudgetExceeded(): boolean {
  return frameCostMs > JS_FRAME_BUDGET_MS;
}
