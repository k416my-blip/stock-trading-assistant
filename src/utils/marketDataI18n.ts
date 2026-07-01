import type { TFunction } from 'i18next';
import type { PriceRefreshMinutes } from '../types';
import type { PriceSyncFailure } from '../types/marketData';

export function priceFailureStatusLabel(
  t: TFunction<'portfolio'>,
  failure: PriceSyncFailure | undefined,
): string | null {
  switch (failure?.priceStatus) {
    case 'PLAN_UNSUPPORTED':
      return t('priceSync.planUnsupported');
    case 'INVALID_SYMBOL':
      return t('priceSync.invalidSymbol');
    case 'NETWORK_ERROR':
      return t('priceSync.networkError');
    case 'TEMPORARY_FAILURE':
      return t('priceSync.temporaryPriceFailure');
    default:
      if (failure?.timedOut || failure?.errorKind === 'network_timeout') {
        return t('priceSync.networkError');
      }
      if (failure?.errorKind === 'symbol_invalid' || failure?.errorKind === 'unsupported_exchange') {
        return t('priceSync.invalidSymbol');
      }
      if (failure?.errorKind === 'plan_unsupported') {
        return t('priceSync.planUnsupported');
      }
      return failure ? t('priceSync.temporaryPriceFailure') : null;
  }
}

export function getPriceRefreshLabelI18n(
  t: TFunction<'settings'>,
  minutes: PriceRefreshMinutes,
): string {
  return t(`priceRefresh.options.${minutes}`);
}
