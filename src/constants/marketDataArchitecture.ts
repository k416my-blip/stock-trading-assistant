/**
 * 市場データアーキテクチャ境界
 *
 * 1. 外部 API 呼び出しは marketDataService のみ
 * 2. 分析・インテリジェンス層 (*Engine, *OrchestratorService) は
 *    normalizedMarketData のみを読み取る
 * 3. UI は refresh/test 等の明示操作でのみ marketDataService を呼べる
 */

/** marketDataService の直接 import が許可されるモジュール（運用層） */
export const MARKET_DATA_API_ALLOWED_IMPORTERS = [
  'src/services/portfolioPriceUpdate.ts',
  'src/services/marketDataService.ts',
  'src/services/marketDataProbe.ts',
  'src/services/apiConnectionTestService.ts',
  'src/services/fx.ts',
  'src/context/AppContext.tsx',
  'src/screens/RealQuantValidationScreen.tsx',
  'src/verify/marketDataQueue.verify.ts',
  'src/services/marketDataRequestQueue.ts',
] as const;

/** 分析層が使う読み取り専用 API */
export const MARKET_DATA_READ_API = 'src/services/normalizedMarketData.ts';
