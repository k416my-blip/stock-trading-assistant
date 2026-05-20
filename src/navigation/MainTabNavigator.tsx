import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AllocationPlanScreen } from '../screens/AllocationPlanScreen';
import { BeginnerGuideScreen } from '../screens/BeginnerGuideScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PortfolioScreen } from '../screens/PortfolioScreen';
import { ScreenerScreen } from '../screens/ScreenerScreen';
import { TradeHistoryScreen } from '../screens/TradeHistoryScreen';
import { HeaderUrgencyBadge } from '../components/HeaderUrgencyBadge';
import { theme } from '../theme';
import { TabBarIcon } from './tabIcons';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_TITLES: Record<keyof MainTabParamList, string> = {
  Home: 'ホーム',
  AllocationPlan: 'おすすめ配分',
  Screener: '銘柄検索',
  Portfolio: '保有銘柄',
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="AllocationPlan" component={AllocationPlanScreen} />
      <Tab.Screen name="Screener" component={ScreenerScreen} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="History" component={TradeHistoryScreen} />
      <Tab.Screen name="BeginnerGuide" component={BeginnerGuideScreen} />
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
});
