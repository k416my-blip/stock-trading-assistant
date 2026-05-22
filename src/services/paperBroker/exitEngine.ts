import type { BrokerPosition } from '../../types/paperBroker';

export type ExitAlert = {
  symbol: string;
  kind: 'stop_loss' | 'take_profit' | 'trailing';
  messageJa: string;
};

export function evaluateExitAlerts(
  positions: BrokerPosition[],
  prices: Record<string, number>,
  opts?: { stopLossPct?: number; takeProfitPct?: number },
): ExitAlert[] {
  const stop = opts?.stopLossPct ?? 12;
  const tp = opts?.takeProfitPct ?? 18;
  const alerts: ExitAlert[] = [];
  for (const p of positions) {
    const px = prices[p.symbol] ?? p.avgPrice;
    const pnlPct = ((px - p.avgPrice) / p.avgPrice) * 100;
    if (pnlPct <= -stop) {
      alerts.push({
        symbol: p.symbol,
        kind: 'stop_loss',
        messageJa: `${p.symbol}: 損切り圏 (${pnlPct.toFixed(1)}%)`,
      });
    } else if (pnlPct >= tp) {
      alerts.push({
        symbol: p.symbol,
        kind: 'take_profit',
        messageJa: `${p.symbol}: 利確圏 (+${pnlPct.toFixed(1)}%)`,
      });
    } else if (pnlPct >= tp * 0.7) {
      alerts.push({
        symbol: p.symbol,
        kind: 'trailing',
        messageJa: `${p.symbol}: トレーリング監視 (+${pnlPct.toFixed(1)}%)`,
      });
    }
  }
  return alerts.slice(0, 6);
}
