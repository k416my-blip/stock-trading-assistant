import { TELEMETRY_DASHBOARD_ROW_BUDGET } from '../../../constants/telemetryOverhead';

let rowsRendered = 0;
let lastBudgetReset = Date.now();

export function resetDashboardRenderBudgetForTest(): void {
  rowsRendered = 0;
  lastBudgetReset = Date.now();
}

export function beginDashboardRenderFrame(): void {
  const now = Date.now();
  if (now - lastBudgetReset > 5_000) {
    rowsRendered = 0;
    lastBudgetReset = now;
  }
}

export function consumeDashboardRow(): boolean {
  if (rowsRendered >= TELEMETRY_DASHBOARD_ROW_BUDGET) return false;
  rowsRendered += 1;
  return true;
}

export function dashboardRenderCostEstimate(): number {
  return Math.min(100, Math.round((rowsRendered / TELEMETRY_DASHBOARD_ROW_BUDGET) * 100));
}
