/**
 * 実機 / Metro 切り分け用メモリ・負荷スナップショット（__DEV__ + EXPO_PUBLIC_APP_MEM_LOGS=1 のみ）
 */
import { APP_MEM_LOGS } from './devLog';

export type AppMemorySnapshot = {
  phase: string;
  at: string;
  startupMs?: number;
  hermes?: Record<string, unknown>;
  extra?: Record<string, unknown>;
};

export function logAppMemorySnapshot(
  phase: string,
  extra?: Record<string, unknown>,
): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  if (!APP_MEM_LOGS) return;

  const payload: AppMemorySnapshot = {
    phase,
    at: new Date().toISOString(),
    extra,
  };

  try {
    const { getStartupMs } = require('../services/appStartupPerf') as {
      getStartupMs: () => number;
    };
    payload.startupMs = getStartupMs();
  } catch {
    /* optional */
  }

  const g = globalThis as {
    HermesInternal?: { getInstrumentedStats?: () => Record<string, unknown> };
  };
  if (g.HermesInternal?.getInstrumentedStats) {
    try {
      payload.hermes = g.HermesInternal.getInstrumentedStats();
    } catch {
      /* Hermes optional */
    }
  }

  console.warn('[APP MEM]', JSON.stringify(payload));
}
