import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/** E2E 専用 — 固定位置プローブから確実に画面遷移するための navigation ref */
export const e2eNavigationRef = createNavigationContainerRef<RootStackParamList>();

export function e2eNavigateToAllocationPlan(): void {
  try {
    if (!e2eNavigationRef.isReady()) return;
    // @ts-expect-error nested tab navigation via ref
    e2eNavigationRef.navigate('MainTabs', { screen: 'AllocationPlan' });
    e2eNavigationRef.dispatch(
      CommonActions.navigate({ name: 'MainTabs', params: { screen: 'AllocationPlan' } }),
    );
  } catch {
    // no-op（E2E プローブのため失敗は握りつぶす）
  }
}
