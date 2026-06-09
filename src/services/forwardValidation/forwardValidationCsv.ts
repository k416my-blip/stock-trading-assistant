import type { ForwardValidationPersisted } from '../../types/forwardValidation';
import { compareWithBacktestBaseline, computeForwardMetrics } from './forwardValidationMetrics';

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(cols: Array<string | number | null | undefined>): string {
  return cols.map(csvEscape).join(',');
}

export function buildForwardValidationCsv(state: ForwardValidationPersisted): string {
  const metrics = computeForwardMetrics(state);
  const comparison = compareWithBacktestBaseline(metrics);
  const lines: string[] = [];

  lines.push('# Forward Validation Export');
  lines.push(csvRow(['exportedAt', new Date().toISOString()]));
  lines.push(csvRow(['lastRunDate', state.lastRunDate]));
  lines.push(csvRow(['lastRunAt', state.lastRunAt]));
  lines.push(csvRow(['lastFetchAt', state.lastFetchAt]));
  lines.push(csvRow(['yahooLatestDate', state.yahooLatestDate]));
  lines.push('');

  lines.push('# Metrics');
  lines.push(csvRow(['metric', 'forward', 'backtest', 'delta']));
  lines.push(csvRow(['sharpe', metrics.sharpe, comparison.backtest.sharpe, comparison.delta.sharpe]));
  lines.push(csvRow(['maxDrawdownPct', metrics.maxDrawdownPct, comparison.backtest.maxDrawdownPct, comparison.delta.maxDrawdownPct]));
  lines.push(csvRow(['profitFactor', metrics.profitFactor, comparison.backtest.profitFactor, comparison.delta.profitFactor]));
  lines.push(csvRow(['winRate', metrics.winRate, comparison.backtest.winRate, comparison.delta.winRate]));
  lines.push(csvRow(['totalReturnPct', metrics.totalReturnPct, comparison.backtest.totalReturnPct, comparison.delta.totalReturnPct]));
  lines.push(csvRow(['equityUsd', metrics.equityUsd, '', '']));
  lines.push('');

  lines.push('# Signals');
  lines.push(csvRow(['id', 'date', 'symbol', 'adx14', 'macdHistPct', 'dist52wPct', 'bucket', 'entryDate', 'entryPrice', 'status']));
  for (const s of state.signals) {
    lines.push(
      csvRow([s.id, s.date, s.symbol, s.adx14, s.macdHistPct, s.dist52wPct, s.bucket, s.entryDate, s.entryPrice, s.status]),
    );
  }
  lines.push('');

  lines.push('# Open Positions');
  lines.push(csvRow(['id', 'signalDate', 'symbol', 'entryDate', 'entryPrice', 'weight', 'barsHeld', 'adx14', 'macdHistPct']));
  for (const p of state.openPositions) {
    lines.push(csvRow([p.id, p.signalDate, p.symbol, p.entryDate, p.entryPrice, p.weight, p.barsHeld, p.adx14, p.macdHistPct]));
  }
  lines.push('');

  lines.push('# Closed Trades');
  lines.push(csvRow(['id', 'signalDate', 'exitDate', 'symbol', 'entryPrice', 'exitPrice', 'returnPct', 'weight', 'exitReason']));
  for (const t of state.closedTrades) {
    lines.push(
      csvRow([t.id, t.signalDate, t.exitDate, t.symbol, t.entryPrice, t.exitPrice, t.returnPct, t.weight, t.exitReason]),
    );
  }
  lines.push('');

  lines.push('# Daily Returns');
  lines.push(csvRow(['date', 'returnPct', 'tradeIds']));
  for (const d of state.dailyReturns) {
    lines.push(csvRow([d.date, d.returnPct, d.tradeIds.join('|')]));
  }

  return lines.join('\n');
}

const LATEST_SIGNALS_CSV_LIMIT = 30;

export function buildLatestSignalsCsv(
  state: ForwardValidationPersisted,
  limit = LATEST_SIGNALS_CSV_LIMIT,
): string {
  const lines: string[] = [];
  lines.push('# Forward Validation — Latest Signals');
  lines.push(csvRow(['exportedAt', new Date().toISOString()]));
  lines.push(csvRow(['limit', limit]));
  lines.push('');
  lines.push(
    csvRow([
      'id',
      'date',
      'symbol',
      'adx14',
      'macdHistPct',
      'dist52wPct',
      'bucket',
      'entryDate',
      'entryPrice',
      'status',
      'createdAt',
    ]),
  );
  const latest = [...state.signals]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
  for (const s of latest) {
    lines.push(
      csvRow([
        s.id,
        s.date,
        s.symbol,
        s.adx14,
        s.macdHistPct,
        s.dist52wPct,
        s.bucket,
        s.entryDate,
        s.entryPrice,
        s.status,
        s.createdAt,
      ]),
    );
  }
  return lines.join('\n');
}

export { LATEST_SIGNALS_CSV_LIMIT };
