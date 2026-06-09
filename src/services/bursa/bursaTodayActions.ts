/**
 * Bursa Phase 8 — 今日の売買ロジック
 */
import type {
  BursaHoldingActionJudgment,
  BursaOverallInvestmentJudgment,
  BursaPhase5Analysis,
  BursaPhase6RankedEntry,
  BursaPhase7Analysis,
  BursaPhase8AllocationRow,
  BursaPhase8BudgetPlan,
  BursaPhase8BuyCandidate,
  BursaPhase8PrimaryAction,
  BursaPhase8PriorityItem,
  BursaPhase8SellCandidate,
} from '../../types/bursaDisclosure';
import { BURSA_TODAY_BUDGETS_MYR } from './bursaStockUniverse';

const MISSING = 'データ未取得';
const BURSA_LOT_SIZE = 100;
const BUY_TOP_N = 10;
const ALLOCATION_PICK_COUNT = 5;

const PRIORITY_ORDER: Record<BursaHoldingActionJudgment | '売却', number> = {
  強気買い: 1,
  買い: 2,
  保有: 3,
  注意: 4,
  売却候補: 5,
  売却: 5,
};

function shortName(name: string | null, code: string): string {
  if (!name) return code;
  const first = name.split(/\s+/)[0] ?? name;
  return first.length > 20 ? first.slice(0, 20) : first;
}

export function buildBuyTop10(input: {
  ranked: BursaPhase6RankedEntry[];
  phase5ByCode: Map<string, BursaPhase5Analysis>;
}): BursaPhase8BuyCandidate[] {
  const candidates: BursaPhase8BuyCandidate[] = [];

  for (const r of input.ranked) {
    const phase5 = input.phase5ByCode.get(r.stockCode);
    if (!phase5) continue;

    const fv = phase5.fairValue;
    const judgment = phase5.overallJudgment;
    const discount = fv.discountPct;

    const isBuySignal =
      judgment === '強気買い' ||
      judgment === '買い' ||
      (discount != null && discount > 0);

    if (!isBuySignal) continue;
    if (fv.currentPrice == null || fv.fairPrice == null) continue;

    let reasonJa = MISSING;
    if (discount != null && discount > 0) {
      reasonJa = `割安 ${discount.toFixed(1)}% · 総合 ${r.rank ?? '?'}位`;
    } else if (judgment != null) {
      reasonJa = `総合判断 ${judgment} · ランク ${r.rank ?? '?'}位`;
    }

    candidates.push({
      stockCode: r.stockCode,
      companyName: r.companyName,
      rank: r.rank,
      compositeScore: r.compositeScore,
      currentPrice: fv.currentPrice,
      fairPrice: fv.fairPrice,
      discountPct: discount,
      judgment,
      reasonJa,
    });
  }

  candidates.sort((a, b) => {
    const da = a.discountPct ?? -Infinity;
    const db = b.discountPct ?? -Infinity;
    if (db !== da) return db - da;
    return (b.compositeScore ?? 0) - (a.compositeScore ?? 0);
  });

  return candidates.slice(0, BUY_TOP_N);
}

export function buildSellCandidates(phase7: BursaPhase7Analysis): BursaPhase8SellCandidate[] {
  const out: BursaPhase8SellCandidate[] = [];

  for (const tp of phase7.takeProfit) {
    if (tp.recommendTakeProfit !== true) continue;
    out.push({
      symbol: tp.symbol,
      companyName: tp.companyName,
      kind: '利益確定',
      reasonJa: tp.reasonJa || MISSING,
      currentPrice: tp.currentPrice,
      premiumPct: tp.premiumPct,
    });
  }

  for (const sl of phase7.stopLoss) {
    if (!sl.hasWarning) continue;
    out.push({
      symbol: sl.symbol,
      companyName: sl.companyName,
      kind: '損切り',
      reasonJa: sl.warnings.join(' · ') || MISSING,
      currentPrice: null,
      premiumPct: null,
    });
  }

  for (const d of phase7.holdingsDiagnosis) {
    if (d.judgment !== '売却候補' && d.judgment !== '注意') continue;
    if (out.some((s) => s.symbol === d.symbol)) continue;
    out.push({
      symbol: d.symbol,
      companyName: d.companyName,
      kind: d.judgment === '売却候補' ? '売却' : '損切り',
      reasonJa: d.reasons.join(' · ') || MISSING,
      currentPrice: null,
      premiumPct: null,
    });
  }

  return out;
}

