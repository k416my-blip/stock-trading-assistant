/**
 * ジャーナル・予測・通知インテリジェンスの記録（ローカルのみ）
 */
import {
  NOTIFICATION_INTEL_WINDOW_MS,
  NOTIFICATION_REPEAT_SUPPRESS_COUNT,
  PREDICTION_MEDIUM_HORIZON_DAYS,
  PREDICTION_SHORT_HORIZON_DAYS,
} from '../constants/portfolioIntelligence';
import type {
  AiJournalEntry,
  AiJournalKind,
  PortfolioIntelligenceState,
  PredictionKind,
  TrackedPrediction,
} from '../types/portfolioIntelligence';
import type { Market } from '../types';
import {
  loadPortfolioIntelligenceState,
  savePortfolioIntelligenceState,
} from './portfolioIntelligenceStorage';

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function appendAiJournalEntry(input: {
  kind: AiJournalKind;
  titleJa: string;
  bodyJa: string;
  whyJa?: string | null;
  symbol?: string | null;
  market?: Market | null;
}): Promise<AiJournalEntry> {
  const state = await loadPortfolioIntelligenceState();
  const entry: AiJournalEntry = {
    id: newId('journal'),
    at: new Date().toISOString(),
    kind: input.kind,
    symbol: input.symbol ?? null,
    market: input.market ?? null,
    titleJa: input.titleJa,
    bodyJa: input.bodyJa,
    whyJa: input.whyJa ?? null,
  };
  state.journal.push(entry);
  await savePortfolioIntelligenceState(state);
  return entry;
}

export async function recordTrackedPrediction(input: {
  kind: PredictionKind;
  symbol: string;
  market: Market;
  baselinePrice?: number | null;
  noteJa: string;
  horizonDays?: number;
}): Promise<TrackedPrediction> {
  const state = await loadPortfolioIntelligenceState();
  const horizon =
    input.horizonDays ??
    (input.kind === 'bullish' ? PREDICTION_MEDIUM_HORIZON_DAYS : PREDICTION_SHORT_HORIZON_DAYS);
  const pred: TrackedPrediction = {
    id: newId('pred'),
    createdAt: new Date().toISOString(),
    kind: input.kind,
    symbol: input.symbol,
    market: input.market,
    horizonDays: horizon,
    baselinePrice: input.baselinePrice ?? null,
    noteJa: input.noteJa,
    outcome: 'pending',
    resolvedAt: null,
    actualReturnPct: null,
  };
  state.predictions.push(pred);
  await savePortfolioIntelligenceState(state);
  return pred;
}

export async function recordNotificationShown(dedupeKey: string): Promise<void> {
  const state = await loadPortfolioIntelligenceState();
  const now = new Date().toISOString();
  const existing = state.notificationIntel.find((n) => n.dedupeKey === dedupeKey);
  if (existing) {
    existing.showCount += 1;
    existing.lastShownAt = now;
    existing.importanceScore = Math.min(100, existing.importanceScore + 5);
  } else {
    state.notificationIntel.push({
      dedupeKey,
      showCount: 1,
      lastShownAt: now,
      importanceScore: 50,
    });
  }
  const cutoff = Date.now() - NOTIFICATION_INTEL_WINDOW_MS;
  state.notificationIntel = state.notificationIntel.filter(
    (n) => Date.parse(n.lastShownAt) >= cutoff,
  );
  await savePortfolioIntelligenceState(state);
}

export function shouldSuppressRepeatNotification(
  state: PortfolioIntelligenceState,
  dedupeKey: string,
  nowMs = Date.now(),
): boolean {
  const entry = state.notificationIntel.find((n) => n.dedupeKey === dedupeKey);
  if (!entry) return false;
  if (entry.showCount < NOTIFICATION_REPEAT_SUPPRESS_COUNT) return false;
  return nowMs - Date.parse(entry.lastShownAt) < NOTIFICATION_INTEL_WINDOW_MS;
}

export async function resolvePendingPredictions(
  priceBySymbol: Record<string, number | null>,
): Promise<number> {
  const state = await loadPortfolioIntelligenceState();
  let resolved = 0;
  const now = Date.now();
  for (const p of state.predictions) {
    if (p.outcome !== 'pending') continue;
    const ageDays = (now - Date.parse(p.createdAt)) / (24 * 60 * 60 * 1000);
    if (ageDays < p.horizonDays) continue;
    const price = priceBySymbol[p.symbol.toUpperCase()];
    if (price == null || p.baselinePrice == null || p.baselinePrice <= 0) {
      p.outcome = 'inconclusive';
      p.resolvedAt = new Date().toISOString();
      resolved += 1;
      continue;
    }
    const ret = ((price - p.baselinePrice) / p.baselinePrice) * 100;
    p.actualReturnPct = ret;
    p.resolvedAt = new Date().toISOString();
    if (p.kind === 'bullish') {
      p.outcome = ret >= 1 ? 'hit' : ret <= -3 ? 'miss' : 'inconclusive';
    } else if (p.kind === 'bearish_watch' || p.kind === 'panic_warning') {
      p.outcome = ret <= -2 ? 'hit' : ret >= 3 ? 'miss' : 'inconclusive';
    } else {
      p.outcome = 'inconclusive';
    }
    resolved += 1;
  }
  if (resolved > 0) await savePortfolioIntelligenceState(state);
  return resolved;
}
