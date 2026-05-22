import { StyleSheet, Text, View } from 'react-native';
import { PROACTIVE_CATEGORY_LABEL, PROACTIVE_UI } from '../../constants/proactiveConcierge';
import { formatChatTimestampLocal } from '../../utils/chatTimestamp';
import { colorForUrgencyLevel } from '../../constants/urgencyColors';
import type { ProactiveSuggestion } from '../../types/proactiveSuggestion';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { theme } from '../../theme';

type Props = {
  suggestion: ProactiveSuggestion;
  onAcknowledge: () => void;
  onSeeLater: () => void;
  onDetail: () => void;
  compact?: boolean;
};

function priorityToLevel(p: ProactiveSuggestion['priority']): 'critical' | 'high' | 'medium' | 'low' {
  if (p === 'critical') return 'critical';
  if (p === 'high') return 'high';
  if (p === 'medium') return 'medium';
  return 'low';
}

function priorityLabelJa(p: ProactiveSuggestion['priority']): string {
  if (p === 'critical') return '緊急';
  if (p === 'high') return '重要';
  if (p === 'medium') return '中';
  return '低';
}

export function ProactiveSuggestionCard({
  suggestion,
  onAcknowledge,
  onSeeLater,
  onDetail,
  compact = false,
}: Props) {
  const color = colorForUrgencyLevel(priorityToLevel(suggestion.priority));
  const categoryLabel = PROACTIVE_CATEGORY_LABEL[suggestion.category] ?? suggestion.category;

  return (
    <Card
      style={[
        styles.card,
        (suggestion.priority === 'critical' || suggestion.priority === 'high') &&
          styles.highCard,
        { borderLeftColor: color },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.priority, { color }]}>
          {priorityLabelJa(suggestion.priority)}
        </Text>
        <Text style={styles.category}>{categoryLabel}</Text>
        <Text style={styles.timestamp}>
          {formatChatTimestampLocal(suggestion.createdAt, { compact: true })}
        </Text>
      </View>
      <Text style={styles.title}>{suggestion.titleJa}</Text>
      {suggestion.notificationWhyJa ? (
        <Text style={styles.whyNotify}>{suggestion.notificationWhyJa}</Text>
      ) : null}
      {suggestion.reasonsJa && suggestion.reasonsJa.length > 0 ? (
        <Text style={styles.reasons}>{suggestion.reasonsJa.join(' · ')}</Text>
      ) : null}
      {!compact ? <Text style={styles.body}>{suggestion.bodyJa}</Text> : null}
      {!compact ? <Text style={styles.hint}>{suggestion.actionHintJa}</Text> : null}
      <Text style={styles.safety}>{PROACTIVE_UI.safetyFooter}</Text>
      <View style={styles.actions}>
        <Button label={PROACTIVE_UI.acknowledge} onPress={onAcknowledge} variant="ghost" />
        <Button label={PROACTIVE_UI.viewDetail} onPress={onDetail} />
        <Button label={PROACTIVE_UI.seeLater} onPress={onSeeLater} variant="ghost" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.sm,
    borderLeftWidth: 4,
  },
  highCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  priority: { fontWeight: '800', fontSize: theme.fontSize.sm },
  category: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  timestamp: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginLeft: 'auto',
  },
  title: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    marginBottom: 4,
  },
  whyNotify: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    marginBottom: 6,
    lineHeight: 18,
  },
  reasons: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginBottom: 4,
  },
  body: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20 },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 6, lineHeight: 18 },
  safety: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  actions: { marginTop: theme.spacing.sm, gap: theme.spacing.xs },
});
