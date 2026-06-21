import type { AppUxMode } from '../types/appUxMode';
import type { MainTabParamList } from './types';
import { i18n } from '../i18n';

const TAB_TITLE_KEYS: Record<keyof MainTabParamList, string> = {
  Home: 'navigation:tab.home',
  AllocationPlan: 'navigation:tab.allocationPlan',
  Screener: 'navigation:tab.screener',
  Portfolio: 'navigation:tab.portfolio',
  AssetManagement: 'navigation:tab.assetManagement',
  TodayTrading: 'navigation:tab.todayTrading',
  MarketMonitoring: 'navigation:tab.marketMonitoring',
  AiNotifications: 'navigation:tab.aiNotifications',
  MaterialAnalysis: 'navigation:tab.materialAnalysis',
  ConciergeConsult: 'navigation:tab.conciergeConsult',
  History: 'navigation:tab.history',
  BeginnerGuide: 'navigation:tab.beginnerGuide',
  Settings: 'navigation:tab.settings',
};

const BEGINNER_TABS: (keyof MainTabParamList)[] = [
  'Home',
  'Portfolio',
  'MaterialAnalysis',
  'ConciergeConsult',
];

const STANDARD_TABS: (keyof MainTabParamList)[] = [
  'Home',
  'Portfolio',
  'MaterialAnalysis',
  'ConciergeConsult',
  'AiNotifications',
  'Settings',
];

const PRO_TABS: (keyof MainTabParamList)[] = [
  'Home',
  'AllocationPlan',
  'Screener',
  'Portfolio',
  'AssetManagement',
  'TodayTrading',
  'MarketMonitoring',
  'AiNotifications',
  'MaterialAnalysis',
  'ConciergeConsult',
  'History',
  'BeginnerGuide',
];

const VISIBLE_TABS_BY_MODE: Record<AppUxMode, readonly (keyof MainTabParamList)[]> = {
  beginner: BEGINNER_TABS,
  standard: STANDARD_TABS,
  pro: PRO_TABS,
};

export function visibleTabsForAppUxMode(mode: AppUxMode): readonly (keyof MainTabParamList)[] {
  return VISIBLE_TABS_BY_MODE[mode];
}

export function isTabVisibleForAppUxMode(mode: AppUxMode, routeName: keyof MainTabParamList): boolean {
  return VISIBLE_TABS_BY_MODE[mode].includes(routeName);
}

export function tabTitleForAppUxMode(mode: AppUxMode, routeName: keyof MainTabParamList): string {
  if (mode === 'beginner' && routeName === 'MaterialAnalysis') {
    return i18n.t('navigation:tab.stockCheck');
  }
  if (mode === 'standard' && routeName === 'MaterialAnalysis') {
    return i18n.t('navigation:tab.stockCheck');
  }
  if (mode === 'standard' && routeName === 'AiNotifications') {
    return i18n.t('navigation:tab.notifications');
  }
  return i18n.t(TAB_TITLE_KEYS[routeName]);
}
