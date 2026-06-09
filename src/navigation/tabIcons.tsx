import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import type { MainTabParamList } from './types';

type IonName = ComponentProps<typeof Ionicons>['name'];

const TAB_ICON: Record<keyof MainTabParamList, { active: IonName; inactive: IonName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  AllocationPlan: { active: 'pie-chart', inactive: 'pie-chart-outline' },
  Screener: { active: 'search', inactive: 'search-outline' },
  Portfolio: { active: 'briefcase', inactive: 'briefcase-outline' },
  AssetManagement: { active: 'sparkles', inactive: 'sparkles-outline' },
  TodayTrading: { active: 'today', inactive: 'today-outline' },
  MarketMonitoring: { active: 'pulse', inactive: 'pulse-outline' },
  History: { active: 'time', inactive: 'time-outline' },
  BeginnerGuide: { active: 'book', inactive: 'book-outline' },
};

export function TabBarIcon({
  routeName,
  focused,
  color,
  size,
}: {
  routeName: keyof MainTabParamList;
  focused: boolean;
  color: string;
  size: number;
}) {
  const icons = TAB_ICON[routeName];
  const name = focused ? icons.active : icons.inactive;
  return (
    <View pointerEvents="none" accessible={false}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}
