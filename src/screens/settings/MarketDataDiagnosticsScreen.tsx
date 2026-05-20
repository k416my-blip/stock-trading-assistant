import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import {
  getMarketDataDiagnosticsSnapshot,
  hydrateMarketDataDiagnostics,
  resetMarketDataDiagnostics,
  subscribeMarketDataDiagnostics,
  type MarketDataDiagnosticsSnapshot,
} from '../../services/marketDataDiagnostics';
import { theme } from '../../theme';

function formatTime(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '—';
    return d.toLocaleString('ja-JP');
  } catch {
    return '—';
  }
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value}%`;
}

function formatMs(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value} ms`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  );
}

export function MarketDataDiagnosticsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [snap, setSnap] = useState<MarketDataDiagnosticsSnapshot>(() =>
    getMarketDataDiagnosticsSnapshot(),
  );
  const [resetting, setResetting] = useState(false);

  const refreshSnapshot = useCallback(() => {
    setSnap(getMarketDataDiagnosticsSnapshot());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void hydrateMarketDataDiagnostics().then(refreshSnapshot);
      const unsub = subscribeMarketDataDiagnostics(refreshSnapshot);
      const timer = setInterval(refreshSnapshot, 1500);
      return () => {
        unsub();
        clearInterval(timer);
      };
    }, [refreshSnapshot]),
  );

  const onReset = async () => {
    setResetting(true);
    try {
      await resetMarketDataDiagnostics();
      refreshSnapshot();
    } finally {
      setResetting(false);
    }
  };

  return (
    <Screen
      title="市場データ診断"
      subtitle="株価更新の安定性確認用（個人情報は保存しません）"
    >
      <Section title="更新回数">
        <Row label="総更新回数" value={String(snap.totalRefreshCount)} />
        <Row label="手動更新" value={String(snap.manualRefreshCount)} />
        <Row label="自動更新" value={String(snap.autoRefreshCount)} />
        <Row label="更新中" value={snap.refreshInFlight ? 'はい' : 'いいえ'} />
        <Row label="最終更新" value={formatTime(snap.lastRefreshAt)} />
        <Row label="最終成功更新" value={formatTime(snap.lastSuccessfulRefreshAt)} />
      </Section>

      <Section title="API・レイテンシ">
        <Row label="直近更新のAPI呼び出し" value={String(snap.lastApiCallsPerRefresh)} />
        <Row label="API呼び出し合計" value={String(snap.totalApiCalls)} />
        <Row label="本日のAPI呼び出し" value={String(snap.apiCallsToday)} />
        <Row label="平均取得時間" value={formatMs(snap.averageFetchLatencyMs)} />
        <Row label="タイムアウト" value={String(snap.timeoutCount)} />
        <Row label="レート制限" value={String(snap.rateLimitCount)} />
      </Section>

      <Section title="取得成功・失敗">
        <Row label="価格取得成功" value={String(snap.successfulPriceFetchCount)} />
        <Row label="価格取得失敗" value={String(snap.failedPriceFetchCount)} />
        <Row label="成功率" value={formatPercent(snap.successRatePercent)} />
        <Row label="銘柄コード不正" value={String(snap.invalidSymbolCount)} />
      </Section>

      <Section title="Bursa シンボル形式">
        <Row label="キャッシュ形式ヒット" value={String(snap.bursaCacheHitCount)} />
        <Row label="フルプローブ" value={String(snap.bursaFullProbeCount)} />
      </Section>

      <Section title="ポートフォリオ整合">
        <Row label="更新前の保有件数" value={String(snap.lastHoldingsBefore ?? '—')} />
        <Row label="更新後の保有件数" value={String(snap.lastHoldingsAfter ?? '—')} />
      </Section>

      <Card style={styles.resetCard}>
        <Button
          label="データ整合性監査へ"
          onPress={() => navigation.navigate('DataIntegrity')}
          variant="ghost"
        />
        <Text style={styles.resetHint}>
          カウンターを0に戻します。保有データやAPIキーには影響しません。
        </Text>
        <Button
          label="診断データをリセット"
          onPress={() => void onReset()}
          variant="ghost"
          disabled={resetting}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: theme.spacing.sm },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: 4,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    flex: 1,
  },
  value: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 0,
  },
  resetCard: { marginTop: theme.spacing.xs },
  resetHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
});
