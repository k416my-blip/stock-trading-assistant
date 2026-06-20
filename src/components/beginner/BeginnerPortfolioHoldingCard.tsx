import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  parseMaterialQualityStarCount,
  resolveAiTrustLevelJa,
  resolveAiTrustPct,
} from '../../constants/beginnerAiTrustLevelJa';
import {
  BEGINNER_JUDGMENT_LABEL_JA,
  mapToBeginnerAiJudgment,
  resolveHoldQuestionAnswerJa,
} from '../../services/beginner/beginnerAiJudgmentJa';
import type { BeginnerAiJudgment } from '../../services/beginner/beginnerAiJudgmentJa';
import type { AiSecondEvaluatorAction } from '../../types/aiSecondEvaluator';
import { theme } from '../../theme';

type Props = {
  symbol: string;
  nameJa: string;
  isHeld: boolean;
  fusedAction: AiSecondEvaluatorAction;
  finalScore: number;
  confidencePct?: number;
  dataQualityStars?: number;
  priceLabel?: string;
  pnlLabel?: string;
  onPressWhy?: () => void;
  onPressAskAi?: () => void;
};

function answerColor(tone: 'positive' | 'caution' | 'neutral' | 'warning'): string {
  if (tone === 'positive') return theme.colors.success;
  if (tone === 'caution') return theme.colors.warning;
  if (tone === 'warning') return '#f97316';
  return theme.colors.text;
}

function trustBarColor(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high') return theme.colors.success;
  if (level === 'medium') return theme.colors.warning;
  return theme.colors.textMuted;
}

export function BeginnerPortfolioHoldingCard({
  symbol,
  nameJa,
  isHeld,
  fusedAction,
  finalScore,
  confidencePct,
  dataQualityStars,
  priceLabel,
  pnlLabel,
  onPressWhy,
  onPressAskAi,
}: Props) {
  const judgment: BeginnerAiJudgment = mapToBeginnerAiJudgment({
    isHeld,
    fusedAction,
    finalScore,
  });
  const holdAnswer = resolveHoldQuestionAnswerJa({ judgment, isHeld });
  const trustPct = resolveAiTrustPct({
    hybridConfidence: confidencePct,
    finalScore,
    dataQualityStars,
  });
  const trust = resolveAiTrustLevelJa({
    pct: trustPct.pct,
    isEstimated: trustPct.isEstimated,
    dataQualityStars,
  });

  return (
    <Card style={styles.card} testID={`beginner-holding-card-${symbol}`}>
      <Text style={styles.symbol}>
        {symbol}  {nameJa}
      </Text>

      <Text style={styles.question}>このまま持つ？</Text>

      <Text style={[styles.answer, { color: answerColor(holdAnswer.tone) }]}>
        {holdAnswer.answerJa}
      </Text>

      <View style={styles.judgmentRow}>
        <Text style={styles.judgmentLabel}>
          AI判定: {BEGINNER_JUDGMENT_LABEL_JA[judgment]}
        </Text>
        <Text style={styles.judgmentLabel}>AI信頼度: {trust.labelJa}</Text>
      </View>

      <Text style={styles.trustExplain}>{trust.explainJa}</Text>

      <View style={styles.trustBarTrack}>
        <View
          style={[
            styles.trustBarFill,
            {
              width: `${Math.round(trust.barFillRatio * 100)}%`,
              backgroundColor: trustBarColor(trust.level),
            },
          ]}
        />
      </View>

      {priceLabel || pnlLabel ? (
        <Text style={styles.pricePnl}>
          {[priceLabel, pnlLabel].filter(Boolean).join(' · ')}
        </Text>
      ) : null}

      <View style={styles.ctaRow}>
        {onPressWhy ? (
          <Button label="なぜ？ → 銘柄チェック" onPress={onPressWhy} variant="ghost" />
        ) : null}
        {onPressAskAi ? (
          <Button label="AIに聞く" onPress={onPressAskAi} variant="ghost" />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  symbol: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  question: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  answer: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    marginVertical: theme.spacing.xs,
  },
  judgmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  judgmentLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  trustExplain: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  trustBarTrack: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: theme.spacing.xs,
  },
  trustBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  pricePnl: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
});
