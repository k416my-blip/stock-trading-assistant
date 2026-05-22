/**
 * AI自発提案の履歴・成功率（会話コンテキスト用・学習データではない）
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProactiveSuggestion, ProactiveSuggestionStatus } from '../types/proactiveSuggestion';

const HISTORY_KEY = '@sta/proactive_advisor_history_v1';
const MAX_EVENTS = 120;

export type ProactiveAdvisorEventKind = 'delivered' | 'acknowledged' | 'opened_detail' | 'seen_later' | 'dismissed';

export type ProactiveAdvisorEvent = {
  suggestionId: string;
  dedupeKey: string;
  category: string;
  symbol?: string;
  priority: string;
  kind: ProactiveAdvisorEventKind;
  at: string;
};

export type ProactiveAdvisorStats = {
  delivered: number;
  acknowledged: number;
  openedDetail: number;
  seenLater: number;
  acknowledgeRatePct: number | null;
};

export type ProactiveAdvisorHistoryState = {
  version: 1;
  events: ProactiveAdvisorEvent[];
};

const EMPTY: ProactiveAdvisorHistoryState = { version: 1, events: [] };

export async function loadProactiveAdvisorHistory(): Promise<ProactiveAdvisorHistoryState> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<ProactiveAdvisorHistoryState>;
    const events = Array.isArray(parsed.events) ? (parsed.events as ProactiveAdvisorEvent[]) : [];
    return { version: 1, events: events.slice(-MAX_EVENTS) };
  } catch {
    return { ...EMPTY };
  }
}

async function saveProactiveAdvisorHistory(state: ProactiveAdvisorHistoryState): Promise<void> {
  const events = state.events.slice(-MAX_EVENTS);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, events }));
}

export function computeProactiveAdvisorStats(events: ProactiveAdvisorEvent[]): ProactiveAdvisorStats {
  const delivered = events.filter((e) => e.kind === 'delivered').length;
  const acknowledged = events.filter((e) => e.kind === 'acknowledged').length;
  const openedDetail = events.filter((e) => e.kind === 'opened_detail').length;
  const seenLater = events.filter((e) => e.kind === 'seen_later').length;
  const positive = acknowledged + openedDetail;
  const acknowledgeRatePct =
    delivered > 0 ? Math.round((positive / delivered) * 100) : null;
  return { delivered, acknowledged, openedDetail, seenLater, acknowledgeRatePct };
}

export function formatProactiveAdvisorBriefJa(
  events: ProactiveAdvisorEvent[],
  recentSuggestions: ProactiveSuggestion[],
): string | null {
  const stats = computeProactiveAdvisorStats(events);
  if (stats.delivered === 0 && recentSuggestions.length === 0) return null;

  const recentTitles = recentSuggestions
    .filter((s) => s.status === 'pending' || s.status === 'seen_later')
    .slice(0, 3)
    .map((s) => s.titleJa);

  const parts: string[] = [];
  if (stats.delivered > 0) {
    parts.push(
      `直近の自発提案: 配信${stats.delivered}件、確認率${stats.acknowledgeRatePct ?? 0}%（参考）`,
    );
  }
  if (recentTitles.length > 0) {
    parts.push(`未読提案: ${recentTitles.join(' / ')}`);
  }
  const lastAck = [...events].reverse().find((e) => e.kind === 'acknowledged');
  if (lastAck?.symbol) {
    parts.push(`直近確認銘柄: ${lastAck.symbol}`);
  }
  return parts.join('。');
}

export async function recordProactiveAdvisorEvent(
  suggestion: ProactiveSuggestion,
  kind: ProactiveAdvisorEventKind,
): Promise<void> {
  const state = await loadProactiveAdvisorHistory();
  const event: ProactiveAdvisorEvent = {
    suggestionId: suggestion.id,
    dedupeKey: suggestion.dedupeKey,
    category: suggestion.category,
    symbol: suggestion.symbol,
    priority: suggestion.priority,
    kind,
    at: new Date().toISOString(),
  };
  await saveProactiveAdvisorHistory({
    version: 1,
    events: [...state.events, event],
  });
}

export function statusToAdvisorEventKind(
  status: ProactiveSuggestionStatus,
): ProactiveAdvisorEventKind | null {
  switch (status) {
    case 'acknowledged':
      return 'acknowledged';
    case 'opened_detail':
      return 'opened_detail';
    case 'seen_later':
      return 'seen_later';
    default:
      return null;
  }
}

/** AIコンテキスト用に sessionMemory に載せる短文 */
export async function buildProactiveAdvisorSessionSnippet(
  suggestions: ProactiveSuggestion[],
): Promise<string | null> {
  const hist = await loadProactiveAdvisorHistory();
  return formatProactiveAdvisorBriefJa(hist.events, suggestions);
}
