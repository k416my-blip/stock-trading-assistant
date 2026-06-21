import { describe, expect, it, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../../src/constants/storageKeys';
import {
  hasSavedAppLanguage,
  loadAppLanguage,
  saveAppLanguage,
} from '../../../src/services/appLanguageStorage';
import { APP_LANGUAGES } from '../../../src/types/appLanguage';
import { SUPPORTED_APP_LANGUAGES } from '../../../src/i18n/config';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('appLanguageStorage', () => {
  beforeEach(() => {
    vi.mocked(AsyncStorage.getItem).mockReset();
    vi.mocked(AsyncStorage.setItem).mockReset();
  });

  it('returns null when language is not saved', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    expect(await loadAppLanguage()).toBeNull();
    expect(await hasSavedAppLanguage()).toBe(false);
  });

  it('loads and saves supported locales', async () => {
    for (const language of APP_LANGUAGES) {
      vi.mocked(AsyncStorage.setItem).mockReset();
      await saveAppLanguage(language);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.appLanguage, language);
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(language);
      expect(await loadAppLanguage()).toBe(language);
      expect(await hasSavedAppLanguage()).toBe(true);
    }
  });

  it('rejects unknown stored values', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('fr');
    expect(await loadAppLanguage()).toBeNull();
    expect(await hasSavedAppLanguage()).toBe(false);
  });
});

describe('i18n config', () => {
  it('lists ja, en, zh-Hans with ja default', async () => {
    const { DEFAULT_APP_LANGUAGE } = await import('../../../src/i18n/config');
    expect(SUPPORTED_APP_LANGUAGES).toEqual(['ja', 'en', 'zh-Hans']);
    expect(DEFAULT_APP_LANGUAGE).toBe('ja');
  });
});