function diversifyBySector(
  picks: BursaPhase8BuyCandidate[],
  ranked: BursaPhase6RankedEntry[],
  count: number,
): BursaPhase8BuyCandidate[] {
  const sectorOf = (code: string) =>
    ranked.find((r) => r.stockCode === code)?.sector ?? 'unknown';
  const selected: BursaPhase8BuyCandidate[] = [];
  for (const p of picks) {
    if (selected.length >= count) break;
    const sec = sectorOf(p.stockCode);
    const same = selected.filter((s) => sectorOf(s.stockCode) === sec).length;
    if (same >= 2) continue;
    selected.push(p);
  }
  if (selected.length < count) {
    for (const p of picks) {
      if (selected.length >= count) break;
      if (!selected.some((s) => s.stockCode === p.stockCode)) selected.push(p);
    }
  }
  return selected;
}

function computeShares(allocationMYR: number, price: number | null): {
  shares: number | null;
  requiredMYR: number | null;
  remainderMYR: number | null;
} {
  if (price == null || price <= 0) {
    return { shares: null, requiredMYR: null, remainderMYR: null };
  }
  const lotCost = price * BURSA_LOT_SIZE;
  const lots = Math.floor(allocationMYR / lotCost);
  if (lots <= 0) {
    return { shares: 0, requiredMYR: 0, remainderMYR: allocationMYR };
  }
  const shares = lots * BURSA_LOT_SIZE;
  const requiredMYR = shares * price;
  return { shares, requiredMYR, remainderMYR: allocationMYR - requiredMYR };
}

export function buildBudgetPlans(input: {
  buyTop10: BursaPhase8BuyCandidate[];
  ranked: BursaPhase6RankedEntry[];
  budgetsMYR?: number[];
}): BursaPhase8BudgetPlan[] {
  const budgets = input.budgetsMYR ?? [...BURSA_TODAY_BUDGETS_MYR];
  const picks = diversifyBySector(input.buyTop10, input.ranked, ALLOCATION_PICK_COUNT);
  if (picks.length === 0) {
    return budgets.map((budgetMYR) => ({
      budgetMYR,
      rows: [],
      totalRequiredMYR: null,
      totalRemainderMYR: null,
    }));
  }

  const weightSum = picks.reduce((a, p) => {
    const w = (p.discountPct ?? 0) + (p.compositeScore ?? 0);
    return a + Math.max(w, 1);
  }, 0);

  return budgets.map((budgetMYR) => {
    const rows: BursaPhase8AllocationRow[] = picks.map((p) => {
      const w = Math.max((p.discountPct ?? 0) + (p.compositeScore ?? 0), 1);
      const allocationMYR = Math.round((budgetMYR * w) / weightSum);
      const allocationPct = Math.round((w / weightSum) * 1000) / 10;
      const { shares, requiredMYR, remainderMYR } = computeShares(
        allocationMYR,
        p.currentPrice,
      );
      return {
        stockCode: p.stockCode,
        companyName: p.companyName,
        allocationMYR,
        allocationPct,
        currentPrice: p.currentPrice,
        shares,
        requiredMYR,
        remainderMYR,
      };
    });

    const totalRequiredMYR = rows.reduce((a, r) => a + (r.requiredMYR ?? 0), 0);
    const totalRemainderMYR = budgetMYR - totalRequiredMYR;

    return { budgetMYR, rows, totalRequiredMYR, totalRemainderMYR };
  });
}

