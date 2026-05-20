import { StyleSheet, Text, View } from 'react-native';
import { Card } from './ui/Card';
import type { ExecutionReconciliationReport } from '../types/execution';
import { theme } from '../theme';

export function ExecutionReconciliationPanel({ report }: { report: ExecutionReconciliationReport }) {
  return (
    <Card>
      <Text style={styles.title}>執行照合</Text>
      <Text style={styles.meta}>
        確定済みジャーナル: {report.journalConfirmedCount}件 · 不一致: {report.mismatchCount}件
      </Text>
      {report.mismatchCount === 0 ? (
        <Text style={styles.ok}>ジャーナルと保有は一致しています（未確定注文は除く）。</Text>
      ) : (
        report.mismatches.map((m) => (
          <View key={m.id} style={styles.row}>
            <Text
              style={[
                styles.badge,
                m.severity === 'critical' ? styles.badgeCritical : styles.badgeWarn,
              ]}
            >
              {m.severity === 'critical' ? '要確認' : '注意'}
            </Text>
            <Text style={styles.msg}>{m.messageJa}</Text>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '700', marginBottom: theme.spacing.xs },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm },
  ok: { color: theme.colors.success, fontSize: theme.fontSize.sm },
  row: { marginBottom: theme.spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    marginBottom: 4,
    overflow: 'hidden',
  },
  badgeCritical: { backgroundColor: 'rgba(239,68,68,0.15)', color: theme.colors.danger },
  badgeWarn: { backgroundColor: 'rgba(245,158,11,0.15)', color: theme.colors.warning },
  msg: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 18 },
});
