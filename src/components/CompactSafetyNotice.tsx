import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  SHORT_INTERNAL_TESTING_SAFETY_NOTICE_JA,
} from '../constants/disclaimers';
import { theme } from '../theme';

type Props = {
  /** Override copy; default is the short internal-testing safety line. */
  text?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Compact non-blocking safety line for primary surfaces (Home / Concierge / Manual order).
 * Does not change investment logic — display only.
 */
export function CompactSafetyNotice({
  text = SHORT_INTERNAL_TESTING_SAFETY_NOTICE_JA,
  style,
  testID = 'compact-safety-notice',
}: Props) {
  return (
    <View style={[styles.wrap, style]} testID={testID} accessibilityRole="text">
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  text: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
});
