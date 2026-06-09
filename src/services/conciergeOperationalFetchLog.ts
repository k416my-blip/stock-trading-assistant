/** Metro 診断 — 実運用フェッチの成否切り分け */

export function redactFetchUrl(url: string): string {
  return url
    .replace(/apiKey=[^&]+/gi, 'apiKey=***')
    .replace(/api_token=[^&]+/gi, 'api_token=***')
    .replace(/token=[^&]+/gi, 'token=***');
}

export function logNewsFetch(payload: {
  symbol?: string;
  query: string;
  requestUrl: string;
  status: number | string;
  articlesCount: number;
  error?: string;
}): void {
  console.warn(
    '[NEWS_FETCH]',
    JSON.stringify({
      symbol: payload.symbol ?? null,
      query: payload.query,
      requestUrl: redactFetchUrl(payload.requestUrl),
      status: payload.status,
      articlesCount: payload.articlesCount,
      error: payload.error ?? null,
    }),
  );
}

export function logXFetch(payload: {
  query: string;
  requestUrl: string;
  status: number | string;
  postsCount: number;
  error?: string;
}): void {
  console.warn(
    '[X_FETCH]',
    JSON.stringify({
      query: payload.query,
      requestUrl: payload.requestUrl,
      status: payload.status,
      postsCount: payload.postsCount,
      error: payload.error ?? null,
    }),
  );
}
