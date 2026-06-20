import { HOLDING_ERRORS } from '../../constants/holdingErrors';
import type { AppState, DepositPlan, TradeRecord } from '../../types';
import type { ExecutionJournalEntry } from '../../types/execution';
import type { BrokerTransactionCandidate } from '../../types/rakutenImport';
import { canSaveImportCandidate } from './rakutenImportConfidence';
import { calculateBuyingPower } from '../buyingPower';
import { toMYR } from '../fx';
import {
  appendPerformanceSnapshot,
  applyTradeToPortfolio,
  portfolioMarketValueMYR,
} from '../portfolio';
import { sanitizePortfolio } from '../portfolioPriceUpdate';
import { isValidQuotePrice } from '../../utils/safeNumeric';

export type CommitImportResult =
  | {
      ok: true;
      state: AppState;
      journalEntry: ExecutionJournalEntry;
      candidate: BrokerTransactionCandidate;
    }
  | { ok: false; error: string };

function validateCandidate(candidate: BrokerTransactionCandidate): { ok: true } | { ok: false; error: string } {
  if (candidate.status === 'duplicate_blocked') {
    return { ok: false, error: '重複の可能性が高いため保存できません。参照番号または日付・金額を確認してください。' };
  }
  if (candidate.status === 'confirmed' || candidate.status === 'rejected') {
    return { ok: false, error: 'この候補はすでに処理済みです。' };
  }
  if (!canSaveImportCandidate(candidate)) {
    return {
      ok: false,
      error:
        '信頼度が低いか必須項目が不足しているため保存できません。修正画面で内容を入力してください。',
    };
  }

  switch (candidate.type) {
    case 'deposit':
      if (!candidate.totalMYR || candidate.totalMYR <= 0) {
        return { ok: false, error: '入金額が不正です。' };
      }
      if (!candidate.executedAt) {
        return { ok: false, error: '入金日を入力してください。' };
      }
      return { ok: true };
    case 'buy':
    case 'sell':
      if (!candidate.symbol?.trim()) return { ok: false, error: '銘柄コードが必要です。' };
      if (!candidate.market) return { ok: false, error: '市場が必要です。' };
      if (!candidate.quantity || candidate.quantity <= 0) {
        return { ok: false, error: HOLDING_ERRORS.invalidQuantity };
      }
      if (!isValidQuotePrice(candidate.price ?? NaN)) {
        return { ok: false, error: HOLDING_ERRORS.invalidExecutedPrice };
      }
      if (!candidate.executedAt) {
        return { ok: false, error: '約定日を入力してください。' };
      }
      return { ok: true };
    default:
      return { ok: false, error: 'R1では入金・買付・売却のみ対応しています。' };
  }
}

function buildJournalEntry(
  record: TradeRecord | null,
  candidate: BrokerTransactionCandidate,
  depositId?: string,
): ExecutionJournalEntry {
  const now = new Date().toISOString();
  const side = candidate.type === 'sell' ? 'sell' : 'buy';
  return {
    orderId: `rakuten-import-${candidate.id}`,
    idempotencyKey: `rakuten_import_${candidate.source}:${candidate.id}`,
    ledgerMode: 'manual',
    symbol: candidate.symbol ?? (candidate.type === 'deposit' ? 'CASH' : ''),
    market: candidate.market ?? 'bursa',
    currency: candidate.currency,
    side: candidate.type === 'deposit' ? 'buy' : side,
    quantity: candidate.quantity ?? 0,
    requestedPrice: candidate.price ?? candidate.totalMYR ?? 0,
    executedPrice: candidate.price,
    filledQuantity: candidate.quantity,
    status: 'confirmed',
    createdAt: candidate.executedAt ?? now,
    updatedAt: now,
    tradeRecordId: record?.id,
    recordSource:
      candidate.source === 'natural_language' ? 'rakuten_import_nl' : 'rakuten_import_manual',
    userConfirmationStatus: 'confirmed_by_user',
    brokerReferenceNumber: candidate.referenceNumber,
    importBatchId: candidate.batchId,
    importCandidateId: candidate.id,
    errorReason: depositId ? `depositId:${depositId}` : candidate.userNote,
  };
}

