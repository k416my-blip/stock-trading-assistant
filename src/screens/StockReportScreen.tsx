import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MemoLineChart } from '../components/charts/MemoLineChart';
import { Screen } from '../components/ui/Screen';
import { SelectableText } from '../components/ui/SelectableText';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import { buildAiStockReportAsync } from '../services/aiStockReportService';
import { scoreToGrade } from '../services/aiRankingEngine';
import { SHIKIHO_MISSING_JA } from '../services/aiStockReportDataFetcher';
import type { AiGradeRank, AiStockReport } from '../types/aiStockReport';
import { theme } from '../theme';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <SelectableText style={styles.rowValue}>{value}</SelectableText>
    </View>
  );
}

function DimBar({
  label,
  score,
  available,
}: {
  label: string;
  score: number;
  available: boolean;
}) {
  if (!available) {
    return (
      <View style={styles.dimRow}>
        <Text style={styles.dimLabel}>{label}</Text>
        <SelectableText style={styles.dimMissing}>{SHIKIHO_MISSING_JA}</SelectableText>
      </View>
    );
  }
  const grade = scoreToGrade(score);
  return (
    <View style={styles.dimRow}>
      <Text style={styles.dimLabel}>{label}</Text>
      <View style={styles.dimBarTrack}>
        <View style={[styles.dimBarFill, { width: `${score}%` }]} />
      </View>
      <Text style={styles.dimScore}>
        {score} · {grade}
      </Text>
    </View>
  );
}

function gradeLabel(g: AiGradeRank | null): string {
  return g ?? SHIKIHO_MISSING_JA;
}

