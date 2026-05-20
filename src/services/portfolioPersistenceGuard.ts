import type { AppState, PortfolioPosition } from '../types';
import { countActiveHoldings } from '../utils/portfolioHoldings';
import { isPortfolioStructurallyCorrupt } from '../utils/portfolioIntegrity';

export { countActiveHoldings };

/**
 * 永続化前ガード — 有効な保有があったのに空配列・破損データで上書きしない
 */
export function guardAppStateForPersistence(next: AppState, previous: AppState): AppState {
  let guarded = next;

  const prevManual = countActiveHoldings(previous.portfolio);
  const nextManual = countActiveHoldings(guarded.portfolio);
  if (
    prevManual > 0 &&
    (nextManual === 0 ||
      !Array.isArray(guarded.portfolio) ||
      isPortfolioStructurallyCorrupt(guarded.portfolio))
  ) {
    guarded = { ...guarded, portfolio: previous.portfolio };
  }

  const prevPractice = countActiveHoldings(previous.practice.portfolio);
  const nextPractice = countActiveHoldings(guarded.practice.portfolio);
  if (
    prevPractice > 0 &&
    (nextPractice === 0 ||
      !Array.isArray(guarded.practice.portfolio) ||
      isPortfolioStructurallyCorrupt(guarded.practice.portfolio))
  ) {
    guarded = {
      ...guarded,
      practice: { ...guarded.practice, portfolio: previous.practice.portfolio },
    };
  }

  return guarded;
}

/** null / undefined / 非配列の incoming を拒否 */
export function rejectInvalidPortfolioInput(
  current: PortfolioPosition[],
  incoming: PortfolioPosition[] | null | undefined,
): PortfolioPosition[] {
  if (incoming == null || !Array.isArray(incoming)) {
    return current;
  }
  return incoming;
}

/** メモリ上のマージ — 空の同期結果で保有を消さない */
export function rejectEmptyPortfolioReplace(
  current: PortfolioPosition[],
  incoming: PortfolioPosition[] | null | undefined,
): PortfolioPosition[] {
  const safeIncoming = rejectInvalidPortfolioInput(current, incoming);
  const curActive = countActiveHoldings(current);
  const incActive = countActiveHoldings(safeIncoming);
  if (curActive > 0 && incActive === 0) {
    return current;
  }
  return safeIncoming;
}
