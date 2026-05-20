import { describe, expect, it } from 'vitest';
import { maskSecret, redactSecretsInString } from '../../src/utils/secretMask';
import { DUMMY_API_KEY_MASK } from '../helpers/dummyCredentials';

describe('secretMask', () => {
  it('masks long api keys with prefix', () => {
    const masked = maskSecret(DUMMY_API_KEY_MASK);
    expect(masked).toContain('****');
    expect(masked).toContain('ALUE');
    expect(masked).not.toContain('MASK_TEST_VALUE');
  });

  it('redacts apikey in strings', () => {
    const raw = 'apikey=supersecretkey12345678';
    const out = redactSecretsInString(raw);
    expect(out).not.toContain('supersecretkey12345678');
  });
});
