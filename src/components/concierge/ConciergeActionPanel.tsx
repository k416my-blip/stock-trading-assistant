import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import {
  AI_ACTION_CATEGORY_LABELS_JA,
  EVIDENCE_SCORE_LABELS_JA,
  NOTIFICATION_PRIORITY_LABELS_JA,
} from '../../constants/aiActionGuide';
import type { ConciergeAnalysisDiagnostics } from '../../types/conciergeEvidence';
import type { ConciergeActionGuideBundle } from '../../types/conciergeActionGuide';
import type { ConciergeRiskControlBundle } from '../../types/conciergeRiskControl';
import { listKey, logDuplicateReactKeys } from '../../utils/reactKeyDiagnostics';
import { ConciergeAnalysisDiagnosticsView } from './ConciergeAnalysisDiagnosticsView';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  guide: ConciergeActionGuideBundle;
  riskControl?: ConciergeRiskControlBundle;
  diagnostics?: ConciergeAnalysisDiagnostics;
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const widthPct = `${Math.min(100, Math.max(0, value))}%` as DimensionValue;
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: widthPct }]} />
      </View>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

export function ConciergeActionPanel({ guide, riskControl, diagnostics }: Props) {
  const primary = guide.symbols[0];
  if (!primary && guide.symbols.length === 0) return null;
  const showRecommendations = riskControl?.allowActionRecommendations !== false;
  const reasonLines = primary?.reasonBulletsJa ?? [];
  const recLines = guide.aggregatedRecommendationsJa;
  const riskLines = guide.aggregatedRisksJa;
  const attentionLines = guide.aggregatedAttentionJa;

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    logDuplicateReactKeys(
      'ConciergeActionPanel/reason',
      'ConciergeActionPanel',
      reasonLines.map((line, i) => listKey('reason', i, line)),
    );
    logDuplicateReactKeys(
      'ConciergeActionPanel/rec',
      'ConciergeActionPanel',
      recLines.map((line, i) => listKey('rec', i, line)),
    );
    logDuplicateReactKeys(
      'ConciergeActionPanel/risk',
      'ConciergeActionPanel',
      riskLines.map((line, i) => listKey('risk', i, line)),
    );
    logDuplicateReactKeys(
      'ConciergeActionPanel/attention',
      'ConciergeActionPanel',
      attentionLines.map((line, i) => listKey('attention', i, line)),
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.panelTitle}>投資行動支援</Text>

      <View style={styles.headerRow}>
        <Text style={styles.stanceLabel}>市場状況</Text>
        <Text style={styles.stanceValue}>{guide.overallStanceLabelJa}</Text>
        <Text style={styles.confidence}>
          AI確信度 {guide.overallConfidencePct}%
        </Text>
      </View>

      {primary?.insufficientData ? (
        <View style={styles.insufficientBox}>
          <Text style={styles.insufficientText}>
            {primary.insufficientDataLabelJa ?? '判断材料不足'}
          </Text>
        </View>
      ) : null}

      {diagnostics ? <ConciergeAnalysisDiagnosticsView diagnostics={diagnostics} /> : null}

      <Text style={styles.sectionTitle}>理由</Text>
      {reasonLines.map((line, index) => (
        <SelectableText key={listKey('reason', index, line)} style={styles.bullet}>
          · {line}
        </SelectableText>
      ))}

      {showRecommendations ? (
        <>
          <Text style={styles.sectionTitle}>推奨行動</Text>
          {recLines.map((line, index) => (
            <SelectableText key={listKey('rec', index, line)} style={styles.bulletAccent}>
              · {line}
            </SelectableText>
          ))}
        </>
      ) : (
        <Text style={styles.gateOff}>推奨行動は確信度ゲートにより抑制されています</Text>
      )}

      <Text style={styles.sectionTitle}>リスク</Text>
      {riskLines.map((line, index) => (
        <SelectableText key={listKey('risk', index, line)} style={styles.riskLine}>
          {line}
        </SelectableText>
      ))}

      <Text style={styles.sectionTitle}>注目ポイント</Text>
      {attentionLines.map((line, index) => (
        <SelectableText key={listKey('attention', index, line)} style={styles.bullet}>
          · {line}
        </SelectableText>
      ))}

      {primary ? (
        <>
          <Text style={styles.sectionTitle}>銘柄: {primary.displayLabelJa}</Text>
          <Text style={styles.metaLine}>
            行動: {AI_ACTION_CATEGORY_LABELS_JA[primary.primaryCategory]}
            {primary.categories.length > 1
              ? `（${primary.categories.map((c) => AI_ACTION_CATEGORY_LABELS_JA[c]).join(' · ')}）`
              : ''}
          </Text>
          <Text style={styles.metaLine}>
            通知優先度: {NOTIFICATION_PRIORITY_LABELS_JA[primary.notificationPriority]}
          </Text>
          <SelectableText style={styles.whyLine}>{primary.notificationWhyJa}</SelectableText>

          <Text style={styles.sectionTitle}>根拠スコア</Text>
          <ScoreBar label={EVIDENCE_SCORE_LABELS_JA.priceAction} value={primary.evidenceScores.priceAction} />
          <ScoreBar label={EVIDENCE_SCORE_LABELS_JA.volume} value={primary.evidenceScores.volume} />
          <ScoreBar label={EVIDENCE_SCORE_LABELS_JA.news} value={primary.evidenceScores.news} />
          <ScoreBar label={EVIDENCE_SCORE_LABELS_JA.xSentiment} value={primary.evidenceScores.xSentiment} />
          <ScoreBar label={EVIDENCE_SCORE_LABELS_JA.volatility} value={primary.evidenceScores.volatility} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stanceLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  stanceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  confidence: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success,
    marginLeft: 'auto',
  },
  insufficientBox: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    marginBottom: 8,
  },
  insufficientText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.warning,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: 8,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
  },
  bulletAccent: {
    fontSize: 12,
    color: theme.colors.primary,
    lineHeight: 18,
    fontWeight: '500',
  },
  gateOff: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  riskLine: {
    fontSize: 12,
    color: theme.colors.warning,
    lineHeight: 18,
  },
  metaLine: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  whyLine: {
    fontSize: 11,
    color: theme.colors.text,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  scoreLabel: {
    width: 88,
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  scoreTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  scoreValue: {
    width: 28,
    fontSize: 10,
    textAlign: 'right',
    color: theme.colors.text,
  },
});
