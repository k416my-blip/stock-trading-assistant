import { StyleSheet, Text, View } from 'react-native';
import type { ConciergeContextMemoryItem } from '../../types/conciergeUx';
import { ConciergePrioritySection } from './ConciergePrioritySection';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  items: ConciergeContextMemoryItem[];
  defaultCollapsed?: boolean;
};

export function ConciergeContextMemoryPanel({ items, defaultCollapsed = true }: Props) {
  if (items.length === 0) return null;
  return (
    <ConciergePrioritySection
      title="なぜ今この通知が来たか"
      priority="medium"
      defaultCollapsed={defaultCollapsed}
      testID="concierge-ux-context-memory"
    >
      {items.map((item, i) => (
        <View key={`${item.at}-${i}`} style={styles.item}>
          <SelectableText style={styles.title}>{item.titleJa}</SelectableText>
          <SelectableText style={styles.why}>{item.whyJa}</SelectableText>
        </View>
      ))}
    </ConciergePrioritySection>
  );
}

const styles = StyleSheet.create({
  item: { marginBottom: theme.spacing.xs },
  title: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '600' },
  why: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: 2 },
});
