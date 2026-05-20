import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AllocationCandidateCard } from '../components/AllocationCandidateCard';
import { BulkBuyDebugPanel } from '../components/BulkBuyDebugPanel';
import { BeginnerWarningBanner } from '../components/BeginnerWarningBanner';
import { FractionalSharesToggle } from '../components/FractionalSharesToggle';
import { InvestmentStylePicker } from '../components/InvestmentStylePicker';
import { MarketSessionPanel } from '../components/MarketSessionPanel';
import { PracticeModeBadge } from '../components/PracticeModeBadge';
import { useMarketSession } from '../hooks/useMarketSession';
import { MarketPicker } from '../components/MarketPicker';
import { LabeledValue, TermHint } from '../components/TermHint';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import {
  ALLOCATION_BULK_BUY_LABEL,
  ALLOCATION_BULK_BUY_LOADING_LABEL,
  ALLOCATION_MANUAL_LIST_LABEL,
  ALLOCATION_PLAN_DISCLAIMER,
  ALLOCATION_PRACTICE_MESSAGES,
  INVESTMENT_STYLE_LABEL,
} from '../constants/allocation';
import { CLOSED_TRADE_WARNING } from '../constants/marketSession';
import { getPlanRiskLevel, getStyleProfile } from '../constants/investmentStyles';
import { useApp } from '../context/AppContext';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { buildAllocationPlanAlert } from '../services/alertEngine';
import { buildAllocationPlan } from '../services/allocationPlan';
import {
  filterBuyableCandidates,
  MANUAL_ORDER_WARNING,
  totalAllocationBuyCostMYR,
} from '../services/allocationActions';
import type { BulkBuyDebugInfo } from '../services/practiceBulkBuy';
import type { AllocationPlan, InvestmentStyle, Market } from '../types';
import { theme } from '../theme';

