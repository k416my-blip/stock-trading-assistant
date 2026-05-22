import type { AiChatMessage } from '../types/aiChat';

/** ISO-8601 UTC — machine-readable for export / audit linkage. */
export type ChatTimestampIso = string;

export type ChatTimestampFields = {
  createdAt: ChatTimestampIso;
  sortKey: number;
  /** Device local offset at creation (minutes east of UTC; JS getTimezoneOffset inverse). */
  timezoneOffsetMinutes: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

let chatSortSequence = 0;

/** Capture once at message creation — never re-stamp on reload. */
export function createChatTimestampFields(at: Date = new Date()): ChatTimestampFields {
  const ms = at.getTime();
  chatSortSequence = (chatSortSequence + 1) % 1000;
  return {
    createdAt: at.toISOString(),
    sortKey: ms * 1000 + chatSortSequence,
    timezoneOffsetMinutes: -at.getTimezoneOffset(),
  };
}

export function isValidChatTimestampIso(iso: string | undefined): boolean {
  if (!iso) return false;
  const ms = Date.parse(iso);
  return Number.isFinite(ms);
}

/**
 * Display in device local timezone (survives offline — uses stored instant + local formatter).
 * Full: 2026/05/20 20:44:12 · Compact (same year): 05/20 20:44:12
 */
export function formatChatTimestampLocal(
  iso: ChatTimestampIso,
  options?: { compact?: boolean; referenceDate?: Date },
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';

  const ref = options?.referenceDate ?? new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const h = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  const sec = pad2(d.getSeconds());
  const clock = `${h}:${min}:${sec}`;

  if (options?.compact && y === ref.getFullYear()) {
    return `${m}/${day} ${clock}`;
  }
  return `${y}/${m}/${day} ${clock}`;
}

export function compareChatMessagesAsc(a: AiChatMessage, b: AiChatMessage): number {
  const ta = Date.parse(a.createdAt);
  const tb = Date.parse(b.createdAt);
  const safeA = Number.isFinite(ta) ? ta : 0;
  const safeB = Number.isFinite(tb) ? tb : 0;
  if (safeA !== safeB) return safeA - safeB;

  const sa = a.sortKey ?? safeA;
  const sb = b.sortKey ?? safeB;
  if (sa !== sb) return sa - sb;

  return a.id.localeCompare(b.id);
}

export function sortChatMessagesAsc(messages: AiChatMessage[]): AiChatMessage[] {
  return [...messages].sort(compareChatMessagesAsc);
}

/** Preserve original createdAt; only fill missing metadata for legacy rows. */
export function normalizeChatMessageTimestamps(
  message: AiChatMessage,
  fallbackIndex: number,
): AiChatMessage {
  let createdAt = message.createdAt;
  if (!isValidChatTimestampIso(createdAt)) {
    createdAt = new Date(0).toISOString();
  }
  const parsed = Date.parse(createdAt);
  const sortKey = message.sortKey ?? parsed + fallbackIndex;
  const timezoneOffsetMinutes =
    message.timezoneOffsetMinutes ??
    -new Date(createdAt).getTimezoneOffset();

  return {
    ...message,
    createdAt,
    sortKey,
    timezoneOffsetMinutes,
  };
}

export function normalizeChatHistory(messages: AiChatMessage[]): AiChatMessage[] {
  const normalized = messages.map((m, i) => normalizeChatMessageTimestamps(m, i));
  return sortChatMessagesAsc(normalized);
}
