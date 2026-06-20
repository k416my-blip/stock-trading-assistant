import { HOLDING_ERRORS } from '../../constants/holdingErrors';
import type {
  AppState,
  DepositPlan,
  DividendRecord,
  FeeAdjustmentRecord,
  TradeRecord,
  WithdrawalRecord,
} from '../../types';
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

const DAY_MS = 24 * 60 * 60 * 1000;

function sameDay(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return false;
  return Math.abs(da - db) <= DAY_MS;
}

function feeAmount(candidate: BrokerTransactionCandidate): number | undefined {
  return candidate.fee ?? candidate.totalMYR;
}

function importNote(candidate: BrokerTransactionCandidate): string {
  return candidate.source === 'natural_language'
    ? 'Rakuten import (NL)'
    : 'Rakuten import (manual)';
}

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
    case 'withdrawal':
      if (!candidate.totalMYR || candidate.totalMYR <= 0) {
        return { ok: false, error: candidate.type === 'deposit' ? '入金額が不正です。' : '出金額が不正です。' };
      }
      if (!candidate.executedAt) {
        return { ok: false, error: candidate.type === 'deposit' ? '入金日を入力してください。' : '出金日を入力してください。' };
      }
      return { ok: true };
    case 'dividend':
      if (!candidate.symbol?.trim()) return { ok: false, error: '配当銘柄コードが必要です。' };
      if (!candidate.totalMYR || candidate.totalMYR <= 0) {
        return { ok: false, error: '配当額が不正です。' };
      }
      if (!candidate.executedAt) {
        return { ok: false, error: '受取日を入力してください。' };
      }
      return { ok: true };
    case 'fee': {
      const amt = feeAmount(candidate);
      if (!amt || amt <= 0) return { ok: false, error: '手数料額が不正です。' };
      if (!candidate.executedAt) {
        return { ok: false, error: '手数料日を入力してください。' };
      }
      return { ok: true };
    }
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
      return { ok: false, error: '未対応の取引種別です。' };
  }
}

