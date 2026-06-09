import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { useBursaMaterial } from '../context/BursaMaterialContext';
import type { RootStackParamList } from '../navigation/types';
import {
  MATERIAL_ANALYSIS_MISSING_JA,
  type ApiConnectionRow,
  type MaterialStockRow,
} from '../services/bursa/bursaMaterialAnalysisService';
import type { MaterialApiAuditRow } from '../services/bursa/bursaMaterialApiAudit';
import { theme } from '../theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ApiConnectionList({ rows }: { rows: ApiConnectionRow[] }) {
  return (
    <>
      {rows.map((r) => (
        <View key={r.apiJa} style={styles.apiRow}>
          <Text style={styles.apiName}>{r.apiJa}</Text>
          <Text
            style={[
              styles.apiStatus,
              r.connectionJa === '未接続' ? styles.disconnected : styles.connected,
            ]}
          >
            {r.connectionJa}
          </Text>
        </View>
      ))}
    </>
  );
}

function AuditRow({ row }: { row: MaterialApiAuditRow }) {
  return (
    <View style={styles.auditCard}>
      <View style={styles.apiRow}>
        <Text style={styles.apiName}>{row.api}</Text>
        <Text
          style={[
            styles.apiStatus,
            row.connectionJa === '接続済み' ? styles.connected : styles.disconnected,
          ]}
        >
          {row.connectionJa}
        </Text>
      </View>
      <Text style={styles.meta}>取得件数: {row.fetchCount}</Text>
      {row.failureReason ? (
        <Text style={styles.meta}>失敗理由: {row.failureReason}</Text>
      ) : null}
    </View>
  );
}

function StockMaterialCard({
  row,
  onPress,
}: {
  row: MaterialStockRow;
  onPress: () => void;
}) {
  const scoreColor =
    row.scoreSign === 'positive'
      ? theme.colors.success
      : row.scoreSign === 'negative'
        ? theme.colors.danger
        : theme.colors.text;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCode}>{row.stockCode}</Text>
        <Text style={[styles.cardScore, { color: scoreColor }]}>{row.scoreJa}</Text>
      </View>
      <Text style={styles.cardName}>{row.companyNameJa}</Text>

      <Text style={styles.qualityStars}>{row.dataQuality.stars}</Text>
      <Text style={styles.qualityLabel}>{row.dataQuality.labelJa}</Text>

      <Text style={styles.subLabel}>材料スコア内訳（ソース別）</Text>
      {row.sourceScoreBreakdown.map((b) => (
        <Text key={`src-bd-${b.sourceJa}`} style={styles.item}>
          {b.sourceJa} {b.scoreJa}
        </Text>
      ))}

      <Text style={styles.subLabel}>API接続（News / X / Reddit）</Text>
      <ApiConnectionList rows={row.apiConnections} />

      <Text style={styles.subLabel}>ソース別件数 (itemCountBySource)</Text>
      {Object.entries(row.itemCountBySource).map(([label, count]) => (
        <Text key={`cnt-${label}`} style={styles.item}>
          {label}: {count}件
        </Text>
      ))}

      {row.redditFetchDiagnostics ? (
        <>
          <Text style={styles.subLabel}>Reddit取得</Text>
          <Text style={styles.item}>
            取得方法:{' '}
            {row.redditFetchDiagnostics.fetchMethod === 'rss'
              ? 'Reddit RSS'
              : row.redditFetchDiagnostics.fetchMethod}
          </Text>
          <Text style={styles.item}>取得件数: {row.redditFetchDiagnostics.fetchedCount}</Text>
          <Text style={styles.item}>有効件数: {row.redditFetchDiagnostics.validCount}</Text>
          <Text style={styles.item}>除外件数: {row.redditFetchDiagnostics.excludedCount}</Text>
          <Text style={styles.item}>
            Reddit投資材料信頼度: {row.redditFetchDiagnostics.investmentConfidenceJa}
          </Text>
          {row.redditFetchDiagnostics.qualityWarningJa ? (
            <Text style={styles.qualityWarning}>{row.redditFetchDiagnostics.qualityWarningJa}</Text>
          ) : null}
          {row.redditFetchDiagnostics.titles.slice(0, 5).map((title, i) => (
            <Text key={`reddit-title-${i}`} style={styles.item} selectable>
              Source: Reddit RSS — {title}
            </Text>
          ))}
        </>
      ) : null}

      <Text style={styles.subLabel}>好材料</Text>
      {row.positive.length === 0 ? (
        <Text style={styles.empty}>該当なし</Text>
      ) : (
        row.positive.map((m, i) => (
          <Text key={`pos-${i}`} style={styles.item}>
            {m.scoreJa} {m.title} ({m.sourceJa})
          </Text>
        ))
      )}

      <Text style={styles.subLabel}>悪材料</Text>
      {row.negative.length === 0 ? (
        <Text style={styles.empty}>該当なし</Text>
      ) : (
        row.negative.map((m, i) => (
          <Text key={`neg-${i}`} style={styles.item}>
            {m.scoreJa} {m.title} ({m.sourceJa})
          </Text>
        ))
      )}

      <Text style={styles.subLabel}>AI要約（3行）</Text>
      {row.summaryLines.map((line, i) => (
        <Text key={`sum-${i}`} style={styles.summary}>
          {line}
        </Text>
      ))}

      <Text style={styles.subLabel}>今日買う理由</Text>
      {row.buyReasons.length === 0 ? (
        <Text style={styles.empty}>{MATERIAL_ANALYSIS_MISSING_JA}</Text>
      ) : (
        row.buyReasons.map((r, i) => (
          <Text key={`buy-${i}`} style={styles.item}>
            {r}
          </Text>
        ))
      )}

      <Text style={styles.subLabel}>今日売る理由</Text>
      {row.sellReasons.length === 0 ? (
        <Text style={styles.empty}>{MATERIAL_ANALYSIS_MISSING_JA}</Text>
      ) : (
        row.sellReasons.map((r, i) => (
          <Text key={`sell-${i}`} style={styles.item}>
            {r}
          </Text>
        ))
      )}
    </Pressable>
  );
}

