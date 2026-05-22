import { PAPER_MAX_ORDERS_PER_HOUR, PAPER_REVENGE_WINDOW_MS } from '../../constants/paperBroker';
import type {
  BrokerOrder,
  PaperBrokerPersisted,
  SubmitBrokerOrderInput,
} from '../../types/paperBroker';
import { getDefaultAccount } from './paperBrokerStorage';

function equityMYR(state: PaperBrokerPersisted): number {
  const acc = getDefaultAccount(state);
  let eq = acc.cashMYR;
  for (const p of acc.positions) {
    eq += p.shares * p.avgPrice;
  }
  return eq;
}

function currentDrawdownPct(state: PaperBrokerPersisted): number {
  const acc = getDefaultAccount(state);
  const eq = equityMYR(state);
  const peak = Math.max(acc.initialCapitalMYR, ...state.equityTimeline.map((t) => t.equityMYR));
  if (peak <= 0) return 0;
  return Math.max(0, ((peak - eq) / peak) * 100);
}

export function checkOrderRiskGuards(
  state: PaperBrokerPersisted,
  input: SubmitBrokerOrderInput,
): { allowed: boolean; reasonJa?: string } {
  if (state.config.killSwitch) {
    return { allowed: false, reasonJa: 'キルスイッチ — 新規注文停止中' };
  }
  if (state.config.realTradingEnabled !== false) {
    return { allowed: false, reasonJa: '実注文は無効化されています（安全ロック）' };
  }
  const dd = currentDrawdownPct(state);
  if (dd >= state.config.maxDrawdownPct && input.side === 'buy') {
    return {
      allowed: false,
      reasonJa: `最大DD ${dd.toFixed(1)}% — 新規買い停止`,
    };
  }

  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recentOrders = state.orders.filter((o) => Date.parse(o.createdAt) > hourAgo);
  if (recentOrders.length >= PAPER_MAX_ORDERS_PER_HOUR) {
    return { allowed: false, reasonJa: '高頻度注文 — 1時間の上限に達しました' };
  }

  if (
    state.lastRevengeTradeAt &&
    Date.now() - state.lastRevengeTradeAt < PAPER_REVENGE_WINDOW_MS &&
    input.side === 'buy'
  ) {
    return { allowed: false, reasonJa: 'リベンジトレード疑い — クールダウン中' };
  }

  const symKey = input.symbol.toUpperCase();
  const until = state.cooldownUntilBySymbol[symKey];
  if (until && until > Date.now()) {
    return { allowed: false, reasonJa: `${input.symbol} — 銘柄クールダウン中` };
  }

  const acc = getDefaultAccount(state);
  const eq = equityMYR(state);
  const orderNotional = input.quantity * input.referencePrice;
  if (eq > 0 && orderNotional / eq > 0.25) {
    return { allowed: false, reasonJa: 'オーバーサイズ注文 — 口座の25%超' };
  }

  const symExp = acc.positions.find((p) => p.symbol === input.symbol);
  const symValue = (symExp?.shares ?? 0) * input.referencePrice + orderNotional;
  if (eq > 0 && symValue / eq > state.config.maxSymbolExposurePct / 100) {
    return { allowed: false, reasonJa: '銘柄集中 — エクスポーザー上限' };
  }

  const sectorId = input.sectorId ?? 'general';
  let sectorVal = orderNotional;
  for (const p of acc.positions) {
    if ((p.sectorId ?? 'general') === sectorId) {
      sectorVal += p.shares * p.avgPrice;
    }
  }
  if (eq > 0 && sectorVal / eq > state.config.maxSectorExposurePct / 100) {
    return { allowed: false, reasonJa: 'セクター集中 — エクスポーザー上限' };
  }

  return { allowed: true };
}

export function checkAiConfidenceGate(
  input: SubmitBrokerOrderInput,
  minConfidence = 52,
): { watchOnly: boolean; reasonJa?: string } {
  const c = input.aiConfidencePct ?? 70;
  if (c < minConfidence) {
    return {
      watchOnly: true,
      reasonJa: `confidence ${c}% — 参考（watch only）`,
    };
  }
  return { watchOnly: false };
}

export function checkPanicRegimeForceDefensive(regimeId: string | null): {
  blockBuy: boolean;
  reasonJa?: string;
} {
  if (regimeId === 'panic') {
    return { blockBuy: true, reasonJa: 'panic相場 — 買いは防御モードで抑制' };
  }
  return { blockBuy: false };
}

export function applyCooldownAfterOrder(
  state: PaperBrokerPersisted,
  symbol: string,
): PaperBrokerPersisted {
  return {
    ...state,
    cooldownUntilBySymbol: {
      ...state.cooldownUntilBySymbol,
      [symbol.toUpperCase()]: Date.now() + state.config.cooldownMs,
    },
  };
}

export function computeExposure(
  state: PaperBrokerPersisted,
): { symbol: Array<{ symbol: string; pct: number }>; sector: Array<{ sectorId: string; pct: number }> } {
  const acc = getDefaultAccount(state);
  const eq = Math.max(1, equityMYR(state));
  const symMap = new Map<string, number>();
  const secMap = new Map<string, number>();
  for (const p of acc.positions) {
    const v = p.shares * p.avgPrice;
    symMap.set(p.symbol, (symMap.get(p.symbol) ?? 0) + v);
    const sec = p.sectorId ?? 'general';
    secMap.set(sec, (secMap.get(sec) ?? 0) + v);
  }
  return {
    symbol: [...symMap.entries()].map(([symbol, v]) => ({
      symbol,
      pct: Math.round((v / eq) * 1000) / 10,
    })),
    sector: [...secMap.entries()].map(([sectorId, v]) => ({
      sectorId,
      pct: Math.round((v / eq) * 1000) / 10,
    })),
  };
}

export function computeWinRate(orders: BrokerOrder[]): number | null {
  const filled = orders.filter((o) => o.status === 'filled' || o.status === 'partial');
  if (filled.length < 2) return null;
  const sells = filled.filter((o) => o.side === 'sell' || o.side === 'reduce');
  if (sells.length === 0) return null;
  return Math.round((sells.length / filled.length) * 100);
}

export { currentDrawdownPct, equityMYR };
