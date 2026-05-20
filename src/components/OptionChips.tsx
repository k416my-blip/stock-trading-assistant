import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

type Props<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
};

export function OptionChips<T extends string>({ label, options, selected, onSelect }: Props<T>) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={[styles.chip, selected === opt.value && styles.chipActive]}
          >
            <Text style={[styles.text, selected === opt.value && styles.textActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  label: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  text: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontWeight: '600' },
  textActive: { color: '#fff' },
});