export function buildPrimaryAction(input: {
  buyTop10: BursaPhase8BuyCandidate[];
  sellCandidates: BursaPhase8SellCandidate[];
  budgetPlans: BursaPhase8BudgetPlan[];
}): BursaPhase8PrimaryAction {
  const takeProfit = input.sellCandidates.find((s) => s.kind === '利益確定');
  if (takeProfit) {
    const label = shortName(takeProfit.companyName, takeProfit.symbol);
    return {
      actionJa: `${label}利益確定推奨`,
      kind: 'sell',
      symbol: takeProfit.symbol,
      shares: null,
      reasonJa: takeProfit.reasonJa,
    };
  }

  const stopLoss = input.sellCandidates.find((s) => s.kind === '損切り');
  if (stopLoss) {
    const label = shortName(stopLoss.companyName, stopLoss.symbol);
    return {
      actionJa: `${label}損切り推奨`,
      kind: 'sell',
      symbol: stopLoss.symbol,
      shares: null,
      reasonJa: stopLoss.reasonJa,
    };
  }

  const sellOff = input.sellCandidates.find((s) => s.kind === '売却');
  if (sellOff) {
    const label = shortName(sellOff.companyName, sellOff.symbol);
    return {
      actionJa: `${label}売却推奨`,
      kind: 'sell',
      symbol: sellOff.symbol,
      shares: null,
      reasonJa: sellOff.reasonJa,
    };
  }

  const topBuy = input.buyTop10[0];
  if (topBuy?.currentPrice != null) {
    const plan5000 = input.budgetPlans.find((p) => p.budgetMYR === 5000);
    const row = plan5000?.rows.find((r) => r.stockCode === topBuy.stockCode);
    const shares = row?.shares ?? BURSA_LOT_SIZE;
    if (shares != null && shares > 0) {
      const label = shortName(topBuy.companyName, topBuy.stockCode);
      return {
        actionJa: `${label}を${shares}株購入推奨`,
        kind: 'buy',
        symbol: topBuy.stockCode,
        shares,
        reasonJa: topBuy.reasonJa,
      };
    }
  }

  return {
    actionJa: '本日は様子見推奨',
    kind: 'wait',
    symbol: null,
    shares: null,
    reasonJa: input.buyTop10.length === 0 ? '買い候補なし' : '売買基準未達',
  };
}

export function buildPriorityOrder(input: {
  phase7: BursaPhase7Analysis;
  buyTop10: BursaPhase8BuyCandidate[];
  sellCandidates: BursaPhase8SellCandidate[];
}): BursaPhase8PriorityItem[] {
  const items: BursaPhase8PriorityItem[] = [];

  for (const s of input.sellCandidates) {
    items.push({
      symbol: s.symbol,
      companyName: s.companyName,
      priority: '売却',
      reasonJa: `${s.kind}: ${s.reasonJa}`,
      sortOrder: PRIORITY_ORDER['売却'],
    });
  }

  const sellSymbols = new Set(input.sellCandidates.map((s) => s.symbol));

  for (const d of input.phase7.holdingsDiagnosis) {
    if (sellSymbols.has(d.symbol)) continue;
    if (items.some((i) => i.symbol === d.symbol)) continue;
    if (!d.judgment) continue;
    items.push({
      symbol: d.symbol,
      companyName: d.companyName,
      priority: d.judgment,
      reasonJa: d.reasons.join(' · ') || MISSING,
      sortOrder: PRIORITY_ORDER[d.judgment],
    });
  }

  for (const b of input.buyTop10) {
    if (items.some((i) => i.symbol === b.stockCode)) continue;
    const priority: BursaHoldingActionJudgment =
      b.judgment === '強気買い' ? '強気買い' : b.judgment === '買い' ? '買い' : '買い';
    items.push({
      symbol: b.stockCode,
      companyName: b.companyName,
      priority,
      reasonJa: b.reasonJa,
      sortOrder: PRIORITY_ORDER[priority],
    });
  }

  items.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.symbol.localeCompare(b.symbol, 'en', { numeric: true });
  });

  return items;
}

export function buildConciergeNotifications(input: {
  buyTop10: BursaPhase8BuyCandidate[];
  sellCandidates: BursaPhase8SellCandidate[];
  primaryAction: BursaPhase8PrimaryAction;
}): string[] {
  const notes: string[] = [];

  for (const b of input.buyTop10.slice(0, 3)) {
    const label = shortName(b.companyName, b.stockCode);
    if (b.discountPct != null && b.discountPct > 0) {
      notes.push(`${label}が理論価格より${b.discountPct.toFixed(0)}%割安です`);
    } else if (b.judgment != null) {
      notes.push(`${label}は総合判断「${b.judgment}」（ランク${b.rank ?? '?'}位）`);
    }
  }

  for (const s of input.sellCandidates.slice(0, 3)) {
    const label = shortName(s.companyName, s.symbol);
    notes.push(`${label}: ${s.kind} — ${s.reasonJa}`);
  }

  if (input.primaryAction.actionJa) {
    notes.unshift(`【本日】${input.primaryAction.actionJa}`);
  }

  return notes.slice(0, 8);
}
