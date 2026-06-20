import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CURRENCY_SYMBOL } from '../../constants/rakutenTrade';
import { useApp } from '../../context/AppContext';
import type { RootStackParamList } from '../../navigation/types';
import { findImportCandidate } from '../../services/rakutenImport/rakutenImportStagingStorage';
import {
  canSaveImportCandidate,
  confidenceLabelJa,
  confidenceTier,
} from '../../services/rakutenImport/rakutenImportConfidence';
import type { BrokerTransactionCandidate, ImportFieldKey } from '../../types/rakutenImport';
import { theme } from '../../theme';

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
    case 'buy':
      return '買付';
    case 'sell':
      return '売却';
    case 'dividend':
      return '配当';
    default:
      return type;
  }
}

function formatSummary(c: BrokerTransactionCandidate): string {
  if (c.type === 'deposit') {
    return `RM ${c.totalMYR?.toLocaleString('ja-JP') ?? '—'}`;
  }
  if (c.type === 'dividend') {
    return `${c.symbol ?? '銘柄未特定'} · RM ${c.totalMYR?.toLocaleString('ja-JP') ?? '—'}`;
  }
  const sym = c.companyName ?? c.symbol ?? '—';
  const px =
    c.price != null ? `${CURRENCY_SYMBOL[c.currency]}${c.price}` : '単価未入力';
  return `${sym} · ${c.quantity ?? '—'}株 @ ${px}`;
}

type Props = {
  candidateId: string;
  blocked?: boolean;
};

export function ConciergeImportActionCard({ candidateId, blocked }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rejectRakutenImportCandidate, readOnlyBlockedMessage } = useApp();
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
        <Text style={styles.muted}>取引候補を読み込み中…</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card} testID="concierge-import-action-card">
      <Text style={styles.badge}>{typeLabel(candidate.type)}の記録</Text>
      <Text style={styles.summary}>{formatSummary(candidate)}</Text>
      <Text style={styles.meta}>日付: {candidate.executedAt?.slice(0, 10) ?? '—'}</Text>
      <Text style={[styles.confidence, confidenceStyle]}>
        信頼度: {confidenceLabelJa(candidate.overallConfidence)} (
        {Math.round(candidate.overallConfidence * 100)}%)
      </Text>

      {candidate.lowConfidenceFields.length > 0 ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>要確認フィールド</Text>
          {candidate.lowConfidenceFields.map((field) => (
            <Text key={field} style={styles.warnLine}>
              ⚠ {FIELD_LABEL_JA[field] ?? field}
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
        <Text style={styles.blockedNote}>
          信頼度が低いか必須項目が不足しているため、ここからは保存できません。修正するを押して入力してください。
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="記録する"
          onPress={onRecord}
          disabled={busy || saveBlocked}
        />
        <Button label="修正する" variant="ghost" onPress={onEdit} disabled={busy} />
        <Button
          label="キャンセル"
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
