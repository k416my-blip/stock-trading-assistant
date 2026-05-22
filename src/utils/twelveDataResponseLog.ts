import { logTwelveDataResponseFull } from './quoteFetchDebugLog';

/** Twelve Data API レスポンスを console に全文出力 */
export function logTwelveDataApiResponse(params: {
  ticker: string;
  requestUrl: string;
  status: number;
  body: unknown;
  elapsedMs: number;
  errorMessage?: string;
}): void {
  logTwelveDataResponseFull({
    ticker: params.ticker,
    requestUrl: params.requestUrl,
    httpStatus: params.status,
    body: params.body,
    elapsedMs: params.elapsedMs,
    errorMessage: params.errorMessage,
  });
}
