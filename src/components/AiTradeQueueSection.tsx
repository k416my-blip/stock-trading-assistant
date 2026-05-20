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
import { buildMockAiStrategyBriefing } from '../data/mockAiStrategyBriefing';
import { sortQueueIntoSections } from '../services/queueSortService';
import { useUrgencySignals } from '../context/UrgencySignalContext';
import { AiStrategyBriefingCard } from './AiStrategyBriefingCard';
import { AiSystemSignalCard } from './AiSystemSignalCard';
import { AiTradeQueueCard } from './AiTradeQueueCard';
import { AiSuggestionExplanationModal } from './AiSuggestionExplanationModal';
import { ToastBanner } from './ui/ToastBanner';
import { theme } from '../theme';

type Props = {
  marketRegime?: MarketRegimeResult;
  scrollRef?: React.RefObject<ScrollViewType | null>;
};

export function AiTradeQueueSection({ marketRegime, scrollRef }: Props) {
  const briefing = useMemo(() => buildMockAiStrategyBriefing(marketRegime), [marketRegime]);
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

  return (
    <View style={styles.wrap}>
      <ToastBanner message={toastMessage} onDismiss={clearToast} />

      <AiStrategyBriefingCard briefing={briefing} />

      <Text style={styles.sectionTitle}>{AI_UI.tradeQueueTitle}</Text>
      <Text style={styles.sectionSubtitle}>{AI_UI.tradeQueueSubtitle}</Text>

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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing.md },
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
