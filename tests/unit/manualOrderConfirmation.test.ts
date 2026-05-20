import { beforeEach, describe, expect, it } from 'vitest';
import { HOLDING_ERRORS } from '../../src/constants/holdingErrors';
import {
  confirmManualOrderInState,
  validateManualOrderConfirmInput,
} from '../../src/services/manualOrderConfirmation';
import { selectActiveHoldings } from '../../src/services/portfolioHoldings';
import {
  getPersonalKillSwitchesSnapshot,
  savePersonalKillSwitches,
} from '../../src/services/personalKillSwitches';
import { createDefaultAppState } from '../../src/services/storage';
import type { AppState, ManualOrderItem, PortfolioPosition } from '../../src/types';

function tradeBlockedReason(): string | null {
  const ks = getPersonalKillSwitchesSnapshot();
  if (ks.readOnlyMode) return HOLDING_ERRORS.readOnlyMode;
  if (ks.disableTradeSubmission) return HOLDING_ERRORS.tradeSubmissionStopped;
  return null;
}

function baseOrder(overrides: Partial<ManualOrderItem> = {}): ManualOrderItem {
  return {
    id: 'order-1',
    symbol: '1155',
    name: 'Test Bank',
    market: 'bursa',
    currency: 'MYR',
    side: 'buy',
    entryPrice: 10,
    estimatedShares: 100,
    allocationMYR: 1000,
    orderMethod: '成行',
    completed: false,
    createdAt: new Date().toISOString(),
    source: 'allocation',
    ...overrides,
  };
}

function position(symbol: string, shares: number, avg: number): PortfolioPosition {
  return {
    id: `bursa-${symbol}-t`,
    symbol,
    market: 'bursa',
    currency: 'MYR',
    shares,
    averageBuyPrice: avg,
    currentPrice: avg,
    openedAt: new Date().toISOString(),
  };
}

function stateWithOrder(order: ManualOrderItem, portfolio: PortfolioPosition[] = []): AppState {
  return {
    ...createDefaultAppState(),
    appMode: 'manual',
    portfolio,
    manualOrderList: [order],
  };
}

describe('manualOrderConfirmation', () => {
  beforeEach(async () => {
    await savePersonalKillSwitches({
      readOnlyMode: false,
      disableTradeSubmission: false,
    });
  });

  it('validateManualOrderConfirmInput rejects invalid quantity and price', () => {
    const badQty = validateManualOrderConfirmInput({ shares: 0, executedPrice: 10 });
    expect(badQty.ok).toBe(false);
    if (!badQty.ok) expect(badQty.error).toBe(HOLDING_ERRORS.invalidQuantity);

    const badPrice = validateManualOrderConfirmInput({ shares: 10, executedPrice: 0 });
    expect(badPrice.ok).toBe(false);
    if (!badPrice.ok) expect(badPrice.error).toBe(HOLDING_ERRORS.invalidExecutedPrice);

    const negQty = validateManualOrderConfirmInput({ shares: -1, executedPrice: 5 });
    expect(negQty.ok).toBe(false);
    if (!negQty.ok) expect(negQty.error).toBe(HOLDING_ERRORS.invalidQuantity);
  });

  it('confirm adds new holding', () => {
    const state = stateWithOrder(baseOrder());
    const result = confirmManualOrderInState(state, 'order-1', {
      shares: 100,
      executedPrice: 10.5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const holdings = selectActiveHoldings(result.state, false);
    const h = holdings.find((p) => p.symbol === '1155');
    expect(h?.shares).toBe(100);
    expect(h?.averageBuyPrice).toBe(10.5);
  });

  it('confirm updates existing holding quantity and average cost', () => {
    const state = stateWithOrder(baseOrder(), [position('1155', 100, 9)]);
    const result = confirmManualOrderInState(state, 'order-1', {
      shares: 100,
      executedPrice: 11,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const h = selectActiveHoldings(result.state, false).find((p) => p.symbol === '1155');
    expect(h?.shares).toBe(200);
    expect(h?.averageBuyPrice).toBe(10);
  });

  it('completed order moves from pending to completed', () => {
    const state = stateWithOrder(baseOrder());
    const result = confirmManualOrderInState(state, 'order-1', {
      shares: 50,
      executedPrice: 10,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.manualOrderList.filter((i) => !i.completed)).toHaveLength(0);
    expect(result.state.manualOrderList.filter((i) => i.completed)).toHaveLength(1);
  });

  it('journal records rakuten_trade_manual and confirmed_by_user', () => {
    const state = stateWithOrder(baseOrder());
    const result = confirmManualOrderInState(state, 'order-1', {
      shares: 10,
      executedPrice: 9.8,
      memo: 'Rakuten約定',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.journalEntry?.recordSource).toBe('rakuten_trade_manual');
    expect(result.journalEntry?.userConfirmationStatus).toBe('confirmed_by_user');
    expect(result.journalEntry?.ledgerMode).toBe('manual');
    expect(result.journalEntry?.status).toBe('confirmed');
  });

  it('holdings selector includes the new holding', () => {
    const state = stateWithOrder(baseOrder({ symbol: '1023', id: 'order-1023' }));
    const result = confirmManualOrderInState(state, 'order-1023', {
      shares: 200,
      executedPrice: 7.2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const symbols = selectActiveHoldings(result.state, false).map((h) => h.symbol);
    expect(symbols).toContain('1023');
  });

  it('blocks in practice mode', () => {
    const state = { ...stateWithOrder(baseOrder()), appMode: 'practice' as const };
    const result = confirmManualOrderInState(state, 'order-1', {
      shares: 10,
      executedPrice: 10,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(HOLDING_ERRORS.manualConfirmLiveAnalysisOnly);
  });

  it('read-only kill switch blocks with Japanese error', async () => {
    await savePersonalKillSwitches({ readOnlyMode: true });
    expect(tradeBlockedReason()).toBe(HOLDING_ERRORS.readOnlyMode);
    expect(HOLDING_ERRORS.readOnlyMode).toBe('読み取り専用モードのため追加できません');
  });

  it('trade submission disabled blocks with Japanese error', async () => {
    await savePersonalKillSwitches({ readOnlyMode: false, disableTradeSubmission: true });
    expect(tradeBlockedReason()).toBe(HOLDING_ERRORS.tradeSubmissionStopped);
    expect(HOLDING_ERRORS.tradeSubmissionStopped).toBe('取引入力が停止されています');
  });

  it('sell confirm reduces holding when sufficient shares', () => {
    const sellOrder = baseOrder({ id: 'sell-1', side: 'sell', estimatedShares: 50 });
    const state = stateWithOrder(sellOrder, [position('1155', 100, 10)]);
    const result = confirmManualOrderInState(state, 'sell-1', {
      shares: 50,
      executedPrice: 11,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const h = selectActiveHoldings(result.state, false).find((p) => p.symbol === '1155');
    expect(h?.shares).toBe(50);
  });
});
