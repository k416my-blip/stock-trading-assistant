import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CONCIERGE_PRIORITY_LABELS_JA } from '../../constants/conciergeUx';
import type { ConciergeInfoPriority } from '../../types/conciergeUx';
import { theme } from '../../theme';

type Props = {
  title: string;
  priority: ConciergeInfoPriority;
  defaultCollapsed?: boolean;
  children: ReactNode;
  testID?: string;
};

export function ConciergePrioritySection({
  title,
  priority,
  defaultCollapsed = false,
  children,
  testID,
}: Props) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const canCollapse = priority === 'medium' || priority === 'low';

  return (
    <View style={styles.wrap} testID={testID}>
      <Pressable
        onPress={() => (canCollapse ? setExpanded((v) => !v) : undefined)}
        accessibilityRole="button"
        accessibilityLabel={`${title} ${expanded ? '折りたたむ' : '展開'}`}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {title}
            {canCollapse ? (expanded ? ' ▼' : ' ▶') : ''}
          </Text>
          <Text style={[styles.badge, styles[`badge_${priority}`]]}>
            {CONCIERGE_PRIORITY_LABELS_JA[priority]}
          </Text>
        </View>
      </Pressable>
      {expanded || !canCollapse ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    flex: 1,
  },
  badge: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  badge_critical: { backgroundColor: 'rgba(239,68,68,0.15)', color: theme.colors.danger },
  badge_high: { backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316' },
  badge_medium: { backgroundColor: 'rgba(245,158,11,0.12)', color: theme.colors.warning },
  badge_low: { backgroundColor: 'rgba(148,163,184,0.15)', color: theme.colors.textMuted },
});
