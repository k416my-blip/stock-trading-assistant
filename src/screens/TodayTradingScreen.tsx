import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { SelectableText } from '../components/ui/SelectableText';
import { useApp } from '../context/AppContext';
import { useBursaMaterial } from '../context/BursaMaterialContext';
import type { RootStackParamList } from '../navigation/types';
import { buildBursaPhase8Analysis } from '../services/bursa/bursaPhase8Analysis';
import { BURSA_TODAY_BUDGETS_MYR } from '../services/bursa/bursaStockUniverse';
import {
  formatTodayTradingReport,
  TODAY_TRADING_MISSING_JA,
  type TodayTradingReport,
} from '../services/bursa/bursaTodayTradingService';
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

export function TodayTradingScreen() {
  const { state } = useApp();
  const { report: materialReport } = useBursaMaterial();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [report, setReport] = useState<TodayTradingReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [budgetTab, setBudgetTab] = useState<number>(5000);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const phase8 = await buildBursaPhase8Analysis({
        holdings: state.portfolio,
        budgetsMYR: [...BURSA_TODAY_BUDGETS_MYR],
      });
      setReport(formatTodayTradingReport(phase8));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [state.portfolio]);

  useEffect(() => {
    void load();
  }, [load]);

  const budgetAllocations = useMemo(() => {
    if (!report) return [];
    const label = `RM ${budgetTab.toLocaleString('en-US')}`;
    return report.allocations.filter((a) => a.budgetLabelJa === label);
  }, [report, budgetTab]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>今日の売買提案を取得中…</Text>
        </View>
      </Screen>
    );
  }

  if (error || !report) {
    return (
      <Screen>
        <Text style={styles.error}>{error ?? TODAY_TRADING_MISSING_JA}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} testID="today-trading-screen">
        <Text style={styles.pageTitle}>今日の売買</Text>
        <Text style={styles.liveTag}>{report.dataSourceLabel}</Text>

        <Section title="【本日の推奨アクション】">
          <Text style={styles.primaryAction}>{report.primaryActionJa}</Text>
          <Text style={styles.subReason}>{report.primaryReasonJa}</Text>
        </Section>

        <Section title="【今日買う理由 — 材料分析】">
          {!materialReport ? (
            <Text style={styles.empty}>{TODAY_TRADING_MISSING_JA}</Text>
          ) : (
            materialReport.stocks
              .filter((s) => s.buyReasons.length > 0)
              .slice(0, 4)
              .map((s) => (
                <View key={`buy-mat-${s.stockCode}`} style={styles.subBlock}>
                  <Text style={styles.cardCode}>
                    {s.stockCode} {s.scoreJa}
                  </Text>
                  {s.buyReasons.map((r, i) => (
                    <Text key={`br-${i}`} style={styles.subReason}>
                      {r}
                    </Text>
                  ))}
                </View>
              ))
          )}
        </Section>

        <Section title="【今日売る理由 — 材料分析】">
          {!materialReport ? (
            <Text style={styles.empty}>{TODAY_TRADING_MISSING_JA}</Text>
          ) : (
            materialReport.stocks
              .filter((s) => s.sellReasons.length > 0)
              .slice(0, 4)
              .map((s) => (
                <View key={`sell-mat-${s.stockCode}`} style={styles.subBlock}>
                  <Text style={styles.cardCode}>
                    {s.stockCode} {s.scoreJa}
                  </Text>
                  {s.sellReasons.map((r, i) => (
                    <Text key={`sr-${i}`} style={styles.subReason}>
                      {r}
                    </Text>
                  ))}
                </View>
              ))
          )}
        </Section>

        <Section title="【今日買うべき TOP10】">
          {report.buyTop10.length === 0 ? (
            <Text style={styles.empty}>{TODAY_TRADING_MISSING_JA}</Text>
          ) : (
            report.buyTop10.map((row) => (
              <Pressable
                key={`buy-${row.stockCode}`}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('StockReport', {
                    symbol: row.stockCode,
                    market: 'bursa',
                  })
                }
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardCode}>
                    {row.rank} · {row.stockCode}
                  </Text>
                  <Text style={styles.discount}>{row.discountJa}</Text>
                </View>
                <Text style={styles.cardName}>{row.companyNameJa}</Text>
                <Text style={styles.cardMeta}>
                  現在 {row.currentPriceJa} · 理論 {row.fairPriceJa} · スコア{' '}
                  {row.compositeScoreJa}
                </Text>
                <Text style={styles.cardMeta}>
                  判断 {row.judgmentJa} · {row.reasonJa}
                </Text>
              </Pressable>
            ))
          )}
        </Section>

        <Section title="【今日売るべき銘柄】">
          {report.sellCandidates.length === 0 ? (
            <Text style={styles.empty}>売却候補なし</Text>
          ) : (
            report.sellCandidates.map((row) => (
              <View key={`sell-${row.symbol}`} style={styles.subBlock}>
                <Row
                  label={`${row.symbol} · ${row.kindJa}`}
                  value={row.companyNameJa}
                />
                <Text style={styles.subReason}>{row.reasonJa}</Text>
                {row.premiumJa !== TODAY_TRADING_MISSING_JA ? (
                  <Row label="割高率" value={row.premiumJa} />
                ) : null}
              </View>
            ))
          )}
        </Section>

        <Section title="【資金配分 AI】">
          <View style={styles.tabRow}>
            {BURSA_TODAY_BUDGETS_MYR.map((b) => (
              <Pressable
                key={b}
                style={[styles.tab, budgetTab === b && styles.tabActive]}
                onPress={() => setBudgetTab(b)}
              >
                <Text style={[styles.tabText, budgetTab === b && styles.tabTextActive]}>
                  RM {b >= 1000 ? `${b / 1000}k` : b}
                </Text>
              </Pressable>
            ))}
          </View>
          {budgetAllocations.length === 0 ? (
            <Text style={styles.empty}>{TODAY_TRADING_MISSING_JA}</Text>
          ) : (
            budgetAllocations.map((row, i) => (
              <View key={`alloc-${budgetTab}-${i}`} style={styles.subBlock}>
                <Row label={row.stockCode} value={row.companyNameJa} />
                <Row label="配分" value={`${row.allocationJa}（${row.allocationPctJa}）`} />
                <Row label="購入株数" value={row.sharesJa} />
                <Row label="必要金額" value={row.requiredJa} />
                <Row label="残金" value={row.remainderJa} />
                <Row label="現在価格" value={row.currentPriceJa} />
              </View>
            ))
          )}
        </Section>

        <Section title="【売買優先順位】">
          {report.priorityOrder.length === 0 ? (
            <Text style={styles.empty}>{TODAY_TRADING_MISSING_JA}</Text>
          ) : (
            report.priorityOrder.map((row) => (
              <View key={`prio-${row.symbol}`} style={styles.subBlock}>
                <Row label={`${row.priorityJa} · ${row.symbol}`} value={row.companyNameJa} />
                <Text style={styles.subReason}>{row.reasonJa}</Text>
              </View>
            ))
          )}
        </Section>

        <Section title="【AIコンシェルジュ通知】">
          {report.notifications.length === 0 ? (
            <Text style={styles.empty}>{TODAY_TRADING_MISSING_JA}</Text>
          ) : (
            report.notifications.map((note, i) => (
              <Text key={`note-${i}`} style={styles.notification}>
                {note}
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
    marginBottom: theme.spacing.md,
  },
  primaryAction: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 6,
  },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCode: { fontWeight: '800', fontSize: 14, color: theme.colors.text },
  discount: { fontWeight: '800', fontSize: 14, color: theme.colors.success },
  cardName: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
  cardMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, lineHeight: 18 },
  subBlock: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  subReason: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 18, marginTop: 4 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: theme.spacing.sm },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tabText: { fontSize: 12, color: theme.colors.text },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  notification: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  empty: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  error: { color: theme.colors.danger, padding: theme.spacing.md },
});

export default TodayTradingScreen;
