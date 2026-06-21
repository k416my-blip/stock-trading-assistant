import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BeginnerOnboardingModal } from '../components/beginner/BeginnerOnboardingModal';
import { HeaderUrgencyBadge } from '../components/HeaderUrgencyBadge';
import { wrapBursaScreen } from '../components/BursaDataErrorBoundary';
import { useAppUxMode } from '../context/AppUxModeContext';
import { useAppLanguage } from '../context/AppLanguageContext';
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
import {
  loadBeginnerOnboardingSeen,
  markBeginnerOnboardingSeen,
} from '../services/beginner/beginnerOnboardingStorage';
import { TabBarIcon } from './tabIcons';
import type { MainTabParamList } from './types';
import { useTranslation } from 'react-i18next';

const Tab = createBottomTabNavigator<MainTabParamList>();

const LazyHomeScreen = lazy(() => import('../screens/HomeScreen').then((m) => ({ default: m.HomeScreen })));
const LazyScreenerScreen = lazy(() => import('../screens/ScreenerScreen').then((m) => ({ default: m.ScreenerScreen })));
const LazyTradeHistoryScreen = lazy(() =>
  import('../screens/TradeHistoryScreen').then((m) => ({ default: m.TradeHistoryScreen })),
);
const LazyBeginnerGuideScreen = lazy(() =>
  import('../screens/BeginnerGuideScreen').then((m) => ({ default: m.BeginnerGuideScreen })),
);
const LazySettingsScreen = lazy(() =>
  import('../screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
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

function lazyScreen(Component: ComponentType, titleKey: string) {
  return function LazyTabScreen() {
    const { t } = useTranslation();
    const title = t(titleKey);
    return (
      <Suspense fallback={<TabScreenFallback title={title} />}>
        <Component />
      </Suspense>
    );
  };
}

function lazyBursaScreen(
  Component: ComponentType,
  titleKey: string,
  screen: Parameters<typeof wrapBursaScreen>[0],
  fallbackJa: string,
) {
  const Wrapped = wrapBursaScreen(screen, Component, fallbackJa);
  return lazyScreen(Wrapped, titleKey);
}

const HomeTabScreen = lazyScreen(LazyHomeScreen, 'navigation:tab.home');
const AllocationPlanTabScreen = AllocationPlanScreen;
const ScreenerTabScreen = lazyScreen(LazyScreenerScreen, 'navigation:tab.screener');
const PortfolioTabScreen = PortfolioScreen;
const AssetManagementTabScreen = lazyBursaScreen(
  LazyAssetManagementScreen,
  'navigation:tab.assetManagement',
  'AssetManagement',
  ASSET_MGMT_MISSING_JA,
);
const TodayTradingTabScreen = lazyBursaScreen(
  LazyTodayTradingScreen,
  'navigation:tab.todayTrading',
  'TodayTrading',
  TODAY_TRADING_MISSING_JA,
);
const MarketMonitoringTabScreen = lazyBursaScreen(
  LazyMarketMonitoringScreen,
  'navigation:tab.marketMonitoring',
  'MarketMonitoring',
  MONITORING_MISSING_JA,
);
const AiNotificationsTabScreen = lazyBursaScreen(
  LazyAiNotificationsScreen,
  'navigation:tab.aiNotifications',
  'AiNotifications',
  CONCIERGE_NOTIFY_MISSING_JA,
);
const MaterialAnalysisTabScreen = lazyBursaScreen(
  LazyMaterialAnalysisScreen,
  'navigation:tab.materialAnalysis',
  'MaterialAnalysis',
  MATERIAL_ANALYSIS_MISSING_JA,
);
const HistoryTabScreen = lazyScreen(LazyTradeHistoryScreen, 'navigation:tab.history');
const BeginnerGuideTabScreen = lazyScreen(LazyBeginnerGuideScreen, 'navigation:tab.beginnerGuide');
const SettingsTabScreen = lazyScreen(LazySettingsScreen, 'navigation:tab.settings');
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
  { name: 'Settings', component: SettingsTabScreen },
];

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;
  const { appUxMode, ready, isBeginnerMode } = useAppUxMode();
  const { appLanguage, languageRevision } = useAppLanguage();
  const { i18n } = useTranslation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const activeLanguage = i18n.language;

  useEffect(() => {
    if (!ready || !isBeginnerMode) {
      setShowOnboarding(false);
      return;
    }
    let mounted = true;
    void (async () => {
      const seen = await loadBeginnerOnboardingSeen();
      if (mounted && !seen) setShowOnboarding(true);
    })();
    return () => {
      mounted = false;
    };
  }, [ready, isBeginnerMode]);

  const completeOnboarding = () => {
    setShowOnboarding(false);
    void markBeginnerOnboardingSeen();
  };

  return (
    <>
    <Tab.Navigator
      key={`${appLanguage}-${languageRevision}-${activeLanguage}`}
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
    <BeginnerOnboardingModal visible={showOnboarding} onComplete={completeOnboarding} />
    </>
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
