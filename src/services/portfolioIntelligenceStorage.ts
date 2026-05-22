import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  JOURNAL_ARCHIVE_AFTER_DAYS,
  MAX_JOURNAL_ENTRIES,
  MAX_PREDICTIONS,
} from '../constants/portfolioIntelligence';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type {
  AiJournalEntry,
  PortfolioIntelligenceState,
  TrackedPrediction,
} from '../types/portfolioIntelligence';

export function createDefaultPortfolioIntelligenceState(): PortfolioIntelligenceState {
  return {
    version: 1,
    journal: [],
    predictions: [],
    notificationIntel: [],
    journalArchiveSummaryJa: null,
    lastWeeklyReviewAt: null,
    privacyLocalOnly: true,
    updatedAt: new Date().toISOString(),
  };
}

function compressOldJournal(entries: AiJournalEntry[], nowMs: number): {
  kept: AiJournalEntry[];
  archiveSummary: string | null;
} {
  const cutoff = nowMs - JOURNAL_ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const old = entries.filter((e) => Date.parse(e.at) < cutoff);
  const recent = entries.filter((e) => Date.parse(e.at) >= cutoff);
  if (old.length === 0) {
    return { kept: entries.slice(-MAX_JOURNAL_ENTRIES), archiveSummary: null };
  }
  const summary = `過去${old.length}件のジャーナルを圧縮保存（${old[0]?.at.slice(0, 10)}〜）`;
  return {
    kept: recent.slice(-MAX_JOURNAL_ENTRIES),
    archiveSummary: summary,
  };
}

function trimPredictions(predictions: TrackedPrediction[]): TrackedPrediction[] {
  const sorted = [...predictions].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  return sorted.slice(0, MAX_PREDICTIONS);
}

export async function loadPortfolioIntelligenceState(): Promise<PortfolioIntelligenceState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.portfolioIntelligence);
    if (!raw) return createDefaultPortfolioIntelligenceState();
    const parsed = JSON.parse(raw) as PortfolioIntelligenceState;
    const nowMs = Date.now();
    const { kept, archiveSummary } = compressOldJournal(
      Array.isArray(parsed.journal) ? parsed.journal : [],
      nowMs,
    );
    return {
      version: 1,
      journal: kept,
      predictions: trimPredictions(Array.isArray(parsed.predictions) ? parsed.predictions : []),
      notificationIntel: Array.isArray(parsed.notificationIntel) ? parsed.notificationIntel : [],
      journalArchiveSummaryJa: archiveSummary ?? parsed.journalArchiveSummaryJa ?? null,
      lastWeeklyReviewAt: parsed.lastWeeklyReviewAt ?? null,
      privacyLocalOnly: parsed.privacyLocalOnly !== false,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return createDefaultPortfolioIntelligenceState();
  }
}

export async function savePortfolioIntelligenceState(
  state: PortfolioIntelligenceState,
): Promise<void> {
  const next: PortfolioIntelligenceState = {
    ...state,
    journal: state.journal.slice(-MAX_JOURNAL_ENTRIES),
    predictions: trimPredictions(state.predictions),
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.portfolioIntelligence, JSON.stringify(next));
}

export function clearPortfolioIntelligenceStateForTest(): void {
  void AsyncStorage.removeItem(STORAGE_KEYS.portfolioIntelligence);
}
