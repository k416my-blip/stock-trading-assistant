import { useMemo, useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUrgencySignals } from '../../context/UrgencySignalContext';
import {
  buildConciergeTodayProposals,
  type ConciergeProposalKind,
} from '../../services/concierge/conciergeTodayProposalsBuilder';
import { Card } from '../ui/Card';
import { CompactSafetyNotice } from '../CompactSafetyNotice';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';
import {
  isForceEmptyTodayProposals,
  persistForceEmptyTodayProposals,
} from '../../services/e2eConciergeUiSeed';

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
  const [forceEmptyE2e, setForceEmptyE2e] = useState(() => isForceEmptyTodayProposals());

  useEffect(() => {
    if (isForceEmptyTodayProposals()) setForceEmptyE2e(true);
  }, []);

  const applyE2eEmptyProposals = useCallback(() => {
    setForceEmptyE2e(true);
    void persistForceEmptyTodayProposals();
  }, []);

  const proposals = useMemo(
    () => (forceEmptyE2e ? [] : buildConciergeTodayProposals(queueWithAck, 3)),
    [queueWithAck, forceEmptyE2e],
  );

  if (proposals.length === 0) {
    return (
      <Card
        style={styles.card}
        testID="concierge-today-proposals-empty"
        accessibilityLabel="concierge-today-proposals-empty"
        accessible
      >
        <Pressable
          testID="concierge-e2e-force-empty-proposals"
          accessibilityLabel="concierge-e2e-force-empty-proposals"
          accessible
          importantForAccessibility="yes"
          onPress={applyE2eEmptyProposals}
          style={styles.e2eProbe}
        />
        <Text style={styles.title}>{t('todayProposalsTitle')}</Text>
        <CompactSafetyNotice />
        <Text style={styles.empty}>{t('todayProposalsEmpty')}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card} testID="concierge-today-proposals">
      <Pressable
        testID="concierge-e2e-force-empty-proposals"
        accessibilityLabel="concierge-e2e-force-empty-proposals"
        accessible
        importantForAccessibility="yes"
        onPress={applyE2eEmptyProposals}
        style={styles.e2eProbe}
      />
      <Text style={styles.title}>{t('todayProposalsTitle')}</Text>
      <CompactSafetyNotice />
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
  e2eProbe: { width: 44, height: 44, opacity: 0.02 },
});
