import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { HumanRiskOverride, PortfolioReplayPoint } from '../types/portfolioRiskExposure';

export type PortfolioRiskExposurePersisted = {
  version: 1;
  humanOverride: HumanRiskOverride;
  allocationHistory: PortfolioReplayPoint[];
};

export function defaultPortfolioRiskExposureState(): PortfolioRiskExposurePersisted {
  return {
    version: 1,
    humanOverride: {
      maxExposurePct: null,
      sectorCapPct: null,
      leverageCap: null,
    },
    allocationHistory: [],
  };
}

export async function loadPortfolioRiskExposureState(): Promise<PortfolioRiskExposurePersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.portfolioRiskExposure);
    if (!raw) return defaultPortfolioRiskExposureState();
    const parsed = JSON.parse(raw) as Partial<PortfolioRiskExposurePersisted>;
    return {
      version: 1,
      humanOverride: {
        maxExposurePct: parsed.humanOverride?.maxExposurePct ?? null,
        sectorCapPct: parsed.humanOverride?.sectorCapPct ?? null,
        leverageCap: parsed.humanOverride?.leverageCap ?? null,
      },
      allocationHistory: Array.isArray(parsed.allocationHistory)
        ? parsed.allocationHistory.slice(-40)
        : [],
    };
  } catch {
    return defaultPortfolioRiskExposureState();
  }
}

export async function savePortfolioRiskExposureState(
  state: PortfolioRiskExposurePersisted,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.portfolioRiskExposure, JSON.stringify(state));
}

export function appendAllocationHistory(
  history: PortfolioReplayPoint[],
  point: PortfolioReplayPoint,
): PortfolioReplayPoint[] {
  const last = history[history.length - 1];
  if (
    last &&
    last.qualityScore === point.qualityScore &&
    Math.abs(last.cashRatioPct - point.cashRatioPct) < 2
  ) {
    return history;
  }
  return [...history, point].slice(-40);
}

export async function updateHumanRiskOverride(
  patch: Partial<HumanRiskOverride>,
): Promise<HumanRiskOverride> {
  const loaded = await loadPortfolioRiskExposureState();
  const next = { ...loaded.humanOverride, ...patch };
  await savePortfolioRiskExposureState({ ...loaded, humanOverride: next });
  return next;
}
