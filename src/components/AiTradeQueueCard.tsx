import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AiTradeQueueItem } from '../types/aiStrategyBriefing';
import { colorForAiUrgency } from '../constants/urgencyColors';
import {
  TRADE_QUEUE_ACK_STATUS_LABEL,
  type TradeQueueAckStatus,
} from '../types/urgencySignal';
import {
  formatResponseDeadlineJa,
  formatSignalTimeJa,
} from '../services/tradeQueueStatusResolver';
import { AI_SAFE_ACTION_LABEL, AI_UI, AI_URGENCY_LABEL } from '../constants/aiStrategyBriefing';
import { MARKET_LABEL } from '../constants/rakutenTrade';
import { Card } from './ui/Card';
import { theme } from '../theme';

export type AiTradeQueueCardVariant = 'active' | 'expired' | 'history';

type Props = {
  item: AiTradeQueueItem;
  ackStatus?: TradeQueueAckStatus;
  variant?: AiTradeQueueCardVariant;
  highlighted?: boolean;
  dismissing?: boolean;
  onPressDetails: () => void;
  onAcknowledge?: () => void;
};

function actionColor(action: AiTradeQueueItem['suggestedAction']): string {
  switch (action) {
    case 'suggested_buy':
      return theme.colors.success;
    case 'suggested_reduce':
      return theme.colors.warning;
    case 'watch_closely':
      return theme.colors.warning;
    default:
      return theme.colors.primary;
  }
}

function variantFromStatus(
  status: TradeQueueAckStatus,
  explicit?: AiTradeQueueCardVariant,
): AiTradeQueueCardVariant {
  if (explicit) return explicit;
  if (status === 'acknowledged') return 'history';
  if (status === 'expired') return 'expired';
  return 'active';
}

