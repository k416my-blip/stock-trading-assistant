import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AiChatMessage } from '../types/aiChat';
import type { ConciergeEvidenceBundle } from '../types/conciergeEvidence';
import type { AiRequestStatus, AiStrategyChatResult } from '../types/aiStrategy';
import { AI_ERROR_TIMEOUT, AI_MAX_IN_FLIGHT_MS, AI_CONCIERGE_SLOW_UI_MS } from '../constants/aiStrategy';
import {
  createAssistantChatMessage,
  createUserChatMessage,
  getInitialAiChatMessages,
} from '../data/mockAiChat';
import { i18n } from '../i18n';
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
import { PROACTIVE_UI } from '../constants/proactiveConcierge';
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
import { BeginnerConciergeQuickActions } from './beginner/BeginnerConciergeQuickActions';
import { useAppUxMode } from '../context/AppUxModeContext';
import { useAppLanguage } from '../context/AppLanguageContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { SelectableText } from './ui/SelectableText';
import { theme } from '../theme';
import { ConciergeImportActionCard } from './concierge/ConciergeImportActionCard';
import { detectRakutenImportIntent } from '../services/rakutenImport/detectRakutenImportIntent';
import { pickTransactionHistoryImageWithAlert } from '../services/rakutenImport/pickTransactionHistoryImage';
import type { RootStackParamList } from '../navigation/types';
import { buildConfirmPromptJa } from '../services/rakutenImport/naturalLanguageTransactionParser';
import { canSaveImportCandidate } from '../services/rakutenImport/rakutenImportConfidence';
import { ConciergeEvidencePanel } from './concierge/ConciergeEvidencePanel';
import { ConciergeActionPanel } from './concierge/ConciergeActionPanel';
import { MarketSituationCard } from './concierge/MarketSituationCard';
import { ConciergeRiskControlPanel } from './concierge/ConciergeRiskControlPanel';
import { PortfolioIntelligencePanel } from './concierge/PortfolioIntelligencePanel';
import { ConciergePromptDebugPanel } from './concierge/ConciergePromptDebugPanel';
import {
  AI_ANALYSIS_MODE_ORDER,
} from '../constants/aiDataDriven';
import { buildConciergeUxBundle } from '../services/conciergeUxPriorityBuilder';
import { buildConciergeShortAnswer } from '../services/conciergeShortAnswerFromEvidence';
import {
  buildConciergeEnhancedAnalysis,
  findMaterialRowForSymbol,
} from '../services/buildConciergeEnhancedAnalysis';
import { useBursaMaterialOptional } from '../context/BursaMaterialContext';
import { userNamesExplicitStockTarget } from '../services/conciergeEvidenceBuilder';
import { logEvidenceTrace } from '../services/conciergeEvidenceTrace';
import { getLastConciergeTurnEvidence } from '../services/conciergeEvidenceCache';
import { ConciergeUxModeToggle } from './concierge/ConciergeUxModeToggle';
import { ConciergeOneScreenDashboard } from './concierge/ConciergeOneScreenDashboard';
import { ConciergeMarketRadar } from './concierge/ConciergeMarketRadar';
import { ConciergeNotificationDigest } from './concierge/ConciergeNotificationDigest';
import { ConciergeTodayProposalsPanel } from './concierge/ConciergeTodayProposalsPanel';
import { ConciergeBursaNotificationDigestPanel } from './concierge/ConciergeBursaNotificationDigestPanel';
import { AiTradeQueueSection } from './AiTradeQueueSection';
import { ConciergeContextMemoryPanel } from './concierge/ConciergeContextMemoryPanel';
import { ConciergeShortAnswerBlock } from './concierge/ConciergeShortAnswerBlock';
import { ConciergeEnhancedAnalysisBlock } from './concierge/ConciergeEnhancedAnalysisBlock';
import { ConciergePrioritySection } from './concierge/ConciergePrioritySection';
import { ConciergeUxAdvancedStrip } from './concierge/ConciergeUxAdvancedStrip';
import { usePerformanceCostOptional } from '../context/PerformanceCostContext';
import {
  AI_ACTION_CENTER_DEBUG_LOG,
  AI_ACTION_CENTER_LITE_MODE,
  FORCE_SHOW_AI_ACTION_CENTER,
} from '../constants/aiConciergeDevFlags';
import { ConciergeProactiveDashboardPanels } from './concierge/ConciergeProactiveDashboardPanels';
import { ConciergeProactiveDashboardPanelsLite } from './concierge/ConciergeProactiveDashboardPanelsLite';
import type { ConciergeUxDisplayMode } from '../types/conciergeUx';
import { resolvePortfolioAiEvaluation } from '../services/portfolioAiEvaluationFromStrategyBundle';
import { buildPortfolioScoreWhyText } from '../services/actionCenterInsights';
import {
  finishConciergeChatPerf,
  markConciergeChatPerf,
} from '../services/conciergeChatPerfLog';

