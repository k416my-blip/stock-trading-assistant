import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Market } from '../types';
import { marketTabLabel } from '../i18n/ja';
import { theme } from '../theme';

const MARKETS: Market[] = ['bursa', 'us', 'hk'];

type Props = {
  selected: Market;
  onSelect: (market: Market) => void;
};

export function MarketPicker({ selected, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {MARKETS.map((m) => (
        <Pressable
          key={m}
          onPress={() => onSelect(m)}
          style={[styles.chip, selected === m && styles.chipActive]}
          testID={`market-picker-${m}`}
          accessibilityLabel={`market-picker-${m}`}
        >
          <Text style={[styles.text, selected === m && styles.textActive]}>{marketTabLabel[m]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  text: { color: theme.colors.textMuted, fontWeight: '600', fontSize: theme.fontSize.sm },
  textActive: { color: '#fff' },
});
