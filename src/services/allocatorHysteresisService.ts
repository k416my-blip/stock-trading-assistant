import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HYSTERESIS_CHALLENGER_PERIODS,
  HYSTERESIS_EMA_ALPHA,
  HYSTERESIS_SCORE_MARGIN,
  MIN_ALLOCATOR_HOLDING_DAYS,
  MIN_REGIME_HOLDING_DAYS,
} from '../constants/governance';
import { ENSEMBLE_ALLOCATOR_LABEL } from '../constants/metaAllocation';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { MarketRegimeId } from '../types/marketRegime';
import type { AllocatorHysteresisResult } from '../types/governance';
import type { EnsembleAllocatorId, MetaAllocationReport } from '../types/metaAllocation';

type PersistedState = {
  activeAllocator: EnsembleAllocatorId;
  activeSince: string;
  regimeIdAtActivation: MarketRegimeId;
  challengerId: EnsembleAllocatorId | null;
  challengerStreak: number;
  smoothedScores: Record<EnsembleAllocatorId, number>;
  lastRegimeChangeAt: string;
};

const MS_DAY = 24 * 60 * 60 * 1000;

async function loadState(): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.governanceState);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

async function saveState(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.governanceState, JSON.stringify(state));
}

function updateSmoothedScores(
  prev: Record<EnsembleAllocatorId, number>,
  allocators: MetaAllocationReport['allocators'],
): Record<EnsembleAllocatorId, number> {
  const next = { ...prev };
  for (const a of allocators) {
    const raw = a.modelScore;
    const old = next[a.allocatorId] ?? raw;
    next[a.allocatorId] = Math.round(
      (HYSTERESIS_EMA_ALPHA * raw + (1 - HYSTERESIS_EMA_ALPHA) * old) * 10,
    ) / 10;
  }
  return next;
}

/** ヒステリシス — 複数期間チャレンジャー優位でなければ切替しない */
export async function applyAllocatorHysteresis(params: {
  meta: MetaAllocationReport;
  regimeId: MarketRegimeId;
}): Promise<AllocatorHysteresisResult> {
  const rawRecommended = params.meta.regimeSelection.primaryAllocator;
  let state = await loadState();
  const now = Date.now();

  if (!state) {
    state = {
      activeAllocator: rawRecommended,
      activeSince: new Date().toISOString(),
      regimeIdAtActivation: params.regimeId,
      challengerId: null,
      challengerStreak: 0,
      smoothedScores: {} as Record<EnsembleAllocatorId, number>,
      lastRegimeChangeAt: new Date().toISOString(),
    };
  }

  if (state.regimeIdAtActivation !== params.regimeId) {
    const regimeHoldMs = now - new Date(state.lastRegimeChangeAt).getTime();
    if (regimeHoldMs >= MIN_REGIME_HOLDING_DAYS * MS_DAY) {
      state.lastRegimeChangeAt = new Date().toISOString();
      state.regimeIdAtActivation = params.regimeId;
    }
  }

  state.smoothedScores = updateSmoothedScores(state.smoothedScores, params.meta.allocators);

  const activeScore = state.smoothedScores[state.activeAllocator] ?? 50;
  const challengerScore = state.smoothedScores[rawRecommended] ?? 50;
  const holdMs = now - new Date(state.activeSince).getTime();
  const holdingDaysRemaining = Math.max(
    0,
    Math.ceil((MIN_ALLOCATOR_HOLDING_DAYS * MS_DAY - holdMs) / MS_DAY),
  );
  const switchAllowed = holdMs >= MIN_ALLOCATOR_HOLDING_DAYS * MS_DAY;

  let switched = false;
  const previousActive = state.activeAllocator;

  if (rawRecommended !== state.activeAllocator) {
    if (challengerScore >= activeScore + HYSTERESIS_SCORE_MARGIN) {
      if (state.challengerId === rawRecommended) {
        state.challengerStreak += 1;
      } else {
        state.challengerId = rawRecommended;
        state.challengerStreak = 1;
      }
    } else {
      state.challengerId = null;
      state.challengerStreak = 0;
    }

    if (
      switchAllowed &&
      state.challengerStreak >= HYSTERESIS_CHALLENGER_PERIODS &&
      state.challengerId === rawRecommended
    ) {
      state.activeAllocator = rawRecommended;
      state.activeSince = new Date().toISOString();
      state.challengerId = null;
      state.challengerStreak = 0;
      switched = true;
    }
  } else {
    state.challengerId = null;
    state.challengerStreak = 0;
  }

  await saveState(state);

  const smoothedScores = (
    Object.entries(state.smoothedScores) as [EnsembleAllocatorId, number][]
  ).map(([allocatorId, score]) => ({ allocatorId, score }));

  return {
    rawRecommended,
    governedActive: state.activeAllocator,
    previousActive: switched ? previousActive : null,
    switched,
    switchAllowed,
    holdingDaysRemaining,
    challengerStreak: state.challengerStreak,
    smoothedScores,
    noteJa: switched
      ? `${ENSEMBLE_ALLOCATOR_LABEL[previousActive]}→${ENSEMBLE_ALLOCATOR_LABEL[state.activeAllocator]}（${HYSTERESIS_CHALLENGER_PERIODS}期連続優位）`
      : rawRecommended !== state.activeAllocator
        ? `ヒステリシス保持: ${ENSEMBLE_ALLOCATOR_LABEL[state.activeAllocator]}（残${holdingDaysRemaining}日）`
        : `現行 ${ENSEMBLE_ALLOCATOR_LABEL[state.activeAllocator]} を維持`,
  };
}

export async function clearGovernanceState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.governanceState);
}
