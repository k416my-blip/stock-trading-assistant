import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme';

type Props = {
  message: string | null;
  onDismiss: () => void;
  /** warning: 一部失敗など */
  tone?: 'default' | 'warning' | 'success';
};

export function ToastBanner({ message, onDismiss, tone = 'default' }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!message) return;

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 8, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) onDismiss();
      });
    }, 2400);

    return () => clearTimeout(timer);
  }, [message, onDismiss, opacity, translateY]);

  if (!message) return null;

  const wrapStyle =
    tone === 'warning'
      ? styles.wrapWarning
      : tone === 'success'
        ? styles.wrapSuccess
        : styles.wrap;

  const textStyle =
    tone === 'warning'
      ? styles.textWarning
      : tone === 'success'
        ? styles.textSuccess
        : styles.text;

  return (
    <Animated.View
      style={[wrapStyle, { opacity, transform: [{ translateY }] }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={textStyle}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  text: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  wrapWarning: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.lg,
    backgroundColor: theme.colors.warning + '22',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    zIndex: 100,
    elevation: 8,
  },
  textWarning: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  wrapSuccess: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.lg,
    backgroundColor: '#22c55e22',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#16a34a',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    zIndex: 100,
    elevation: 8,
  },
  textSuccess: {
    color: '#16a34a',
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
});