function ConciergeWarningBadge({ message }: { message: AiChatMessage }) {
  const { t } = useTranslation('concierge');
  if (message.conversationMode !== 'warning') return null;
  return (
    <View style={styles.warningBadge}>
      <SelectableText style={styles.warningBadgeText}>{t('warningBadge')}</SelectableText>
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
  const { t } = useTranslation('concierge');
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
          <SelectableText style={styles.structKey}>{t('structConclusion')}: </SelectableText>
          {s.conclusion}
        </SelectableText>
      ) : null}
      <SelectableText style={styles.structLine}>
        <SelectableText style={styles.structKey}>{t('structReason')}: </SelectableText>
        {s.reason}
      </SelectableText>
      {s.technicalReason ? (
        <SelectableText style={styles.structLine}>
          <SelectableText style={styles.structKey}>{t('structTechnical')}: </SelectableText>
          {s.technicalReason}
        </SelectableText>
      ) : null}
      {s.macroReason ? (
        <SelectableText style={styles.structLine}>
          <SelectableText style={styles.structKey}>{t('structMacro')}: </SelectableText>
          {s.macroReason}
        </SelectableText>
      ) : null}
      {s.systemStateReason ? (
        <SelectableText style={styles.structLine}>
          <SelectableText style={styles.structKey}>{t('structSystemState')}: </SelectableText>
          {s.systemStateReason}
        </SelectableText>
      ) : null}
      {s.confidenceDegradationReason ? (
        <SelectableText style={styles.structLine}>
          <SelectableText style={styles.structKey}>{t('structConfidenceLow')}: </SelectableText>
          {s.confidenceDegradationReason}
        </SelectableText>
      ) : null}
      <SelectableText style={styles.structLine}>
        <SelectableText style={styles.structKey}>{t('structRisk')}: </SelectableText>
        {s.risk}
      </SelectableText>
      <SelectableText style={styles.structLine}>
        <SelectableText style={styles.structKey}>{t('structMarket')}: </SelectableText>
        {s.market}
      </SelectableText>
      <SelectableText style={styles.structLine}>
        <SelectableText style={styles.structKey}>{t('structUrgency')}: </SelectableText>
        {s.urgency}
      </SelectableText>
      <SelectableText style={styles.structLine}>
        <SelectableText style={styles.structKey}>{t('structConfidence')}: </SelectableText>
        {s.confidence}
      </SelectableText>
      <SelectableText style={styles.structLine}>
        <SelectableText style={styles.structKey}>{t('structDataFreshness')}: </SelectableText>
        {s.dataFreshness}
      </SelectableText>
      {s.followUp ? (
        <SelectableText style={styles.structLine}>
          <SelectableText style={styles.structKey}>{t('structFollowUp')}: </SelectableText>
          {s.followUp}
        </SelectableText>
      ) : null}
    </View>
  );
}

function mergeEvidenceOntoMessage(
  msg: AiChatMessage,
  evidence?: ConciergeEvidenceBundle,
): AiChatMessage {
  const resolved = evidence ?? getLastConciergeTurnEvidence() ?? undefined;
  if (!resolved?.symbols?.length) return msg;
  if (msg.evidenceData?.symbols?.length && msg.evidenceData.actionGuide?.symbols?.length) {
    return msg;
  }
  return {
    ...msg,
    evidenceData: {
      ...resolved,
      ...msg.evidenceData,
      symbols: msg.evidenceData?.symbols?.length ? msg.evidenceData.symbols : resolved.symbols,
      actionGuide: msg.evidenceData?.actionGuide?.symbols?.length
        ? msg.evidenceData.actionGuide
        : resolved.actionGuide,
      riskControl: msg.evidenceData?.riskControl ?? resolved.riskControl,
      analysisDiagnostics:
        msg.evidenceData?.analysisDiagnostics ?? resolved.analysisDiagnostics,
    },
  };
}

