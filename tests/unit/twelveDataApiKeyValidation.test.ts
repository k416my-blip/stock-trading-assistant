import { describe, expect, it } from 'vitest';
import { normalizeTwelveDataApiKey } from '../../src/services/apiKeyValidation';

describe('normalizeTwelveDataApiKey', () => {
  it('strips apikey= from query-style paste', () => {
    expect(normalizeTwelveDataApiKey('apikey=abcd1234')).toBe('abcd1234');
  });

  it('extracts apikey from full URL', () => {
    expect(
      normalizeTwelveDataApiKey(
        'https://api.twelvedata.com/quote?symbol=AAPL&apikey=secretkey99',
      ),
    ).toBe('secretkey99');
  });

  it('trims plain key', () => {
    expect(normalizeTwelveDataApiKey('  my-key  ')).toBe('my-key');
  });
});
