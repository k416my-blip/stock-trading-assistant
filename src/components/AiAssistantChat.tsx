import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { SelectableText } from './ui/SelectableText';
import { theme } from '../theme';

function ConciergeWarningBadge({ message }: { message: AiChatMessage }) {
  if (message.conversationMode !== 'warning') return null;
  return (
    <View style={styles.warningBadge}>
      <SelectableText style={styles.warningBadgeText}>システム注意</SelectableText>
    </View>
  );
}

function StructuredBlock({ message }: { message: AiChatMessage }) {
  const s = message.structured;
  if (!s) return null;
  const mode = message.conversationMode ?? 'conversation';
  if (!shouldShowStructuredForMode(mode)) {
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
  const base: AiChatMessage = {
    id: `a-${Date.now()}`,
    role: 'assistant',
    text: result.text,
    structured: result.structured,
    responseIntent: classifyConciergeResponseIntent(userText),
    createdAt: new Date().toISOString(),
  };
  return enrichConciergeChatMessage(base, userText, ops);
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
};

export function AiAssistantChat({ embedded = false, variant }: AiAssistantChatProps) {
  const resolvedVariant = variant ?? (embedded ? 'embedded' : 'default');
  const isConcierge = resolvedVariant === 'concierge';
  const isEmbedded = resolvedVariant === 'embedded' || isConcierge;
  const { sendAiStrategyMessage, aiPreferences, aiApiKey } = useApp();
  const { worldModel } = useCentralIntelligence();
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
    if (!isSending) return;
    const watchdog = setTimeout(() => {
      if (!mountedRef.current || !isSending) return;
      setIsSending(false);
      setRequestStatus('timeout');
      setStatusJa(statusJaForRequestStatus('timeout'));
      setErrorJa(AI_ERROR_TIMEOUT);
      setUsedMockFallback(true);
      setApiConnected(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role !== 'user') return prev;
        return [...prev, createAssistantChatMessage(last.text)];
      });
    }, AI_MAX_IN_FLIGHT_MS);
    return () => clearTimeout(watchdog);
  }, [isSending]);

  useEffect(() => {
    void loadAiChatHistory().then((loaded) => {
      if (mountedRef.current) {
        setMessages(loaded);
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
      if (!aiPreferences.voiceEnabled) return;
      await stopVoiceOutput();
      setSpeakingMessageId(messageId);
      await speakVoiceOutput(text, {
        rate: aiPreferences.voiceSpeechRate,
        onDone: () => setSpeakingMessageId((id) => (id === messageId ? null : id)),
        onStopped: () => setSpeakingMessageId((id) => (id === messageId ? null : id)),
      });
    },
    [aiPreferences.voiceEnabled, aiPreferences.voiceSpeechRate],
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
      const next =
        remaining.length === 0 ? getInitialAiChatMessages() : remaining;
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

  const handleSendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!shouldAcceptChatSend(trimmed, isSending)) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg = createUserChatMessage(trimmed);
      setMessages((prev) => [...prev, userMsg]);
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
          setMessages((prev) => [...prev, enriched]);
          scrollToEnd();
          if (aiPreferences.voiceEnabled && aiPreferences.voiceAutoRead) {
            void maybeSpeakAssistant(enriched.id, enriched.text);
          }
          return;
        }
        const placeholderId = enriched.id;
        setRequestStatus('streaming');
        setStatusJa(statusJaForRequestStatus('streaming'));
        setMessages((prev) => [...prev, { ...enriched, text: '' }]);
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
        await appendAssistant(resultToMessage(result, trimmed, conciergeOps), result.source === 'api');
      } catch (e) {
        if (!mountedRef.current) return;
        if (isAbortError(e) && controller.signal.aborted) return;

        setRequestStatus('error');
        setErrorJa('送信に失敗しました。モック応答を表示しています。');
        setStatusJa(statusJaForRequestStatus('error'));
        setApiConnected(false);
        setUsedMockFallback(true);
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
              return [...prev, createAssistantChatMessage(last.text)];
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
    ],
  );

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

  const conciergeSystemStatusBlock = (
    <View testID={CONCIERGE_SECTION_TEST_ID.status_card} style={styles.conciergeStatus}>
      <SelectableText style={styles.conciergeStatusLabel}>{AI_CONCIERGE_UI.systemStatus}</SelectableText>
      {worldModel ? (
        <>
          <SelectableText style={styles.conciergeStatusLine}>
            {AI_CONCIERGE_UI.marketRegime}: {worldModel.marketRegimeLabel}
          </SelectableText>
          <SelectableText style={styles.conciergeStatusLine}>
            {AI_CONCIERGE_UI.riskMode}: {worldModel.riskMode}
          </SelectableText>
          <SelectableText style={styles.conciergeStatusLine}>
            総合信頼度: {awareness?.compositeConfidence ?? '—'}%
            {worldModel.operations.degradedMode ? ' · 劣化モード' : ''}
          </SelectableText>
          <SelectableText style={styles.conciergeStatusLine}>
            {worldModel.operations.queueStateJa}
          </SelectableText>
          {worldModel.operations.degradedReasonsJa.length > 0 ? (
            <SelectableText style={styles.conciergeStatusWarn}>
              {worldModel.operations.degradedReasonsJa.join(' · ')}
            </SelectableText>
          ) : null}
        </>
      ) : (
        <SelectableText style={styles.conciergeStatusLine}>読み込み中…</SelectableText>
      )}
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
              msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
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
            <SelectableText style={styles.bubbleRole}>
              {msg.role === 'user' ? AI_UI.userLabel : AI_UI.assistantLabel}
            </SelectableText>
            {msg.role === 'assistant' ? <ConciergeWarningBadge message={msg} /> : null}
            <SelectableText
              style={[
                styles.bubbleText,
                isConcierge && msg.role === 'assistant' && styles.bubbleTextConcierge,
              ]}
            >
              {msg.text}
            </SelectableText>
            {msg.role === 'assistant' ? <StructuredBlock message={msg} /> : null}
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
        {conciergeSystemStatusBlock}
        {threadBlock}
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