function summarizeCategories(labels: string[]): string {
  const counts = labels.reduce<Record<string, number>>((acc, label) => {
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([label, n]) => `${label}×${n}`)
    .join(' · ');
}

type PlanActionsProps = {
  isPractice: boolean;
  buying: boolean;
  onPracticeBuy: () => void;
  onManualChecklist: () => void;
  marketSessionBlocked: boolean;
};

function PlanActions({
  isPractice,
  buying,
  onPracticeBuy,
  onManualChecklist,
  marketSessionBlocked,
}: PlanActionsProps) {
  if (isPractice) {
    return (
      <Card style={styles.actionCard}>
        <Button
          label={buying ? ALLOCATION_BULK_BUY_LOADING_LABEL : ALLOCATION_BULK_BUY_LABEL}
          onPress={onPracticeBuy}
          disabled={buying}
        />
        <Text style={styles.actionHint}>
          練習モード：仮想資金から一括で差し引き、保有銘柄・売買履歴に記録します（実際の注文は行いません）。
        </Text>
        {marketSessionBlocked ? (
          <Text style={styles.warnSoft}>{CLOSED_TRADE_WARNING}（練習モードでは買付可能です）</Text>
        ) : null}
      </Card>
    );
  }

  return (
    <Card style={styles.actionCard}>
      <Button label={ALLOCATION_MANUAL_LIST_LABEL} onPress={onManualChecklist} variant="ghost" />
      <Text style={styles.actionHint}>
        実運用分析モード：証券会社への注文送信はしません。手動注文チェックリストと分析参考のみ作成します。
      </Text>
      <Text style={styles.warn}>{MANUAL_ORDER_WARNING}</Text>
    </Card>
  );
}

export function AllocationPlanScreen() {
  const { state, isPractice, applyAllocationPractice, addAllocationToManualOrderList, dispatchAlert } =
    useApp();
  const tabNav = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [deposit, setDeposit] = useState('1000');
  const [market, setMarket] = useState<Market>(state.settings.selectedMarket);
  const [style, setStyle] = useState<InvestmentStyle>('balanced');
  const [fractionalShares, setFractionalShares] = useState(false);
  const [plan, setPlan] = useState<AllocationPlan | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyDebug, setBuyDebug] = useState<BulkBuyDebugInfo | null>(null);
  const [lastBuyError, setLastBuyError] = useState<string | null>(null);
  const marketSession = useMarketSession(market);

  const debugPreview = useMemo((): BulkBuyDebugInfo | null => {
    if (!plan) return null;
    const { buyable } = filterBuyableCandidates(plan.candidates);
    return {
      virtualCashMYR: state.practice.cashBalanceMYR,
      allocationTotalMYR: totalAllocationBuyCostMYR(buyable),
      validPurchaseCount: buyable.length,
      savedHoldingsCount: state.practice.portfolio.filter((p) => p.shares > 0).length,
    };
  }, [plan, state.practice.cashBalanceMYR, state.practice.portfolio]);

  const generate = () => {
    const depositMYR = Number(deposit) || 0;
    const result = buildAllocationPlan({
      depositMYR,
      market,
      riskLevel: getPlanRiskLevel(style),
      investmentStyle: style,
      fractionalSharesEnabled: fractionalShares,
    });
    if ('error' in result) {
      Alert.alert('作成できません', result.error);
      setPlan(null);
      return;
    }
    setPlan(result);
    void dispatchAlert(buildAllocationPlanAlert(result));
  };

  const executePracticeBuy = async () => {
    if (!plan || buying) return;
    console.log('bulk virtual buy pressed');
    setBuying(true);
    setLastBuyError(null);

    try {
      const result = await applyAllocationPractice(plan);
      if (result.debug) setBuyDebug(result.debug);

      if (!result.ok) {
        const message = result.error ?? ALLOCATION_PRACTICE_MESSAGES.buyFailed;
        setLastBuyError(message);
        Alert.alert('一括仮想買付できません', message);
        return;
      }

      const lines: string[] = [`${result.boughtCount}銘柄を仮想ポートフォリオに追加しました。`];
      if (result.partialSkipMessage) {
        lines.push(ALLOCATION_PRACTICE_MESSAGES.partialSkip);
      }

      Alert.alert(ALLOCATION_PRACTICE_MESSAGES.bulkBuyComplete, lines.join('\n\n'), [
        {
          text: '保有銘柄を見る',
          onPress: () => tabNav.navigate('Portfolio'),
        },
      ]);
    } catch (err) {
      console.error('仮想買付に失敗しました', err);
      const message = ALLOCATION_PRACTICE_MESSAGES.buyFailed;
      setLastBuyError(message);
      Alert.alert('一括仮想買付できません', message);
    } finally {
      setBuying(false);
    }
  };

  const onPracticeBuy = () => {
    if (!plan) return;
    if (marketSession.blockVirtualBuy) {
      Alert.alert('取引時間外の参考', CLOSED_TRADE_WARNING, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '一括仮想買付を続ける', onPress: () => void executePracticeBuy() },
      ]);
      return;
    }
    if (marketSession.showExtendedHoursWarning) {
      Alert.alert('時間外取引の注意', marketSession.beginnerTip, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '続ける', onPress: () => void executePracticeBuy() },
      ]);
      return;
    }
    void executePracticeBuy();
  };

  const onManualChecklist = () => {
    if (!plan) return;
    const result = addAllocationToManualOrderList(plan);
    if (!result.ok) {
      Alert.alert(
        '追加できません',
        result.error ?? ALLOCATION_PRACTICE_MESSAGES.noBuyable,
      );
      return;
    }
    const partialNote = plan.candidates.some((c) => {
      const shares = c.isFractionalShares ? c.estimatedShares : Math.floor(c.estimatedShares);
      return shares <= 0;
    })
      ? `\n\n${ALLOCATION_PRACTICE_MESSAGES.partialSkip}`
      : '';
    Alert.alert(
      '手動注文リストに追加',
      `${result.addedCount}件を追加しました。Rakuten Tradeでご自身の目で確認して注文してください。${partialNote}`,
      [{ text: 'リストを見る', onPress: () => stackNav.navigate('ManualOrderList') }, { text: 'OK' }],
    );
  };

  return (
    <Screen
      title="おすすめ配分プラン"
      subtitle="入金額から購入候補と参考配分を表示 — 手動でRakuten Trade注文"
    >
      <BeginnerWarningBanner />
      {isPractice ? <PracticeModeBadge /> : null}
      <TermHint term="allocationPlan" />
      <TermHint term="diversification" />

      <Card>
        <TermHint term="investmentAmount" />
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="例: 1000"
          placeholderTextColor={theme.colors.textMuted}
          value={deposit}
          onChangeText={setDeposit}
        />
      </Card>

      <Text style={styles.section}>市場</Text>
      <MarketPicker selected={market} onSelect={setMarket} />
      <MarketSessionPanel mode="single" market={market} showTradeWarning={isPractice} />

      <InvestmentStylePicker
        selected={style}
        onSelect={(next) => {
          setStyle(next);
        }}
      />

      <Card>
        <FractionalSharesToggle enabled={fractionalShares} onChange={setFractionalShares} />
      </Card>

      <Button label="参考プランを作成" onPress={generate} />

      {plan ? (
        <>
          <Card style={styles.planCard}>
            <Text style={styles.planTitle}>参考配分サマリー（RM{plan.depositMYR.toLocaleString('ja-JP')}）</Text>
            <Text style={styles.styleLine}>
              運用スタイル: {INVESTMENT_STYLE_LABEL[plan.investmentStyle]} ·{' '}
              {getStyleProfile(plan.investmentStyle).allocationTendency}
            </Text>
            <Text style={styles.hint}>
              {getStyleProfile(plan.investmentStyle).riskLabel} ·{' '}
              {getStyleProfile(plan.investmentStyle).periodLabel} · 値動き
              {getStyleProfile(plan.investmentStyle).volatilityLabel}
            </Text>
            <LabeledValue
              term="cashReserve"
              value={`RM${plan.cashReserveMYR.toLocaleString('ja-JP')}（${plan.cashReservePct.toFixed(0)}%）`}
            />
            <Text style={styles.hint}>購入候補への合計: RM{plan.investableMYR.toLocaleString('ja-JP')}</Text>
            {plan.highRiskWarning ? <Text style={styles.warn}>{plan.highRiskWarning}</Text> : null}
            {plan.affordabilityWarning ? <Text style={styles.warn}>{plan.affordabilityWarning}</Text> : null}
            <Text style={styles.hint}>
              端株: {plan.fractionalSharesEnabled ? 'ON（小数株の目安）' : 'OFF（1株以上のみ表示）'}
            </Text>
          </Card>

          <BulkBuyDebugPanel
            isPractice={isPractice}
            debug={buyDebug ?? debugPreview}
            lastError={lastBuyError}
          />

          <PlanActions
            isPractice={isPractice}
            buying={buying}
            onPracticeBuy={onPracticeBuy}
            onManualChecklist={onManualChecklist}
            marketSessionBlocked={marketSession.blockVirtualBuy}
          />

          <Text style={styles.section}>購入候補（{plan.candidates.length}銘柄）</Text>
          <Text style={styles.hint}>
            {summarizeCategories(plan.candidates.map((c) => c.categoryLabel))}
          </Text>
          {plan.candidates.map((c, i) => (
            <AllocationCandidateCard
              key={`${c.market}-${c.symbol}-${i}`}
              candidate={c}
              index={i}
            />
          ))}

          <PlanActions
            isPractice={isPractice}
            buying={buying}
            onPracticeBuy={onPracticeBuy}
            onManualChecklist={onManualChecklist}
            marketSessionBlocked={marketSession.blockVirtualBuy}
          />

          <Card>
            <Text style={styles.disclaimer}>{ALLOCATION_PLAN_DISCLAIMER}</Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md, marginTop: theme.spacing.sm },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    marginTop: theme.spacing.sm,
  },
  planCard: { borderColor: theme.colors.primary },
  planTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg, marginBottom: theme.spacing.sm },
  styleLine: { color: theme.colors.primary, fontSize: theme.fontSize.sm, fontWeight: '600', marginBottom: theme.spacing.sm },
  actionCard: {
    borderColor: theme.colors.primary,
    borderWidth: 1,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  actionHint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm, lineHeight: 20 },
  warnSoft: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, fontStyle: 'italic' },
  disclaimer: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20 },
});
