import { describe, expect, it } from 'vitest';
import { createUserChatMessage } from '../../src/services/chatMessageFactory';
import {
  compareChatMessagesAsc,
  createChatTimestampFields,
  formatChatTimestampLocal,
  normalizeChatHistory,
  normalizeChatMessageTimestamps,
  sortChatMessagesAsc,
} from '../../src/utils/chatTimestamp';
import type { AiChatMessage } from '../../src/types/aiChat';

function msg(partial: Partial<AiChatMessage> & Pick<AiChatMessage, 'id' | 'role' | 'text'>): AiChatMessage {
  const stamp = createChatTimestampFields();
  return {
    ...stamp,
    messageSource: 'chat',
    ...partial,
    createdAt: partial.createdAt ?? stamp.createdAt,
    sortKey: partial.sortKey ?? stamp.sortKey,
    timezoneOffsetMinutes: partial.timezoneOffsetMinutes ?? stamp.timezoneOffsetMinutes,
  };
}

describe('chatTimestamp', () => {
  const fixed = new Date('2026-05-20T11:44:12.000Z');

  it('formats local display with date and seconds', () => {
    const label = formatChatTimestampLocal(fixed.toISOString(), {
      referenceDate: fixed,
    });
    expect(label).toMatch(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/);
    expect(label).toContain(':12');
  });

  it('uses compact month/day when same calendar year', () => {
    const label = formatChatTimestampLocal(fixed.toISOString(), {
      compact: true,
      referenceDate: fixed,
    });
    expect(label).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(label).not.toMatch(/2026/);
  });

  it('preserves original createdAt on normalize (reload)', () => {
    const original = '2026-01-15T08:30:00.000Z';
    const normalized = normalizeChatMessageTimestamps(
      msg({
        id: 'legacy-1',
        role: 'assistant',
        text: 'hello',
        createdAt: original,
      }),
      0,
    );
    expect(normalized.createdAt).toBe(original);
    expect(normalized.sortKey).toBeGreaterThan(0);
  });

  it('sorts by createdAt asc with sortKey tie-break', () => {
    const iso = '2026-05-20T10:00:00.000Z';
    const items: AiChatMessage[] = [
      msg({ id: 'b', role: 'assistant', text: 'b', createdAt: iso, sortKey: 2 }),
      msg({ id: 'a', role: 'user', text: 'a', createdAt: iso, sortKey: 1 }),
      msg({ id: 'c', role: 'assistant', text: 'c', createdAt: '2026-05-20T11:00:00.000Z', sortKey: 3 }),
    ];
    const sorted = sortChatMessagesAsc(items);
    expect(sorted.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    expect(compareChatMessagesAsc(sorted[0], sorted[1])).toBeLessThan(0);
  });

  it('orders rapid consecutive messages deterministically', () => {
    const t1 = createUserChatMessage('one');
    const t2 = createUserChatMessage('two');
    const ordered = normalizeChatHistory([t2, t1]);
    expect(ordered[0].text).toBe('one');
    expect(ordered[1].text).toBe('two');
    expect(ordered[0].sortKey).toBeLessThanOrEqual(ordered[1].sortKey);
  });

  it('tags voice messages with messageSource', () => {
    const voice = createUserChatMessage('音声テスト', { messageSource: 'voice' });
    expect(voice.messageSource).toBe('voice');
    expect(voice.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
