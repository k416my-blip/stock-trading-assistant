import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { isDev } from '../utils/isDev';
import { recordDiagnosticEvent } from './structuredDiagnostics';
import { wrapAppStateForPersistence } from './appStatePersistence';
import { createDefaultAppState } from './storage';
import { wrapJournalWithIntegrity } from './tamperDetection';

function assertSimulationEnabled(): void {
  if (!isDev && process.env.NODE_ENV !== 'test') {
    throw new Error('Crash simulation is only available in development or test builds');
  }
}

export type CrashSimulationKind =
  | 'corrupt_app_state'
  | 'corrupt_journal'
  | 'invalid_json_app_state'
  | 'boot_interruption_marker';

/** 開発・テスト専用 — 保存データ破損シミュレーション */
export async function simulateStorageCorruption(kind: CrashSimulationKind): Promise<void> {
  assertSimulationEnabled();

  recordDiagnosticEvent({
    type: 'crash_simulation',
    severity: 'warning',
    module: 'crashSimulation',
    message: `Simulated: ${kind}`,
    recoveryAction: 'Restart app and verify recovery path',
  });

  switch (kind) {
    case 'corrupt_app_state': {
      const state = createDefaultAppState();
      const envelope = wrapAppStateForPersistence(state);
      await AsyncStorage.setItem(
        STORAGE_KEYS.appState,
        JSON.stringify({ ...envelope, checksum: 'simulated_corrupt' }),
      );
      break;
    }
    case 'invalid_json_app_state':
      await AsyncStorage.setItem(STORAGE_KEYS.appState, '{ not valid json');
      break;
    case 'corrupt_journal': {
      const envelope = wrapJournalWithIntegrity([]);
      await AsyncStorage.setItem(
        STORAGE_KEYS.executionJournal,
        JSON.stringify({ ...envelope, integrityHash: 'simulated_corrupt' }),
      );
      break;
    }
    case 'boot_interruption_marker':
      await AsyncStorage.setItem('@sta/sim_boot_interrupt_v1', new Date().toISOString());
      break;
    default:
      break;
  }
}

export async function clearCrashSimulationArtifacts(): Promise<void> {
  assertSimulationEnabled();
  await AsyncStorage.removeItem('@sta/sim_boot_interrupt_v1');
}

export function listCrashSimulationKinds(): CrashSimulationKind[] {
  return ['corrupt_app_state', 'corrupt_journal', 'invalid_json_app_state', 'boot_interruption_marker'];
}