export function commitImportCandidateInState(
  state: AppState,
  candidate: BrokerTransactionCandidate,
): CommitImportResult {
  if (state.appMode === 'practice') {
    return { ok: false, error: '練習モードでは Rakuten 取引記録は利用できません。' };
  }

  const validated = validateCandidate(candidate);
  if (!validated.ok) return validated;

  const confirmedAt = new Date().toISOString();

  if (candidate.type === 'deposit') {
    const depositId = `import-dep-${candidate.id}`;
    const deposit: DepositPlan = {
      id: depositId,
      amountMYR: candidate.totalMYR!,
      plannedDate: candidate.executedAt!.slice(0, 10),
      completed: true,
      note: [
        'Rakuten import',
        candidate.referenceNumber ? `ref:${candidate.referenceNumber}` : null,
        candidate.userNote ?? null,
      ]
        .filter(Boolean)
        .join(' · '),
    };
    const next: AppState = {
      ...state,
      deposits: [deposit, ...state.deposits],
    };
    const journalEntry = buildJournalEntry(null, candidate, depositId);
    const confirmedCandidate: BrokerTransactionCandidate = {
      ...candidate,
      status: 'confirmed',
      confirmedAt,
      mappedRecordIds: { depositId },
    };
    return { ok: true, state: next, journalEntry, candidate: confirmedCandidate };
  }

  const portfolio = sanitizePortfolio(state.portfolio);

  if (candidate.type === 'sell') {
    const existing = portfolio.find(
      (p) =>
        p.market === candidate.market &&
        p.symbol.toUpperCase() === candidate.symbol!.toUpperCase(),
    );
    if (!existing || existing.shares < (candidate.quantity ?? 0)) {
      return { ok: false, error: HOLDING_ERRORS.insufficientShares };
    }
  }

  if (candidate.type !== 'buy' && candidate.type !== 'sell') {
    return { ok: false, error: 'R1では入金・買付・売却のみ対応しています。' };
  }

  const tradeSide = candidate.type;

  const importNote =
    candidate.source === 'natural_language'
      ? 'Rakuten import (NL)'
      : 'Rakuten import (manual)';

  const trade: TradeRecord = {
    id: `rakuten_import-${candidate.id}`,
    symbol: candidate.symbol!.toUpperCase(),
    market: candidate.market!,
    currency: candidate.currency,
    side: tradeSide,
    shares: candidate.quantity!,
    price: candidate.price!,
    brokerageFee: candidate.fee ?? 0,
    executedAt: candidate.executedAt!,
    notes: [
      importNote,
      candidate.referenceNumber ? `ref:${candidate.referenceNumber}` : null,
      candidate.userNote ?? null,
    ]
      .filter(Boolean)
      .join(' · '),
  };

  const nextPortfolio = applyTradeToPortfolio(portfolio, trade);
  const valueMYR = portfolioMarketValueMYR({ ...state, portfolio: nextPortfolio });
  const today = new Date().toISOString().slice(0, 10);
  const performanceHistory = appendPerformanceSnapshot(
    state.performanceHistory,
    today,
    valueMYR,
  );

  const next: AppState = {
    ...state,
    portfolio: nextPortfolio,
    trades: [trade, ...state.trades],
    performanceHistory,
  };

  const journalEntry = buildJournalEntry(trade, candidate);
  const confirmedCandidate: BrokerTransactionCandidate = {
    ...candidate,
    status: 'confirmed',
    confirmedAt,
    mappedRecordIds: { tradeId: trade.id },
  };

  return { ok: true, state: next, journalEntry, candidate: confirmedCandidate };
}

export function previewBuyingPowerAfterImport(
  state: AppState,
  candidate: BrokerTransactionCandidate,
): { beforeMYR: number; afterMYR: number; noteJa: string } {
  const before = calculateBuyingPower(state).buyingPowerMYR;

  const result = commitImportCandidateInState(state, {
    ...candidate,
    status: 'ready_to_confirm',
  });
  if (!result.ok) {
    return {
      beforeMYR: before,
      afterMYR: before,
      noteJa: result.error,
    };
  }
  const after = calculateBuyingPower(result.state).buyingPowerMYR;

  if (candidate.type === 'deposit') {
    return {
      beforeMYR: before,
      afterMYR: after,
      noteJa: `入金 RM${candidate.totalMYR?.toLocaleString('ja-JP')} — 買付余力が更新されます。`,
    };
  }

  const cost = toMYR(
    (candidate.quantity ?? 0) * (candidate.price ?? 0),
    candidate.currency,
  );
  if (candidate.type === 'buy') {
    return {
      beforeMYR: before,
      afterMYR: after,
      noteJa: `買付コスト概算 RM${cost.toLocaleString('ja-JP')} — 取得コストが増えます。`,
    };
  }
  return {
    beforeMYR: before,
    afterMYR: after,
    noteJa: `売却概算 RM${cost.toLocaleString('ja-JP')} — 取得コストが減ります。`,
  };
}
