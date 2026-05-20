import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colorForUrgencyLevel } from '../constants/urgencyColors';
import {
  formatResponseDeadlineJa,
  formatSignalTimeJa,
} from '../services/tradeQueueStatusResolver';
import {
  TRADE_QUEUE_ACK_STATUS_LABEL,
  URGENCY_SIGNAL_LEVEL_LABEL,
  type UrgencySignal,
} from '../types/urgencySignal';
import { AI_UI } from '../constants/aiStrategyBriefing';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  signal: UrgencySignal;
  highlighted?: boolean;
  onAcknowledge: () => void;
};

export function AiSystemSignalCard({ signal, highlighted = false, onAcknowledge }: Props) {
  const urgencyColor = colorForUrgencyLevel(signal.level);
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const highlightAnim = useRef(new Animated.Value(highlighted ? 1 : 0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 0.3, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseOpacity]);

  useEffect(() => {
    if (!highlighted) return;
    highlightAnim.setValue(0);
    Animated.sequence([
      Animated.timing(highlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(highlightAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
    ]).start();
  }, [highlighted, highlightAnim]);

  const highlightBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(59, 130, 246, 0)', 'rgba(59, 130, 246, 0.22)'],
  });

  return (
    <Animated.View style={{ backgroundColor: highlightBg, borderRadius: theme.radius.sm }}>
      <View style={styles.rowWrap}>
        <View style={[styles.priorityBar, { backgroundColor: urgencyColor }]} />
        <Card
          style={[
            styles.card,
            { borderColor: urgencyColor, borderWidth: 2 },
            styles.cardElevated,
          ]}
        >
          <View style={styles.headerRow}>
            <Animated.View
              style={[styles.pulseDot, { backgroundColor: urgencyColor, opacity: pulseOpacity }]}
            />
            <Text style={styles.systemLabel}>システムシグナル</Text>
            <View style={[styles.unackBadge, { borderColor: urgencyColor }]}>
              <Text style={[styles.unackBadgeText, { color: urgencyColor }]}>
                {AI_UI.unacknowledgedBadge}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{signal.actionLabel}</Text>
          <Text style={styles.reason}>{signal.reason}</Text>

          <View style={styles.statusGrid}>
            <StatusCell
              label={AI_UI.signalStatus}
              value={TRADE_QUEUE_ACK_STATUS_LABEL.unacknowledged}
            />
            <StatusCell
              label={AI_UI.urgency}
              value={URGENCY_SIGNAL_LEVEL_LABEL[signal.level]}
              valueColor={urgencyColor}
            />
            <StatusCell label={AI_UI.signalOccurred} value={formatSignalTimeJa(signal.occurredAt)} />
            <StatusCell
              label={AI_UI.signalDeadline}
              value={formatResponseDeadlineJa(signal.responseDeadlineAt)}
            />
          </View>

          <Pressable
            onPress={onAcknowledge}
            style={({ pressed }) => [styles.ackBtn, pressed && styles.ackPressed]}
            accessibilityRole="button"
            accessibilityLabel={AI_UI.acknowledgeSignalAction}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
            <Text style={styles.ackLabel}>{AI_UI.acknowledgeSignalAction}</Text>
          </Pressable>
        </Card>
      </View>
    </Animated.View>
  );
}

function StatusCell({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.statusCell}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: { flexDirection: 'row', marginBottom: theme.spacing.sm },
  priorityBar: {
    width: 4,
    borderTopLeftRadius: theme.radius.md,
    borderBottomLeftRadius: theme.radius.md,
  },
  card: { flex: 1, marginBottom: 0 },
  cardElevated: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
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
    marginLeft: 'auto',
  },
  unackBadgeText: { fontSize: 10, fontWeight: '800' },
  systemLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  title: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '700' },
  reason: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: theme.spacing.sm,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  statusCell: {
    minWidth: '45%',
    flexGrow: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
  },
  statusLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  statusValue: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    marginTop: 2,
  },
  ackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
  },
  ackPressed: { opacity: 0.75 },
  ackLabel: { color: theme.colors.success, fontSize: theme.fontSize.sm, fontWeight: '700' },
});
