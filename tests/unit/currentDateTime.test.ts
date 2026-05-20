import { describe, expect, it } from 'vitest';
import {
  buildDatetimeReplyText,
  createDatetimeInstantMessage,
  formatCurrentDateTime,
  isDatetimeQuery,
  resolveDatetimeZone,
  DATETIME_ZONE_JST,
  DATETIME_ZONE_MALAYSIA,
  DATETIME_ZONE_UTC,
} from '../../src/services/currentDateTime';

describe('currentDateTime', () => {
  const fixed = new Date('2026-05-19T07:24:31.500Z');

  it('detects datetime questions', () => {
    expect(isDatetimeQuery('今何時？')).toBe(true);
    expect(isDatetimeQuery('秒まで教えて')).toBe(true);
    expect(isDatetimeQuery('今日の日付は？')).toBe(true);
    expect(isDatetimeQuery('日本時間で今何時？')).toBe(true);
    expect(isDatetimeQuery('なぜ買い推奨？')).toBe(false);
  });

  it('formats with seconds and 24h JST label', () => {
    const formatted = formatCurrentDateTime(fixed, DATETIME_ZONE_JST);
    expect(formatted).toMatch(/2026年5月19日/);
    expect(formatted).toMatch(/16:24:31/);
    expect(formatted).toContain('JST');
    expect(formatted).toContain('日本時間');
    expect(formatted).not.toMatch(/午前|午後|AM|PM/i);
  });

  it('resolves UTC and Malaysia zones', () => {
    expect(resolveDatetimeZone('UTCは？').timeZone).toBe('UTC');
    expect(resolveDatetimeZone('マレーシア時間は').timeZone).toBe('Asia/Kuala_Lumpur');

    const utc = formatCurrentDateTime(fixed, DATETIME_ZONE_UTC);
    expect(utc).toContain('UTC');
    expect(utc).toMatch(/07:24:31/);

    const myt = formatCurrentDateTime(fixed, DATETIME_ZONE_MALAYSIA);
    expect(myt).toContain('MYT');
    expect(myt).toMatch(/15:24:31/);
  });

  it('each call uses a fresh clock (no cache)', () => {
    const t1 = formatCurrentDateTime(new Date('2026-05-19T07:24:31.000Z'), DATETIME_ZONE_UTC);
    const t2 = formatCurrentDateTime(new Date('2026-05-19T07:24:32.000Z'), DATETIME_ZONE_UTC);
    expect(t1).not.toBe(t2);
    expect(t1).toMatch(/:31 /);
    expect(t2).toMatch(/:32 /);
  });

  it('instant message for concierge includes natural Japanese reply', () => {
    const msg = createDatetimeInstantMessage('今何時？', fixed);
    expect(msg).not.toBeNull();
    expect(msg?.role).toBe('assistant');
    expect(msg?.text).toContain('現在の日本時間は');
    expect(msg?.text).toMatch(/16:24:31/);
    expect(msg?.structured).toBeUndefined();
  });

  it('buildDatetimeReplyText uses Malaysia when asked', () => {
    const text = buildDatetimeReplyText('マレーシア時間は？', fixed);
    expect(text).toContain('マレーシア時間');
    expect(text).toMatch(/15:24:31/);
    expect(text).toContain('MYT');
  });
});
