import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { lazy, Suspense, type ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderUrgencyBadge } from '../components/HeaderUrgencyBadge';
import { wrapBursaScreen } from '../components/BursaDataErrorBoundary';
import { useAppUxMode } from '../context/AppUxModeContext';
import { CONCIERGE_NOTIFY_MISSING_JA } from '../services/bursa/bursaConciergeNotificationService';
import { MATERIAL_ANALYSIS_MISSING_JA } from '../services/bursa/bursaMaterialAnalysisService';
import { MONITORING_MISSING_JA } from '../services/bursa/bursaMarketMonitoringService';
import { TODAY_TRADING_MISSING_JA } from '../services/bursa/bursaTodayTradingService';
import { ASSET_MGMT_MISSING_JA } from '../services/bursa/bursaAssetManagementService';
import { AllocationPlanScreen } from '../screens/AllocationPlanScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import { ConciergeTabScreen } from '../screens/ConciergeTabScreen';
import { theme } from '../theme';
import {
  isTabVisibleForAppUxMode,
  tabTitleForAppUxMode,
} from './beginnerTabNavigatorConfig';
import { TabBarIcon } from './tabIcons';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const LazyHomeScreen = lazy(() => import('../screens/HomeScreen').then((m) => ({ default: m.HomeScreen })));
const LazyScreenerScreen = lazy(() => import('../screens/ScreenerScreen').then((m) => ({ default: m.ScreenerScreen })));
const LazyTradeHistoryScreen = lazy(() =>
  import('../screens/TradeHistoryScreen').then((m) => ({ default: m.TradeHistoryScreen })),
);
const LazyBeginnerGuideScreen = lazy(() =>
  import('../screens/BeginnerGuideScreen').then((m) => ({ default: m.BeginnerGuideScreen })),
);
const LazyAssetManagementScreen = lazy(() =>
  import('../screens/AssetManagementScreen').then((m) => ({ default: m.AssetManagementScreen })),
);
const LazyTodayTradingScreen = lazy(() =>
  import('../screens/TodayTradingScreen').then((m) => ({ default: m.TodayTradingScreen })),
);
const LazyMarketMonitoringScreen = lazy(() =>
  import('../screens/MarketMonitoringScreen').then((m) => ({ default: m.MarketMonitoringScreen })),
);
const LazyAiNotificationsScreen = lazy(() =>
  import('../screens/AiNotificationsScreen').then((m) => ({ default: m.AiNotificationsScreen })),
);
const LazyMaterialAnalysisScreen = lazy(() =>
  import('../screens/MaterialAnalysisScreen').then((m) => ({ default: m.MaterialAnalysisScreen })),
);

function TabBarButton(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      android_ripple={{ color: `${theme.colors.primary}33` }}
      pressOpacity={0.7}
      style={[props.style, styles.tabButton]}
    />
  );
}

function TabScreenFallback({ title }: { title: string }) {
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackTitle}>{title}</Text>
    </View>
  );
}

function lazyScreen(Component: ComponentType, title: string) {
  return function LazyTabScreen() {
    return (
      <Suspense fallback={<TabScreenFallback title={title} />}>
        <Component />
      </Suspense>
    );
  };
}

function lazyBursaScreen(
  Component: ComponentType,
  title: string,
  screen: Parameters<typeof wrapBursaScreen>[0],
  fallbackJa: string,
) {
  const Wrapped = wrapBursaScreen(screen, Component, fallbackJa);
  return lazyScreen(Wrapped, title);
}

const HomeTabScreen = lazyScreen(LazyHomeScreen, 'ホーム');
const AllocationPlanTabScreen = AllocationPlanScreen;
const ScreenerTabScreen = lazyScreen(LazyScreenerScreen, '銘柄検索');
const PortfolioTabScreen = PortfolioScreen;
const AssetManagementTabScreen = lazyBursaScreen(
  LazyAssetManagementScreen,
  'AI資産運用',
  'AssetManagement',
  ASSET_MGMT_MISSING_JA,
);
const TodayTradingTabScreen = lazyBursaScreen(
  LazyTodayTradingScreen,
  '今日の売買',
  'TodayTrading',
  TODAY_TRADING_MISSING_JA,
);
const MarketMonitoringTabScreen = lazyBursaScreen(
  LazyMarketMonitoringScreen,
  '市場監視',
  'MarketMonitoring',
  MONITORING_MISSING_JA,
);
const AiNotificationsTabScreen = lazyBursaScreen(
  LazyAiNotificationsScreen,
  'AI通知',
  'AiNotifications',
  CONCIERGE_NOTIFY_MISSING_JA,
);
const MaterialAnalysisTabScreen = lazyBursaScreen(
  LazyMaterialAnalysisScreen,
  '材料分析',
  'MaterialAnalysis',
  MATERIAL_ANALYSIS_MISSING_JA,
);
const HistoryTabScreen = lazyScreen(LazyTradeHistoryScreen, '売買履歴');
const BeginnerGuideTabScreen = lazyScreen(LazyBeginnerGuideScreen, '初心者ガイド');
const ConciergeConsultTabScreen = ConciergeTabScreen;

type TabDefinition = {
  name: keyof MainTabParamList;
  component: ComponentType;
};

const ALL_TABS: TabDefinition[] = [
  { name: 'Home', component: HomeTabScreen },
  { name: 'AllocationPlan', component: AllocationPlanTabScreen },
  { name: 'Screener', component: ScreenerTabScreen },
  { name: 'Portfolio', component: PortfolioTabScreen },
  { name: 'AssetManagement', component: AssetManagementTabScreen },
  { name: 'TodayTrading', component: TodayTradingTabScreen },
  { name: 'MarketMonitoring', component: MarketMonitoringTabScreen },
  { name: 'AiNotifications', component: AiNotificationsTabScreen },
  { name: 'MaterialAnalysis', component: MaterialAnalysisTabScreen },
  { name: 'ConciergeConsult', component: ConciergeConsultTabScreen },
  { name: 'History', component: HistoryTabScreen },
  { name: 'BeginnerGuide', component: BeginnerGuideTabScreen },
];

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;
  const { appUxMode } = useAppUxMode();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const visible = isTabVisibleForAppUxMode(appUxMode, route.name);
        const title = tabTitleForAppUxMode(appUxMode, route.name);
        return {
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          title,
          headerRight: () => <HeaderUrgencyBadge />,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarButton: visible ? TabBarButton : () => null,
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon
              routeName={route.name as keyof MainTabParamList}
              focused={focused}
              color={color}
              size={size}
            />
          ),
          tabBarLabel: title,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: visible ? styles.tabItem : styles.tabItemHidden,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: 6,
            elevation: 8,
          },
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: theme.colors.background },
        };
      }}
    >
      {ALL_TABS.map(({ name, component }) => (
        <Tab.Screen key={name} name={name} component={component} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabItemHidden: {
    display: 'none',
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  fallbackTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
});
