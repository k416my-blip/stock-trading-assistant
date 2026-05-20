import { memo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

type Props = {
  title: string;
  subtitle?: string;
  empty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
};

function ChartShellInner({ title, subtitle, empty, emptyMessage, children }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {empty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{emptyMessage ?? 'データ不足'}</Text>
        </View>
      ) : (
        children
      )}
    </View>
  );
}

export const ChartShell = memo(ChartShellInner);

const styles = StyleSheet.create({
  wrap: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  empty: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
  },
  emptyText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
});
