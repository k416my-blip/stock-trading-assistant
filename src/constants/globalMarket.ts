import type {
  ConciergeMarketRegimeId,
  GlobalIndexId,
  GlobalSectorId,
} from '../types/globalMarketAnalysis';

export const GLOBAL_MARKET_CACHE_TTL_MS = 5 * 60 * 1000;

export const CONCIERGE_MARKET_REGIME_LABEL: Record<ConciergeMarketRegimeId, string> = {
  bullish: '強気',
  bearish: '弱気',
  risk_on: 'リスクオン',
  risk_off: 'リスクオフ',
  panic: 'パニック',
  recovery: '回復',
  sideways: '横ばい',
};

export const GLOBAL_INDEX_DEFS: Array<{
  id: GlobalIndexId;
  labelJa: string;
  yahooSymbol: string;
  region: 'us' | 'japan' | 'malaysia';
}> = [
  { id: 'sp500', labelJa: 'S&P500', yahooSymbol: '^GSPC', region: 'us' },
  { id: 'nasdaq', labelJa: 'Nasdaq', yahooSymbol: '^IXIC', region: 'us' },
  { id: 'dow', labelJa: 'Dow', yahooSymbol: '^DJI', region: 'us' },
  { id: 'nikkei225', labelJa: '日経225', yahooSymbol: '^N225', region: 'japan' },
  { id: 'topix', labelJa: 'TOPIX', yahooSymbol: '1306.T', region: 'japan' },
  { id: 'klci', labelJa: 'FTSE Bursa KLCI', yahooSymbol: '^KLSE', region: 'malaysia' },
];

export const GLOBAL_SECTOR_DEFS: Array<{
  id: GlobalSectorId;
  labelJa: string;
  etfSymbol: string;
}> = [
  { id: 'tech', labelJa: 'テック', etfSymbol: 'XLK' },
  { id: 'banking', labelJa: '銀行', etfSymbol: 'XLF' },
  { id: 'energy', labelJa: 'エネルギー', etfSymbol: 'XLE' },
  { id: 'semiconductor', labelJa: '半導体', etfSymbol: 'SOXX' },
  { id: 'consumer', labelJa: '消費', etfSymbol: 'XLY' },
  { id: 'healthcare', labelJa: 'ヘルスケア', etfSymbol: 'XLV' },
  { id: 'reit', labelJa: 'REIT', etfSymbol: 'VNQ' },
];

export const MACRO_INSTRUMENT_DEFS = {
  vix: { id: 'vix', labelJa: 'VIX（恐怖指数）', yahooSymbol: '^VIX', unitJa: 'pt' },
  usdjpy: { id: 'usdjpy', labelJa: 'USD/JPY', yahooSymbol: 'JPY=X', unitJa: '円' },
  usdmyr: { id: 'usdmyr', labelJa: 'USD/MYR', yahooSymbol: 'USDMYR=X', unitJa: 'MYR' },
  dxy: { id: 'dxy', labelJa: 'ドル指数（DXY）', yahooSymbol: 'DX-Y.NYB', unitJa: 'pt' },
  us10y: { id: 'us10y', labelJa: '米10年債利回り', yahooSymbol: '^TNX', unitJa: '%' },
} as const;

/** 参照値 — ライブ取得不可時のフォールバック（手動更新想定） */
export const FED_FUNDS_RATE_REFERENCE_PCT = 5.25;

export const MARKET_REGIME_AI_PROMPT_JA = `
【市場レジーム分析 — 必須】
回答では必ず次の2つを分けて説明すること:
1. 個別要因（銘柄固有のニュース・決算・保有・テクニカル）
2. 市場全体要因（指数・VIX・為替・金利・セクター・レジーム）

context.globalMarketAnalysis に数値がある場合は必ず引用すること。
例: 「市場全体がリスクオフのため、個別材料以上に売られている可能性があります」

VIX・KLCI・主要指数の変化率を根拠に述べ、推測のみの断言は禁止。
データ不足（insufficientData）のときは「市場データ不足」と明示し、個別銘柄だけで市場全体を断定しないこと。
`.trim();

export const VIX_SPIKE_THRESHOLD = 22;
export const VIX_PANIC_THRESHOLD = 28;
export const INDEX_SHARP_DROP_PCT = -1.5;
export const KLCI_SHARP_DROP_PCT = -2;
