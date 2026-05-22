import { PROACTIVE_QUEUE_COOLDOWN_MS } from '../constants/proactiveNotification';
import {
  NOTIFICATION_BURST_MAX_PER_WINDOW,
  NOTIFICATION_BURST_WINDOW_MS,
} from '../constants/aiRiskControl';
import type {
  ProactiveSuggestion,
  ProactiveSuggestionCandidate,
  ProactiveSuggestionPriority,
  ProactiveSuggestionStatus,
} from '../types/proactiveSuggestion';
import { isUnhandledProactiveStatus } from '../types/proactiveSuggestion';
import { sanitizeProactiveCopy } from './proactiveSuggestionSafety';

export type EnqueueProactiveResult = {
  suggestions: ProactiveSuggestion[];
  suppressUntil: Record<string, number>;
  added: ProactiveSuggestion[];
  suppressed: number;
};

function newId(): string {
  return `ps-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildProactiveDedupeKey(
  category: string,
  priority: ProactiveSuggestionPriority,
  symbol?: string,
): string {
  return `${symbol ?? '_'}:${category}:${priority}`;
}

export function hasUnhandledHigh(suggestions: ProactiveSuggestion[]): boolean {
  return suggestions.some(
    (s) =>
      (s.priority === 'critical' || s.priority === 'high') && isUnhandledProactiveStatus(s.status),
  );
}

export function shouldSuppressCandidate(
  candidate: ProactiveSuggestionCandidate,
  nowMs: number,
  suppressUntil: Record<string, number>,
  existing: ProactiveSuggestion[],
): boolean {
  const until = suppressUntil[candidate.dedupeKey];
  if (until != null && until > nowMs) return true;

  const duplicate = existing.find(
    (s) =>
      s.dedupeKey === candidate.dedupeKey &&
      isUnhandledProactiveStatus(s.status) &&
      nowMs - Date.parse(s.updatedAt) < PROACTIVE_QUEUE_COOLDOWN_MS[candidate.priority],
  );
  if (duplicate) return true;

  if (
    candidate.priority === 'low' &&
    existing.some(
      (s) =>
        (s.priority === 'critical' || s.priority === 'high') &&
        isUnhandledProactiveStatus(s.status),
    )
  ) {
    return true;
  }

  return false;
}

export function candidateToSuggestion(
  candidate: ProactiveSuggestionCandidate,
  nowIso: string,
): ProactiveSuggestion {
  return {
    id: newId(),
    priority: candidate.priority,
    category: candidate.category,
    dedupeKey: candidate.dedupeKey,
    titleJa: sanitizeProactiveCopy(candidate.titleJa),
    bodyJa: sanitizeProactiveCopy(candidate.bodyJa),
    actionHintJa: sanitizeProactiveCopy(candidate.actionHintJa),
    reasonsJa: candidate.reasonsJa?.map((r) => sanitizeProactiveCopy(r)),
    notificationWhyJa: candidate.notificationWhyJa
      ? sanitizeProactiveCopy(candidate.notificationWhyJa)
      : undefined,
    actionCategory: candidate.actionCategory,
    signalKind: candidate.signalKind,
    symbol: candidate.symbol,
    market: candidate.market,
    createdAt: nowIso,
    updatedAt: nowIso,
    status: 'pending',
    source: candidate.source,
  };
}

function countRecentAdds(existing: ProactiveSuggestion[], nowMs: number): number {
  return existing.filter(
    (s) =>
      isUnhandledProactiveStatus(s.status) &&
      nowMs - Date.parse(s.createdAt) < NOTIFICATION_BURST_WINDOW_MS,
  ).length;
}

export function enqueueProactiveCandidates(
  candidates: ProactiveSuggestionCandidate[],
  existing: ProactiveSuggestion[],
  suppressUntil: Record<string, number>,
  nowMs = Date.now(),
): EnqueueProactiveResult {
  const recentCount = countRecentAdds(existing, nowMs);
  const burstLimitReached = recentCount >= NOTIFICATION_BURST_MAX_PER_WINDOW;
  const nowIso = new Date(nowMs).toISOString();
  let suggestions = [...existing];
  const nextSuppress = { ...suppressUntil };
  const added: ProactiveSuggestion[] = [];
  let suppressed = 0;

  for (const candidate of candidates) {
    if (
      burstLimitReached &&
      (candidate.priority === 'low' || candidate.priority === 'medium')
    ) {
      suppressed += 1;
      continue;
    }
    if (shouldSuppressCandidate(candidate, nowMs, nextSuppress, suggestions)) {
      suppressed += 1;
      continue;
    }
    const item = candidateToSuggestion(candidate, nowIso);
    suggestions = [item, ...suggestions.filter((s) => s.dedupeKey !== item.dedupeKey)];
    nextSuppress[item.dedupeKey] = nowMs + PROACTIVE_QUEUE_COOLDOWN_MS[item.priority];
    added.push(item);
  }

  return { suggestions, suppressUntil: nextSuppress, added, suppressed };
}

export function updateProactiveStatus(
  suggestions: ProactiveSuggestion[],
  id: string,
  status: ProactiveSuggestionStatus,
): ProactiveSuggestion[] {
  const nowIso = new Date().toISOString();
  return suggestions.map((s) =>
    s.id === id
      ? { ...s, status, updatedAt: nowIso, statusChangedAt: nowIso }
      : s,
  );
}

export function sortProactiveForDisplay(suggestions: ProactiveSuggestion[]): ProactiveSuggestion[] {
  const rank: Record<ProactiveSuggestionPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const statusRank: Record<ProactiveSuggestionStatus, number> = {
    pending: 0,
    seen_later: 1,
    opened_detail: 2,
    acknowledged: 3,
  };
  return [...suggestions].sort((a, b) => {
    const sa = statusRank[a.status];
    const sb = statusRank[b.status];
    if (sa !== sb) return sa - sb;
    const pa = rank[a.priority];
    const pb = rank[b.priority];
    if (pa !== pb) return pa - pb;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
}
