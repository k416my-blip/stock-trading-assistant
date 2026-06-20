import { ACCOUNT_TYPE_LABEL } from '../constants/rakutenTrade';
import type { AccountType, AppState, BuyingPowerResult } from '../types';
import { toMYR } from './fx';

function investedMYR(state: AppState): number {
  return state.portfolio.reduce(
    (sum, p) => sum + toMYR(p.averageBuyPrice * p.shares, p.currency),
    0,
  );
}

export function calculateBuyingPower(state: AppState): BuyingPowerResult {
  const { settings } = state;
  const invested = investedMYR(state);
  const completedDeposits = state.deposits
    .filter((d) => d.completed)
    .reduce((s, d) => s + d.amountMYR, 0);
  const plannedDeposits = state.deposits
    .filter((d) => !d.completed)
    .reduce((s, d) => s + d.amountMYR, 0);

  const withdrawnMYR = (state.withdrawals ?? []).reduce((s, w) => s + w.amountMYR, 0);
  const effectiveCapital = Math.max(settings.totalCapitalMYR, completedDeposits) - withdrawnMYR;

  if (settings.accountType !== 'cash_upfront') {
    return {
      totalCapitalMYR: effectiveCapital,
      investedMYR: invested,
      buyingPowerMYR: 0,
      accountType: settings.accountType,
      note: `${ACCOUNT_TYPE_LABEL[settings.accountType]}は本アプリでは未対応です。Cash Upfrontに切り替えてください。`,
    };
  }

  const buyingPowerMYR = Math.max(0, effectiveCapital - invested);

  return {
    totalCapitalMYR: effectiveCapital,
    investedMYR: invested,
    buyingPowerMYR,
    accountType: settings.accountType,
    note:
      plannedDeposits > 0
        ? `未入金の予定額 RM${plannedDeposits.toLocaleString('ja-JP')} — Rakuten Tradeで手動入金後、入金記録を完了にしてください。`
        : 'Cash Upfront: 利用可能現金（概算）= 投資資金 − 保有の取得コスト（MYR換算）',
  };
}

export function isAccountSupported(accountType: AccountType): boolean {
  return accountType === 'cash_upfront';
}
