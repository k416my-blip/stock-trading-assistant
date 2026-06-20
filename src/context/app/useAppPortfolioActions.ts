import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { HOLDING_ERRORS } from '../../constants/holdingErrors';
import {
  candidatesToManualBuyItems,
  executePracticeSellAll,
  MANUAL_ORDER_METHOD,
} from '../../services/allocationActions';
import { calculateBuyingPower } from '../../services/buyingPower';
import { enrichInstitutionalRiskWithBehavioral } from '../../services/behavioralRiskOrchestratorService';
import { recordTradeOutcomeForBehavior } from '../../services/behavioralRiskStorage';
import { toMYR } from '../../services/fx';
import {
  appendExecutionJournalEntry,
  loadExecutionJournal,
} from '../../services/executionJournalStorage';
import {
  createDefaultExecutionHandlers,
  submitExecutionOrder,
} from '../../services/executionOrderService';
import { buildInstitutionalRiskInputFromApp } from '../../services/institutionalRiskControlEngine';
import { enrichInstitutionalRiskWithMetaCapital } from '../../services/metaCapitalOrchestratorService';
import { enrichInstitutionalRiskWithModelStability } from '../../services/modelStabilityOrchestratorService';
import {
  confirmManualOrderInState,
  type ManualOrderConfirmInput,
} from '../../services/manualOrderConfirmation';
import { applyManualOrderEntryPriceUpdate } from '../../services/manualOrderEntryPrice';
import {
  applyManualHoldingToState,
  mergePortfolioFromPersistence,
  type ManualHoldingInput,
} from '../../services/portfolioHoldings';
import { backupPortfolioIfNonEmpty } from '../../services/portfolioBackup';
import { guardAppStateForPersistence } from '../../services/portfolioPersistenceGuard';
import { saveHealthyPortfolioSnapshot } from '../../services/portfolioSnapshot';
import {
  appendPerformanceSnapshot,
  portfolioMarketValueMYR,
  removePortfolioPosition,
  updatePositionCurrentPrice,
  updatePositionMarket,
  updatePositionSymbol,
} from '../../services/portfolio';
import { executePracticeBulkBuy } from '../../services/practiceBulkBuy';
import {
  calculatePracticeStats,
  addVirtualDeposit,
  resetPractice,
  setVirtualCapital,
} from '../../services/practice';
import {
  buildManualSellAllItems,
  buildManualSellAllResult,
  buildSellAllLineItem,
  estimateProceedsMYR,
  executePracticeSellAllHoldings,
  MANUAL_SELL_ORDER_METHOD,
} from '../../services/sellAllHoldings';
import { buildManualImportCandidate } from '../../services/rakutenImport/buildManualImportCandidate';
import { buildNaturalLanguageImportCandidate } from '../../services/rakutenImport/buildNaturalLanguageImportCandidate';
import { commitImportCandidateInState } from '../../services/rakutenImport/commitImportCandidate';
import {
  appendRakutenImportAuditEntry,
  createAuditEntry,
} from '../../services/rakutenImport/rakutenImportAuditStorage';
import {
  findImportCandidate,
  pruneConfirmedBatches,
  saveImportBatch,
  upsertImportCandidate,
} from '../../services/rakutenImport/rakutenImportStagingStorage';
import { getPersonalKillSwitchesSnapshot } from '../../services/personalKillSwitches';
import { loadAppStateTrusted } from '../../services/storage';
import { saveAppState } from '../../services/storage';
import { restorePortfolioFromBackup } from '../../services/portfolioBackup';
import { validateTradeIntent } from '../../services/tradeExecutionGate';
import type { AiLearningState } from '../../services/analysis/aiLearning';
import type { ExecutionLedgerMode } from '../../types/execution';
import type {
  BrokerTransactionCandidate,
  RakutenImportManualFormInput,
} from '../../types/rakutenImport';
import type { MarketRegimeResult } from '../../types/marketRegime';
import type {
  AllocationPlan,
  AppMode,
  AppState,
  DepositPlan,
  DividendRecord,
  ManualOrderItem,
  Market,
  PortfolioPosition,
  RankedStock,
  SellAllLineItem,
  SellAllResult,
  TradeRecord,
  UserSettings,
} from '../../types';
import { isDev } from '../../utils/isDev';
import type { AppContextRefs, AppStateApi } from './appContextShared';

