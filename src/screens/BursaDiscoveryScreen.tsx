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
import type { RootStackParamList } from '../navigation/types';
import { buildBursaPhase6Analysis } from '../services/bursa/bursaPhase6Analysis';
import {
  formatBursaDiscoveryReport,
  SHIKIHO_MISSING_JA,
  type BursaDiscoveryRankRow,
  type BursaDiscoveryReport,
} from '../services/bursa/bursaDiscoveryService';
import type { BursaInvestmentStyleId } from '../services/bursa/bursaStockUniverse';
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

function RankCard({ row, onPress }: { row: BursaDiscoveryRankRow; onPress: () => void }) {
  return (
    <Pressable style={styles.rankCard} onPress={onPress}>
      <View style={styles.rankHeader}>
        <Text style={styles.rankNum}>{row.rank}</Text>
        <View style={styles.rankMeta}>
          <Text style={styles.rankCode}>{row.stockCode}</Text>
          <Text style={styles.rankName}>{row.companyNameJa}</Text>
        </View>
        <Text style={styles.rankScore}>{row.compositeScoreJa}</Text>
      </View>
      <Text style={styles.rankDims}>
        成長 {row.growthJa} · 収益 {row.profitabilityJa} · 安定 {row.stabilityJa} · 割安{' '}
        {row.valueJa}
      </Text>
      <Text style={styles.rankDims}>
        配当 {row.dividendAppealJa} · 競争 {row.competitiveJa} · 利回り {row.dividendYieldJa}
      </Text>
    </Pressable>
  );
}

export function BursaDiscoveryScreen() {
  const { state } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [report, setReport] = useState<BursaDiscoveryReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [styleTab, setStyleTab] = useState<BursaInvestmentStyleId>('composite');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const phase6 = await buildBursaPhase6Analysis({ holdings: state.portfolio });
      setReport(formatBursaDiscoveryReport(phase6));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [state.portfolio]);

  useEffect(() => {
    void load();
  }, [load]);

  const styleRows = useMemo(() => {
    if (!report) return [];
    return report.styleTabs.find((t) => t.id === styleTab)?.rows ?? [];
  }, [report, styleTab]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Bursa 銘柄ランキングを取得中…</Text>
        </View>
      </Screen>
    );
  }

  if (error || !report) {
    return (
      <Screen>
        <Text style={styles.error}>{error ?? SHIKIHO_MISSING_JA}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} testID="bursa-discovery-screen">
        <Text style={styles.pageTitle}>Bursa 銘柄発掘</Text>
        <Text style={styles.liveTag}>LIVE · KLSE Screener · 実データのみ</Text>

        <Section title="【概要】">
          <Row label="ユニバース" value={report.universeSizeJa} />
          <Row label="スコア算出" value={report.scoredCountJa} />
          <Row label="データソース" value={report.dataSourceLabel} />
        </Section>

        <Section title="【総合ランキング TOP100】">
          {report.top100.length === 0 ? (
            <Text style={styles.empty}>{SHIKIHO_MISSING_JA}</Text>
          ) : (
            report.top100.map((row) => (
              <RankCard
                key={`top-${row.stockCode}`}
                row={row}
                onPress={() =>
                  navigation.navigate('StockReport', { symbol: row.stockCode, market: 'bursa' })
                }
              />
            ))
          )}
        </Section>

        <Section title="【投資スタイル別ランキング】">
          <View style={styles.tabRow}>
            {report.styleTabs.map((tab) => (
              <Pressable
                key={tab.id}
                style={[styles.tab, styleTab === tab.id && styles.tabActive]}
                onPress={() => setStyleTab(tab.id)}
              >
                <Text style={[styles.tabText, styleTab === tab.id && styles.tabTextActive]}>
                  {tab.labelJa}
                </Text>
              </Pressable>
            ))}
          </View>
          {styleRows.length === 0 ? (
            <Text style={styles.empty}>{SHIKIHO_MISSING_JA}</Text>
          ) : (
            styleRows.map((row) => (
              <RankCard
                key={`style-${styleTab}-${row.stockCode}`}
                row={row}
                onPress={() =>
                  navigation.navigate('StockReport', { symbol: row.stockCode, market: 'bursa' })
                }
              />
            ))
          )}
        </Section>

        <Section title="【ポートフォリオ提案】">
          {report.portfolioRows.length === 0 ? (
            <Text style={styles.empty}>{SHIKIHO_MISSING_JA}</Text>
          ) : (
            report.portfolioRows.map((row, i) => (
              <View key={`pf-${i}`} style={styles.subBlock}>
                <Row label={`予算 ${row.budgetLabelJa}`} value={row.companyNameJa} />
                <Row label={row.stockCode} value={`${row.allocationJa}（${row.allocationPctJa}）`} />
                <Row label="株数目安" value={row.sharesJa} />
              </View>
            ))
          )}
        </Section>

        <Section title="【保有銘柄 vs ランキング】">
          {report.holdingRows.length === 0 ? (
            <Text style={styles.empty}>Bursa 保有銘柄なし</Text>
          ) : (
            report.holdingRows.map((row) => (
              <View key={`hold-${row.symbol}`} style={styles.subBlock}>
                <Row label={row.symbol} value={row.companyNameJa} />
                <Row label="スコア" value={row.scoreJa} />
                <Row label="順位" value={row.rankJa} />
                <Row label="TOP100平均比" value={row.vsTopAvgJa} />
              </View>
            ))
          )}
        </Section>

        <Section title="【買い替え提案】">
          {report.replacementRows.length === 0 ? (
            <Text style={styles.empty}>買い替え候補なし（保有より高スコア銘柄なし）</Text>
          ) : (
            report.replacementRows.map((row, i) => (
              <View key={`swap-${i}`} style={styles.subBlock}>
                <Row
                  label={`保有 ${row.heldSymbol}`}
                  value={`${row.heldCompanyNameJa} · スコア ${row.heldScoreJa}`}
                />
                <Row
                  label={`→ ${row.candidateCode}`}
                  value={`${row.candidateNameJa} · ${row.candidateScoreJa}（${row.candidateRankJa}）差 ${row.scoreDiffJa}`}
                />
              </View>
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
  rankCard: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  rankHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rankNum: { fontWeight: '800', fontSize: 18, color: theme.colors.primary, width: 28 },
  rankMeta: { flex: 1 },
  rankCode: { fontWeight: '700', color: theme.colors.text },
  rankName: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  rankScore: { fontWeight: '800', fontSize: 16, color: theme.colors.success },
  rankDims: { fontSize: 11, color: theme.colors.textMuted, lineHeight: 16 },
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
  subBlock: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  empty: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  error: { color: theme.colors.danger, padding: theme.spacing.md },
});
