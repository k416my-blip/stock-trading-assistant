import { forwardRef, type ReactNode, type Ref } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollView as ScrollViewType } from 'react-native';
import { theme } from '../../theme';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export const Screen = forwardRef(function Screen(
  { title, subtitle, children }: Props,
  ref: Ref<ScrollViewType>,
) {
  return (
    <ScrollView
      ref={ref}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  title: { fontSize: theme.fontSize.title, fontWeight: '700', color: theme.colors.text },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  body: { gap: theme.spacing.md },
});
