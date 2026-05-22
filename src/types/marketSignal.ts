import type { Market } from './index';

/** 市場・保有から検出した生シグナル（通知文案は advisor-engine が生成） */
export type MarketSignalKind =
  | 'price_surge'
  | 'price_drop'
  | 'volume_spike'
  | 'stop_loss_near'
  | 'take_profit_near'
  | 'rsi_overbought'
  | 'rsi_oversold'
  | 'trend_reversal_bull'
  | 'trend_reversal_bear'
  | 'dividend_ex_date'
  | 'allocation_concentration'
  | 'market_weak'
  | 'high_dividend_value'
  | 'unrealized_sharp_gain'
  | 'unrealized_sharp_loss';

export type MarketSignalPriority = 'high' | 'medium' | 'low';

export type MarketSignal = {
  kind: MarketSignalKind;
  priority: MarketSignalPriority;
  symbol?: string;
  market?: Market;
  name?: string;
  /** 提案理由の短い根拠（例: RSI 28, 配当利回り 6.1%） */
  reasonsJa: string[];
  detailJa?: string;
  source: string;
};
