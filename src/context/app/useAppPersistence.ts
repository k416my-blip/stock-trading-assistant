import { useEffect } from 'react';
import { backupPortfolioIfNonEmpty } from '../../services/portfolioBackup';
import { countActiveHoldings, guardAppStateForPersistence } from '../../services/portfolioPersistenceGuard';
import { saveHealthyPortfolioSnapshot } from '../../services/portfolioSnapshot';
import { saveAppState } from '../../services/storage';
import { isDev } from '../../utils/isDev';
import type { AppContextRefs, AppStateApi } from './appContextShared';

type Params = AppStateApi &
  Pick<AppContextRefs, 'lastPersistedRef' | 'blockEmptyBootPersistenceRef'> & {
    loading: boolean;
  };

/** state 変更時の自動永続化 */
export function useAppPersistence({
  state,
  setState,
  loading,
  lastPersistedRef,
  blockEmptyBootPersistenceRef,
}: Params): void {
  useEffect(() => {
    if (loading) return;
    const previous = lastPersistedRef.current ?? state;
    const guarded = guardAppStateForPersistence(state, previous);
    if (guarded !== state) {
      setState(guarded);
    }
    const blockReason = blockEmptyBootPersistenceRef.current;
    const activeHoldings =
      countActiveHoldings(guarded.portfolio) +
      countActiveHoldings(guarded.practice.portfolio);
    if (blockReason && activeHoldings === 0) {
      if (isDev) {
        console.log('[portfolio-hydration] skipped empty boot persistence', {
          reason: blockReason,
          previousManual: countActiveHoldings(previous.portfolio),
          previousPractice: countActiveHoldings(previous.practice.portfolio),
        });
      }
      lastPersistedRef.current = guarded;
      return;
    }
    blockEmptyBootPersistenceRef.current = null;
    void saveAppState(guarded);
    void backupPortfolioIfNonEmpty(guarded);
    void saveHealthyPortfolioSnapshot(guarded);
    lastPersistedRef.current = guarded;
  }, [state, loading, setState, lastPersistedRef, blockEmptyBootPersistenceRef]);
}
