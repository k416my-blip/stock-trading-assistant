import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUrgencySignals } from '../../context/UrgencySignalContext';
import {
  buildConciergeTodayProposals,
  type ConciergeProposalKind,
} from '../../services/concierge/conciergeTodayProposalsBuilder';
import { Card } from '../ui/Card';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

const KIND_COLOR: Record<string, string> = {
  hold_continue: theme.colors.primary,
  monitor: theme.colors.warning,
  buy_candidate: theme.colors.success,
  pass: theme.colors.textMuted,
};

const PROPOSAL_LABEL_KEYS: Record<ConciergeProposalKind, string> = {
  hold_continue: 'proposalLabels.holdContinue',
  monitor: 'proposalLabels.monitor',
  buy_candidate: 'proposalLabels.buyCandidate',
  pass: 'proposalLabels.pass',
};

export function ConciergeTodayProposalsPanel() {
  const { t } = useTranslation('concierge');
  const { queueWithAck } = useUrgencySignals();

  const proposals = useMemo(
    () => buildConciergeTodayProposals(queueWithAck, 3),
    [queueWithAck],
  );

  if (proposals.length === 0) {
    return (
      <Card style={styles.card} testID="concierge-today-proposals-empty">
        <Text style={styles.title}>{t('todayProposalsTitle')}</Text>
        <Text style={styles.empty}>{t('todayProposalsEmpty')}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card} testID="concierge-today-proposals">
      <Text style={styles.title}>{t('todayProposalsTitle')}</Text>
      <Text style={styles.subtitle}>{t('todayProposalsSubtitle')}</Text>
      {proposals.map((p) => (
        <View key={p.id} style={styles.row} testID={`concierge-proposal-${p.symbol}`}>
          <View style={styles.rowHead}>
            <Text style={styles.symbol}>
              {p.symbol} {p.nameJa.length <= 24 ? p.nameJa : ''}
            </Text>
            <Text style={[styles.badge, { color: KIND_COLOR[p.kind] ?? theme.colors.text }]}>
              {t(PROPOSAL_LABEL_KEYS[p.kind])}
            </Text>
          </View>
          <SelectableText style={styles.summary} numberOfLines={2}>
            {p.summaryJa}
          </SelectableText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.sm },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  empty: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  symbol: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  badge: { fontSize: theme.fontSize.sm, fontWeight: '700' },
  summary: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
    lineHeight: 18,
  },
});
