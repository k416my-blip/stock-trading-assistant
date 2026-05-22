import AsyncStorage from '@react-native-async-storage/async-storage';
import { STRATEGY_COOLDOWN_MS, STRATEGY_MAX_ACTION_PROPOSALS_PER_WINDOW } from '../constants/strategyExecution';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { StrategyAction, StrategyJournalEntry } from '../types/strategyExecution';

export type StrategyCooldownEntry = {
  at: string;
  symbol: string;
  action: StrategyAction;
};

export type StrategyExecutionPersisted = {
  version: 1;
  journal: StrategyJournalEntry[];
  cooldownLog: StrategyCooldownEntry[];
};

export function defaultStrategyExecutionState(): StrategyExecutionPersisted {
  return { version: 1, journal: [], cooldownLog: [] };
}

export async function loadStrategyExecutionState(): Promise<StrategyExecutionPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.strategyExecution);
    if (!raw) return defaultStrategyExecutionState();
    const parsed = JSON.parse(raw) as Partial<StrategyExecutionPersisted>;
    return {
      version: 1,
      journal: Array.isArray(parsed.journal) ? parsed.journal.slice(-30) : [],
      cooldownLog: Array.isArray(parsed.cooldownLog) ? parsed.cooldownLog.slice(-20) : [],
    };
  } catch {
    return defaultStrategyExecutionState();
  }
}

export async function saveStrategyExecutionState(state: StrategyExecutionPersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.strategyExecution, JSON.stringify(state));
}

export async function appendStrategyJournalEntry(
  entry: Omit<StrategyJournalEntry, 'id'>,
): Promise<void> {
  const state = await loadStrategyExecutionState();
  state.journal.unshift({
    ...entry,
    id: `sj-${Date.now()}`,
  });
  state.journal = state.journal.slice(0, 40);
  await saveStrategyExecutionState(state);
}

export function isStrategyCooldownActive(
  log: StrategyCooldownEntry[],
  nowMs = Date.now(),
): { active: boolean; noteJa: string | null } {
  const recent = log.filter((e) => nowMs - Date.parse(e.at) < STRATEGY_COOLDOWN_MS);
  const actionCount = recent.filter((e) => e.action === 'buy' || e.action === 'reduce').length;
  if (actionCount >= STRATEGY_MAX_ACTION_PROPOSALS_PER_WINDOW) {
    return {
      active: true,
      noteJa: `45分以内の売買提案が${actionCount}件 — 新規アクション提案を抑制`,
    };
  }
  return { active: false, noteJa: null };
}

export async function recordStrategyCooldownProposal(
  symbol: string,
  action: StrategyAction,
): Promise<void> {
  if (action !== 'buy' && action !== 'reduce') return;
  const state = await loadStrategyExecutionState();
  state.cooldownLog.push({ at: new Date().toISOString(), symbol, action });
  state.cooldownLog = state.cooldownLog.slice(-20);
  await saveStrategyExecutionState(state);
}
