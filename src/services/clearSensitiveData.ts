import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_PLAIN_SECRET_KEYS } from '../constants/secretStorage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { clearAiChatHistory } from './aiChatHistoryStorage';
import { deleteAllSecrets } from './secretStorage';
import { resetExecutionJournalMemoryForTest } from './executionJournalStorage';
import { resetRecoveryAttemptCount } from './safeBoot';

/** ローカルの機密データをすべて削除（APIキー・ジャーナル・レガシー平文キー） */
export async function clearAllSensitiveLocalData(): Promise<void> {
  await deleteAllSecrets();
  resetExecutionJournalMemoryForTest();

  const legacyKeys = Object.values(LEGACY_PLAIN_SECRET_KEYS);
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEYS.executionJournal),
    ...legacyKeys.map((k) => AsyncStorage.removeItem(k)),
  ]);
  await clearAiChatHistory();

  await resetRecoveryAttemptCount();
}
