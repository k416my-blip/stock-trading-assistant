/** Yahoo Finance に銘柄が見つからない場合の UI メッセージ */
export const YAHOO_SYMBOL_NOT_FOUND_MESSAGE =
  'Yahoo Financeに該当symbolが存在しません';

export const SYMBOL_EXPLORING_MESSAGE = 'symbol探索中...';

/** Yahoo chart JSON から価格を取り出せなかった場合 */
export const YAHOO_CHART_PARSE_FAILED_MESSAGE = '価格解析失敗';

/** 失敗キャッシュの有効期間（同じ銘柄の再試行を抑制） */
export const YAHOO_SYMBOL_FAILURE_CACHE_MS = 6 * 60 * 60 * 1000;

/** Nestlé Malaysia など手動固定（最優先） */
export const BURSA_SYMBOL_MAP: Record<string, string> = {
  '4707': '4707.KL',
  '5183': '5183.KL',
  '1155': '1155.KL',
  '1023': '1023.KL',
  '5347': '5347.KL',
  '5398': '5398.KL',
  '6742': '6742.KL',
  '3336': '3336.KL',
  '7103': '7103.KL',
  '0820EA': '0820EA.KL',
};

/** 4707.KL 失敗時に順番に試す候補 */
export const BURSA_FALLBACK_CANDIDATES: Record<string, string[]> = {
  '4707': ['NESM.KL', 'NESTLE.KL', '4707', '4707.KL'],
};

/** 正式ティッカー（Nestlé Malaysia ほか）— 検索前のシード */
export const BURSA_YAHOO_SYMBOL_SEED: Record<
  string,
  { yahooSymbol: string; shortName: string; exchange: string; longName?: string }
> = {
  '4707': {
    yahooSymbol: '4707.KL',
    shortName: 'NESTLE',
    exchange: 'KLS',
    longName: 'Nestlé (Malaysia) Berhad',
  },
  '1023': {
    yahooSymbol: '1023.KL',
    shortName: 'CIMB',
    exchange: 'KLS',
    longName: 'CIMB Group Holdings Berhad',
  },
  '5347': {
    yahooSymbol: '5347.KL',
    shortName: 'TENAGA',
    exchange: 'KLS',
    longName: 'Tenaga Nasional Berhad',
  },
  '5398': {
    yahooSymbol: '5398.KL',
    shortName: 'GAMUDA',
    exchange: 'KLS',
    longName: 'Gamuda Berhad',
  },
  '6742': {
    yahooSymbol: '6742.KL',
    shortName: 'YTL',
    exchange: 'KLS',
    longName: 'YTL Power International Berhad',
  },
  '3336': {
    yahooSymbol: '3336.KL',
    shortName: 'IJM',
    exchange: 'KLS',
    longName: 'IJM Corporation Berhad',
  },
  '5183': {
    yahooSymbol: '5183.KL',
    shortName: 'PCHEM',
    exchange: 'KLS',
    longName: 'PETRONAS Chemicals Group Berhad',
  },
  '0820EA': {
    yahooSymbol: '0820EA.KL',
    shortName: 'F4GBM-EA',
    exchange: 'KLS',
    longName: 'FTSE Bursa Malaysia KLCI ETF',
  },
  '7103': {
    yahooSymbol: '7103.KL',
    shortName: 'TOPGLOV',
    exchange: 'KLS',
    longName: 'Top Glove Corporation Berhad',
  },
};
