import type { MaterialAnalysisReport } from '../bursa/bursaMaterialAnalysisService';
import type { PortfolioPosition } from '../../types';
import type { StrategyExecutionBundle } from '../../types/strategyExecution';
import type { PortfolioAiSymbolEvaluation } from '../../types/portfolioAiEvaluation';
import { resolvePortfolioAiEvaluation } from '../portfolioAiEvaluationFromStrategyBundle';
import {
  adviceLineBullet,
  formatAdviceLineJa,
  mapToBeginnerAiJudgment,
  type BeginnerAiJudgment,
} from './beginnerAiJudgmentJa';

export type BeginnerTodayAdviceLine = {
  symbol: string;
  nameJa: string;
  judgment: BeginnerAiJudgment;
  lineJa: string;
  bullet: 'filled' | 'open' | 'dash';
  isHeld: boolean;
};

export type BeginnerTodayAdviceCardData = {
  dateJa: string;
  lines: BeginnerTodayAdviceLine[];
  hasNewPurchase: boolean;
  newPurchaseSummaryJa: string;
  footerJa: string;
  loading: boolean;
};

const FOOTER_JA = '急いで売買する必要はありません';
const MAX_LINES = 5;

function todayDateJa(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function heldSymbols(holdings: PortfolioPosition[]): Set<string> {
  const set = new Set<string>();
  for (const h of holdings) {
    if (h.shares > 0) set.add(normalizeSymbol(h.symbol));
  }
  return set;
}

function evalForSymbol(
  symbol: string,
  bundle: StrategyExecutionBundle | null,
): PortfolioAiSymbolEvaluation | null {
  if (!bundle) return null;
  const evalBundle = resolvePortfolioAiEvaluation(bundle);
  return (
    evalBundle.rankedHoldings.find((e) => normalizeSymbol(e.symbol) === normalizeSymbol(symbol)) ??
    null
  );
}

function scoreFromMaterial(scoreSign: 'positive' | 'negative' | 'neutral'): number {
  if (scoreSign === 'positive') return 62;
  if (scoreSign === 'negative') return 38;
  return 50;
}

function buildLineForStock(input: {
  symbol: string;
  nameJa: string;
  isHeld: boolean;
  fusedAction: PortfolioAiSymbolEvaluation['action'] | 'hold';
  finalScore: number;
  buyAllowed?: boolean;
}): BeginnerTodayAdviceLine {
  const judgment = mapToBeginnerAiJudgment({
    isHeld: input.isHeld,
    fusedAction: input.fusedAction,
    finalScore: input.finalScore,
    buyAllowed: input.buyAllowed,
  });
  return {
    symbol: input.symbol,
    nameJa: input.nameJa,
    judgment,
    lineJa: formatAdviceLineJa({
      nameJa: input.nameJa,
      judgment,
      isHeld: input.isHeld,
    }),
    bullet: adviceLineBullet(judgment),
    isHeld: input.isHeld,
  };
}

export function buildBeginnerTodayAdvice(input: {
  holdings: PortfolioPosition[];
  materialReport: MaterialAnalysisReport | null;
  strategyBundle: StrategyExecutionBundle | null;
  loading?: boolean;
}): BeginnerTodayAdviceCardData {
  const held = heldSymbols(input.holdings);
  const lines: BeginnerTodayAdviceLine[] = [];
  const seen = new Set<string>();

  const addLine = (line: BeginnerTodayAdviceLine) => {
    const key = normalizeSymbol(line.symbol);
    if (seen.has(key)) return;
    if (line.judgment === 'pass' && !line.isHeld) return;
    seen.add(key);
    lines.push(line);
  };

  for (const h of input.holdings) {
    if (h.shares <= 0) continue;
    const sym = normalizeSymbol(h.symbol);
    const materialRow = input.materialReport?.stocks.find(
      (s) => normalizeSymbol(s.stockCode) === sym,
    );
    const evalRow = evalForSymbol(sym, input.strategyBundle);
    addLine(
      buildLineForStock({
        symbol: sym,
        nameJa: materialRow?.companyNameJa ?? evalRow?.displayLabelJa ?? sym,
        isHeld: true,
        fusedAction: evalRow?.action ?? 'hold',
        finalScore: evalRow?.finalScore ?? scoreFromMaterial(materialRow?.scoreSign ?? 'neutral'),
      }),
    );
  }

  if (input.materialReport) {
    for (const row of input.materialReport.stocks) {
      const sym = normalizeSymbol(row.stockCode);
      if (held.has(sym)) continue;
      const evalRow = evalForSymbol(sym, input.strategyBundle);
      addLine(
        buildLineForStock({
          symbol: sym,
          nameJa: row.companyNameJa,
          isHeld: false,
          fusedAction: evalRow?.action ?? (row.scoreSign === 'positive' ? 'watch' : 'hold'),
          finalScore: evalRow?.finalScore ?? scoreFromMaterial(row.scoreSign),
        }),
      );
    }
  }

  const priority = (j: BeginnerAiJudgment, isHeld: boolean): number => {
    if (isHeld && j === 'hold') return 0;
    if (isHeld && j === 'monitor') return 1;
    if (!isHeld && j === 'buy_candidate') return 2;
    if (!isHeld && j === 'monitor') return 3;
    return 4;
  };

  lines.sort(
    (a, b) =>
      priority(a.judgment, a.isHeld) - priority(b.judgment, b.isHeld) ||
      a.nameJa.localeCompare(b.nameJa, 'ja'),
  );

  const buyCandidates = lines.filter((l) => l.judgment === 'buy_candidate' && !l.isHeld);
  const hasNewPurchase = buyCandidates.length > 0;
  const visibleLines = lines.slice(0, MAX_LINES);

  return {
    dateJa: todayDateJa(),
    lines: visibleLines,
    hasNewPurchase,
    newPurchaseSummaryJa: hasNewPurchase ? '新規購入候補あり' : '新規購入  なし',
    footerJa: FOOTER_JA,
    loading: input.loading === true,
  };
}
