/**
 * 最重要監査その19 — DGRO低ADX特性監査 · 監査18の18件 · 2018〜 · 監査のみ
 */
import { FORWARD_ETF_UNIVERSE } from '../../constants/forwardValidation';
import type {
  ForwardAdx20ExtraTradeRow,
  ForwardAdxBandLowAdxStats,
  ForwardDgroLowAdxAuditReport,
  ForwardDgroLowAdxVerdict,
  ForwardLowAdxSymbolStats,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { collectAdx20OnlyTrades } from './forwardValidationAdx20ValidationAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

const FIXED_CONDITIONS_JA =
  'VIX≥24 · MACD · 52週高値 · SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25営業日';

const COMPARE_SYMBOLS = [...FORWARD_ETF_UNIVERSE] as string[];

export type AdxBandId = 'band_15_20' | 'band_20_25' | 'band_other';

export function classifyAdxBand(adx14: number): AdxBandId {
  if (adx14 > 15 && adx14 <= 20) return 'band_15_20';
  if (adx14 > 20 && adx14 <= 25) return 'band_20_25';
  return 'band_other';
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function buildLowAdxSymbolStats(
  symbol: string,
  trades: ForwardAdx20ExtraTradeRow[],
): ForwardLowAdxSymbolStats {
  const rows = trades.filter((t) => t.symbol === symbol);
  const wins = rows.filter((t) => t.returnPct > 0);
  const returns = rows.map((t) => t.returnPct);
  const maxLossPct = returns.length > 0 ? round3(Math.min(...returns)) : null;

  return {
    symbol,
    tradeCount: rows.length,
    winRatePct: rows.length > 0 ? round3((wins.length / rows.length) * 100) : 0,
    cumulativeReturnPct: round3(returns.reduce((s, r) => s + r, 0)),
    avgReturnPct: mean(returns),
    maxLossPct,
  };
}

export function buildAdxBandStats(
  bandId: AdxBandId,
  labelJa: string,
  minExclusive: number,
  maxInclusive: number,
  trades: ForwardAdx20ExtraTradeRow[],
): ForwardAdxBandLowAdxStats {
  const rows = trades.filter((t) => classifyAdxBand(t.adx14) === bandId);
  const wins = rows.filter((t) => t.returnPct > 0);
  const returns = rows.map((t) => t.returnPct);

  return {
    bandId,
    labelJa,
    adxMinExclusive: minExclusive,
    adxMaxInclusive: maxInclusive,
    tradeCount: rows.length,
    winRatePct: rows.length > 0 ? round3((wins.length / rows.length) * 100) : 0,
    cumulativeReturnPct: round3(returns.reduce((s, r) => s + r, 0)),
    avgReturnPct: mean(returns),
    maxLossPct: returns.length > 0 ? round3(Math.min(...returns)) : null,
    bySymbol: COMPARE_SYMBOLS.map((s) => buildLowAdxSymbolStats(s, rows)),
  };
}

export function evaluateDgroLowAdxCharacteristic(input: {
  symbolStats: ForwardLowAdxSymbolStats[];
  band1520: ForwardAdxBandLowAdxStats;
  band2025: ForwardAdxBandLowAdxStats;
  allTrades: ForwardAdx20ExtraTradeRow[];
}): { verdict: ForwardDgroLowAdxVerdict; verdictJa: string } {
  const { symbolStats, band1520, band2025, allTrades } = input;
  const dgro = symbolStats.find((s) => s.symbol === 'DGRO')!;
  const others = symbolStats.filter((s) => s.symbol !== 'DGRO');
  const othersCum = round3(others.reduce((s, o) => s + o.cumulativeReturnPct, 0));
  const dgroSharePct =
    allTrades.length > 0 ? round3((dgro.tradeCount / allTrades.length) * 100) : 0;
  const dgroCumSharePct =
    input.allTrades.reduce((s, t) => s + t.returnPct, 0) !== 0
      ? round3(
          (dgro.cumulativeReturnPct /
            allTrades.reduce((s, t) => s + t.returnPct, 0)) *
            100,
        )
      : 0;

  const lowBandTrades = allTrades.filter(
    (t) => classifyAdxBand(t.adx14) === 'band_15_20' || classifyAdxBand(t.adx14) === 'band_20_25',
  );
  const lowBandOthers = lowBandTrades.filter((t) => t.symbol !== 'DGRO');
  const lowBandOthersCum = round3(lowBandOthers.reduce((s, t) => s + t.returnPct, 0));
  const lowBandOthersWins = lowBandOthers.filter((t) => t.returnPct > 0).length;

  const multiSymbolProfitIn2025 = band2025.bySymbol.filter(
    (s) => s.tradeCount > 0 && s.cumulativeReturnPct > 0,
  ).length;
  const multiSymbolProfitIn1520 = band1520.bySymbol.filter(
    (s) => s.tradeCount > 0 && s.cumulativeReturnPct > 0,
  ).length;

  if (allTrades.length === 0) {
    return { verdict: 'insufficient', verdictJa: '分析対象トレードなし。' };
  }

  if (
    dgroSharePct >= 70 &&
    dgro.cumulativeReturnPct > 0 &&
    othersCum <= 0 &&
    lowBandOthersCum <= 0
  ) {
    return {
      verdict: 'dgro_specific',
      verdictJa:
        `低ADX帯の利益はDGRO固有: DGRO${dgro.tradeCount}件（${dgroSharePct}%）· 累積${dgro.cumulativeReturnPct}%（全体の${dgroCumSharePct}%）。` +
        `他3銘柄累積${othersCum}% · 15-20帯${band1520.tradeCount}件 / 20-25帯${band2025.tradeCount}件。` +
        `SCHD/VYM/SPLGは低ADX帯で独立貢献せず。`,
    };
  }

  if (
    (multiSymbolProfitIn2025 >= 2 || multiSymbolProfitIn1520 >= 2) &&
    band2025.cumulativeReturnPct + band1520.cumulativeReturnPct > 0
  ) {
    const profitable = [...band2025.bySymbol, ...band1520.bySymbol]
      .filter((s) => s.tradeCount > 0 && s.cumulativeReturnPct > 0)
      .map((s) => s.symbol);
    const unique = [...new Set(profitable)];
    return {
      verdict: 'strategy_wide',
      verdictJa:
        `低ADX帯利益は戦略全体の特性: 20-25帯${band2025.tradeCount}件累積${band2025.cumulativeReturnPct}% · ` +
        `15-20帯${band1520.tradeCount}件累積${band1520.cumulativeReturnPct}%。` +
        `複数銘柄がプラス（${unique.join('、')}）。DGRO偏重${dgroSharePct}%だが他銘柄も寄与。`,
    };
  }

  if (dgro.cumulativeReturnPct > 0 && othersCum > 0) {
    return {
      verdict: 'mixed',
      verdictJa:
        `混合: DGRO累積${dgro.cumulativeReturnPct}% vs 他銘柄合計${othersCum}%。` +
        `20-25帯WR${band2025.winRatePct}% · 15-20帯WR${band1520.winRatePct}%。` +
        `DGRO主導だが他銘柄も一部プラス。`,
    };
  }

  return {
    verdict: 'mixed',
    verdictJa:
      `混合/限定的: DGRO${dgro.tradeCount}件累積${dgro.cumulativeReturnPct}% · 他${othersCum}% · ` +
      `低ADX帯他銘柄累積${lowBandOthersCum}（${lowBandOthersWins}勝）。`,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatSymbolTable(stats: ForwardLowAdxSymbolStats[]): string[] {
  const cols = [
    { w: 6, h: '銘柄' },
    { w: 5, h: '件数' },
    { w: 7, h: '勝率%' },
    { w: 8, h: '累積%' },
    { w: 7, h: '均R%' },
    { w: 8, h: '最大損%' },
  ];
  const line = (cells: string[]) => cols.map((c, i) => pad(cells[i] ?? '', c.w)).join(' ');
  return [
    line(cols.map((c) => c.h)),
    cols.map((c) => '-'.repeat(c.w)).join(' '),
    ...stats.map((s) =>
      line([
        s.symbol,
        String(s.tradeCount),
        String(s.winRatePct),
        String(s.cumulativeReturnPct),
        s.avgReturnPct != null ? String(s.avgReturnPct) : '—',
        s.maxLossPct != null ? String(s.maxLossPct) : '—',
      ]),
    ),
  ];
}

function formatBandSection(band: ForwardAdxBandLowAdxStats): string[] {
  return [
    `${band.labelJa}: ${band.tradeCount}件 · WR${band.winRatePct}% · 累積${band.cumulativeReturnPct}% · 均R${band.avgReturnPct ?? '—'}% · 最大損${band.maxLossPct ?? '—'}%`,
    ...band.bySymbol
      .filter((s) => s.tradeCount > 0)
      .map(
        (s) =>
          `  ${s.symbol}: ${s.tradeCount}件 WR${s.winRatePct}% 累積${s.cumulativeReturnPct}% 均R${s.avgReturnPct ?? '—'}% 最大損${s.maxLossPct ?? '—'}%`,
      ),
  ];
}

export function auditDgroLowAdx(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardDgroLowAdxAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const targetTrades = collectAdx20OnlyTrades(input.bundle, fromDate, toDate);

  const symbolStats = COMPARE_SYMBOLS.map((s) => buildLowAdxSymbolStats(s, targetTrades));
  const band1520 = buildAdxBandStats('band_15_20', 'ADX15～20帯', 15, 20, targetTrades);
  const band2025 = buildAdxBandStats('band_20_25', 'ADX20～25帯', 20, 25, targetTrades);
  const bandOther = buildAdxBandStats('band_other', 'ADX25超（枠競合差）', 25, 999, targetTrades);

  const { verdict, verdictJa } = evaluateDgroLowAdxCharacteristic({
    symbolStats,
    band1520,
    band2025,
    allTrades: targetTrades,
  });

  const verdictLabel: Record<ForwardDgroLowAdxVerdict, string> = {
    dgro_specific: 'DGRO固有',
    strategy_wide: '戦略全体',
    mixed: '混合',
    insufficient: '不足',
  };

  const humanLines = [
    `【最重要監査その19】DGRO低ADX特性監査 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    `対象: 監査18 ADX20のみ実行 ${targetTrades.length}件`,
    '監査のみ · ルール変更なし',
    '',
    '■ 銘柄別集計（DGRO / SCHD / SPLG / VYM）',
    ...formatSymbolTable(symbolStats),
    '',
    '■ ADX15～20帯',
    ...formatBandSection(band1520),
    '',
    '■ ADX20～25帯',
    ...formatBandSection(band2025),
    '',
    '■ 参考: ADX25超',
    ...formatBandSection(bandOther),
    '',
    '■ 対象トレード一覧',
    ...targetTrades.map(
      (t) =>
        `${t.symbol} · ${t.signalDate} · ADX${t.adx14} · R${t.returnPct}% · ${classifyAdxBand(t.adx14)}`,
    ),
    '',
    `■ 判定: 【${verdictLabel[verdict]}】`,
    verdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    targetTradeCount: targetTrades.length,
    targetTrades,
    symbolStats,
    band1520,
    band2025,
    bandOther,
    verdict,
    verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runDgroLowAdxAudit(): Promise<ForwardDgroLowAdxAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditDgroLowAdx({ bundle });
}

export function formatDgroLowAdxCsv(report: ForwardDgroLowAdxAuditReport): string {
  const symRows = report.symbolStats.map((s) =>
    [
      s.symbol,
      s.tradeCount,
      s.winRatePct,
      s.cumulativeReturnPct,
      s.avgReturnPct ?? '',
      s.maxLossPct ?? '',
    ].join(','),
  );

  const bandRow = (b: ForwardAdxBandLowAdxStats) =>
    [
      b.bandId,
      b.tradeCount,
      b.winRatePct,
      b.cumulativeReturnPct,
      b.avgReturnPct ?? '',
      b.maxLossPct ?? '',
    ].join(',');

  const tradeRows = report.targetTrades.map((t) =>
    [t.symbol, t.signalDate, t.adx14, t.returnPct, t.holdDays, classifyAdxBand(t.adx14)].join(','),
  );

  return [
    'symbol,tradeCount,winRatePct,cumulativeReturnPct,avgReturnPct,maxLossPct',
    ...symRows,
    '',
    'bandId,tradeCount,winRatePct,cumulativeReturnPct,avgReturnPct,maxLossPct',
    bandRow(report.band1520),
    bandRow(report.band2025),
    bandRow(report.bandOther),
    '',
    'symbol,signalDate,adx14,returnPct,holdDays,bandId',
    ...tradeRows,
    '',
    `verdict,${report.verdict}`,
  ].join('\n');
}
