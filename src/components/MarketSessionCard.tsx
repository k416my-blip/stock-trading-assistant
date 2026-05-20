import { StyleSheet, Text, View } from 'react-native';
import type { MarketSessionInfo } from '../services/marketSession';
import { theme } from '../theme';

type Props = {
  session: MarketSessionInfo;
  compact?: boolean;
};

function statusColor(status: MarketSessionInfo['status']) {
  if (status === 'morning_session' || status === 'afternoon_session' || status === 'open') {
    return theme.colors.success;
  }
  if (status === 'lunch_break' || status === 'pre_market' || status === 'after_market') {
    return theme.colors.warning;
  }
  if (status === 'closed' || status === 'after_close' || status === 'pre_open') {
    return theme.colors.textMuted;
  }
  return theme.colors.textMuted;
}

export function MarketSessionCard({ session, compact }: Props) {
  const color = statusColor(session.status);

  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <View style={styles.row}>
        <Text style={styles.market}>{session.marketLabel}</Text>
        <View style={[styles.badge, { borderColor: color }]}>
          <Text style={[styles.badgeText, { color }]}>{session.statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.message}>{session.countdownLine}</Text>
      {!compact ? (
        <>
          <Text style={styles.myt}>マレーシア時間（MYT）: {session.mytDisplay}</Text>
          <Text style={styles.tip}>{session.beginnerTip}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  compact: { padding: theme.spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  market: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  badge: { borderWidth: 1, borderRadius: theme.radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontWeight: '700', fontSize: theme.fontSize.sm },
  message: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm, lineHeight: 20 },
  myt: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.xs },
  tip: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm, lineHeight: 18, fontStyle: 'italic' },
});
