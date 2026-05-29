/** 保有銘柄の株価自動更新タイマー（アプリ全体で1つだけ動かす） */

import { logAutoUpdateSkipped, logAutoUpdateStart } from '../services/productionOpsLog';

let intervalId: ReturnType<typeof setInterval> | null = null;
let activeMs = 0;

export function restartPortfolioPriceRefresh(ms: number, onTick: () => void): void {
  stopPortfolioPriceRefresh('restart');
  activeMs = ms;
  logAutoUpdateStart({ scheduler: 'interval_registered', intervalMs: ms });
  intervalId = setInterval(onTick, ms);
}

export function stopPortfolioPriceRefresh(reason = 'stop'): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    logAutoUpdateSkipped('interval_stopped', { reason, wasMs: activeMs });
  }
  activeMs = 0;
}

export function getActivePortfolioRefreshMs(): number {
  return activeMs;
}
