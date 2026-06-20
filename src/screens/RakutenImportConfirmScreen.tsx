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
import type { RootStackParamList } from '../navigation/types';
import type { BrokerTransactionCandidate } from '../types/rakutenImport';
import { theme } from '../theme';

function typeLabel(type: BrokerTransactionCandidate['type']): string {
  switch (type) {
    case 'deposit':
      return '入金';
    case 'buy':
      return '買付';
    case 'sell':
      return '売却';
    default:
      return type;
  }
}

function formatSummary(c: BrokerTransactionCandidate): string {
  if (c.type === 'deposit') {
    return `RM ${c.totalMYR?.toLocaleString('ja-JP')} の入金`;
  }
  const sym = c.symbol ?? '—';
  return `${sym} · ${c.quantity}株 @ ${CURRENCY_SYMBOL[c.currency]}${c.price}`;
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

  const [candidate, setCandidate] = useState<BrokerTransactionCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const found = await findImportCandidate(params.candidateId);
    setCandidate(found?.candidate ?? null);
    setLoading(false);
  }, [params.candidateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const preview =
    candidate && candidate.status !== 'duplicate_blocked'
      ? previewBuyingPowerAfterImport(state, candidate)
      : null;

  const onCommit = async () => {
    if (!candidate) return;
    setBusy(true);
    try {
      const result = await commitRakutenImportCandidate(candidate.id);
      if (!result.ok) {
        Alert.alert('保存できません', result.error);
        await load();
        return;
      }
      Alert.alert('記録しました', 'Rakuten Trade の取引を保存しました。', [
        {
          text: '保有銘柄を見る',
          onPress: () => navigation.navigate('MainTabs', { screen: 'Portfolio' }),
        },
        { text: 'OK', onPress: () => navigation.navigate('RakutenImportManualEntry') },
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
      <Screen title="記録内容の確認" subtitle="読み込み中…">
        <Text style={styles.muted}>候補を読み込んでいます…</Text>
      </Screen>
    );
  }

  if (!candidate) {
    return (
      <Screen title="記録内容の確認" subtitle="候補が見つかりません">
        <Text style={styles.muted}>ステージングの有効期限が切れたか、既に処理済みです。</Text>
        <Button label="入力に戻る" onPress={() => navigation.navigate('RakutenImportManualEntry')} />
      </Screen>
    );
  }

  const duplicateBlocked = candidate.status === 'duplicate_blocked';

  return (
    <Screen title="記録内容の確認" subtitle="保存前に必ず内容を確認してください">
      <Card testID="rakuten-import-confirm-card">
        <Text style={styles.typeBadge}>{typeLabel(candidate.type)}</Text>
        <Text style={styles.summary}>{formatSummary(candidate)}</Text>
        <Text style={styles.meta}>
          日付: {candidate.executedAt?.slice(0, 10) ?? '—'}
        </Text>
        {candidate.referenceNumber ? (
          <Text style={styles.meta}>参照番号: {candidate.referenceNumber}</Text>
        ) : null}
        {candidate.userNote ? <Text style={styles.meta}>メモ: {candidate.userNote}</Text> : null}
        <Text style={styles.confidence}>
          信頼度: 高（手動入力 · {Math.round(candidate.overallConfidence * 100)}%）
        </Text>
      </Card>

      {candidate.duplicateHint ? (
        <Card style={styles.warnCard}>
          <Text style={styles.warnTitle}>
            {duplicateBlocked ? '重複の可能性が高いため保存できません' : '類似の記録があります'}
          </Text>
          <Text style={styles.warnBody}>
            一致: {candidate.duplicateHint.matchedOn.join(' · ')}（スコア{' '}
            {Math.round(candidate.duplicateHint.score * 100)}%）
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
          label={busy ? '保存中…' : '記録する'}
          onPress={() => void onCommit()}
          disabled={busy || duplicateBlocked || !!readOnlyBlockedMessage}
        />
        <Button
          label="修正する"
          variant="ghost"
          onPress={() => navigation.navigate('RakutenImportManualEntry')}
          disabled={busy}
        />
        <Button label="キャンセル" variant="ghost" onPress={() => void onReject()} disabled={busy} />
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
    color: theme.colors.success,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
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
