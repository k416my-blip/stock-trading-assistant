import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GovernanceAuditEntry } from '../types/governance';
import { GOVERNANCE_REASON_LABEL } from '../constants/governance';
import { loadGovernanceAuditLog } from '../services/governanceAuditService';
import { Card } from './ui/Card';
import { theme } from '../theme';

const HEALTH_DOT = {
  green: theme.colors.success,
  yellow: theme.colors.warning,
  red: theme.colors.danger,
};

export function GovernanceAuditLogPanel() {
  const [log, setLog] = useState<GovernanceAuditEntry[]>([]);

  useEffect(() => {
    void loadGovernanceAuditLog().then(setLog);
  }, []);

  if (log.length === 0) {
    return (
      <Card>
        <Text style={styles.empty}>監査ログはまだありません。ガバナンス実行後に記録されます。</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>監査ログ</Text>
      {log.slice(0, 8).map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <View style={styles.row}>
            <View
              style={[styles.dot, { backgroundColor: HEALTH_DOT[entry.healthStatus] }]}
            />
            <Text style={styles.time}>
              {new Date(entry.timestamp).toLocaleString('ja-JP')}
            </Text>
          </View>
          <Text style={styles.muted}>
            {entry.symbols.join(', ')} · {entry.regimeId} · {entry.activeAllocator}
          </Text>
          <Text style={styles.muted}>
            {entry.reasonCodes.map((c) => GOVERNANCE_REASON_LABEL[c] ?? c).join(' · ')}
          </Text>
          {entry.warnings.length > 0 ? (
            <Text style={styles.warn} numberOfLines={2}>
              {entry.warnings[0]}
            </Text>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  empty: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  entry: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  time: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '500' },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: 4 },
});
