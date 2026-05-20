/**
 * トランザクション型ポートフォリオ更新 — 失敗時は last-known-good にロールバック
 */
import type { AppState, PortfolioPosition } from '../types';
import {
  countActiveHoldings,
  guardAppStateForPersistence,
  rejectEmptyPortfolioReplace,
  rejectInvalidPortfolioInput,
} from './portfolioPersistenceGuard';
import {
  ensurePortfolioIntegrity,
  mergePortfolioPriceUpdates,
  sanitizePortfolio,
} from './portfolioPriceUpdate';
import {
  isPortfolioStructurallyCorrupt,
  rollbackPortfolioSync,
  saveHealthyPortfolioLists,
} from './portfolioSnapshot';

export type PortfolioLedgerMode = 'manual' | 'practice';

export type PortfolioTransaction = {
  readonly baselineState: AppState;
  readonly mode: PortfolioLedgerMode;
  readonly baselinePortfolio: PortfolioPosition[];
  commit: (nextPortfolio: PortfolioPosition[]) => AppState;
  rollback: () => AppState;
};

function clonePortfolio(portfolio: PortfolioPosition[]): PortfolioPosition[] {
  return portfolio.map((p) => ({ ...p }));
}

function applyPortfolioToState(
  state: AppState,
  mode: PortfolioLedgerMode,
  portfolio: PortfolioPosition[],
): AppState {
  const safe = sanitizePortfolio(portfolio);
  if (mode === 'practice') {
    return { ...state, practice: { ...state.practice, portfolio: safe } };
  }
  return { ...state, portfolio: safe };
}

/** 価格同期・マージ前にスナップショットを確保 */
export function beginPortfolioTransaction(
  state: AppState,
  mode: PortfolioLedgerMode,
): PortfolioTransaction {
  const baselinePortfolio = clonePortfolio(
    mode === 'practice' ? state.practice.portfolio : state.portfolio,
  );

  return {
    baselineState: state,
    mode,
    baselinePortfolio,
    commit: (nextPortfolio: PortfolioPosition[]) => {
      const validated = rejectInvalidPortfolioInput(baselinePortfolio, nextPortfolio);
      const rolled = rollbackPortfolioSync(baselinePortfolio, validated);
      const nonEmpty = rejectEmptyPortfolioReplace(baselinePortfolio, rolled);
      const integrated = ensurePortfolioIntegrity(baselinePortfolio, nonEmpty);
      if (countActiveHoldings(integrated) > 0) {
        void saveHealthyPortfolioLists(
          mode === 'manual' ? integrated : state.portfolio,
          mode === 'practice' ? integrated : state.practice.portfolio,
        );
      }
      const withPortfolio = applyPortfolioToState(state, mode, integrated);
      return guardAppStateForPersistence(withPortfolio, state);
    },
    rollback: () => {
      if (isPortfolioStructurallyCorrupt(baselinePortfolio)) {
        return state;
      }
      return applyPortfolioToState(state, mode, baselinePortfolio);
    },
  };
}

/** 価格リフレッシュ結果をトランザクションで適用 */
export function applyPriceRefreshTransaction(
  state: AppState,
  mode: PortfolioLedgerMode,
  syncedPortfolio: PortfolioPosition[],
): AppState {
  const tx = beginPortfolioTransaction(state, mode);
  const baseline = tx.baselinePortfolio;

  try {
    const merged = mergePortfolioPriceUpdates(baseline, syncedPortfolio);
    let safe = ensurePortfolioIntegrity(baseline, merged);
    if (
      countActiveHoldings(safe) === 0 &&
      countActiveHoldings(baseline) > 0
    ) {
      safe = baseline;
    }
    return tx.commit(safe);
  } catch {
    return tx.rollback();
  }
}
