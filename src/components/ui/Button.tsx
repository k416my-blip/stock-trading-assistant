import { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled = false }: Props) {
  const handlePress = useCallback(() => {
    if (disabled) return;
    try {
      onPress();
    } catch (error) {
      console.error('[BUTTON PRESS ERROR]', { label, variant, error });
      throw error;
    }
  }, [disabled, label, onPress, variant]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.ghost,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
  primary: { backgroundColor: theme.colors.primary },
  ghost: { borderWidth: 1, borderColor: theme.colors.border },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  label: { color: '#fff', fontWeight: '600', fontSize: theme.fontSize.md },
  ghostLabel: { color: theme.colors.text },
});
