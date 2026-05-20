import type { AppState } from '../types';
import type {
  ExecutionReconciliationMismatch,
  ExecutionReconciliationReport,
} from '../types/execution';
import { IN_FLIGHT_ORDER_STATUSES } from '../constants/executionSafety';
import { loadExecutionJournal } from './executionJournalStorage';
import { safeShares } from '../utils/safeNumeric';

function journalNetShares(
  entries: Awaited<ReturnType<typeof loadExecutionJournal>>['entries'],
  ledgerMode: 'manual' | 'practice',
  market: string,
  symbol: string,
): number {
  let net = 0;
  for (const e of entries) {
    if (e.ledgerMode !== ledgerMode) continue;
    if (e.market !== market || e.symbol.toUpperCase() !== symbol.toUpperCase()) continue;
    if (e.status !== 'confirmed' && e.status !== 'partially_filled' && e.status !== 'reconciled') {
      continue;
    }
    const qty = e.filledQuantity ?? e.quantity;
    if (e.side === 'buy') net += qty;
    else net -= qty;
  }
  return net;
}

/** ジャーナルと保有の不一致を検出 */
export async function reconcileExecutionJournal(state: AppState): Promise<ExecutionReconciliationReport> {
  const journal = await loadExecutionJournal();
  const mismatches: ExecutionReconciliationMismatch[] = [];

  const hasUnresolvedPending = journal.entries.some((e) =>
    (IN_FLIGHT_ORDER_STATUSES as readonly string[]).includes(e.status),
  );
  if (hasUnresolvedPending) {
    mismatches.push({
      id: 'pending-orders',
      severity: 'warning',
      messageJa: '処理中・未確定の注文があります。約定確認後に照合してください。',
    });
  }

  const uncertain = journal.entries.filter(
    (e) => e.status === 'submitted' && e.errorReason?.includes('timeout_uncertain'),
  );
  for (const u of uncertain) {
    mismatches.push({
      id: `uncertain-${u.orderId}`,
      severity: 'critical',
      symbol: u.symbol,
      market: u.market,
      messageJa: `${u.symbol}: 約定結果が不明です（${u.errorReason ?? 'timeout'}）`,
    });
  }

  const checkLedger = (ledgerMode: 'manual' | 'practice', portfolio: AppState['portfolio']) => {
    for (const pos of portfolio) {
      const shares = safeShares(pos.shares, 0);
      if (shares <= 0) continue;
      const net = journalNetShares(journal.entries, ledgerMode, pos.market, pos.symbol);
      if (Math.abs(net - shares) > 0.0001) {
        mismatches.push({
          id: `qty-${ledgerMode}-${pos.market}-${pos.symbol}`,
          severity: 'critical',
          symbol: pos.symbol,
          market: pos.market,
          messageJa: `${pos.symbol}: 保有 ${shares}株 とジャーナル純増 ${net}株 が一致しません`,
        });
      }
    }

    const confirmed = journal.entries.filter(
      (e) =>
        e.ledgerMode === ledgerMode &&
        (e.status === 'confirmed' || e.status === 'partially_filled' || e.status === 'reconciled'),
    );
    for (const e of confirmed) {
      const held = portfolio.find(
        (p) => p.market === e.market && p.symbol.toUpperCase() === e.symbol.toUpperCase(),
      );
      const heldShares = safeShares(held?.shares, 0);
      if (e.side === 'sell' && heldShares > 0 && e.quantity > heldShares + 0.0001) {
        mismatches.push({
          id: `oversell-${e.orderId}`,
          severity: 'warning',
          symbol: e.symbol,
          market: e.market,
          messageJa: `${e.symbol}: 売却記録 ${e.quantity}株 が保有 ${heldShares}株 を超えている可能性`,
        });
      }
    }
  };

  checkLedger('manual', state.portfolio);
  checkLedger('practice', state.practice.portfolio);

  const journalConfirmedCount = journal.entries.filter(
    (e) => e.status === 'confirmed' || e.status === 'reconciled',
  ).length;

  return {
    computedAt: new Date().toISOString(),
    journalConfirmedCount,
    mismatchCount: mismatches.length,
    mismatches,
    hasUnresolvedPending,
  };
}
