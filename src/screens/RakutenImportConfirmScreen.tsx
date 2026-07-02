import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { CURRENCY_SYMBOL } from '../constants/rakutenTrade';
import { useApp } from '../context/AppContext';
import { previewBuyingPowerAfterImport } from '../services/rakutenImport/commitImportCandidate';
import { findImportCandidate } from '../services/rakutenImport/rakutenImportStagingStorage';
import {
  canSaveImportCandidate,
  confidenceLabelJa,
  confidenceTier,
} from '../services/rakutenImport/rakutenImportConfidence';
import type { ImportFieldKey } from '../types/rakutenImport';
import type { RootStackParamList } from '../navigation/types';
import type { BrokerTransactionCandidate } from '../types/rakutenImport';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';

const FIELD_LABEL_JA: Record<ImportFieldKey, string> = {
  executedAt: '日付',
  symbol: '銘柄',
  companyName: '会社名',
  type: '種別',
  quantity: '数量',
  price: '単価',
  fee: '手数料',
  total: '金額',
  currency: '通貨',
  referenceNumber: '参照番号',
};

function typeLabel(type: BrokerTransactionCandidate['type']): string {
  switch (type) {
    case 'deposit':
      return '入金';
    case 'withdrawal':
      return '出金';
    case 'buy':
      return '買付';
    case 'sell':
      return '売却';
    case 'dividend':
      return '配当';
    case 'fee':
      return '手数料';
    default:
      return type;
  }
}

function formatSummary(c: BrokerTransactionCandidate): string {
  if (c.type === 'deposit') {
    return `RM ${c.totalMYR?.toLocaleString('ja-JP')} の入金`;
  }
  if (c.type === 'withdrawal') {
    return `RM ${c.totalMYR?.toLocaleString('ja-JP')} の出金`;
  }
  if (c.type === 'dividend') {
    const name = c.companyName ?? c.symbol ?? '—';
    return `${name} · RM ${c.totalMYR?.toLocaleString('ja-JP') ?? '—'} の配当`;
  }
  if (c.type === 'fee') {
    const sym = c.symbol ? `${c.symbol} · ` : '';
    return `${sym}RM ${c.fee?.toLocaleString('ja-JP') ?? '—'} の手数料`;
  }
  const sym = c.symbol ?? '—';
  return `${sym} · ${c.quantity}株 @ ${CURRENCY_SYMBOL[c.currency]}${c.price}`;
}

function sourceLabel(source: BrokerTransactionCandidate['source']): string {
  if (source === 'natural_language') return '自然文入力';
  if (source === 'manual_form') return '手動入力';
  if (source === 'ocr_screenshot') return 'スクショ読み取り';
  return source;
}

