import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BeginnerStockSummaryCard } from '../components/beginner/BeginnerStockSummaryCard';
import { BeginnerTodayAdviceCard } from '../components/beginner/BeginnerTodayAdviceCard';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import { useAppUxMode } from '../context/AppUxModeContext';
import { useBursaMaterial } from '../context/BursaMaterialContext';
import { useProactiveConciergeOptional } from '../context/ProactiveConciergeContext';
import type { RootStackParamList } from '../navigation/types';
import { buildBeginnerTodayAdvice } from '../services/beginner/beginnerTodayAdviceBuilder';
import { buildBeginnerStockSummary } from '../services/beginner/beginnerMaterialSummaryBuilder';
import { resolvePortfolioAiEvaluation } from '../services/portfolioAiEvaluationFromStrategyBundle';
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
  hidePhaseSections = false,
}: {
  row: MaterialStockRow;
  onPress: () => void;
  hidePhaseSections?: boolean;
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

      {!hidePhaseSections ? (
        <>
      <Text style={styles.subLabel}>Phase13 Earnings Call</Text>
      <Text style={styles.item}>{row.earningsCallEvaluationJa}</Text>
      {row.earningsCallDisplayJa ? (
        <>
          <Text style={styles.item}>経営陣トーン: {row.earningsCallDisplayJa.managementTone}</Text>
          <Text style={styles.item}>ガイダンス: {row.earningsCallDisplayJa.guidance}</Text>
          <Text style={styles.item}>Q&A警戒点: {row.earningsCallDisplayJa.qaWatchpoints}</Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase14 Analyst Consensus</Text>
      <Text style={styles.item}>{row.analystConsensusEvaluationJa}</Text>
      {row.analystConsensusDisplayJa ? (
        <>
          <Text style={styles.item}>Rating: {row.analystConsensusDisplayJa.rating}</Text>
          <Text style={styles.item}>
            Target Price: {row.analystConsensusDisplayJa.targetPrice}（Upside{' '}
            {row.analystConsensusDisplayJa.upside}）
          </Text>
          <Text style={styles.item}>Analyst Count: {row.analystConsensusDisplayJa.analystCount}</Text>
          <Text style={styles.item}>EPS Forecast: {row.analystConsensusDisplayJa.epsForecast}</Text>
          <Text style={styles.item}>
            Revenue Forecast: {row.analystConsensusDisplayJa.revenueForecast}
          </Text>
          <Text style={styles.item}>Consensus Trend: {row.analystConsensusDisplayJa.trend}</Text>
          <Text style={styles.item}>
            Confidence Score: {row.analystConsensusDisplayJa.confidence}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase24 Analyst Consensus Intelligence</Text>
      <Text style={styles.item}>{row.analystConsensusIntelligenceEvaluationJa}</Text>
      {row.analystConsensusIntelligenceDisplayJa ? (
        <>
          <Text style={styles.item}>
            Source: {row.analystConsensusIntelligenceDisplayJa.source}
          </Text>
          <Text style={styles.item}>
            Consensus: {row.analystConsensusIntelligenceDisplayJa.consensusRating} · Analysts:{' '}
            {row.analystConsensusIntelligenceDisplayJa.analystCount}
          </Text>
          <Text style={styles.item}>
            Target: {row.analystConsensusIntelligenceDisplayJa.targetPrice} · Current:{' '}
            {row.analystConsensusIntelligenceDisplayJa.currentPrice} · Upside:{' '}
            {row.analystConsensusIntelligenceDisplayJa.impliedUpsidePct}
          </Text>
          <Text style={styles.item}>
            Score: {row.analystConsensusIntelligenceDisplayJa.consensusScore} · Confidence:{' '}
            {row.analystConsensusIntelligenceDisplayJa.confidence}
          </Text>
          <Text style={styles.item}>
            Rating Revision: {row.analystConsensusIntelligenceDisplayJa.ratingRevisionDirection} ·
            Target Revision: {row.analystConsensusIntelligenceDisplayJa.targetRevisionDirection} (
            {row.analystConsensusIntelligenceDisplayJa.targetRevisionPct})
          </Text>
          {row.analystConsensusIntelligenceDisplayJa.warnings !== '—' ? (
            <Text style={styles.item}>
              Warnings: {row.analystConsensusIntelligenceDisplayJa.warnings}
            </Text>
          ) : null}
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase15 Insider Trading</Text>
      <Text style={styles.item}>{row.insiderTradingEvaluationJa}</Text>
      {row.insiderTradingDisplayJa ? (
        <>
          <Text style={styles.item}>
            最新取引日: {row.insiderTradingDisplayJa.latestTransactionDate}
          </Text>
          <Text style={styles.item}>売買区分: {row.insiderTradingDisplayJa.transactionType}</Text>
          <Text style={styles.item}>
            Insider: {row.insiderTradingDisplayJa.insiderName}（{row.insiderTradingDisplayJa.insiderRole}）
          </Text>
          <Text style={styles.item}>株数: {row.insiderTradingDisplayJa.transactionValue}</Text>
          <Text style={styles.item}>
            90日 買{row.insiderTradingDisplayJa.buyCount90d} / 売{row.insiderTradingDisplayJa.sellCount90d}
          </Text>
          <Text style={styles.item}>ネット: {row.insiderTradingDisplayJa.netActivity}</Text>
          <Text style={styles.item}>
            Confidence: {row.insiderTradingDisplayJa.confidence}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase16 Institutional Ownership</Text>
      <Text style={styles.item}>{row.institutionalOwnershipEvaluationJa}</Text>
      {row.institutionalOwnershipDisplayJa ? (
        <>
          <Text style={styles.item}>
            保有機関数: {row.institutionalOwnershipDisplayJa.holderCount}
          </Text>
          <Text style={styles.item}>
            上位3機関: {row.institutionalOwnershipDisplayJa.topHolders}
          </Text>
          <Text style={styles.item}>
            直近増減: {row.institutionalOwnershipDisplayJa.recentChange}
          </Text>
          <Text style={styles.item}>Net Flow: {row.institutionalOwnershipDisplayJa.netFlow}</Text>
          <Text style={styles.item}>
            Confidence: {row.institutionalOwnershipDisplayJa.confidence}
          </Text>
          {row.institutionalOwnershipDisplayJa.holders.map((h, i) => (
            <Text key={`inst-${i}`} style={styles.item}>
              {h.name}: {h.holdingPct}（{h.changeRate}）最新 {h.latestReportDate}
            </Text>
          ))}
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase16.5 Institutional Trend</Text>
      <Text style={styles.item}>{row.institutionalTrendEvaluationJa}</Text>
      {row.institutionalTrendDisplayJa ? (
        <>
          <Text style={styles.item}>
            前回 {row.institutionalTrendDisplayJa.previousHoldingPercent} → 現在{' '}
            {row.institutionalTrendDisplayJa.currentHoldingPercent}
          </Text>
          <Text style={styles.item}>増減率: {row.institutionalTrendDisplayJa.changePercent}</Text>
          <Text style={styles.item}>
            3M: {row.institutionalTrendDisplayJa.threeMonthTrend} / 6M:{' '}
            {row.institutionalTrendDisplayJa.sixMonthTrend} / 12M:{' '}
            {row.institutionalTrendDisplayJa.twelveMonthTrend}
          </Text>
          <Text style={styles.item}>Trend: {row.institutionalTrendDisplayJa.trendDirection}</Text>
          <Text style={styles.item}>
            Confidence: {row.institutionalTrendDisplayJa.trendConfidence}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase16.6 Historical Ownership</Text>
      <Text style={styles.item}>{row.historicalOwnershipEvaluationJa}</Text>
      {row.historicalOwnershipDisplayJa ? (
        <>
          <Text style={styles.item}>
            履歴件数: {row.historicalOwnershipDisplayJa.recordCount}
          </Text>
          <Text style={styles.item}>
            3M: {row.historicalOwnershipDisplayJa.threeMonthTrend} / 6M:{' '}
            {row.historicalOwnershipDisplayJa.sixMonthTrend} / 12M:{' '}
            {row.historicalOwnershipDisplayJa.twelveMonthTrend}
          </Text>
          <Text style={styles.item}>
            Trend: {row.historicalOwnershipDisplayJa.trendDirection}
          </Text>
          <Text style={styles.item}>
            Confidence: {row.historicalOwnershipDisplayJa.trendConfidence}
          </Text>
          <Text style={styles.item}>
            直近履歴: {row.historicalOwnershipDisplayJa.topHistory}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase16.8 TOP30 Institution Basket</Text>
      <Text style={styles.item}>{row.fixedInstitutionalBasketEvaluationJa}</Text>
      {row.fixedInstitutionalBasketDisplayJa ? (
        <>
          <Text style={styles.item}>
            対象機関: {row.fixedInstitutionalBasketDisplayJa.pairedInstitutions}（
            {row.fixedInstitutionalBasketDisplayJa.pairedCount}件）
          </Text>
          <Text style={styles.item}>
            3M: {row.fixedInstitutionalBasketDisplayJa.threeMonthTrend} / 6M:{' '}
            {row.fixedInstitutionalBasketDisplayJa.sixMonthTrend} / 12M:{' '}
            {row.fixedInstitutionalBasketDisplayJa.twelveMonthTrend}
          </Text>
          <Text style={styles.item}>
            Trend: {row.fixedInstitutionalBasketDisplayJa.trendDirection}
          </Text>
          <Text style={styles.item}>
            旧→新比較: {row.fixedInstitutionalBasketDisplayJa.comparisonSummary}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase17 Dividend Intelligence</Text>
      <Text style={styles.item}>{row.dividendIntelligenceEvaluationJa}</Text>
      {row.dividendIntelligenceDisplayJa ? (
        <>
          <Text style={styles.item}>
            利回り: {row.dividendIntelligenceDisplayJa.dividendYield} / 配当性向:{' '}
            {row.dividendIntelligenceDisplayJa.payoutRatio}
          </Text>
          <Text style={styles.item}>
            増配率: {row.dividendIntelligenceDisplayJa.dividendGrowthRate} / 連続:{' '}
            {row.dividendIntelligenceDisplayJa.consecutiveDividendYears}年
          </Text>
          <Text style={styles.item}>
            5Y CAGR: {row.dividendIntelligenceDisplayJa.fiveYearCagr} / 頻度:{' '}
            {row.dividendIntelligenceDisplayJa.dividendFrequency}
          </Text>
          <Text style={styles.item}>
            Ex-Date: {row.dividendIntelligenceDisplayJa.exDividendDate} / 支払:{' '}
            {row.dividendIntelligenceDisplayJa.paymentDate}
          </Text>
          <Text style={styles.item}>
            特別配当: {row.dividendIntelligenceDisplayJa.specialDividend} / 持続性:{' '}
            {row.dividendIntelligenceDisplayJa.sustainabilityScore}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase18 News Intelligence</Text>
      <Text style={styles.item}>{row.newsIntelligenceEvaluationJa}</Text>
      {row.newsIntelligenceDisplayJa ? (
        <>
          <Text style={styles.item}>
            記事: {row.newsIntelligenceDisplayJa.articleCount} / 24h:{' '}
            {row.newsIntelligenceDisplayJa.last24hCount}
          </Text>
          <Text style={styles.item}>
            Sentiment B/N/Be: {row.newsIntelligenceDisplayJa.bullishCount} /{' '}
            {row.newsIntelligenceDisplayJa.neutralCount} / {row.newsIntelligenceDisplayJa.bearishCount}
          </Text>
          <Text style={styles.item}>
            Impact: {row.newsIntelligenceDisplayJa.aggregateImpact} (Top{' '}
            {row.newsIntelligenceDisplayJa.topImpactScore}) / ソース:{' '}
            {row.newsIntelligenceDisplayJa.sourceCoverage}
          </Text>
          <Text style={styles.item}>
            {row.newsIntelligenceDisplayJa.impactEngine} · Top [
            {row.newsIntelligenceDisplayJa.topEventType}]: {row.newsIntelligenceDisplayJa.topHeadline}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase19 Macro Intelligence</Text>
      <Text style={styles.item}>{row.macroIntelligenceEvaluationJa}</Text>
      {row.macroIntelligenceDisplayJa ? (
        <>
          <Text style={styles.item}>
            Macro Score: {row.macroIntelligenceDisplayJa.macroScore} (
            {row.macroIntelligenceDisplayJa.macroSentiment})
          </Text>
          <Text style={styles.item}>
            Dashboard B/N/Be: {row.macroIntelligenceDisplayJa.bullishCount} /{' '}
            {row.macroIntelligenceDisplayJa.neutralCount} / {row.macroIntelligenceDisplayJa.bearishCount}{' '}
            · Live {row.macroIntelligenceDisplayJa.liveIndicators}
          </Text>
          <Text style={styles.item}>
            Sector Impact: {row.macroIntelligenceDisplayJa.sectorImpact} (
            {row.macroIntelligenceDisplayJa.sectorSentiment})
          </Text>
          <Text style={styles.item}>
            Bullish: {row.macroIntelligenceDisplayJa.topBullish} · Bearish:{' '}
            {row.macroIntelligenceDisplayJa.topBearish}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase19.5 Sector Rotation</Text>
      <Text style={styles.item}>{row.sectorRotationEvaluationJa}</Text>
      {row.sectorRotationDisplayJa ? (
        <>
          <Text style={styles.item}>
            MI Score: {row.sectorRotationDisplayJa.macroIntelligenceScore} (Macro{' '}
            {row.sectorRotationDisplayJa.macroScore} + Rotation{' '}
            {row.sectorRotationDisplayJa.sectorRotationScore})
          </Text>
          <Text style={styles.item}>
            Rank: {row.sectorRotationDisplayJa.sectorRank} · {row.sectorRotationDisplayJa.scoreDistribution}
          </Text>
          <Text style={styles.item}>
            Top 3: {row.sectorRotationDisplayJa.top3Sectors}
          </Text>
          <Text style={styles.item}>
            Bottom 3: {row.sectorRotationDisplayJa.bottom3Sectors}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase20 Valuation Intelligence</Text>
      <Text style={styles.item}>{row.valuationIntelligenceEvaluationJa}</Text>
      {row.valuationIntelligenceDisplayJa ? (
        <>
          <Text style={styles.item}>
            Score: {row.valuationIntelligenceDisplayJa.valuationScore} · Rating:{' '}
            {row.valuationIntelligenceDisplayJa.valuationRating}
          </Text>
          <Text style={styles.item}>
            PER: {row.valuationIntelligenceDisplayJa.pe} · PBR:{' '}
            {row.valuationIntelligenceDisplayJa.pb} · ROE:{' '}
            {row.valuationIntelligenceDisplayJa.roe}
          </Text>
          <Text style={styles.item}>
            Revenue Growth: {row.valuationIntelligenceDisplayJa.revenueGrowth} · EPS Growth:{' '}
            {row.valuationIntelligenceDisplayJa.epsGrowth} · D/E:{' '}
            {row.valuationIntelligenceDisplayJa.debtEquity}
          </Text>
          <Text style={styles.item}>
            Fair Value: {row.valuationIntelligenceDisplayJa.fairValueJudgment} · 取得率:{' '}
            {row.valuationIntelligenceDisplayJa.fieldAcquisitionRate}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase21 Fair Value Intelligence</Text>
      <Text style={styles.item}>{row.fairValueIntelligenceEvaluationJa}</Text>
      {row.fairValueIntelligenceDisplayJa ? (
        <>
          <Text style={styles.item}>
            現在: {row.fairValueIntelligenceDisplayJa.currentPrice} · 適正:{' '}
            {row.fairValueIntelligenceDisplayJa.fairValueMid} · Range:{' '}
            {row.fairValueIntelligenceDisplayJa.fairValueLow} —{' '}
            {row.fairValueIntelligenceDisplayJa.fairValueHigh}
          </Text>
          <Text style={styles.item}>
            Upside: {row.fairValueIntelligenceDisplayJa.upsidePct} · Downside:{' '}
            {row.fairValueIntelligenceDisplayJa.downsidePct} · MoS:{' '}
            {row.fairValueIntelligenceDisplayJa.marginOfSafetyPct}
          </Text>
          <Text style={styles.item}>
            DCF: {row.fairValueIntelligenceDisplayJa.dcfFairPrice} [
            {row.fairValueIntelligenceDisplayJa.dcfSource}] · DDM:{' '}
            {row.fairValueIntelligenceDisplayJa.ddmFairPrice} [
            {row.fairValueIntelligenceDisplayJa.ddmSource}] · PER:{' '}
            {row.fairValueIntelligenceDisplayJa.perFairPrice} [
            {row.fairValueIntelligenceDisplayJa.perSource}]
          </Text>
          <Text style={styles.item}>
            Score: {row.fairValueIntelligenceDisplayJa.fairValueScore} · 推奨:{' '}
            {row.fairValueIntelligenceDisplayJa.recommendation} · 取得率:{' '}
            {row.fairValueIntelligenceDisplayJa.fieldAcquisitionRate}
          </Text>
          <Text style={styles.item}>
            使用モデル: {row.fairValueIntelligenceDisplayJa.modelsUsed} · 主モデル:{' '}
            {row.fairValueIntelligenceDisplayJa.primaryModel} · 信頼度:{' '}
            {row.fairValueIntelligenceDisplayJa.confidence}
          </Text>
          <Text style={styles.item}>
            DCF未取得理由: {row.fairValueIntelligenceDisplayJa.dcfUnavailableReason}
          </Text>
          <Text style={styles.item}>
            DDM未取得理由: {row.fairValueIntelligenceDisplayJa.ddmUnavailableReason}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase22 Analyst Target Intelligence</Text>
      <Text style={styles.item}>{row.analystTargetIntelligenceEvaluationJa}</Text>
      {row.analystTargetIntelligenceDisplayJa ? (
        <>
          <Text style={styles.item}>
            Target Median: {row.analystTargetIntelligenceDisplayJa.targetMedian} · Mean:{' '}
            {row.analystTargetIntelligenceDisplayJa.targetMean}
          </Text>
          <Text style={styles.item}>
            Bull: {row.analystTargetIntelligenceDisplayJa.bullTarget} · Bear:{' '}
            {row.analystTargetIntelligenceDisplayJa.bearTarget} · Coverage:{' '}
            {row.analystTargetIntelligenceDisplayJa.coverageCount}
          </Text>
          <Text style={styles.item}>
            現在: {row.analystTargetIntelligenceDisplayJa.currentPrice} · Upside:{' '}
            {row.analystTargetIntelligenceDisplayJa.upsidePct} · Downside:{' '}
            {row.analystTargetIntelligenceDisplayJa.downsidePct}
          </Text>
          <Text style={styles.item}>
            Target Trend: {row.analystTargetIntelligenceDisplayJa.targetTrend} · 推奨分布:{' '}
            {row.analystTargetIntelligenceDisplayJa.recommendationDistribution}
          </Text>
          <Text style={styles.item}>
            Analyst Score: {row.analystTargetIntelligenceDisplayJa.analystScore} · 取得率:{' '}
            {row.analystTargetIntelligenceDisplayJa.fieldAcquisitionRate} · 出典:{' '}
            {row.analystTargetIntelligenceDisplayJa.source}
          </Text>
          <Text style={styles.item}>
            Fair Value: {row.analystTargetIntelligenceDisplayJa.fairValueMid} vs Analyst Target:{' '}
            {row.analystTargetIntelligenceDisplayJa.targetMedian} · 差:{' '}
            {row.analystTargetIntelligenceDisplayJa.fairValueVsAnalystDiffPct} · 判定:{' '}
            {row.analystTargetIntelligenceDisplayJa.fairValueVsAnalystJudgment}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase22.1 Valuation Gap Intelligence</Text>
      <Text style={styles.item}>{row.valuationGapIntelligenceEvaluationJa}</Text>
      {row.valuationGapIntelligenceDisplayJa ? (
        <>
          <Text style={styles.item}>
            Fair Value: {row.valuationGapIntelligenceDisplayJa.fairValue} · Analyst Target:{' '}
            {row.valuationGapIntelligenceDisplayJa.analystTarget}
          </Text>
          <Text style={styles.item}>
            Gap: {row.valuationGapIntelligenceDisplayJa.gapPct} · 分類:{' '}
            {row.valuationGapIntelligenceDisplayJa.gapClassification}
          </Text>
          <Text style={styles.item}>
            Valuation Gap Score: {row.valuationGapIntelligenceDisplayJa.valuationGapScore}
          </Text>
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase23 Earnings Revision Intelligence</Text>
      <Text style={styles.item}>{row.earningsRevisionIntelligenceEvaluationJa}</Text>
      {row.earningsRevisionIntelligenceDisplayJa ? (
        <>
          <Text style={styles.item}>
            EPS Estimate: {row.earningsRevisionIntelligenceDisplayJa.epsEstimateCurrentFy} →{' '}
            {row.earningsRevisionIntelligenceDisplayJa.epsEstimateNextFy}
          </Text>
          <Text style={styles.item}>
            EPS Revision 30D: {row.earningsRevisionIntelligenceDisplayJa.epsRevision30d} · 90D:{' '}
            {row.earningsRevisionIntelligenceDisplayJa.epsRevision90d}
          </Text>
          <Text style={styles.item}>
            Revenue Revision 30D: {row.earningsRevisionIntelligenceDisplayJa.revenueRevision30d}
          </Text>
          <Text style={styles.item}>
            Upgrade: {row.earningsRevisionIntelligenceDisplayJa.upgradeCount} · Downgrade:{' '}
            {row.earningsRevisionIntelligenceDisplayJa.downgradeCount}
          </Text>
          <Text style={styles.item}>
            Direction: {row.earningsRevisionIntelligenceDisplayJa.revisionDirection} · Score:{' '}
            {row.earningsRevisionIntelligenceDisplayJa.revisionScore}
          </Text>
          <Text style={styles.item}>
            Confidence: {row.earningsRevisionIntelligenceDisplayJa.revisionConfidence} · Source:{' '}
            {row.earningsRevisionIntelligenceDisplayJa.source}
          </Text>
          {row.earningsRevisionIntelligenceDisplayJa.unavailableReason !== 'データ未取得' ? (
            <Text style={styles.item}>
              未取得理由: {row.earningsRevisionIntelligenceDisplayJa.unavailableReason}
            </Text>
          ) : null}
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase23.1 Earnings Revision Cross Signal</Text>
      <Text style={styles.item}>{row.earningsRevisionCrossSignalEvaluationJa}</Text>
      {row.earningsRevisionCrossSignalDisplayJa ? (
        <>
          <Text style={styles.item}>
            Cross Signal: {row.earningsRevisionCrossSignalDisplayJa.crossSignalDirection}
          </Text>
          <Text style={styles.item}>
            Direction: {row.earningsRevisionCrossSignalDisplayJa.crossSignalDirection} · Score:{' '}
            {row.earningsRevisionCrossSignalDisplayJa.crossSignalScore}
          </Text>
          <Text style={styles.item}>
            Alignment: {row.earningsRevisionCrossSignalDisplayJa.alignmentCount} — Revision:{' '}
            {row.earningsRevisionCrossSignalDisplayJa.revisionBias} · Insider:{' '}
            {row.earningsRevisionCrossSignalDisplayJa.insiderBias} · Institutional:{' '}
            {row.earningsRevisionCrossSignalDisplayJa.institutionalBias}
          </Text>
          <Text style={styles.item}>
            Confidence: {row.earningsRevisionCrossSignalDisplayJa.confidence} · Material Impact:{' '}
            {row.earningsRevisionCrossSignalMaterialImpactJa}
          </Text>
          {row.earningsRevisionCrossSignalDisplayJa.unavailableReason !== '—' ? (
            <Text style={styles.item}>
              備考: {row.earningsRevisionCrossSignalDisplayJa.unavailableReason}
            </Text>
          ) : null}
        </>
      ) : null}

      <Text style={styles.subLabel}>Phase22.2 Conviction Intelligence</Text>
      <Text style={styles.item}>{row.convictionIntelligenceEvaluationJa}</Text>
      {row.convictionIntelligenceDisplayJa ? (
        <>
          <Text style={styles.item}>
            Fair Value: {row.convictionIntelligenceDisplayJa.fairValue} · Analyst:{' '}
            {row.convictionIntelligenceDisplayJa.analystTarget} · Gap:{' '}
            {row.convictionIntelligenceDisplayJa.gapPct}
          </Text>
          <Text style={styles.item}>
            Coverage: {row.convictionIntelligenceDisplayJa.coverageCount} · Trend:{' '}
            {row.convictionIntelligenceDisplayJa.analystTrend} · FV Confidence:{' '}
            {row.convictionIntelligenceDisplayJa.valuationConfidence}
          </Text>
          <Text style={styles.item}>
            DCF: {row.convictionIntelligenceDisplayJa.dcfUsed} · DDM:{' '}
            {row.convictionIntelligenceDisplayJa.ddmUsed} · 信頼:{' '}
            {row.convictionIntelligenceDisplayJa.trustedSource}
          </Text>
          <Text style={styles.item}>
            Conviction: {row.convictionIntelligenceDisplayJa.convictionLevel} · Confidence:{' '}
            {row.convictionIntelligenceDisplayJa.convictionConfidence} · Score:{' '}
            {row.convictionIntelligenceDisplayJa.convictionScore}
          </Text>
          <Text style={styles.item}>{row.convictionIntelligenceDisplayJa.reasonLine1}</Text>
          <Text style={styles.item}>{row.convictionIntelligenceDisplayJa.reasonLine2}</Text>
          <Text style={styles.item}>{row.convictionIntelligenceDisplayJa.reasonLine3}</Text>
        </>
      ) : null}
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
  const { isBeginnerMode } = useAppUxMode();
  const { state, isPractice } = useApp();
  const proactive = useProactiveConciergeOptional();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const beginnerAdvice = useMemo(
    () =>
      buildBeginnerTodayAdvice({
        holdings: isPractice ? state.practice.portfolio : state.portfolio,
        materialReport: report,
        strategyBundle: proactive?.strategyBundle ?? null,
        loading: loading && !report,
      }),
    [isPractice, state.portfolio, state.practice.portfolio, report, loading, proactive?.strategyBundle],
  );

  const heldSymbols = useMemo(() => {
    const set = new Set<string>();
    const holdings = isPractice ? state.practice.portfolio : state.portfolio;
    for (const h of holdings) {
      if (h.shares > 0) set.add(h.symbol.trim().toUpperCase());
    }
    return set;
  }, [isPractice, state.portfolio, state.practice.portfolio]);

  const portfolioEval = useMemo(() => {
    const bundle = proactive?.strategyBundle;
    if (!bundle) return null;
    return resolvePortfolioAiEvaluation(bundle);
  }, [proactive?.strategyBundle]);

  const beginnerStockSummaries = useMemo(() => {
    if (!report || !isBeginnerMode) return [];
    return report.stocks.map((row) => {
      const sym = row.stockCode.trim().toUpperCase();
      const evalRow =
        portfolioEval?.rankedHoldings.find(
          (e) => e.symbol.trim().toUpperCase() === sym,
        ) ?? null;
      return buildBeginnerStockSummary({
        materialRow: row,
        isHeld: heldSymbols.has(sym),
        fusedAction: evalRow?.action ?? 'hold',
        finalScore: evalRow?.finalScore,
        confidencePct: evalRow?.confidence,
      });
    });
  }, [report, isBeginnerMode, heldSymbols, portfolioEval]);

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
        <Text style={styles.pageTitle}>{isBeginnerMode ? '銘柄チェック' : '材料分析'}</Text>
        {isBeginnerMode ? (
          <BeginnerTodayAdviceCard data={beginnerAdvice} />
        ) : null}
        {!isBeginnerMode ? (
          <>
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
          </>
        ) : (
          <Pressable onPress={onRefresh} style={styles.beginnerRefresh}>
            <Text style={styles.refresh}>更新</Text>
          </Pressable>
        )}

        {isBeginnerMode ? (
          <Section title="【銘柄チェック】">
            {beginnerStockSummaries.map((summary) => (
              <BeginnerStockSummaryCard key={summary.symbol} summary={summary} />
            ))}
          </Section>
        ) : (
        <Section title="【銘柄別材料分析】">
          {report.stocks.map((row) => (
            <StockMaterialCard
              key={row.stockCode}
              row={row}
              hidePhaseSections={false}
              onPress={() =>
                navigation.navigate('StockReport', { symbol: row.stockCode, market: 'bursa' })
              }
            />
          ))}
        </Section>
        )}

        {!isBeginnerMode ? (
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
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text, marginBottom: 4 },
  liveTag: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: 8 },
  refresh: { color: theme.colors.primary, fontWeight: '600', marginBottom: 12 },
  beginnerRefresh: { alignSelf: 'flex-end', marginBottom: 8 },
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
