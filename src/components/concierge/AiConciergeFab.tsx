import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AI_CONCIERGE_UI } from '../../constants/aiConcierge';
import { theme } from '../../theme';

type Props = {
  onPress: () => void;
};

/** Floating AI access — visible above tab bar, does not block primary content. */
export function AiConciergeFab({ onPress }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8) + 64;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={AI_CONCIERGE_UI.fabLabel}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
        <Text style={styles.fabText}>AI</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: theme.spacing.md,
    zIndex: 1000,
    elevation: 8,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  fabPressed: { opacity: 0.88 },
  fabText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
});
