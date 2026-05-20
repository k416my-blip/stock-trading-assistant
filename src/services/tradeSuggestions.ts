import type { SellSuggestion, TechnicalSnapshot, TradeSuggestion } from '../types';
import { formatFixed, safePrice } from '../utils/safeNumeric';

export function buildTradeSuggestion(
  currentPrice: number,
  technicals: TechnicalSnapshot,
): TradeSuggestion {
  const price = safePrice(currentPrice, 0, 0);
  const stopPct = technicals.buySignal === 'buy' ? 0.05 : 0.07;
  const targetPct = technicals.buySignal === 'buy' ? 0.12 : 0.08;

  const entryPrice = price;
  const stopLoss = Number(formatFixed(price * (1 - stopPct), 2, '0'));
  const takeProfit = Number(formatFixed(price * (1 + targetPct), 2, '0'));

  const rationale =
    technicals.buySignal === 'buy'
      ? '移動平均線上でRSIも健全です。Rakuten Tradeで手動の分割買いを検討してください。'
      : technicals.buySignal === 'wait'
        ? 'エントリーには時期尚早 — 押し目を待つか、ポジションは小さく。'
        : '様子見 — トレンド確認後にRakuten Tradeで手動注文を。';

  return { entryPrice, stopLoss, takeProfit, rationale };
}

export function buildSellSuggestion(
  currentPrice: number,
  technicals: TechnicalSnapshot,
): SellSuggestion {
  const price = safePrice(currentPrice, 0, 0);
  const targetPrice = Number(formatFixed(price * 1.05, 2, '0'));
  const stopLoss = Number(formatFixed(price * 1.08, 2, '0'));

  const rationale =
    technicals.sellSignal === 'sell'
      ? 'RSIが高く短期線を下回っています。利確・一部売却をRakuten Tradeで手動検討してください。'
      : technicals.sellSignal === 'wait'
        ? '上昇トレンド継続の可能性 — 売却は急がず、損切りラインを確認。'
        : '明確な売りシグナルなし — 保有継続か、利確目標に到達したら手動売却。';

  return { targetPrice, stopLoss, rationale };
}
