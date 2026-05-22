/**
 * マーケット変化の検知（シグナルのみ。文案・通知は advisor / notification 層）
 */
import { findStock, getSamplePriceHistory } from '../data/sampleStocks';
import type { PortfolioPosition } from '../types';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { MarketSignal, MarketSignalKind } from '../types/marketSignal';
import { analyzeTechnicals } from './technicalAnalysis';
import { buildHoldingDetails, calculatePositionsPnLFromList } from './portfolio';
import { scanHoldingAlerts } from './alertEngine';
import { positionDisplayName } from './sellAllHoldings';

export type SignalEngineInput = {
  holdings: PortfolioPosition[];
  marketRegime?: MarketRegimeResult | null;
  nowMs?: number;
};

const SURGE_PCT = 3;
const DROP_PCT = -5;
const RSI_OVERBOUGHT = 70;
const RSI_OVERSOLD = 30;
const ALLOC_WARN_PCT = 55;
const DIVIDEND_EX_DAYS = 14;

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(KL|HK)$/i, '');
}

function dayChangePct(bars: { close: number }[]): number | null {
  if (bars.length < 2) return null;
  const prev = bars[bars.length - 2].close;
  const last = bars[bars.length - 1].close;
  if (prev <= 0) return null;
  return ((last - prev) / prev) * 100;
}

function volumeSpikeRatio(bars: { volume: number }[]): number | null {
  if (bars.length < 10) return null;
  const volumes = bars.map((b) => b.volume);
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior <= 0) return null;
  return recent / prior;
}

/** デモ用: 銘柄から安定した権利付き最終日を算出（ライブカレンダー接続前） */
export function estimateDividendExDateMs(symbol: string, nowMs: number): number {
  const key = normalizeSymbol(symbol);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i) * (i + 3)) % 97;
  const daysAhead = 3 + (hash % 25);
  const d = new Date(nowMs);
  d.setDate(d.getDate() + daysAhead);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function pushSignal(
  out: MarketSignal[],
  signal: Omit<MarketSignal, 'reasonsJa'> & { reasonsJa: string[] },
): void {
  out.push(signal);
}

