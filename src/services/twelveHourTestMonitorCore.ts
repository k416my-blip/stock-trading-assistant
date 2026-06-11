/**
 * 12時間テスト監視コア（Node/テスト用 · react-native 非依存）
 */
import {
  TWELVE_HOUR_HEARTBEAT_MS,
  TWELVE_HOUR_LOG_TAG,
  TWELVE_HOUR_SLEEP_DETECT_GAP_MS,
  TWELVE_HOUR_STALL_WARNING_MS,
  TWELVE_HOUR_TARGET_HOURS,
} from '../constants/twelveHourTestMonitor';
import type {
  TwelveHourHeartbeatLog,
  TwelveHourSleepEvent,
  TwelveHourStallWarning,
  TwelveHourTestMonitorReport,
} from '../types/twelveHourTestMonitor';

const MAX_EVENTS = 120;

let active = false;
let allowBackground = false;
let startedAt = 0;
let targetHours = TWELVE_HOUR_TARGET_HOURS;
let lastHeartbeatAt = 0;
let lastTickAt = 0;
let appStateLabel = 'active';

let lastPriceUpdateAt: string | null = null;
let lastNewsFetchAt: string | null = null;
let lastAiResponseAt: string | null = null;

const sleepEvents: TwelveHourSleepEvent[] = [];
const stallWarnings: TwelveHourStallWarning[] = [];
const heartbeats: TwelveHourHeartbeatLog[] = [];
const warnedStall = new Set<string>();

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let autoStopTimer: ReturnType<typeof setTimeout> | null = null;
let onAppStateChangeHook: ((next: string) => void) | null = null;

async function persistMonitorState(testEnded = false): Promise<void> {
  try {
    const { persistTwelveHourMonitorSnapshot } = await import('./twelveHourTestMonitorPersistence');
    const report = getTwelveHourTestMonitorSnapshot();
    await persistTwelveHourMonitorSnapshot({
      ...report,
      heartbeatCount: heartbeats.length,
      persistedAt: isoNow(),
      testEnded,
    });
  } catch {
    /* optional */
  }
}

function log(message: string, payload?: Record<string, unknown>): void {
  if (payload) {
    console.log(TWELVE_HOUR_LOG_TAG, message, payload);
    return;
  }
  console.log(TWELVE_HOUR_LOG_TAG, message);
}

function warn(message: string, payload?: Record<string, unknown>): void {
  if (payload) {
    console.warn(`${TWELVE_HOUR_LOG_TAG} WARNING`, message, payload);
    return;
  }
  console.warn(`${TWELVE_HOUR_LOG_TAG} WARNING`, message);
}

function isoNow(): string {
  return new Date().toISOString();
}

function elapsedMs(): number {
  return startedAt > 0 ? Date.now() - startedAt : 0;
}

function screenOffLikely(): boolean {
  return appStateLabel !== 'active';
}

function pushBounded<T>(arr: T[], item: T): void {
  arr.push(item);
  if (arr.length > MAX_EVENTS) arr.shift();
}

function latestActivityAt(): string | null {
  const times = [lastPriceUpdateAt, lastNewsFetchAt, lastAiResponseAt].filter(Boolean) as string[];
  if (times.length === 0) return null;
  return times.sort().at(-1) ?? null;
}

function checkStalls(nowMs: number): void {
  const checks = [
    { kind: 'price' as const, at: lastPriceUpdateAt },
    { kind: 'news' as const, at: lastNewsFetchAt },
    { kind: 'ai' as const, at: lastAiResponseAt },
  ];

  for (const { kind, at } of checks) {
    if (!at) continue;
    const stallMs = nowMs - new Date(at).getTime();
    if (stallMs < TWELVE_HOUR_STALL_WARNING_MS) continue;
    const key = `${kind}:${Math.floor(stallMs / TWELVE_HOUR_STALL_WARNING_MS)}`;
    if (warnedStall.has(key)) continue;
    warnedStall.add(key);
    const entry: TwelveHourStallWarning = {
      at: isoNow(),
      kind,
      stallMs,
      messageJa: `${kind}更新が${Math.round(stallMs / 60_000)}分間停止`,
    };
    pushBounded(stallWarnings, entry);
    warn(entry.messageJa, { kind, stallMs, lastAt: at });
  }

  const anyAt = latestActivityAt();
  if (anyAt) {
    const anyStall = nowMs - new Date(anyAt).getTime();
    if (anyStall >= TWELVE_HOUR_STALL_WARNING_MS) {
      const key = `any:${Math.floor(anyStall / TWELVE_HOUR_STALL_WARNING_MS)}`;
      if (!warnedStall.has(key)) {
        warnedStall.add(key);
        const entry: TwelveHourStallWarning = {
          at: isoNow(),
          kind: 'any',
          stallMs: anyStall,
          messageJa: `全更新が${Math.round(anyStall / 60_000)}分間停止`,
        };
        pushBounded(stallWarnings, entry);
        warn(entry.messageJa, { stallMs: anyStall, lastAny: anyAt });
      }
    }
  }
}

