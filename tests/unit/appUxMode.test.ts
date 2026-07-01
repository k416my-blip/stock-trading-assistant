import { describe, expect, it } from 'vitest';
import {
  appUxModeToLegacyPrefs,
  migrateAppUxModeFromLegacy,
} from '../../src/services/appUxModeStorage';

describe('appUxModeStorage migration', () => {
  it('maps trust+beginner concierge to beginner', () => {
    expect(
      migrateAppUxModeFromLegacy({
        investmentDisplayMode: 'trust',
        conciergeUxMode: 'beginner',
      }),
    ).toBe('beginner');
  });

  it('maps pro or advanced concierge to pro', () => {
    expect(
      migrateAppUxModeFromLegacy({
        investmentDisplayMode: 'pro',
        conciergeUxMode: 'beginner',
      }),
    ).toBe('pro');
    expect(
      migrateAppUxModeFromLegacy({
        investmentDisplayMode: 'trust',
        conciergeUxMode: 'advanced',
      }),
    ).toBe('pro');
  });

  it('maps advanced concierge to pro even with beginner investment mode', () => {
    expect(
      migrateAppUxModeFromLegacy({
        investmentDisplayMode: 'beginner',
        conciergeUxMode: 'advanced',
      }),
    ).toBe('pro');
  });

  it('syncs legacy prefs when setting appUxMode', () => {
    expect(appUxModeToLegacyPrefs('beginner')).toMatchObject({
      conciergeUxMode: 'beginner',
      investmentDisplayMode: 'beginner',
    });
    expect(appUxModeToLegacyPrefs('standard')).toMatchObject({
      conciergeUxMode: 'beginner',
      investmentDisplayMode: 'trust',
    });
    expect(appUxModeToLegacyPrefs('pro')).toMatchObject({
      conciergeUxMode: 'advanced',
      investmentDisplayMode: 'pro',
    });
  });
});

describe('beginnerTabNavigatorConfig', () => {
  it('shows 4 tabs in beginner mode', async () => {
    const { visibleTabsForAppUxMode } = await import('../../src/navigation/beginnerTabNavigatorConfig');
    expect(visibleTabsForAppUxMode('beginner')).toEqual([
      'Home',
      'Portfolio',
      'MaterialAnalysis',
      'ConciergeConsult',
    ]);
  });

  it('shows 6 tabs in standard mode', async () => {
    const { visibleTabsForAppUxMode } = await import('../../src/navigation/beginnerTabNavigatorConfig');
    expect(visibleTabsForAppUxMode('standard')).toEqual([
      'Home',
      'Portfolio',
      'MaterialAnalysis',
      'ConciergeConsult',
      'AiNotifications',
      'Settings',
    ]);
  });

  it('renames AiNotifications tab for standard', async () => {
    const { initI18n, i18n } = await import('../../src/i18n');
    await initI18n('ja');
    const { tabTitleForAppUxMode } = await import('../../src/navigation/beginnerTabNavigatorConfig');
    expect(tabTitleForAppUxMode('standard', 'AiNotifications', i18n.t.bind(i18n))).toBe('通知');
  });

  it('renames MaterialAnalysis tab for beginner', async () => {
    const { initI18n, i18n } = await import('../../src/i18n');
    await initI18n('ja');
    const { tabTitleForAppUxMode } = await import('../../src/navigation/beginnerTabNavigatorConfig');
    expect(tabTitleForAppUxMode('beginner', 'MaterialAnalysis', i18n.t.bind(i18n))).toBe('銘柄チェック');
  });
});
