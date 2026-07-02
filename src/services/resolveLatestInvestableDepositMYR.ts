import type { AppState } from '../types';
import { calculateBuyingPower } from './buyingPower';

const DEFAULT_DEPOSIT_MYR = 1000;
const MIN_DEPOSIT_MYR = 100;

/** Latest completed deposit, else buying power / capital settings, else default. */
export function resolveLatestInvestableDepositMYR(state: AppState, isPractice: boolean): number {
  if (isPractice) {
    const cash = state.practice.cashBalanceMYR;
    if (cash >= MIN_DEPOSIT_MYR) return Math.round(cash);
  }

  const completed = state.deposits
    .filter((d) => d.completed && d.amountMYR >= MIN_DEPOSIT_MYR)
    .sort(
      (a, b) =>
        new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime(),
    );

  if (completed.length > 0) {
    return completed[0].amountMYR;
  }

  const buyingPower = calculateBuyingPower(state).buyingPowerMYR;
  if (buyingPower >= MIN_DEPOSIT_MYR) {
    return Math.round(buyingPower);
  }

  if (state.settings.totalCapitalMYR >= MIN_DEPOSIT_MYR) {
    return state.settings.totalCapitalMYR;
  }

  return DEFAULT_DEPOSIT_MYR;
}
