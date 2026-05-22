import type { AiChatMessage } from '../types/aiChat';
import { createAssistantChatMessagePartial } from './chatMessageFactory';

export type DatetimeZoneSpec = {
  timeZone: string;
  zoneLabelJa: string;
  abbr: string;
};

export const DATETIME_ZONE_JST: DatetimeZoneSpec = {
  timeZone: 'Asia/Tokyo',
  zoneLabelJa: '日本時間',
  abbr: 'JST',
};

export const DATETIME_ZONE_MALAYSIA: DatetimeZoneSpec = {
  timeZone: 'Asia/Kuala_Lumpur',
  zoneLabelJa: 'マレーシア時間',
  abbr: 'MYT',
};

export const DATETIME_ZONE_UTC: DatetimeZoneSpec = {
  timeZone: 'UTC',
  zoneLabelJa: 'UTC',
  abbr: 'UTC',
};

const DEFAULT_ZONE = DATETIME_ZONE_JST;

/** User is asking for live clock / calendar (not investment advice). */
export function isDatetimeQuery(message: string): boolean {
  const t = message.trim();
  if (!t) return false;

  if (
    /今(の)?何時|現在(の)?時刻|今の時刻|何時ですか|何時\?|何時か|秒まで|何秒|時刻を教えて|時間を教えて/i.test(
      t,
    )
  ) {
    return true;
  }

  if (/今日の日付|本日の日付|今日は何日|今の日付|日付は/i.test(t)) {
    return true;
  }

  if (
    /日本時間|JST|マレーシア時間|マレーシアの時間|Malaysia\s*time|Kuala\s*Lumpur|クアラルンプール|UTC|協定世界時/i.test(
      t,
    ) &&
    /今|現在|何時|時刻|日付|教えて|は\?|は？/i.test(t)
  ) {
    return true;
  }

  return false;
}

/** Pick IANA zone from user wording; default JST for this app. */
export function resolveDatetimeZone(message: string): DatetimeZoneSpec {
  const t = message.trim();
  if (/UTC|協定世界時/i.test(t)) return DATETIME_ZONE_UTC;
  if (/マレーシア|Malaysia|Kuala\s*Lumpur|クアラルンプール|MYT/i.test(t)) {
    return DATETIME_ZONE_MALAYSIA;
  }
  if (/日本時間|JST|東京/i.test(t)) return DATETIME_ZONE_JST;
  return DEFAULT_ZONE;
}

/** 2026年5月19日 16:24:31 JST（日本時間） — always fresh `now`, no cache */
export function formatCurrentDateTime(now: Date, zone: DatetimeZoneSpec = DEFAULT_ZONE): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: zone.timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const pick = (type: Intl.DateTimeFormatPart['type']) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  const y = pick('year');
  const m = pick('month');
  const d = pick('day');
  const h = pick('hour').padStart(2, '0');
  const min = pick('minute').padStart(2, '0');
  const sec = pick('second').padStart(2, '0');

  return `${y}年${m}月${d}日 ${h}:${min}:${sec} ${zone.abbr}（${zone.zoneLabelJa}）`;
}

export function buildDatetimeReplyText(
  userText: string,
  now: Date = new Date(),
): string {
  const zone = resolveDatetimeZone(userText);
  const stamp = formatCurrentDateTime(now, zone);
  const dateOnly = /日付/.test(userText) && !/時刻|何時|秒/.test(userText);

  if (dateOnly) {
    return `今日の日付（${zone.zoneLabelJa}）は ${stamp} です。`;
  }

  return `現在の${zone.zoneLabelJa}は\n${stamp}です。`;
}

export function createDatetimeInstantMessage(
  userText: string,
  now: Date = new Date(),
): AiChatMessage | null {
  if (!isDatetimeQuery(userText)) return null;

  return createAssistantChatMessagePartial({
    id: `a-datetime-${now.getTime()}`,
    text: buildDatetimeReplyText(userText, now),
    responseIntent: 'general_education',
    createdAt: now.toISOString(),
    sortKey: now.getTime() * 1000,
  });
}
