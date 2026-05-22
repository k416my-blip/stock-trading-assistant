import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CAPITAL_ALLOCATION_UI_LABELS_JA,
  PORTFOLIO_MODE_LABELS_JA,
  SIZING_TIER_LABELS_JA,
} from '../../constants/capitalAllocation';
import type { CapitalAllocationBundle, PortfolioMode, SizingTier } from '../../types/capitalAllocation';
import { updateCapitalAllocationPrefs } from '../../services/capitalAllocationStorage';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: CapitalAllocationBundle;
  onPrefsSaved?: () => void;
};

export function CapitalAllocationPanel({ bundle, onPrefsSaved }: Props) {
  const bp = bundle.buyingPower;
  const exec = bundle.executionCapitalSummary;

  const setMode = (mode: PortfolioMode) => {
    void updateCapitalAllocationPrefs({ portfolioMode: mode }).then(() => onPrefsSaved?.());
  };

  const setTier = (tier: SizingTier) => {
    void updateCapitalAllocationPrefs({ preferredSizingTier: tier }).then(() => onPrefsSaved?.());
  };

  const toggleBeginner = () => {
    void updateCapitalAllocationPrefs({ beginnerMode: !bundle.beginnerMode }).then(() =>
      onPrefsSaved?.(),
    );
  };

  return (
    <View style={styles.wrap} testID="concierge-capital-allocation-panel">
      <Text style={styles.title}>{CAPITAL_ALLOCATION_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>
      <SelectableText style={styles.confirm}>{bundle.humanConfirmationJa}</SelectableText>

      {bundle.emergencyGuardActive && bundle.emergencyGuardNoteJa ? (
        <SelectableText style={styles.guard}>{bundle.emergencyGuardNoteJa}</SelectableText>
      ) : null}
      {bundle.overAllocationBlocked && bundle.overAllocationNoteJa ? (
        <SelectableText style={styles.guard}>{bundle.overAllocationNoteJa}</SelectableText>
      ) : null}

      <SelectableText style={styles.aiLine}>{bundle.aiRecommendationLineJa}</SelectableText>
      <SelectableText style={styles.summary}>{bundle.aiSizingSummaryJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.sectionTitle}>{CAPITAL_ALLOCATION_UI_LABELS_JA.efficiency}</Text>
        <Text style={styles.score}>
          {bundle.capitalEfficiencyScore}/100 ({bundle.capitalEfficiencyLabelJa})
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{CAPITAL_ALLOCATION_UI_LABELS_JA.buyingPower}</Text>
        <SelectableText style={styles.row}>利用可能: {bp.availableCashMYR.toLocaleString()} MYR</SelectableText>
        <SelectableText style={styles.row}>予約済: {bp.reservedCashMYR.toLocaleString()} MYR</SelectableText>
        <SelectableText style={styles.row}>未決済枠: {bp.unsettledCashMYR.toLocaleString()} MYR</SelectableText>
        <SelectableText style={styles.row}>緊急準備: {bp.emergencyReserveMYR.toLocaleString()} MYR</SelectableText>
        <SelectableText style={styles.row}>FXバッファ: {bp.fxBufferMYR.toLocaleString()} MYR</SelectableText>
        <SelectableText style={styles.row}>手数料バッファ: {bp.feeBufferMYR.toLocaleString()} MYR</SelectableText>
        <SelectableText style={styles.rowBold}>使える現金: {bp.usableCashMYR.toLocaleString()} MYR</SelectableText>
        <SelectableText style={styles.note}>{bp.noteJa}</SelectableText>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Execution 要約</Text>
        <SelectableText style={styles.row}>
          Buying Power: {exec.availableBuyingPowerMYR.toLocaleString()} MYR
        </SelectableText>
        <SelectableText style={styles.row}>Reserved: {exec.reservedCashMYR.toLocaleString()} MYR</SelectableText>
        <SelectableText style={styles.row}>Usable: {exec.usableCashMYR.toLocaleString()} MYR</SelectableText>
        <SelectableText style={styles.row}>
          提案配分: {exec.proposedAllocationMYR.toLocaleString()} MYR
        </SelectableText>
        <SelectableText style={styles.rowBold}>
          残現金: {exec.remainingCashMYR.toLocaleString()} MYR ({bundle.proposedCashRatioPct}%)
        </SelectableText>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{CAPITAL_ALLOCATION_UI_LABELS_JA.mode}</Text>
        <View style={styles.chipRow}>
          {(['balanced', 'growth', 'dividend', 'defensive'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.chip, bundle.portfolioMode === m && styles.chipActive]}
            >
              <Text style={styles.chipText}>{PORTFOLIO_MODE_LABELS_JA[m]}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={toggleBeginner} style={styles.chip}>
          <Text style={styles.chipText}>
            初心者モード: {bundle.beginnerMode ? 'ON（最大3銘柄）' : 'OFF'}
          </Text>
        </Pressable>
        <View style={styles.chipRow}>
          {(['conservative', 'standard', 'aggressive'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTier(t)} style={styles.chip}>
              <Text style={styles.chipText}>{SIZING_TIER_LABELS_JA[t]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{CAPITAL_ALLOCATION_UI_LABELS_JA.orders}</Text>
        {bundle.suggestedOrders.length === 0 ? (
          <SelectableText style={styles.note}>現時点の買い提案なし — 現金維持を優先</SelectableText>
        ) : (
          bundle.suggestedOrders.map((o) => (
            <View key={o.symbol} style={styles.orderBlock}>
              <SelectableText style={styles.orderTitle}>
                {o.displayLabelJa} — {o.recommendedShares}株 · ~{o.estimatedTotalMYR} MYR
              </SelectableText>
              <SelectableText style={styles.note}>
                {o.reasonJa} · 残現金 {o.cashAfterMYR} MYR
              </SelectableText>
              {o.tiers.map((t) => (
                <SelectableText key={t.tier} style={styles.tierLine}>
                  · {SIZING_TIER_LABELS_JA[t.tier]}: {t.shares}株 ({t.lotNoteJa})
                </SelectableText>
              ))}
            </View>
          ))
        )}
      </View>

      {bundle.paperOrderDrafts.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{CAPITAL_ALLOCATION_UI_LABELS_JA.paper}</Text>
          {bundle.paperOrderDrafts.map((d) => (
            <SelectableText key={d.symbol} style={styles.note}>
              · {d.symbol} {d.quantity}株 @ {d.referencePrice} — Paperドラフト（送信なし）
            </SelectableText>
          ))}
        </View>
      ) : null}

      <SelectableText style={styles.note}>{bundle.explainRuleBasisJa}</SelectableText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  safety: { fontSize: 11, color: theme.colors.warning, marginBottom: 4 },
  confirm: { fontSize: 11, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  guard: {
    fontSize: 12,
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },
  aiLine: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  summary: { fontSize: 12, color: theme.colors.text, marginBottom: theme.spacing.sm },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  score: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  row: { fontSize: 11, color: theme.colors.text, marginBottom: 2 },
  rowBold: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
  note: { fontSize: 10, color: theme.colors.textMuted, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceElevated },
  chipText: { fontSize: 10, color: theme.colors.text },
  orderBlock: { marginBottom: theme.spacing.sm },
  orderTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  tierLine: { fontSize: 10, color: theme.colors.textMuted, marginLeft: 8 },
});
