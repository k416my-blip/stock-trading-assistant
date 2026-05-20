/**
 * @deprecated 分析層は normalizedMarketData を使用してください。
 * API 更新は marketDataService.refreshOHLCVCache のみ。
 */
import type { OHLCVDataset, QuantDataSource } from '../types/quantValidation';
import { loadNormalizedOHLCVDataset } from './normalizedMarketData';
import { clearOHLCVCache } from './ohlcvCacheService';

/** @deprecated Use loadNormalizedOHLCVDataset — does not call external APIs */
export async function ingestOHLCVDataset(
  _apiKey: string,
  options?: { maxSymbols?: number; forceRefresh?: boolean },
): Promise<{ dataset: OHLCVDataset; dataSource: QuantDataSource }> {
  if (options?.forceRefresh) {
    throw new Error(
      'ingestOHLCVDataset(forceRefresh) は廃止されました。marketDataService.refreshOHLCVCache を使用してください。',
    );
  }
  return loadNormalizedOHLCVDataset({ maxSymbols: options?.maxSymbols });
}

export { clearOHLCVCache };
