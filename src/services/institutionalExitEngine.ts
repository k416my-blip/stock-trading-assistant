import { EXIT_TRIGGER_LABEL } from '../constants/institutionalExecution';
import { findStock, getSamplePriceHistory } from '../data/sampleStocks';
import type { PortfolioPosition, TechnicalSnapshot, TradeSuggestion } from '../types';
import type { ExitRecommendation, ExitTriggerId } from '../types/institutionalRisk';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { StockRecommendation } from '../types/recommendation';
import { stockToSectorTheme } from './marketIndicators';
import { dailyReturns } from './crisisCorrelationEngine';

function estimateVolatilityPct(symbol: string): number {
  try {
    const bars = getSamplePriceHistory(symbol);
    const rets = dailyReturns(bars);
    if (rets.length < 5) return 20;
    const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
    const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  } catch {
    return 22;
  }
}

function buildExit(
  triggerId: ExitTriggerId,
  active: boolean,
  suggestedActionJa: string,
  exitPct: number,
  priceLevel?: number,
): ExitRecommendation {
  return {
    triggerId,
    labelJa: EXIT_TRIGGER_LABEL[triggerId],
    active,
    suggestedActionJa,
    exitPct,
    priceLevel,
  };
}

/** 保有ポジションの出口ルール評価 */
export function evaluateExitRules(input: {
  position: PortfolioPosition;
  currentPrice: number;
  technicals: TechnicalSnapshot;
  regime: MarketRegimeResult;
  recommendation?: StockRecommendation | null;
  tradeSuggestion?: TradeSuggestion;
}): ExitRecommendation[] {
  const { position, currentPrice, technicals, regime, recommendation, tradeSuggestion } = input;
  const entry = position.averageBuyPrice;
  const stop = tradeSuggestion?.stopLoss ?? entry * 0.94;
  const vol = estimateVolatilityPct(position.symbol);
  const stock = findStock(position.symbol);
  const sector = stock ? stockToSectorTheme(stock) : 'growth';

  const gainPct = entry > 0 ? ((currentPrice - entry) / entry) * 100 : 0;
  const trailingStop = gainPct > 8 ? currentPrice * (1 - Math.max(0.04, vol / 400)) : stop;
  const volStop = entry * (1 - vol / 100);
  const trailingActive = currentPrice <= trailingStop && gainPct > 3;
  const volStopActive = currentPrice <= volStop;

  const regimeExit =
    regime.avoidSectors.includes(sector) ||
    regime.regimeId === 'risk_off' ||
    regime.regimeId === 'recession_fear';
  const thesisBreak =
    (recommendation?.totalScore ?? 60) < 45 ||
    technicals.sellSignal === 'sell' ||
    technicals.rsi14 > 78;

  return [
    buildExit(
      'trailing_stop',
      trailingActive,
      trailingActive
        ? `トレーリング水準 ${trailingStop.toFixed(2)} 到達 — 一部〜全売却を検討`
        : `トレーリング: ${trailingStop.toFixed(2)}（+${gainPct.toFixed(1)}%時に有効化）`,
      trailingActive ? 50 : 0,
      trailingStop,
    ),
    buildExit(
      'volatility_stop',
      volStopActive,
      volStopActive
        ? `ボラ拡大ストップ ${volStop.toFixed(2)} 割れ — 損切り優先`
        : `ボラ・ストップ: ${volStop.toFixed(2)}（年率ボラ ${vol.toFixed(0)}%）`,
      volStopActive ? 100 : 0,
      volStop,
    ),
    buildExit(
      'regime_exit',
      regimeExit,
      regimeExit
        ? `レジーム「${regime.labelJa}」— ${sector}セクター縮小を推奨`
        : 'レジーム整合 — 保有継続可',
      regimeExit ? 35 : 0,
    ),
    buildExit(
      'thesis_break',
      thesisBreak,
      thesisBreak
        ? `スコア${recommendation?.totalScore ?? '—'} / RSI ${technicals.rsi14.toFixed(0)} — テシス見直し`
        : 'ファンダ・テクニカル整合',
      thesisBreak ? 60 : 0,
    ),
  ];
}
