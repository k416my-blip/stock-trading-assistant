import { MARKET_DATA_MESSAGES } from '../constants/marketData';
import type { PriceSyncFailure, PriceSyncResult } from '../types/marketData';
import { normalizeQuotePrice } from '../utils/safeNumeric';

export function failureHasDisplayablePrice(f: PriceSyncFailure): boolean {
  return (
    f.usedSavedPrice === true ||
    normalizeQuotePrice(f.lastSavedPrice) != null ||
    f.usedCache === true
  );
}

/** 失敗配列のうち、updatedCount に含まれない表示継続分 */
function savedFailureDisplaySuccess(f: PriceSyncFailure): boolean {
  return failureHasDisplayablePrice(f) && f.usedCache !== true;
}

export function derivePriceSyncUxCounts(result: Pick<PriceSyncResult, 'updatedCount' | 'failures'>): {
  successCount: number;
  failedCount: number;
  partialFailure: boolean;
  totalFailure: boolean;
} {
  const failedCount = result.failures.filter((f) => !failureHasDisplayablePrice(f)).length;
  const savedDisplaySuccess = result.failures.filter(savedFailureDisplaySuccess).length;
  const successCount = result.updatedCount + savedDisplaySuccess;
  const partialFailure = successCount > 0 && failedCount > 0;
  const totalFailure = successCount === 0;
  return { successCount, failedCount, partialFailure, totalFailure };
}

export function emptyPriceSyncResult(
  partial?: Partial<
    Omit<PriceSyncResult, 'successCount' | 'failedCount' | 'partialFailure' | 'totalFailure'>
  >,
): PriceSyncResult {
  return attachPriceSyncUxState({
    ok: true,
    updatedCount: 0,
    failures: [],
    marketClosedHint: false,
    ...partial,
  });
}

export function attachPriceSyncUxState<T extends Omit<PriceSyncResult, 'successCount' | 'failedCount' | 'partialFailure' | 'totalFailure'>>(
  result: T,
): PriceSyncResult {
  const ux = derivePriceSyncUxCounts(result);
  const partialSuccess = ux.partialFailure;
  return {
    ...result,
    ...ux,
    partialSuccess,
    ok: !ux.totalFailure && (result.updatedCount > 0 || ux.failedCount === 0),
  };
}

/** 全銘柄失敗（表示できる価格が1件もない）のときのみモーダル */
export function shouldShowPriceRefreshErrorDialog(result: PriceSyncResult): boolean {
  const { totalFailure, failedCount } = derivePriceSyncUxCounts(result);
  if (!totalFailure || failedCount === 0) return false;
  if (result.failures.every(isPerSymbolUnsupportedFailure)) return false;
  return result.failures.some((f) => !failureHasDisplayablePrice(f));
}

/** 一部成功・一部失敗 — バナーのみ（popup 禁止） */
export function shouldShowPriceRefreshPartialBanner(result: PriceSyncResult): boolean {
  return derivePriceSyncUxCounts(result).partialFailure;
}

/** @deprecated トーストは使わずバナー優先 */
export function shouldShowPriceRefreshPartialToast(result: PriceSyncResult): boolean {
  return shouldShowPriceRefreshPartialBanner(result);
}

export function isPriceRefreshFullSuccess(result: PriceSyncResult): boolean {
  const { partialFailure, totalFailure } = derivePriceSyncUxCounts(result);
  return !partialFailure && !totalFailure && result.failures.length === 0;
}

export function formatPartialPriceRefreshBanner(): string {
  return `${MARKET_DATA_MESSAGES.partialFailureBanner}\n${MARKET_DATA_MESSAGES.partialFailureSavedHint}`;
}

export function formatPartialPriceRefreshToast(result: PriceSyncResult): string {
  const { successCount, failedCount } = derivePriceSyncUxCounts(result);
  return MARKET_DATA_MESSAGES.partialRefreshSummary(successCount, failedCount);
}

export function formatPriceRefreshCompleteToast(
  result: PriceSyncResult,
  holdingsCount: number,
): string {
  if (holdingsCount === 0) {
    return `${MARKET_DATA_MESSAGES.noHoldingsUpdateBlocked} — ${MARKET_DATA_MESSAGES.noHoldingsFetchSkipped}`;
  }
  const { successCount, failedCount, partialFailure, totalFailure } = derivePriceSyncUxCounts(result);
  if (totalFailure && failedCount > 0) {
    return result.error ?? MARKET_DATA_MESSAGES.fetchFailed;
  }
  if (partialFailure) {
    return formatPartialPriceRefreshToast(result);
  }
  if (successCount === 0) {
    return MARKET_DATA_MESSAGES.refreshCompleteZero;
  }
  return `${MARKET_DATA_MESSAGES.refreshComplete}（${successCount}件更新）`;
}

export function formatApiKeyVerifiedToast(): string {
  return MARKET_DATA_MESSAGES.apiConnectionOk;
}

export function formatPriceRefreshErrorDialogMessage(_result: PriceSyncResult): string {
  return MARKET_DATA_MESSAGES.totalFailureAlertBody;
}

export function totalFailureAlertTitle(): string {
  return MARKET_DATA_MESSAGES.totalFailureAlertTitle;
}

function isPerSymbolUnsupportedFailure(f: PriceSyncFailure): boolean {
  return f.priceStatus === 'PLAN_UNSUPPORTED' || f.priceStatus === 'INVALID_SYMBOL';
}
