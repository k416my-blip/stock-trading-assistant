import type { AppState, ManualOrderItem, PortfolioPosition, UserSettings } from '../types';
import type { ExecutionJournalEntry } from '../types/execution';
import { computeIntegrityHash, verifyIntegrityHash } from './integrityHash';
import { isPortfolioStructurallyCorrupt } from './portfolioSnapshot';
import { parseJournalEnvelope } from './tamperDetection';

export const PERSONAL_BACKUP_FORMAT_VERSION = 1 as const;

export type PersonalBackupPayload = {
  portfolio: PortfolioPosition[];
  practicePortfolio: PortfolioPosition[];
  manualOrderList: ManualOrderItem[];
  settings: UserSettings;
  executionJournalEntries: ExecutionJournalEntry[];
  trades: AppState['trades'];
  practiceTrades: AppState['practice']['trades'];
};

export type PersonalBackupEnvelope = {
  formatVersion: typeof PERSONAL_BACKUP_FORMAT_VERSION;
  appVersion: string;
  exportedAt: string;
  integrityHash: string;
  payload: PersonalBackupPayload;
};

export type BackupValidationResult = {
  valid: boolean;
  corrupt: boolean;
  warnings: string[];
  envelope: PersonalBackupEnvelope | null;
};

/** Matches app.json expo.version — no Node fs in runtime. */
const FALLBACK_APP_VERSION = '1.0.0';

export function getAppVersionLabel(): string {
  try {
    // Lazy require keeps Vitest from loading React Native; works in Expo Android/iOS.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default as {
      expoConfig?: { version?: string };
      manifest?: { version?: string };
    };
    return (
      Constants.expoConfig?.version ??
      Constants.manifest?.version ??
      FALLBACK_APP_VERSION
    );
  } catch {
    return FALLBACK_APP_VERSION;
  }
}

export function buildPersonalBackupEnvelope(state: AppState, journalEntries: ExecutionJournalEntry[]): PersonalBackupEnvelope {
  const payload: PersonalBackupPayload = {
    portfolio: state.portfolio,
    practicePortfolio: state.practice.portfolio,
    manualOrderList: state.manualOrderList,
    settings: state.settings,
    executionJournalEntries: journalEntries,
    trades: state.trades,
    practiceTrades: state.practice.trades,
  };
  return {
    formatVersion: PERSONAL_BACKUP_FORMAT_VERSION,
    appVersion: getAppVersionLabel(),
    exportedAt: new Date().toISOString(),
    integrityHash: computeIntegrityHash(payload),
    payload,
  };
}

export function exportPersonalBackupJson(state: AppState, journalEntries: ExecutionJournalEntry[]): string {
  return JSON.stringify(buildPersonalBackupEnvelope(state, journalEntries), null, 2);
}

export function validatePersonalBackupJson(raw: string): BackupValidationResult {
  const warnings: string[] = [];
  try {
    const parsed = JSON.parse(raw) as PersonalBackupEnvelope;
    if (parsed.formatVersion !== PERSONAL_BACKUP_FORMAT_VERSION) {
      warnings.push(`未対応のバックアップ形式 v${String(parsed.formatVersion)}`);
      return { valid: false, corrupt: true, warnings, envelope: null };
    }
    if (!parsed.payload || typeof parsed.integrityHash !== 'string') {
      warnings.push('バックアップ構造が不完全です');
      return { valid: false, corrupt: true, warnings, envelope: null };
    }
    const integrityOk = verifyIntegrityHash(parsed.payload, parsed.integrityHash);
    if (!integrityOk) {
      warnings.push('整合性ハッシュが一致しません（手動編集または破損の可能性）');
      return { valid: false, corrupt: true, warnings, envelope: parsed };
    }
    if (isPortfolioStructurallyCorrupt(parsed.payload.portfolio)) {
      warnings.push('手動ポートフォリオに構造破損があります');
    }
    if (isPortfolioStructurallyCorrupt(parsed.payload.practicePortfolio)) {
      warnings.push('練習ポートフォリオに構造破損があります');
    }
    const journalProbe = JSON.stringify({
      version: 2,
      savedAt: parsed.exportedAt,
      integrityHash: computeIntegrityHash({ entries: parsed.payload.executionJournalEntries }),
      entries: parsed.payload.executionJournalEntries,
    });
    const { integrityOk: journalOk } = parseJournalEnvelope(journalProbe);
    if (!journalOk && parsed.payload.executionJournalEntries.length > 0) {
      warnings.push('執行ジャーナルデータに注意が必要です');
    }
    return {
      valid: warnings.length === 0,
      corrupt: !integrityOk,
      warnings,
      envelope: parsed,
    };
  } catch {
    return {
      valid: false,
      corrupt: true,
      warnings: ['JSONの解析に失敗しました'],
      envelope: null,
    };
  }
}

export function applyPersonalBackupToState(
  current: AppState,
  envelope: PersonalBackupEnvelope,
): AppState {
  const p = envelope.payload;
  return {
    ...current,
    settings: { ...current.settings, ...p.settings },
    portfolio: p.portfolio,
    practice: {
      ...current.practice,
      portfolio: p.practicePortfolio,
      trades: p.practiceTrades,
    },
    manualOrderList: p.manualOrderList,
    trades: p.trades,
  };
}
