import {
  getPerformanceCostSnapshot,
  noteNetworkSuccess,
  setOfflineModeDetected,
} from './performanceCostRuntime';
import { markOfflinePending, runOfflineRecoverySync } from './productionStability/offlineRecovery';

const PROBE_URL = 'https://clients3.google.com/generate_204';
const PROBE_TIMEOUT_MS = 3_500;
const POLL_INTERVAL_MS = 25_000;

let initDone = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
const onlineRecoveryHooks = new Set<() => void | Promise<void>>();

export function registerOnlineRecoveryHook(handler: () => void | Promise<void>): () => void {
  onlineRecoveryHooks.add(handler);
  return () => onlineRecoveryHooks.delete(handler);
}

/** ネットワーク到達性（例外を投げない） */
export async function probeNetworkReachable(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(PROBE_URL, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    return res.status === 204 || res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function notifyOnlineRecoveryHooks(): Promise<void> {
  for (const hook of onlineRecoveryHooks) {
    try {
      await hook();
    } catch {
      /* non-fatal */
    }
  }
}

export async function updateNetworkReachabilityState(): Promise<boolean> {
  const online = await probeNetworkReachable();
  const wasOffline = getPerformanceCostSnapshot().offlineMode;

  if (!online) {
    setOfflineModeDetected(true);
    markOfflinePending();
    console.log('[network] offline — API リクエストを一時停止');
    return false;
  }

  setOfflineModeDetected(false);
  noteNetworkSuccess();

  if (wasOffline) {
    console.log('[network] online — オフライン復帰処理を実行');
    await runOfflineRecoverySync();
    await notifyOnlineRecoveryHooks();
  }

  return true;
}

export function initNetworkReachability(): void {
  if (initDone) return;
  initDone = true;
  void updateNetworkReachabilityState();
  pollTimer = setInterval(() => {
    void updateNetworkReachabilityState();
  }, POLL_INTERVAL_MS);
}

export function teardownNetworkReachabilityForTest(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  initDone = false;
  onlineRecoveryHooks.clear();
}
