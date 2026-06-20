import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ScrollView as ScrollViewType,
  type View as ViewType,
} from 'react-native';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { AiTradeQueueItem } from '../types/aiStrategyBriefing';
import type { UrgencySignal } from '../types/urgencySignal';
import { AI_UI } from '../constants/aiStrategyBriefing';
import { sortQueueIntoSections } from '../services/queueSortService';
import { useAiTradeQueue } from '../context/AiTradeQueueContext';
import { useUrgencySignals } from '../context/UrgencySignalContext';
import { buildMockAiStrategyBriefing } from '../data/mockAiStrategyBriefing';
import { AiStrategyBriefingCard } from './AiStrategyBriefingCard';
import { AiSystemSignalCard } from './AiSystemSignalCard';
import { AiTradeQueueCard } from './AiTradeQueueCard';
import { AiSuggestionExplanationModal } from './AiSuggestionExplanationModal';
import { ToastBanner } from './ui/ToastBanner';
import { theme } from '../theme';

type Props = {
  marketRegime?: MarketRegimeResult;
  scrollRef?: React.RefObject<ScrollViewType | null>;
  sectionTitle?: string;
  sectionSubtitle?: string;
  testID?: string;
  defaultCollapsed?: boolean;
};

export function AiTradeQueueSection({
  marketRegime,
  scrollRef,
  sectionTitle,
  sectionSubtitle,
  testID,
  defaultCollapsed = false,
}: Props) {
  const { briefing: queueBriefing } = useAiTradeQueue();
  const briefing = useMemo(
    () => queueBriefing ?? buildMockAiStrategyBriefing(marketRegime),
    [queueBriefing, marketRegime],
  );
  const {
    queueWithAck,
    systemSignals,
    acknowledgeSignal,
    acknowledgeQueueItem,
    highlightedSignalId,
    showDisabledItems,
    setShowDisabledItems,
    registerSignalFocusHandler,
    toastMessage,
    clearToast,
    showAcknowledgedToast,
  } = useUrgencySignals();

  const [selected, setSelected] = useState<AiTradeQueueItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(() => new Set());
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(!defaultCollapsed);
  const cardRefs = useRef<Record<string, ViewType | null>>({});

  const sections = useMemo(() => {
    const filtered = queueWithAck.filter(
      (item) => showDisabledItems || item.ackStatus !== 'disabled',
    );
    return sortQueueIntoSections(filtered);
  }, [queueWithAck, showDisabledItems]);

  const scrollToSignal = useCallback(
    (signal: UrgencySignal) => {
      const node = cardRefs.current[signal.id];
      const scroll = scrollRef?.current;
      if (!node || !scroll) return;
      node.measureInWindow((_x, y) => {
        scroll.scrollTo({ y: Math.max(0, y - 72), animated: true });
      });
    },
    [scrollRef],
  );

  useEffect(() => {
    registerSignalFocusHandler((signal) => {
      scrollToSignal(signal);
      if (signal.source === 'trade_queue') {
        const item = queueWithAck.find((q) => q.id === signal.id);
        if (item) {
          setSelected(item);
          setModalVisible(true);
        }
      }
    });
    return () => registerSignalFocusHandler(null);
  }, [queueWithAck, registerSignalFocusHandler, scrollToSignal]);

  const openDetails = (item: AiTradeQueueItem) => {
    setSelected(item);
    setModalVisible(true);
  };

  const closeDetails = () => {
    setModalVisible(false);
    setSelected(null);
  };

  const handleAcknowledge = (itemId: string) => {
    setDismissingIds((prev) => new Set(prev).add(itemId));
    void acknowledgeQueueItem(itemId).then(() => {
      showAcknowledgedToast();
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    });
  };

  const renderQueueCard = (
    item: (typeof queueWithAck)[number],
    variant: 'active' | 'expired' | 'history',
  ) => (
    <View
      key={item.id}
      ref={(node) => {
        cardRefs.current[item.id] = node;
      }}
      collapsable={false}
    >
      <AiTradeQueueCard
        item={item}
        ackStatus={item.ackStatus}
        variant={variant}
        highlighted={highlightedSignalId === item.id}
        dismissing={dismissingIds.has(item.id)}
        onPressDetails={() => openDetails(item)}
        onAcknowledge={
          item.ackStatus === 'unacknowledged' ? () => handleAcknowledge(item.id) : undefined
        }
      />
    </View>
  );

  const queueTitle = sectionTitle ?? AI_UI.tradeQueueTitle;
  const queueSubtitle = sectionSubtitle ?? AI_UI.tradeQueueSubtitle;
  const activeCount =
    sections.active.length + sections.expired.length + systemSignals.length;

  return (
    <View style={styles.wrap} testID={testID}>
      <ToastBanner message={toastMessage} onDismiss={clearToast} />

      {defaultCollapsed ? (
        <Pressable
          onPress={() => setBodyExpanded((v) => !v)}
          style={styles.collapseHeader}
          accessibilityRole="button"
          accessibilityState={{ expanded: bodyExpanded }}
          testID={testID ? `${testID}-collapse-toggle` : undefined}
        >
          <View style={styles.collapseHeaderText}>
            <Text style={styles.sectionTitle}>{queueTitle}</Text>
            <Text style={styles.sectionSubtitle}>{queueSubtitle}</Text>
          </View>
          <Text style={styles.collapseToggle}>
            {bodyExpanded ? '閉じる' : `詳細を見る${activeCount > 0 ? `（${activeCount}件）` : ''}`}
          </Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.sectionTitle}>{queueTitle}</Text>
          <Text style={styles.sectionSubtitle}>{queueSubtitle}</Text>
        </>
      )}

      {bodyExpanded ? (
        <>
      <AiStrategyBriefingCard briefing={briefing} />

      <Pressable
        onPress={() => setShowDisabledItems(!showDisabledItems)}
        style={styles.filterRow}
        accessibilityRole="button"
      >
        <Text style={styles.filterText}>
          {showDisabledItems ? AI_UI.hideDisabledSignals : AI_UI.showDisabledSignals}
        </Text>
      </Pressable>

      {systemSignals.map((signal) => (
        <View
          key={signal.id}
          ref={(node) => {
            cardRefs.current[signal.id] = node;
          }}
          collapsable={false}
        >
          <AiSystemSignalCard
            signal={signal}
            highlighted={highlightedSignalId === signal.id}
            onAcknowledge={() => void acknowledgeSignal(signal.id)}
          />
        </View>
      ))}

      {sections.active.map((item) => renderQueueCard(item, 'active'))}
      {sections.expired.map((item) => renderQueueCard(item, 'expired'))}

      {sections.acknowledged.length > 0 ? (
        <View style={styles.historyBlock}>
          <Pressable
            onPress={() => setHistoryExpanded((v) => !v)}
            style={styles.historyHeader}
            accessibilityRole="button"
            accessibilityState={{ expanded: historyExpanded }}
          >
            <Text style={styles.historyTitle}>{AI_UI.acknowledgedHistoryTitle}</Text>
            <Text style={styles.historyToggle}>
              {historyExpanded ? AI_UI.acknowledgedHistoryCollapse : AI_UI.acknowledgedHistoryExpand}
            </Text>
          </Pressable>
          {historyExpanded
            ? sections.acknowledged.map((item) => renderQueueCard(item, 'history'))
            : null}
        </View>
      ) : null}

      {showDisabledItems
        ? sections.disabled.map((item) => renderQueueCard(item, 'history'))
        : null}

      <AiSuggestionExplanationModal visible={modalVisible} item={selected} onClose={closeDetails} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing.md },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  collapseHeaderText: { flex: 1 },
  collapseToggle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    paddingTop: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  sectionSubtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  filterRow: {
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
    paddingVertical: 4,
  },
  filterText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  historyBlock: {
    marginTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  historyTitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  historyToggle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
});
