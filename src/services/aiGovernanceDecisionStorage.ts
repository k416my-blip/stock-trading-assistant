import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type {
  GovernanceAuditEntry,
  HumanGovernanceOverride,
} from '../types/aiGovernanceDecision';
import type { StrategyAction } from '../types/strategyExecution';

export type AiGovernancePersisted = {
  version: 1;
  humanOverride: HumanGovernanceOverride;
  auditTrail: GovernanceAuditEntry[];
  lastFinalDecision: StrategyAction | null;
  lastDecisionAt: string | null;
};

export function defaultAiGovernanceState(): AiGovernancePersisted {
  return {
    version: 1,
    humanOverride: { preferHold: false, noteJa: null, setAt: null },
    auditTrail: [],
    lastFinalDecision: null,
    lastDecisionAt: null,
  };
}

export async function loadAiGovernanceState(): Promise<AiGovernancePersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.aiGovernanceDecision);
    if (!raw) return defaultAiGovernanceState();
    const parsed = JSON.parse(raw) as Partial<AiGovernancePersisted>;
    return {
      version: 1,
      humanOverride: {
        preferHold: parsed.humanOverride?.preferHold === true,
        noteJa: parsed.humanOverride?.noteJa ?? null,
        setAt: parsed.humanOverride?.setAt ?? null,
      },
      auditTrail: Array.isArray(parsed.auditTrail) ? parsed.auditTrail.slice(-80) : [],
      lastFinalDecision: parsed.lastFinalDecision ?? null,
      lastDecisionAt: parsed.lastDecisionAt ?? null,
    };
  } catch {
    return defaultAiGovernanceState();
  }
}

export async function saveAiGovernanceState(state: AiGovernancePersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.aiGovernanceDecision, JSON.stringify(state));
}

export async function updateHumanGovernanceOverride(
  patch: Partial<HumanGovernanceOverride>,
): Promise<HumanGovernanceOverride> {
  const state = await loadAiGovernanceState();
  const next: HumanGovernanceOverride = {
    preferHold: patch.preferHold ?? state.humanOverride.preferHold,
    noteJa: patch.noteJa !== undefined ? patch.noteJa : state.humanOverride.noteJa,
    setAt: patch.preferHold !== undefined || patch.noteJa !== undefined ? new Date().toISOString() : state.humanOverride.setAt,
  };
  await saveAiGovernanceState({ ...state, humanOverride: next });
  return next;
}

export async function appendGovernanceAuditEntry(
  entry: Omit<GovernanceAuditEntry, 'id' | 'at'>,
): Promise<AiGovernancePersisted> {
  const state = await loadAiGovernanceState();
  const full: GovernanceAuditEntry = {
    id: `gov-${Date.now()}`,
    at: new Date().toISOString(),
    ...entry,
  };
  const auditTrail = [...state.auditTrail, full].slice(-80);
  const next: AiGovernancePersisted = {
    ...state,
    auditTrail,
    lastFinalDecision: entry.finalDecision,
    lastDecisionAt: full.at,
  };
  await saveAiGovernanceState(next);
  return next;
}

export function countRecentAuditFlips(trail: GovernanceAuditEntry[], windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  const recent = trail.filter((e) => new Date(e.at).getTime() >= cutoff);
  let flips = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].finalDecision !== recent[i - 1].finalDecision) flips += 1;
  }
  return flips;
}
