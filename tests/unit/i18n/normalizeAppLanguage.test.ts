import { describe, expect, it, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../../src/constants/storageKeys';
import {
  hasSavedAppLanguage,
  loadAppLanguage,
  saveAppLanguage,
} from '../../../src/services/appLanguageStorage';
import { normalizeAppLanguage } from '../../../src/types/appLanguage';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('normalizeAppLanguage', () => {
  it('maps zh variants to zh-Hans', () => {
    expect(normalizeAppLanguage('zh')).toBe('zh-Hans');
    expect(normalizeAppLanguage('zh-CN')).toBe('zh-Hans');
    expect(normalizeAppLanguage('zh-Hans')).toBe('zh-Hans');
    expect(normalizeAppLanguage('zh_Hans')).toBe('zh-Hans');
    expect(normalizeAppLanguage('chinese')).toBe('zh-Hans');
    expect(normalizeAppLanguage('simplified-chinese')).toBe('zh-Hans');
  });

  it('maps ja and en variants', () => {
    expect(normalizeAppLanguage('ja')).toBe('ja');
    expect(normalizeAppLanguage('ja-JP')).toBe('ja');
    expect(normalizeAppLanguage('en')).toBe('en');
    expect(normalizeAppLanguage('en-US')).toBe('en');
    expect(normalizeAppLanguage('en-MY')).toBe('en');
  });

  it('returns null for unsupported locales', () => {
    expect(normalizeAppLanguage('fr')).toBeNull();
    expect(normalizeAppLanguage('')).toBeNull();
    expect(normalizeAppLanguage(null)).toBeNull();
  });
});

describe('appLanguageStorage with normalization', () => {
  beforeEach(() => {
    vi.mocked(AsyncStorage.getItem).mockReset();
    vi.mocked(AsyncStorage.setItem).mockReset();
  });

  it('returns null when language is not saved', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    expect(await loadAppLanguage()).toBeNull();
    expect(await hasSavedAppLanguage()).toBe(false);
  });

  it('loads zh-Hans when storage contains zh-CN', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('zh-CN');
    expect(await loadAppLanguage()).toBe('zh-Hans');
  });

  it('saves zh-Hans when asked to save zh-CN', async () => {
    await saveAppLanguage('zh-Hans');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.appLanguage, 'zh-Hans');
  });

  it('rejects unknown stored values', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('fr');
    expect(await loadAppLanguage()).toBeNull();
  });
});

describe('changeAppLanguage zh normalization', () => {
  it('changeAppLanguage(zh-CN) sets app language and i18n to zh-Hans', async () => {
    const { changeAppLanguage, getCurrentAppLanguage, initI18n, i18n } = await import(
      '../../../src/i18n'
    );
    await initI18n('ja');
    await changeAppLanguage('zh-CN');
    expect(getCurrentAppLanguage()).toBe('zh-Hans');
    expect(i18n.language).toBe('zh-Hans');
    expect(i18n.t('navigation:tab.home')).toBe('首页');
    expect(i18n.t('home:todayAiAdvice.title')).toBe('今日AI建议');
  });
});
