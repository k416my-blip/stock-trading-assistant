import type { MacroIndicatorId, MacroSectorId } from '../types/bursaMacroIntelligence';

/** Phase19 — マクロ指標定義 */
export const PHASE19_MACRO_INDICATOR_DEFS: Array<{
  id: MacroIndicatorId;
  labelJa: string;
  yahooSymbol: string | null;
  unitJa: string;
  /** changePct が高いほど株式にネガティブ（金利・インフレ・ドル高・原油高など） */
  inverseForEquities: boolean;
}> = [
  { id: 'fed_rate', labelJa: 'US Fed Rate', yahooSymbol: null, unitJa: '%', inverseForEquities: true },
  { id: 'my_opr', labelJa: 'Malaysia OPR', yahooSymbol: null, unitJa: '%', inverseForEquities: true },
  { id: 'us_cpi', labelJa: 'US CPI (YoY)', yahooSymbol: null, unitJa: '%', inverseForEquities: true },
  { id: 'my_cpi', labelJa: 'Malaysia CPI (YoY)', yahooSymbol: null, unitJa: '%', inverseForEquities: true },
  { id: 'us10y', labelJa: 'US 10Y Treasury', yahooSymbol: '^TNX', unitJa: '%', inverseForEquities: true },
  { id: 'usd_myr', labelJa: 'USD/MYR', yahooSymbol: 'USDMYR=X', unitJa: 'MYR', inverseForEquities: true },
  { id: 'dxy', labelJa: 'DXY', yahooSymbol: 'DX-Y.NYB', unitJa: 'pt', inverseForEquities: true },
  { id: 'brent_oil', labelJa: 'Brent Oil', yahooSymbol: 'BZ=F', unitJa: 'USD', inverseForEquities: true },
  { id: 'gold', labelJa: 'Gold', yahooSymbol: 'GC=F', unitJa: 'USD', inverseForEquities: true },
  { id: 'sp500', labelJa: 'S&P500', yahooSymbol: '^GSPC', unitJa: 'pt', inverseForEquities: false },
  { id: 'nasdaq', labelJa: 'NASDAQ', yahooSymbol: '^IXIC', unitJa: 'pt', inverseForEquities: false },
  { id: 'klci', labelJa: 'KLCI', yahooSymbol: '^KLSE', unitJa: 'pt', inverseForEquities: false },
];

/** 参照レベル評価閾値 */
export const MACRO_LEVEL_THRESHOLDS = {
  fed_rate: { bearishAbove: 5.0, bullishBelow: 4.0 },
  my_opr: { bearishAbove: 3.25, bullishBelow: 2.75 },
  us_cpi: { bearishAbove: 3.5, bullishBelow: 2.0 },
  my_cpi: { bearishAbove: 3.0, bullishBelow: 1.5 },
} as const;

export const MACRO_CHANGE_BULLISH_PCT = 0.5;
export const MACRO_CHANGE_BEARISH_PCT = -0.5;

export const MACRO_SECTOR_LABEL_JA: Record<MacroSectorId, string> = {
  banking: '銀行',
  utilities: '公益',
  consumer: '消費財',
  energy: 'エネルギー',
  technology: 'テクノロジー',
};

/** セクター別指標感応度（+ = 同方向、- = 逆方向） */
export const SECTOR_INDICATOR_SENSITIVITY: Record<
  MacroSectorId,
  Partial<Record<MacroIndicatorId, number>>
> = {
  banking: {
    fed_rate: -1.2,
    my_opr: -1.2,
    us10y: -1.0,
    usd_myr: 0.4,
    dxy: 0.3,
    sp500: 0.6,
    nasdaq: 0.4,
    klci: 0.8,
    us_cpi: 0.5,
    my_cpi: 0.5,
    brent_oil: 0.2,
    gold: 0.2,
  },
  utilities: {
    fed_rate: 1.0,
    my_opr: 1.0,
    us10y: 1.0,
    us_cpi: 0.8,
    my_cpi: 0.9,
    usd_myr: 0.5,
    klci: 0.7,
    brent_oil: 0.6,
    sp500: 0.5,
    nasdaq: 0.3,
    dxy: 0.4,
    gold: 0.3,
  },
  consumer: {
    us_cpi: 1.0,
    my_cpi: 1.1,
    usd_myr: 0.9,
    dxy: 0.6,
    klci: 0.8,
    sp500: 0.6,
    nasdaq: 0.5,
    fed_rate: 0.7,
    my_opr: 0.7,
    us10y: 0.6,
    brent_oil: 0.7,
    gold: 0.4,
  },
  energy: {
    brent_oil: -1.2,
    dxy: 0.5,
    usd_myr: 0.4,
    sp500: 0.5,
    klci: 0.6,
    fed_rate: 0.4,
    my_opr: 0.4,
    us10y: 0.3,
    us_cpi: 0.4,
    my_cpi: 0.3,
    nasdaq: 0.4,
    gold: 0.3,
  },
  technology: {
    nasdaq: -1.0,
    sp500: -0.8,
    fed_rate: 1.0,
    my_opr: 0.8,
    us10y: 1.0,
    us_cpi: 0.7,
    dxy: 0.6,
    klci: 0.5,
    usd_myr: 0.5,
    brent_oil: 0.4,
    gold: 0.4,
    my_cpi: 0.5,
  },
};

export const MACRO_INTELLIGENCE_UNAVAILABLE_JA = 'データ未取得';