type Params = Pick<AppStateApi, 'setState'> &
  Pick<AppContextRefs, 'stateRef' | 'lastPersistedRef' | 'undoRemovalRef'> & {
    setPortfolioRevision: Dispatch<SetStateAction<number>>;
    marketRegime: MarketRegimeResult;
    aiLearningState: AiLearningState;
  };

export function useAppPortfolioActions({
  setState,
  stateRef,
  lastPersistedRef,
  undoRemovalRef,
  setPortfolioRevision,
  marketRegime,
  aiLearningState,
}: Params) {
  const tradeBlockedReason = useCallback((): string | null => {
    const ks = getPersonalKillSwitchesSnapshot();
    if (ks.readOnlyMode) return HOLDING_ERRORS.readOnlyMode;
    if (ks.disableTradeSubmission) return HOLDING_ERRORS.tradeSubmissionStopped;
    return null;
  }, []);

  const persistPortfolioStateNow = useCallback(async (next: AppState): Promise<{ ok: boolean; error?: string }> => {
    try {
      const previous = lastPersistedRef.current ?? next;
      const guarded = guardAppStateForPersistence(next, previous);
      await saveAppState(guarded);
      void backupPortfolioIfNonEmpty(guarded);
      void saveHealthyPortfolioSnapshot(guarded);
      lastPersistedRef.current = guarded;
      stateRef.current = guarded;
      setState(guarded);
      return { ok: true };
    } catch {
      return { ok: false, error: HOLDING_ERRORS.saveFailed };
    }
  }, [lastPersistedRef, stateRef, setState]);

  const removeHolding = useCallback(
    async (positionId: string): Promise<{ ok: boolean; error?: string; canUndo?: boolean }> => {
      if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
        return { ok: false, error: '読み取り専用モードでは削除できません' };
      }
      const ledger = stateRef.current.appMode === 'practice' ? 'practice' : 'manual';
      let removed: PortfolioPosition | null = null;
      setState((prev) => {
        if (ledger === 'practice') {
          const { portfolio, removed: r } = removePortfolioPosition(prev.practice.portfolio, positionId);
          removed = r;
          return { ...prev, practice: { ...prev.practice, portfolio } };
        }
        const { portfolio, removed: r } = removePortfolioPosition(prev.portfolio, positionId);
        removed = r;
        return { ...prev, portfolio };
      });
      if (!removed) return { ok: false, error: '保有が見つかりません' };
      undoRemovalRef.current = { position: removed, ledger };
      setPortfolioRevision((v) => v + 1);
      return { ok: true, canUndo: true };
    },
    [setState, stateRef, undoRemovalRef, setPortfolioRevision],
  );

  const undoLastHoldingRemoval = useCallback(() => {
    const undo = undoRemovalRef.current;
    if (!undo) return;
    setState((prev) => {
      if (undo.ledger === 'practice') {
        return {
          ...prev,
          practice: {
            ...prev.practice,
            portfolio: [undo.position, ...prev.practice.portfolio],
          },
        };
      }
      return { ...prev, portfolio: [undo.position, ...prev.portfolio] };
    });
    undoRemovalRef.current = null;
    setPortfolioRevision((v) => v + 1);
  }, [setState, undoRemovalRef, setPortfolioRevision]);

  const setAppMode = useCallback((appMode: AppMode) => {
    setState((prev) => ({ ...prev, appMode }));
  }, [setState]);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    if (getPersonalKillSwitchesSnapshot().readOnlyMode) return;
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...partial } }));
  }, [setState]);

  const addDeposit = useCallback((deposit: Omit<DepositPlan, 'id'>) => {
    setState((prev) => ({
      ...prev,
      deposits: [{ ...deposit, id: `${Date.now()}` }, ...prev.deposits],
    }));
  }, [setState]);

  const toggleDepositCompleted = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      deposits: prev.deposits.map((d) => (d.id === id ? { ...d, completed: !d.completed } : d)),
    }));
  }, [setState]);

  const submitTradeWithExecutionSafety = useCallback(
    async (trade: Omit<TradeRecord, 'id'>, ledgerMode: ExecutionLedgerMode) => {
      const blocked = tradeBlockedReason();
      if (blocked) return { ok: false as const, error: blocked };
      const handlers = createDefaultExecutionHandlers(
        () => stateRef.current,
        setState,
        (next) => {
          stateRef.current = next;
        },
      );
      const result = await submitExecutionOrder(
        {
          ledgerMode,
          symbol: trade.symbol,
          market: trade.market,
          currency: trade.currency,
          side: trade.side,
          quantity: trade.shares,
          requestedPrice: trade.price,
          brokerageFee: trade.brokerageFee,
          executedAt: trade.executedAt,
        },
        handlers,
      );
      if (result.ok) {
        setPortfolioRevision((v) => v + 1);
        const persist = await persistPortfolioStateNow(stateRef.current);
        if (!persist.ok) {
          return { ok: false as const, error: persist.error ?? HOLDING_ERRORS.saveFailed };
        }
        return { ok: true as const };
      }
      return {
        ok: false as const,
        error: result.error,
        uncertain: result.uncertain,
        duplicate: result.duplicate,
      };
    },
    [tradeBlockedReason, persistPortfolioStateNow, setState, stateRef, setPortfolioRevision],
  );

  const addManualHolding = useCallback(
    async (input: ManualHoldingInput) => {
      const blocked = tradeBlockedReason();
      if (blocked) return { ok: false, error: blocked };
      if (stateRef.current.appMode === 'practice') {
        return { ok: false, error: HOLDING_ERRORS.manualAddLiveAnalysisOnly };
      }

      const mutation = applyManualHoldingToState(stateRef.current, input);
      if (!mutation.ok) return { ok: false, error: mutation.error };

      if (mutation.journalEntry) {
        await appendExecutionJournalEntry(mutation.journalEntry);
      }

      const persist = await persistPortfolioStateNow(mutation.state);
      if (!persist.ok) {
        return { ok: false, error: persist.error ?? HOLDING_ERRORS.saveFailed };
      }
      setPortfolioRevision((v) => v + 1);
      return { ok: true };
    },
    [tradeBlockedReason, persistPortfolioStateNow, stateRef, setPortfolioRevision],
  );

  const addTrade = useCallback(
    async (trade: Omit<TradeRecord, 'id'>) => submitTradeWithExecutionSafety(trade, 'manual'),
    [submitTradeWithExecutionSafety],
  );

  const addPracticeTrade = useCallback(
    async (trade: Omit<TradeRecord, 'id'>) => {
      const prev = stateRef.current;
      const stats = calculatePracticeStats(prev.practice);
      const bp = calculateBuyingPower(prev);
      const baseInput = buildInstitutionalRiskInputFromApp({
        state: prev,
        isPractice: true,
        practiceStats: stats,
        buyingPower: bp,
        regime: marketRegime,
      });
      const peak = stats.virtualCapitalMYR;
      const dd =
        peak > 0 ? Math.max(0, ((peak - stats.portfolioValueMYR) / peak) * 100) : 0;
      const riskInput = enrichInstitutionalRiskWithMetaCapital(
        enrichInstitutionalRiskWithModelStability(
          enrichInstitutionalRiskWithBehavioral(baseInput, {
            winCount: stats.winCount,
            lossCount: stats.lossCount,
            lastTradeIntent: {
              symbol: trade.symbol,
              side: trade.side,
              shares: trade.shares,
              priceMYR: toMYR(trade.price, trade.currency),
            },
          }),
          {
            aiLearning: aiLearningState,
            liveReturnEwmaPct: stats.totalReturnPct,
          },
        ),
        {
          totalCapitalMYR: stats.virtualCapitalMYR,
          cashBalanceMYR: stats.cashBalanceMYR,
          practiceStats: stats,
          portfolioDrawdownPct: dd,
        },
      );
      const gate = validateTradeIntent(
        {
          symbol: trade.symbol,
          market: trade.market,
          currency: trade.currency,
          side: trade.side,
          shares: trade.shares,
          price: trade.price,
          brokerageFee: trade.brokerageFee,
        },
        riskInput,
      );
      if (!gate.allowed) {
        const msg = gate.violations.map((v) => v.messageJa).join(' · ');
        return { ok: false, error: msg || 'リスク統制により取引を拒否しました' };
      }
      const finalTrade =
        gate.adjustedShares != null ? { ...trade, shares: gate.adjustedShares } : trade;

      const execResult = await submitTradeWithExecutionSafety(finalTrade, 'practice');
      if (!execResult.ok) return execResult;

      if (finalTrade.side === 'sell') {
        const latest = stateRef.current.practice.trades[0];
        void recordTradeOutcomeForBehavior({
          side: 'sell',
          realizedPnLMYR: latest?.realizedPnLMYR,
        });
      }
      return { ok: true };
    },
    [marketRegime, aiLearningState, submitTradeWithExecutionSafety, stateRef],
  );

  const setPracticeVirtualCapital = useCallback((amountMYR: number) => {
    setState((prev) => ({
      ...prev,
      practice: setVirtualCapital(prev.practice, amountMYR),
    }));
  }, [setState]);

  const addPracticeDeposit = useCallback((amountMYR: number) => {
    setState((prev) => ({
      ...prev,
      practice: addVirtualDeposit(prev.practice, amountMYR),
    }));
  }, [setState]);

  const resetPracticeAccount = useCallback(() => {
    setState((prev) => ({ ...prev, practice: resetPractice() }));
  }, [setState]);

  const addDividend = useCallback((dividend: Omit<DividendRecord, 'id'>) => {
    const record: DividendRecord = { ...dividend, id: `${Date.now()}` };
    setState((prev) => ({
      ...prev,
      dividends: [record, ...prev.dividends],
    }));
  }, [setState]);

  const applyAllocationPractice = useCallback(async (plan: AllocationPlan) => {
    const result = await executePracticeBulkBuy(stateRef.current, plan);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        skipped: result.skipped,
        debug: result.debug,
      };
    }

    stateRef.current = result.state;
    setState(result.state);
    setPortfolioRevision((v) => v + 1);

    return {
      ok: true,
      boughtCount: result.boughtCount,
      skipped: result.skipped,
      partialSkipMessage: result.partialSkipMessage,
      debug: result.debug,
    };
  }, [stateRef, setState, setPortfolioRevision]);

  const reloadHoldingsFromStorage = useCallback(async () => {
    try {
      const { state: persisted } = await loadAppStateTrusted();
      const loaded = await restorePortfolioFromBackup(persisted);

      setState((prev) => {
        const practicePortfolio = mergePortfolioFromPersistence(
          prev.practice.portfolio,
          loaded.practice.portfolio,
        );
        const manualPortfolio = mergePortfolioFromPersistence(prev.portfolio, loaded.portfolio);
        const next: AppState = {
          ...prev,
          appMode: loaded.appMode,
          practice: { ...loaded.practice, portfolio: practicePortfolio },
          portfolio: manualPortfolio,
          trades: loaded.trades,
        };
        if (isDev) {
          console.log(
            'loaded holdings count',
            practicePortfolio.filter((p) => p.shares > 0).length,
          );
        }
        stateRef.current = next;
        return next;
      });
      setPortfolioRevision((v) => v + 1);
    } catch (err) {
      if (isDev) {
        console.log('loaded holdings on portfolio screen — storage read failed (debug)', err);
      }
    }
  }, [setState, stateRef, setPortfolioRevision]);

  const addAllocationToManualOrderList = useCallback((plan: AllocationPlan) => {
    const items = candidatesToManualBuyItems(plan.candidates);
    if (items.length === 0) {
      return { ok: false, error: 'この金額では購入できる銘柄がありません' };
    }
    setState((prev) => ({
      ...prev,
      manualOrderList: [...items, ...prev.manualOrderList],
    }));
    return { ok: true, addedCount: items.length };
  }, [setState]);

  const addManualSellFromHolding = useCallback(
    (position: PortfolioPosition, name: string, currentPrice: number) => {
      const item: ManualOrderItem = {
        id: `manual-sell-${Date.now()}-${position.symbol}`,
        symbol: position.symbol,
        name,
        market: position.market,
        currency: position.currency,
        side: 'sell',
        entryPrice: currentPrice,
        estimatedShares: position.shares,
        allocationMYR: estimateProceedsMYR(position.shares, currentPrice, position.currency),
        orderMethod: MANUAL_SELL_ORDER_METHOD,
        completed: false,
        createdAt: new Date().toISOString(),
        source: 'holding',
      };
      setState((prev) => ({
        ...prev,
        manualOrderList: [item, ...prev.manualOrderList],
      }));
    },
    [setState],
  );

  const practiceSellAll = useCallback(
    (position: PortfolioPosition, _name: string, currentPrice: number) => {
      let error: string | undefined;
      setState((prev) => {
        const exec = executePracticeSellAll(prev.practice, position, _name, currentPrice);
        if (!exec.ok) {
          error = exec.error;
          return prev;
        }
        return { ...prev, practice: exec.practice };
      });
      if (error) return { ok: false, error };
      return { ok: true };
    },
    [setState],
  );

  const practiceSellAllHoldings = useCallback(
    (sells: Array<{ position: PortfolioPosition; name: string; sellPrice: number }>) => {
      let error: string | undefined;
      let result: SellAllResult | undefined;
      setState((prev) => {
        const exec = executePracticeSellAllHoldings(prev.practice, sells);
        if (!exec.ok) {
          error = exec.error;
          return prev;
        }
        result = exec.result;
        return { ...prev, practice: exec.practice };
      });
      if (error) return { ok: false, error };
      return { ok: true, result };
    },
    [setState],
  );

  const addManualSellAllChecklist = useCallback(
    (
      entries: Array<{ position: PortfolioPosition; name: string; currentPrice: number }>,
      skipped: SellAllLineItem[],
    ): SellAllResult => {
      const items = buildManualSellAllItems(entries);
      const activeLines = entries.map((e) =>
        buildSellAllLineItem(e.position, e.name, e.currentPrice),
      );
      const result = buildManualSellAllResult([...activeLines, ...skipped], items.length > 0);
      setState((prev) => ({
        ...prev,
        manualOrderList: [...items, ...prev.manualOrderList],
      }));
      return result;
    },
    [setState],
  );

  const confirmManualOrderAsExecuted = useCallback(
    async (orderId: string, input: ManualOrderConfirmInput) => {
      const blocked = tradeBlockedReason();
      if (blocked) return { ok: false, error: blocked };

      const mutation = confirmManualOrderInState(stateRef.current, orderId, input);
      if (!mutation.ok) return { ok: false, error: mutation.error };

      if (mutation.journalEntry) {
        await appendExecutionJournalEntry(mutation.journalEntry);
      }

      const persist = await persistPortfolioStateNow(mutation.state);
      if (!persist.ok) {
        return { ok: false, error: persist.error ?? HOLDING_ERRORS.saveFailed };
      }
      setPortfolioRevision((v) => v + 1);
      return { ok: true };
    },
    [tradeBlockedReason, persistPortfolioStateNow, stateRef, setPortfolioRevision],
  );

  const clearCompletedManualOrders = useCallback(() => {
    setState((prev) => ({
      ...prev,
      manualOrderList: prev.manualOrderList.filter((i) => !i.completed),
    }));
  }, [setState]);

  const removePendingManualOrder = useCallback(
    (orderId: string): { ok: boolean; error?: string } => {
      if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
        return { ok: false, error: '読み取り専用モードでは削除できません' };
      }
      let found = false;
      setState((prev) => {
        const nextList = prev.manualOrderList.filter((i) => {
          if (i.id !== orderId) return true;
          found = true;
          return false;
        });
        if (!found) return prev;
        const next = { ...prev, manualOrderList: nextList };
        stateRef.current = next;
        return next;
      });
      if (!found) return { ok: false, error: '候補が見つかりません' };
      return { ok: true };
    },
    [setState, stateRef],
  );

  const updateManualOrderEntryPrice = useCallback(
    (orderId: string, entryPrice: number, estimatedShares?: number) => {
      if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
        return { ok: false as const, error: '読み取り専用モードでは編集できません' };
      }
      if (stateRef.current.appMode === 'practice') {
        return { ok: false as const, error: '実口座モードでのみ指値を登録できます' };
      }

      let error: string | undefined;
      setState((prev) => {
        const result = applyManualOrderEntryPriceUpdate(
          prev.manualOrderList,
          orderId,
          entryPrice,
          estimatedShares,
        );
        if (!result.ok) {
          error = result.error;
          return prev;
        }
        const next = { ...prev, manualOrderList: result.orders };
        stateRef.current = next;
        return next;
      });
      if (error) return { ok: false as const, error };
      return { ok: true as const };
    },
    [setState, stateRef],
  );

  const addScreenerCandidateToManualList = useCallback((stock: RankedStock) => {
    let duplicate = false;
    setState((prev) => {
      const exists = prev.manualOrderList.some(
        (i) =>
          i.symbol === stock.symbol &&
          i.market === stock.market &&
          i.side === 'buy' &&
          !i.completed,
      );
      if (exists) {
        duplicate = true;
        return prev;
      }
      const shares = 1;
      const entryPrice = stock.price > 0 ? stock.price : 0;
      const item: ManualOrderItem = {
        id: `screener-${stock.market}-${stock.symbol}-${Date.now()}`,
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        currency: stock.currency,
        side: 'buy',
        entryPrice,
        estimatedShares: shares,
        allocationMYR: entryPrice > 0 ? toMYR(entryPrice * shares, stock.currency) : 0,
        orderMethod: MANUAL_ORDER_METHOD,
        completed: false,
        createdAt: new Date().toISOString(),
        source: 'screener',
      };
      return { ...prev, manualOrderList: [item, ...prev.manualOrderList] };
    });
    if (duplicate) return { ok: false, error: 'すでに候補リストに追加されています' };
    return { ok: true };
  }, [setState]);

  const updateHoldingCurrentPrice = useCallback((positionId: string, currentPrice: number) => {
    if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
      return { ok: false, error: '読み取り専用モードでは編集できません' };
    }
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      return { ok: false, error: '0より大きい数値を入力してください。' };
    }

    setState((prev) => {
      let next: AppState;
      if (prev.appMode === 'practice') {
        const portfolio = updatePositionCurrentPrice(prev.practice.portfolio, positionId, currentPrice);
        next = { ...prev, practice: { ...prev.practice, portfolio } };
      } else {
        const portfolio = updatePositionCurrentPrice(prev.portfolio, positionId, currentPrice);
        const valueMYR = portfolioMarketValueMYR({ ...prev, portfolio });
        const today = new Date().toISOString().slice(0, 10);
        const performanceHistory = appendPerformanceSnapshot(prev.performanceHistory, today, valueMYR);
        next = { ...prev, portfolio, performanceHistory };
      }
      stateRef.current = next;
      return next;
    });

    return { ok: true };
  }, [setState, stateRef]);

  const updateHoldingSymbol = useCallback((positionId: string, symbol: string) => {
    if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
      return { ok: false, error: '読み取り専用モードでは編集できません' };
    }
    const trimmed = symbol.trim().toUpperCase();
    if (!trimmed) return { ok: false, error: '銘柄コードを入力してください。' };

    setState((prev) => {
      let next: AppState;
      if (prev.appMode === 'practice') {
        const portfolio = updatePositionSymbol(prev.practice.portfolio, positionId, trimmed);
        next = { ...prev, practice: { ...prev.practice, portfolio } };
      } else {
        const portfolio = updatePositionSymbol(prev.portfolio, positionId, trimmed);
        next = { ...prev, portfolio };
      }
      stateRef.current = next;
      return next;
    });
    return { ok: true };
  }, [setState, stateRef]);

  const updateHoldingMarket = useCallback((positionId: string, market: Market) => {
    if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
      return { ok: true };
    }
    setState((prev) => {
      let next: AppState;
      if (prev.appMode === 'practice') {
        const portfolio = updatePositionMarket(prev.practice.portfolio, positionId, market);
        next = { ...prev, practice: { ...prev.practice, portfolio } };
      } else {
        const portfolio = updatePositionMarket(prev.portfolio, positionId, market);
        next = { ...prev, portfolio };
      }
      stateRef.current = next;
      return next;
    });
    return { ok: true };
  }, [setState, stateRef]);

  const stageRakutenImportManual = useCallback(
    async (input: RakutenImportManualFormInput) => {
      const blocked = tradeBlockedReason();
      if (blocked) return { ok: false as const, error: blocked };

      const journal = await loadExecutionJournal();
      const { batch, candidate } = buildManualImportCandidate(input, {
        state: stateRef.current,
        journalEntries: journal.entries,
      });
      await saveImportBatch(batch);
      await appendRakutenImportAuditEntry(
        createAuditEntry({
          event: 'candidate_created',
          batchId: batch.id,
          candidateId: candidate.id,
          candidateType: candidate.type,
          detailJa: candidate.rawInputText,
        }),
      );
      return { ok: true as const, candidateId: candidate.id };
    },
    [tradeBlockedReason, stateRef],
  );

  const stageRakutenImportNaturalLanguage = useCallback(
    async (text: string) => {
      const blocked = tradeBlockedReason();
      if (blocked) return { ok: false as const, error: blocked };

      const journal = await loadExecutionJournal();
      const built = buildNaturalLanguageImportCandidate(text, {
        state: stateRef.current,
        journalEntries: journal.entries,
      });
      if (!built.ok) return { ok: false as const, error: built.error };

      const { batch, candidate } = built;
      await saveImportBatch(batch);
      await appendRakutenImportAuditEntry(
        createAuditEntry({
          event: 'candidate_created',
          batchId: batch.id,
          candidateId: candidate.id,
          candidateType: candidate.type,
          detailJa: candidate.rawInputText,
        }),
      );
      return {
        ok: true as const,
        candidateId: candidate.id,
        candidate: candidate as BrokerTransactionCandidate,
      };
    },
    [tradeBlockedReason, stateRef],
  );

  const commitRakutenImportCandidate = useCallback(
    async (candidateId: string) => {
      const blocked = tradeBlockedReason();
      if (blocked) return { ok: false as const, error: blocked };

      const found = await findImportCandidate(candidateId);
      if (!found) {
        return { ok: false as const, error: '候補が見つかりません。' };
      }

      const mutation = commitImportCandidateInState(stateRef.current, found.candidate);
      if (!mutation.ok) return { ok: false as const, error: mutation.error };

      await appendExecutionJournalEntry(mutation.journalEntry);
      const persist = await persistPortfolioStateNow(mutation.state);
      if (!persist.ok) {
        return { ok: false as const, error: persist.error ?? HOLDING_ERRORS.saveFailed };
      }
      setState(mutation.state);
      stateRef.current = mutation.state;
      setPortfolioRevision((v) => v + 1);

      await upsertImportCandidate(found.batch.id, mutation.candidate);
      await appendRakutenImportAuditEntry(
        createAuditEntry({
          event: 'candidate_confirmed',
          batchId: found.batch.id,
          candidateId: mutation.candidate.id,
          candidateType: mutation.candidate.type,
          mappedRecordIds: mutation.candidate.mappedRecordIds,
          detailJa: 'ユーザー確認後に保存',
        }),
      );
      await pruneConfirmedBatches();
      return { ok: true as const };
    },
    [tradeBlockedReason, stateRef, setState, persistPortfolioStateNow],
  );

  const rejectRakutenImportCandidate = useCallback(async (candidateId: string) => {
    const found = await findImportCandidate(candidateId);
    if (!found) return;
    const rejected = {
      ...found.candidate,
      status: 'rejected' as const,
      rejectedAt: new Date().toISOString(),
    };
    await upsertImportCandidate(found.batch.id, rejected);
    await appendRakutenImportAuditEntry(
      createAuditEntry({
        event: 'candidate_rejected',
        batchId: found.batch.id,
        candidateId,
        candidateType: found.candidate.type,
      }),
    );
    await pruneConfirmedBatches();
  }, []);

  return {
    tradeBlockedReason,
    persistPortfolioStateNow,
    removeHolding,
    undoLastHoldingRemoval,
    setAppMode,
    updateSettings,
    addDeposit,
    toggleDepositCompleted,
    submitTradeWithExecutionSafety,
    addManualHolding,
    addTrade,
    addPracticeTrade,
    setPracticeVirtualCapital,
    addPracticeDeposit,
    resetPracticeAccount,
    addDividend,
    applyAllocationPractice,
    reloadHoldingsFromStorage,
    addAllocationToManualOrderList,
    addManualSellFromHolding,
    practiceSellAll,
    practiceSellAllHoldings,
    addManualSellAllChecklist,
    confirmManualOrderAsExecuted,
    clearCompletedManualOrders,
    removePendingManualOrder,
    updateManualOrderEntryPrice,
    addScreenerCandidateToManualList,
    updateHoldingCurrentPrice,
    updateHoldingSymbol,
    updateHoldingMarket,
    stageRakutenImportManual,
    stageRakutenImportNaturalLanguage,
    commitRakutenImportCandidate,
    rejectRakutenImportCandidate,
  };
}
