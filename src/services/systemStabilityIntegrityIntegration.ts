import type { SystemStabilityIntegrityBundle } from '../types/systemStabilityIntegrity';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import { registerCrashSafeFlush } from './productionStability/productionStabilityRuntime';
import { registerOfflineRecoveryHandler } from './productionStability/offlineRecovery';
import {
  loadProactiveSuggestionsState,
  saveProactiveSuggestionsState,
} from './proactiveSuggestionStorage';
import { saveSystemStabilityCheckpoint } from './systemStabilityIntegrityStorage';

let proactiveRefreshCallback: (() => void | Promise<void>) | null = null;
let refreshInFlight = false;
let duplicateRefreshBlockedCount = 0;

export function registerProactiveRefreshForIntegrity(cb: () => void | Promise<void>): () => void {
  proactiveRefreshCallback = cb;
  return () => {
    proactiveRefreshCallback = null;
  };
}

/** 単一フライト — 重複 refreshProactive を防止 */
export async function runProactiveRefreshSingleFlight(
  runner: () => Promise<void>,
): Promise<{ ran: boolean; duplicateBlocked: boolean }> {
  if (refreshInFlight) {
    duplicateRefreshBlockedCount += 1;
    return { ran: false, duplicateBlocked: true };
  }
  refreshInFlight = true;
  try {
    await runner();
    return { ran: true, duplicateBlocked: false };
  } finally {
    refreshInFlight = false;
  }
}

export function isProactiveRefreshInFlight(): boolean {
  return refreshInFlight;
}

export function getDuplicateRefreshBlockedCount(): number {
  return duplicateRefreshBlockedCount;
}

export function attachSystemStabilityToContext(
  payload: AiStrategyContextPayload,
  bundle: SystemStabilityIntegrityBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    systemStabilityIntegrity: bundle,
  };
}

let integrityInitDone = false;

export function initSystemStabilityIntegrity(): void {
  if (integrityInitDone) return;
  integrityInitDone = true;

  registerCrashSafeFlush(async () => {
    try {
      const stored = await loadProactiveSuggestionsState();
      await saveProactiveSuggestionsState(stored);
      await saveSystemStabilityCheckpoint({ sessionNoteJa: 'crash-safe flush' });
    } catch {
      /* non-fatal */
    }
  });

  registerOfflineRecoveryHandler(async () => {
    if (proactiveRefreshCallback) {
      await proactiveRefreshCallback();
    }
  });
}

export function resetSystemStabilityIntegrityForTest(): void {
  integrityInitDone = false;
  refreshInFlight = false;
  duplicateRefreshBlockedCount = 0;
  proactiveRefreshCallback = null;
}
