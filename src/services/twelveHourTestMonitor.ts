/**
 * 12時間実機テスト監視 — React Native AppState 連携
 */
import { AppState, type AppStateStatus } from 'react-native';
import {
  formatTwelveHourTestReportMarkdown,
  forceTwelveHourHeartbeat,
  getTwelveHourTestMonitorSnapshot,
  isTwelveHourBackgroundOpsAllowed,
  isTwelveHourTestMonitorActive,
  noteTwelveHourAiResponse,
  noteTwelveHourNewsFetch,
  noteTwelveHourPriceUpdate,
  registerTwelveHourAppStateHook,
  resetTwelveHourTestMonitorCoreForTest,
  setTwelveHourMonitorAppState,
  startTwelveHourTestMonitorCore,
  stopTwelveHourTestMonitorCore,
} from './twelveHourTestMonitorCore';
import { loadTwelveHourMonitorSnapshot } from './twelveHourTestMonitorPersistence';
import { disableLongRunSurvival, enableLongRunSurvival } from './longRunSurvival';

let appStateSub: { remove: () => void } | null = null;

export async function startTwelveHourTestMonitor(input?: {
  targetHours?: number;
  allowBackground?: boolean;
}): Promise<void> {
  if (!appStateSub) {
    setTwelveHourMonitorAppState(AppState.currentState);
    appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      setTwelveHourMonitorAppState(next);
      if (next === 'active') {
        forceTwelveHourHeartbeat();
      }
    });
  }

  const persisted = await loadTwelveHourMonitorSnapshot();
  const resumeFrom =
    persisted?.active && !persisted.testEnded
      ? {
          startedAt: persisted.startedAt,
          lastPriceUpdateAt: persisted.lastPriceUpdateAt,
          lastNewsFetchAt: persisted.lastNewsFetchAt,
          lastAiResponseAt: persisted.lastAiResponseAt,
        }
      : undefined;

  startTwelveHourTestMonitorCore({ ...input, resumeFrom });
  void enableLongRunSurvival({ screenAwake: false });
}

export function stopTwelveHourTestMonitor() {
  void disableLongRunSurvival();
  return stopTwelveHourTestMonitorCore();
}

export function resetTwelveHourTestMonitorForTest(): void {
  appStateSub?.remove();
  appStateSub = null;
  resetTwelveHourTestMonitorCoreForTest();
}

export {
  formatTwelveHourTestReportMarkdown,
  getTwelveHourTestMonitorSnapshot,
  isTwelveHourBackgroundOpsAllowed,
  isTwelveHourTestMonitorActive,
  noteTwelveHourAiResponse,
  noteTwelveHourNewsFetch,
  noteTwelveHourPriceUpdate,
  registerTwelveHourAppStateHook,
};
