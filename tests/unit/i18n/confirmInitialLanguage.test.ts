import { describe, expect, it, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { confirmInitialAppLanguage } from '../../../src/services/appLanguageConfirm';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('confirmInitialAppLanguage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists ja when current language is already ja (first-run confirm)', async () => {
    const saveAppLanguage = vi.fn().mockResolvedValue(undefined);
    const changeAppLanguage = vi.fn().mockResolvedValue(undefined);

    const result = await confirmInitialAppLanguage('ja', 'ja', {
      saveAppLanguage,
      changeAppLanguage,
    });

    expect(result).toEqual({ ok: true, language: 'ja', languageChanged: false });
    expect(saveAppLanguage).toHaveBeenCalledWith('ja');
    expect(changeAppLanguage).not.toHaveBeenCalled();
  });

  it('saves and switches when language differs from current', async () => {
    const saveAppLanguage = vi.fn().mockResolvedValue(undefined);
    const changeAppLanguage = vi.fn().mockResolvedValue(undefined);

    const result = await confirmInitialAppLanguage('en', 'ja', {
      saveAppLanguage,
      changeAppLanguage,
    });

    expect(result).toEqual({ ok: true, language: 'en', languageChanged: true });
    expect(saveAppLanguage).toHaveBeenCalledWith('en');
    expect(changeAppLanguage).toHaveBeenCalledWith('en');
  });

  it('rejects invalid language tags', async () => {
    const saveAppLanguage = vi.fn();
    const changeAppLanguage = vi.fn();

    const result = await confirmInitialAppLanguage('fr' as 'ja', 'ja', {
      saveAppLanguage,
      changeAppLanguage,
    });

    expect(result).toEqual({ ok: false, error: 'invalid_language' });
    expect(saveAppLanguage).not.toHaveBeenCalled();
  });
});

describe('appLanguageStorage', () => {
  beforeEach(() => {
    vi.mocked(AsyncStorage.getItem).mockReset();
    vi.mocked(AsyncStorage.setItem).mockReset();
  });

  it('returns null when language is not saved', async () => {
    const { loadAppLanguage, hasSavedAppLanguage } = await import(
      '../../../src/services/appLanguageStorage'
    );
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    expect(await loadAppLanguage()).toBeNull();
    expect(await hasSavedAppLanguage()).toBe(false);
  });
});
