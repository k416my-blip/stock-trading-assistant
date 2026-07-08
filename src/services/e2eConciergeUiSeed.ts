/**
 * E2E 実機UI seed — AsyncStorage + インメモリ（adb sqlite 非依存）
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const E2E_FORCE_EMPTY_TODAY_PROPOSALS_KEY = '@sta/e2e_force_empty_today_proposals';
export const E2E_FORCE_APP_UX_BEGINNER_KEY = '@sta/e2e_force_app_ux_beginner';
export const E2E_FORCE_ALLOCATION_ROUTE_KEY = '@sta/e2e_force_allocation_route';

let forceAllocationRoute = false;

export function setForceAllocationRoute(v: boolean): void {
  forceAllocationRoute = v;
}

export function isForceAllocationRoute(): boolean {
  return forceAllocationRoute;
}

export async function persistForceAllocationRoute(): Promise<void> {
  forceAllocationRoute = true;
  await AsyncStorage.setItem(E2E_FORCE_ALLOCATION_ROUTE_KEY, '1');
}

export async function consumeForceAllocationRoute(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(E2E_FORCE_ALLOCATION_ROUTE_KEY);
    if (raw === '1') {
      forceAllocationRoute = true;
      await AsyncStorage.removeItem(E2E_FORCE_ALLOCATION_ROUTE_KEY);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

let forceEmptyTodayProposals = false;

export function setForceEmptyTodayProposals(v: boolean): void {
  forceEmptyTodayProposals = v;
}

export function isForceEmptyTodayProposals(): boolean {
  return forceEmptyTodayProposals;
}

export async function persistForceEmptyTodayProposals(): Promise<void> {
  forceEmptyTodayProposals = true;
  await AsyncStorage.setItem(E2E_FORCE_EMPTY_TODAY_PROPOSALS_KEY, '1');
}

export async function persistForceAppUxBeginner(): Promise<void> {
  await AsyncStorage.setItem(E2E_FORCE_APP_UX_BEGINNER_KEY, '1');
}

export async function consumeE2eConciergeUiSeedsFromStorage(): Promise<{
  forceEmptyTodayProposals: boolean;
  forceAppUxBeginner: boolean;
}> {
  try {
    const [emptyRaw, beginnerRaw] = await Promise.all([
      AsyncStorage.getItem(E2E_FORCE_EMPTY_TODAY_PROPOSALS_KEY),
      AsyncStorage.getItem(E2E_FORCE_APP_UX_BEGINNER_KEY),
    ]);
    if (emptyRaw === '1') forceEmptyTodayProposals = true;
    return {
      forceEmptyTodayProposals: emptyRaw === '1',
      forceAppUxBeginner: beginnerRaw === '1',
    };
  } catch {
    return { forceEmptyTodayProposals: false, forceAppUxBeginner: false };
  }
}

export async function clearE2eConciergeUiSeedsFromStorage(): Promise<void> {
  forceEmptyTodayProposals = false;
  await Promise.all([
    AsyncStorage.removeItem(E2E_FORCE_EMPTY_TODAY_PROPOSALS_KEY),
    AsyncStorage.removeItem(E2E_FORCE_APP_UX_BEGINNER_KEY),
  ]);
}
