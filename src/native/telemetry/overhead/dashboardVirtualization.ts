import { TELEMETRY_DASHBOARD_ROW_BUDGET } from '../../../constants/telemetryOverhead';

export function virtualizeRows<T>(rows: T[], budget = TELEMETRY_DASHBOARD_ROW_BUDGET): T[] {
  if (rows.length <= budget) return rows;
  const head = Math.ceil(budget * 0.6);
  const tail = budget - head;
  return [...rows.slice(0, head), ...rows.slice(-tail)];
}

export function visibleRowCount(total: number, budget = TELEMETRY_DASHBOARD_ROW_BUDGET): number {
  return Math.min(total, budget);
}
