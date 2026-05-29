import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AppState, PortfolioPosition } from '../../types';

export type AppContextRefs = {
  stateRef: MutableRefObject<AppState>;
  lastPersistedRef: MutableRefObject<AppState | null>;
  blockEmptyBootPersistenceRef: MutableRefObject<string | null>;
  undoRemovalRef: MutableRefObject<{
    position: PortfolioPosition;
    ledger: 'manual' | 'practice';
  } | null>;
  initialPriceRefreshDone: MutableRefObject<boolean>;
};

export type AppStateApi = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
};
