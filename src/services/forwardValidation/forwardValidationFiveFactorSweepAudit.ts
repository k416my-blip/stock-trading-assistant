/**
 * 5条件（SPY/52週/MACD/VIX/ADX）単独・2・3組み合わせ比較監査 — 96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardFiveFactorConditionId,
  ForwardFiveFactorSweepAuditReport,
  ForwardFiveFactorSweepRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const SPY_THRESHOLD = -5;
const DIST52_THRESHOLD = -10;
const MACD_THRESHOLD = 0.25;
const VIX_THRESHOLD = 25;
const ADX_THRESHOLD = 30;

type ConditionDef = {
  id: ForwardFiveFactorConditionId;
  labelJa: string;
  shortJa: string;
};

const CONDITIONS: ConditionDef[] = [
  { id: 'spy', labelJa: '① SPY63日≤-5%', shortJa: 'SPY' },
  { id: 'dist52', labelJa: '② 52週乖離≤-10%', shortJa: '52週' },
  { id: 'macd', labelJa: '③ MACD≥0.25', shortJa: 'MACD' },
  { id: 'vix', labelJa: '④ VIX≥25', shortJa: 'VIX' },
  { id: 'adx', labelJa: '⑤ ADX≥30', shortJa: 'ADX' },
];

type EnrichedTrade = ForwardPassedTradeRecord & {
  vix: number | null;
  spyRet63Pct: number | null;
};

type ComboSpec = {
  tierJa: '単独' | '2条件' | '3条件';
  ids: ForwardFiveFactorConditionId[];
};

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

function enrich(bundle: ForwardOhlcvBundle, trades: ForwardPassedTradeRecord[]): EnrichedTrade[] {
  const vixBars = bundle.vixBars ?? [];
  return trades.map((t) => ({
    ...t,
    vix: vixAtDate(vixBars, t.signalDate),
    spyRet63Pct: computeSpyRet63(bundle.spyBars, t.signalDate),
  }));
}

function matchesCondition(t: EnrichedTrade, id: ForwardFiveFactorConditionId): boolean {
  switch (id) {
    case 'spy':
      return t.spyRet63Pct != null && t.spyRet63Pct <= SPY_THRESHOLD;
    case 'dist52':
      return t.dist52wPct <= DIST52_THRESHOLD;
    case 'macd':
      return t.macdHistPct >= MACD_THRESHOLD;
    case 'vix':
      return t.vix != null && t.vix >= VIX_THRESHOLD;
    case 'adx':
      return t.adx14 >= ADX_THRESHOLD;
    default:
      return false;
  }
}

function combosOf(ids: ForwardFiveFactorConditionId[], k: number): ForwardFiveFactorConditionId[][] {
  const out: ForwardFiveFactorConditionId[][] = [];
  function walk(start: number, picked: ForwardFiveFactorConditionId[]) {
    if (picked.length === k) {
      out.push([...picked]);
      return;
    }
    for (let i = start; i <= ids.length - (k - picked.length); i++) {
      picked.push(ids[i]!);
      walk(i + 1, picked);
      picked.pop();
    }
  }
  walk(0, []);
  return out;
}

function buildComboSpecs(): ComboSpec[] {
  const allIds = CONDITIONS.map((c) => c.id);
  const specs: ComboSpec[] = [];
  for (const id of allIds) specs.push({ tierJa: '単独', ids: [id] });
  for (const pair of combosOf(allIds, 2)) specs.push({ tierJa: '2条件', ids: pair });
  for (const triple of combosOf(allIds, 3)) specs.push({ tierJa: '3条件', ids: triple });
  return specs;
}

function labelForCombo(ids: ForwardFiveFactorConditionId[]): string {
  return ids.map((id) => CONDITIONS.find((c) => c.id === id)!.shortJa).join('+');
}

function keysForCombo(ids: ForwardFiveFactorConditionId[]): string {
  return ids.map((id) => CONDITIONS.find((c) => c.id === id)!.labelJa).join(' · ');
}

function buildRow(spec: ComboSpec, trades: EnrichedTrade[], totalTrades: number): ForwardFiveFactorSweepRow {
  const matched = trades.filter((t) => spec.ids.every((id) => matchesCondition(t, id)));
  const wins = matched.filter((t) => t.returnPct > 0);
  const maxHold = matched.filter((t) => t.exitReason === 'max_hold');
  const returns = matched.map((t) => t.returnPct);
  return {
    tierJa: spec.tierJa,
    comboLabelJa: labelForCombo(spec.ids),
    conditionKeysJa: keysForCombo(spec.ids),
    conditionIds: spec.ids,
    matchCount: matched.length,
    matchPctOf96: totalTrades > 0 ? round3((matched.length / totalTrades) * 100) : 0,
    tradeCount: matched.length,
    winCount: wins.length,
    winRatePct: matched.length > 0 ? round3((wins.length / matched.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: matched.length > 0 ? round3((maxHold.length / matched.length) * 100) : 0,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatTable(rows: ForwardFiveFactorSweepRow[]): string[] {
  const cols = [
    { w: 6, h: '区分' },
    { w: 18, h: '組合せ' },
    { w: 5, h: '件数' },
    { w: 7, h: '勝率%' },
    { w: 7, h: '均R%' },
    { w: 7, h: 'Sharpe' },
    { w: 8, h: '25日満%' },
  ];
  const line = (cells: string[]) => cols.map((c, i) => pad(cells[i] ?? '', c.w)).join(' ');
  const header = line(cols.map((c) => c.h));
  const sep = cols.map((c) => '-'.repeat(c.w)).join(' ');
  const data = rows.map((r) =>
    line([
      r.tierJa,
      r.comboLabelJa,
      String(r.matchCount),
      String(r.winRatePct),
      r.avgReturnPct != null ? String(r.avgReturnPct) : '—',
      r.sharpe != null ? String(r.sharpe) : '—',
      String(r.maxHoldRatePct),
    ]),
  );
  return [header, sep, ...data];
}

const COMBO_SPECS = buildComboSpecs();

export function auditFiveFactorSweep(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardFiveFactorSweepAuditReport {
  const passed = auditPassedTrades(input);
  const enriched = enrich(input.bundle, passed.trades);

  const singles = COMBO_SPECS.filter((s) => s.tierJa === '単独').map((s) =>
    buildRow(s, enriched, passed.tradeCount),
  );
  const pairs = COMBO_SPECS.filter((s) => s.tierJa === '2条件').map((s) =>
    buildRow(s, enriched, passed.tradeCount),
  );
  const triples = COMBO_SPECS.filter((s) => s.tierJa === '3条件').map((s) =>
    buildRow(s, enriched, passed.tradeCount),
  );
  const allRows = [...singles, ...pairs, ...triples];

  const humanLines = [
    `【5条件スイープ比較監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · 現行出口+3%/25日`,
    '（監査のみ・ルール変更なし）',
    '',
    '■ 条件定義（シグナル日）',
    ...CONDITIONS.map((c) => c.labelJa),
    '',
    '■ 単独条件',
    ...formatTable(singles),
    '',
    '■ 2条件組み合わせ',
    ...formatTable(pairs),
    '',
    '■ 3条件組み合わせ',
    ...formatTable(triples),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    singles,
    pairs,
    triples,
    allRows,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatFiveFactorSweepCsv(report: ForwardFiveFactorSweepAuditReport): string {
  const header =
    'tier,combo,conditions,matchCount,matchPctOf96,winRatePct,avgReturnPct,sharpe,maxHoldRatePct';
  const row = (r: ForwardFiveFactorSweepRow) =>
    [
      r.tierJa,
      r.comboLabelJa,
      r.conditionKeysJa,
      r.matchCount,
      r.matchPctOf96,
      r.winRatePct,
      r.avgReturnPct ?? '',
      r.sharpe ?? '',
      r.maxHoldRatePct,
    ].join(',');
  return [header, ...report.allRows.map(row)].join('\n');
}
