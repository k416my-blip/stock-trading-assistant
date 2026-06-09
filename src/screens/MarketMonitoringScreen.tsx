import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { SelectableText } from '../components/ui/SelectableText';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import {
  formatMarketMonitoringReport,
  MONITORING_MISSING_JA,
  type MarketMonitoringReport,
} from '../services/bursa/bursaMarketMonitoringService';
import {
  addBursaWatchlistEntry,
  removeBursaWatchlistEntry,
} from '../services/bursa/bursaMonitoringStorage';
import { buildBursaPhase9Analysis } from '../services/bursa/bursaPhase9Analysis';
import { theme } from '../theme';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <SelectableText style={styles.rowValue}>{value}</SelectableText>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function MarketMonitoringScreen() {
  const { state } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [report, setReport] = useState<MarketMonitoringReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const phase9 = await buildBursaPhase9Analysis({ holdings: state.portfolio });
      setReport(formatMarketMonitoringReport(phase9));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [state.portfolio]);

  useEffect(() => {
    void load();
  }, [load]);

  const addWatch = useCallback(async () => {
    const code = newCode.replace(/\.KL$/i, '').trim();
    if (!code) return;
    await addBursaWatchlistEntry({
      stockCode: code,
      companyName: null,
      addedAt: new Date().toISOString(),
    });
    setNewCode('');
    await load();
  }, [load, newCode]);

  const removeWatch = useCallback(
    async (code: string) => {
      await removeBursaWatchlistEntry(code);
      await load();
    },
    [load],
  );

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>市場監視データを取得中…</Text>
        </View>
      </Screen>
    );
  }

  if (error || !report) {
    return (
      <Screen>
        <Text style={styles.error}>{error ?? MONITORING_MISSING_JA}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} testID="market-monitoring-screen">
        <Text style={styles.pageTitle}>市場監視</Text>
        <Text style={styles.liveTag}>{report.dataSourceLabel}</Text>
        <Text style={styles.meta}>
          前回スナップショット: {report.previousSnapshotAtJa}
        </Text>

        <Section title="【AIアラート】">
          {report.alerts.length === 0 ? (
            <Text style={styles.empty}>新規アラートなし</Text>
          ) : (
            report.alerts.map((a) => (
              <View key={a.messageJa + a.atJa} style={styles.subBlock}>
                <Text style={styles.alertKind}>{a.kindJa}</Text>
                <SelectableText style={styles.alertMsg}>{a.messageJa}</SelectableText>
              </View>
            ))
          )}
        </Section>

        <Section title="【ランキング変動】">
          {report.rankChanges.length === 0 ? (
            <Text style={styles.empty}>{MONITORING_MISSING_JA}</Text>
          ) : (
            report.rankChanges.map((r) => (
              <Pressable
                key={`rank-${r.stockCode}`}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('StockReport', { symbol: r.stockCode, market: 'bursa' })
                }
              >
                <Text style={styles.cardCode}>{r.stockCode}</Text>
                <Text style={styles.cardName}>{r.companyNameJa}</Text>
                <Text style={styles.cardMeta}>{r.changeLabelJa}</Text>
              </Pressable>
            ))
          )}
        </Section>

        <Section title="【決算変化】">
          {report.earningsChanges.map((e) => (
            <View key={`earn-${e.stockCode}`} style={styles.subBlock}>
              <Row label={e.stockCode} value={e.companyNameJa} />
              <Row label="期間" value={e.periodJa} />
              <Row label="売上" value={`${e.revenueJa}（${e.revenueChangeJa}）`} />
              <Row label="純利益" value={`${e.netProfitJa}（${e.netProfitChangeJa}）`} />
              <Row label="EPS" value={`${e.epsJa}（${e.epsChangeJa}）`} />
              <Row label="配当" value={`${e.dividendJa}（${e.dividendChangeJa}）`} />
            </View>
          ))}
        </Section>

        <Section title="【配当変化】">
          {report.dividendChanges.map((d) => (
            <View key={`div-${d.stockCode}`} style={styles.subBlock}>
              <Row label={`${d.stockCode} · ${d.statusJa}`} value={d.companyNameJa} />
              <Text style={styles.subReason}>{d.reasonJa}</Text>
            </View>
          ))}
        </Section>

        <Section title="【保有銘柄監視】">
          {report.holdingsRankChanges.length === 0 &&
          report.holdingsEarningsChanges.length === 0 ? (
            <Text style={styles.empty}>Bursa 保有銘柄なし</Text>
          ) : (
            <>
              {report.holdingsRankChanges.map((r) => (
                <Row key={`hr-${r.stockCode}`} label={r.stockCode} value={r.changeLabelJa} />
              ))}
              {report.holdingsEarningsChanges.map((e) => (
                <Row
                  key={`he-${e.stockCode}`}
                  label={e.stockCode}
                  value={`純利益 ${e.netProfitChangeJa}`}
                />
              ))}
              {report.holdingsDividendChanges.map((d) => (
                <Row key={`hd-${d.stockCode}`} label={d.stockCode} value={d.statusJa} />
              ))}
            </>
          )}
        </Section>

        <Section title="【ウォッチリスト】">
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="銘柄コード（例 1155）"
              placeholderTextColor={theme.colors.textMuted}
              value={newCode}
              onChangeText={setNewCode}
              keyboardType="number-pad"
            />
            <Pressable style={styles.addBtn} onPress={() => void addWatch()}>
              <Text style={styles.addBtnText}>追加</Text>
            </Pressable>
          </View>
          {report.watchlist.length === 0 ? (
            <Text style={styles.empty}>ウォッチリスト空</Text>
          ) : (
            report.watchlist.map((w) => (
              <View key={w.stockCode} style={styles.watchRow}>
                <View style={styles.watchMeta}>
                  <Text style={styles.cardCode}>{w.stockCode}</Text>
                  <Text style={styles.subReason}>{w.companyNameJa}</Text>
                </View>
                <Pressable onPress={() => void removeWatch(w.stockCode)}>
                  <Text style={styles.removeText}>削除</Text>
                </Pressable>
              </View>
            ))
          )}
        </Section>

        <Section title="【アラート履歴】">
          {report.alertHistory.length === 0 ? (
            <Text style={styles.empty}>履歴なし</Text>
          ) : (
            report.alertHistory.slice(0, 30).map((h) => (
              <View key={h.atJa + h.stockCode + h.kindJa} style={styles.subBlock}>
                <Text style={styles.subReason}>{h.atJa}</Text>
                <Row label={h.stockCode} value={h.kindJa} />
                <Text style={styles.subReason}>{h.messageJa}</Text>
              </View>
            ))
          )}
        </Section>

        <Section title="【AIコンシェルジュ通知】">
          {report.notifications.length === 0 ? (
            <Text style={styles.empty}>{MONITORING_MISSING_JA}</Text>
          ) : (
            report.notifications.map((n, i) => (
              <Text key={`n-${i}`} style={styles.notification}>
                {n}
              </Text>
            ))
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl * 2 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { color: theme.colors.textMuted },
  pageTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  liveTag: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: { fontSize: 11, color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  section: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  row: { marginBottom: 6 },
  rowLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: 2 },
  rowValue: { fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 20 },
  card: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cardCode: { fontWeight: '800', fontSize: 14, color: theme.colors.text },
  cardName: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
  cardMeta: { fontSize: 12, color: theme.colors.text, marginTop: 4 },
  subBlock: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  subReason: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 18 },
  alertKind: { fontWeight: '700', color: theme.colors.danger, marginBottom: 2 },
  alertMsg: { fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 20 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  addBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  watchMeta: { flex: 1 },
  removeText: { color: theme.colors.danger, fontWeight: '600' },
  notification: { fontSize: theme.fontSize.sm, color: theme.colors.text, marginBottom: 8, lineHeight: 20 },
  empty: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  error: { color: theme.colors.danger, padding: theme.spacing.md },
});

export default MarketMonitoringScreen;