export function RakutenImportConfirmScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'RakutenImportConfirm'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    state,
    commitRakutenImportCandidate,
    rejectRakutenImportCandidate,
    readOnlyBlockedMessage,
  } = useApp();
  const { t } = useTranslation('rakutenImport');

  const [candidate, setCandidate] = useState<BrokerTransactionCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const found = await findImportCandidate(params.candidateId, { activeOnly: true });
    setCandidate(found?.candidate ?? null);
    setLoading(false);
  }, [params.candidateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveAllowed = candidate ? canSaveImportCandidate(candidate) : false;
  const duplicateBlocked = candidate?.status === 'duplicate_blocked';
  const duplicateSoftWarning =
    Boolean(candidate?.duplicateHint) &&
    !duplicateBlocked &&
    candidate?.duplicateHint?.matchedOn.includes('date') &&
    candidate?.duplicateHint?.matchedOn.includes('amount') &&
    !candidate?.duplicateHint?.matchedOn.includes('referenceNumber');

  const duplicateTitle = duplicateBlocked
    ? t('confirm.duplicateExactTitle')
    : duplicateSoftWarning
      ? t('confirm.duplicateSoftTitle')
      : t('confirm.duplicateSimilarTitle');

  const preview =
    candidate && saveAllowed && !duplicateBlocked
      ? previewBuyingPowerAfterImport(state, candidate)
      : null;

  const onCommit = async () => {
    if (!candidate) return;
    setBusy(true);
    try {
      const result = await commitRakutenImportCandidate(candidate.id);
      if (!result.ok) {
        Alert.alert(t('alerts.saveBlockedTitle'), result.error);
        await load();
        return;
      }
      Alert.alert(t('alerts.savedTitle'), t('alerts.savedMessage'), [
        {
          text: t('alerts.viewPortfolio'),
          onPress: () => navigation.navigate('MainTabs', { screen: 'Portfolio' }),
        },
        { text: t('alerts.ok'), onPress: () => navigation.navigate('RakutenImportManualEntry') },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    if (!candidate) return;
    setBusy(true);
    try {
      await rejectRakutenImportCandidate(candidate.id);
      navigation.goBack();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Screen title={t('confirm.title')} subtitle={t('confirm.subtitleLoading')}>
        <Text style={styles.muted}>候補を読み込んでいます…</Text>
      </Screen>
    );
  }

  if (!candidate) {
    return (
      <Screen title={t('confirm.title')} subtitle={t('confirm.subtitleNotFound')}>
        <Text style={styles.muted}>ステージングの有効期限が切れたか、既に処理済みです。</Text>
        <Button label={t('confirm.backToEntry')} onPress={() => navigation.navigate('RakutenImportManualEntry')} />
      </Screen>
    );
  }

  const tier = confidenceTier(candidate.overallConfidence);
  const confidenceStyle =
    tier === 'high'
      ? styles.confidenceHigh
      : tier === 'needs_confirmation'
        ? styles.confidenceWarn
        : styles.confidenceBlocked;

  return (
    <Screen title={t('confirm.title')} subtitle={t('confirm.subtitleReview')}>
      <Card testID="rakuten-import-confirm-card">
        <Text style={styles.typeBadge}>{t(`type.${candidate.type}`)}</Text>
        <Text style={styles.summary}>{formatSummary(candidate)}</Text>
        <Text style={styles.meta}>
          日付: {candidate.executedAt?.slice(0, 10) ?? '—'}
        </Text>
        {candidate.referenceNumber ? (
          <Text style={styles.meta}>参照番号: {candidate.referenceNumber}</Text>
        ) : null}
        {candidate.userNote ? <Text style={styles.meta}>メモ: {candidate.userNote}</Text> : null}
        <Text style={styles.meta}>入力経路: {t(`source.${candidate.source}`)}</Text>
        <Text style={[styles.confidence, confidenceStyle]}>
          {t('card.confidence', {
            label: confidenceLabelJa(candidate.overallConfidence),
            pct: Math.round(candidate.overallConfidence * 100),
          })}
        </Text>
      </Card>

      {candidate.lowConfidenceFields.length > 0 ? (
        <Card style={styles.warnCard}>
          <Text style={styles.warnTitle}>{t('card.fieldsToReview')}</Text>
          {candidate.lowConfidenceFields.map((field) => (
            <Text key={field} style={styles.warnBody}>
              ⚠ {t(`field.${field}`)}
            </Text>
          ))}
        </Card>
      ) : null}

      {candidate.duplicateHint ? (
        <Card style={styles.warnCard}>
          <Text style={styles.warnTitle}>{duplicateTitle}</Text>
          <Text style={styles.warnBody}>
            {t('confirm.duplicateMatch', {
              fields: candidate.duplicateHint.matchedOn.join(' · '),
              score: Math.round(candidate.duplicateHint.score * 100),
            })}
          </Text>
        </Card>
      ) : null}

      {!saveAllowed && !duplicateBlocked ? (
        <Card style={styles.warnCard}>
          <Text style={styles.warnTitle}>保存不可</Text>
          <Text style={styles.warnBody}>
            信頼度が低いか必須項目が不足しています。修正するから内容を入力してください。
          </Text>
        </Card>
      ) : null}

      {preview ? (
        <Card>
          <Text style={styles.previewTitle}>保存後の買付余力（概算）</Text>
          <Text style={styles.previewValues}>
            RM {preview.beforeMYR.toLocaleString('ja-JP')} → RM{' '}
            {preview.afterMYR.toLocaleString('ja-JP')}
          </Text>
          <Text style={styles.previewNote}>{preview.noteJa}</Text>
        </Card>
      ) : null}

      {readOnlyBlockedMessage ? <Text style={styles.readOnly}>{readOnlyBlockedMessage}</Text> : null}

      <View style={styles.actions}>
        <Button
          label={busy ? t('confirm.saving') : t('confirm.save')}
          onPress={() => void onCommit()}
          disabled={busy || duplicateBlocked || !saveAllowed || !!readOnlyBlockedMessage}
        />
        <Button
          label={t('confirm.edit')}
          variant="ghost"
          onPress={() => navigation.navigate('RakutenImportManualEntry')}
          disabled={busy}
        />
        <Button label={t('confirm.cancel')} variant="ghost" onPress={() => void onReject()} disabled={busy} />
      </View>

      <Text style={styles.footerNote}>
        自動保存は行いません。Rakuten Trade で成立した結果のみ記録してください。
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: theme.colors.textMuted },
  typeBadge: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  summary: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: 2,
  },
  confidence: {
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  confidenceHigh: { color: theme.colors.success },
  confidenceWarn: { color: theme.colors.warning },
  confidenceBlocked: { color: theme.colors.danger },
  warnCard: {
    borderColor: theme.colors.warning,
    marginTop: theme.spacing.sm,
  },
  warnTitle: {
    color: theme.colors.warning,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  warnBody: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  previewTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  previewValues: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  previewNote: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  readOnly: {
    color: theme.colors.warning,
    marginVertical: theme.spacing.sm,
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  footerNote: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.md,
    lineHeight: 18,
  },
});
