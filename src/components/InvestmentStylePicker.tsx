import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  INVESTMENT_STYLE_PROFILES,
  INVESTMENT_STYLE_SECTION_TITLE,
  INVESTMENT_STYLE_WARNINGS,
  STYLE_METER_TOTAL,
  type InvestmentStyleProfile,
} from '../constants/investmentStyles';
import { TermHintIcon } from './TermHint';
import { Card } from './ui/Card';
import type { InvestmentStyle } from '../types';
import { theme } from '../theme';

type Props = {
  selected: InvestmentStyle;
  onSelect: (style: InvestmentStyle) => void;
};

function BlockMeter({ filled, color }: { filled: number; color: string }) {
  return (
    <View style={styles.meterRow}>
      {Array.from({ length: STYLE_METER_TOTAL }, (_, i) => (
        <View
          key={i}
          style={[styles.block, i < filled ? { backgroundColor: color } : styles.blockOff]}
        />
      ))}
    </View>
  );
}

function StarRating({ count }: { count: number }) {
  return (
    <Text style={styles.stars}>
      {'★'.repeat(count)}
      {'☆'.repeat(5 - count)}
    </Text>
  );
}

function riskColor(filled: number): string {
  if (filled <= 3) return theme.colors.success;
  if (filled <= 6) return theme.colors.warning;
  return theme.colors.danger;
}

function StyleCard({
  profile,
  selected,
  onPress,
}: {
  profile: InvestmentStyleProfile;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card style={[styles.card, selected && styles.cardSelected]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>{profile.title}</Text>
          {profile.showBeginnerBadge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>おすすめ</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.meterBlock}>
          <Text style={styles.meterLabel}>リスクメーター</Text>
          <BlockMeter filled={profile.riskFilled} color={riskColor(profile.riskFilled)} />
          <Text style={styles.meterValue}>{profile.riskLabel}</Text>
        </View>

        <View style={styles.meterBlock}>
          <Text style={styles.meterLabel}>運用期間メーター</Text>
          <BlockMeter filled={profile.periodFilled} color={theme.colors.primary} />
          <Text style={styles.meterValue}>{profile.periodLabel}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>値動き</Text>
          <Text style={styles.rowValue}>{profile.volatilityLabel}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>配分傾向</Text>
          <Text style={styles.rowValue}>{profile.allocationTendency}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>初心者おすすめ度</Text>
          <StarRating count={profile.beginnerStars} />
        </View>

        <Text style={styles.description}>{profile.description}</Text>
        {profile.cardWarning ? <Text style={styles.cardWarn}>⚠ {profile.cardWarning}</Text> : null}
        {selected ? <Text style={styles.selectedMark}>✓ 選択中</Text> : null}
      </Card>
    </Pressable>
  );
}

export function InvestmentStylePicker({ selected, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{INVESTMENT_STYLE_SECTION_TITLE}</Text>
      <Text style={styles.sectionHint}>
        リスクと期間はスタイルに含まれています。1つ選ぶだけで配分の目安が決まります。
      </Text>

      <Card style={styles.helpCard}>
        <Text style={styles.helpHeading}>はじめての方へ</Text>
        <View style={styles.helpRow}>
          <Text style={styles.helpQ}>長期運用とは？</Text>
          <TermHintIcon term="longTermInvesting" />
        </View>
        <View style={styles.helpRow}>
          <Text style={styles.helpQ}>短期売買とは？</Text>
          <TermHintIcon term="shortTermTrading" />
        </View>
        <View style={styles.helpRow}>
          <Text style={styles.helpQ}>リスクとは？</Text>
          <TermHintIcon term="risk" />
        </View>
      </Card>

      {INVESTMENT_STYLE_PROFILES.map((profile) => (
        <StyleCard
          key={profile.style}
          profile={profile}
          selected={selected === profile.style}
          onPress={() => onSelect(profile.style)}
        />
      ))}

      <Card style={styles.warnCard}>
        {INVESTMENT_STYLE_WARNINGS.map((w, i) => (
          <Text key={`warn-${i}`} style={styles.globalWarn}>
            · {w}
          </Text>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  sectionTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg, marginTop: theme.spacing.sm },
  sectionHint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  helpCard: { gap: theme.spacing.sm },
  helpHeading: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  helpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  helpQ: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '600' },
  card: { borderWidth: 2, borderColor: theme.colors.border },
  cardSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceElevated },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  cardTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  cardTitleSelected: { color: theme.colors.primary },
  badge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  badgeText: { color: '#fff', fontSize: theme.fontSize.sm, fontWeight: '700' },
  meterBlock: { marginTop: theme.spacing.sm },
  meterLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontWeight: '600', marginBottom: 4 },
  meterRow: { flexDirection: 'row', gap: 3 },
  block: { flex: 1, height: 10, borderRadius: 2 },
  blockOff: { backgroundColor: theme.colors.border },
  meterValue: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  rowLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  rowValue: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '600' },
  stars: { color: theme.colors.warning, fontSize: theme.fontSize.md, letterSpacing: 1 },
  description: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20, marginTop: theme.spacing.md },
  cardWarn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm, fontWeight: '600' },
  selectedMark: { color: theme.colors.primary, fontWeight: '700', marginTop: theme.spacing.sm, fontSize: theme.fontSize.sm },
  warnCard: { borderColor: theme.colors.warning, borderWidth: 1 },
  globalWarn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, lineHeight: 20, marginTop: 4 },
});
