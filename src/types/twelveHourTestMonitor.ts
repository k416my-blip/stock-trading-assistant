/** 12時間実機テスト監視 */

export type TwelveHourActivityKind = 'price' | 'news' | 'ai';

export type TwelveHourSleepEvent = {
  at: string;
  gapMs: number;
  estimatedSleepMinutes: number;
};

export type TwelveHourStallWarning = {
  at: string;
  kind: TwelveHourActivityKind | 'any';
  stallMs: number;
  messageJa: string;
};

export type TwelveHourHeartbeatLog = {
  at: string;
  elapsedMs: number;
  appState: string;
  screenOffLikely: boolean;
  lastPriceUpdateAt: string | null;
  lastNewsFetchAt: string | null;
  lastAiResponseAt: string | null;
  sleepEventCount: number;
  warningCount: number;
};

export type TwelveHourTestMonitorReport = {
  startedAt: string;
  endedAt: string;
  durationMs: number;
  targetHours: number;
  active: boolean;
  allowBackground: boolean;
  lastPriceUpdateAt: string | null;
  lastNewsFetchAt: string | null;
  lastAiResponseAt: string | null;
  sleepEvents: TwelveHourSleepEvent[];
  stallWarnings: TwelveHourStallWarning[];
  heartbeats: TwelveHourHeartbeatLog[];
  backgroundPauseBypassed: boolean;
  passPreflight: boolean;
};
