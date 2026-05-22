import { StyleSheet, Text, View } from 'react-native';
import type { ConciergeMarketRadarItem } from '../../types/conciergeUx';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  items: ConciergeMarketRadarItem[];
};

const KIND_LABEL: Record<ConciergeMarketRadarItem['kind'], string> = {
  sharp_drop: '急落',
  volume_surge: '出来高急増',
  sentiment_anomaly: 'センチメント異常',
  vix_anomaly: 'VIX異常',
};

export function ConciergeMarketRadar({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <View style={styles.wrap} testID="concierge-ux-market-radar">
      <Text style={styles.title}>Market Radar</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.kind}>{KIND_LABEL[item.kind]}</Text>
          <SelectableText style={styles.label}>{item.labelJa}</SelectableText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
  },
  title: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  kind: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    minWidth: 88,
  },
  label: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, flex: 1, lineHeight: 20 },
});
