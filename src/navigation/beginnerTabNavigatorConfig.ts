import type { AppUxMode } from '../types/appUxMode';
import type { MainTabParamList } from './types';

export const DEFAULT_TAB_TITLES: Record<keyof MainTabParamList, string> = {
  Home: 'ホーム',
  AllocationPlan: 'おすすめ配分',
  Screener: '銘柄検索',
  Portfolio: '保有銘柄',
  AssetManagement: 'AI資産運用',
  TodayTrading: '今日の売買',
  MarketMonitoring: '市場監視',
  AiNotifications: 'AI通知',
  MaterialAnalysis: '材料分析',
  ConciergeConsult: 'AI相談',
  History: '売買履歴',
  BeginnerGuide: '初心者ガイド',
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
  'AllocationPlan',
  'Screener',
  'TodayTrading',
  'History',
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
    return '銘柄チェック';
  }
  if (mode === 'standard' && routeName === 'MaterialAnalysis') {
    return '銘柄チェック';
  }
  return DEFAULT_TAB_TITLES[routeName];
}
