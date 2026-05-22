import { RELEVANCE_PRIORITY_ORDER_JA } from '../constants/aiConciergeRelevance';
import type { ConciergeSessionMemory } from '../types/aiConciergeSession';
import type {
  AiNormalizedHolding,
  AiNormalizedRecommendation,
  AiNormalizedWatchItem,
} from '../types/aiStrategy';

const MAX_SUPPRESSION_ITEMS = 12;

export type ConciergeResponseScope = {
  heldSymbolsOnly: boolean;
  sellScopeOnly: boolean;
  suppressNonHeldTickers: boolean;
  suppressQueueUnlessAsked: boolean;
  suppressGenericWarnings: boolean;
};

export type ConciergeRelevanceControl = {
  compactMode: boolean;
  priorityOrderJa: readonly string[];
  scopeJa: string;
  suppressedSummaryJa: string;
  heldTickers: string[];
  filteredOutTickers: string[];
  instructionJa: string;
};

export function userRequestsExpansion(message: string): boolean {
  const t = message.trim();
  const standaloneWhy =
    /^(なぜ|理由は|理由を)[？?]?$/.test(t) ||
    /(なぜ|理由は|理由を).*(詳しく|教えて|説明|根拠)/i.test(t);
  return (
    standaloneWhy ||
    /詳しく|分析して|比較して|深掘り|詳細分析|もう少し詳しく|根拠を/i.test(t)
  );
}

export function detectResponseScope(userMessage: string): ConciergeResponseScope {
  const t = userMessage.trim();
  const heldOnly =
    (/売却検討は保有株だけ|保有(株|銘柄)?(だけ|のみ)|手持ち(だけ|のみ)|ポートフォリオ(内|の)?(だけ|のみ)/i.test(
      t,
    ) ||
      /保有している.*だけ/i.test(t)) &&
    /売却|売り|手放し|exit|reduce/i.test(t);
  const sellScope = /売却|売り|手放し/i.test(t);
  const userAskedQueue = /キュー|シグナル|待ち行列|提案一覧/.test(t);
  const suppressQueueUnlessAsked =
    heldOnly ||
    (!userAskedQueue && /関係ない|無関係|キューはいい|シグナルはいい|繰り返さない/.test(t));
  return {
    heldSymbolsOnly: heldOnly,
    sellScopeOnly: sellScope,
    suppressNonHeldTickers: heldOnly || /非保有|未保有|持ってない/.test(t),
    suppressQueueUnlessAsked,
    suppressGenericWarnings:
      !/API|接続|劣化|診断|古いデータ|stale|システム|更新|フォールバック/i.test(t),
  };
}

function pushUniqueTail(list: string[], value: string, max: number): string[] {
  const trimmed = value.trim();
  if (!trimmed) return list;
  const next = list.filter((item) => item !== trimmed);
  next.push(trimmed);
  return next.slice(-max);
}

export function extractSuppressionFromUserMessage(message: string): {
  ignoredTopics: string[];
  rejectedThemes: string[];
  dismissedSignals: string[];
} {
  const t = message.trim();
  const ignoredTopics: string[] = [];
  const rejectedThemes: string[] = [];
  const dismissedSignals: string[] = [];

  if (/関係ない|無関係|もういい|結構です|不要です|繰り返さない|言わないで|出さないで/i.test(t)) {
    ignoredTopics.push(t.slice(0, 80));
  }

  const heldSell = t.match(/売却.*保有.*(だけ|のみ)|保有.*(だけ|のみ).*売却/i);
  if (heldSell) {
    rejectedThemes.push('非保有銘柄の売却候補・キュー言及禁止');
  }

  if (/もう.*シグナル|その警告|前の警告|古いデータ.*(いい|不要)/i.test(t)) {
    dismissedSignals.push(t.slice(0, 80));
  }

  return { ignoredTopics, rejectedThemes, dismissedSignals };
}

export function mergeRelevanceMemory(
  prev: ConciergeSessionMemory,
  userMessage: string,
): ConciergeSessionMemory {
  const extracted = extractSuppressionFromUserMessage(userMessage);
  const scope = detectResponseScope(userMessage);

  let ignoredTopics = prev.ignoredTopics;
  let rejectedThemes = prev.userRejectedThemes;
  let dismissedSignals = prev.dismissedSignals;

  for (const topic of extracted.ignoredTopics) {
    ignoredTopics = pushUniqueTail(ignoredTopics, topic, MAX_SUPPRESSION_ITEMS);
  }
  for (const theme of extracted.rejectedThemes) {
    rejectedThemes = pushUniqueTail(rejectedThemes, theme, MAX_SUPPRESSION_ITEMS);
  }
  for (const sig of extracted.dismissedSignals) {
    dismissedSignals = pushUniqueTail(dismissedSignals, sig, MAX_SUPPRESSION_ITEMS);
  }

  if (scope.heldSymbolsOnly) {
    rejectedThemes = pushUniqueTail(
      rejectedThemes,
      '売却検討は保有銘柄のみ（非保有・旧候補・無関係キュー禁止）',
      MAX_SUPPRESSION_ITEMS,
    );
  }

  return {
    ...prev,
    ignoredTopics,
    dismissedSignals,
    userRejectedThemes: rejectedThemes,
  };
}

