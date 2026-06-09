/**
 * 負け6件 共通特徴・勝ち90件差分統計監査 — ルール変更なし
 */
import { FORWARD_ETF_UNIVERSE, FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardLoserEnrichedRow,
  ForwardLoserFeatureAuditReport,
  ForwardLoserFeatureCompareRow,
  ForwardLoserFeatureMetricId,
  ForwardPassedTradeRecord,
  ForwardRegimeGroupId,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function std(vals: number[]): number {
  if (vals.length === 0) return 0;
  const m = mean(vals) ?? 0;
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

function delta(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return round3(a - b);
}

function cohensD(winVals: number[], lossVals: number[]): number | null {
  if (winVals.length < 2 || lossVals.length < 2) return null;
  const mW = mean(winVals)!;
  const mL = mean(lossVals)!;
  const sW = std(winVals);
  const sL = std(lossVals);
  const nW = winVals.length;
  const nL = lossVals.length;
  const pooled = Math.sqrt(((nW - 1) * sW ** 2 + (nL - 1) * sL ** 2) / (nW + nL - 2));
  if (pooled <= 1e-9) return null;
  return round3((mW - mL) / pooled);
}

function computeAtrPctAt(bars: OhlcvBar[], idx: number, period = 14): number | null {
  if (idx < period) return null;
  const trs: number[] = [];
  for (let i = idx - period + 1; i <= idx; i++) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const pc = bars[i - 1]!.close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atr = trs.reduce((a, b) => a + b, 0) / period;
  const close = bars[idx]!.close;
  if (close <= 0) return null;
  return round3((atr / close) * 100);
}

function computeAtr90AvgPct(bars: OhlcvBar[], idx: number): number | null {
  const start = idx - 90 + 1;
  if (start < 14) return null;
  const samples: number[] = [];
  for (let i = start; i <= idx; i++) {
    const v = computeAtrPctAt(bars, i);
    if (v != null) samples.push(v);
  }
  if (samples.length < 60) return null;
  return round3(samples.reduce((a, b) => a + b, 0) / samples.length);
}

function computeRealizedVol20Pct(bars: OhlcvBar[], idx: number): number | null {
  if (idx < 20) return null;
  const rets: number[] = [];
  for (let i = idx - 19; i <= idx; i++) {
    const prev = bars[i - 1]!.close;
    if (prev <= 0) return null;
    rets.push((bars[i]!.close / prev - 1) * 100);
  }
  return round3(std(rets));
}

function weekdayJa(signalDate: string): string {
  const d = new Date(`${signalDate}T12:00:00Z`);
  return WEEKDAY_JA[d.getUTCDay()] ?? '?';
}

function monthKey(signalDate: string): string {
  return signalDate.slice(0, 7);
}

function regimeLabel(t: ForwardPassedTradeRecord): string {
  return classifyRegimeGroup(t.bucket) ?? t.bucket;
}

function enrichTrade(bundle: ForwardOhlcvBundle, t: ForwardPassedTradeRecord): ForwardLoserEnrichedRow {
  const bars = bundle.etfBars[t.symbol];
  const idx = barIndexByDate(bars, t.signalDate);
  const atrPct = idx >= 0 ? computeAtrPctAt(bars, idx) : null;
  const atr90 = idx >= 0 ? computeAtr90AvgPct(bars, idx) : null;
  const atrRatio = atrPct != null && atr90 != null && atr90 > 0 ? round3(atrPct / atr90) : null;
  const realizedVol20Pct = idx >= 0 ? computeRealizedVol20Pct(bars, idx) : null;

  return {
    id: t.id,
    signalDate: t.signalDate,
    symbol: t.symbol,
    returnPct: t.returnPct,
    holdDays: t.holdDays,
    exitReason: t.exitReason,
    spyRegimeLabel: regimeLabel(t),
    bucket: t.bucket,
    adx14: t.adx14,
    macdHistPct: t.macdHistPct,
    dist52wPct: t.dist52wPct,
    weekdayJa: weekdayJa(t.signalDate),
    monthKey: monthKey(t.signalDate),
    atrPct,
    atrRatio,
    realizedVol20Pct,
  };
}

function pct(n: number, total: number): number {
  return total > 0 ? round3((n / total) * 100) : 0;
}

function regimeComposition(
  trades: ForwardLoserEnrichedRow[],
): Record<ForwardRegimeGroupId | 'unknown', number> {
  const keys: (ForwardRegimeGroupId | 'unknown')[] = [
    'up',
    'down',
    'sideways',
    'sideways_shallow',
    'unknown',
  ];
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<
    ForwardRegimeGroupId | 'unknown',
    number
  >;
  for (const t of trades) {
    const g = classifyRegimeGroup(t.bucket) ?? 'unknown';
    out[g]++;
  }
  return out;
}

function formatRegimeComp(trades: ForwardLoserEnrichedRow[]): string {
  const c = regimeComposition(trades);
  const n = trades.length;
  if (n === 0) return '—';
  return `up${pct(c.up, n)}% down${pct(c.down, n)}% side${pct(c.sideways, n)}% shallow${pct(c.sideways_shallow, n)}%`;
}

function formatEtfComp(trades: ForwardLoserEnrichedRow[]): string {
  if (trades.length === 0) return '—';
  const counts = Object.fromEntries(FORWARD_ETF_UNIVERSE.map((s) => [s, 0])) as Record<string, number>;
  for (const t of trades) counts[t.symbol]++;
  return FORWARD_ETF_UNIVERSE.map((s) => `${s}${pct(counts[s] ?? 0, trades.length)}%`).join(' ');
}

function topCategory(
  trades: ForwardLoserEnrichedRow[],
  pick: (t: ForwardLoserEnrichedRow) => string,
): string {
  const counts = new Map<string, number>();
  for (const t of trades) counts.set(pick(t), (counts.get(pick(t)) ?? 0) + 1);
  let best = '—';
  let max = 0;
  for (const [k, v] of counts) {
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return trades.length > 0 ? `${best}(${pct(max, trades.length)}%)` : '—';
}

function shallowDistPct(trades: ForwardLoserEnrichedRow[]): number {
  return pct(trades.filter((t) => t.dist52wPct > -5).length, trades.length);
}

function numericCompare(
  metricId: ForwardLoserFeatureMetricId,
  labelJa: string,
  winVals: number[],
  lossVals: number[],
  unit: string,
): ForwardLoserFeatureCompareRow {
  const mW = mean(winVals);
  const mL = mean(lossVals);
  const d = delta(mW, mL);
  const es = cohensD(winVals, lossVals);
  return {
    metricId,
    labelJa,
    winSummaryJa: mW != null ? `${mW}${unit}` : '—',
    lossSummaryJa: mL != null ? `${mL}${unit}` : '—',
    deltaJa: d != null ? `${d >= 0 ? '+' : ''}${d}${unit}${es != null ? ` · d=${es}` : ''}` : '—',
    effectSize: es != null ? Math.abs(es) : null,
  };
}

function buildCompareRows(
  wins: ForwardLoserEnrichedRow[],
  losses: ForwardLoserEnrichedRow[],
): ForwardLoserFeatureCompareRow[] {
  const rows: ForwardLoserFeatureCompareRow[] = [
    {
      metricId: 'spy',
      labelJa: 'SPYレジーム構成',
      winSummaryJa: formatRegimeComp(wins),
      lossSummaryJa: formatRegimeComp(losses),
      deltaJa: `down差 ${round3(regimeComposition(wins).down / Math.max(wins.length, 1) * 100 - regimeComposition(losses).down / Math.max(losses.length, 1) * 100)}pt`,
      effectSize: Math.abs(
        regimeComposition(wins).down / Math.max(wins.length, 1) -
          regimeComposition(losses).down / Math.max(losses.length, 1),
      ),
    },
    numericCompare(
      'adx',
      'ADX',
      wins.map((t) => t.adx14),
      losses.map((t) => t.adx14),
      '',
    ),
    numericCompare(
      'macd',
      'MACD',
      wins.map((t) => t.macdHistPct),
      losses.map((t) => t.macdHistPct),
      '%',
    ),
    {
      metricId: 'dist52',
      labelJa: '52週乖離',
      winSummaryJa: `均${mean(wins.map((t) => t.dist52wPct)) ?? '—'}% · 浅(>-5%)${shallowDistPct(wins)}%`,
      lossSummaryJa: `均${mean(losses.map((t) => t.dist52wPct)) ?? '—'}% · 浅(>-5%)${shallowDistPct(losses)}%`,
      deltaJa: `浅乖離差 +${round3(shallowDistPct(losses) - shallowDistPct(wins))}pt · 均差 ${delta(mean(wins.map((t) => t.dist52wPct)), mean(losses.map((t) => t.dist52wPct))) ?? '—'}%`,
      effectSize: cohensD(
        wins.map((t) => t.dist52wPct),
        losses.map((t) => t.dist52wPct),
      ),
    },
    {
      metricId: 'etf',
      labelJa: 'ETF構成',
      winSummaryJa: formatEtfComp(wins),
      lossSummaryJa: formatEtfComp(losses),
      deltaJa: `SCHD差 ${round3((wins.filter((t) => t.symbol === 'SCHD').length / Math.max(wins.length, 1) - losses.filter((t) => t.symbol === 'SCHD').length / Math.max(losses.length, 1)) * 100)}pt`,
      effectSize: Math.abs(
        wins.filter((t) => t.symbol === 'SCHD').length / Math.max(wins.length, 1) -
          losses.filter((t) => t.symbol === 'SCHD').length / Math.max(losses.length, 1),
      ),
    },
    numericCompare(
      'holdDays',
      '保有日数',
      wins.map((t) => t.holdDays),
      losses.map((t) => t.holdDays),
      '日',
    ),
    {
      metricId: 'weekday',
      labelJa: '曜日',
      winSummaryJa: topCategory(wins, (t) => t.weekdayJa),
      lossSummaryJa: topCategory(losses, (t) => t.weekdayJa),
      deltaJa: losses.length > 0 ? `負け集中: ${topCategory(losses, (t) => t.weekdayJa)}` : '—',
      effectSize: null,
    },
    {
      metricId: 'month',
      labelJa: '月',
      winSummaryJa: topCategory(wins, (t) => t.monthKey),
      lossSummaryJa: topCategory(losses, (t) => t.monthKey),
      deltaJa: losses.length > 0 ? `負け集中: ${topCategory(losses, (t) => t.monthKey)}` : '—',
      effectSize: null,
    },
    numericCompare(
      'volatility',
      'ATR%（14日）',
      wins.map((t) => t.atrPct).filter((v): v is number => v != null),
      losses.map((t) => t.atrPct).filter((v): v is number => v != null),
      '%',
    ),
  ];

  const atrRatioRow = numericCompare(
    'volatility',
    'ATR比率（14日/90日均）',
    wins.map((t) => t.atrRatio).filter((v): v is number => v != null),
    losses.map((t) => t.atrRatio).filter((v): v is number => v != null),
    '',
  );
  rows.push(atrRatioRow);

  const vol20Row = numericCompare(
    'volatility',
    '実現ボラ20日',
    wins.map((t) => t.realizedVol20Pct).filter((v): v is number => v != null),
    losses.map((t) => t.realizedVol20Pct).filter((v): v is number => v != null),
    '%',
  );
  rows.push(vol20Row);

  return rows;
}

function buildLoserTraits(losses: ForwardLoserEnrichedRow[]): string {
  if (losses.length === 0) return '負けなし';
  const lines = [
    `全${losses.length}件 max_hold（+3%未到達）・保有25日`,
    `SPY: ${formatRegimeComp(losses)} — down/up/shallow偏重`,
    `52w浅(>-5%): ${losses.filter((t) => t.dist52wPct > -5).length}/${losses.length}件`,
    `ETF: ${formatEtfComp(losses)}`,
    `曜日: ${topCategory(losses, (t) => t.weekdayJa)} · 月: ${topCategory(losses, (t) => t.monthKey)}`,
    `ADX均${mean(losses.map((t) => t.adx14)) ?? '—'} · MACD均${mean(losses.map((t) => t.macdHistPct)) ?? '—'}% · ATR均${mean(losses.map((t) => t.atrPct).filter((v): v is number => v != null)) ?? '—'}%`,
  ];
  return lines.join('\n');
}

function buildTopDiscriminators(rows: ForwardLoserFeatureCompareRow[]): string {
  const ranked = [...rows]
    .filter((r) => r.effectSize != null)
    .sort((a, b) => (b.effectSize ?? 0) - (a.effectSize ?? 0))
    .slice(0, 5);
  if (ranked.length === 0) return '—';
  return ranked.map((r, i) => `${i + 1}. ${r.labelJa}（|d|=${r.effectSize}）`).join('\n');
}

export function auditLoserFeatures(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardLoserFeatureAuditReport {
  const passed = auditPassedTrades(input);
  const enriched = passed.trades.map((t) => enrichTrade(input.bundle, t));
  const winRows = enriched.filter((t) => t.returnPct > 0);
  const lossRows = enriched.filter((t) => t.returnPct <= 0).sort((a, b) => a.signalDate.localeCompare(b.signalDate));

  const compareRows = buildCompareRows(winRows, lossRows);
  const loserCommonTraitsJa = buildLoserTraits(lossRows);
  const topDiscriminatorsJa = buildTopDiscriminators(compareRows);

  const humanLines = [
    `【負け6件 共通特徴・勝ち90件差分統計】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `勝ち ${winRows.length} · 負け ${lossRows.length}`,
    '',
    '■ 負け6件一覧',
    ...lossRows.map(
      (t) =>
        `${t.signalDate}(${t.weekdayJa}) ${t.symbol} R${t.returnPct}% · SPY=${t.spyRegimeLabel} · ADX${t.adx14} · MACD${t.macdHistPct}% · 52w${t.dist52wPct}% · ATR${t.atrPct ?? '—'}% · 保有${t.holdDays}日`,
    ),
    '',
    '■ 負け組共通特徴',
    loserCommonTraitsJa,
    '',
    '■ 勝ち vs 負け 差分（効果量順上位）',
    topDiscriminatorsJa,
    '',
    '■ 因子別比較',
    ...compareRows.map(
      (r) =>
        `${r.labelJa}\n  勝ち: ${r.winSummaryJa}\n  負け: ${r.lossSummaryJa}\n  差分: ${r.deltaJa}`,
    ),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    winCount: winRows.length,
    lossCount: lossRows.length,
    loserRows: lossRows,
    compareRows,
    loserCommonTraitsJa,
    topDiscriminatorsJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatLoserFeatureAuditCsv(report: ForwardLoserFeatureAuditReport): string {
  const header =
    'type,signalDate,weekday,symbol,returnPct,spyRegime,adx14,macdHistPct,dist52wPct,holdDays,atrPct,atrRatio,realizedVol20Pct,exitReason';
  const loserLines = report.loserRows.map((t) =>
    [
      'loss',
      t.signalDate,
      t.weekdayJa,
      t.symbol,
      t.returnPct,
      t.spyRegimeLabel,
      t.adx14,
      t.macdHistPct,
      t.dist52wPct,
      t.holdDays,
      t.atrPct ?? '',
      t.atrRatio ?? '',
      t.realizedVol20Pct ?? '',
      t.exitReason,
    ].join(','),
  );
  const compareLines = report.compareRows.map((r) =>
    ['compare', r.metricId, r.labelJa, r.winSummaryJa, r.lossSummaryJa, r.deltaJa, r.effectSize ?? ''].join(
      ',',
    ),
  );
  return [header, ...loserLines, 'metric,metricId,label,win,loss,delta,effectSize', ...compareLines].join('\n');
}
