import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AiChatMessage } from '../types/aiChat';
import type { AiRequestStatus, AiStrategyChatResult } from '../types/aiStrategy';
import { AI_ERROR_TIMEOUT, AI_MAX_IN_FLIGHT_MS } from '../constants/aiStrategy';
import {
  createAssistantChatMessage,
  createUserChatMessage,
  getInitialAiChatMessages,
} from '../data/mockAiChat';
import { AI_CONCIERGE_UI } from '../constants/aiConcierge';
import {
  AI_CHAT_TITLE,
  AI_PERSONAL_SAFETY_FOOTER,
  AI_SAMPLE_QUESTIONS,
  AI_UI,
} from '../constants/aiStrategyBriefing';
import { useApp } from '../context/AppContext';
import { loadAiChatHistory, saveAiChatHistory } from '../services/aiChatHistoryStorage';
import {
  createAssistantChatMessagePartial,
  registerChatAuditListener,
} from '../services/chatMessageFactory';
import { normalizeChatHistory } from '../utils/chatTimestamp';
import { ChatMessageTimestamp } from './chat/ChatMessageTimestamp';
import {
  getConciergeInstantAnswer,
  shouldAcceptChatSend,
} from '../services/aiConciergeInstantAnswers';
import { CONCIERGE_SECTION_TEST_ID } from '../constants/aiConciergeLayout';
import { classifyConciergeResponseIntent } from '../services/aiConciergeResponseIntent';
import { shouldShowStructuredForMode } from '../services/aiConciergeConversationMode';
import { enrichConciergeChatMessage } from '../services/aiConciergeMessageEnrich';
import { useCentralIntelligence } from '../hooks/useCentralIntelligence';
import { probeAiApiConnection } from '../services/aiStrategyService';
import {
  getVoiceInputAvailability,
  startVoiceCapture,
  stopVoiceCapture,
  type VoiceInputStatus,
} from '../services/aiVoiceInputService';
import {
  buildSessionMemoryFromMessages,
  createEmptyConciergeSessionMemory,
  recordConciergeAssistantTurn,
  updateConciergeSessionMemory,
} from '../services/aiConciergeSessionMemory';
import {
  isVoiceOutputSpeaking,
  speakVoiceOutput,
  stopVoiceOutput,
} from '../services/aiVoiceOutputService';
import { streamRevealText } from '../services/streamRevealText';
import {
  resolveIdleConnectionStatus,
  shouldShowApiSpinner,
  statusJaForRequestStatus,
} from '../utils/aiAssistantChatState';
import { PROACTIVE_CHAT_UI_TIMEOUT_MS, PROACTIVE_UI } from '../constants/proactiveConcierge';
import { useProactiveConciergeOptional } from '../context/ProactiveConciergeContext';
import {
  useExplainableGovernanceDashboardBundle,
  useRuntimeSurvivalDashboardBundle,
  useRuntimeTelemetryDashboardBundle,
  useStrategicMemoryDashboardBundle,
  useUnifiedCognitiveDashboardBundle,
} from '../hooks/useConciergeDashboardSlices';
import { StaleSafeDashboardShell } from './concierge/StaleSafeDashboardShell';
import { activateAnalysisMode, detectAnalysisRequestJa } from '../services/layerRuntimeScheduler';
import { useAppForeground } from '../hooks/useAppForeground';
import { isUnhandledProactiveStatus } from '../types/proactiveSuggestion';
import { ProactiveSuggestionCard } from './proactive/ProactiveSuggestionCard';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { SelectableText } from './ui/SelectableText';
import { theme } from '../theme';
import { ConciergeActionPanel } from './concierge/ConciergeActionPanel';
import { ConciergeEvidencePanel } from './concierge/ConciergeEvidencePanel';
import { MarketSituationCard } from './concierge/MarketSituationCard';
import { ConciergeRiskControlPanel } from './concierge/ConciergeRiskControlPanel';
import { PortfolioIntelligencePanel } from './concierge/PortfolioIntelligencePanel';
import { ConciergePromptDebugPanel } from './concierge/ConciergePromptDebugPanel';
import {
  AI_ANALYSIS_MODE_LABELS_JA,
  AI_ANALYSIS_MODE_ORDER,
} from '../constants/aiDataDriven';
import { buildConciergeUxBundle } from '../services/conciergeUxPriorityBuilder';
import { buildShortAnswerFromStructured } from '../services/conciergeHumanizeText';
import { ConciergeUxModeToggle } from './concierge/ConciergeUxModeToggle';
import { ConciergeOneScreenDashboard } from './concierge/ConciergeOneScreenDashboard';
import { ConciergeMarketRadar } from './concierge/ConciergeMarketRadar';
import { ConciergeNotificationDigest } from './concierge/ConciergeNotificationDigest';
import { ConciergeContextMemoryPanel } from './concierge/ConciergeContextMemoryPanel';
import { ConciergeShortAnswerBlock } from './concierge/ConciergeShortAnswerBlock';
import { ConciergePrioritySection } from './concierge/ConciergePrioritySection';
import { ConciergeUxAdvancedStrip } from './concierge/ConciergeUxAdvancedStrip';
import { usePerformanceCostOptional } from '../context/PerformanceCostContext';
import {
  LazyAiActionCenterPanel,
  LazyAiPerformanceCenterPanel,
  LazyAutonomousMonitoringPanel,
  LazyExecutionDashboardPanel,
  LazyMetaTopPrioritiesPanel,
  LazySelfEvaluationPanel,
  LazyWorldStatePanel,
  LazyDataReliabilityPanel,
  LazyPortfolioRiskExposurePanel,
  LazyCapitalAllocationPanel,
  LazySystemStabilityIntegrityPanel,
  LazyAiGovernancePanel,
  LazyReactiveEventDashboardPanel,
  LazyExplainabilityDashboardPanel,
  LazyResourceDashboardPanel,
  LazyIntegrityDashboardPanel,
  LazySemanticDashboardPanel,
  LazyReliabilityDashboardPanel,
  LazyArbitrationDashboardPanel,
  LazyMetaAuditDashboardPanel,
  LazyMemoryCompressionDashboardPanel,
  LazySystemicStabilityDashboardPanel,
  LazyExecutionRecoveryDashboardPanel,
  LazyDynamicOrchestrationDashboardPanel,
  LazyMarketRegimeDashboardPanel,
  LazyCognitiveConsensusDashboardPanel,
  LazyMetaReliabilityDashboardPanel,
  LazySelfArchitectureDashboardPanel,
  LazyEpistemicIntegrityDashboardPanel,
  LazyStrategicMemoryGraphDashboardPanel,
  LazyCognitiveResourceEconomyDashboardPanel,
  LazyUnifiedCognitiveStateDashboardPanel,
  LazyHumanIntentContinuityDashboardPanel,
  LazyAdaptiveExplorationDashboardPanel,
  LazyConstitutionalGovernanceDashboardPanel,
  LazyExplainableGovernanceDashboardPanel,
  LazyRuntimeSurvivalDashboardPanel,
  LazyRuntimeTelemetryDashboardPanel,
} from './concierge/lazyConciergePanels';
import { AiPerformanceCenterPanel } from './concierge/AiPerformanceCenterPanel';
import type { ConciergeUxDisplayMode } from '../types/conciergeUx';

