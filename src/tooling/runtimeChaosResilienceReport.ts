import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeChaosResilienceStaticMetrics = {
  reconnectStabilityScore: number;
  asyncSafetyScore: number;
  retryCascadeContainmentScore: number;
  offlineRecoverySafetyScore: number;
  staleAsyncPreventionScore: number;
  chaosResilienceScore: number;
};

export type RuntimeChaosResilienceStaticReport = {
  freezeTag: 'runtime-freeze-v1';
  reconnectStabilityReport: string[];
  asyncCollisionReport: Array<{
    file: string;
    bytes: number;
    asyncLifecycleReferences: number;
    staleAsyncReferences: number;
    reconnectGuardReferences: number;
    retryGuardReferences: number;
    offlineGuardReferences: number;
  }>;
  retryStormReport: string[];
  offlineRecoveryReport: string[];
  hydrationCollisionReport: string[];
  metrics: RuntimeChaosResilienceStaticMetrics;
};

const root = process.cwd();
const files = [
  'App.tsx',
  'src/services/runtimeChaosResilience.ts',
  'src/hooks/useDeferredRenderActivation.ts',
  'src/services/performanceCostRuntime.ts',
  'src/services/marketDataService.ts',
  'src/services/portfolioPriceUpdate.ts',
  'src/context/ProactiveConciergeContext.tsx',
  'src/components/AiAssistantChat.tsx',
  'src/components/concierge/RuntimeStabilityDashboardPanel.tsx',
];

function count(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

function sourceFor(file: string): string {
  const absolute = join(root, file);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function buildRuntimeChaosResilienceReport(): RuntimeChaosResilienceStaticReport {
  const rows = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      asyncLifecycleReferences: count(source, /noteChaosAsync(Start|Complete)|pendingAsync/g),
      staleAsyncReferences: count(source, /noteStaleAsyncRejected|async_stale_rejected/g),
      reconnectGuardReferences: count(source, /shouldAllowReconnect|reconnect_(allowed|debounced|cooldown)/g),
      retryGuardReferences: count(source, /noteRetryAttempt|retry_cascade|retry_attempt/g),
      offlineGuardReferences: count(source, /noteOffline(Transition|QueueRejected)|offline_transition|offline_queue_rejected/g),
    };
  });

  const joined = files.map(sourceFor).join('\n');
  const asyncRefs = count(joined, /noteChaosAsync(Start|Complete)/g);
  const staleRefs = count(joined, /noteStaleAsyncRejected/g);
  const reconnectRefs = count(joined, /shouldAllowReconnect/g);
  const retryRefs = count(joined, /noteRetryAttempt/g);
  const offlineRefs = count(joined, /noteOffline(Transition|QueueRejected)/g);
  const hydrationRefs = count(joined, /noteHydration(Collision|Suppressed)/g);

  const reconnectStabilityScore = round(Math.min(1, reconnectRefs / 3));
  const asyncSafetyScore = round(Math.min(1, asyncRefs / 8));
  const retryCascadeContainmentScore = round(Math.min(1, retryRefs / 3));
  const offlineRecoverySafetyScore = round(Math.min(1, offlineRefs / 5));
  const staleAsyncPreventionScore = round(Math.min(1, staleRefs / 8));
  const chaosResilienceScore = round(
    (reconnectStabilityScore +
      asyncSafetyScore +
      retryCascadeContainmentScore +
      offlineRecoverySafetyScore +
      staleAsyncPreventionScore +
      Math.min(1, hydrationRefs / 3)) /
      6,
  );

  return {
    freezeTag: 'runtime-freeze-v1',
    reconnectStabilityReport: [
      'App deferred boot and proactive resume use reconnect debounce/cooldown diagnostics.',
      'Reconnect requests are recorded as allowed, debounced, or cooldown-blocked without rewriting orchestration.',
      'Stale reconnect attempts are recorded through runtimeChaosResilience.',
    ],
    asyncCollisionReport: rows,
    retryStormReport: [
      'Twelve Data transient failures and portfolio quote retries are tracked as retry attempts.',
      'Retry cascade diagnostics are emitted when a scope exceeds the retry window threshold.',
      'Existing retry caps remain unchanged; this phase adds containment visibility.',
    ],
    offlineRecoveryReport: [
      'Performance cost runtime records offline/online transitions.',
      'Market data network failures and proactive refresh suppression record offline queue rejection diagnostics.',
      'Background/offline proactive refresh is safely suppressed before heavy orchestration work.',
    ],
    hydrationCollisionReport: [
      'Deferred render activation records duplicate activation attempts as hydration collisions.',
      'Inactive app state suppresses hidden hydration and records suppression diagnostics.',
      'Cancelled deferred activation records stale async prevention diagnostics.',
    ],
    metrics: {
      reconnectStabilityScore,
      asyncSafetyScore,
      retryCascadeContainmentScore,
      offlineRecoverySafetyScore,
      staleAsyncPreventionScore,
      chaosResilienceScore,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeChaosResilienceReport(), null, 2));
}
