import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { CURRENCY_SYMBOL } from '../constants/rakutenTrade';
import { useApp } from '../context/AppContext';
import {
  canSaveImportCandidate,
  confidenceColorKey,
  confidenceLabelJa,
} from '../services/rakutenImport/rakutenImportConfidence';
import { findImportBatch } from '../services/rakutenImport/rakutenImportStagingStorage';
import type { RootStackParamList } from '../navigation/types';
import type { BrokerTransactionCandidate } from '../types/rakutenImport';
import { theme } from '../theme';

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
  if (c.type === 'deposit' || c.type === 'withdrawal') {
    return `RM ${c.totalMYR?.toLocaleString('ja-JP') ?? '—'}`;
  }
  if (c.type === 'dividend') {
    return `${c.symbol ?? '—'} · RM ${c.totalMYR?.toLocaleString('ja-JP') ?? '—'}`;
  }
  if (c.type === 'fee') {
    const sym = c.symbol ? `${c.symbol} · ` : '';
    return `${sym}RM ${c.fee?.toLocaleString('ja-JP') ?? '—'}`;
  }
  const sym = c.companyName ?? c.symbol ?? '—';
  const px =
    c.price != null ? `${CURRENCY_SYMBOL[c.currency]}${c.price}` : '—';
  return `${sym} · ${c.quantity ?? '—'}株 @ ${px}`;
}

function CandidateRow({
  candidate,
  onSave,
  onEdit,
  onSkip,
  busy,
}: {
  candidate: BrokerTransactionCandidate;
  onSave: () => void;
  onEdit: () => void;
  onSkip: () => void;
  busy: boolean;
}) {
  const saveAllowed =
    canSaveImportCandidate(candidate) && candidate.status !== 'duplicate_blocked';
  const colorKey = confidenceColorKey(candidate.overallConfidence);
  const confidenceStyle =
    colorKey === 'success'
      ? styles.confidenceHigh
      : colorKey === 'warning'
        ? styles.confidenceWarn
        : styles.confidenceBlocked;

  return (
    <Card style={styles.rowCard} testID={`ocr-candidate-${candidate.id}`}>
      <Text style={styles.typeBadge}>{typeLabel(candidate.type)}</Text>
      <Text style={styles.summary}>{formatSummary(candidate)}</Text>
      <Text style={styles.meta}>日付: {candidate.executedAt?.slice(0, 10) ?? '—'}</Text>
      <Text style={[styles.confidence, confidenceStyle]}>
        信頼度: {confidenceLabelJa(candidate.overallConfidence)} (
        {Math.round(candidate.overallConfidence * 100)}%)
      </Text>
      {candidate.duplicateHint ? (
        <Text style={styles.dupBadge}>
          {candidate.status === 'duplicate_blocked'
            ? '重複 — 保存不可'
            : '類似記録あり — 要確認'}
        </Text>
      ) : null}
      <View style={styles.rowActions}>
        <Button
          label="保存"
          onPress={onSave}
          disabled={busy || !saveAllowed}
        />
        <Button label="修正" variant="ghost" onPress={onEdit} disabled={busy} />
        <Button label="スキップ" variant="ghost" onPress={onSkip} disabled={busy} />
      </View>
    </Card>
  );
}

export function RakutenImportOcrReviewScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'RakutenImportOcrReview'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rejectRakutenImportCandidate, readOnlyBlockedMessage } = useApp();

  const [candidates, setCandidates] = useState<BrokerTransactionCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const batch = await findImportBatch(params.batchId);
    setCandidates(
      batch?.candidates.filter(
        (c) => c.status !== 'confirmed' && c.status !== 'rejected',
      ) ?? [],
    );
    setLoading(false);
  }, [params.batchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = (candidateId: string) => {
    navigation.navigate('RakutenImportConfirm', { candidateId });
  };

  const onEdit = () => {
    navigation.navigate('RakutenImportManualEntry');
  };

  const onSkip = async (candidateId: string) => {
    setBusyId(candidateId);
    try {
      await rejectRakutenImportCandidate(candidateId);
      await load();
      if (candidates.length <= 1) {
        navigation.goBack();
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <Screen title="スクショ読み取り結果" subtitle="読み込み中…">
        <Text style={styles.muted}>候補を読み込んでいます…</Text>
      </Screen>
    );
  }

  if (candidates.length === 0) {
    return (
      <Screen title="スクショ読み取り結果" subtitle="候補がありません">
        <Text style={styles.muted}>すべて処理済みか、バッチが見つかりません。</Text>
        <Button label="戻る" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen title="スクショ読み取り結果" subtitle={`${candidates.length}件の候補`}>
      <Card style={styles.noteCard}>
        <Text style={styles.noteTitle}>自動保存は行いません</Text>
        <Text style={styles.noteBody}>
          各行を確認し、保存する行のみ「保存」→ 確認画面で記録してください。
        </Text>
      </Card>

      {readOnlyBlockedMessage ? (
        <Text style={styles.readOnly}>{readOnlyBlockedMessage}</Text>
      ) : null}

      <FlatList
        data={candidates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <CandidateRow
            candidate={item}
            onSave={() => onSave(item.id)}
            onEdit={onEdit}
            onSkip={() => void onSkip(item.id)}
            busy={busyId === item.id}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: theme.colors.textMuted },
  noteCard: {
    marginBottom: theme.spacing.sm,
    borderColor: theme.colors.primary,
  },
  noteTitle: {
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  noteBody: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  readOnly: {
    color: theme.colors.warning,
    marginBottom: theme.spacing.sm,
  },
  list: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  rowCard: {
    marginBottom: theme.spacing.xs,
  },
  typeBadge: {
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
  dupBadge: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.xs,
  },
  rowActions: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
});
