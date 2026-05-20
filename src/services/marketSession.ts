import {
  alertKindFromCountdown,
  COUNTDOWN_PREFIX,
  isActiveTradingSession,
  isBlockedTradingSession,
  isExtendedHoursSession,
  SESSION_BEGINNER_TIPS,
  SESSION_STATUS_LABEL,
  type MarketSessionStatus,
  type SessionCountdownKind,
} from '../constants/marketSession';
import { MARKET_LABEL } from '../constants/rakutenTrade';
import type { Market } from '../types';

export type { MarketSessionStatus, SessionCountdownKind };

export interface MarketSessionInfo {
  market: Market;
  marketLabel: string;
  status: MarketSessionStatus;
  statusLabel: string;
  message: string;
  countdownLine: string;
  beginnerTip: string;
  mytDisplay: string;
  countdownText: string;
  countdownKind: SessionCountdownKind;
  /** @deprecated アラート互換 — alertKindFromCountdown(countdownKind) を使用 */
  countdownTarget: 'open' | 'close';
  msUntilNextEvent: number;
  isRegularSession: boolean;
  blockVirtualBuy: boolean;
  showExtendedHoursWarning: boolean;
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
};

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function getZonedParts(timeZone: string, at: Date): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
    weekday: WEEKDAY[pick('weekday')] ?? 0,
    hour: Number(pick('hour')),
    minute: Number(pick('minute')),
  };
}

function toMin(h: number, m: number): number {
  return h * 60 + m;
}

function formatMYT(at: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'まもなく';
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `あと${totalMin}分`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (mins === 0) return `あと${hours}時間`;
  return `あと${hours}時間${mins}分`;
}

/** 指定タイムゾーンの壁時計を UTC Date に変換（DST対応） */
function wallTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const base = Date.UTC(year, month - 1, day, 12, 0, 0);
  for (let offsetMin = -16 * 60; offsetMin <= 16 * 60; offsetMin += 15) {
    const candidate = new Date(base + offsetMin * 60_000);
    const p = getZonedParts(timeZone, candidate);
    if (p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute) {
      return candidate;
    }
  }
  return new Date(base);
}

function nextWeekdayWallTime(
  timeZone: string,
  from: ZonedParts,
  hour: number,
  minute: number,
  maxDays = 10,
): Date {
  const now = Date.now();
  for (let d = 0; d < maxDays; d++) {
    const day = new Date(Date.UTC(from.year, from.month - 1, from.day + d, 12, 0, 0));
    const p = getZonedParts(timeZone, day);
    if (p.weekday === 0 || p.weekday === 6) continue;
    const target = wallTimeToUtc(timeZone, p.year, p.month, p.day, hour, minute);
    if (target.getTime() > now) return target;
  }
  return wallTimeToUtc(timeZone, from.year, from.month, from.day, hour, minute);
}

type SessionResult = {
  status: MarketSessionStatus;
  countdownKind: SessionCountdownKind;
  nextEvent: Date;
};

/** Bursa: 前場 09:00-12:30 / 昼休み 12:30-14:30 / 後場 14:30-17:00 */
function evaluateBursa(myt: ZonedParts): SessionResult {
  if (myt.weekday === 0 || myt.weekday === 6) {
    return {
      status: 'closed',
      countdownKind: 'next_session',
      nextEvent: nextWeekdayWallTime('Asia/Kuala_Lumpur', myt, 9, 0),
    };
  }

  const min = toMin(myt.hour, myt.minute);
  const d = (h: number, m: number) => wallTimeToUtc('Asia/Kuala_Lumpur', myt.year, myt.month, myt.day, h, m);

  if (min >= toMin(9, 0) && min < toMin(12, 30)) {
    return { status: 'morning_session', countdownKind: 'lunch_break', nextEvent: d(12, 30) };
  }
  if (min >= toMin(12, 30) && min < toMin(14, 30)) {
    return { status: 'lunch_break', countdownKind: 'afternoon_open', nextEvent: d(14, 30) };
  }
  if (min >= toMin(14, 30) && min < toMin(17, 0)) {
    return { status: 'afternoon_session', countdownKind: 'market_close', nextEvent: d(17, 0) };
  }
  if (min < toMin(9, 0)) {
    return { status: 'pre_open', countdownKind: 'morning_open', nextEvent: d(9, 0) };
  }
  return {
    status: 'after_close',
    countdownKind: 'next_session',
    nextEvent: nextWeekdayWallTime('Asia/Kuala_Lumpur', myt, 9, 0),
  };
}

