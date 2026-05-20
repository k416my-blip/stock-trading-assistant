import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  APP_STATE_PERSISTENCE_VERSION,
  isPersistedAppStateCorrupt,
  isPersistedAppStateEnvelope,
  verifyPersistedAppStateChecksum,
} from './appStatePersistence';
import { computeIntegrityHash, verifyIntegrityHash } from './integrityHash';
import {
  loadHealthyPortfolioSnapshot,
  verifyPortfolioChecksum,
} from './portfolioSnapshot';
import type { ExecutionJournalStore } from './executionJournalStorage';

export type TamperSeverity = 'none' | 'warning' | 'critical';

export type TamperFinding = {
  id: string;
  severity: TamperSeverity;
  messageJa: string;
};

export type TamperAssessment = {
  severity: TamperSeverity;
  findings: TamperFinding[];
  trustAppState: boolean;
  trustJournal: boolean;
  trustHealthySnapshot: boolean;
};

const JOURNAL_INTEGRITY_VERSION = 2;

type JournalEnvelopeV2 = {
  version: 2;
  savedAt: string;
  integrityHash: string;
  entries: ExecutionJournalStore['entries'];
};

function canReadStorage(): boolean {
  return typeof globalThis !== 'undefined' && 'window' in globalThis;
}

export async function assessPersistedTamper(): Promise<TamperAssessment> {
  const findings: TamperFinding[] = [];
  let severity: TamperSeverity = 'none';
  let trustAppState = true;
  let trustJournal = true;
  let trustHealthySnapshot = true;

  const bump = (level: TamperSeverity, finding: TamperFinding) => {
    findings.push(finding);
    if (level === 'critical') severity = 'critical';
    else if (level === 'warning' && severity === 'none') severity = 'warning';
  };

  if (!canReadStorage()) {
    return { severity: 'none', findings, trustAppState: true, trustJournal: true, trustHealthySnapshot: true };
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.appState);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isPersistedAppStateEnvelope(parsed)) {
        if (!verifyPersistedAppStateChecksum(parsed)) {
          trustAppState = false;
          bump('critical', {
            id: 'app-state-checksum',
            severity: 'critical',
            messageJa: 'アプリ状態のチェックサムが一致しません。手動編集または破損の可能性があります。',
          });
        }
        if (isPersistedAppStateCorrupt(parsed.state)) {
          trustAppState = false;
          bump('critical', {
            id: 'app-state-corrupt',
            severity: 'critical',
            messageJa: 'ポートフォリオデータが破損しています。',
          });
        }
        if (parsed.version !== APP_STATE_PERSISTENCE_VERSION) {
          bump('warning', {
            id: 'app-state-version',
            severity: 'warning',
            messageJa: `アプリ状態のスキーマ版本が想定と異なります（v${parsed.version}）。`,
          });
        }
      } else {
        bump('warning', {
          id: 'app-state-legacy',
          severity: 'warning',
          messageJa: '旧形式のアプリ状態が検出されました。移行処理を行います。',
        });
      }
    }
  } catch {
    trustAppState = false;
    bump('critical', {
      id: 'app-state-parse',
      severity: 'critical',
      messageJa: 'アプリ状態の読み込みに失敗しました。',
    });
  }

  try {
    const journalRaw = await AsyncStorage.getItem(STORAGE_KEYS.executionJournal);
    if (journalRaw) {
      const parsed = JSON.parse(journalRaw) as Record<string, unknown>;
      const journalVersion = parsed.version;
      const journalEntries = parsed.entries;
      if (journalVersion === JOURNAL_INTEGRITY_VERSION && Array.isArray(journalEntries)) {
        const body = { entries: journalEntries };
        const integrityHash = typeof parsed.integrityHash === 'string' ? parsed.integrityHash : '';
        if (!verifyIntegrityHash(body, integrityHash)) {
          trustJournal = false;
          bump('critical', {
            id: 'journal-integrity',
            severity: 'critical',
            messageJa: '執行ジャーナルの整合性検証に失敗しました。',
          });
        }
      } else if (journalVersion === 1 || Array.isArray(journalEntries)) {
        bump('warning', {
          id: 'journal-legacy',
          severity: 'warning',
          messageJa: '執行ジャーナルが旧形式です。次回保存時に整合性メタデータが付与されます。',
        });
      }
    }
  } catch {
    trustJournal = false;
    bump('warning', {
      id: 'journal-parse',
      severity: 'warning',
      messageJa: '執行ジャーナルの解析に失敗しました。',
    });
  }

  const snap = await loadHealthyPortfolioSnapshot();
  if (snap && snap.version === 2) {
    const activeManual = snap.portfolio.filter((p) => (p.shares ?? 0) > 0);
    const activePractice = snap.practicePortfolio.filter((p) => (p.shares ?? 0) > 0);
    if (activeManual.length > 0 && !verifyPortfolioChecksum(snap.portfolio, snap.manualChecksum)) {
      trustHealthySnapshot = false;
      bump('warning', {
        id: 'snapshot-manual-checksum',
        severity: 'warning',
        messageJa: '健全スナップショット（手動）のチェックサムが一致しません。',
      });
    }
    if (activePractice.length > 0 && !verifyPortfolioChecksum(snap.practicePortfolio, snap.practiceChecksum)) {
      trustHealthySnapshot = false;
      bump('warning', {
        id: 'snapshot-practice-checksum',
        severity: 'warning',
        messageJa: '健全スナップショット（練習）のチェックサムが一致しません。',
      });
    }
  }

  return {
    severity,
    findings,
    trustAppState,
    trustJournal,
    trustHealthySnapshot,
  };
}

export function wrapJournalWithIntegrity(
  entries: ExecutionJournalStore['entries'],
): JournalEnvelopeV2 {
  const body = { entries };
  return {
    version: JOURNAL_INTEGRITY_VERSION,
    savedAt: new Date().toISOString(),
    integrityHash: computeIntegrityHash(body),
    entries,
  };
}

export function parseJournalEnvelope(raw: string): {
  store: ExecutionJournalStore;
  integrityOk: boolean;
} {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const version = parsed.version;
  const entries = parsed.entries;
  if (version === JOURNAL_INTEGRITY_VERSION && Array.isArray(entries)) {
    const body = { entries };
    const integrityHash = typeof parsed.integrityHash === 'string' ? parsed.integrityHash : '';
    return {
      store: { version: 1, entries: entries as ExecutionJournalStore['entries'] },
      integrityOk: verifyIntegrityHash(body, integrityHash),
    };
  }
  if (version === 1 && Array.isArray(entries)) {
    return {
      store: { version: 1, entries: entries as ExecutionJournalStore['entries'] },
      integrityOk: true,
    };
  }
  return { store: { version: 1, entries: [] }, integrityOk: false };
}