export function StockReportScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'StockReport'>>();
  const { state, twelveDataApiKey, analysisApiKeys } = useApp();
  const [report, setReport] = useState<AiStockReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const holding = state.portfolio.find(
    (p) =>
      p.symbol.toUpperCase() === params.symbol.toUpperCase() &&
      p.market === params.market &&
      (p.shares ?? 0) > 0,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void buildAiStockReportAsync({
      symbol: params.symbol,
      market: params.market,
      holding: holding ?? null,
      twelveDataApiKey,
      newsApiKey: analysisApiKeys.newsApiKey,
    })
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.symbol, params.market, holding, twelveDataApiKey, analysisApiKeys.newsApiKey]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>AI四季報を取得中…</Text>
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

  const { overview, financials, marketData, dividend, health, competitiveness, news, risk, evaluation, subGrades } =
    report;
  const bursa = report.bursa;
  const p4 = bursa?.phase4;
  const p5 = bursa?.phase5;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} testID="ai-shikiho-screen">
        <Text style={styles.pageTitle}>AI四季報</Text>
        <Text style={styles.liveTag}>
          LIVE · Yahoo / Twelve Data / News API{bursa ? ' / Bursa (KLSE)' : ''}
        </Text>

        {bursa ? (
          <>
            <Section title="【四季報 · 会社概要】">
              <View testID="bursa-shikiho-section">
                <Row label="会社名" value={overview.companyName} />
                <Row label="市場" value={overview.marketLabelJa} />
                <Row label="データソース" value={bursa.dataSourceLabel} />
                <Row label="取得状態" value={bursa.fetchStatus} />
                <Row label="会社概要" value={bursa.companyOverviewJa} />
                <Row label="セクター" value={bursa.sectorJa} />
                <Row label="サブセクター" value={bursa.subSectorJa} />
                <Row label="時価総額" value={bursa.marketCapJa} />
                <Row label="発行済株式数" value={bursa.sharesOutstandingJa} />
              </View>
            </Section>

            <Section title="【業績】">
              {p4?.performanceSectionRows.map((row) => (
                <Row key={`perf-${row.labelJa}`} label={row.labelJa} value={row.valueJa} />
              )) ?? <Row label="年次業績" value={SHIKIHO_MISSING_JA} />}
              <Row
                label="最新四半期（決算日）"
                value={bursa.latestQuarter?.quarterEndDateJa ?? SHIKIHO_MISSING_JA}
              />
              <Row label="売上高（最新四半期）" value={bursa.revenueJa} />
              <Row label="純利益（最新四半期）" value={bursa.netProfitJa} />
              <Row label="EPS（最新四半期）" value={bursa.epsJa} />
            </Section>

            <Section title="【配当】">
              {p4?.dividendSectionRows.map((row) => (
                <Row key={`div-${row.labelJa}`} label={row.labelJa} value={row.valueJa} />
              )) ?? <Row label="配当" value={SHIKIHO_MISSING_JA} />}
            </Section>

            <Section title="【大株主】">
              <Row label="データソース" value={p4?.shareholderSourceJa ?? SHIKIHO_MISSING_JA} />
              {p4?.majorShareholderRows.map((row, i) => (
                <View key={`sh-${i}`} style={styles.trendYearBlock}>
                  <Row label={row.nameJa} value={`${row.holdingPctJa}（${row.asOfJa}）`} />
                </View>
              )) ?? <Row label="大株主" value={SHIKIHO_MISSING_JA} />}
            </Section>

            <Section title="【事業構成】">
              <Text style={styles.subSectionTitle}>事業別売上</Text>
              {p4?.segmentRows.map((row, i) => (
                <Row
                  key={`seg-${i}`}
                  label={row.segmentJa}
                  value={`${row.revenueJa} · ${row.ratioJa}`}
                />
              )) ?? <Row label="事業別" value={SHIKIHO_MISSING_JA} />}
              <Text style={styles.subSectionTitle}>地域別売上</Text>
              {p4?.geographicRows.map((row) => (
                <Row
                  key={`geo-${row.regionJa}`}
                  label={row.regionJa}
                  value={`${row.revenueJa} · ${row.ratioJa}`}
                />
              )) ?? null}
            </Section>

            <Section title="【四季報コメント】">
              <Row label="【業績】" value={p4?.comments.performanceJa ?? SHIKIHO_MISSING_JA} />
              <Row label="【強み】" value={p4?.comments.strengthsJa ?? SHIKIHO_MISSING_JA} />
              <Row label="【リスク】" value={p4?.comments.risksJa ?? SHIKIHO_MISSING_JA} />
              <Row label="【配当】" value={p4?.comments.dividendJa ?? SHIKIHO_MISSING_JA} />
              <Row label="【総評】" value={p4?.comments.summaryJa ?? SHIKIHO_MISSING_JA} />
            </Section>

            <Section title="【今期予想】">
              <Row label="会社ガイダンス" value={p4?.currentForecastJa ?? SHIKIHO_MISSING_JA} />
            </Section>

            <Section title="【来期予想】">
              <Row label="会社ガイダンス" value={p4?.nextForecastJa ?? SHIKIHO_MISSING_JA} />
            </Section>

            {p5 ? (
              <>
                <Section title="【同業比較 · アナリスト】">
                  {p5.enhancedPeerRows.map((row) => (
                    <View key={`p5-peer-${row.metricJa}`} style={styles.trendYearBlock}>
                      <Text style={styles.trendYearTitle}>{row.metricJa}</Text>
                      <Row label="当社" value={row.targetValueJa} />
                      <Row label="業界平均" value={row.industryAverageJa} />
                      <Row label="差分" value={row.diffPctJa} />
                    </View>
                  ))}
                </Section>

                <Section title="【フェアバリュー · PER法】">
                  <Row label="現在価格" value={p5.fairValue.currentPriceJa} />
                  <Row label="理論株価" value={p5.fairValue.fairPriceJa} />
                  <Row label="割安率" value={p5.fairValue.discountPctJa} />
                  <Row label="算出方法" value={p5.fairValue.methodNoteJa} />
                </Section>

                <Section title="【配当投資判定】">
                  <Row label="現在配当" value={p5.dividendJudgment.currentDividendJa} />
                  <Row label="5年平均配当" value={p5.dividendJudgment.fiveYearAverageJa} />
                  <Row label="増配率" value={p5.dividendJudgment.growthRateJa} />
                  <Row label="減配履歴" value={p5.dividendJudgment.cutHistoryJa} />
                  <Row label="判定" value={p5.dividendJudgment.ratingJa} />
                </Section>

                <Section title="【業績トレンド判定】">
                  <Row label="売上" value={p5.trendJudgment.revenueJa} />
                  <Row label="利益" value={p5.trendJudgment.netProfitJa} />
                  <Row label="EPS" value={p5.trendJudgment.epsJa} />
                </Section>

                <Section title="【総合投資判断】">
                  <Row label="判断" value={p5.overallJudgmentJa} />
                  <Text style={styles.aiCommentTitle}>理由</Text>
                  {p5.judgmentReasonsJa.map((r, i) => (
                    <SelectableText key={`p5-reason-${i}`} style={styles.bullet}>
                      · {r}
                    </SelectableText>
                  ))}
                </Section>
              </>
            ) : null}

            {bursa.phase2 ? (
              <>
                <Section title="【5年推移 · AI分析】">
                  {bursa.phase2.trendRows.map((row) => (
                    <View key={`trend-${row.year}`} style={styles.trendYearBlock}>
                      <Text style={styles.trendYearTitle}>{row.year}</Text>
                      <Row label="売上" value={row.revenueJa} />
                      <Row label="純利益" value={row.netProfitJa} />
                      <Row label="EPS" value={row.epsJa} />
                      <Row label="配当" value={row.dividendJa} />
                      <Row label="ROE" value={row.roeJa} />
                    </View>
                  ))}
                  {bursa.phase2.chartLabels.length > 1 ? (
                    <>
                      <Text style={styles.chartCaption}>売上高推移</Text>
                      <MemoLineChart
                        labels={bursa.phase2.chartLabels}
                        values={bursa.phase2.chartRevenue.map((v) => v / 1_000_000_000)}
                        height={160}
                      />
                      <Text style={styles.chartCaption}>純利益推移（十億 MYR）</Text>
                      <MemoLineChart
                        labels={bursa.phase2.chartLabels}
                        values={bursa.phase2.chartNetProfit.map((v) => v / 1_000_000_000)}
                        height={160}
                        color="#22c55e"
                      />
                    </>
                  ) : null}
                  <Row label="売上成長" value={bursa.phase2.revenueGrowthStarsJa} />
                  <Row label="利益成長" value={bursa.phase2.profitGrowthStarsJa} />
                  <Row label="配当成長" value={bursa.phase2.dividendGrowthStarsJa} />
                  <Row label="財務健全性" value={bursa.phase2.financialHealthStarsJa} />
                  <Row label="【AI判定】" value={bursa.phase2.investmentTypeJa} />
                  <Text style={styles.aiCommentTitle}>理由</Text>
                  {bursa.phase2.judgmentReasonsJa.map((r, i) => (
                    <SelectableText key={`bursa-reason-${i}`} style={styles.bullet}>
                      · {r}
                    </SelectableText>
                  ))}
                </Section>
              </>
            ) : null}

            {bursa.phase3 ? (
              <>
                <Section title="【同業比較 · AI分析】">
                  <Row label="同業" value={bursa.phase3.peerNamesJa} />
                  {bursa.phase3.comparisonRows.map((row) => (
                    <View key={`peer-${row.metricJa}`} style={styles.trendYearBlock}>
                      <Text style={styles.trendYearTitle}>{row.metricJa}</Text>
                      <Row label="当社" value={row.targetValueJa} />
                      <Row label="同業" value={row.peerSummaryJa} />
                      <Row label="業界順位" value={row.rankJa} />
                    </View>
                  ))}
                </Section>

                <Section title="【業界内ランキング】">
                  <Row label="業界" value={bursa.phase3.industryLabelJa} />
                  <Row label="対象社数" value={`全${bursa.phase3.industryCompanyCountJa}中`} />
                  <Row label="時価総額順位" value={bursa.phase3.marketCapRankJa} />
                  <Row label="利益順位" value={bursa.phase3.profitRankJa} />
                  <Row label="配当順位" value={bursa.phase3.dividendRankJa} />
                  <Row label="ROE順位" value={bursa.phase3.roeRankJa} />
                  <Row label="総合順位" value={bursa.phase3.overallRankJa} />
                </Section>

                <Section title="【競争優位性】">
                  {bursa.phase3.competitiveRows.map((row) => (
                    <View key={`moat-${row.labelJa}`} style={styles.trendYearBlock}>
                      <Row label={row.labelJa} value={row.scoreJa} />
                      <SelectableText style={styles.bullet}>· {row.reasonJa}</SelectableText>
                    </View>
                  ))}
                </Section>

                <Section title="【バフェットスコア】">
                  <Row label="総合" value={bursa.phase3.buffettTotalJa} />
                  {bursa.phase3.buffettRows.map((row) => (
                    <View key={`buffett-${row.labelJa}`} style={styles.trendYearBlock}>
                      <Row label={row.labelJa} value={row.scoreJa} />
                      <SelectableText style={styles.bullet}>· {row.reasonJa}</SelectableText>
                    </View>
                  ))}
                </Section>

                <Section title="【AI投資判断】">
                  <Row label="分類" value={bursa.phase3.enhancedInvestmentTypeJa} />
                  <Text style={styles.aiCommentTitle}>理由</Text>
                  {bursa.phase3.enhancedJudgmentReasonsJa.map((r, i) => (
                    <SelectableText key={`p3-reason-${i}`} style={styles.bullet}>
                      · {r}
                    </SelectableText>
                  ))}
                </Section>
              </>
            ) : null}

            <Section title="【市場データ · Twelve Data】">
              <Row label="現在価格" value={marketData.currentPriceJa} />
              <Row label="出来高" value={marketData.volumeJa} />
              <Row label="市場ステータス" value={marketData.marketStatusJa} />
            </Section>

            <Section title="【ニュース · News API】">
              <Row label="ポジティブ件数" value={String(news.positiveCount)} />
              <Row label="ネガティブ件数" value={String(news.negativeCount)} />
              <Row label="最新ニュース" value={news.latestNewsJa} />
            </Section>
          </>
        ) : (
          <>
            <Section title="【企業概要】">
              <Row label="会社名" value={overview.companyName} />
              <Row label="市場" value={overview.marketLabelJa} />
              <Row label="業種" value={overview.sectorJa} />
              <Row label="事業内容" value={overview.businessDescriptionJa} />
            </Section>

            <Section title="【財務】">
              <Row label="売上" value={financials.revenueJa} />
              <Row label="営業利益" value={financials.operatingIncomeJa} />
              <Row label="純利益" value={financials.netIncomeJa} />
              <Row label="EPS" value={financials.epsJa} />
              <Row label="時価総額" value={financials.marketCapJa} />
            </Section>

            <Section title="【市場データ · Twelve Data】">
              <Row label="現在価格" value={marketData.currentPriceJa} />
              <Row label="出来高" value={marketData.volumeJa} />
              <Row label="市場ステータス" value={marketData.marketStatusJa} />
            </Section>

            <Section title="【配当】">
              <Row label="配当利回り" value={dividend.yieldLabelJa} />
              <Row label="配当推移" value={dividend.trendJa} />
              <Row label="配当安全性" value={dividend.safetyJa} />
            </Section>

            <Section title="【財務健全性】">
              <Row label="自己資本比率" value={health.equityRatioJa} />
              <Row label="負債比率" value={health.debtRatioJa} />
              <Row label="キャッシュフロー" value={health.cashFlowJa} />
            </Section>

            <Section title="【競争力】">
              <Row label="参入障壁" value={competitiveness.entryBarrierJa} />
              <Row label="ブランド力" value={competitiveness.brandPowerJa} />
              <Row label="市場シェア" value={competitiveness.marketShareJa} />
            </Section>

            <Section title="【ニュース · News API】">
              <Row label="ポジティブ件数" value={String(news.positiveCount)} />
              <Row label="ネガティブ件数" value={String(news.negativeCount)} />
              <Row label="最新ニュース" value={news.latestNewsJa} />
            </Section>
          </>
        )}

        <Section title="【リスク】">
          {risk.items.map((item, i) => (
            <SelectableText key={`risk-${i}`} style={styles.bullet}>
              {i + 1}. {item}
            </SelectableText>
          ))}
        </Section>

        <Section title="【AI評価】">
          <DimBar label="成長性" score={evaluation.growth} available={evaluation.availability.growth} />
          <DimBar label="収益性" score={evaluation.profitability} available={evaluation.availability.profitability} />
          <DimBar label="安定性" score={evaluation.stability} available={evaluation.availability.stability} />
          <DimBar label="割安度" score={evaluation.value} available={evaluation.availability.value} />
          <DimBar label="配当魅力" score={evaluation.dividendAppeal} available={evaluation.availability.dividendAppeal} />

          <View style={styles.compositeBox}>
            <Text style={styles.compositeLabel}>総合スコア</Text>
            <Text style={styles.compositeScore}>
              {evaluation.compositeScore != null ? `${evaluation.compositeScore}/100` : SHIKIHO_MISSING_JA}
            </Text>
            <Text style={styles.compositeRank}>総合ランク {gradeLabel(evaluation.overallRank)}</Text>
          </View>

          <View style={styles.subGradeGrid}>
            <Text style={styles.subGradeItem}>配当 {gradeLabel(subGrades.dividend)}</Text>
            <Text style={styles.subGradeItem}>財務 {gradeLabel(subGrades.financial)}</Text>
            <Text style={styles.subGradeItem}>リスク {gradeLabel(subGrades.risk)}</Text>
            <Text style={styles.subGradeItem}>安定性 {gradeLabel(subGrades.businessStability)}</Text>
            <Text style={styles.subGradeItem}>競争力 {gradeLabel(subGrades.competitive)}</Text>
          </View>

          <Text style={styles.aiCommentTitle}>AIコメント</Text>
          <SelectableText style={styles.aiCommentBody}>{evaluation.commentJa}</SelectableText>
        </Section>

        <Section title="【データ取得状況】">
          <Row label="Yahoo Finance" value={report.sourceStatus.yahooFinance} />
          <Row label="Twelve Data" value={report.sourceStatus.twelveData} />
          <Row label="News API" value={report.sourceStatus.newsApi} />
          <Row label="Bursa Malaysia" value={report.sourceStatus.bursaMalaysia} />
          <Row label="取得済み" value={report.fetchedFields.join(', ') || SHIKIHO_MISSING_JA} />
          <Row label="未取得" value={report.missingFields.join(', ') || 'なし'} />
          {report.apiLimitNotes.map((note, i) => (
            <SelectableText key={`limit-${i}`} style={styles.limitNote}>
              · {note}
            </SelectableText>
          ))}
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
  bullet: { fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 22, marginBottom: 4 },
  dimRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  dimLabel: { width: 64, fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  dimMissing: { flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  dimBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dimBarFill: { height: '100%', backgroundColor: theme.colors.primary },
  dimScore: { width: 56, fontSize: 11, color: theme.colors.text, textAlign: 'right' },
  compositeBox: {
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  compositeLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  compositeScore: { fontSize: 32, fontWeight: '800', color: theme.colors.primary },
  compositeRank: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.success },
  subGradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  subGradeItem: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  aiCommentTitle: { fontWeight: '700', fontSize: theme.fontSize.sm, marginTop: 12, marginBottom: 4 },
  aiCommentBody: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, lineHeight: 20 },
  limitNote: { fontSize: 11, color: theme.colors.textMuted, lineHeight: 16, marginTop: 4 },
  trendYearBlock: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  trendYearTitle: { fontWeight: '700', color: theme.colors.primary, marginBottom: 4 },
  subSectionTitle: {
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 8,
    marginBottom: 4,
  },
  chartCaption: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 8 },
  error: { color: theme.colors.danger, padding: theme.spacing.md },
});
