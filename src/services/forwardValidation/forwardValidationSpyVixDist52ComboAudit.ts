/**
 * SPY63 / VIX / 52週 条件組み合わせ比較監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardSpyVixDist52ComboAuditReport,
  ForwardSpyVixDist52ComboId,
  ForwardSpyVixDist52ComboRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const SPY_THRESHOLD = -5;
const VIX_THRESHOLD = 25;
const DIST52_THRESHOLD = -10;

type ComboDef = {
  id: ForwardSpyVixDist52ComboId;
  labelJa: string;
  tierJa: string;
  needsSpy: boolean;
  needsVix: boolean;
  needsDist52: boolean;
};

const COMBOS: ComboDef[] = [
  { id: 'spy_only', labelJa: 'SPYのみ', tierJa: '単独', needsSpy: true, needsVix: false, needsDist52: false },
  { id: 'vix_only', labelJa: 'VIXのみ', tierJa: '単独', needsSpy: false, needsVix: true, needsDist52: false },
  { id: 'dist52_only', labelJa: '52週のみ', tierJa: '単独', needsSpy: false, needsVix: false, needsDist52: true },
  { id: 'spy_vix', labelJa: 'SPY+VIX', tierJa: '2条件', needsSpy: true, needsVix: true, needsDist52: false },
  { id: 'spy_dist52', labelJa: 'SPY+52週', tierJa: '2条件', needsSpy: true, needsVix: false, needsDist52: true },
  { id: 'vix_dist52', labelJa: 'VIX+52週', tierJa: '2条件', needsSpy: false, needsVix: true, needsDist52: true },
  {
    id: 'spy_vix_dist52',
    labelJa: 'SPY+VIX+52週',
    tierJa: '3条件',
    needsSpy: true,
    needsVix: true,
    needsDist52: true,
  },
];

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

function tradeSharpe(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mu = mean(returns);
  const sigma = std(returns);
  if (mu == null || sigma <= 1e-9) return null;
  return round3(mu / sigma);
}

function computeSpyRet63(spyBars: OhlcvBar[], date: string): number | null {
  const idx = spyBars.findIndex((b) => b.date === date);
  const lookback = 63;
  if (idx < lookback) return null;
  const closes = spyBars.map((b) => b.close);
  return round3(((closes[idx]! / closes[idx - lookback]! - 1) * 100));
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

type EnrichedTrade = ForwardPassedTradeRecord & {
  vix: number | null;
  spyRet63Pct: number | null;
};

function enrich(bundle: ForwardOhlcvBundle, trades: ForwardPassedTradeRecord[]): EnrichedTrade[] {
  const vixBars = bundle.vixBars ?? [];
  return trades.map((t) => ({
    ...t,
    vix: vixAtDate(vixBars, t.signalDate),
    spyRet63Pct: computeSpyRet63(bundle.spyBars, t.signalDate),
  }));
}

function matchesSpy(t: EnrichedTrade): boolean {
  return t.spyRet63Pct != null && t.spyRet63Pct <= SPY_THRESHOLD;
}

function matchesVix(t: EnrichedTrade): boolean {
  return t.vix != null && t.vix >= VIX_THRESHOLD;
}

function matchesDist52(t: EnrichedTrade): boolean {
  return t.dist52wPct <= DIST52_THRESHOLD;
}

function matchesCombo(t: EnrichedTrade, combo: ComboDef): boolean {
  if (combo.needsSpy && !matchesSpy(t)) return false;
  if (combo.needsVix && !matchesVix(t)) return false;
  if (combo.needsDist52 && !matchesDist52(t)) return false;
  return true;
}

function buildRow(combo: ComboDef, trades: EnrichedTrade[]): ForwardSpyVixDist52ComboRow {
  const wins = trades.filter((t) => t.returnPct > 0);
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const returns = trades.map((t) => t.returnPct);
  const condParts: string[] = [];
  if (combo.needsSpy) condParts.push('①');
  if (combo.needsVix) condParts.push('②');
  if (combo.needsDist52) condParts.push('③');
  return {
    comboId: combo.id,
    labelJa: combo.labelJa,
    tierJa: combo.tierJa,
    conditionKeysJa: condParts.join('+') || '—',
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatTable(rows: ForwardSpyVixDist52ComboRow[]): string[] {
  const cols = [
    { key: 'label', w: 14, head: '組み合わせ' },
    { key: 'n', w: 5, head: '件数' },
    { key: 'wr', w: 7, head: '勝率%' },
    { key: 'r', w: 7, head: '均R%' },
    { key: 'sh', w: 7, head: 'Sharpe' },
    { key: 'mh', w: 8, head: '25日満%' },
  ] as const;
  const line = (cells: string[]) => cells.map((c, i) => pad(c, cols[i]!.w)).join(' ');
  const header = line(cols.map((c) => c.head));
  const sep = cols.map((c) => '-'.repeat(c.w)).join(' ');
  const data = rows.map((r) =>
    line([
      r.labelJa,
      String(r.tradeCount),
      String(r.winRatePct),
      r.avgReturnPct != null ? String(r.avgReturnPct) : '—',
      r.sharpe != null ? String(r.sharpe) : '—',
      String(r.maxHoldRatePct),
    ]),
  );
  return [header, sep, ...data];
}

export function auditSpyVixDist52Combo(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardSpyVixDist52ComboAuditReport {
  const passed = auditPassedTrades(input);
  const enriched = enrich(input.bundle, passed.trades);

  const rows = COMBOS.map((c) => buildRow(c, enriched.filter((t) => matchesCombo(t, c))));

  const humanLines = [
    `【SPY/VIX/52週 条件組み合わせ比較監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · 現行出口+3%/25日`,
    '（監査のみ・ルール変更なし）',
    '',
    '■ 条件定義（シグナル日）',
    `① SPY63日リターン ≤ ${SPY_THRESHOLD}%`,
    `② VIX終値 ≥ ${VIX_THRESHOLD}`,
    `③ 52週乖離 ≤ ${DIST52_THRESHOLD}%`,
    '',
    '■ 一覧比較',
    ...formatTable(rows),
    '',
    '■ 行別',
    ...rows.map(
      (r) =>
        `${r.tierJa} ${r.labelJa}（${r.conditionKeysJa}）: ${r.tradeCount}件 · 勝率${r.winRatePct}% · ` +
        `均R${r.avgReturnPct ?? '—'}% · Sharpe${r.sharpe ?? '—'} · 25日満了${r.maxHoldRatePct}%`,
    ),
    '',
    '※ Sharpe = 該当トレードリターンの mean/std（2件未満は—）',
    '※ SPY/VIX欠損は該当条件を満たさない扱い',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    spyThresholdPct: SPY_THRESHOLD,
    vixThreshold: VIX_THRESHOLD,
    dist52ThresholdPct: DIST52_THRESHOLD,
    rows,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatSpyVixDist52ComboCsv(report: ForwardSpyVixDist52ComboAuditReport): string {
  const header =
    'tier,combo,conditions,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct';
  const body = report.rows.map((r) =>
    [
      r.tierJa,
      r.labelJa,
      r.conditionKeysJa,
      r.tradeCount,
      r.winRatePct,
      r.avgReturnPct ?? '',
      r.sharpe ?? '',
      r.maxHoldRatePct,
    ].join(','),
  );
  return [header, ...body].join('\n');
}