export function MaterialAnalysisScreen() {
  const { report, auditReport, loading, error, refresh } = useBursaMaterial();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  if (loading && !report) {
    return (
      <Screen>
        <Text style={styles.loading}>材料分析を取得中…</Text>
      </Screen>
    );
  }

  if (error || !report) {
    return (
      <Screen>
        <Text style={styles.error}>{error ?? MATERIAL_ANALYSIS_MISSING_JA}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} testID="material-analysis-screen">
        <Text style={styles.pageTitle}>材料分析</Text>
        <Text style={styles.liveTag}>{report.dataSourceLabel}</Text>
        <Pressable onPress={onRefresh}>
          <Text style={styles.refresh}>再取得</Text>
        </Pressable>

        {report.reportDataQuality ? (
          <Section title="【データ品質】">
            <Text style={styles.qualityStars}>{report.reportDataQuality.stars}</Text>
            <Text style={styles.qualityLabel}>{report.reportDataQuality.labelJa}</Text>
          </Section>
        ) : null}

        <Section title="【API接続状況】">
          <ApiConnectionList rows={report.apiConnections} />
        </Section>

        <Section title="【市場監視 — 材料通知】">
          {report.monitoringNotifications.length === 0 ? (
            <Text style={styles.empty}>材料アラートなし</Text>
          ) : (
            report.monitoringNotifications.map((n, i) => (
              <Text key={`mon-${i}`} style={styles.item}>
                {n}
              </Text>
            ))
          )}
        </Section>

        <Section title="【銘柄別材料分析】">
          {report.stocks.map((row) => (
            <StockMaterialCard
              key={row.stockCode}
              row={row}
              onPress={() =>
                navigation.navigate('StockReport', { symbol: row.stockCode, market: 'bursa' })
              }
            />
          ))}
        </Section>

        <Section title="【Phase11.5 API統合監査】">
          {auditReport ? (
            <>
              <Text style={styles.meta}>{auditReport.summaryJa}</Text>
              <Text style={styles.meta}>監査日時: {auditReport.auditedAt}</Text>
              {auditReport.rows.map((row) => (
                <AuditRow key={row.api} row={row} />
              ))}
            </>
          ) : (
            <Text style={styles.empty}>{MATERIAL_ANALYSIS_MISSING_JA}</Text>
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text, marginBottom: 4 },
  liveTag: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: 8 },
  refresh: { color: theme.colors.primary, fontWeight: '600', marginBottom: 12 },
  loading: { color: theme.colors.textMuted, padding: 16 },
  error: { color: theme.colors.danger, padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCode: { fontWeight: '800', fontSize: theme.fontSize.lg, color: theme.colors.text },
  cardScore: { fontWeight: '800', fontSize: theme.fontSize.xl },
  cardName: { color: theme.colors.textMuted, marginBottom: 8 },
  qualityStars: { fontSize: 16, color: theme.colors.warning, fontWeight: '700' },
  qualityLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: 6 },
  subLabel: { fontWeight: '700', color: theme.colors.text, marginTop: 8, marginBottom: 4 },
  item: { fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 20, marginBottom: 2 },
  summary: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, lineHeight: 18 },
  meta: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: 4 },
  empty: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, fontStyle: 'italic' },
  qualityWarning: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.danger,
    fontWeight: '700',
    marginBottom: 4,
  },
  apiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  apiName: { fontSize: theme.fontSize.sm, color: theme.colors.text, fontWeight: '600' },
  apiStatus: { fontSize: theme.fontSize.sm, fontWeight: '700' },
  connected: { color: theme.colors.success },
  disconnected: { color: theme.colors.textMuted },
  auditCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    padding: 8,
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
});
