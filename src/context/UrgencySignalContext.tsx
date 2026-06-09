import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAiTradeQueue } from './AiTradeQueueContext';
import { emitChatAuditNotice } from '../services/chatMessageFactory';
import {
  acknowledgeSystemSignal,
  acknowledgeTradeQueueItem,
  loadSystemAckMap,
  loadTradeQueueAckMap,
  type TradeQueueAckRecord,
} from '../services/tradeQueueAckStorage';
import { resolveEffectiveQueueAckStatus, isActiveSignalStatus } from '../services/tradeQueueStatusResolver';
import { countDiagnosticsBySeverity } from '../services/structuredDiagnostics';
import {
  aggregateUrgencySignals,
  pickActiveUrgencySignal,
  type QueueItemWithAck,
} from '../services/urgencySignalAggregator';
import { playUrgentSignalFeedback } from '../services/urgencyAlertFeedback';
import type { TradeQueueAckStatus, UrgencySignal } from '../types/urgencySignal';
import { AI_UI } from '../constants/aiStrategyBriefing';
import {
  buildNoActiveSignalReasons,
  logNoActiveSignalReason,
} from '../services/actionCenterDiagnostics';
import { useApp } from './AppContext';
import { useCentralIntelligence } from '../hooks/useCentralIntelligence';

export type SignalFocusHandler = (signal: UrgencySignal) => void;

type UrgencySignalContextValue = {
  activeSignal: UrgencySignal | null;
  allSignals: UrgencySignal[];
  queueWithAck: QueueItemWithAck[];
  systemSignals: UrgencySignal[];
  highlightedSignalId: string | null;
  showDisabledItems: boolean;
  setShowDisabledItems: (value: boolean) => void;
  ackSignals: () => Promise<void>;
  refreshPrices: () => Promise<unknown>;
  acknowledgeSignal: (signalId: string) => Promise<void>;
  acknowledgeQueueItem: (itemId: string) => Promise<void>;
  getQueueAckStatus: (itemId: string) => TradeQueueAckStatus;
  focusSignal: (signal: UrgencySignal) => void;
  registerSignalFocusHandler: (handler: SignalFocusHandler | null) => void;
  clearHighlight: () => void;
  nowMs: number;
  toastMessage: string | null;
  clearToast: () => void;
  showAcknowledgedToast: () => void;
};

const UrgencySignalContext = createContext<UrgencySignalContextValue | null>(null);

