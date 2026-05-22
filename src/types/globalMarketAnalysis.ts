/** 市場レジーム分析（コンシェルジュ・全体地合い） */

export type ConciergeMarketRegimeId =
  | 'bullish'
  | 'bearish'
  | 'risk_on'
  | 'risk_off'
  | 'panic'
  | 'recovery'
  | 'sideways';

export type GlobalMarketRegion = 'us' | 'japan' | 'malaysia' | 'macro';

export type GlobalIndexId =
  | 'sp500'
  | 'nasdaq'
  | 'dow'
  | 'nikkei225'
  | 'topix'
  | 'klci';

export type GlobalSectorId =
  | 'tech'
  | 'banking'
  | 'energy'
  | 'semiconductor'
  | 'consumer'
  | 'healthcare'
  | 'reit';

export type GlobalIndexQuote = {
  id: GlobalIndexId;
  labelJa: string;
  region: GlobalMarketRegion;
  yahooSymbol: string;
  price: number | null;
  changePct: number | null;
  fromLive: boolean;
  staleNoteJa: string | null;
};

export type GlobalSectorSnapshot = {
  id: GlobalSectorId;
  labelJa: string;
  etfSymbol: string;
  changePct: number | null;
  momentumScore: number;
  leadershipRank: number;
};

export type MacroInstrumentQuote = {
  id: string;
  labelJa: string;
  yahooSymbol: string;
  value: number | null;
  changePct: number | null;
  unitJa: string;
  fromLive: boolean;
};

export type CorrelationInsight = {
  pairLabelJa: string;
  correlationHintJa: string;
  strength: 'strong' | 'moderate' | 'weak';
};

export type MarketScoreBlock = {
  marketRiskScore: number;
  fearScore: number;
  momentumScore: number;
  liquidityScore: number;
};

export type GlobalMarketAnalysisBundle = {
  generatedAt: string;
  regimeId: ConciergeMarketRegimeId;
  regimeLabelJa: string;
  regimeSummaryJa: string;
  regimeConfidencePct: number;
  indices: GlobalIndexQuote[];
  sectors: GlobalSectorSnapshot[];
  vix: MacroInstrumentQuote | null;
  forex: MacroInstrumentQuote[];
  rates: MacroInstrumentQuote[];
  correlations: CorrelationInsight[];
  marketScores: MarketScoreBlock;
  /** AI向け — 市場全体要因 */
  marketWideFactorsJa: string[];
  /** AI向け — 個別銘柄と分離するための注意 */
  individualVsMarketNoteJa: string;
  macroContextBulletsJa: string[];
  dataGapsJa: string[];
  insufficientData: boolean;
  sourceNoteJa: string;
};