function isSuppressedTopic(text: string, memory: ConciergeSessionMemory): boolean {
  const probe = text.toLowerCase();
  const lists = [
    ...memory.ignoredTopics,
    ...memory.userRejectedThemes,
    ...memory.dismissedSignals,
  ];
  return lists.some((entry) => {
    const key = entry.slice(0, 12).toLowerCase();
    return key.length >= 4 && probe.includes(key);
  });
}

export function scoreTickerRelevance(
  ticker: string,
  input: {
    userMessage: string;
    heldTickers: Set<string>;
    discussedSymbols: string[];
    scope: ConciergeResponseScope;
  },
): number {
  const sym = ticker.toUpperCase();
  const msg = input.userMessage.toUpperCase();
  let score = 0;
  if (msg.includes(sym)) score += 50;
  if (input.heldTickers.has(sym)) score += 40;
  if (input.discussedSymbols.some((s) => s.toUpperCase() === sym)) score += 15;
  if (input.scope.suppressNonHeldTickers && !input.heldTickers.has(sym)) score -= 100;
  return score;
}

export function applyRelevanceContextFilter(input: {
  holdings: AiNormalizedHolding[];
  watchlist: AiNormalizedWatchItem[];
  recentRecommendations: AiNormalizedRecommendation[];
  sessionMemory: ConciergeSessionMemory;
  userMessage: string;
  conversationMode: 'conversation' | 'elaboration' | 'analysis' | 'warning';
}): {
  holdings: AiNormalizedHolding[];
  watchlist: AiNormalizedWatchItem[];
  recentRecommendations: AiNormalizedRecommendation[];
  control: ConciergeRelevanceControl;
} {
  const scope = detectResponseScope(input.userMessage);
  const heldTickers = new Set(input.holdings.map((h) => h.symbol.toUpperCase()));
  const discussed = input.sessionMemory.discussedSymbols;

  const compactMode =
    input.conversationMode !== 'analysis' && !userRequestsExpansion(input.userMessage);

  const filterTicker = (ticker: string): boolean => {
    if (isSuppressedTopic(ticker, input.sessionMemory)) return false;
    const score = scoreTickerRelevance(ticker, {
      userMessage: input.userMessage,
      heldTickers,
      discussedSymbols: discussed,
      scope,
    });
    return score >= 0;
  };

  const filteredOut: string[] = [];

  let recentRecommendations = input.recentRecommendations;
  if (scope.suppressNonHeldTickers || scope.heldSymbolsOnly) {
    recentRecommendations = input.recentRecommendations.filter((r) => {
      const ok = heldTickers.has(r.ticker.toUpperCase()) && filterTicker(r.ticker);
      if (!ok) filteredOut.push(r.ticker);
      return ok;
    });
  } else {
    recentRecommendations = input.recentRecommendations.filter((r) => {
      const ok = filterTicker(r.ticker);
      if (!ok) filteredOut.push(r.ticker);
      return ok;
    });
  }

  let watchlist = input.watchlist;
  if (scope.suppressNonHeldTickers || scope.heldSymbolsOnly) {
    watchlist = input.watchlist.filter((w) => {
      const ok = heldTickers.has(w.symbol.toUpperCase()) && filterTicker(w.symbol);
      if (!ok) filteredOut.push(w.symbol);
      return ok;
    });
  }

  const scopeParts: string[] = [];
  if (scope.heldSymbolsOnly) scopeParts.push('保有銘柄のみで回答');
  if (scope.suppressQueueUnlessAsked) scopeParts.push('キュー・旧シグナルは明示質問時のみ');
  if (scope.suppressGenericWarnings && compactMode) scopeParts.push('汎用警告・マクロは省略');

  const suppressedSummary = [
    ...input.sessionMemory.ignoredTopics.slice(-3),
    ...input.sessionMemory.userRejectedThemes.slice(-3),
    ...input.sessionMemory.dismissedSignals.slice(-3),
  ]
    .filter(Boolean)
    .join(' · ');

  const instructionJa = [
    compactMode ? '簡潔モード: 短い段落1〜4、フィラー禁止。' : '拡張モード: ユーザーが深掘りを要求。',
    scopeParts.length ? `スコープ: ${scopeParts.join('、')}` : '',
    suppressedSummary ? `抑制済み: ${suppressedSummary}` : '',
    filteredOut.length ? `コンテキストから除外した銘柄: ${[...new Set(filteredOut)].slice(0, 8).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    holdings: input.holdings,
    watchlist,
    recentRecommendations,
    control: {
      compactMode,
      priorityOrderJa: RELEVANCE_PRIORITY_ORDER_JA,
      scopeJa: scopeParts.join('、') || '通常',
      suppressedSummaryJa: suppressedSummary,
      heldTickers: [...heldTickers],
      filteredOutTickers: [...new Set(filteredOut)],
      instructionJa,
    },
  };
}
