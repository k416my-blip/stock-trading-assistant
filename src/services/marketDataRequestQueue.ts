/**
 * @deprecated キューは marketDataService に内包されています。
 * 後方互換のため re-export のみ。
 */
export {
  enqueueMarketDataRequest,
  marketDataRequestQueue,
  MarketDataStaleRequestError,
} from './marketDataService';
