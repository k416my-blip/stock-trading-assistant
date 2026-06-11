import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { lazy, Suspense, type ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderUrgencyBadge } from '../components/HeaderUrgencyBadge';
import { wrapBursaScreen } from '../components/BursaDataErrorBoundary';
import { CONCIERGE_NOTIFY_MISSING_JA } from '../services/bursa/bursaConciergeNotificationService';
import { MATERIAL_ANALYSIS_MISSING_JA } from '../services/bursa/bursaMaterialAnalysisService';
import { MONITORING_MISSING_JA } from '../services/bursa/bursaMarketMonitoringService';
import { TODAY_TRADING_MISSING_JA } from '../services/bursa/bursaTodayTradingService';
import { ASSET_MGMT_MISSING_JA } from '../services/bursa/bursaAssetManagementService';
import { AllocationPlanScreen } from '../screens/AllocationPlanScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import { theme } from '../theme';
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

const TAB_TITLES: Record<keyof MainTabParamList, string> = {
  Home: 'ホーム',
  AllocationPlan: 'おすすめ配分',
  Screener: '銘柄検索',
  Portfolio: '保有銘柄',
  AssetManagement: 'AI資産運用',
  TodayTrading: '今日の売買',
  MarketMonitoring: '市場監視',
  AiNotifications: 'AI通知',
  MaterialAnalysis: '材料分析',
  History: '売買履歴',
  BeginnerGuide: '初心者ガイド',
};

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

const HomeTabScreen = lazyScreen(LazyHomeScreen, TAB_TITLES.Home);
const AllocationPlanTabScreen = AllocationPlanScreen;
const ScreenerTabScreen = lazyScreen(LazyScreenerScreen, TAB_TITLES.Screener);
const PortfolioTabScreen = PortfolioScreen;
const AssetManagementTabScreen = lazyBursaScreen(
  LazyAssetManagementScreen,
  TAB_TITLES.AssetManagement,
  'AssetManagement',
  ASSET_MGMT_MISSING_JA,
);
const TodayTradingTabScreen = lazyBursaScreen(
  LazyTodayTradingScreen,
  TAB_TITLES.TodayTrading,
  'TodayTrading',
  TODAY_TRADING_MISSING_JA,
);
const MarketMonitoringTabScreen = lazyBursaScreen(
  LazyMarketMonitoringScreen,
  TAB_TITLES.MarketMonitoring,
  'MarketMonitoring',
  MONITORING_MISSING_JA,
);
const AiNotificationsTabScreen = lazyBursaScreen(
  LazyAiNotificationsScreen,
  TAB_TITLES.AiNotifications,
  'AiNotifications',
  CONCIERGE_NOTIFY_MISSING_JA,
);
const MaterialAnalysisTabScreen = lazyBursaScreen(
  LazyMaterialAnalysisScreen,
  TAB_TITLES.MaterialAnalysis,
  'MaterialAnalysis',
  MATERIAL_ANALYSIS_MISSING_JA,
);
const HistoryTabScreen = lazyScreen(LazyTradeHistoryScreen, TAB_TITLES.History);
const BeginnerGuideTabScreen = lazyScreen(LazyBeginnerGuideScreen, TAB_TITLES.BeginnerGuide);

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        title: TAB_TITLES[route.name],
        headerRight: () => <HeaderUrgencyBadge />,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarButton: TabBarButton,
        tabBarIcon: ({ focused, color, size }) => (
          <TabBarIcon
            routeName={route.name as keyof MainTabParamList}
            focused={focused}
            color={color}
            size={size}
          />
        ),
        tabBarLabel: TAB_TITLES[route.name],
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
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
      })}
    >
      <Tab.Screen name="Home" component={HomeTabScreen} />
      <Tab.Screen name="AllocationPlan" component={AllocationPlanTabScreen} />
      <Tab.Screen name="Screener" component={ScreenerTabScreen} />
      <Tab.Screen name="Portfolio" component={PortfolioTabScreen} />
      <Tab.Screen name="AssetManagement" component={AssetManagementTabScreen} />
      <Tab.Screen name="TodayTrading" component={TodayTradingTabScreen} />
      <Tab.Screen name="MarketMonitoring" component={MarketMonitoringTabScreen} />
      <Tab.Screen name="AiNotifications" component={AiNotificationsTabScreen} />
      <Tab.Screen name="MaterialAnalysis" component={MaterialAnalysisTabScreen} />
      <Tab.Screen name="History" component={HistoryTabScreen} />
      <Tab.Screen name="BeginnerGuide" component={BeginnerGuideTabScreen} />
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
