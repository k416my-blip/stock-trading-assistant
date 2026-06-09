/** Metro — 分析対象銘柄とニュース取得の切り分け */
export type ConciergeTargetSymbolLogPayload = {
  input: string;
  resolvedSymbol: string;
  resolvedName: string;
  newsQueries: string[];
  usedNewsTitles: string[];
  separatePortfolioNews?: boolean;
};

export type TargetResolveLogPayload = {
  input: string;
  targets: string[];
};

export type NewsFetchTargetLogPayload = {
  symbol: string;
  query: string;
  source: 'chat' | 'proactive' | 'allocation';
};

export function logConciergeTargetSymbol(payload: ConciergeTargetSymbolLogPayload): void {
  console.warn('[CONCIERGE_TARGET_SYMBOL]', JSON.stringify(payload));
}

export function logTargetResolve(payload: TargetResolveLogPayload): void {
  console.warn('[TARGET_RESOLVE]', JSON.stringify(payload));
}

export function logNewsFetchTarget(payload: NewsFetchTargetLogPayload): void {
  console.warn('[NEWS_FETCH_TARGET]', JSON.stringify(payload));
}
