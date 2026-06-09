import { forwardRef, type ReactNode, type Ref } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollView as ScrollViewType,
  type ViewProps,
} from 'react-native';
import { theme } from '../../theme';

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  pointerEvents?: ViewProps['pointerEvents'];
  /** false のとき子の FlatList 等がスクロールを担当する */
  scrollable?: boolean;
};

export const Screen = forwardRef(function Screen(
  { title, subtitle, children, pointerEvents, scrollable = true }: Props,
  ref: Ref<ScrollViewType>,
) {
  if (!scrollable) {
    return (
      <View style={styles.scroll} pointerEvents={pointerEvents}>
        <View style={styles.contentStatic}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.bodyFlex}>{children}</View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      ref={ref}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      pointerEvents={pointerEvents}
      showsVerticalScrollIndicator={false}
    >
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  contentStatic: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: { fontSize: theme.fontSize.title, fontWeight: '700', color: theme.colors.text },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  body: { gap: theme.spacing.md },
  bodyFlex: { flex: 1, minHeight: 0 },
});