/** 米国: プレ 04:00-09:30 / 通常 09:30-16:00 / アフター 16:00-20:00 (ET) */
function evaluateUS(et: ZonedParts): SessionResult {
  if (et.weekday === 0 || et.weekday === 6) {
    return {
      status: 'closed',
      countdownKind: 'pre_market_open',
      nextEvent: nextWeekdayWallTime('America/New_York', et, 4, 0),
    };
  }

  const min = toMin(et.hour, et.minute);
  const d = (h: number, m: number) =>
    wallTimeToUtc('America/New_York', et.year, et.month, et.day, h, m);

  if (min >= toMin(4, 0) && min < toMin(9, 30)) {
    return { status: 'pre_market', countdownKind: 'regular_open', nextEvent: d(9, 30) };
  }
  if (min >= toMin(9, 30) && min < toMin(16, 0)) {
    return { status: 'open', countdownKind: 'market_close', nextEvent: d(16, 0) };
  }
  if (min >= toMin(16, 0) && min < toMin(20, 0)) {
    return { status: 'after_market', countdownKind: 'extended_close', nextEvent: d(20, 0) };
  }
  if (min < toMin(4, 0)) {
    return { status: 'after_close', countdownKind: 'pre_market_open', nextEvent: d(4, 0) };
  }
  return {
    status: 'after_close',
    countdownKind: 'pre_market_open',
    nextEvent: nextWeekdayWallTime('America/New_York', et, 4, 0),
  };
}

/** 香港: 前場 09:30-12:00 / 昼休み 12:00-13:00 / 後場 13:00-16:00 */
function evaluateHK(hkt: ZonedParts): SessionResult {
  if (hkt.weekday === 0 || hkt.weekday === 6) {
    return {
      status: 'closed',
      countdownKind: 'next_session',
      nextEvent: nextWeekdayWallTime('Asia/Hong_Kong', hkt, 9, 30),
    };
  }

  const min = toMin(hkt.hour, hkt.minute);
  const d = (h: number, m: number) =>
    wallTimeToUtc('Asia/Hong_Kong', hkt.year, hkt.month, hkt.day, h, m);

  if (min >= toMin(9, 30) && min < toMin(12, 0)) {
    return { status: 'morning_session', countdownKind: 'lunch_break', nextEvent: d(12, 0) };
  }
  if (min >= toMin(12, 0) && min < toMin(13, 0)) {
    return { status: 'lunch_break', countdownKind: 'afternoon_open', nextEvent: d(13, 0) };
  }
  if (min >= toMin(13, 0) && min < toMin(16, 0)) {
    return { status: 'afternoon_session', countdownKind: 'market_close', nextEvent: d(16, 0) };
  }
  if (min < toMin(9, 30)) {
    return { status: 'pre_open', countdownKind: 'morning_open', nextEvent: d(9, 30) };
  }
  return {
    status: 'after_close',
    countdownKind: 'next_session',
    nextEvent: nextWeekdayWallTime('Asia/Hong_Kong', hkt, 9, 30),
  };
}

function buildCountdownLine(kind: SessionCountdownKind, countdownText: string): string {
  return `${COUNTDOWN_PREFIX[kind]}${countdownText}`;
}

function buildMessage(marketLabel: string, statusLabel: string, countdownLine: string): string {
  return `${marketLabel}は現在${statusLabel}です。${countdownLine}`;
}

export function getMarketSession(market: Market, at: Date = new Date()): MarketSessionInfo {
  const mytDisplay = formatMYT(at);

  let session: SessionResult;
  if (market === 'bursa') {
    session = evaluateBursa(getZonedParts('Asia/Kuala_Lumpur', at));
  } else if (market === 'us') {
    session = evaluateUS(getZonedParts('America/New_York', at));
  } else {
    session = evaluateHK(getZonedParts('Asia/Hong_Kong', at));
  }

  const marketLabel = MARKET_LABEL[market];
  const statusLabel = SESSION_STATUS_LABEL[session.status];
  const countdownMs = Math.max(0, session.nextEvent.getTime() - at.getTime());
  const countdownText = formatCountdown(countdownMs);
  const countdownLine = buildCountdownLine(session.countdownKind, countdownText);
  const alertKind = alertKindFromCountdown(session.countdownKind);

  return {
    market,
    marketLabel,
    status: session.status,
    statusLabel,
    message: buildMessage(marketLabel, statusLabel, countdownLine),
    countdownLine,
    beginnerTip: SESSION_BEGINNER_TIPS[session.status],
    mytDisplay,
    countdownText,
    countdownKind: session.countdownKind,
    countdownTarget: alertKind,
    msUntilNextEvent: countdownMs,
    isRegularSession: isActiveTradingSession(session.status),
    blockVirtualBuy: isBlockedTradingSession(session.status),
    showExtendedHoursWarning: isExtendedHoursSession(session.status),
  };
}

export function getAllMarketSessions(at: Date = new Date()): MarketSessionInfo[] {
  return (['bursa', 'us', 'hk'] as Market[]).map((m) => getMarketSession(m, at));
}
