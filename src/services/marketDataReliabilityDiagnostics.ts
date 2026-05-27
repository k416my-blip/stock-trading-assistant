export type MarketDataRequestLifecycleKind =
  | 'queued'
  | 'deduped_pending'
  | 'deduped_inflight'
  | 'started'
  | 'succeeded'
  | 'failed'
  | 'stale_rejected'
  | 'cache_rejected'
  | 'retry_scheduled'
  | 'refresh_throttled'
  | 'background_paused';

export type MarketDataReliabilityEvent = {
  at: string;
  kind: MarketDataRequestLifecycleKind;
  key: string;
  detail?: string;
};

const MAX_EVENTS = 120;

const events: MarketDataReliabilityEvent[] = [];
let staleRejected = 0;
let cacheRejected = 0;
let retryScheduled = 0;
let deduped = 0;
let refreshThrottled = 0;
let backgroundPaused = 0;
let succeeded = 0;
let failed = 0;

export function recordMarketDataReliabilityEvent(
  kind: MarketDataRequestLifecycleKind,
  key: string,
  detail?: string,
): void {
  events.push({ at: new Date().toISOString(), kind, key, detail });
  if (events.length > MAX_EVENTS) events.shift();
  if (kind === 'stale_rejected') staleRejected += 1;
  if (kind === 'cache_rejected') cacheRejected += 1;
  if (kind === 'retry_scheduled') retryScheduled += 1;
  if (kind === 'deduped_pending' || kind === 'deduped_inflight') deduped += 1;
  if (kind === 'refresh_throttled') refreshThrottled += 1;
  if (kind === 'background_paused') backgroundPaused += 1;
  if (kind === 'succeeded') succeeded += 1;
  if (kind === 'failed') failed += 1;
}

export function getMarketDataReliabilityReport(): {
  requestLifecycleReport: MarketDataReliabilityEvent[];
  staleOverwriteDiagnostics: { staleRejected: number; cacheRejected: number };
  retryPressureMetrics: { retryScheduled: number; failed: number };
  hydrationConsistencyMetrics: { deduped: number; succeeded: number };
  mobileRefreshDiagnostics: { refreshThrottled: number; backgroundPaused: number };
  metrics: {
    staleProtectionScore: number;
    retryStabilityScore: number;
    requestDeduplicationScore: number;
    hydrationConsistencyScore: number;
    mobileRuntimeReliabilityScore: number;
    APIResilienceScore: number;
  };
} {
  const total = Math.max(1, succeeded + failed + staleRejected + cacheRejected);
  const staleProtectionScore = Number((1 - (staleRejected + cacheRejected) / (total + staleRejected + cacheRejected)).toFixed(3));
  const retryStabilityScore = Number((1 - Math.min(1, retryScheduled / Math.max(1, retryScheduled + succeeded))).toFixed(3));
  const requestDeduplicationScore = Number((deduped / Math.max(1, deduped + failed + succeeded)).toFixed(3));
  const hydrationConsistencyScore = Number((succeeded / Math.max(1, succeeded + failed)).toFixed(3));
  const mobileRuntimeReliabilityScore = Number((1 - Math.min(1, backgroundPaused / Math.max(1, backgroundPaused + refreshThrottled + succeeded))).toFixed(3));
  const APIResilienceScore = Number(((staleProtectionScore + retryStabilityScore + hydrationConsistencyScore + mobileRuntimeReliabilityScore) / 4).toFixed(3));
  return {
    requestLifecycleReport: [...events],
    staleOverwriteDiagnostics: { staleRejected, cacheRejected },
    retryPressureMetrics: { retryScheduled, failed },
    hydrationConsistencyMetrics: { deduped, succeeded },
    mobileRefreshDiagnostics: { refreshThrottled, backgroundPaused },
    metrics: {
      staleProtectionScore,
      retryStabilityScore,
      requestDeduplicationScore,
      hydrationConsistencyScore,
      mobileRuntimeReliabilityScore,
      APIResilienceScore,
    },
  };
}

export function resetMarketDataReliabilityDiagnosticsForTest(): void {
  events.length = 0;
  staleRejected = 0;
  cacheRejected = 0;
  retryScheduled = 0;
  deduped = 0;
  refreshThrottled = 0;
  backgroundPaused = 0;
  succeeded = 0;
  failed = 0;
}