function detectSleep(nowMs: number): void {
  if (lastTickAt <= 0) {
    lastTickAt = nowMs;
    return;
  }
  const gapMs = nowMs - lastTickAt;
  lastTickAt = nowMs;
  if (gapMs < TWELVE_HOUR_SLEEP_DETECT_GAP_MS) return;

  const event: TwelveHourSleepEvent = {
    at: isoNow(),
    gapMs,
    estimatedSleepMinutes: Math.round(gapMs / 60_000),
  };
  pushBounded(sleepEvents, event);
  warn('OSスリープまたはプロセス停止を検出', {
    gapMs,
    estimatedSleepMinutes: event.estimatedSleepMinutes,
  });
}

function emitHeartbeat(force = false): void {
  const nowMs = Date.now();
  if (!force && nowMs - lastHeartbeatAt < TWELVE_HOUR_HEARTBEAT_MS - 5000) return;
  lastHeartbeatAt = nowMs;

  detectSleep(nowMs);
  checkStalls(nowMs);

  const entry: TwelveHourHeartbeatLog = {
    at: isoNow(),
    elapsedMs: elapsedMs(),
    appState: appStateLabel,
    screenOffLikely: screenOffLikely(),
    lastPriceUpdateAt,
    lastNewsFetchAt,
    lastAiResponseAt,
    sleepEventCount: sleepEvents.length,
    warningCount: stallWarnings.length,
  };
  pushBounded(heartbeats, entry);

  log('heartbeat', {
    elapsedMin: Math.round(entry.elapsedMs / 60_000),
    appState: entry.appState,
    screenOff: entry.screenOffLikely,
    lastPrice: entry.lastPriceUpdateAt,
    lastNews: entry.lastNewsFetchAt,
    lastAi: entry.lastAiResponseAt,
    sleepEvents: entry.sleepEventCount,
    warnings: entry.warningCount,
  });
  void persistMonitorState(false);
}

/** AppState resume / 手動トリガー用 */
export function forceTwelveHourHeartbeat(): void {
  if (!active) return;
  emitHeartbeat(true);
}

export function setTwelveHourMonitorAppState(next: string): void {
  const prev = appStateLabel;
  appStateLabel = next;
  log('app_state', { from: prev, to: next, background: next !== 'active' });
  if (next !== 'active' && allowBackground) {
    log('background_continue_enabled', {
      price: lastPriceUpdateAt,
      news: lastNewsFetchAt,
      ai: lastAiResponseAt,
    });
  }
  onAppStateChangeHook?.(next);
}

export function registerTwelveHourAppStateHook(hook: (next: string) => void): void {
  onAppStateChangeHook = hook;
}

export function isTwelveHourTestMonitorActive(): boolean {
  return active;
}

export function isTwelveHourBackgroundOpsAllowed(): boolean {
  return active && allowBackground;
}

export function startTwelveHourTestMonitorCore(input?: {
  targetHours?: number;
  allowBackground?: boolean;
  /** プロセス再起動後に前回セッションの最終更新時刻を復元 */
  resumeFrom?: {
    lastPriceUpdateAt?: string | null;
    lastNewsFetchAt?: string | null;
    lastAiResponseAt?: string | null;
    startedAt?: string;
  };
}): void {
  if (active && heartbeatTimer) return;

  if (active && !heartbeatTimer) {
    heartbeatTimer = setInterval(() => emitHeartbeat(true), TWELVE_HOUR_HEARTBEAT_MS);
    log('monitor_timer_resumed', { targetHours });
    return;
  }

  active = true;
  allowBackground = input?.allowBackground ?? true;
  targetHours = input?.targetHours ?? TWELVE_HOUR_TARGET_HOURS;
  startedAt = input?.resumeFrom?.startedAt
    ? new Date(input.resumeFrom.startedAt).getTime()
    : Date.now();
  lastHeartbeatAt = 0;
  lastTickAt = 0;
  warnedStall.clear();
  lastPriceUpdateAt = input?.resumeFrom?.lastPriceUpdateAt ?? null;
  lastNewsFetchAt = input?.resumeFrom?.lastNewsFetchAt ?? null;
  lastAiResponseAt = input?.resumeFrom?.lastAiResponseAt ?? null;

  log('test_started', {
    targetHours,
    allowBackground,
    heartbeatMin: TWELVE_HOUR_HEARTBEAT_MS / 60_000,
    stallWarnMin: TWELVE_HOUR_STALL_WARNING_MS / 60_000,
    resumed: Boolean(input?.resumeFrom),
  });

  emitHeartbeat(true);
  heartbeatTimer = setInterval(() => emitHeartbeat(true), TWELVE_HOUR_HEARTBEAT_MS);

  if (autoStopTimer) clearTimeout(autoStopTimer);
  autoStopTimer = setTimeout(() => {
    stopTwelveHourTestMonitorCore();
  }, targetHours * 3_600_000);
}