export function AiTradeQueueCard({
  item,
  ackStatus = 'unacknowledged',
  variant: variantProp,
  highlighted = false,
  dismissing = false,
  onPressDetails,
  onAcknowledge,
}: Props) {
  const variant = variantFromStatus(ackStatus, variantProp);
  const isActive = variant === 'active';
  const isHistory = variant === 'history';
  const isExpired = variant === 'expired';
  const urgencyColor = colorForAiUrgency(item.urgency);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 0.3, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, pulseOpacity]);

  useEffect(() => {
    if (!highlighted) return;
    highlightAnim.setValue(0);
    Animated.sequence([
      Animated.timing(highlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(highlightAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
    ]).start();
  }, [highlighted, highlightAnim]);

  useEffect(() => {
    if (!dismissing) return;
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 28, duration: 320, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0.25, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [dismissing, slideAnim, opacityAnim]);

  const highlightBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(59, 130, 246, 0)', 'rgba(59, 130, 246, 0.25)'],
  });

  const cardStyles = [
    styles.card,
    isActive && styles.cardActive,
    isActive && { borderColor: urgencyColor },
    isExpired && styles.cardExpired,
    isHistory && styles.cardHistory,
  ];

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ translateY: slideAnim }],
        backgroundColor: highlightBg,
        borderRadius: theme.radius.sm,
      }}
    >
      <View style={styles.rowWrap}>
        {isActive ? (
          <View style={[styles.priorityBar, { backgroundColor: urgencyColor }]} />
        ) : isExpired ? (
          <View style={[styles.priorityBar, styles.priorityBarMuted]} />
        ) : (
          <View style={[styles.priorityBar, styles.priorityBarGrey]} />
        )}
        <Card style={cardStyles}>
          <View style={styles.topRow}>
            <View style={styles.nameCol}>
              <View style={styles.titleRow}>
                {isActive ? (
                  <Animated.View
                    style={[styles.pulseDot, { backgroundColor: urgencyColor, opacity: pulseOpacity }]}
                  />
                ) : isHistory ? (
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.textMuted} />
                ) : isExpired ? (
                  <Ionicons name="time-outline" size={18} color="#d97706" />
                ) : null}
                <Text style={[styles.ticker, isHistory && styles.textGrey]}>{item.ticker}</Text>
                {isActive ? (
                  <View style={[styles.unackBadge, { borderColor: urgencyColor }]}>
                    <Text style={[styles.unackBadgeText, { color: urgencyColor }]}>
                      {AI_UI.unacknowledgedBadge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.name, isHistory && styles.textGrey]}>{item.name}</Text>
              <Text style={[styles.market, isHistory && styles.textGrey]}>
                {MARKET_LABEL[item.market]}
              </Text>
            </View>
            <View style={styles.judgmentCol}>
              <Text style={[styles.judgmentLabel, isHistory && styles.textGrey]}>{AI_UI.judgment}</Text>
              <Text
                style={[
                  styles.action,
                  { color: isHistory ? theme.colors.textMuted : actionColor(item.suggestedAction) },
                ]}
              >
                {AI_SAFE_ACTION_LABEL[item.suggestedAction]}
              </Text>
            </View>
          </View>

          <View style={styles.statusGrid}>
            <StatusCell
              label={AI_UI.signalStatus}
              value={TRADE_QUEUE_ACK_STATUS_LABEL[ackStatus]}
              valueColor={
                isActive
                  ? urgencyColor
                  : isExpired
                    ? '#d97706'
                    : theme.colors.textMuted
              }
              muted={isHistory}
            />
            <StatusCell
              label={AI_UI.urgency}
              value={AI_URGENCY_LABEL[item.urgency]}
              valueColor={isHistory ? theme.colors.textMuted : urgencyColor}
              muted={isHistory}
            />
            <StatusCell
              label={AI_UI.signalOccurred}
              value={formatSignalTimeJa(item.occurredAt)}
              muted={isHistory}
            />
            <StatusCell
              label={AI_UI.signalDeadline}
              value={formatResponseDeadlineJa(item.responseDeadlineAt)}
              muted={isHistory}
            />
          </View>

          <Text style={[styles.reasonLabel, isHistory && styles.textGrey]}>{AI_UI.reason}</Text>
          <Text style={[styles.rationale, isHistory && styles.textGrey]}>{item.rationaleSummary}</Text>

          <View style={styles.actionRow}>
            {onAcknowledge && isActive && !dismissing ? (
              <Pressable
                onPress={onAcknowledge}
                style={({ pressed }) => [styles.ackBtn, pressed && styles.detailsBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel={AI_UI.acknowledgeSignalAction}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
                <Text style={styles.ackLabel}>{AI_UI.acknowledgeSignalAction}</Text>
              </Pressable>
            ) : isHistory ? (
              <View style={styles.ackDoneRow}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.textMuted} />
                <Text style={styles.ackDone}>{TRADE_QUEUE_ACK_STATUS_LABEL.acknowledged}</Text>
              </View>
            ) : isExpired ? (
              <View style={styles.ackDoneRow}>
                <Ionicons name="time-outline" size={16} color="#d97706" />
                <Text style={styles.expiredLabel}>{TRADE_QUEUE_ACK_STATUS_LABEL.expired}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={onPressDetails}
              style={({ pressed }) => [styles.detailsBtn, pressed && styles.detailsBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`${item.ticker}の詳細`}
            >
              <Text style={[styles.detailsLabel, isHistory && styles.textGrey]}>
                {AI_UI.viewExplanation}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={isHistory ? theme.colors.textMuted : theme.colors.primary}
              />
            </Pressable>
          </View>
        </Card>
      </View>
    </Animated.View>
  );
}

function StatusCell({
  label,
  value,
  valueColor,
  muted,
}: {
  label: string;
  value: string;
  valueColor?: string;
  muted?: boolean;
}) {
  return (
    <View style={[styles.statusCell, muted && styles.statusCellMuted]}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text
        style={[
          styles.statusValue,
          valueColor ? { color: valueColor } : null,
          muted && styles.textGrey,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  priorityBar: {
    width: 4,
    borderTopLeftRadius: theme.radius.md,
    borderBottomLeftRadius: theme.radius.md,
    marginRight: 0,
  },
  priorityBarMuted: {
    backgroundColor: '#d97706',
    opacity: 0.6,
  },
  priorityBarGrey: {
    backgroundColor: theme.colors.border,
  },
  card: {
    flex: 1,
    marginBottom: 0,
    borderWidth: 1,
  },
  cardActive: {
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  cardExpired: {
    opacity: 0.72,
    backgroundColor: 'rgba(217, 119, 6, 0.06)',
  },
  cardHistory: {
    opacity: 0.5,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  nameCol: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  unackBadge: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unackBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  judgmentCol: { alignItems: 'flex-end' },
  ticker: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '700' },
  name: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 2 },
  market: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  judgmentLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  action: { fontSize: theme.fontSize.md, fontWeight: '700', marginTop: 2 },
  textGrey: { color: theme.colors.textMuted },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  statusCell: {
    minWidth: '45%',
    flexGrow: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
  },
  statusCellMuted: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  statusLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  statusValue: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    marginTop: 2,
  },
  reasonLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    marginBottom: 2,
  },
  rationale: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  ackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: theme.spacing.xs,
  },
  ackLabel: { color: theme.colors.success, fontSize: theme.fontSize.sm, fontWeight: '700' },
  ackDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ackDone: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontWeight: '600' },
  expiredLabel: { color: '#d97706', fontSize: theme.fontSize.sm, fontWeight: '600' },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    marginLeft: 'auto',
  },
  detailsBtnPressed: { opacity: 0.7 },
  detailsLabel: { color: theme.colors.primary, fontSize: theme.fontSize.sm, fontWeight: '600' },
});
