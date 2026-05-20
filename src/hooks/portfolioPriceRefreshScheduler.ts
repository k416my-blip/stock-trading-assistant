/** 保有銘柄の株価自動更新タイマー（アプリ全体で1つだけ動かす） */

let intervalId: ReturnType<typeof setInterval> | null = null;
let activeMs = 0;

export function restartPortfolioPriceRefresh(ms: number, onTick: () => void): void {
  stopPortfolioPriceRefresh();
  activeMs = ms;
  intervalId = setInterval(onTick, ms);
}

export function stopPortfolioPriceRefresh(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  activeMs = 0;
}

export function getActivePortfolioRefreshMs(): number {
  return activeMs;
}
