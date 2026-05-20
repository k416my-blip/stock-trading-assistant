import { ALLOCATION_PRACTICE_MESSAGES } from '../constants/allocation';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { AllocationPlan, AppState, PracticeState } from '../types';
import {
  executeAllocationPracticeBuys,
  filterBuyableCandidates,
  totalAllocationBuyCostMYR,
} from './allocationActions';
import { loadAppState, saveAppState } from './storage';

export type BulkBuyDebugInfo = {
  virtualCashMYR: number;
  allocationTotalMYR: number;
  validPurchaseCount: number;
  savedHoldingsCount: number;
};

export type BulkBuyResult =
  | {
      ok: true;
      state: AppState;
      boughtCount: number;
      skipped: string[];
      partialSkipMessage?: string;
      debug: BulkBuyDebugInfo;
    }
  | {
      ok: false;
      error: string;
      skipped: string[];
      debug: BulkBuyDebugInfo;
    };

function countHoldings(practice: PracticeState): number {
  return practice.portfolio.filter((p) => p.shares > 0).length;
}

function buildDebug(practice: PracticeState, plan: AllocationPlan | null): BulkBuyDebugInfo {
  const buyable = plan ? filterBuyableCandidates(plan.candidates).buyable : [];
  return {
    virtualCashMYR: practice.cashBalanceMYR,
    allocationTotalMYR: buyable.length > 0 ? totalAllocationBuyCostMYR(buyable) : 0,
    validPurchaseCount: buyable.length,
    savedHoldingsCount: countHoldings(practice),
  };
}

/** 練習モードの一括仮想買付（検証・実行・保存まで） */
export async function executePracticeBulkBuy(
  appState: AppState,
  plan: AllocationPlan,
): Promise<BulkBuyResult> {
  console.log('bulk virtual buy pressed');

  const baseDebug = buildDebug(appState.practice, plan);

  if (appState.appMode !== 'practice') {
    return {
      ok: false,
      error: '練習モードでのみ一括仮想買付できます。設定から練習モードに切り替えてください。',
      skipped: [],
      debug: baseDebug,
    };
  }

  if (!plan.candidates.length) {
    return {
      ok: false,
      error: '有効な購入候補がありません',
      skipped: [],
      debug: baseDebug,
    };
  }

  const { buyable, skipped } = filterBuyableCandidates(plan.candidates);
  const skippedNames = skipped.map((c) => c.name);
  const totalCostMYR = totalAllocationBuyCostMYR(buyable);

  console.log('current virtual cash', appState.practice.cashBalanceMYR);
  console.log('total allocation amount', totalCostMYR);
  console.log('valid purchase count', buyable.length);

  if (buyable.length === 0) {
    return {
      ok: false,
      error: ALLOCATION_PRACTICE_MESSAGES.noBuyable,
      skipped: skippedNames,
      debug: buildDebug(appState.practice, plan),
    };
  }

  if (totalCostMYR > appState.practice.cashBalanceMYR) {
    return {
      ok: false,
      error: ALLOCATION_PRACTICE_MESSAGES.insufficientCash,
      skipped: skippedNames,
      debug: buildDebug(appState.practice, plan),
    };
  }

  const buyResult = executeAllocationPracticeBuys(appState.practice, plan);
  if (!buyResult.ok) {
    console.error('仮想買付に失敗しました', buyResult.error);
    return {
      ok: false,
      error: buyResult.error || '仮想買付に失敗しました',
      skipped: buyResult.skipped,
      debug: buildDebug(appState.practice, plan),
    };
  }

  const holdingsBeforeSave = countHoldings(buyResult.practice);
  console.log(
    'holding creation complete',
    buyResult.practice.portfolio
      .filter((p) => p.shares > 0)
      .map((p) => ({
        id: p.id,
        symbol: p.symbol,
        market: p.market,
        shares: p.shares,
        averageBuyPrice: p.averageBuyPrice,
        currentPrice: p.currentPrice,
        openedAt: p.openedAt,
      })),
  );
  console.log('trade history count', buyResult.practice.trades.filter((t) => t.side === 'buy').length);

  if (holdingsBeforeSave === 0) {
    return {
      ok: false,
      error: '有効な購入候補がありません',
      skipped: buyResult.skipped,
      debug: buildDebug(buyResult.practice, plan),
    };
  }

  const nextState: AppState = {
    ...appState,
    appMode: 'practice',
    practice: buyResult.practice,
  };

  console.log('saving holdings', STORAGE_KEYS.appState);
  try {
    await saveAppState(nextState);
    const loaded = await loadAppState();
    const savedCount = countHoldings(loaded.practice);
    console.log('saved holdings count', savedCount);

    if (savedCount === 0) {
      return {
        ok: false,
        error: '保有データ保存エラー',
        skipped: buyResult.skipped,
        debug: buildDebug(loaded.practice, plan),
      };
    }

    return {
      ok: true,
      state: loaded,
      boughtCount: buyResult.boughtCount,
      skipped: buyResult.skipped,
      partialSkipMessage: buyResult.partialSkipMessage,
      debug: {
        virtualCashMYR: loaded.practice.cashBalanceMYR,
        allocationTotalMYR: totalCostMYR,
        validPurchaseCount: buyable.length,
        savedHoldingsCount: savedCount,
      },
    };
  } catch (err) {
    console.error('保有データ保存エラー', err);
    return {
      ok: false,
      error: '保有データ保存エラー',
      skipped: buyResult.skipped,
      debug: buildDebug(buyResult.practice, plan),
    };
  }
}