export function UrgencySignalProvider({ children }: { children: ReactNode }) {
  const { degradedMode, killSwitches, aiPreferences } = useApp();
  const { queue: baseQueue, refreshPrices } = useAiTradeQueue();
  const { worldModel } = useCentralIntelligence();
  const [itemAckMap, setItemAckMap] = useState<Record<string, TradeQueueAckRecord>>({});
  const [systemAckMap, setSystemAckMap] = useState<Record<string, TradeQueueAckRecord>>({});
  const [revision, setRevision] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [highlightedSignalId, setHighlightedSignalId] = useState<string | null>(null);
  const [showDisabledItems, setShowDisabledItems] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const focusHandlerRef = useRef<SignalFocusHandler | null>(null);
  const lastAlertedSignalIdRef = useRef<string | null>(null);

  const reloadAck = useCallback(async () => {
    const [items, system] = await Promise.all([loadTradeQueueAckMap(), loadSystemAckMap()]);
    setItemAckMap(items);
    setSystemAckMap(system);
    setRevision((r) => r + 1);
    setNowMs(Date.now());
  }, []);

  useEffect(() => {
    void reloadAck();
  }, [reloadAck]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const queueWithAck = useMemo((): QueueItemWithAck[] => {
    return baseQueue.map((item) => ({
      ...item,
      ackStatus: resolveEffectiveQueueAckStatus(item, itemAckMap, nowMs),
    }));
  }, [baseQueue, itemAckMap, revision, nowMs]);

  const diagnostics = useMemo(() => countDiagnosticsBySeverity(), [revision, worldModel]);

  const allSignals = useMemo(() => {
    return aggregateUrgencySignals({
      queueItems: queueWithAck,
      staleHoldingsCount: worldModel?.portfolioRisk.staleHoldingsCount ?? 0,
      degradedMode: degradedMode || Boolean(worldModel?.operations.degradedMode),
      degradedReasonsJa: worldModel?.operations.degradedReasonsJa ?? [],
      diagnosticsCriticalCount: diagnostics.critical,
      diagnosticsErrorCount: diagnostics.error,
      executionBlocked:
        killSwitches.readOnlyMode || killSwitches.disableTradeSubmission,
      systemAckMap,
      nowMs,
    });
  }, [
    queueWithAck,
    worldModel,
    degradedMode,
    diagnostics,
    killSwitches,
    systemAckMap,
    nowMs,
  ]);

  const activeSignal = useMemo(() => pickActiveUrgencySignal(allSignals), [allSignals]);

  useEffect(() => {
    if (activeSignal) return;
    const activeQueue = queueWithAck.filter((q) => isActiveSignalStatus(q.ackStatus)).length;
    const reasons = buildNoActiveSignalReasons({
      allSignalsCount: allSignals.length,
      queueItemsCount: queueWithAck.length,
      activeQueueSignals: activeQueue,
      staleHoldingsCount: worldModel?.portfolioRisk.staleHoldingsCount ?? 0,
      degradedMode: degradedMode || Boolean(worldModel?.operations.degradedMode),
      diagnosticsCritical: diagnostics.critical,
      diagnosticsError: diagnostics.error,
      executionBlocked:
        killSwitches.readOnlyMode || killSwitches.disableTradeSubmission,
      reasonsJa: [],
    });
    logNoActiveSignalReason({
      allSignalsCount: allSignals.length,
      queueItemsCount: queueWithAck.length,
      activeQueueSignals: activeQueue,
      staleHoldingsCount: worldModel?.portfolioRisk.staleHoldingsCount ?? 0,
      degradedMode: degradedMode || Boolean(worldModel?.operations.degradedMode),
      diagnosticsCritical: diagnostics.critical,
      diagnosticsError: diagnostics.error,
      executionBlocked:
        killSwitches.readOnlyMode || killSwitches.disableTradeSubmission,
      reasonsJa: reasons,
    });
  }, [
    activeSignal,
    allSignals.length,
    queueWithAck,
    worldModel,
    degradedMode,
    diagnostics.critical,
    diagnostics.error,
    killSwitches.readOnlyMode,
    killSwitches.disableTradeSubmission,
  ]);

  useEffect(() => {
    if (!activeSignal || activeSignal.level !== 'critical') return;
    if (lastAlertedSignalIdRef.current === activeSignal.id) return;
    lastAlertedSignalIdRef.current = activeSignal.id;
    void playUrgentSignalFeedback(activeSignal.level, {
      urgentVibrationEnabled: aiPreferences.urgentVibrationEnabled,
      urgentSoundEnabled: aiPreferences.urgentSoundEnabled,
    });
  }, [
    activeSignal,
    aiPreferences.urgentVibrationEnabled,
    aiPreferences.urgentSoundEnabled,
  ]);

  const clearToast = useCallback(() => setToastMessage(null), []);

  const showAcknowledgedToast = useCallback(() => {
    setToastMessage(AI_UI.acknowledgedToast);
  }, []);

  const systemSignals = useMemo(
    () => allSignals.filter((s) => s.source !== 'trade_queue'),
    [allSignals],
  );

  const acknowledgeSignal = useCallback(
    async (signalId: string) => {
      const signal = allSignals.find((s) => s.id === signalId);
      if (signalId.startsWith('sys-')) {
        await acknowledgeSystemSignal(signalId);
      } else {
        await acknowledgeTradeQueueItem(signalId);
      }
      await reloadAck();
      if (signal) {
        const label = signal.ticker
          ? `${signal.actionLabel} (${signal.ticker})`
          : signal.actionLabel;
        emitChatAuditNotice(`シグナル確認: ${label}`, 'signal');
      }
    },
    [allSignals, reloadAck],
  );

  const acknowledgeQueueItem = useCallback(
    async (itemId: string) => {
      const item = baseQueue.find((q) => q.id === itemId);
      await acknowledgeTradeQueueItem(itemId);
      await reloadAck();
      if (item) {
        emitChatAuditNotice(
          `キュー確認: ${item.ticker} ${item.suggestedAction}`,
          'queue_ack',
        );
      }
    },
    [baseQueue, reloadAck],
  );

  const getQueueAckStatus = useCallback(
    (itemId: string) => {
      const item = baseQueue.find((q) => q.id === itemId);
      if (!item) return 'unacknowledged' as TradeQueueAckStatus;
      return resolveEffectiveQueueAckStatus(item, itemAckMap, nowMs);
    },
    [baseQueue, itemAckMap, nowMs],
  );

  const registerSignalFocusHandler = useCallback((handler: SignalFocusHandler | null) => {
    focusHandlerRef.current = handler;
  }, []);

  const focusSignal = useCallback((signal: UrgencySignal) => {
    setHighlightedSignalId(signal.id);
    focusHandlerRef.current?.(signal);
    setTimeout(() => setHighlightedSignalId(null), 2400);
  }, []);

  const clearHighlight = useCallback(() => setHighlightedSignalId(null), []);

  const value = useMemo(
    (): UrgencySignalContextValue => ({
      activeSignal,
      allSignals,
      queueWithAck,
      systemSignals,
      highlightedSignalId,
      showDisabledItems,
      setShowDisabledItems,
      ackSignals: reloadAck,
      refreshPrices,
      acknowledgeSignal,
      acknowledgeQueueItem,
      getQueueAckStatus,
      focusSignal,
      registerSignalFocusHandler,
      clearHighlight,
      nowMs,
      toastMessage,
      clearToast,
      showAcknowledgedToast,
    }),
    [
      activeSignal,
      allSignals,
      queueWithAck,
      systemSignals,
      highlightedSignalId,
      showDisabledItems,
      reloadAck,
      refreshPrices,
      acknowledgeSignal,
      acknowledgeQueueItem,
      getQueueAckStatus,
      focusSignal,
      registerSignalFocusHandler,
      clearHighlight,
      nowMs,
      toastMessage,
      clearToast,
      showAcknowledgedToast,
    ],
  );

  return (
    <UrgencySignalContext.Provider value={value}>{children}</UrgencySignalContext.Provider>
  );
}

export function useUrgencySignals(): UrgencySignalContextValue {
  const ctx = useContext(UrgencySignalContext);
  if (!ctx) {
    throw new Error('useUrgencySignals must be used within UrgencySignalProvider');
  }
  return ctx;
}

export function useUrgencySignalsOptional(): UrgencySignalContextValue | null {
  return useContext(UrgencySignalContext);
}
