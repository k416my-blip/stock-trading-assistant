import {
  CIRCUIT_COOLDOWN_MS,
  CIRCUIT_FAILURE_THRESHOLD,
  CIRCUIT_HALF_OPEN_SUCCESS_RESET,
} from '../../constants/productionStability';
import type { ApiCircuitStatus, CircuitState } from '../../types/productionStability';

type Row = {
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  state: CircuitState;
  openUntilMs: number;
  lastFailureAt: string | null;
};

const rows = new Map<string, Row>();

function row(provider: string): Row {
  let r = rows.get(provider);
  if (!r) {
    r = {
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      state: 'closed',
      openUntilMs: 0,
      lastFailureAt: null,
    };
    rows.set(provider, r);
  }
  return r;
}

export function isCircuitOpen(provider: string, nowMs = Date.now()): boolean {
  const r = row(provider);
  if (r.state === 'open' && nowMs < r.openUntilMs) return true;
  if (r.state === 'open' && nowMs >= r.openUntilMs) {
    r.state = 'half_open';
    r.consecutiveSuccesses = 0;
  }
  return false;
}

export function recordApiSuccess(provider: string): void {
  const r = row(provider);
  r.consecutiveFailures = 0;
  if (r.state === 'half_open') {
    r.consecutiveSuccesses += 1;
    if (r.consecutiveSuccesses >= CIRCUIT_HALF_OPEN_SUCCESS_RESET) {
      r.state = 'closed';
      r.openUntilMs = 0;
    }
  } else {
    r.state = 'closed';
    r.openUntilMs = 0;
  }
}

export function recordApiFailure(provider: string, nowMs = Date.now()): boolean {
  const r = row(provider);
  r.consecutiveFailures += 1;
  r.consecutiveSuccesses = 0;
  r.lastFailureAt = new Date(nowMs).toISOString();
  if (r.state === 'half_open' || r.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
    r.state = 'open';
    r.openUntilMs = nowMs + CIRCUIT_COOLDOWN_MS;
    return true;
  }
  return false;
}

export function getAllCircuitStatuses(): ApiCircuitStatus[] {
  const now = Date.now();
  return [...rows.entries()].map(([provider, r]) => ({
    provider,
    state: isCircuitOpen(provider, now) && r.state !== 'half_open' ? 'open' : r.state,
    consecutiveFailures: r.consecutiveFailures,
    openUntil: r.openUntilMs > now ? new Date(r.openUntilMs).toISOString() : null,
    lastFailureAt: r.lastFailureAt,
  }));
}

export function resetCircuitBreakerForTest(): void {
  rows.clear();
}