function ConciergeWarningBadge({ message }: { message: AiChatMessage }) {
  if (message.conversationMode !== 'warning') return null;
  return (
    <View style={styles.warningBadge}>
      <SelectableText style={styles.warningBadgeText}>システム注意</SelectableText>
    </View>
  );
}

function StructuredBlock({
  message,
  uxMode,
}: {
  message: AiChatMessage;
  uxMode: ConciergeUxDisplayMode;
}) {
  const s = message.structured;
  if (!s) return null;
  const mode = message.conversationMode ?? 'conversation';
  if (!shouldShowStructuredForMode(mode)) {
    return null;
  }
  if (uxMode === 'beginner') {
    return null;
  }
  return (
    <View style={styles.structured}>
      {s.conclusion ? (
        <SelectableText style={styles.structLine}>
          <SelectableText style={styles.structKey}>{AI_UI.conclusion}: </SelectableText>
          {s.conclusion}
        </SelectableText>
      ) : null}
      <SelectableText style={styles.structLine}>
        <SelectableText style={styles.structKey}>理由: </SelectableText>
        {s.reason}
      </SelectableText>
      {s.technicalReason ? (
        <SelectableText style={styles.structLine}>
          <SelectableText style={styles.structKey}>テクニカル: </SelectableText>
          {s.technicalReason}
        </SelectableText>
      ) : null}
      {s.macroReason ? (
        <SelectableText style={styles.structLine}>
          <SelectableText style={styles.structKey}>マクロ: </SelectableText>
          {s.macroReason}
        </SelectableText>
      ) : null}
      {s.systemStateReason ? (
        <SelectableText style={styles.structLine}>
          <SelectableText style={styles.structKey}>システム状態: </SelectableText>
          {s.systemStateReason}
        </SelectableText>
      ) : null}
      {s.confidenceDegradationReason ? (
        <SelectableText style={styles.structLine}>
          <SelectableText style={styles.structKey}>信頼度低下: </SelectableText>
          {s.confidenceDegradationReason}
        </SelectableText>
      ) : null}
      <SelectableText style={styles.structLine}>
        <SelectableText style={styles.structKey}>リスク: </SelectableText>
        {s.risk}
      </SelectableText>
      <SelectableText style={styles.structLine}>
        <SelectableText style={styles.structKey}>市場状況: </SelectableText>
        {s.market}
      </SelectableText>
      <SelectableText style={styles.structLine}>
        <SelectableText style={styles.structKey}>緊急性: </SelectableText>
        {s.urgency}
      </SelectableText>
      <SelectableText style={styles.structLine}>
        <SelectableText style={styles.structKey}>信頼度: </SelectableText>
        {s.confidence}
      </SelectableText>
      <SelectableText style={styles.structLine}>
        <SelectableText style={styles.structKey}>データ鮮度: </SelectableText>
        {s.dataFreshness}
      </SelectableText>
      {s.followUp ? (
        <SelectableText style={styles.structLine}>
          <SelectableText style={styles.structKey}>{AI_UI.followUp}: </SelectableText>
          {s.followUp}
        </SelectableText>
      ) : null}
    </View>
  );
}

function resultToMessage(
  result: AiStrategyChatResult,
  userText: string,
  ops: {
    degradedMode: boolean;
    staleHoldingsCount: number;
    apiHealthDegraded: boolean;
  },
): AiChatMessage {
  const base = createAssistantChatMessagePartial({
    id: `a-${Date.now()}`,
    text: result.text,
    structured: result.structured,
    responseIntent: classifyConciergeResponseIntent(userText),
  });
  const enriched = enrichConciergeChatMessage(base, userText, ops);
  let msg = enriched;
  if (result.evidenceData) msg = { ...msg, evidenceData: result.evidenceData };
  if (result.globalMarketAnalysis) msg = { ...msg, globalMarketAnalysis: result.globalMarketAnalysis };
  if (result.portfolioIntelligence) {
    msg = { ...msg, portfolioIntelligence: result.portfolioIntelligence };
  }
  return msg;
}

function roleLabelJa(msg: AiChatMessage): string {
  if (msg.role === 'user') {
    return msg.messageSource === 'voice' ? AI_UI.voiceLabel : AI_UI.userLabel;
  }
  if (msg.role === 'system') return AI_UI.systemLabel;
  return AI_UI.assistantLabel;
}

