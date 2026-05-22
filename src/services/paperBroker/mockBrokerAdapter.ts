/**
 * Mock broker — 実API送信なし。状態は PaperBrokerPersisted のみ更新。
 */
import { PAPER_DEFAULT_ACCOUNT_ID } from '../../constants/paperBroker';
import type {
  BrokerAdapter,
  BrokerBalance,
  BrokerHealth,
  BrokerId,
  BrokerOrder,
  BrokerPosition,
  PaperBrokerPersisted,
  SubmitBrokerOrderInput,
  SubmitBrokerOrderResult,
} from '../../types/paperBroker';
import { getDefaultAccount, loadPaperBrokerState, savePaperBrokerState } from './paperBrokerStorage';
import { simulatePaperFill } from './paperExecutionEngine';
import {
  applyCooldownAfterOrder,
  checkAiConfidenceGate,
  checkOrderRiskGuards,
} from './paperRiskLayer';
import { validateEntryConditions } from './entryValidation';
import {
  canSubmitPaperOrderInSession,
  resolveMarketSession,
} from './marketHoursEngine';

function newOrderId(): string {
  return `po-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyFillToAccount(
  state: PaperBrokerPersisted,
  order: BrokerOrder,
  fillQty: number,
  fillPrice: number,
  commission: number,
): PaperBrokerPersisted {
  const acc = getDefaultAccount(state);
  const accounts = state.accounts.map((a) => {
    if (a.id !== acc.id) return a;
    let cash = a.cashMYR;
    let positions = [...a.positions];
    const notional = fillQty * fillPrice;

    if (order.side === 'buy') {
      cash -= notional + commission;
      const idx = positions.findIndex((p) => p.symbol === order.symbol);
      if (idx >= 0) {
        const p = positions[idx];
        const total = p.shares + fillQty;
        const avg = (p.avgPrice * p.shares + fillPrice * fillQty) / total;
        positions[idx] = { ...p, shares: total, avgPrice: avg };
      } else {
        positions.push({
          symbol: order.symbol,
          market: order.market,
          shares: fillQty,
          avgPrice: fillPrice,
          sectorId: order.symbol.startsWith('1') ? 'bank' : 'general',
        });
      }
    } else {
      cash += notional - commission;
      const idx = positions.findIndex((p) => p.symbol === order.symbol);
      if (idx >= 0) {
        const p = positions[idx];
        const sellQty = order.side === 'reduce' ? Math.min(fillQty, Math.ceil(p.shares * 0.35)) : fillQty;
        if (p.shares <= sellQty) positions.splice(idx, 1);
        else positions[idx] = { ...p, shares: p.shares - sellQty };
      }
    }
    return { ...a, cashMYR: Math.round(cash * 100) / 100, positions };
  });
  return { ...state, accounts };
}

export function createMockBrokerAdapter(brokerId: BrokerId, labelJa: string): BrokerAdapter {
  return {
    id: brokerId,
    labelJa,
    mockMode: true,
    async healthCheck(): Promise<BrokerHealth> {
      return {
        ok: true,
        mockMode: true,
        latencyMs: 5,
        messageJa: `${labelJa} — モック接続（実APIなし）`,
      };
    },
    async getBalance(accountId: string): Promise<BrokerBalance> {
      const state = await loadPaperBrokerState();
      const acc = state.accounts.find((a) => a.id === accountId) ?? getDefaultAccount(state);
      return { cashMYR: acc.cashMYR, buyingPowerMYR: acc.cashMYR, currency: 'MYR' };
    },
    async getPositions(accountId: string): Promise<BrokerPosition[]> {
      const state = await loadPaperBrokerState();
      const acc = state.accounts.find((a) => a.id === accountId) ?? getDefaultAccount(state);
      return acc.positions;
    },
    async getOrders(accountId: string): Promise<BrokerOrder[]> {
      const state = await loadPaperBrokerState();
      return state.orders.filter((o) => o.accountId === accountId);
    },
    async submitOrder(
      accountId: string,
      input: SubmitBrokerOrderInput,
    ): Promise<SubmitBrokerOrderResult> {
      let state = await loadPaperBrokerState();

      const session = resolveMarketSession(input.market);
      if (!canSubmitPaperOrderInSession(session)) {
        return { ok: false, errorJa: '市場時間外 — 紙上注文は受付不可', blocked: true };
      }

      const risk = checkOrderRiskGuards(state, input);
      if (!risk.allowed) {
        return { ok: false, errorJa: risk.reasonJa ?? 'リスクガード', blocked: true };
      }

      const conf = checkAiConfidenceGate(input);
      if (conf.watchOnly && input.side === 'buy') {
        return { ok: false, errorJa: conf.reasonJa ?? 'confidence不足', blocked: true };
      }

      const entry = validateEntryConditions(input);
      if (!entry.ok) {
        return { ok: false, errorJa: entry.warningsJa.join(' · '), blocked: true };
      }

      if (state.config.humanConfirmRequired && !input.humanConfirmed) {
        return {
          ok: false,
          errorJa: '人間確認が必要です（シミュレーション）',
          blocked: true,
        };
      }

      const fill = simulatePaperFill({
        side: input.side,
        quantity: input.quantity,
        referencePrice: input.referencePrice,
        market: input.market,
        spreadBpsEstimate: input.spreadBpsEstimate,
        volatilityPct: input.volatilityPct,
      });

      const now = new Date().toISOString();
      const order: BrokerOrder = {
        id: newOrderId(),
        brokerId,
        accountId,
        symbol: input.symbol,
        market: input.market,
        side: input.side,
        orderType: input.orderType ?? 'market',
        quantity: input.quantity,
        limitPrice: input.limitPrice ?? null,
        stopPrice: input.stopPrice ?? null,
        status: fill.partial ? 'partial' : 'filled',
        filledQuantity: fill.fillQuantity,
        avgFillPrice: fill.avgFillPrice,
        commissionMYR: fill.commissionMYR,
        slippageBps: fill.slippageBps,
        spreadBps: fill.spreadBps,
        latencyMs: fill.latencyMs,
        createdAt: now,
        updatedAt: now,
        rejectReasonJa: null,
        aiConfidencePct: input.aiConfidencePct ?? null,
        aiAction: input.aiAction ?? null,
        watchOnly: conf.watchOnly,
      };

      state = applyFillToAccount(state, order, fill.fillQuantity, fill.avgFillPrice, fill.commissionMYR);
      state = {
        ...applyCooldownAfterOrder(state, input.symbol),
        orders: [order, ...state.orders].slice(0, 300),
        journal: [
          {
            id: `j-${order.id}`,
            at: now,
            symbol: input.symbol,
            side: input.side,
            actionJa: `${input.side} ${fill.fillQuantity}@${fill.avgFillPrice}`,
            outcomeJa: fill.noteJa,
            aiWhyJa: null,
            confidencePct: input.aiConfidencePct ?? null,
          },
          ...state.journal,
        ].slice(0, 120),
      };

      const acc = getDefaultAccount(state);
      let equity = acc.cashMYR;
      for (const p of acc.positions) equity += p.shares * p.avgPrice;
      const peak = Math.max(...state.equityTimeline.map((t) => t.equityMYR), acc.initialCapitalMYR);
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      state.equityTimeline = [
        ...state.equityTimeline,
        { at: now, equityMYR: equity, drawdownPct: Math.round(dd * 10) / 10 },
      ].slice(-200);

      if (input.side === 'sell' && fill.avgFillPrice < input.referencePrice * 0.97) {
        state.lastRevengeTradeAt = Date.now();
      }

      await savePaperBrokerState(state);
      return {
        ok: true,
        order,
        simulationNoteJa: `${fill.noteJa} — ${labelJa}（紙上のみ）`,
      };
    },
    async cancelOrder(accountId: string, orderId: string) {
      const state = await loadPaperBrokerState();
      const idx = state.orders.findIndex((o) => o.id === orderId && o.accountId === accountId);
      if (idx < 0) return { ok: false, errorJa: '注文が見つかりません' };
      if (state.orders[idx].status !== 'pending') {
        return { ok: false, errorJa: '取消可能な状態ではありません' };
      }
      const next = [...state.orders];
      next[idx] = {
        ...next[idx],
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      };
      await savePaperBrokerState({ ...state, orders: next });
      return { ok: true };
    },
  };
}

export const mockPaperAdapter = createMockBrokerAdapter('mock_paper', 'Paper（内蔵）');
