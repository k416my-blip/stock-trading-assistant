import { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  size?: 'md' | 'lg';
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  size = 'md',
  accessibilityLabel,
}: Props) {
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
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.baseLg,
        variant === 'primary' ? styles.primary : styles.ghost,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.label,
          size === 'lg' && styles.labelLg,
          variant === 'ghost' && styles.ghostLabel,
        ]}
      >
        {label}
      </Text>
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
  baseLg: {
    paddingVertical: theme.spacing.md + 6,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
  },
  primary: { backgroundColor: theme.colors.primary },
  ghost: { borderWidth: 1, borderColor: theme.colors.border },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  label: { color: '#fff', fontWeight: '600', fontSize: theme.fontSize.md },
  labelLg: { fontSize: theme.fontSize.lg, fontWeight: '800' },
  ghostLabel: { color: theme.colors.text },
});
