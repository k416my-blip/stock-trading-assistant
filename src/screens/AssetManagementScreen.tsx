import { useCallback, useEffect, useState } from 'react';
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
import {
  ASSET_MGMT_MISSING_JA,
  formatAssetManagementReport,
  type AssetMgmtReport,
} from '../services/bursa/bursaAssetManagementService';
import { buildBursaPhase7Analysis } from '../services/bursa/bursaPhase7Analysis';
import { mapBursaAnalysisError } from '../services/bursa/bursaAnalysisDiagnostics';
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

function judgmentColor(j: string): string {
  if (j === '強気買い' || j === '買い' || j === '買い増し') return theme.colors.success;
  if (j === '売却候補' || j === '買い増し不可' || j === '利益確定推奨') return theme.colors.danger;
  if (j === '注意') return theme.colors.warning;
  return theme.colors.text;
}

function HoldingCard({
  row,
  onPress,
}: {
  row: AssetMgmtReport['holdings'][0];
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCode}>{row.symbol}</Text>
        <Text style={[styles.cardJudgment, { color: judgmentColor(row.judgmentJa) }]}>
          {row.judgmentJa}
        </Text>
      </View>
      <Text style={styles.cardName}>{row.companyNameJa}</Text>
      <Text style={styles.cardMeta}>
        スコア {row.scoreJa} · 順位 {row.rankJa}
      </Text>
      <Text style={styles.cardReason}>{row.reasonsJa}</Text>
    </Pressable>
  );
}

export function AssetManagementScreen() {
  const { state } = useApp();
  const { report: materialReport } = useBursaMaterial();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [report, setReport] = useState<AssetMgmtReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const phase7 = await buildBursaPhase7Analysis({ holdings: state.portfolio });
      setReport(formatAssetManagementReport(phase7));
    } catch (e) {
      setError(mapBursaAnalysisError('AssetManagement', e, ASSET_MGMT_MISSING_JA));
    } finally {
      setLoading(false);
    }
  }, [state.portfolio]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>AI資産運用分析を取得中…</Text>
        </View>
      </Screen>
    );
  }

  if (error || !report) {
    return (
      <Screen>
        <Text style={styles.error}>{error ?? ASSET_MGMT_MISSING_JA}</Text>
      </Screen>
    );
  }

  const bursaCount = report.holdings.length;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} testID="asset-management-screen">
        <Text style={styles.pageTitle}>AI資産運用</Text>
        <Text style={styles.liveTag}>{report.dataSourceLabel}</Text>

        <Section title="【投資家タイプ診断】">
          <Text style={styles.highlight}>{report.investorTypeJa}</Text>
          <Text style={styles.subText}>{report.investorTypeReasonJa}</Text>
        </Section>

        <Section title="【ポートフォリオ健全性】">
          <Text style={styles.scoreBig}>{report.portfolioHealthScoreJa}</Text>
          <Row label="セクター偏り" value={report.sectorBiasJa} />
          <Row label="配当依存度" value={report.dividendDependencyJa} />
          <Row label="大型株依存度" value={report.largeCapDependencyJa} />
          <Row label="成長株比率" value={report.growthRatioJa} />
        </Section>

        <Section title="【保有銘柄 — 材料スコア（Phase11）】">
          {!materialReport ? (
            <Text style={styles.empty}>{ASSET_MGMT_MISSING_JA}</Text>
          ) : (
            materialReport.stocks
              .filter((s) => report.holdings.some((h) => h.symbol === s.stockCode))
              .map((s) => (
                <View key={`mat-${s.stockCode}`} style={styles.card}>
                  <Text style={styles.cardCode}>
                    {s.stockCode} · 材料スコア {s.scoreJa}
                  </Text>
                  <Text style={styles.cardReason}>{s.summaryLines.join(' / ')}</Text>
                </View>
              ))
          )}
        </Section>

        <Section title="【保有銘柄診断】">
          {bursaCount === 0 ? (
            <Text style={styles.empty}>Bursa 保有銘柄なし</Text>
          ) : (
            report.holdings.map((row) => (
              <HoldingCard
                key={`diag-${row.symbol}`}
                row={row}
                onPress={() =>
                  navigation.navigate('StockReport', { symbol: row.symbol, market: 'bursa' })
                }
              />
            ))
          )}
        </Section>

        <Section title="【買い増し判定】">
          {report.addPosition.length === 0 ? (
            <Text style={styles.empty}>対象なし</Text>
          ) : (
            report.addPosition.map((row) => (
              <View key={`add-${row.symbol}`} style={styles.subBlock}>
                <Row label={`${row.symbol} · ${row.verdictJa}`} value={row.companyNameJa} />
                <Row label="現在価格" value={row.currentPriceJa} />
                <Row label="理論価格" value={row.fairPriceJa} />
                <Row label="業界PER中央値" value={row.industryPeJa} />
                <Text style={styles.subReason}>{row.reasonJa}</Text>
              </View>
            ))
          )}
        </Section>

        <Section title="【利益確定判定】">
          {report.takeProfit.length === 0 ? (
            <Text style={styles.empty}>対象なし</Text>
          ) : (
            report.takeProfit.map((row) => (
              <View key={`tp-${row.symbol}`} style={styles.subBlock}>
                <Row
                  label={`${row.symbol} · ${row.recommendJa}`}
                  value={row.companyNameJa}
                />
                <Row label="目標株価（PER法）" value={row.targetPriceJa} />
                <Row label="理論株価" value={row.fairPriceJa} />
                <Row label="現在価格" value={row.currentPriceJa} />
                <Row label="割高率" value={row.premiumJa} />
                <Text style={styles.subReason}>{row.reasonJa}</Text>
              </View>
            ))
          )}
        </Section>

        <Section title="【損切り警告】">
          {report.stopLoss.length === 0 ? (
            <Text style={styles.empty}>対象なし</Text>
          ) : (
            report.stopLoss.map((row) => (
              <View
                key={`sl-${row.symbol}`}
                style={[styles.subBlock, row.hasWarning && styles.warningBlock]}
              >
                <Row label={row.symbol} value={row.companyNameJa} />
                <SelectableText
                  style={[styles.subReason, row.hasWarning && styles.warningText]}
                >
                  {row.warningsJa}
                </SelectableText>
              </View>
            ))
          )}
        </Section>

        <Section title="【AIポートフォリオ再構築】">
          {report.reconstruction.length === 0 ? (
            <Text style={styles.empty}>再構築提案なし</Text>
          ) : (
            report.reconstruction.map((row, i) => (
              <View key={`recon-${i}`} style={styles.subBlock}>
                <Text style={styles.reconLabel}>{row.labelJa}</Text>
                <Text style={styles.subReason}>{row.detailJa}</Text>
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
  highlight: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  scoreBig: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  subText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  card: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCode: { fontWeight: '800', fontSize: 16, color: theme.colors.text },
  cardJudgment: { fontWeight: '800', fontSize: 14 },
  cardName: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
  cardMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  cardReason: { fontSize: 12, color: theme.colors.text, marginTop: 4, lineHeight: 18 },
  subBlock: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  warningBlock: {
    backgroundColor: `${theme.colors.danger}11`,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  subReason: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 18, marginTop: 4 },
  warningText: { color: theme.colors.danger, fontWeight: '600' },
  reconLabel: { fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  empty: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  error: { color: theme.colors.danger, padding: theme.spacing.md },
});

export default AssetManagementScreen;