function resultToMessage(
  result: AiStrategyChatResult,
  userText: string,
  ops: {
    degradedMode: boolean;
    staleHoldingsCount: number;
    apiHealthDegraded: boolean;
  },
  evidenceFallback?: ConciergeEvidenceBundle,
): AiChatMessage {
  const base = createAssistantChatMessagePartial({
    id: `a-${Date.now()}`,
    text: result.text,
    structured: result.structured,
    responseIntent: classifyConciergeResponseIntent(userText),
  });
  const enriched = enrichConciergeChatMessage(base, userText, ops);
  let msg: AiChatMessage = mergeEvidenceOntoMessage(
    {
      ...enriched,
      evidenceData: result.evidenceData ?? enriched.evidenceData,
    },
    evidenceFallback ?? result.evidenceData,
  );
  if (result.globalMarketAnalysis) msg = { ...msg, globalMarketAnalysis: result.globalMarketAnalysis };
  if (result.portfolioIntelligence) {
    msg = { ...msg, portfolioIntelligence: result.portfolioIntelligence };
  }
  logEvidenceTrace('result_to_message', {
    hasEvidence: Boolean(msg.evidenceData?.symbols?.length),
    symbol: msg.evidenceData?.symbols[0]?.symbol ?? null,
    messageId: msg.id,
    symbolCount: msg.evidenceData?.symbols?.length ?? 0,
  });
  return msg;
}

function roleLabel(msg: AiChatMessage, t: (key: string) => string): string {
  if (msg.role === 'user') {
    return msg.messageSource === 'voice' ? t('voiceLabel') : t('userLabel');
  }
  if (msg.role === 'system') return t('systemLabel');
  return t('assistantLabel');
}

