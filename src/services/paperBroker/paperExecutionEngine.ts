import {
  PAPER_BASE_LATENCY_MS,
  PAPER_BASE_SLIPPAGE_BPS,
  PAPER_COMMISSION_BPS,
} from '../../constants/paperBroker';
import type { Market } from '../../types';
import type { PaperOrderSide } from '../../types/paperBroker';

export type PaperFillSimulation = {
  fillQuantity: number;
  avgFillPrice: number;
  commissionMYR: number;
  slippageBps: number;
  spreadBps: number;
  latencyMs: number;
  partial: boolean;
  noteJa: string;
};

const SPREAD_BY_MARKET: Record<Market, number> = {
  bursa: 10,
  us: 4,
  hk: 8,
};

export function simulatePaperFill(input: {
  side: PaperOrderSide;
  quantity: number;
  referencePrice: number;
  market: Market;
  spreadBpsEstimate?: number;
  volatilityPct?: number;
}): PaperFillSimulation {
  const spreadBps = input.spreadBpsEstimate ?? SPREAD_BY_MARKET[input.market] ?? 10;
  const vol = input.volatilityPct ?? 15;
  const slippageBps = PAPER_BASE_SLIPPAGE_BPS + vol * 0.15;
  const latencyMs = PAPER_BASE_LATENCY_MS + Math.floor(Math.random() * 80);
  const partial = Math.random() < 0.12;
  const fillRatio = partial ? 0.4 + Math.random() * 0.5 : 1;
  const fillQuantity = Math.max(1, Math.floor(input.quantity * fillRatio));
  const sideSign = input.side === 'buy' ? 1 : -1;
  const impactBps = (spreadBps / 2 + slippageBps) / 10000;
  const avgFillPrice = input.referencePrice * (1 + sideSign * impactBps);
  const notional = fillQuantity * avgFillPrice;
  const commissionMYR = (notional * PAPER_COMMISSION_BPS) / 10000;

  return {
    fillQuantity,
    avgFillPrice: Math.round(avgFillPrice * 1000) / 1000,
    commissionMYR: Math.round(commissionMYR * 100) / 100,
    slippageBps: Math.round(slippageBps * 10) / 10,
    spreadBps,
    latencyMs,
    partial,
    noteJa: partial
      ? `部分約定 ${fillQuantity}/${input.quantity} · スリッページ ${slippageBps.toFixed(1)}bps`
      : `約定 · 手数料 ${commissionMYR.toFixed(2)} MYR · ${latencyMs}ms`,
  };
}
