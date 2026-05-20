import { describe, expect, it, vi } from 'vitest';

describe('runtimeEnvironment', () => {
  it('areNotificationsSupported is false when appOwnership is expo', async () => {
    vi.resetModules();
    vi.doMock('expo-constants', () => ({
      default: { appOwnership: 'expo' },
    }));
    const { areNotificationsSupported, isExpoGo } = await import(
      '../../src/utils/runtimeEnvironment'
    );
    expect(isExpoGo()).toBe(true);
    expect(areNotificationsSupported()).toBe(false);
    vi.doUnmock('expo-constants');
  });
});
