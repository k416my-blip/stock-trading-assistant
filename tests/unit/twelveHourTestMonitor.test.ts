import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TWELVE_HOUR_HEARTBEAT_MS,
  TWELVE_HOUR_SLEEP_DETECT_GAP_MS,
  TWELVE_HOUR_STALL_WARNING_MS,
} from '../../src/constants/twelveHourTestMonitor';
import {
  formatTwelveHourTestReportMarkdown,
  isTwelveHourBackgroundOpsAllowed,
  noteTwelveHourAiResponse,
  noteTwelveHourNewsFetch,
  noteTwelveHourPriceUpdate,
  resetTwelveHourTestMonitorCoreForTest,
  startTwelveHourTestMonitorCore,
  stopTwelveHourTestMonitorCore,
} from '../../src/services/twelveHourTestMonitorCore';

describe('twelveHourTestMonitor', () => {
  beforeEach(() => {
    resetTwelveHourTestMonitorCoreForTest();
    vi.useFakeTimers();
  });

  afterEach(() => {
    resetTwelveHourTestMonitorCoreForTest();
    vi.useRealTimers();
  });

  it('starts monitor and allows background ops', () => {
    startTwelveHourTestMonitorCore({ allowBackground: true, targetHours: 12 });
    expect(isTwelveHourBackgroundOpsAllowed()).toBe(true);
  });

  it('records price, news, and ai timestamps', () => {
    startTwelveHourTestMonitorCore({ allowBackground: true });
    noteTwelveHourPriceUpdate({ test: true });
    noteTwelveHourNewsFetch({ test: true });
    noteTwelveHourAiResponse({ test: true });
    const report = stopTwelveHourTestMonitorCore();
    expect(report.lastPriceUpdateAt).not.toBeNull();
    expect(report.lastNewsFetchAt).not.toBeNull();
    expect(report.lastAiResponseAt).not.toBeNull();
  });

  it('emits heartbeat every 15 minutes with last update times', () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });
    startTwelveHourTestMonitorCore({ allowBackground: true });
    noteTwelveHourPriceUpdate();
    vi.advanceTimersByTime(TWELVE_HOUR_HEARTBEAT_MS);
    expect(logs.some((l) => l.includes('[12H-MONITOR]') && l.includes('heartbeat'))).toBe(true);
    spy.mockRestore();
  });

  it('warns when updates stall 30+ minutes', () => {
    const warns: string[] = [];
    const spy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      warns.push(args.join(' '));
    });
    startTwelveHourTestMonitorCore({ allowBackground: true });
    noteTwelveHourPriceUpdate();
    vi.advanceTimersByTime(TWELVE_HOUR_STALL_WARNING_MS + 1000);
    vi.advanceTimersByTime(TWELVE_HOUR_HEARTBEAT_MS);
    expect(warns.some((w) => w.includes('WARNING'))).toBe(true);
    spy.mockRestore();
  });

  it('detects OS sleep from wall-clock gap', () => {
    const warns: string[] = [];
    const spy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      warns.push(args.join(' '));
    });
    startTwelveHourTestMonitorCore({ allowBackground: true });
    vi.advanceTimersByTime(TWELVE_HOUR_SLEEP_DETECT_GAP_MS + 5000);
    vi.advanceTimersByTime(TWELVE_HOUR_HEARTBEAT_MS);
    expect(warns.some((w) => w.includes('スリープ'))).toBe(true);
    spy.mockRestore();
  });

  it('formats end report with last timestamps', () => {
    startTwelveHourTestMonitorCore({ allowBackground: true });
    noteTwelveHourPriceUpdate();
    noteTwelveHourNewsFetch();
    noteTwelveHourAiResponse();
    const report = stopTwelveHourTestMonitorCore();
    const md = formatTwelveHourTestReportMarkdown(report);
    expect(md).toContain('株価更新');
    expect(md).toContain('ニュース取得');
    expect(md).toContain('AI応答');
  });
});
