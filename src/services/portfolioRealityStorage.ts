import AsyncStorage from '@react-native-async-storage/async-storage';
import { REALITY_INITIAL_CAPITAL_MYR, REALITY_MAX_RECOMMENDATIONS } from '../constants/portfolioRealityValidation';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type {
  PaperPortfolio,
  PerformanceJournalDay,
  TrackedAiRecommendation,
} from '../types/portfolioRealityValidation';

export type RealityCalibrationState = {
  confidenceOffsetPct: number;
  highConfidenceMissStreak: number;
};

export type PortfolioRealityPersisted = {
  version: 1;
  paper: PaperPortfolio;
  recommendations: TrackedAiRecommendation[];
  journal: PerformanceJournalDay[];
  calibration: RealityCalibrationState;
  equityHistory: Array<{ at: string; valueMYR: number }>;
};

export function defaultRealityState(): PortfolioRealityPersisted {
  const now = new Date().toISOString();
  return {
    version: 1,
    paper: {
      startedAt: now,
      initialCapitalMYR: REALITY_INITIAL_CAPITAL_MYR,
      cashMYR: REALITY_INITIAL_CAPITAL_MYR,
      positions: [],
    },
    recommendations: [],
    journal: [],
    calibration: { confidenceOffsetPct: 0, highConfidenceMissStreak: 0 },
    equityHistory: [{ at: now, valueMYR: REALITY_INITIAL_CAPITAL_MYR }],
  };
}

export async function loadPortfolioRealityState(): Promise<PortfolioRealityPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.portfolioReality);
    if (!raw) return defaultRealityState();
    const parsed = JSON.parse(raw) as Partial<PortfolioRealityPersisted>;
    return {
      version: 1,
      paper: parsed.paper ?? defaultRealityState().paper,
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.slice(-REALITY_MAX_RECOMMENDATIONS)
        : [],
      journal: Array.isArray(parsed.journal) ? parsed.journal.slice(-60) : [],
      calibration: parsed.calibration ?? { confidenceOffsetPct: 0, highConfidenceMissStreak: 0 },
      equityHistory: Array.isArray(parsed.equityHistory)
        ? parsed.equityHistory.slice(-120)
        : [{ at: new Date().toISOString(), valueMYR: REALITY_INITIAL_CAPITAL_MYR }],
    };
  } catch {
    return defaultRealityState();
  }
}

export async function savePortfolioRealityState(state: PortfolioRealityPersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.portfolioReality, JSON.stringify(state));
}
