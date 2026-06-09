import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { TrustProfileTypeLabel } from '../constants/trustDisplay';
import type { AllocationPlan } from '../types';
import type { TrustExpectedRiskLevel } from './trustRecommendationSummary';

export type TrustPlanPreview = {
  depositMYR: number;
  allocationSummary: string;
  committeeApproved: boolean;
  expectedRiskLevel: TrustExpectedRiskLevel;
  totalAmountMYR: number;
  profileTypeLabel: TrustProfileTypeLabel;
  monthlyOneLinerJa: string;
  updatedAt: string;
};

export type TrustPlanSnapshot = TrustPlanPreview & {
  plan: AllocationPlan;
};

type StoredSnapshot = TrustPlanPreview & {
  plan: AllocationPlan;
};

export async function saveTrustPlanSnapshot(snapshot: TrustPlanSnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.trustPlanPreview, JSON.stringify(snapshot));
}

export async function loadTrustPlanSnapshot(): Promise<TrustPlanSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.trustPlanPreview);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSnapshot;
    if (!parsed || typeof parsed.depositMYR !== 'number' || !parsed.plan) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** @deprecated use loadTrustPlanSnapshot */
export async function loadTrustPlanPreview(): Promise<TrustPlanPreview | null> {
  const snapshot = await loadTrustPlanSnapshot();
  if (!snapshot) return null;
  const { plan: _plan, ...preview } = snapshot;
  return preview;
}

export async function clearTrustPlanPreviewForTest(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.trustPlanPreview);
}
