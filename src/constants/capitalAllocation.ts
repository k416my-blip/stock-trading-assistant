import type { Market } from '../types';
import type { LotRule, PortfolioMode, SizingTier } from '../types/capitalAllocation';

export const CAPITAL_ALLOCATION_REGULATORY_JA =
  '参考情報のみ — 実注文は送信しません。紙上（Paper）シミュレーション前提。最終判断は人間が証券会社アプリで行ってください。';

export const CAPITAL_ALLOCATION_HUMAN_CONFIRM_JA =
  '以下はAIによる資金配分・株数の参考案です。必ずご自身で確認してから執行してください。';

export const REAL_TRADING_LOCK_JA = 'realTradingEnabled=false — 実マネー注文はロックされています。';

/** 最低現金維持率（%） */
export const MIN_CASH_RESERVE_NORMAL_PCT = 10;
export const MIN_CASH_RESERVE_DEFENSIVE_PCT = 20;
export const MIN_CASH_RESERVE_PANIC_PCT = 40;

export const UNSETTLED_CASH_PCT = 2;
export const FX_BUFFER_PCT = 2.5;
export const FEE_BUFFER_BPS = 8;

export const KELLY_SAFE_MAX_FRACTION = 0.25;
export const ATR_STOP_PROXY_PCT = 4;

export const CONVICTION_HIGH_MIN_CONF = 72;
export const CONVICTION_MEDIUM_MIN_CONF = 52;

export const CONFIDENCE_ALLOC_MULT = {
  high: 1,
  medium: 0.65,
  low: 0.35,
} as const;

export const CONVICTION_SIZE_MULT = {
  high: 1.15,
  medium: 1,
  low: 0.75,
} as const;

export const VOL_HIGH_SHRINK = 0.7;
export const VOL_HIGH_THRESHOLD_PCT = 4;

export const BEGINNER_MAX_SUGGESTIONS = 3;

export const PORTFOLIO_MODE_SIZE_MULT: Record<PortfolioMode, number> = {
  dividend: 0.85,
  growth: 1.05,
  defensive: 0.75,
  balanced: 1,
};

export const LOT_RULES: Record<Market, LotRule> = {
  bursa: {
    market: 'bursa',
    labelJa: 'Bursa — 100株単位',
    lotSize: 100,
    minLot: 100,
    fractionalAllowed: false,
  },
  us: {
    market: 'us',
    labelJa: 'US — 小数株可（参考）',
    lotSize: 1,
    minLot: 1,
    fractionalAllowed: true,
  },
  hk: {
    market: 'hk',
    labelJa: 'HK — 100株単位（参考）',
    lotSize: 100,
    minLot: 100,
    fractionalAllowed: false,
  },
};

export const PORTFOLIO_MODE_LABELS_JA: Record<PortfolioMode, string> = {
  dividend: '配当',
  growth: 'グロース',
  defensive: '防御',
  balanced: 'バランス',
};

export const SIZING_TIER_LABELS_JA: Record<SizingTier, string> = {
  conservative: '保守',
  standard: '標準',
  aggressive: '積極',
};

export const CAPITAL_ALLOCATION_AI_PROMPT_JA = `
【Capital Allocation & Buying Power】
- 「何株・いくら・現金残」を aiSizingSummaryJa / aiRecommendationLineJa から引用。
- 買い候補だけでなく具体株数と現金比率を優先。実注文・自動売買は禁止（Paperのみ）。
`.trim();

export const CAPITAL_ALLOCATION_UI_LABELS_JA = {
  panelTitle: 'Capital Allocation & Buying Power',
  buyingPower: 'Buying Power',
  sizing: 'ポジションサイズ',
  orders: '提案オーダー',
  efficiency: '資金効率',
  paper: '紙上ドラフト',
  mode: 'ポートフォリオモード',
} as const;
