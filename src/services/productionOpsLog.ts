import type { QuoteProviderId } from '../types/quoteProvider';
import { VERBOSE_DEV_LOGS } from '../utils/devLog';

type OpsPayload = Record<string, unknown>;

function emit(tag: string, payload?: OpsPayload): void {
  if (!VERBOSE_DEV_LOGS) return;
  if (payload && Object.keys(payload).length > 0) {
    console.log(tag, payload);
    return;
  }
  console.log(tag);
}

export function logAutoUpdateStart(payload: OpsPayload): void {
  emit('[AUTO UPDATE START]', payload);
}

export function logAutoUpdateSkipped(reason: string, extra?: OpsPayload): void {
  emit('[AUTO UPDATE SKIPPED]', { reason, ...extra });
}

export function logPriceFetchStart(payload: OpsPayload): void {
  emit('[PRICE FETCH START]', payload);
}

export function logPriceFetchDuplicateBlocked(reason: string, extra?: OpsPayload): void {
  emit('[PRICE FETCH DUPLICATE BLOCKED]', { reason, ...extra });
}

export function logProviderStart(provider: QuoteProviderId, payload: OpsPayload): void {
  emit('[PROVIDER START]', { provider, ...payload });
}

export function logProviderSuccess(provider: QuoteProviderId, payload: OpsPayload): void {
  emit('[PROVIDER SUCCESS]', { provider, ...payload });
}

export function logProviderFailed(provider: QuoteProviderId, payload: OpsPayload): void {
  emit('[PROVIDER FAILED]', { provider, ...payload });
}

export function logQueueActive(payload: OpsPayload): void {
  emit('[QUEUE ACTIVE]', payload);
}

export function logQueueFinished(payload: OpsPayload): void {
  emit('[QUEUE FINISHED]', payload);
}

export function logAppStateChange(payload: OpsPayload): void {
  emit('[APPSTATE]', payload);
}

export function logFocusRefresh(payload: OpsPayload): void {
  emit('[FOCUS REFRESH]', payload);
}
