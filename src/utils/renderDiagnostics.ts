import { useEffect, useRef } from 'react';
import { RENDER_DIAG_FLAG } from './devLog';

/** 実機検証用: EXPO_PUBLIC_RENDER_DIAG=1 で有効化 */
export const RENDER_DIAG_BUNDLE_ID = 'render-diag-2026-05-28';

/** デフォルト OFF — 有効時のみ Metro ログが増える */
export const RENDER_DIAG_ENABLED = RENDER_DIAG_FLAG;

const renderCounts = new Map<string, number>();
const contextUpdateCounts = new Map<string, number>();

function emit(tag: string, payload?: Record<string, unknown>): void {
  if (!RENDER_DIAG_ENABLED) return;
  if (payload && Object.keys(payload).length > 0) {
    console.log(tag, payload);
    return;
  }
  console.log(tag);
}

export function logRender(name: string, extra?: Record<string, unknown>): void {
  emit('[RENDER]', { name, ...extra });
}

export function logRenderCount(name: string): number {
  const next = (renderCounts.get(name) ?? 0) + 1;
  renderCounts.set(name, next);
  emit('[RENDER COUNT]', { name, count: next });
  return next;
}

export function logMemoHit(name: string, extra?: Record<string, unknown>): void {
  emit('[MEMO HIT]', { name, ...extra });
}

export function logMemoMiss(name: string, reason: string, extra?: Record<string, unknown>): void {
  emit('[MEMO MISS]', { name, reason, ...extra });
}

export function logContextUpdate(scope: string, changedKeys: string[]): void {
  const next = (contextUpdateCounts.get(scope) ?? 0) + 1;
  contextUpdateCounts.set(scope, next);
  emit('[CONTEXT UPDATE]', { scope, updateCount: next, changedKeys });
}

export function logStateChanged(scope: string, keys: string[]): void {
  emit('[STATE CHANGED]', { scope, keys });
}

export function logPortfolioRender(reason?: string): void {
  emit('[PORTFOLIO RENDER]', reason ? { reason } : undefined);
}

export function logCardRender(positionId: string, extra?: Record<string, unknown>): void {
  emit('[CARD RENDER]', { positionId, ...extra });
}

export function logListRender(extra?: Record<string, unknown>): void {
  emit('[LIST RENDER]', extra);
}

export function getRenderCountSnapshot(): Record<string, number> {
  return Object.fromEntries(renderCounts.entries());
}

export function resetRenderDiagnosticsForTest(): void {
  renderCounts.clear();
  contextUpdateCounts.clear();
}

/** 開発時: render 回数（opt-in） */
export function useRenderTrace(name: string, stateKeys?: string[]): void {
  const countRef = useRef(0);
  countRef.current += 1;

  useEffect(() => {
    if (!RENDER_DIAG_ENABLED) return;
    logRender(name, { pass: countRef.current });
    logRenderCount(name);
    if (stateKeys?.length) {
      logStateChanged(name, stateKeys);
    }
  });
}

export function useContextValueTrace(
  scope: string,
  value: unknown,
  keys: string[],
): void {
  const prevRef = useRef<Record<string, unknown> | null>(null);
  const keysKey = keys.join(',');

  useEffect(() => {
    if (!RENDER_DIAG_ENABLED) return;
    const next = pickKeys(value as Record<string, unknown>, keys);
    const prev = prevRef.current;
    if (!prev) {
      prevRef.current = next;
      return;
    }
    const changed: string[] = [];
    for (const k of keys) {
      if (prev[k] !== next[k]) changed.push(k);
    }
    if (changed.length > 0) {
      logContextUpdate(scope, changed);
    }
    prevRef.current = next;
  }, [scope, value, keysKey]);
}

function pickKeys(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}
