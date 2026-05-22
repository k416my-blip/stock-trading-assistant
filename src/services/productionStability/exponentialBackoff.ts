import { RETRY_BASE_MS, RETRY_MAX_ATTEMPTS, RETRY_MAX_MS } from '../../constants/productionStability';

export type RetryOptions = {
  maxAttempts?: number;
  baseMs?: number;
  maxMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (attempt: number, delayMs: number) => void;
};

function defaultShouldRetry(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.toLowerCase().includes('abort')) return false;
  if (msg.includes('401') || msg.includes('invalid_api_key')) return false;
  return true;
}

export function computeBackoffDelayMs(attempt: number, baseMs: number, maxMs: number): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  const jitter = Math.floor(Math.random() * baseMs * 0.4);
  return exp + jitter;
}

export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? RETRY_MAX_ATTEMPTS;
  const baseMs = options.baseMs ?? RETRY_BASE_MS;
  const maxMs = options.maxMs ?? RETRY_MAX_MS;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt >= maxAttempts - 1 || !shouldRetry(e, attempt)) {
        throw e;
      }
      const delay = computeBackoffDelayMs(attempt, baseMs, maxMs);
      options.onRetry?.(attempt + 1, delay);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
