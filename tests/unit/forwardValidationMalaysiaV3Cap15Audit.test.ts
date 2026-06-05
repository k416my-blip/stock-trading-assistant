import { describe, expect, it } from 'vitest';
import {
  aggregateCap15SymbolStats,
  buildCap15CompensationRows,
  buildMaintenanceReasonJa,
  gamudaDependencyFromLedger,
  gradeMalaysiaV3Cap15,
  pickProfitTop3,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV3Cap15Audit';
import type { MalaysiaV3DcaExecutedTrade } from '../../src/services/forwardValidation/forwardValidationMalaysiaV3DcaAudit';

function trade(
  symbol: string,
  pnl: number,
  notional = 700,
  returnPct = 10,
): MalaysiaV3DcaExecutedTrade {
  return {
    id: `${symbol}-${pnl}`,
    symbol,
    phase: 'phase3',
    signalDate: '2020-01-01',
    entryDate: '2020-01-02',
    exitDate: '2020-01-20',
    notionalMYR: notional,
    weightPct: 33,
    returnPct,
    pnlMYR: pnl,
    equityAfterMYR: 3000,
  };
}

describe('forwardValidationMalaysiaV3Cap15Audit', () => {
  it('aggregateCap15SymbolStats computes contribution', () => {
    const cap15 = [trade('5347', 100), trade('5398', 50), trade('1023', -20)];
    const baseline = [trade('5347', 80), trade('5398', 60), trade('1023', -10)];
    const stats = aggregateCap15SymbolStats({
      cap15Trades: cap15,
      baselineTrades: baseline,
      symbols: ['5347', '5398', '1023'],
    });
    const tenaga = stats.find((s) => s.symbol === '5347')!;
    expect(tenaga.tradeCount).toBe(1);
    expect(tenaga.compensationVsBaselineMYR).toBe(20);
    expect(tenaga.profitContributionPct).toBeCloseTo(76.9, 0);
  });

  it('gamudaDependencyFromLedger uses positive pnl share', () => {
    const dep = gamudaDependencyFromLedger([
      trade('5347', 100),
      trade('5398', 100),
      trade('1023', 50),
    ]);
    expect(dep).toBeCloseTo(40, 0);
  });

  it('pickProfitTop3 returns highest pnl symbols', () => {
    const stats = aggregateCap15SymbolStats({
      cap15Trades: [trade('5347', 100), trade('5398', 200), trade('1023', 50)],
      baselineTrades: [],
      symbols: ['5347', '5398', '1023'],
    });
    const top = pickProfitTop3(stats);
    expect(top[0]!.symbol).toBe('5398');
  });

  it('buildCap15CompensationRows labels compensators', () => {
    const stats = aggregateCap15SymbolStats({
      cap15Trades: [trade('5347', 100)],
      baselineTrades: [trade('5347', 80)],
      symbols: ['5347'],
    });
    const rows = buildCap15CompensationRows({ cap15Stats: stats });
    expect(rows[0]!.roleJa).toBe('利益補完');
  });

  it('gradeMalaysiaV3Cap15 returns A when reconciled and strong', () => {
    const { grade } = gradeMalaysiaV3Cap15({
      cumulativeReturnPct: 37.7,
      ledgerReconciled: true,
      gamudaDependencyPct: 15,
      testTradeCount: 10,
      testWinRatePct: 60,
      overfitVerdictJa: '過学習なし — OOS累積10%',
    });
    expect(grade).toBe('A');
  });

  it('buildMaintenanceReasonJa mentions compensators', () => {
    const cap15Stats = aggregateCap15SymbolStats({
      cap15Trades: [trade('5347', 100), trade('5398', 40)],
      baselineTrades: [trade('5347', 80), trade('5398', 60)],
      symbols: ['5347', '5398'],
    });
    const baselineStats = aggregateCap15SymbolStats({
      cap15Trades: [trade('5347', 80), trade('5398', 60)],
      baselineTrades: [trade('5347', 80), trade('5398', 60)],
      symbols: ['5347', '5398'],
    });
    const ja = buildMaintenanceReasonJa({
      cap15Stats,
      baselineStats,
      cumulativeReturnPct: 37.7,
      baselineCumulativeReturnPct: 40.6,
    });
    expect(ja).toContain('補完');
  });
});
