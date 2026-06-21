import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CURRENCY_SYMBOL } from '../../constants/rakutenTrade';
import { useApp } from '../../context/AppContext';
import type { RootStackParamList } from '../../navigation/types';
import { findImportCandidate } from '../../services/rakutenImport/rakutenImportStagingStorage';
import {
  canSaveImportCandidate,
  confidenceLabelLocalized,
  confidenceTier,
} from '../../services/rakutenImport/rakutenImportConfidence';
import type { BrokerTransactionCandidate, ImportFieldKey } from '../../types/rakutenImport';
import { theme } from '../../theme';

function formatSummary(
  c: BrokerTransactionCandidate,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (c.type === 'deposit' || c.type === 'withdrawal') {
    return `RM ${c.totalMYR?.toLocaleString('ja-JP') ?? '—'}`;
  }
  if (c.type === 'dividend') {
    return `${c.symbol ?? t('rakutenImport:card.unknownSymbol')} · RM ${c.totalMYR?.toLocaleString('ja-JP') ?? '—'}`;
  }
  if (c.type === 'fee') {
    const sym = c.symbol ? `${c.symbol} · ` : '';
    return `${sym}RM ${c.fee?.toLocaleString('ja-JP') ?? '—'}`;
  }
  const sym = c.companyName ?? c.symbol ?? '—';
  const px =
    c.price != null ? `${CURRENCY_SYMBOL[c.currency]}${c.price}` : t('rakutenImport:card.priceMissing');
  return `${sym} · ${c.quantity ?? '—'}${t('rakutenImport:card.sharesUnit')} @ ${px}`;
}

type Props = {
  candidateId: string;
  blocked?: boolean;
};

export function ConciergeImportActionCard({ candidateId, blocked }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rejectRakutenImportCandidate, readOnlyBlockedMessage } = useApp();
  const { t } = useTranslation('rakutenImport');
  const [candidate, setCandidate] = useState<BrokerTransactionCandidate | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void findImportCandidate(candidateId).then((found) => {
      if (!cancelled) setCandidate(found?.candidate ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  const saveBlocked =
    blocked ||
    !candidate ||
    !canSaveImportCandidate(candidate) ||
    Boolean(readOnlyBlockedMessage);

  const tier = candidate ? confidenceTier(candidate.overallConfidence) : 'blocked';
  const confidenceStyle =
    tier === 'high'
      ? styles.confidenceHigh
      : tier === 'needs_confirmation'
        ? styles.confidenceWarn
        : styles.confidenceBlocked;

  const onRecord = useCallback(() => {
    navigation.navigate('RakutenImportConfirm', { candidateId });
  }, [candidateId, navigation]);

  const onEdit = useCallback(() => {
    navigation.navigate('RakutenImportManualEntry');
  }, [navigation]);

  const onCancel = useCallback(async () => {
    setBusy(true);
    try {
      await rejectRakutenImportCandidate(candidateId);
    } finally {
      setBusy(false);
    }
  }, [candidateId, rejectRakutenImportCandidate]);

  if (!candidate) {
    return (
      <Card style={styles.card}>
        <Text style={styles.muted}>{t('card.loading')}</Text>
      </Card>
    );
  }

  const typeLabel = t(`type.${candidate.type}`);

  return (
    <Card style={styles.card} testID="concierge-import-action-card">
      <Text style={styles.badge}>{t('card.recordBadge', { type: typeLabel })}</Text>
      <Text style={styles.summary}>{formatSummary(candidate, t)}</Text>
      <Text style={styles.meta}>
        {t('card.dateLabel', { date: candidate.executedAt?.slice(0, 10) ?? '—' })}
      </Text>
      <Text style={[styles.confidence, confidenceStyle]}>
        {t('card.confidence', {
          label: confidenceLabelLocalized(candidate.overallConfidence),
          pct: Math.round(candidate.overallConfidence * 100),
        })}
      </Text>

      {candidate.lowConfidenceFields.length > 0 ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>{t('card.fieldsToReview')}</Text>
          {candidate.lowConfidenceFields.map((field) => (
            <Text key={field} style={styles.warnLine}>
              ⚠ {t(`field.${field as ImportFieldKey}`)}
            </Text>
          ))}
        </View>
      ) : null}

      {candidate.duplicateHint ? (
        <Text style={styles.dupHint}>
          類似記録の可能性（{candidate.duplicateHint.matchedOn.join(' · ')}）
        </Text>
      ) : null}

      {saveBlocked ? (
        <Text style={styles.blockedNote}>{t('card.blockedNote')}</Text>
      ) : null}

      <View style={styles.actions}>
        <Button label={t('card.record')} onPress={onRecord} disabled={busy || saveBlocked} />
        <Button label={t('card.edit')} variant="ghost" onPress={onEdit} disabled={busy} />
        <Button
          label={t('card.cancel')}
          variant="ghost"
          onPress={() => void onCancel()}
          disabled={busy}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.sm,
    borderColor: theme.colors.primary,
  },
  badge: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  summary: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  confidence: {
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
    fontWeight: '600',
  },
  confidenceHigh: { color: theme.colors.success },
  confidenceWarn: { color: theme.colors.warning },
  confidenceBlocked: { color: theme.colors.danger },
  warnBox: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
  },
  warnTitle: {
    color: theme.colors.warning,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
    marginBottom: 4,
  },
  warnLine: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  dupHint: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.xs,
  },
  blockedNote: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  actions: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  muted: {
    color: theme.colors.textMuted,
  },
});