function appendChatMessages(prev: AiChatMessage[], ...items: AiChatMessage[]): AiChatMessage[] {
  return normalizeChatHistory([...prev, ...items]);
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

function composingLabel(status: AiRequestStatus, isConcierge: boolean, t: (key: string) => string): string {
  if (!isConcierge) return t('sending');
  switch (status) {
    case 'thinking':
      return t('statusThinking');
    case 'retrying':
      return t('statusRetrying');
    case 'reconnecting':
      return t('statusReconnecting');
    case 'degraded':
      return t('statusDegraded');
    case 'streaming':
      return t('statusStreaming');
    case 'waiting_response':
      return t('composingAnswer');
    default:
      return t('composingAnswer');
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
  const { t } = useTranslation('concierge');
  const { appLanguage, languageRevision } = useAppLanguage();
  const resolvedVariant = variant ?? (embedded ? 'embedded' : 'default');
  const isConcierge = resolvedVariant === 'concierge';
  const isEmbedded = resolvedVariant === 'embedded' || isConcierge;
  const { sendAiStrategyMessage, aiPreferences, saveAiPreferences, aiApiKey, dataResetRevision, state, marketRegime, stageRakutenImportNaturalLanguage, stageRakutenImportOcrScreenshot } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isBeginnerMode, isProMode } = useAppUxMode();
  const { worldModel } = useCentralIntelligence();
  const proactive = useProactiveConciergeOptional();
  const unifiedCognitiveBundle = useUnifiedCognitiveDashboardBundle();
  const strategicMemoryBundle = useStrategicMemoryDashboardBundle();
  const runtimeSurvivalBundle = useRuntimeSurvivalDashboardBundle();
  const runtimeTelemetryBundle = useRuntimeTelemetryDashboardBundle();
  const explainableGovernanceBundle = useExplainableGovernanceDashboardBundle();
  const performanceCost = usePerformanceCostOptional();
  const materialCtx = useBursaMaterialOptional();
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
  const [ocrBusy, setOcrBusy] = useState(false);
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
    setMessages(getInitialAiChatMessages());
    setStatusJa(statusJaForRequestStatus(requestStatus));
  }, [appLanguage, languageRevision, requestStatus]);

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
        setStatusJa(statusJaForRequestStatus(probe.requestStatus));
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
    const slow = setTimeout(() => setSlowResponse(true), AI_CONCIERGE_SLOW_UI_MS);
    return () => clearTimeout(slow);
  }, [isSending]);

  useEffect(() => {
    if (!isSending) return;
    const watchdog = setTimeout(() => {
      if (!mountedRef.current || !isSending) return;
      abortRef.current?.abort();
      setIsSending(false);
      setRequestStatus('timeout');
      setStatusJa(i18n.t('concierge:statusTimeout'));
      setErrorJa(AI_ERROR_TIMEOUT);
      setUsedMockFallback(false);
      setApiConnected(true);
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
        return appendChatMessages(updated, {
          ...createAssistantChatMessagePartial({
            id: `a-timeout-${Date.now()}`,
            text: AI_ERROR_TIMEOUT,
            conversationMode: 'conversation',
          }),
        });
      });
      finishConciergeChatPerf({ outcome: 'ui_timeout' });
    }, AI_MAX_IN_FLIGHT_MS);
    return () => clearTimeout(watchdog);
  }, [isSending]);

  const historyHydratedRef = useRef(false);
  useEffect(() => {
    void loadAiChatHistory().then((loaded) => {
      if (!mountedRef.current || historyHydratedRef.current) return;
      historyHydratedRef.current = true;
      if (loaded.length > 0) {
        setMessages((prev) => (prev.length > 1 ? prev : normalizeChatHistory(loaded)));
      }
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      void saveAiChatHistory(messages);
    }
  }, [messages]);

  useEffect(() => {
    if (dataResetRevision <= 0) return;
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setInput('');
    setIsSending(false);
    setRetryPrompt(null);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setSpeakingMessageId(null);
    void stopVoiceOutput();
  }, [dataResetRevision]);

  const applyResult = useCallback((result: AiStrategyChatResult) => {
    setRequestStatus(result.requestStatus);
    setStatusJa(statusJaForRequestStatus(result.requestStatus));
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
    Alert.alert(i18n.t('concierge:chatDelete'), i18n.t('concierge:chatDeleteConfirm'), [
      { text: i18n.t('concierge:chatCancelSelection'), style: 'cancel' },
      {
        text: i18n.t('concierge:chatDelete'),
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

  const hasOpenAiKey = Boolean(aiApiKey.trim());

  const onPressOcrScreenshot = useCallback(async () => {
    if (!hasOpenAiKey) {
      Alert.alert(
        i18n.t('concierge:alerts.openAiKeyMissingTitle'),
        i18n.t('concierge:alerts.openAiKeyMissingBody'),
      );
      return;
    }
    if (ocrBusy || isSending) return;
    const uri = await pickTransactionHistoryImageWithAlert();
    if (!uri) return;
    setOcrBusy(true);
    setStatusJa(i18n.t('concierge:alerts.ocrReadingStatus'));
    try {
      const result = await stageRakutenImportOcrScreenshot(uri);
      if (!result.ok) {
        Alert.alert(i18n.t('concierge:alerts.ocrCannotReadTitle'), result.error);
        setStatusJa(i18n.t('concierge:statusInstant'));
        return;
      }
      navigation.navigate('RakutenImportOcrReview', { batchId: result.batchId });
      setStatusJa(i18n.t('concierge:statusInstant'));
    } finally {
      setOcrBusy(false);
    }
  }, [
    aiApiKey,
    hasOpenAiKey,
    isSending,
    navigation,
    ocrBusy,
    stageRakutenImportOcrScreenshot,
  ]);

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
        if (!userNamesExplicitStockTarget(trimmed)) {
          void proactive?.refreshProactive();
        }
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
      let lastTurnEvidence: ConciergeEvidenceBundle | undefined;
      const markUserDelivery = (status: AiChatMessage['deliveryStatus'], failureKindJa?: string) => {
        if (!status) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsg.id
              ? { ...m, deliveryStatus: status, failureKindJa: failureKindJa ?? undefined }
              : m,
          ),
        );
      };
      const appendAssistant = async (msg: AiChatMessage, stream = true) => {
        assistantAdded = true;
        markUserDelivery('ok');
        await stopVoiceOutput();
        setSpeakingMessageId(null);
        const baseEnriched = enrichConciergeChatMessage(msg, trimmed, conciergeOps);
        const enriched: AiChatMessage = mergeEvidenceOntoMessage(
          {
            ...baseEnriched,
            evidenceData: msg.evidenceData ?? baseEnriched.evidenceData,
            globalMarketAnalysis: msg.globalMarketAnalysis,
            portfolioIntelligence: msg.portfolioIntelligence,
          },
          lastTurnEvidence,
        );
        logEvidenceTrace('append_assistant', {
          hasEvidence: Boolean(enriched.evidenceData?.symbols?.length),
          symbol: enriched.evidenceData?.symbols[0]?.symbol ?? null,
          messageId: enriched.id,
          symbolCount: enriched.evidenceData?.symbols?.length ?? 0,
        });
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
          markConciergeChatPerf('ui_display_complete');
          finishConciergeChatPerf({ outcome: 'ok', streamed: false });
          return;
        }
        const placeholderId = enriched.id;
        setRequestStatus('streaming');
        setStatusJa(statusJaForRequestStatus('streaming'));
        setMessages((prev) => {
          const next = appendChatMessages(prev, { ...enriched, text: '' });
          const placed = next.find((m) => m.id === placeholderId);
          logEvidenceTrace('message_in_state', {
            hasEvidence: Boolean(placed?.evidenceData?.symbols?.length),
            symbol: placed?.evidenceData?.symbols[0]?.symbol ?? null,
            messageId: placeholderId,
            symbolCount: placed?.evidenceData?.symbols?.length ?? 0,
            note: 'streaming placeholder',
          });
          return next;
        });
        scrollToEnd();
        try {
          await streamRevealText(
            enriched.text,
            (partial) => {
              if (!mountedRef.current || controller.signal.aborted) return;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId
                    ? {
                        ...m,
                        text: partial,
                        evidenceData: m.evidenceData ?? enriched.evidenceData,
                      }
                    : m,
                ),
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
        markConciergeChatPerf('ui_display_complete');
        finishConciergeChatPerf({ outcome: 'ok', streamed: stream });
      };

      try {
        const askWhyScore =
          /なぜ\s*\d+\s*点|なぜ.*点|どうして.*点|44点/.test(trimmed) &&
          isConcierge &&
          Boolean(proactive?.strategyBundle);
        if (askWhyScore && proactive?.strategyBundle) {
          const portfolio = resolvePortfolioAiEvaluation(proactive.strategyBundle);
          const text = buildPortfolioScoreWhyText({
            portfolio,
            holdings: state.portfolio,
            bundle: proactive.strategyBundle,
          });
          await appendAssistant(
            createAssistantChatMessagePartial({
              id: `a-score-why-${Date.now()}`,
              text,
              responseIntent: 'portfolio_review',
              conversationMode: 'analysis',
            }),
            true,
          );
          setUsedMockFallback(false);
          setApiConnected(true);
          setRequestStatus('idle');
          setStatusJa(i18n.t('concierge:statusInstant'));
          return;
        }

        const instant = getConciergeInstantAnswer(trimmed, aiPreferences.aiExplanationLevel);
        if (instant) {
          await appendAssistant(instant, true);
          setUsedMockFallback(false);
          setApiConnected(false);
          setRequestStatus('idle');
          setStatusJa(i18n.t('concierge:statusInstant'));
          return;
        }

        if (detectRakutenImportIntent(trimmed)) {
          const stageResult = await stageRakutenImportNaturalLanguage(trimmed);
          if (stageResult.ok) {
            const { candidate, candidateId } = stageResult;
            const confirmText = buildConfirmPromptJa(candidate);
            const blocked = !canSaveImportCandidate(candidate);
            await appendAssistant(
              createAssistantChatMessagePartial({
                id: `a-rakuten-import-${Date.now()}`,
                text: confirmText,
                responseIntent: 'app_help',
                conversationMode: 'conversation',
                rakutenImportCandidateId: candidateId,
                rakutenImportBlocked: blocked,
              }),
              false,
            );
            setUsedMockFallback(false);
            setApiConnected(false);
            setRequestStatus('idle');
            setStatusJa(i18n.t('concierge:statusInstant'));
            return;
          }
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
        lastTurnEvidence = result.evidenceData;

        if (!mountedRef.current || controller.signal.aborted) return;

        applyResult(result);
        await appendAssistant(
          resultToMessage(result, trimmed, conciergeOps, lastTurnEvidence),
          result.source === 'api',
        );
      } catch (e) {
        if (!mountedRef.current) return;
        if (isAbortError(e) && controller.signal.aborted) return;

        setRequestStatus('error');
        const failureKindJa =
          e instanceof Error && e.message.includes('429')
            ? t('alerts.failureKindRateLimit')
            : e instanceof Error && e.name === 'AbortError'
              ? t('alerts.failureKindTimeout')
              : t('alerts.failureKindNetwork');
        setErrorJa(PROACTIVE_UI.retryPrompt);
        setRetryPrompt(trimmed);
        setStatusJa(statusJaForRequestStatus('error'));
        setApiConnected(false);
        setUsedMockFallback(true);
        markUserDelivery('failed', failureKindJa);
        if (!assistantAdded) {
          await appendAssistant(
            mergeEvidenceOntoMessage(createAssistantChatMessage(trimmed), lastTurnEvidence),
            false,
          );
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        if (mountedRef.current) {
          setIsSending(false);
          if (!assistantAdded && !controller.signal.aborted) {
            markUserDelivery('ok');
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role !== 'user') return prev;
              return appendChatMessages(
                prev,
                mergeEvidenceOntoMessage(createAssistantChatMessage(last.text), lastTurnEvidence),
              );
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
      proactive?.strategyBundle,
      state.portfolio,
      stageRakutenImportNaturalLanguage,
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

  const systemStatusLines = (
    <>
      <View style={styles.statusRow}>
        <SelectableText style={styles.statusLabel}>
          {t('apiStatus')}: <SelectableText style={{ color: statusColor }}>{statusJa}</SelectableText>
        </SelectableText>
        {shouldShowApiSpinner(requestStatus, isCheckingConnection || isSending) ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : null}
      </View>
      {usedMockFallback ? (
        <SelectableText style={styles.mockBanner}>{errorJa ?? t('mockFallback')}</SelectableText>
      ) : null}
      {errorJa && !usedMockFallback ? (
        <SelectableText style={styles.errorText}>{errorJa}</SelectableText>
      ) : null}
      {slowResponse && isSending ? (
        <SelectableText style={styles.errorText}>{t('statusSlow')}</SelectableText>
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
        <SelectableText style={styles.staleWarning}>{t('staleDataWarning')}</SelectableText>
      ) : null}
      {!aiPreferences.aiEnabled ? (
        <SelectableText style={styles.mockBanner}>{t('aiDisabledBanner')}</SelectableText>
      ) : null}
      {aiPreferences.mockOnly ? (
        <SelectableText style={styles.mockBanner}>{t('mockOnlyBanner')}</SelectableText>
      ) : null}
    </>
  );

  const statusMetaBlock = systemStatusLines;

  const conciergeSystemStatusBlock = (
    <View style={styles.conciergeStatus}>
      <View style={styles.statusRow}>
        <SelectableText style={styles.conciergeStatusLabel}>
          {t('apiStatus')}: <SelectableText style={{ color: statusColor }}>{statusJa}</SelectableText>
        </SelectableText>
        {shouldShowApiSpinner(requestStatus, isCheckingConnection || isSending) ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : null}
      </View>
      {usedMockFallback ? (
        <SelectableText style={styles.conciergeStatusLine}>{errorJa ?? t('mockFallback')}</SelectableText>
      ) : null}
      {errorJa && !usedMockFallback ? (
        <SelectableText style={styles.conciergeStatusLine}>{errorJa}</SelectableText>
      ) : null}
      {slowResponse && isSending ? (
        <SelectableText style={styles.conciergeStatusWarn}>{t('statusSlow')}</SelectableText>
      ) : null}
      {staleWarning ? (
        <SelectableText style={styles.conciergeStatusWarn}>{t('staleDataWarning')}</SelectableText>
      ) : null}
      {!aiPreferences.aiEnabled ? (
        <SelectableText style={styles.conciergeStatusLine}>{t('aiDisabledBanner')}</SelectableText>
      ) : null}
      {aiPreferences.mockOnly ? (
        <SelectableText style={styles.conciergeStatusLine}>{t('mockOnlyBanner')}</SelectableText>
      ) : null}
    </View>
  );

  const analysisModeBlock = isConcierge ? (
    <View style={styles.analysisModeRow}>
      <SelectableText style={styles.analysisModeLabel}>{t('analysisModeLabel')}</SelectableText>
      {AI_ANALYSIS_MODE_ORDER.map((mode) => {
        const active = aiPreferences.aiAnalysisMode === mode;
        const modeLabelKey =
          mode === 'conservative'
            ? 'analysisModeConservative'
            : mode === 'balanced'
              ? 'analysisModeBalanced'
              : 'analysisModeAggressive';
        return (
          <Pressable
            key={mode}
            onPress={() => void saveAiPreferences({ aiAnalysisMode: mode })}
            style={[styles.analysisChip, active && styles.analysisChipActive]}
          >
            <Text style={[styles.analysisChipText, active && styles.analysisChipTextActive]}>
              {t(modeLabelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  ) : null;

  if (AI_ACTION_CENTER_DEBUG_LOG && isConcierge) {
    console.log('[AI Action Center gate]', {
      strategyBundle: proactive?.strategyBundle ?? null,
      strategyExecutionEnabled: aiPreferences.strategyExecutionEnabled,
      forceShow: FORCE_SHOW_AI_ACTION_CENTER,
      willRender: !!proactive,
      hybridSecondEvaluator: proactive?.strategyBundle?.hybridSecondEvaluator ?? null,
      portfolioAiEvaluation: proactive?.strategyBundle?.portfolioAiEvaluation ?? null,
    });
  }

  const conciergeUxDashboardBlock =
    proactive && isProMode && !(isConcierge && isBeginnerMode) ? (
    <View testID={CONCIERGE_SECTION_TEST_ID.status_card}>
      {AI_ACTION_CENTER_LITE_MODE ? (
        <ConciergeProactiveDashboardPanelsLite proactive={proactive} />
      ) : (
        <ConciergeProactiveDashboardPanels
          proactive={proactive}
          aiPreferences={aiPreferences}
          strategicMemoryBundle={strategicMemoryBundle}
          unifiedCognitiveBundle={unifiedCognitiveBundle}
          explainableGovernanceBundle={explainableGovernanceBundle}
          runtimeSurvivalBundle={runtimeSurvivalBundle}
          runtimeTelemetryBundle={runtimeTelemetryBundle}
        />
      )}
      {!AI_ACTION_CENTER_LITE_MODE ? (
        <>
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
        </>
      ) : null}
    </View>
  ) : null;

  const beginnerQuickActionsBlock =
    isConcierge && isBeginnerMode ? (
      <BeginnerConciergeQuickActions onAction={onSample} disabled={isLoading} />
    ) : null;

  const ux20aConciergeIntegrationBlock = isConcierge ? (
    <View testID="concierge-ux20a-integration">
      <ConciergeTodayProposalsPanel />
      <ConciergeBursaNotificationDigestPanel />
      <AiTradeQueueSection
        marketRegime={marketRegime}
        scrollRef={conciergeScrollRef}
        sectionTitle={t('todayProposalsTitle')}
        sectionSubtitle={t('todayProposalsSubtitle')}
        testID="concierge-today-trade-proposals"
        defaultCollapsed
      />
    </View>
  ) : null;

  const quickActionsBlock =
    !isConcierge ? (
      <View>
        <SelectableText style={styles.sampleTitle}>{AI_UI.sampleQuestions}</SelectableText>
        <View style={styles.sampleRow}>
          {quickQuestions.map((q, qIndex) => (
            <Pressable
              key={`quick-q-${qIndex}-${q.slice(0, 40)}`}
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
            onPress={() => void onPressOcrScreenshot()}
            disabled={isSending || ocrBusy}
            style={({ pressed }) => [
              styles.voiceBtn,
              !hasOpenAiKey && styles.ocrBtnDisabled,
              pressed && styles.voiceBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('ocrScreenshotLabel')}
          >
            <Ionicons
              name="camera-outline"
              size={22}
              color={hasOpenAiKey ? theme.colors.primary : theme.colors.textMuted}
            />
          </Pressable>
        ) : null}
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
            accessibilityLabel={i18n.t('concierge:voiceInput')}
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
          placeholder={t('chatInputPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          editable={!isSending}
          onSubmitEditing={onPressSend}
          blurOnSubmit={false}
          onFocus={isConcierge ? scrollComposerIntoView : undefined}
        />
        <Button
          label={isSending ? composingLabel(requestStatus, isConcierge, t) : t('send')}
          onPress={onPressSend}
          disabled={!shouldAcceptChatSend(input, isSending)}
        />
      </View>
      {isConcierge && voiceStatus === 'listening' ? (
        <SelectableText style={styles.voiceListening}>{i18n.t('concierge:voiceListening')}</SelectableText>
      ) : null}
    </View>
  );

  const selectionToolbar = selectionMode ? (
    <View style={styles.selectionBar}>
      <Pressable onPress={selectAllMessages} style={styles.selectionAction}>
        <Text style={styles.selectionActionText}>{i18n.t('concierge:chatSelectAll')}</Text>
      </Pressable>
      <Pressable
        onPress={confirmDeleteSelected}
        disabled={selectedIds.size === 0}
        style={[styles.selectionAction, selectedIds.size === 0 && styles.selectionActionDisabled]}
      >
        <Text style={[styles.selectionActionText, styles.selectionDeleteText]}>
          {i18n.t('concierge:chatDelete')}
        </Text>
      </Pressable>
      <Pressable onPress={cancelSelection} style={styles.selectionAction}>
        <Text style={styles.selectionActionText}>{i18n.t('concierge:chatCancelSelection')}</Text>
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
            <SelectableText style={styles.bubbleRole}>{roleLabel(msg, t)}</SelectableText>
            {msg.role === 'assistant' ? <ConciergeWarningBadge message={msg} /> : null}
            {msg.role === 'assistant' && isConcierge && !msg.rakutenImportCandidateId ? (
              (() => {
                const materialRow = msg.evidenceData?.symbols[0]
                  ? findMaterialRowForSymbol(
                      materialCtx?.report ?? null,
                      msg.evidenceData.symbols[0].symbol,
                    )
                  : null;
                const enhanced = buildConciergeEnhancedAnalysis({
                  evidence: msg.evidenceData,
                  structured: msg.structured,
                  fallbackText: msg.text,
                  materialRow,
                });
                if (enhanced) {
                  return <ConciergeEnhancedAnalysisBlock report={enhanced} />;
                }
                return (
                  <ConciergeShortAnswerBlock
                    answer={buildConciergeShortAnswer(
                      msg.structured,
                      msg.text,
                      msg.evidenceData,
                      msg.id,
                    )}
                  />
                );
              })()
            ) : null}
            {msg.role === 'user' &&
            msg.deliveryStatus &&
            msg.deliveryStatus !== 'ok' ? (
              <SelectableText style={styles.deliveryMeta}>
                {msg.deliveryStatus === 'pending_response'
                  ? t('deliveryPending')
                  : msg.deliveryStatus === 'timeout'
                    ? `${t('deliveryTimeout')}${msg.failureKindJa ? ` (${msg.failureKindJa})` : ''}`
                    : `${t('deliveryFailed')}${msg.failureKindJa ? ` (${msg.failureKindJa})` : ''}`}
              </SelectableText>
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
            {msg.role === 'assistant' ? <StructuredBlock message={msg} uxMode={uxMode} /> : null}
            {msg.role === 'assistant' && msg.rakutenImportCandidateId ? (
              <ConciergeImportActionCard
                candidateId={msg.rakutenImportCandidateId}
                blocked={msg.rakutenImportBlocked}
              />
            ) : null}
            {msg.role === 'assistant' && msg.globalMarketAnalysis ? (
              <ConciergePrioritySection
                title={t('panelMarketSituation')}
                priority="medium"
                defaultCollapsed={uxBundle.defaultCollapse.medium}
              >
                <MarketSituationCard analysis={msg.globalMarketAnalysis} />
              </ConciergePrioritySection>
            ) : null}
            {msg.role === 'assistant' && msg.evidenceData?.riskControl ? (
              <ConciergePrioritySection
                title={t('panelRiskControl')}
                priority="critical"
                defaultCollapsed={uxBundle.defaultCollapse.critical}
              >
                <ConciergeRiskControlPanel
                  risk={msg.evidenceData.riskControl}
                  diagnostics={msg.evidenceData.analysisDiagnostics}
                />
              </ConciergePrioritySection>
            ) : null}
            {msg.role === 'assistant' && msg.evidenceData?.actionGuide ? (
              <ConciergePrioritySection
                title={t('panelActionGuide')}
                priority="high"
                defaultCollapsed={uxBundle.defaultCollapse.high}
              >
                <ConciergeActionPanel
                  guide={msg.evidenceData.actionGuide}
                  riskControl={msg.evidenceData.riskControl}
                  diagnostics={msg.evidenceData.analysisDiagnostics}
                />
              </ConciergePrioritySection>
            ) : null}
            {msg.role === 'assistant' && msg.evidenceData && uxMode === 'advanced' ? (
              <ConciergePrioritySection
                title={t('panelEvidence')}
                priority="low"
                defaultCollapsed
              >
                <ConciergeEvidencePanel evidence={msg.evidenceData} />
              </ConciergePrioritySection>
            ) : null}
            {msg.role === 'assistant' && msg.portfolioIntelligence ? (
              <ConciergePrioritySection
                title={t('panelPortfolioLearning')}
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
                    ? i18n.t('concierge:chatStopSpeak')
                    : i18n.t('concierge:chatSpeak')
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
            {composingLabel(requestStatus, isConcierge, t)}
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
        {ux20aConciergeIntegrationBlock}
        {beginnerQuickActionsBlock}
        {conciergeUxDashboardBlock}
        {isBeginnerMode ? null : analysisModeBlock}
        {proactiveConciergeBlock}
        {threadBlock}
        {aiPreferences.aiConciergeDebugMode ? <ConciergePromptDebugPanel /> : null}
        <View testID={CONCIERGE_SECTION_TEST_ID.footer_meta} style={styles.footerMeta}>
          {conciergeSystemStatusBlock}
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
    return (
      <View
        key={`ai-chat-${appLanguage}-${languageRevision}`}
        style={[styles.embeddedWrap, isConcierge && styles.embeddedConcierge]}
      >
        {chatBody}
      </View>
    );
  }
  return (
    <Card key={`ai-chat-${appLanguage}-${languageRevision}`} style={styles.card}>
      {chatBody}
    </Card>
  );
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
  ocrBtnDisabled: { opacity: 0.45 },
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