function buildJournalEntry(
  record: TradeRecord | null,
  candidate: BrokerTransactionCandidate,
  meta?: { depositId?: string; dividendId?: string; withdrawalId?: string; feeAdjustmentId?: string; tradeId?: string },
): ExecutionJournalEntry {
  const now = new Date().toISOString();
  const side = candidate.type === 'sell' || candidate.type === 'withdrawal' ? 'sell' : 'buy';
  const amount = candidate.totalMYR ?? feeAmount(candidate) ?? candidate.price ?? 0;
  const symbol =
    candidate.symbol ??
    (candidate.type === 'deposit' || candidate.type === 'withdrawal' ? 'CASH' : candidate.type === 'fee' ? 'FEE' : '');

  const metaNote = [
    meta?.depositId ? `depositId:${meta.depositId}` : null,
    meta?.dividendId ? `dividendId:${meta.dividendId}` : null,
    meta?.withdrawalId ? `withdrawalId:${meta.withdrawalId}` : null,
    meta?.feeAdjustmentId ? `feeAdjustmentId:${meta.feeAdjustmentId}` : null,
    meta?.tradeId ? `tradeId:${meta.tradeId}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    orderId: `rakuten-import-${candidate.id}`,
    idempotencyKey: `rakuten_import_${candidate.source}:${candidate.id}`,
    ledgerMode: 'manual',
    symbol,
    market: candidate.market ?? 'bursa',
    currency: candidate.currency,
    side: candidate.type === 'deposit' ? 'buy' : side,
    quantity: candidate.quantity ?? 0,
    requestedPrice: amount,
    executedPrice: candidate.price,
    filledQuantity: candidate.quantity,
    status: 'confirmed',
    createdAt: candidate.executedAt ?? now,
    updatedAt: now,
    tradeRecordId: record?.id ?? meta?.tradeId,
    recordSource:
      candidate.source === 'natural_language' ? 'rakuten_import_nl' : 'rakuten_import_manual',
    userConfirmationStatus: 'confirmed_by_user',
    brokerReferenceNumber: candidate.referenceNumber,
    importBatchId: candidate.batchId,
    importCandidateId: candidate.id,
    errorReason: metaNote || candidate.userNote,
  };
}

export function buildCommitAuditDetailJa(candidate: BrokerTransactionCandidate): string {
  switch (candidate.type) {
    case 'deposit':
      return `入金 RM${candidate.totalMYR?.toLocaleString('ja-JP')} を保存`;
    case 'withdrawal':
      return `出金 RM${candidate.totalMYR?.toLocaleString('ja-JP')} を保存`;
    case 'dividend':
      return `配当 ${candidate.symbol} RM${candidate.totalMYR?.toLocaleString('ja-JP')} を保存`;
    case 'fee': {
      const amt = feeAmount(candidate);
      const sym = candidate.symbol ? ` ${candidate.symbol}` : '';
      return `手数料 RM${amt?.toLocaleString('ja-JP')}${sym} を保存`;
    }
    case 'buy':
      return `買付 ${candidate.symbol} ${candidate.quantity}株 を保存`;
    case 'sell':
      return `売却 ${candidate.symbol} ${candidate.quantity}株 を保存`;
    default:
      return 'ユーザー確認後に保存';
  }
}

function findMatchingTradeForFee(
  state: AppState,
  symbol: string | undefined,
  executedAt: string,
): TradeRecord | undefined {
  if (!symbol?.trim()) return undefined;
  const sym = symbol.toUpperCase();
  return state.trades.find(
    (t) => t.symbol.toUpperCase() === sym && sameDay(t.executedAt, executedAt),
  );
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
  const noteParts = [
    importNote(candidate),
    candidate.referenceNumber ? `ref:${candidate.referenceNumber}` : null,
    candidate.userNote ?? null,
  ].filter(Boolean);

  if (candidate.type === 'deposit') {
    const depositId = `import-dep-${candidate.id}`;
    const deposit: DepositPlan = {
      id: depositId,
      amountMYR: candidate.totalMYR!,
      plannedDate: candidate.executedAt!.slice(0, 10),
      completed: true,
      note: noteParts.join(' · '),
    };
    const next: AppState = {
      ...state,
      deposits: [deposit, ...state.deposits],
    };
    const journalEntry = buildJournalEntry(null, candidate, { depositId });
    const confirmedCandidate: BrokerTransactionCandidate = {
      ...candidate,
      status: 'confirmed',
      confirmedAt,
      mappedRecordIds: { depositId },
    };
    return { ok: true, state: next, journalEntry, candidate: confirmedCandidate };
  }

  if (candidate.type === 'withdrawal') {
    const withdrawalId = `import-wdr-${candidate.id}`;
    const withdrawal: WithdrawalRecord = {
      id: withdrawalId,
      amountMYR: candidate.totalMYR!,
      withdrawnAt: candidate.executedAt!.slice(0, 10),
      note: noteParts.join(' · '),
      referenceNumber: candidate.referenceNumber,
      source: candidate.source,
    };
    const next: AppState = {
      ...state,
      withdrawals: [withdrawal, ...(state.withdrawals ?? [])],
    };
    const journalEntry = buildJournalEntry(null, candidate, { withdrawalId });
    const confirmedCandidate: BrokerTransactionCandidate = {
      ...candidate,
      status: 'confirmed',
      confirmedAt,
      mappedRecordIds: { withdrawalId },
    };
    return { ok: true, state: next, journalEntry, candidate: confirmedCandidate };
  }

  if (candidate.type === 'dividend') {
    const dividendId = `import-div-${candidate.id}`;
    const dividend: DividendRecord = {
      id: dividendId,
      symbol: candidate.symbol!.toUpperCase(),
      market: candidate.market ?? 'bursa',
      currency: candidate.currency,
      amount: candidate.totalMYR!,
      receivedAt: candidate.executedAt!.slice(0, 10),
    };
    const next: AppState = {
      ...state,
      dividends: [dividend, ...state.dividends],
    };
    const journalEntry = buildJournalEntry(null, candidate, { dividendId });
    const confirmedCandidate: BrokerTransactionCandidate = {
      ...candidate,
      status: 'confirmed',
      confirmedAt,
      mappedRecordIds: { dividendId },
    };
    return { ok: true, state: next, journalEntry, candidate: confirmedCandidate };
  }

  if (candidate.type === 'fee') {
    const amt = feeAmount(candidate)!;
    const executedAt = candidate.executedAt!;
    const matchingTrade = findMatchingTradeForFee(state, candidate.symbol, executedAt);

    if (matchingTrade) {
      const updatedTrade: TradeRecord = {
        ...matchingTrade,
        brokerageFee: matchingTrade.brokerageFee + amt,
        notes: [matchingTrade.notes, `${importNote(candidate)} fee +RM${amt}`]
          .filter(Boolean)
          .join(' · '),
      };
      const next: AppState = {
        ...state,
        trades: state.trades.map((t) => (t.id === matchingTrade.id ? updatedTrade : t)),
      };
      const journalEntry = buildJournalEntry(updatedTrade, candidate, { tradeId: updatedTrade.id });
      const confirmedCandidate: BrokerTransactionCandidate = {
        ...candidate,
        status: 'confirmed',
        confirmedAt,
        mappedRecordIds: { tradeId: updatedTrade.id },
      };
      return { ok: true, state: next, journalEntry, candidate: confirmedCandidate };
    }

    const feeAdjustmentId = `import-fee-${candidate.id}`;
    const feeRecord: FeeAdjustmentRecord = {
      id: feeAdjustmentId,
      amountMYR: amt,
      adjustedAt: executedAt.slice(0, 10),
      symbol: candidate.symbol?.toUpperCase(),
      note: noteParts.join(' · '),
      source: candidate.source,
    };
    const next: AppState = {
      ...state,
      feeAdjustments: [feeRecord, ...(state.feeAdjustments ?? [])],
    };
    const journalEntry = buildJournalEntry(null, candidate, { feeAdjustmentId });
    const confirmedCandidate: BrokerTransactionCandidate = {
      ...candidate,
      status: 'confirmed',
      confirmedAt,
      mappedRecordIds: { feeAdjustmentId },
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
    return { ok: false, error: '未対応の取引種別です。' };
  }

  const tradeSide = candidate.type;

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
    notes: noteParts.join(' · '),
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

  const journalEntry = buildJournalEntry(trade, candidate, { tradeId: trade.id });
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

  if (candidate.type === 'withdrawal') {
    return {
      beforeMYR: before,
      afterMYR: after,
      noteJa: `出金 RM${candidate.totalMYR?.toLocaleString('ja-JP')} — 買付余力が減ります。`,
    };
  }

  if (candidate.type === 'dividend') {
    return {
      beforeMYR: before,
      afterMYR: after,
      noteJa: `配当 RM${candidate.totalMYR?.toLocaleString('ja-JP')} — 配当記録のみ（買付余力は変わりません）。`,
    };
  }

  if (candidate.type === 'fee') {
    const amt = feeAmount(candidate);
    return {
      beforeMYR: before,
      afterMYR: after,
      noteJa: `手数料 RM${amt?.toLocaleString('ja-JP')} — 取引手数料として記録されます。`,
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
