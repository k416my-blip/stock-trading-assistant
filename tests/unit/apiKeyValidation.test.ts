import { describe, expect, it } from 'vitest';
import {
  canPersistApiKeyValue,
  canPersistTwelveDataApiKey,
  isMaskedOrEmptyApiKey,
} from '../../src/services/apiKeyValidation';

describe('apiKeyValidation persist rules', () => {
  it('rejects masked and short keys', () => {
    expect(isMaskedOrEmptyApiKey('****')).toBe(true);
    expect(canPersistApiKeyValue('short')).toBe(false);
    expect(canPersistApiKeyValue('sk-valid-key-12345')).toBe(true);
  });

  it('rejects placeholder text', () => {
    expect(canPersistApiKeyValue('APIキーを入力')).toBe(false);
    expect(canPersistApiKeyValue('未設定の場合は参考推定')).toBe(false);
  });

  it('accepts twelve data url paste when long enough', () => {
    expect(
      canPersistTwelveDataApiKey(
        'https://api.twelvedata.com/quote?symbol=AAPL&apikey=abcd1234567890abcd1234567890ab',
      ),
    ).toBe(true);
  });
});
