import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SELF_EVAL_MAX_CONTRADICTIONS,
  SELF_EVAL_MAX_JOURNAL,
} from '../constants/selfEvaluation';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { ContradictionRecord, LearningJournalEntry } from '../types/selfEvaluation';
import type { ReputationDomainId } from '../types/selfEvaluation';

export type ReputationPersisted = Record<
  ReputationDomainId,
  { hits: number; misses: number }
>;

export type SelfEvaluationPersisted = {
  version: 1;
  confidencePenaltyPct: number;
  highConfidenceMissStreak: number;
  dynamicAlertMultiplier: number;
  adaptiveConfidenceOffsetPct: number;
  notificationBudgetUsedToday: number;
  notificationBudgetDateKey: string;
  fatigueStrikeCount: number;
  lastNarrativeThemes: string[];
  contradictions: ContradictionRecord[];
  learningJournal: LearningJournalEntry[];
  reputation: ReputationPersisted;
  compressedLogCount: number;
  lastRegimeId: string | null;
  lastBuildAt: string | null;
};

function defaultReputation(): ReputationPersisted {
  return {
    macro: { hits: 0, misses: 0 },
    sentiment: { hits: 0, misses: 0 },
    earnings: { hits: 0, misses: 0 },
    technical: { hits: 0, misses: 0 },
  };
}

export function defaultSelfEvaluationState(): SelfEvaluationPersisted {
  const today = new Date().toISOString().slice(0, 10);
  return {
    version: 1,
    confidencePenaltyPct: 0,
    highConfidenceMissStreak: 0,
    dynamicAlertMultiplier: 1,
    adaptiveConfidenceOffsetPct: 0,
    notificationBudgetUsedToday: 0,
    notificationBudgetDateKey: today,
    fatigueStrikeCount: 0,
    lastNarrativeThemes: [],
    contradictions: [],
    learningJournal: [],
    reputation: defaultReputation(),
    compressedLogCount: 0,
    lastRegimeId: null,
    lastBuildAt: null,
  };
}

export async function loadSelfEvaluationState(): Promise<SelfEvaluationPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.selfEvaluation);
    if (!raw) return defaultSelfEvaluationState();
    const parsed = JSON.parse(raw) as Partial<SelfEvaluationPersisted>;
    const base = defaultSelfEvaluationState();
    return {
      version: 1,
      confidencePenaltyPct:
        typeof parsed.confidencePenaltyPct === 'number' ? parsed.confidencePenaltyPct : 0,
      highConfidenceMissStreak:
        typeof parsed.highConfidenceMissStreak === 'number'
          ? parsed.highConfidenceMissStreak
          : 0,
      dynamicAlertMultiplier:
        typeof parsed.dynamicAlertMultiplier === 'number' && parsed.dynamicAlertMultiplier > 0
          ? parsed.dynamicAlertMultiplier
          : 1,
      adaptiveConfidenceOffsetPct:
        typeof parsed.adaptiveConfidenceOffsetPct === 'number'
          ? parsed.adaptiveConfidenceOffsetPct
          : 0,
      notificationBudgetUsedToday:
        typeof parsed.notificationBudgetUsedToday === 'number'
          ? parsed.notificationBudgetUsedToday
          : 0,
      notificationBudgetDateKey:
        typeof parsed.notificationBudgetDateKey === 'string'
          ? parsed.notificationBudgetDateKey
          : base.notificationBudgetDateKey,
      fatigueStrikeCount:
        typeof parsed.fatigueStrikeCount === 'number' ? parsed.fatigueStrikeCount : 0,
      lastNarrativeThemes: Array.isArray(parsed.lastNarrativeThemes)
        ? parsed.lastNarrativeThemes.slice(-12)
        : [],
      contradictions: Array.isArray(parsed.contradictions)
        ? parsed.contradictions.slice(-SELF_EVAL_MAX_CONTRADICTIONS)
        : [],
      learningJournal: Array.isArray(parsed.learningJournal)
        ? parsed.learningJournal.slice(-SELF_EVAL_MAX_JOURNAL)
        : [],
      reputation: { ...defaultReputation(), ...(parsed.reputation ?? {}) },
      compressedLogCount:
        typeof parsed.compressedLogCount === 'number' ? parsed.compressedLogCount : 0,
      lastRegimeId: parsed.lastRegimeId ?? null,
      lastBuildAt: parsed.lastBuildAt ?? null,
    };
  } catch {
    return defaultSelfEvaluationState();
  }
}

export async function saveSelfEvaluationState(state: SelfEvaluationPersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.selfEvaluation, JSON.stringify(state));
}
