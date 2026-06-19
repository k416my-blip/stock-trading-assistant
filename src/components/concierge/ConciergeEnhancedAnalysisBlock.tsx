import { StyleSheet, Text, View } from 'react-native';
import type { ConciergeEnhancedAnalysisReport } from '../../types/conciergeEnhancedAnalysis';
import { listKey } from '../../utils/reactKeyDiagnostics';
import { theme } from '../../theme';

type Props = {
  report: ConciergeEnhancedAnalysisReport;
};

function fmtSourceScore(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '' : '+';
  return `${sign}${n}`;
}

export function ConciergeEnhancedAnalysisBlock({ report }: Props) {
  const ev = report.sourceEvaluationsJa;

  return (
    <View
      style={styles.wrap}
      testID="concierge-enhanced-analysis"
      accessibilityLabel="AI分析結果"
    >
      <Text style={styles.title}>AI分析結果</Text>

      <Text selectable style={styles.row}>
        <Text style={styles.key}>1. 銘柄名: </Text>
        {report.stockNameJa}
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>2. 現在株価: </Text>
        {report.currentPriceJa}
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>3. 保有株数: </Text>
        {report.sharesJa}
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>4. 評価額: </Text>
        {report.marketValueJa}
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>5. 含み損益: </Text>
        {report.unrealizedPnlJa}
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>6. 総合判定: </Text>
        <Text style={styles.judgment}>{report.overallJudgmentJa}</Text>
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>7. 確信度: </Text>
        {report.confidencePct}%
      </Text>

      {report.judgmentReasonsJa.length > 0 ? (
        <>
          <Text style={styles.sectionMuted}>判断理由</Text>
          {report.judgmentReasonsJa.map((line, i) => (
            <Text key={listKey('reason', i, line)} selectable style={styles.bullet}>
              · {line}
            </Text>
          ))}
        </>
      ) : null}

      <Text selectable style={styles.row}>
        <Text style={styles.key}>8. Earnings Call評価: </Text>
        {ev.earningsCall}
      </Text>
      {report.earningsCallDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            経営陣トーン: {report.earningsCallDetailJa.managementTone}
          </Text>
          <Text selectable style={styles.sourceLine}>
            ガイダンス: {report.earningsCallDetailJa.guidance}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Q&A警戒点: {report.earningsCallDetailJa.qaWatchpoints}
          </Text>
        </>
      ) : null}

      <Text selectable style={styles.row}>
        <Text style={styles.key}>9. Analyst Consensus評価: </Text>
        {ev.analystConsensus}
      </Text>
      {report.analystConsensusDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            Rating: {report.analystConsensusDetailJa.rating}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Target Price: {report.analystConsensusDetailJa.targetPrice}（Upside{' '}
            {report.analystConsensusDetailJa.upside}）
          </Text>
          <Text selectable style={styles.sourceLine}>
            Analyst Count: {report.analystConsensusDetailJa.analystCount}
          </Text>
          <Text selectable style={styles.sourceLine}>
            EPS Forecast: {report.analystConsensusDetailJa.epsForecast}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Revenue Forecast: {report.analystConsensusDetailJa.revenueForecast}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Consensus Trend: {report.analystConsensusDetailJa.trend}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Confidence Score: {report.analystConsensusDetailJa.confidence}
          </Text>
        </>
      ) : null}

      <Text selectable style={styles.row}>
        <Text style={styles.key}>9-A. Analyst Consensus Intelligence (Phase24): </Text>
        {ev.analystConsensusIntelligence}
      </Text>
      {report.analystConsensusIntelligenceDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            Source: {report.analystConsensusIntelligenceDetailJa.source} · Consensus:{' '}
            {report.analystConsensusIntelligenceDetailJa.consensusRating} · Analysts:{' '}
            {report.analystConsensusIntelligenceDetailJa.analystCount}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Target: {report.analystConsensusIntelligenceDetailJa.targetPrice} · Current:{' '}
            {report.analystConsensusIntelligenceDetailJa.currentPrice} · Upside:{' '}
            {report.analystConsensusIntelligenceDetailJa.impliedUpsidePct}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Score: {report.analystConsensusIntelligenceDetailJa.consensusScore} · Confidence:{' '}
            {report.analystConsensusIntelligenceDetailJa.confidence}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Rating Revision: {report.analystConsensusIntelligenceDetailJa.ratingRevisionDirection} ·
            Target Revision: {report.analystConsensusIntelligenceDetailJa.targetRevisionDirection}
          </Text>
        </>
      ) : null}

      <Text selectable style={styles.row}>
        <Text style={styles.key}>10. Insider売買評価: </Text>
        {ev.insiderTrading}
      </Text>
      {report.insiderTradingDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            最新取引日: {report.insiderTradingDetailJa.latestTransactionDate}
          </Text>
          <Text selectable style={styles.sourceLine}>
            売買区分: {report.insiderTradingDetailJa.transactionType}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Insider: {report.insiderTradingDetailJa.insiderName}（{report.insiderTradingDetailJa.insiderRole}）
          </Text>
          <Text selectable style={styles.sourceLine}>
            株数/金額: {report.insiderTradingDetailJa.transactionValue}
          </Text>
          <Text selectable style={styles.sourceLine}>
            90日 買{report.insiderTradingDetailJa.buyCount90d} / 売{report.insiderTradingDetailJa.sellCount90d}
          </Text>
          <Text selectable style={styles.sourceLine}>
            ネット: {report.insiderTradingDetailJa.netActivity}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Confidence: {report.insiderTradingDetailJa.confidence}
          </Text>
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>11. Institutional Ownership評価: </Text>
        {ev.institutionalOwnership}
      </Text>
      {report.institutionalOwnershipDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            保有機関数: {report.institutionalOwnershipDetailJa.holderCount}
          </Text>
          <Text selectable style={styles.sourceLine}>
            上位3機関: {report.institutionalOwnershipDetailJa.topHolders}
          </Text>
          <Text selectable style={styles.sourceLine}>
            直近増減: {report.institutionalOwnershipDetailJa.recentChange}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Net Flow: {report.institutionalOwnershipDetailJa.netFlow}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Confidence: {report.institutionalOwnershipDetailJa.confidence}
          </Text>
          {report.institutionalOwnershipDetailJa.holders.slice(0, 5).map((h, i) => (
            <Text key={listKey('inst', i, h.name)} selectable style={styles.sourceLine}>
              {h.name}: {h.holdingPct}（{h.changeRate}）{h.latestReportDate}
            </Text>
          ))}
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>12. Institutional Trend評価: </Text>
        {ev.institutionalTrend}
      </Text>
      {report.institutionalTrendDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            前回保有: {report.institutionalTrendDetailJa.previousHoldingPercent} → 現在{' '}
            {report.institutionalTrendDetailJa.currentHoldingPercent}
          </Text>
          <Text selectable style={styles.sourceLine}>
            増減率: {report.institutionalTrendDetailJa.changePercent}
          </Text>
          <Text selectable style={styles.sourceLine}>
            3M: {report.institutionalTrendDetailJa.threeMonthTrend} / 6M:{' '}
            {report.institutionalTrendDetailJa.sixMonthTrend} / 12M:{' '}
            {report.institutionalTrendDetailJa.twelveMonthTrend}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Trend: {report.institutionalTrendDetailJa.trendDirection}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Confidence: {report.institutionalTrendDetailJa.trendConfidence}
          </Text>
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>13. Dividend Intelligence評価: </Text>
        {ev.dividendIntelligence}
      </Text>
      {report.dividendIntelligenceDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            利回り: {report.dividendIntelligenceDetailJa.dividendYield} / 配当性向:{' '}
            {report.dividendIntelligenceDetailJa.payoutRatio}
          </Text>
          <Text selectable style={styles.sourceLine}>
            増配率: {report.dividendIntelligenceDetailJa.dividendGrowthRate} / 連続年数:{' '}
            {report.dividendIntelligenceDetailJa.consecutiveDividendYears}
          </Text>
          <Text selectable style={styles.sourceLine}>
            5Y CAGR: {report.dividendIntelligenceDetailJa.fiveYearCagr} / 頻度:{' '}
            {report.dividendIntelligenceDetailJa.dividendFrequency}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Ex-Date: {report.dividendIntelligenceDetailJa.exDividendDate} / 支払:{' '}
            {report.dividendIntelligenceDetailJa.paymentDate}
          </Text>
          <Text selectable style={styles.sourceLine}>
            特別配当: {report.dividendIntelligenceDetailJa.specialDividend} / 持続性:{' '}
            {report.dividendIntelligenceDetailJa.sustainabilityScore}
          </Text>
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>14. News Intelligence評価: </Text>
        {ev.newsIntelligence}
      </Text>
      {report.newsIntelligenceDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            記事: {report.newsIntelligenceDetailJa.articleCount}件 / 24h:{' '}
            {report.newsIntelligenceDetailJa.last24hCount}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Sentiment: B{report.newsIntelligenceDetailJa.bullishCount} / N
            {report.newsIntelligenceDetailJa.neutralCount} / Be
            {report.newsIntelligenceDetailJa.bearishCount}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Impact: {report.newsIntelligenceDetailJa.aggregateImpact} (Top{' '}
            {report.newsIntelligenceDetailJa.topImpactScore}) / ソース:{' '}
            {report.newsIntelligenceDetailJa.sourceCoverage}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Engine: {report.newsIntelligenceDetailJa.impactEngine} · Top: [
            {report.newsIntelligenceDetailJa.topEventType}]{' '}
            {report.newsIntelligenceDetailJa.topHeadline}
          </Text>
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>15. Macro Intelligence評価: </Text>
        {ev.macroIntelligence}
      </Text>
      {report.macroIntelligenceDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            Macro Score: {report.macroIntelligenceDetailJa.macroScore} ({report.macroIntelligenceDetailJa.macroSentiment})
          </Text>
          <Text selectable style={styles.sourceLine}>
            Dashboard: B{report.macroIntelligenceDetailJa.bullishCount} / N
            {report.macroIntelligenceDetailJa.neutralCount} / Be
            {report.macroIntelligenceDetailJa.bearishCount} · Live{' '}
            {report.macroIntelligenceDetailJa.liveIndicators}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Sector Impact: {report.macroIntelligenceDetailJa.sectorImpact} (
            {report.macroIntelligenceDetailJa.sectorSentiment})
          </Text>
          <Text selectable style={styles.sourceLine}>
            Bullish: {report.macroIntelligenceDetailJa.topBullish} · Bearish:{' '}
            {report.macroIntelligenceDetailJa.topBearish}
          </Text>
          {report.macroIntelligenceDetailJa.rotationSummary ? (
            <>
              <Text selectable style={styles.sourceLine}>
                Rotation: {report.macroIntelligenceDetailJa.sectorRotationScore} → MI{' '}
                {report.macroIntelligenceDetailJa.macroIntelligenceScore}
              </Text>
              <Text selectable style={styles.sourceLine}>
                Top3: {report.macroIntelligenceDetailJa.top3Sectors} · Bottom3:{' '}
                {report.macroIntelligenceDetailJa.bottom3Sectors}
              </Text>
            </>
          ) : null}
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>Valuation Intelligence評価: </Text>
        {ev.valuationIntelligence}
      </Text>
      {report.valuationIntelligenceDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            Score: {report.valuationIntelligenceDetailJa.valuationScore} · Rating:{' '}
            {report.valuationIntelligenceDetailJa.valuationRating}
          </Text>
          <Text selectable style={styles.sourceLine}>
            PER: {report.valuationIntelligenceDetailJa.pe} · PBR:{' '}
            {report.valuationIntelligenceDetailJa.pb} · ROE:{' '}
            {report.valuationIntelligenceDetailJa.roe}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Revenue: {report.valuationIntelligenceDetailJa.revenueGrowth} · EPS:{' '}
            {report.valuationIntelligenceDetailJa.epsGrowth} · D/E:{' '}
            {report.valuationIntelligenceDetailJa.debtEquity}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Fair Value: {report.valuationIntelligenceDetailJa.fairValueJudgment} · 取得率:{' '}
            {report.valuationIntelligenceDetailJa.fieldAcquisitionRate}
          </Text>
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>Fair Value Intelligence評価: </Text>
        {ev.fairValueIntelligence}
      </Text>
      {report.fairValueIntelligenceDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            現在: {report.fairValueIntelligenceDetailJa.currentPrice} · 適正:{' '}
            {report.fairValueIntelligenceDetailJa.fairValueMid} · Range:{' '}
            {report.fairValueIntelligenceDetailJa.fairValueLow} —{' '}
            {report.fairValueIntelligenceDetailJa.fairValueHigh}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Upside: {report.fairValueIntelligenceDetailJa.upsidePct} · Downside:{' '}
            {report.fairValueIntelligenceDetailJa.downsidePct} · MoS:{' '}
            {report.fairValueIntelligenceDetailJa.marginOfSafetyPct}
          </Text>
          <Text selectable style={styles.sourceLine}>
            DCF: {report.fairValueIntelligenceDetailJa.dcfFairPrice} [
            {report.fairValueIntelligenceDetailJa.dcfSource}] · DDM:{' '}
            {report.fairValueIntelligenceDetailJa.ddmFairPrice} [
            {report.fairValueIntelligenceDetailJa.ddmSource}] · PER:{' '}
            {report.fairValueIntelligenceDetailJa.perFairPrice} [
            {report.fairValueIntelligenceDetailJa.perSource}]
          </Text>
          <Text selectable style={styles.sourceLine}>
            Score: {report.fairValueIntelligenceDetailJa.fairValueScore} · 推奨:{' '}
            {report.fairValueIntelligenceDetailJa.recommendation} · 取得率:{' '}
            {report.fairValueIntelligenceDetailJa.fieldAcquisitionRate}
          </Text>
          <Text selectable style={styles.sourceLine}>
            使用モデル: {report.fairValueIntelligenceDetailJa.modelsUsed} · 主モデル:{' '}
            {report.fairValueIntelligenceDetailJa.primaryModel} · 信頼度:{' '}
            {report.fairValueIntelligenceDetailJa.confidence}
          </Text>
          <Text selectable style={styles.sourceLine}>
            DCF未取得理由: {report.fairValueIntelligenceDetailJa.dcfUnavailableReason}
          </Text>
          <Text selectable style={styles.sourceLine}>
            DDM未取得理由: {report.fairValueIntelligenceDetailJa.ddmUnavailableReason}
          </Text>
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>Analyst Target Intelligence評価: </Text>
        {ev.analystTargetIntelligence}
      </Text>
      {report.analystTargetIntelligenceDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            Target Median: {report.analystTargetIntelligenceDetailJa.targetMedian} · Bull:{' '}
            {report.analystTargetIntelligenceDetailJa.bullTarget} · Bear:{' '}
            {report.analystTargetIntelligenceDetailJa.bearTarget} · Coverage:{' '}
            {report.analystTargetIntelligenceDetailJa.coverageCount}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Upside: {report.analystTargetIntelligenceDetailJa.upsidePct} · Trend:{' '}
            {report.analystTargetIntelligenceDetailJa.targetTrend} · Score:{' '}
            {report.analystTargetIntelligenceDetailJa.analystScore}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Fair Value: {report.analystTargetIntelligenceDetailJa.fairValueMid} vs Analyst:{' '}
            {report.analystTargetIntelligenceDetailJa.targetMedian} · 差:{' '}
            {report.analystTargetIntelligenceDetailJa.fairValueVsAnalystDiffPct} · 判定:{' '}
            {report.analystTargetIntelligenceDetailJa.fairValueVsAnalystJudgment}
          </Text>
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>Valuation Gap Intelligence評価: </Text>
        {ev.valuationGapIntelligence}
      </Text>
      {report.valuationGapIntelligenceDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            Fair Value: {report.valuationGapIntelligenceDetailJa.fairValue} · Analyst:{' '}
            {report.valuationGapIntelligenceDetailJa.analystTarget}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Gap: {report.valuationGapIntelligenceDetailJa.gapPct} · 分類:{' '}
            {report.valuationGapIntelligenceDetailJa.gapClassification} · Score:{' '}
            {report.valuationGapIntelligenceDetailJa.valuationGapScore}
          </Text>
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>Earnings Revision Intelligence評価: </Text>
        {ev.earningsRevisionIntelligence}
      </Text>
      {report.earningsRevisionIntelligenceDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            EPS: {report.earningsRevisionIntelligenceDetailJa.epsEstimateCurrentFy} →{' '}
            {report.earningsRevisionIntelligenceDetailJa.epsEstimateNextFy}
          </Text>
          <Text selectable style={styles.sourceLine}>
            EPS Revision 30D: {report.earningsRevisionIntelligenceDetailJa.epsRevision30d} · 90D:{' '}
            {report.earningsRevisionIntelligenceDetailJa.epsRevision90d}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Revenue Revision: {report.earningsRevisionIntelligenceDetailJa.revenueRevision30d} ·
            Upgrade/Downgrade: {report.earningsRevisionIntelligenceDetailJa.upgradeCount}/
            {report.earningsRevisionIntelligenceDetailJa.downgradeCount}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Direction: {report.earningsRevisionIntelligenceDetailJa.revisionDirection} · Score:{' '}
            {report.earningsRevisionIntelligenceDetailJa.revisionScore} · Confidence:{' '}
            {report.earningsRevisionIntelligenceDetailJa.revisionConfidence}
          </Text>
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>Phase23.1 Cross Signal評価: </Text>
        {ev.earningsRevisionCrossSignal}
      </Text>
      {report.earningsRevisionCrossSignalDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            Cross Signal: {report.earningsRevisionCrossSignalDetailJa.crossSignalDirection}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Direction: {report.earningsRevisionCrossSignalDetailJa.crossSignalDirection} · Score:{' '}
            {report.earningsRevisionCrossSignalDetailJa.crossSignalScore}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Alignment: {report.earningsRevisionCrossSignalDetailJa.alignmentCount} — Revision:{' '}
            {report.earningsRevisionCrossSignalDetailJa.revisionBias} · Insider:{' '}
            {report.earningsRevisionCrossSignalDetailJa.insiderBias} · Institutional:{' '}
            {report.earningsRevisionCrossSignalDetailJa.institutionalBias}
          </Text>
          <Text selectable style={styles.sourceLine}>
            Confidence: {report.earningsRevisionCrossSignalDetailJa.confidence} · Material Impact:{' '}
            {report.earningsRevisionCrossSignalDetailJa.materialImpact}
          </Text>
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>Conviction Intelligence評価: </Text>
        {ev.convictionIntelligence}
      </Text>
      {report.convictionIntelligenceDetailJa ? (
        <>
          <Text selectable style={styles.sourceLine}>
            Conviction: {report.convictionIntelligenceDetailJa.convictionLevel} · Confidence:{' '}
            {report.convictionIntelligenceDetailJa.convictionConfidence} · Score:{' '}
            {report.convictionIntelligenceDetailJa.convictionScore}
          </Text>
          <Text selectable style={styles.sourceLine}>
            信頼: {report.convictionIntelligenceDetailJa.trustedSource} · Gap:{' '}
            {report.convictionIntelligenceDetailJa.gapPct} · DCF:{' '}
            {report.convictionIntelligenceDetailJa.dcfUsed} · DDM:{' '}
            {report.convictionIntelligenceDetailJa.ddmUsed}
          </Text>
          <Text selectable style={styles.sourceLine}>
            {report.convictionIntelligenceDetailJa.reasonLine1}
          </Text>
          <Text selectable style={styles.sourceLine}>
            {report.convictionIntelligenceDetailJa.reasonLine2}
          </Text>
        </>
      ) : null}
      <Text selectable style={styles.row}>
        <Text style={styles.key}>16. News評価: </Text>
        {ev.news}
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>17. X評価: </Text>
        {ev.x}
      </Text>
      <Text selectable style={styles.row}>
        <Text style={styles.key}>18. Reddit評価: </Text>
        {ev.reddit}
      </Text>

      <Text style={styles.section}>19. ポジティブ材料</Text>
      {report.positiveMaterialsJa.length === 0 ? (
        <Text style={styles.empty}>該当なし</Text>
      ) : (
        report.positiveMaterialsJa.map((line, i) => (
          <Text key={listKey('pos', i, line)} selectable style={styles.bullet}>
            + {line}
          </Text>
        ))
      )}

      <Text style={styles.section}>20. ネガティブ材料</Text>
      {report.negativeMaterialsJa.length === 0 ? (
        <Text style={styles.empty}>該当なし</Text>
      ) : (
        report.negativeMaterialsJa.map((line, i) => (
          <Text key={listKey('neg', i, line)} selectable style={styles.bullet}>
            − {line}
          </Text>
        ))
      )}

      <Text style={styles.section}>21. リスク</Text>
      {report.risksJa.length === 0 ? (
        <Text style={styles.empty}>該当なし</Text>
      ) : (
        report.risksJa.map((line, i) => (
          <Text key={listKey('risk', i, line)} selectable style={styles.risk}>
            · {line}
          </Text>
        ))
      )}

      <Text style={styles.section}>22. 次に確認すべきポイント</Text>
      {report.nextCheckpointsJa.map((line, i) => (
        <Text key={listKey('next', i, line)} selectable style={styles.bullet}>
          · {line}
        </Text>
      ))}

      <Text selectable style={styles.actionRow}>
        <Text style={styles.key}>AI推奨アクション: </Text>
        <Text style={styles.action}>{report.recommendedActionJa}</Text>
      </Text>

      <Text selectable style={styles.overallRow}>
        <Text style={styles.key}>総合スコア: </Text>
        <Text style={styles.overallScore}>{report.overallScore}</Text>
        <Text style={styles.scoreUnit}> / 100</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  title: {
    fontWeight: '800',
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  section: {
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionMuted: {
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 6,
    marginBottom: 2,
  },
  row: { fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 22, marginBottom: 2 },
  key: { fontWeight: '700', color: theme.colors.text },
  judgment: { fontWeight: '800', color: theme.colors.primary },
  bullet: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, lineHeight: 20, marginBottom: 2 },
  sourceLine: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 4,
  },
  empty: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, fontStyle: 'italic' },
  risk: { fontSize: theme.fontSize.sm, color: theme.colors.danger, lineHeight: 20, marginBottom: 2 },
  actionRow: { fontSize: theme.fontSize.sm, lineHeight: 22, marginTop: 8 },
  action: { fontWeight: '800', color: theme.colors.primary },
  overallRow: { fontSize: theme.fontSize.sm, lineHeight: 22, marginTop: 6 },
  overallScore: { fontWeight: '800', fontSize: theme.fontSize.lg, color: theme.colors.primary },
  scoreUnit: { color: theme.colors.textMuted },
});