export function stopTwelveHourTestMonitorCore(): TwelveHourTestMonitorReport {
  emitHeartbeat(true);
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }

  const endedAt = isoNow();
  const report: TwelveHourTestMonitorReport = {
    startedAt: new Date(startedAt).toISOString(),
    endedAt,
    durationMs: elapsedMs(),
    targetHours,
    active: false,
    allowBackground,
    lastPriceUpdateAt,
    lastNewsFetchAt,
    lastAiResponseAt,
    sleepEvents: [...sleepEvents],
    stallWarnings: [...stallWarnings],
    heartbeats: [...heartbeats],
    backgroundPauseBypassed: allowBackground,
    passPreflight: stallWarnings.length === 0 && sleepEvents.length === 0,
  };

  log('test_ended', {
    durationHours: Math.round((report.durationMs / 3_600_000) * 10) / 10,
    lastPriceUpdateAt: report.lastPriceUpdateAt,
    lastNewsFetchAt: report.lastNewsFetchAt,
    lastAiResponseAt: report.lastAiResponseAt,
    sleepEvents: report.sleepEvents.length,
    warnings: report.stallWarnings.length,
  });

  active = false;
  void persistMonitorState(true);
  return report;
}

export function noteTwelveHourPriceUpdate(meta?: Record<string, unknown>): void {
  if (!active) return;
  lastPriceUpdateAt = isoNow();
  log('price_update', { at: lastPriceUpdateAt, appState: appStateLabel, ...meta });
  void persistMonitorState(false);
}

export function noteTwelveHourNewsFetch(meta?: Record<string, unknown>): void {
  if (!active) return;
  lastNewsFetchAt = isoNow();
  log('news_fetch', { at: lastNewsFetchAt, appState: appStateLabel, ...meta });
  void persistMonitorState(false);
}

export function noteTwelveHourAiResponse(meta?: Record<string, unknown>): void {
  if (!active) return;
  lastAiResponseAt = isoNow();
  log('ai_response', { at: lastAiResponseAt, appState: appStateLabel, ...meta });
  void persistMonitorState(false);
}

export function getTwelveHourTestMonitorSnapshot(): TwelveHourTestMonitorReport {
  return {
    startedAt: startedAt > 0 ? new Date(startedAt).toISOString() : isoNow(),
    endedAt: isoNow(),
    durationMs: elapsedMs(),
    targetHours,
    active,
    allowBackground,
    lastPriceUpdateAt,
    lastNewsFetchAt,
    lastAiResponseAt,
    sleepEvents: [...sleepEvents],
    stallWarnings: [...stallWarnings],
    heartbeats: [...heartbeats],
    backgroundPauseBypassed: allowBackground,
    passPreflight: !active,
  };
}

export function resetTwelveHourTestMonitorCoreForTest(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  if (autoStopTimer) clearTimeout(autoStopTimer);
  autoStopTimer = null;
  active = false;
  allowBackground = false;
  startedAt = 0;
  lastHeartbeatAt = 0;
  lastTickAt = 0;
  lastPriceUpdateAt = null;
  lastNewsFetchAt = null;
  lastAiResponseAt = null;
  sleepEvents.length = 0;
  stallWarnings.length = 0;
  heartbeats.length = 0;
  warnedStall.clear();
  appStateLabel = 'active';
  onAppStateChangeHook = null;
}

export function formatTwelveHourTestReportMarkdown(report: TwelveHourTestMonitorReport): string {
  const lines = [
    '# 12時間テスト監視レポート',
    '',
    `開始: ${report.startedAt}`,
    `終了: ${report.endedAt}`,
    `稼働: ${(report.durationMs / 3_600_000).toFixed(2)} 時間`,
    '',
    '## 最終更新時刻',
    '',
    `| 種別 | 時刻 |`,
    `|------|------|`,
    `| 株価更新 | ${report.lastPriceUpdateAt ?? '未取得'} |`,
    `| ニュース取得 | ${report.lastNewsFetchAt ?? '未取得'} |`,
    `| AI応答 | ${report.lastAiResponseAt ?? '未取得'} |`,
    '',
    `## サマリー`,
    '',
    `- バックグラウンド継続: ${report.backgroundPauseBypassed ? '有効' : '無効'}`,
    `- OSスリープ検出: ${report.sleepEvents.length} 件`,
    `- 停止WARNING: ${report.stallWarnings.length} 件`,
    `- ハートビート: ${report.heartbeats.length} 件`,
    '',
  ];

  if (report.sleepEvents.length > 0) {
    lines.push('## スリープイベント', '');
    for (const e of report.sleepEvents) {
      lines.push(`- ${e.at}: ギャップ ${e.estimatedSleepMinutes}分 (${e.gapMs}ms)`);
    }
    lines.push('');
  }

  if (report.stallWarnings.length > 0) {
    lines.push('## WARNING（30分以上停止）', '');
    for (const w of report.stallWarnings) {
      lines.push(`- ${w.at}: ${w.messageJa}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