function appendChatMessages(prev: AiChatMessage[], ...items: AiChatMessage[]): AiChatMessage[] {
  return normalizeChatHistory([...prev, ...items]);
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

function composingLabelJa(status: AiRequestStatus, isConcierge: boolean): string {
  if (!isConcierge) return AI_UI.sending;
  switch (status) {
    case 'thinking':
      return AI_CONCIERGE_UI.statusThinking;
    case 'retrying':
      return AI_CONCIERGE_UI.statusRetrying;
    case 'reconnecting':
      return AI_CONCIERGE_UI.statusReconnecting;
    case 'degraded':
      return AI_CONCIERGE_UI.statusDegraded;
    case 'streaming':
      return AI_CONCIERGE_UI.statusStreaming;
    case 'waiting_response':
      return AI_CONCIERGE_UI.composingAnswer;
    default:
      return AI_CONCIERGE_UI.composingAnswer;
  }
}

type AiAssistantChatProps = {
  /** @deprecated use variant */
  embedded?: boolean;
  variant?: 'default' | 'embedded' | 'concierge';
  seedMessage?: string;
  focusSuggestionId?: string;
};

export function AiAssistantChat({
  embedded = false,
  variant,
  seedMessage,
  focusSuggestionId,
}: AiAssistantChatProps) {
  const resolvedVariant = variant ?? (embedded ? 'embedded' : 'default');
  const isConcierge = resolvedVariant === 'concierge';
  const isEmbedded = resolvedVariant === 'embedded' || isConcierge;
  const { sendAiStrategyMessage, aiPreferences, saveAiPreferences, aiApiKey } = useApp();
  const { worldModel } = useCentralIntelligence();
  const proactive = useProactiveConciergeOptional();
  const unifiedCognitiveBundle = useUnifiedCognitiveDashboardBundle();
  const strategicMemoryBundle = useStrategicMemoryDashboardBundle();
  const runtimeSurvivalBundle = useRuntimeSurvivalDashboardBundle();
  const runtimeTelemetryBundle = useRuntimeTelemetryDashboardBundle();
  const explainableGovernanceBundle = useExplainableGovernanceDashboardBundle();
  const performanceCost = usePerformanceCostOptional();
  const appForeground = useAppForeground();
  const uxMode = aiPreferences.conciergeUxMode ?? 'beginner';
  const awareness = worldModel?.systemAwareness;
  const initialIdle = resolveIdleConnectionStatus({
    aiEnabled: aiPreferences.aiEnabled,
    mockOnly: aiPreferences.mockOnly,
    hasApiKey: Boolean(aiApiKey.trim()),
  });

  const [messages, setMessages] = useState<AiChatMessage[]>(() => getInitialAiChatMessages());
  const [input, setInput] = useState('');
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [requestStatus, setRequestStatus] = useState<AiRequestStatus>(initialIdle.requestStatus);
  const [statusJa, setStatusJa] = useState(initialIdle.statusJa);
  const [apiConnected, setApiConnected] = useState(false);
  const [usedMockFallback, setUsedMockFallback] = useState(false);
  const [errorJa, setErrorJa] = useState<string | null>(initialIdle.errorJa);
  const [staleWarning, setStaleWarning] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceInputStatus>(() => getVoiceInputAvailability());
  const [voiceNoticeJa, setVoiceNoticeJa] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [slowResponse, setSlowResponse] = useState(false);
  const [retryPrompt, setRetryPrompt] = useState<string | null>(null);
  const seedSentRef = useRef(false);
  const voiceInputPendingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const conciergeScrollRef = useRef<ScrollView>(null);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const sessionMemoryRef = useRef(
    createEmptyConciergeSessionMemory(aiPreferences.aiExplanationLevel),
  );
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
      stopVoiceCapture();
      void stopVoiceOutput();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsCheckingConnection(true);
    setRequestStatus('checking_api_key');
    setStatusJa(statusJaForRequestStatus('checking_api_key'));

    void probeAiApiConnection({
      preferences: aiPreferences,
      apiKey: aiApiKey,
      signal: controller.signal,
      onRequestStatus: (status) => {
        if (!mountedRef.current || controller.signal.aborted) return;
        setRequestStatus(status);
        setStatusJa(statusJaForRequestStatus(status));
      },
    })
      .then((probe) => {
        if (!mountedRef.current || controller.signal.aborted) return;
        setRequestStatus(probe.requestStatus);
        setStatusJa(probe.statusJa);
        setErrorJa(probe.errorJa);
        setApiConnected(probe.apiConnected);
        setUsedMockFallback(false);
      })
      .catch((e) => {
        if (!mountedRef.current || isAbortError(e)) return;
        const idle = resolveIdleConnectionStatus({
          aiEnabled: aiPreferences.aiEnabled,
          mockOnly: aiPreferences.mockOnly,
          hasApiKey: Boolean(aiApiKey.trim()),
        });
        setRequestStatus(idle.requestStatus);
        setStatusJa(idle.statusJa);
        setErrorJa(idle.errorJa);
      })
      .finally(() => {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        if (mountedRef.current) {
          setIsCheckingConnection(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [aiApiKey, aiPreferences.aiEnabled, aiPreferences.mockOnly]);

  useEffect(() => {
    if (!isSending) {
      setSlowResponse(false);
      return;
    }
    const slow = setTimeout(() => setSlowResponse(true), PROACTIVE_CHAT_UI_TIMEOUT_MS);
    return () => clearTimeout(slow);
  }, [isSending]);

  useEffect(() => {
    if (!isSending) return;
    const watchdog = setTimeout(() => {
      if (!mountedRef.current || !isSending) return;
      setIsSending(false);
      setRequestStatus('timeout');
      setStatusJa(statusJaForRequestStatus('timeout'));
      setErrorJa(PROACTIVE_UI.retryPrompt);
      setUsedMockFallback(true);
      setApiConnected(false);
      setMessages((prev) => {
        let retryText: string | null = null;
        const updated = prev.map((m, i) => {
          if (i === prev.length - 1 && m.role === 'user') {
            retryText = m.pendingUserText ?? m.text;
            return { ...m, deliveryStatus: 'timeout' as const, failureKindJa: 'タイムアウト' };
          }
          return m;
        });
        if (retryText) setRetryPrompt(retryText);
        const last = updated[updated.length - 1];
        if (last?.role !== 'user') return updated;
        return appendChatMessages(updated, createAssistantChatMessage(last.text));
      });
    }, AI_MAX_IN_FLIGHT_MS);
    return () => clearTimeout(watchdog);
  }, [isSending]);

  useEffect(() => {
    void loadAiChatHistory().then((loaded) => {
      if (mountedRef.current) {
        setMessages(normalizeChatHistory(loaded));
      }
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      void saveAiChatHistory(messages);
    }
  }, [messages]);

  const applyResult = useCallback((result: AiStrategyChatResult) => {
    setRequestStatus(result.requestStatus);
    setStatusJa(result.statusJa);
    setApiConnected(result.apiConnected);
    setUsedMockFallback(result.usedMockFallback);
    setErrorJa(result.errorJa);
    setStaleWarning(result.staleHoldingsCount > 0);
  }, []);

  const maybeSpeakAssistant = useCallback(
    async (messageId: string, text: string) => {
      if (!appForeground) return;
      if (!aiPreferences.voiceEnabled) return;
      await stopVoiceOutput();
      setSpeakingMessageId(messageId);
      await speakVoiceOutput(text, {
        rate: aiPreferences.voiceSpeechRate,
        onDone: () => setSpeakingMessageId((id) => (id === messageId ? null : id)),
        onStopped: () => setSpeakingMessageId((id) => (id === messageId ? null : id)),
      });
    },
    [aiPreferences.voiceEnabled, aiPreferences.voiceSpeechRate, appForeground],
  );

  const onSpeakMessage = useCallback(
    (msg: AiChatMessage) => {
      if (speakingMessageId === msg.id && isVoiceOutputSpeaking()) {
        void stopVoiceOutput();
        setSpeakingMessageId(null);
        return;
      }
      void maybeSpeakAssistant(msg.id, msg.text);
    },
    [maybeSpeakAssistant, speakingMessageId],
  );

  const cancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleMessageSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllMessages = useCallback(() => {
    setSelectedIds(new Set(messages.map((m) => m.id)));
  }, [messages]);

  const applyDeletedMessages = useCallback(
    (remaining: AiChatMessage[]) => {
      const next = normalizeChatHistory(
        remaining.length === 0 ? getInitialAiChatMessages() : remaining,
      );
      setMessages(next);
      sessionMemoryRef.current = buildSessionMemoryFromMessages(
        next,
        aiPreferences.aiExplanationLevel,
      );
      void saveAiChatHistory(next);
      cancelSelection();
    },
    [aiPreferences.aiExplanationLevel, cancelSelection],
  );

  const confirmDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert(AI_CONCIERGE_UI.chatDelete, AI_CONCIERGE_UI.chatDeleteConfirm, [
      { text: AI_CONCIERGE_UI.chatCancelSelection, style: 'cancel' },
      {
        text: AI_CONCIERGE_UI.chatDelete,
        style: 'destructive',
        onPress: () => {
          const remaining = messages.filter((m) => !selectedIds.has(m.id));
          applyDeletedMessages(remaining);
        },
      },
    ]);
  }, [applyDeletedMessages, messages, selectedIds]);

  const onVoicePress = useCallback(() => {
    if (voiceStatus === 'listening') {
      stopVoiceCapture();
      setVoiceStatus('idle');
      return;
    }
    setVoiceNoticeJa(null);
    startVoiceCapture(
      (transcript) => {
        voiceInputPendingRef.current = true;
        setInput((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      },
      (status, messageJa) => {
        setVoiceStatus(status);
        if (messageJa) setVoiceNoticeJa(messageJa);
      },
    );
  }, [voiceStatus]);

  const scrollToEnd = useCallback(() => {
    const target = isConcierge ? conciergeScrollRef : scrollRef;
    setTimeout(() => target?.current?.scrollToEnd({ animated: true }), 80);
  }, [isConcierge, conciergeScrollRef]);

  useEffect(() => {
    registerChatAuditListener((notice) => {
      if (!mountedRef.current) return;
      setMessages((prev) => appendChatMessages(prev, notice));
      scrollToEnd();
    });
    return () => registerChatAuditListener(null);
  }, [scrollToEnd]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!shouldAcceptChatSend(trimmed, isSending)) return;

      if (detectAnalysisRequestJa(trimmed)) {
        activateAnalysisMode();
        void proactive?.refreshProactive();
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: AiChatMessage = {
        ...createUserChatMessage(trimmed, {
          messageSource: voiceInputPendingRef.current ? 'voice' : 'chat',
        }),
        deliveryStatus: 'pending_response',
        pendingUserText: trimmed,
      };
      voiceInputPendingRef.current = false;
      setRetryPrompt(null);
      setSlowResponse(false);
      setMessages((prev) => appendChatMessages(prev, userMsg));
      setInput('');
      scrollToEnd();

      setIsSending(true);
      setErrorJa(null);

      sessionMemoryRef.current = updateConciergeSessionMemory(
        sessionMemoryRef.current,
        trimmed,
        aiPreferences.aiExplanationLevel,
      );

      const conciergeOps = {
        degradedMode: worldModel?.operations.degradedMode ?? false,
        staleHoldingsCount: worldModel?.portfolioRisk.staleHoldingsCount ?? 0,
        apiHealthDegraded: worldModel?.operations.degradedMode ?? false,
      };

      let assistantAdded = false;
      const appendAssistant = async (msg: AiChatMessage, stream = true) => {
        assistantAdded = true;
        await stopVoiceOutput();
        setSpeakingMessageId(null);
        const enriched = enrichConciergeChatMessage(msg, trimmed, conciergeOps);
        sessionMemoryRef.current = recordConciergeAssistantTurn(
          sessionMemoryRef.current,
          enriched.text,
        );
        if (!stream || enriched.text.length < 48) {
          setMessages((prev) => appendChatMessages(prev, enriched));
          scrollToEnd();
          if (aiPreferences.voiceEnabled && aiPreferences.voiceAutoRead) {
            void maybeSpeakAssistant(enriched.id, enriched.text);
          }
          return;
        }
        const placeholderId = enriched.id;
        setRequestStatus('streaming');
        setStatusJa(statusJaForRequestStatus('streaming'));
        setMessages((prev) => appendChatMessages(prev, { ...enriched, text: '' }));
        scrollToEnd();
        try {
          await streamRevealText(
            enriched.text,
            (partial) => {
              if (!mountedRef.current || controller.signal.aborted) return;
              setMessages((prev) =>
                prev.map((m) => (m.id === placeholderId ? { ...m, text: partial } : m)),
              );
              scrollToEnd();
            },
            { signal: controller.signal },
          );
          if (mountedRef.current) {
            setMessages((prev) =>
              prev.map((m) => (m.id === placeholderId ? enriched : m)),
            );
            if (aiPreferences.voiceEnabled && aiPreferences.voiceAutoRead) {
              void maybeSpeakAssistant(enriched.id, enriched.text);
            }
          }
        } catch {
          if (!mountedRef.current || controller.signal.aborted) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === placeholderId ? enriched : m)),
          );
        }
        scrollToEnd();
      };

      try {
        const instant = getConciergeInstantAnswer(trimmed, aiPreferences.aiExplanationLevel);
        if (instant) {
          await appendAssistant(instant, true);
          setUsedMockFallback(false);
          setApiConnected(false);
          setRequestStatus('idle');
          setStatusJa(AI_CONCIERGE_UI.statusInstant);
          return;
        }

        setRequestStatus('checking_api_key');
        setStatusJa(statusJaForRequestStatus('checking_api_key'));
        setUsedMockFallback(false);

        const result = await sendAiStrategyMessage(trimmed, {
          signal: controller.signal,
          sessionMemory: sessionMemoryRef.current,
          onRequestStatus: (status) => {
            if (!mountedRef.current || controller.signal.aborted) return;
            setRequestStatus(status);
            setStatusJa(statusJaForRequestStatus(status));
          },
        });

        if (!mountedRef.current || controller.signal.aborted) return;

        applyResult(result);
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 && m.role === 'user'
              ? { ...m, deliveryStatus: 'ok' as const, failureKindJa: undefined }
              : m,
          ),
        );
        await appendAssistant(resultToMessage(result, trimmed, conciergeOps), result.source === 'api');
      } catch (e) {
        if (!mountedRef.current) return;
        if (isAbortError(e) && controller.signal.aborted) return;

        setRequestStatus('error');
        const failureKindJa =
          e instanceof Error && e.message.includes('429')
            ? 'レート制限'
            : e instanceof Error && e.name === 'AbortError'
              ? 'タイムアウト'
              : 'ネットワーク/API';
        setErrorJa(PROACTIVE_UI.retryPrompt);
        setRetryPrompt(trimmed);
        setStatusJa(statusJaForRequestStatus('error'));
        setApiConnected(false);
        setUsedMockFallback(true);
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 && m.role === 'user'
              ? { ...m, deliveryStatus: 'failed' as const, failureKindJa }
              : m,
          ),
        );
        if (!assistantAdded) {
          await appendAssistant(createAssistantChatMessage(trimmed), false);
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        if (mountedRef.current) {
          setIsSending(false);
          if (!assistantAdded && !controller.signal.aborted) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role !== 'user') return prev;
              return appendChatMessages(prev, createAssistantChatMessage(last.text));
            });
            setUsedMockFallback(true);
            const idle = resolveIdleConnectionStatus({
              aiEnabled: aiPreferences.aiEnabled,
              mockOnly: aiPreferences.mockOnly,
              hasApiKey: Boolean(aiApiKey.trim()),
            });
            setRequestStatus(idle.requestStatus);
            setStatusJa(idle.statusJa);
            setErrorJa(idle.errorJa);
          }
        }
        scrollToEnd();
      }
    },
    [
      aiApiKey,
      aiPreferences.aiEnabled,
      aiPreferences.mockOnly,
      aiPreferences.voiceAutoRead,
      aiPreferences.voiceEnabled,
      applyResult,
      maybeSpeakAssistant,
      isSending,
      scrollToEnd,
      sendAiStrategyMessage,
      worldModel,
      proactive?.refreshProactive,
    ],
  );

  useEffect(() => {
    if (!seedMessage?.trim() || seedSentRef.current) return;
    seedSentRef.current = true;
    void handleSendMessage(seedMessage);
  }, [seedMessage, handleSendMessage]);

  useEffect(() => {
    if (!focusSuggestionId || !proactive) return;
    const match = proactive.suggestions.find((s) => s.id === focusSuggestionId);
    if (match) void proactive.openDetail(match.id);
  }, [focusSuggestionId, proactive]);

  const onPressSend = () => {
    void handleSendMessage(input);
  };

  const onSample = (question: string) => {
    void handleSendMessage(question);
  };

  const isLoading = isSending;

  const statusColor = apiConnected
    ? theme.colors.success
    : usedMockFallback || requestStatus === 'timeout' || requestStatus === 'api_key_missing'
      ? theme.colors.warning
      : theme.colors.textMuted;

  const quickQuestions = [...AI_SAMPLE_QUESTIONS];

  const latestAssistantPanels = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== 'assistant') continue;
      if (m.evidenceData || m.globalMarketAnalysis || m.portfolioIntelligence) {
        return m;
      }
    }
    return null;
  }, [messages]);

  const proactiveForUx = useMemo(() => {
    if (!proactive) return [];
    return (proactive.suggestions ?? [])
      .filter((s) => isUnhandledProactiveStatus(s.status))
      .map((s) => ({
        titleJa: s.titleJa,
        whyJa: s.notificationWhyJa ?? s.actionHintJa,
        symbol: s.symbol,
        priority: s.priority,
      }));
  }, [proactive]);

  const uxBundle = useMemo(
    () =>
      buildConciergeUxBundle({
        displayMode: uxMode,
        marketRegimeLabel: worldModel?.marketRegimeLabel ?? null,
        riskModeLabel: worldModel?.riskMode ?? null,
        evidence: latestAssistantPanels?.evidenceData ?? null,
        globalMarket: latestAssistantPanels?.globalMarketAnalysis ?? null,
        portfolioIntel: latestAssistantPanels?.portfolioIntelligence ?? null,
        proactiveTitles: proactiveForUx,
        degradedMode: worldModel?.operations.degradedMode ?? false,
      }),
    [
      uxMode,
      worldModel,
      latestAssistantPanels,
      proactiveForUx,
    ],
  );

  const scrollComposerIntoView = useCallback(() => {
    conciergeScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const statusMetaBlock = (
    <>
      <View style={styles.statusRow}>
        <SelectableText style={styles.statusLabel}>
          {AI_UI.apiStatus}: <SelectableText style={{ color: statusColor }}>{statusJa}</SelectableText>
        </SelectableText>
        {shouldShowApiSpinner(requestStatus, isCheckingConnection || isSending) ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : null}
      </View>
      {usedMockFallback ? (
        <SelectableText style={styles.mockBanner}>{errorJa ?? AI_UI.mockFallback}</SelectableText>
      ) : null}
      {errorJa && !usedMockFallback ? (
        <SelectableText style={styles.errorText}>{errorJa}</SelectableText>
      ) : null}
      {slowResponse && isSending ? (
        <SelectableText style={styles.errorText}>{PROACTIVE_UI.timeout}</SelectableText>
      ) : null}
      {retryPrompt ? (
        <View style={styles.retryRow}>
          <SelectableText style={styles.errorText}>{PROACTIVE_UI.retryPrompt}</SelectableText>
          <Button
            label={PROACTIVE_UI.retry}
            onPress={() => {
              const text = retryPrompt;
              setRetryPrompt(null);
              void handleSendMessage(text);
            }}
            variant="ghost"
          />
        </View>
      ) : null}
      {staleWarning ? (
        <SelectableText style={styles.staleWarning}>{AI_UI.staleDataWarning}</SelectableText>
      ) : null}
      {!aiPreferences.aiEnabled ? (
        <SelectableText style={styles.mockBanner}>AI機能オフ — モック応答のみ</SelectableText>
      ) : null}
      {aiPreferences.mockOnly ? (
        <SelectableText style={styles.mockBanner}>モックのみモード — 外部API未使用</SelectableText>
      ) : null}
    </>
  );

  const analysisModeBlock = isConcierge ? (
    <View style={styles.analysisModeRow}>
      <SelectableText style={styles.analysisModeLabel}>分析モード</SelectableText>
      {AI_ANALYSIS_MODE_ORDER.map((mode) => {
        const active = aiPreferences.aiAnalysisMode === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => void saveAiPreferences({ aiAnalysisMode: mode })}
            style={[styles.analysisChip, active && styles.analysisChipActive]}
          >
            <Text style={[styles.analysisChipText, active && styles.analysisChipTextActive]}>
              {AI_ANALYSIS_MODE_LABELS_JA[mode]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  ) : null;

  const conciergeUxDashboardBlock = (
    <View testID={CONCIERGE_SECTION_TEST_ID.status_card}>
      <Suspense fallback={<ActivityIndicator color={theme.colors.primary} />}>
        {proactive?.metaBundle && aiPreferences.metaDecisionEnabled ? (
          <LazyMetaTopPrioritiesPanel bundle={proactive.metaBundle} />
        ) : null}
        {proactive?.strategyBundle && aiPreferences.strategyExecutionEnabled ? (
          <LazyAiActionCenterPanel bundle={proactive.strategyBundle} />
        ) : null}
        {proactive?.realityBundle && aiPreferences.realityValidationEnabled ? (
          <LazyAiPerformanceCenterPanel bundle={proactive.realityBundle} />
        ) : null}
        {proactive?.executionBundle && aiPreferences.paperBrokerEnabled ? (
          <LazyExecutionDashboardPanel bundle={proactive.executionBundle} />
        ) : null}
        {proactive?.capitalAllocationBundle && aiPreferences.capitalAllocationEnabled ? (
          <LazyCapitalAllocationPanel
            bundle={proactive.capitalAllocationBundle}
            onPrefsSaved={() => void proactive.refreshProactive()}
          />
        ) : null}
        {proactive?.selfEvaluationBundle && aiPreferences.selfEvaluationEnabled ? (
          <LazySelfEvaluationPanel bundle={proactive.selfEvaluationBundle} />
        ) : null}
        {proactive?.macroIntelligenceBundle && aiPreferences.macroIntelligenceEnabled ? (
          <LazyWorldStatePanel bundle={proactive.macroIntelligenceBundle} />
        ) : null}
        {proactive?.dataReliabilityBundle && aiPreferences.dataReliabilityEnabled ? (
          <LazyDataReliabilityPanel bundle={proactive.dataReliabilityBundle} />
        ) : null}
        {proactive?.portfolioRiskExposureBundle &&
        aiPreferences.portfolioRiskExposureEnabled ? (
          <LazyPortfolioRiskExposurePanel
            bundle={proactive.portfolioRiskExposureBundle}
            onOverrideSaved={() => void proactive.refreshProactive()}
          />
        ) : null}
        {proactive?.systemStabilityIntegrityBundle &&
        aiPreferences.systemStabilityIntegrityEnabled !== false ? (
          <LazySystemStabilityIntegrityPanel bundle={proactive.systemStabilityIntegrityBundle} />
        ) : null}
        {proactive?.aiGovernanceDecisionBundle &&
        aiPreferences.aiGovernanceDecisionEnabled !== false ? (
          <LazyAiGovernancePanel
            bundle={proactive.aiGovernanceDecisionBundle}
            onOverrideSaved={() => void proactive.refreshProactive()}
          />
        ) : null}
        {proactive?.reactiveEventOrchestrationBundle &&
        aiPreferences.reactiveEventOrchestrationEnabled !== false ? (
          <LazyReactiveEventDashboardPanel bundle={proactive.reactiveEventOrchestrationBundle} />
        ) : null}
        {proactive?.explainableCognitiveTraceBundle &&
        aiPreferences.explainableCognitiveTraceEnabled !== false ? (
          <LazyExplainabilityDashboardPanel bundle={proactive.explainableCognitiveTraceBundle} />
        ) : null}
        {proactive?.adaptiveResourceComputeBudgetBundle &&
        aiPreferences.adaptiveResourceComputeBudgetEnabled !== false ? (
          <LazyResourceDashboardPanel bundle={proactive.adaptiveResourceComputeBudgetBundle} />
        ) : null}
        {proactive?.stateIntegrityTemporalConsistencyBundle &&
        aiPreferences.stateIntegrityTemporalConsistencyEnabled !== false ? (
          <LazyIntegrityDashboardPanel
            bundle={proactive.stateIntegrityTemporalConsistencyBundle}
          />
        ) : null}
        {proactive?.semanticConsistencyDecisionCoherenceBundle &&
        aiPreferences.semanticConsistencyDecisionCoherenceEnabled !== false ? (
          <LazySemanticDashboardPanel
            bundle={proactive.semanticConsistencyDecisionCoherenceBundle}
          />
        ) : null}
        {proactive?.epistemicReliabilityEvidenceWeightBundle &&
        aiPreferences.epistemicReliabilityEvidenceWeightEnabled !== false ? (
          <LazyReliabilityDashboardPanel
            bundle={proactive.epistemicReliabilityEvidenceWeightBundle}
          />
        ) : null}
        {proactive?.cognitiveGoalArbitrationIntentPriorityBundle &&
        aiPreferences.cognitiveGoalArbitrationIntentPriorityEnabled !== false ? (
          <LazyArbitrationDashboardPanel
            bundle={proactive.cognitiveGoalArbitrationIntentPriorityBundle}
          />
        ) : null}
        {proactive?.metaCognitiveRiskReflectionSelfCritiqueBundle &&
        aiPreferences.metaCognitiveRiskReflectionSelfCritiqueEnabled !== false ? (
          <LazyMetaAuditDashboardPanel
            bundle={proactive.metaCognitiveRiskReflectionSelfCritiqueBundle}
          />
        ) : null}
        {proactive?.recursiveMemoryCompressionStrategicAbstractionBundle &&
        aiPreferences.recursiveMemoryCompressionStrategicAbstractionEnabled !== false ? (
          <LazyMemoryCompressionDashboardPanel
            bundle={proactive.recursiveMemoryCompressionStrategicAbstractionBundle}
          />
        ) : null}
        {proactive?.systemicStabilityRecursiveGovernanceBundle &&
        aiPreferences.systemicStabilityRecursiveGovernanceEnabled !== false ? (
          <LazySystemicStabilityDashboardPanel
            bundle={proactive.systemicStabilityRecursiveGovernanceBundle}
          />
        ) : null}
        {proactive?.executionRecoveryAdaptiveConfidenceBundle &&
        aiPreferences.executionRecoveryAdaptiveConfidenceEnabled !== false ? (
          <LazyExecutionRecoveryDashboardPanel
            bundle={proactive.executionRecoveryAdaptiveConfidenceBundle}
          />
        ) : null}
        {proactive?.dynamicLayerOrchestrationMobileRuntimeOptimizationBundle &&
        aiPreferences.dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled !== false ? (
          <LazyDynamicOrchestrationDashboardPanel
            bundle={proactive.dynamicLayerOrchestrationMobileRuntimeOptimizationBundle}
          />
        ) : null}
        {proactive?.autonomousMarketRegimeDetectionBundle &&
        aiPreferences.autonomousMarketRegimeDetectionEnabled !== false ? (
          <LazyMarketRegimeDashboardPanel bundle={proactive.autonomousMarketRegimeDetectionBundle} />
        ) : null}
        {proactive?.cognitiveArbitrationConsensusBundle &&
        aiPreferences.cognitiveArbitrationConsensusEnabled !== false ? (
          <LazyCognitiveConsensusDashboardPanel
            bundle={proactive.cognitiveArbitrationConsensusBundle}
          />
        ) : null}
        {proactive?.metaReliabilityLongitudinalTrustBundle &&
        aiPreferences.metaReliabilityLongitudinalTrustEnabled !== false ? (
          <LazyMetaReliabilityDashboardPanel
            bundle={proactive.metaReliabilityLongitudinalTrustBundle}
          />
        ) : null}
        {proactive?.selfEvolvingArchitectureReflectiveRefactorBundle &&
        aiPreferences.selfEvolvingArchitectureReflectiveRefactorEnabled !== false ? (
          <LazySelfArchitectureDashboardPanel
            bundle={proactive.selfEvolvingArchitectureReflectiveRefactorBundle}
          />
        ) : null}
        {proactive?.epistemicIntegrityTruthCalibrationBundle &&
        aiPreferences.epistemicIntegrityTruthCalibrationEnabled !== false ? (
          <LazyEpistemicIntegrityDashboardPanel
            bundle={proactive.epistemicIntegrityTruthCalibrationBundle}
          />
        ) : null}
        {strategicMemoryBundle &&
        aiPreferences.strategicMemoryGraphTemporalCausalityEnabled !== false ? (
          <StaleSafeDashboardShell bundle={strategicMemoryBundle}>
            {(b) => <LazyStrategicMemoryGraphDashboardPanel bundle={b} />}
          </StaleSafeDashboardShell>
        ) : null}
        {proactive?.cognitiveResourceEconomyAttentionAllocationBundle &&
        aiPreferences.cognitiveResourceEconomyAttentionAllocationEnabled !== false ? (
          <LazyCognitiveResourceEconomyDashboardPanel
            bundle={proactive.cognitiveResourceEconomyAttentionAllocationBundle}
          />
        ) : null}
        {unifiedCognitiveBundle &&
        aiPreferences.unifiedCognitiveStateExecutiveAwarenessEnabled !== false ? (
          <StaleSafeDashboardShell bundle={unifiedCognitiveBundle}>
            {(b) => <LazyUnifiedCognitiveStateDashboardPanel bundle={b} />}
          </StaleSafeDashboardShell>
        ) : null}
        {proactive?.humanIntentContinuityAlignmentPreservationBundle &&
        aiPreferences.humanIntentContinuityAlignmentPreservationEnabled !== false ? (
          <LazyHumanIntentContinuityDashboardPanel
            bundle={proactive.humanIntentContinuityAlignmentPreservationBundle}
          />
        ) : null}
        {proactive?.adaptiveExplorationAntiDogmaBundle &&
        aiPreferences.adaptiveExplorationAntiDogmaEnabled !== false ? (
          <LazyAdaptiveExplorationDashboardPanel
            bundle={proactive.adaptiveExplorationAntiDogmaBundle}
          />
        ) : null}
        {proactive?.constitutionalGovernanceSystemCoherenceBundle &&
        aiPreferences.constitutionalGovernanceSystemCoherenceEnabled !== false ? (
          <LazyConstitutionalGovernanceDashboardPanel
            bundle={proactive.constitutionalGovernanceSystemCoherenceBundle}
          />
        ) : null}
        {explainableGovernanceBundle &&
        aiPreferences.explainableGovernanceTransparentReasoningEnabled !== false ? (
          <StaleSafeDashboardShell bundle={explainableGovernanceBundle}>
            {(b) => <LazyExplainableGovernanceDashboardPanel bundle={b} />}
          </StaleSafeDashboardShell>
        ) : null}
        {runtimeSurvivalBundle &&
        aiPreferences.runtimeSurvivalMobileResilienceEnabled !== false ? (
          <StaleSafeDashboardShell bundle={runtimeSurvivalBundle}>
            {(b) => <LazyRuntimeSurvivalDashboardPanel bundle={b} />}
          </StaleSafeDashboardShell>
        ) : null}
        {runtimeTelemetryBundle &&
        aiPreferences.runtimeSurvivalMobileResilienceEnabled !== false ? (
          <LazyRuntimeTelemetryDashboardPanel bundle={runtimeTelemetryBundle} />
        ) : null}
      </Suspense>
      <ConciergeUxModeToggle
        mode={uxMode}
        onChange={(m) => void saveAiPreferences({ conciergeUxMode: m })}
      />
      <ConciergeOneScreenDashboard bundle={uxBundle} />
      {uxBundle.digest ? <ConciergeNotificationDigest digest={uxBundle.digest} /> : null}
      <ConciergeMarketRadar items={uxBundle.radar} />
      <ConciergeContextMemoryPanel
        items={uxBundle.contextMemory}
        defaultCollapsed={uxBundle.defaultCollapse.medium}
      />
      {uxMode === 'advanced' && performanceCost ? (
        <ConciergeUxAdvancedStrip
          evidence={latestAssistantPanels?.evidenceData ?? null}
          costDashboard={performanceCost.costDashboard}
        />
      ) : null}
      <Suspense fallback={null}>
        {proactive?.autonomousBundle && aiPreferences.autonomousMonitoringEnabled ? (
          <LazyAutonomousMonitoringPanel bundle={proactive.autonomousBundle} />
        ) : null}
      </Suspense>
    </View>
  );

  const quickActionsBlock =
    !isConcierge ? (
      <View>
        <SelectableText style={styles.sampleTitle}>{AI_UI.sampleQuestions}</SelectableText>
        <View style={styles.sampleRow}>
          {quickQuestions.map((q) => (
            <Pressable
              key={q}
              onPress={() => onSample(q)}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.sampleChip,
                pressed && styles.sampleChipPressed,
                isLoading && styles.sampleChipDisabled,
              ]}
            >
              <Text style={styles.sampleChipText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    ) : null;

  const composerBlock = (
    <View
      testID={CONCIERGE_SECTION_TEST_ID.composer}
      style={styles.conciergeComposer}
    >
      {voiceNoticeJa ? (
        <SelectableText style={styles.voiceNotice}>{voiceNoticeJa}</SelectableText>
      ) : null}
      <View style={styles.inputRow}>
        {isConcierge ? (
          <Pressable
            onPress={onVoicePress}
            disabled={isSending}
            style={({ pressed }) => [
              styles.voiceBtn,
              voiceStatus === 'listening' && styles.voiceBtnActive,
              pressed && styles.voiceBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={AI_CONCIERGE_UI.voiceInput}
          >
            <Ionicons
              name={voiceStatus === 'listening' ? 'mic' : 'mic-outline'}
              size={22}
              color={voiceStatus === 'listening' ? theme.colors.danger : theme.colors.primary}
            />
          </Pressable>
        ) : null}
        <TextInput
          style={[styles.input, isConcierge && styles.inputConcierge]}
          value={input}
          onChangeText={setInput}
          placeholder={AI_UI.chatInputPlaceholder}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          editable={!isSending}
          onSubmitEditing={onPressSend}
          blurOnSubmit={false}
          onFocus={isConcierge ? scrollComposerIntoView : undefined}
        />
        <Button
          label={isSending ? composingLabelJa(requestStatus, isConcierge) : AI_UI.send}
          onPress={onPressSend}
          disabled={!shouldAcceptChatSend(input, isSending)}
        />
      </View>
      {isConcierge && voiceStatus === 'listening' ? (
        <SelectableText style={styles.voiceListening}>{AI_CONCIERGE_UI.voiceListening}</SelectableText>
      ) : null}
    </View>
  );

  const selectionToolbar = selectionMode ? (
    <View style={styles.selectionBar}>
      <Pressable onPress={selectAllMessages} style={styles.selectionAction}>
        <Text style={styles.selectionActionText}>{AI_CONCIERGE_UI.chatSelectAll}</Text>
      </Pressable>
      <Pressable
        onPress={confirmDeleteSelected}
        disabled={selectedIds.size === 0}
        style={[styles.selectionAction, selectedIds.size === 0 && styles.selectionActionDisabled]}
      >
        <Text style={[styles.selectionActionText, styles.selectionDeleteText]}>
          {AI_CONCIERGE_UI.chatDelete}
        </Text>
      </Pressable>
      <Pressable onPress={cancelSelection} style={styles.selectionAction}>
        <Text style={styles.selectionActionText}>{AI_CONCIERGE_UI.chatCancelSelection}</Text>
      </Pressable>
    </View>
  ) : null;

  const threadMessages = (
    <>
      {messages.map((msg) => {
        const selected = selectedIds.has(msg.id);
        return (
          <Pressable
            key={msg.id}
            onLongPress={() => {
              setSelectionMode(true);
              setSelectedIds(new Set([msg.id]));
            }}
            onPress={() => {
              if (selectionMode) toggleMessageSelection(msg.id);
            }}
            style={[
              styles.bubble,
              msg.role === 'user'
                ? styles.bubbleUser
                : msg.role === 'system'
                  ? styles.bubbleSystem
                  : styles.bubbleAssistant,
              selectionMode && selected && styles.bubbleSelected,
            ]}
          >
            {selectionMode ? (
              <Ionicons
                name={selected ? 'checkbox' : 'square-outline'}
                size={20}
                color={selected ? theme.colors.primary : theme.colors.textMuted}
                style={styles.selectIcon}
              />
            ) : null}
            <ChatMessageTimestamp message={msg} compact={isConcierge} />
            <SelectableText style={styles.bubbleRole}>{roleLabelJa(msg)}</SelectableText>
            {msg.role === 'assistant' ? <ConciergeWarningBadge message={msg} /> : null}
            {msg.role === 'assistant' && isConcierge ? (
              <ConciergeShortAnswerBlock
                answer={buildShortAnswerFromStructured(msg.structured, msg.text)}
              />
            ) : null}
            {uxMode === 'advanced' || msg.role !== 'assistant' ? (
              <SelectableText
                style={[
                  styles.bubbleText,
                  isConcierge && msg.role === 'assistant' && styles.bubbleTextConcierge,
                ]}
              >
                {msg.text}
              </SelectableText>
            ) : null}
            {msg.deliveryStatus && msg.deliveryStatus !== 'ok' ? (
              <SelectableText style={styles.deliveryMeta}>
                {msg.deliveryStatus === 'pending_response'
                  ? '未応答'
                  : msg.deliveryStatus === 'timeout'
                    ? `タイムアウト${msg.failureKindJa ? ` (${msg.failureKindJa})` : ''}`
                    : `失敗${msg.failureKindJa ? ` (${msg.failureKindJa})` : ''}`}
              </SelectableText>
            ) : null}
            {msg.role === 'assistant' ? <StructuredBlock message={msg} uxMode={uxMode} /> : null}
            {msg.role === 'assistant' && msg.globalMarketAnalysis ? (
              <ConciergePrioritySection
                title="市場状況"
                priority="medium"
                defaultCollapsed={uxBundle.defaultCollapse.medium}
              >
                <MarketSituationCard analysis={msg.globalMarketAnalysis} />
              </ConciergePrioritySection>
            ) : null}
            {msg.role === 'assistant' && msg.evidenceData?.riskControl ? (
              <ConciergePrioritySection
                title="リスク統制"
                priority="critical"
                defaultCollapsed={uxBundle.defaultCollapse.critical}
              >
                <ConciergeRiskControlPanel risk={msg.evidenceData.riskControl} />
              </ConciergePrioritySection>
            ) : null}
            {msg.role === 'assistant' && msg.evidenceData?.actionGuide ? (
              <ConciergePrioritySection
                title="行動ガイド"
                priority="high"
                defaultCollapsed={uxBundle.defaultCollapse.high}
              >
                <ConciergeActionPanel
                  guide={msg.evidenceData.actionGuide}
                  riskControl={msg.evidenceData.riskControl}
                />
              </ConciergePrioritySection>
            ) : null}
            {msg.role === 'assistant' && msg.evidenceData && uxMode === 'advanced' ? (
              <ConciergePrioritySection
                title="根拠・evidence"
                priority="low"
                defaultCollapsed
              >
                <ConciergeEvidencePanel evidence={msg.evidenceData} />
              </ConciergePrioritySection>
            ) : null}
            {msg.role === 'assistant' && msg.portfolioIntelligence ? (
              <ConciergePrioritySection
                title="ポートフォリオ学習"
                priority="low"
                defaultCollapsed={uxBundle.defaultCollapse.low}
              >
                <PortfolioIntelligencePanel intel={msg.portfolioIntelligence} />
              </ConciergePrioritySection>
            ) : null}
            {msg.role === 'assistant' && aiPreferences.voiceEnabled && !selectionMode ? (
              <Pressable
                onPress={() => onSpeakMessage(msg)}
                style={({ pressed }) => [styles.speakBtn, pressed && styles.voiceBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel={
                  speakingMessageId === msg.id
                    ? AI_CONCIERGE_UI.chatStopSpeak
                    : AI_CONCIERGE_UI.chatSpeak
                }
              >
                <Ionicons
                  name={speakingMessageId === msg.id ? 'stop-circle-outline' : 'volume-high-outline'}
                  size={20}
                  color={theme.colors.primary}
                />
              </Pressable>
            ) : null}
          </Pressable>
        );
      })}
      {isSending && requestStatus !== 'streaming' ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <SelectableText style={styles.loadingText}>
            {composingLabelJa(requestStatus, isConcierge)}
          </SelectableText>
        </View>
      ) : null}
    </>
  );

  const proactiveConciergeBlock =
    isConcierge && proactive && !uxBundle.digest ? (
      <>
        {(proactive.suggestions ?? [])
          .filter((s) => isUnhandledProactiveStatus(s.status))
          .slice(0, 3)
          .map((s) => (
            <ProactiveSuggestionCard
              key={s.id}
              suggestion={s}
              compact
              onAcknowledge={() => void proactive.acknowledge(s.id)}
              onSeeLater={() => void proactive.seeLater(s.id)}
              onDetail={() => {
                void proactive.openDetail(s.id);
                void handleSendMessage(`${s.titleJa} — 詳しく教えてください（参考情報として）`);
              }}
            />
          ))}
      </>
    ) : null;

  const threadBlock = isConcierge ? (
    <View testID={CONCIERGE_SECTION_TEST_ID.chat_history} style={styles.threadConciergeFlat}>
      {threadMessages}
    </View>
  ) : (
    <ScrollView
      ref={scrollRef}
      style={styles.thread}
      contentContainerStyle={styles.threadContent}
      showsVerticalScrollIndicator
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {threadMessages}
    </ScrollView>
  );

  const chatBody = isConcierge ? (
    <View style={styles.conciergeColumn}>
      {selectionToolbar}
      {composerBlock}
      <ScrollView
        ref={conciergeScrollRef}
        style={styles.conciergeScroll}
        contentContainerStyle={styles.conciergeScrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        {conciergeUxDashboardBlock}
        {analysisModeBlock}
        {proactiveConciergeBlock}
        {threadBlock}
        {aiPreferences.aiConciergeDebugMode ? <ConciergePromptDebugPanel /> : null}
        <View testID={CONCIERGE_SECTION_TEST_ID.footer_meta} style={styles.footerMeta}>
          {statusMetaBlock}
        </View>
      </ScrollView>
    </View>
  ) : (
    <>
      {selectionToolbar}
      <View style={styles.header}>
        <Ionicons name="chatbubbles-outline" size={22} color={theme.colors.primary} />
        <Text style={styles.title}>{AI_CHAT_TITLE}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{AI_UI.personalAssistBadge}</Text>
        </View>
      </View>
      <SelectableText style={styles.hint}>{AI_UI.chatHint}</SelectableText>
      {statusMetaBlock}
      {quickActionsBlock}
      {threadBlock}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {composerBlock}
      </KeyboardAvoidingView>
      <SelectableText style={styles.disclaimer}>{AI_PERSONAL_SAFETY_FOOTER}</SelectableText>
    </>
  );

  if (isEmbedded) {
    return <View style={[styles.embeddedWrap, isConcierge && styles.embeddedConcierge]}>{chatBody}</View>;
  }
  return <Card style={styles.card}>{chatBody}</Card>;
}

const styles = StyleSheet.create({
  embeddedWrap: {
    width: '100%',
    flex: 1,
    minHeight: 0,
  },
  embeddedConcierge: {
    flex: 1,
    minHeight: 0,
  },
  conciergeColumn: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  conciergeScroll: {
    flex: 1,
    minHeight: 0,
  },
  conciergeScrollContent: {
    paddingBottom: theme.spacing.lg,
  },
  conciergeComposer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    zIndex: 2,
  },
  conciergeStatus: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  conciergeStatusLabel: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginBottom: 4,
  },
  conciergeStatusLine: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  conciergeStatusWarn: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
    lineHeight: 20,
  },
  threadConciergeFlat: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  footerMeta: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  card: {
    marginBottom: theme.spacing.sm,
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  title: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '700' },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: theme.colors.primary, fontSize: theme.fontSize.sm, fontWeight: '600' },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  statusLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, flex: 1 },
  mockBanner: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  retryRow: { marginBottom: theme.spacing.sm, gap: theme.spacing.xs },
  deliveryMeta: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
  },
  staleWarning: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  sampleTitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  sampleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  sampleChip: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  sampleChipPressed: { opacity: 0.75 },
  sampleChipDisabled: { opacity: 0.5 },
  sampleChipText: { color: theme.colors.primary, fontSize: theme.fontSize.sm },
  modeHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  thread: { maxHeight: 300 },
  threadContent: { gap: theme.spacing.sm, paddingBottom: theme.spacing.sm },
  voiceBtn: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  voiceBtnActive: {
    borderColor: theme.colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  voiceBtnPressed: { opacity: 0.8 },
  inputConcierge: { minHeight: 48, maxHeight: 120, fontSize: theme.fontSize.md },
  voiceNotice: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  voiceListening: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  loadingText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  bubble: {
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.surfaceElevated,
    maxWidth: '92%',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: '100%',
  },
  bubbleSystem: {
    alignSelf: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: '96%',
  },
  bubbleRole: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: 4,
    fontWeight: '600',
  },
  bubbleText: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 22 },
  bubbleTextConcierge: {
    fontSize: theme.fontSize.md,
    lineHeight: 24,
  },
  warningBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  warningBadgeText: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  structured: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 4,
  },
  structLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  structKey: { color: theme.colors.text, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  disclaimer: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  analysisModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  analysisModeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginRight: 4,
  },
  analysisChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  analysisChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  analysisChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  analysisChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectionAction: { paddingVertical: 4, paddingHorizontal: 6 },
  selectionActionDisabled: { opacity: 0.4 },
  selectionActionText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  selectionDeleteText: { color: theme.colors.danger },
  bubbleSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  selectIcon: { position: 'absolute', top: 8, right: 8 },
  speakBtn: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
    padding: 4,
  },
});