export function evaluateMarketSignals(input: SignalEngineInput): MarketSignal[] {
  const out: MarketSignal[] = [];
  const nowMs = input.nowMs ?? Date.now();
  const active = input.holdings.filter((p) => (p.shares ?? 0) > 0);

  for (const pos of active) {
    const sym = normalizeSymbol(pos.symbol);
    const bars = getSamplePriceHistory(sym);
    const tech = analyzeTechnicals(bars);
    const name = positionDisplayName(pos);
    const change = dayChangePct(bars);
    const volRatio = volumeSpikeRatio(bars);
    const stock = findStock(sym);

    if (change != null && change >= SURGE_PCT) {
      pushSignal(out, {
        kind: 'price_surge',
        priority: 'high',
        symbol: pos.symbol,
        market: pos.market,
        name,
        reasonsJa: [`前日比 +${change.toFixed(1)}%`, `RSI ${tech.rsi14.toFixed(0)}`],
        detailJa: `${name} が急騰しています`,
        source: 'price_bars',
      });
    } else if (change != null && change <= DROP_PCT) {
      pushSignal(out, {
        kind: 'price_drop',
        priority: 'high',
        symbol: pos.symbol,
        market: pos.market,
        name,
        reasonsJa: [`前日比 ${change.toFixed(1)}%`, `RSI ${tech.rsi14.toFixed(0)}`],
        detailJa: `${name} が急落しています`,
        source: 'price_bars',
      });
    }

    if (volRatio != null && volRatio >= 1.45 && tech.volumeTrend === 'rising') {
      pushSignal(out, {
        kind: 'volume_spike',
        priority: 'medium',
        symbol: pos.symbol,
        market: pos.market,
        name,
        reasonsJa: [`出来高 ${(volRatio * 100 - 100).toFixed(0)}% 増`, '5日平均比'],
        source: 'volume',
      });
    }

    if (tech.rsi14 >= RSI_OVERBOUGHT) {
      pushSignal(out, {
        kind: 'rsi_overbought',
        priority: 'medium',
        symbol: pos.symbol,
        market: pos.market,
        name,
        reasonsJa: [`RSI ${tech.rsi14.toFixed(0)}`, '過熱圏'],
        source: 'technicals',
      });
    } else if (tech.rsi14 <= RSI_OVERSOLD) {
      pushSignal(out, {
        kind: 'rsi_oversold',
        priority: 'medium',
        symbol: pos.symbol,
        market: pos.market,
        name,
        reasonsJa: [`RSI ${tech.rsi14.toFixed(0)}`, '売られ過ぎ圏'],
        source: 'technicals',
      });
    }

    const lastClose = bars[bars.length - 1]?.close ?? 0;
    const prevClose = bars[bars.length - 2]?.close ?? lastClose;
    const crossedUp = prevClose < tech.ma20 && lastClose >= tech.ma20;
    const crossedDown = prevClose > tech.ma20 && lastClose <= tech.ma20;
    if (crossedUp && tech.ma20 > tech.ma50) {
      pushSignal(out, {
        kind: 'trend_reversal_bull',
        priority: 'medium',
        symbol: pos.symbol,
        market: pos.market,
        name,
        reasonsJa: ['25日線反発', `MA20 ${tech.ma20.toFixed(2)}`],
        source: 'ma_cross',
      });
    } else if (crossedDown) {
      pushSignal(out, {
        kind: 'trend_reversal_bear',
        priority: 'high',
        symbol: pos.symbol,
        market: pos.market,
        name,
        reasonsJa: ['25日線割れ', `MA20 ${tech.ma20.toFixed(2)}`],
        source: 'ma_cross',
      });
    }

    if (stock && stock.dividendYield >= 3) {
      const exMs = estimateDividendExDateMs(sym, nowMs);
      const days = Math.ceil((exMs - nowMs) / 86400000);
      if (days >= 0 && days <= DIVIDEND_EX_DAYS) {
        pushSignal(out, {
          kind: 'dividend_ex_date',
          priority: days <= 5 ? 'high' : 'medium',
          symbol: pos.symbol,
          market: pos.market,
          name,
          reasonsJa: [
            `権利付き最終日まで ${days}日`,
            `配当利回り ${stock.dividendYield.toFixed(1)}%`,
          ],
          source: 'dividend_calendar_demo',
        });
      }
    }
  }

  for (const alert of scanHoldingAlerts(active)) {
    const pos = active.find((p) => p.symbol === alert.symbol);
    if (!pos) continue;
    const kind: MarketSignalKind =
      alert.type === 'stop_loss_near' ? 'stop_loss_near' : 'take_profit_near';
    pushSignal(out, {
      kind,
      priority: 'high',
      symbol: alert.symbol,
      market: alert.market ?? pos.market,
      name: positionDisplayName(pos),
      reasonsJa: [alert.body],
      source: 'holding_alert',
    });
  }

  const pnls = calculatePositionsPnLFromList(active);
  const total = pnls.reduce((s, p) => s + p.currentValue, 0);
  const details = buildHoldingDetails(active, total);
  for (const h of details) {
    const pct = h.unrealizedProfitLossPercent;
    if (!Number.isFinite(pct)) continue;
    if (pct <= -8) {
      pushSignal(out, {
        kind: 'unrealized_sharp_loss',
        priority: 'high',
        symbol: h.symbol,
        market: h.market,
        name: h.name,
        reasonsJa: [`含み損 ${pct.toFixed(1)}%`, '損切りライン確認'],
        source: 'unrealized',
      });
    } else if (pct >= 12) {
      pushSignal(out, {
        kind: 'unrealized_sharp_gain',
        priority: 'high',
        symbol: h.symbol,
        market: h.market,
        name: h.name,
        reasonsJa: [`含み益 ${pct.toFixed(1)}%`, '利確ライン確認'],
        source: 'unrealized',
      });
    }
  }

  if (total > 0) {
    let maxPct = 0;
    let maxSym = '';
    let maxName = '';
    for (const h of details) {
      const pct = (h.currentValue / total) * 100;
      if (pct > maxPct) {
        maxPct = pct;
        maxSym = h.symbol;
        maxName = h.name;
      }
    }
    if (maxPct >= ALLOC_WARN_PCT) {
      pushSignal(out, {
        kind: 'allocation_concentration',
        priority: 'medium',
        symbol: maxSym,
        market: details.find((d) => d.symbol === maxSym)?.market,
        name: maxName,
        reasonsJa: [`最大シェア ${maxPct.toFixed(0)}%`, '資金集中'],
        source: 'allocation',
      });
    }
  }

  const regime = input.marketRegime;
  if (
    regime &&
    (regime.regimeId === 'risk_off' ||
      regime.regimeId === 'tightening_bear' ||
      regime.regimeId === 'high_volatility')
  ) {
    pushSignal(out, {
      kind: 'market_weak',
      priority: 'medium',
      reasonsJa: [regime.labelJa ?? regime.regimeId, '市場レジーム'],
      detailJa: '今日は市場全体が弱い可能性があります',
      source: 'market_regime',
    });
  }

  const dividendStocks = ['1155', '1023', '4707', '0820EA', '1295'];
  for (const sym of dividendStocks) {
    const stock = findStock(sym);
    if (!stock || stock.dividendYield < 5.5) continue;
    const held = active.some((p) => normalizeSymbol(p.symbol) === sym);
    if (held) continue;
    if (stock.per > 0 && stock.per <= 18) {
      pushSignal(out, {
        kind: 'high_dividend_value',
        priority: 'low',
        symbol: stock.symbol,
        market: stock.market,
        name: stock.name,
        reasonsJa: [
          `配当利回り ${stock.dividendYield.toFixed(1)}%`,
          `PER ${stock.per.toFixed(1)}`,
        ],
        detailJa: '高配当株が割安圏に入った可能性があります',
        source: 'screener_dividend',
      });
    }
  }

  return dedupeSignals(out);
}

function dedupeSignals(signals: MarketSignal[]): MarketSignal[] {
  const seen = new Set<string>();
  const out: MarketSignal[] = [];
  for (const s of signals) {
    const key = `${s.kind}:${s.symbol ?? '_'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
