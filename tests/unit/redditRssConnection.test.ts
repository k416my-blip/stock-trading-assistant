import { describe, expect, it } from 'vitest';
import { formatRedditApiConnection } from '../../src/services/bursa/bursaMaterialDataQuality';

describe('formatRedditApiConnection', () => {
  it('shows Reddit RSS接続 when RSS ok without OAuth', () => {
    expect(formatRedditApiConnection('ok', 'rss')).toBe('Reddit RSS接続');
  });

  it('shows 未接続 when failed', () => {
    expect(formatRedditApiConnection('skipped', 'none')).toBe('未接続');
  });
});
