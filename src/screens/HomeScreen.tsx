import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BursaConciergeHomeCard } from '../components/BursaConciergeHomeCard';
import { BursaMaterialHomeCard } from '../components/BursaMaterialHomeCard';
import { HeaderUrgencyBadge } from '../components/HeaderUrgencyBadge';
import { HeaderProactiveBadge } from '../components/proactive/HeaderProactiveBadge';
import { DISABLE_AI_CONCIERGE_FOR_TOUCH_TEST } from '../constants/aiConciergeDevFlags';
import { ProactiveSuggestionsHomeCard } from '../components/proactive/ProactiveSuggestionsHomeCard';
import { CentralIntelligencePanel } from '../components/CentralIntelligencePanel';
import { AiTradeQueueSection } from '../components/AiTradeQueueSection';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CrossAssetFlowCard } from '../components/CrossAssetFlowCard';
import { MarketRegimeCard } from '../components/MarketRegimeCard';
import { MarketSessionPanel } from '../components/MarketSessionPanel';
import { BuyingPowerCard } from '../components/BuyingPowerCard';
import { DegradedModeBanner } from '../components/DegradedModeBanner';
import { PracticeModeBadge } from '../components/PracticeModeBadge';
import { PracticeSummaryCard } from '../components/PracticeSummaryCard';
import { TrustConciergeHomeCard } from '../components/TrustConciergeHomeCard';
import { TrustHomeApprovalCard } from '../components/TrustHomeApprovalCard';
import { TrustMonthlyPerformanceCard } from '../components/TrustMonthlyPerformanceCard';
import { TrustOperatingPerformanceCard } from '../components/TrustOperatingPerformanceCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { PRACTICE_SUBTITLE } from '../constants/practice';
import {
  APP_MODE_PRACTICE_LABEL,
  PLATFORM_POSITIONING_SUBTITLE_JA,
  PLATFORM_POSITIONING_TITLE_JA,
} from '../constants/platformClarification';
import { INVESTMENT_TRUST_DISCLAIMER_JA } from '../constants/investmentDisplay';
import {
  TRUST_HOME_NO_PLAN_HINT_JA,
  TRUST_HOME_SUBTITLE_JA,
  TRUST_HOME_TITLE_JA,
} from '../constants/trustDisplay';
import { MARKET_LABEL } from '../constants/rakutenTrade';
import { BeginnerTodayAdviceCard } from '../components/beginner/BeginnerTodayAdviceCard';
import { useApp } from '../context/AppContext';
import { useAppUxMode } from '../context/AppUxModeContext';
import { useBursaMaterialOptional } from '../context/BursaMaterialContext';
import { useProactiveConciergeOptional } from '../context/ProactiveConciergeContext';
import {
  isSimplifiedInvestmentDisplayMode,
  isTrustDisplayMode,
} from '../services/beginnerDisplayMapper';
import { buildBeginnerTodayAdvice } from '../services/beginner/beginnerTodayAdviceBuilder';
import { portfolioMarketValueMYR } from '../services/portfolio';
import { buildTrustPlanPresentation } from '../services/trustRecommendationSummary';
import { recordTrustOperationStartIfNeeded } from '../services/trustOperatingPerformanceStorage';
import { loadTrustPlanSnapshot } from '../services/trustPlanPreviewStorage';
import type { AllocationPlan } from '../types';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

export function HomeScreen() {
  const {
    state,
    buyingPower,
    isPractice,
    practiceStats,
    marketRegime,
    crossAssetFlow,
    aiPreferences,
    applyAllocationPractice,
    addAllocationToManualOrderList,
  } = useApp();
  const { isBeginnerMode } = useAppUxMode();
  const materialCtx = useBursaMaterialOptional();
  const proactive = useProactiveConciergeOptional();
  const trustMode = isTrustDisplayMode(aiPreferences);
  const simplifiedMode = isSimplifiedInvestmentDisplayMode(aiPreferences);
  const tabNav = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Home'>>();
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  const [trustPlan, setTrustPlan] = useState<AllocationPlan | null>(null);
  const [trustProceeding, setTrustProceeding] = useState(false);

  const reloadTrustSnapshot = useCallback(async () => {
    const snapshot = await loadTrustPlanSnapshot();
    setTrustPlan(snapshot?.plan ?? null);
  }, []);

  useEffect(() => {
    if (!trustMode) return;
    void reloadTrustSnapshot();
  }, [trustMode, reloadTrustSnapshot]);

  useFocusEffect(
    useCallback(() => {
      if (!trustMode) return;
      void reloadTrustSnapshot();
    }, [trustMode, reloadTrustSnapshot]),
  );

  const confirmTrustPlanFromHome = () => {
    if (!trustPlan) {
      tabNav.navigate('AllocationPlan');
      return;
    }
    Alert.alert('この提案で進めますか？', INVESTMENT_TRUST_DISCLAIMER_JA, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '進める',
        onPress: () => {
          void (async () => {
            setTrustProceeding(true);
            try {
              if (isPractice) {
                const result = await applyAllocationPractice(trustPlan);
                if (!result.ok) {
                  Alert.alert('進められません', result.error ?? '処理に失敗しました');
                  return;
                }
                await recordTrustOperationStartIfNeeded();
                Alert.alert('承認しました', '仮想ポートフォリオに反映しました。');
                return;
              }
              const result = addAllocationToManualOrderList(trustPlan);
              if (!result.ok) {
                Alert.alert('追加できません', result.error ?? '処理に失敗しました');
                return;
              }
              await recordTrustOperationStartIfNeeded();
              Alert.alert(
                '承認しました',
                '手動注文リストに追加しました。証券会社アプリでご確認ください。',
                [{ text: 'リストを見る', onPress: () => stackNav.navigate('ManualOrderList') }, { text: 'OK' }],
              );
            } finally {
              setTrustProceeding(false);
            }
          })();
        },
      },
    ]);
  };

  useLayoutEffect(() => {
    tabNav.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          {!simplifiedMode ? <HeaderProactiveBadge /> : null}
          {!simplifiedMode ? <HeaderUrgencyBadge /> : null}
          <Pressable
            onPress={() => stackNav.navigate('Settings')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="設定"
            style={({ pressed }) => [styles.gearBtn, pressed && styles.gearBtnPressed]}
          >
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
          </Pressable>
        </View>
      ),
    });
  }, [tabNav, stackNav, simplifiedMode]);

  if (trustMode) {
    const trustPresentation = trustPlan ? buildTrustPlanPresentation(trustPlan) : null;
    const depositDefault =
      state.settings.totalCapitalMYR > 0 ? state.settings.totalCapitalMYR : 1000;

    return (
      <Screen
        ref={scrollRef}
        title={TRUST_HOME_TITLE_JA}
        subtitle={TRUST_HOME_SUBTITLE_JA}
      >
        <TrustConciergeHomeCard fallbackDepositMYR={depositDefault} />
        <TrustOperatingPerformanceCard
          performanceHistory={
            isPractice ? state.practice.performanceHistory : state.performanceHistory
          }
          trackOperation={Boolean(trustPlan)}
        />
        <TrustMonthlyPerformanceCard
          performanceHistory={
            isPractice ? state.practice.performanceHistory : state.performanceHistory
          }
          plan={trustPlan}
        />
        {isPractice ? <PracticeModeBadge /> : null}

        {trustPresentation ? (
          <TrustHomeApprovalCard
            presentation={trustPresentation}
            onProceed={confirmTrustPlanFromHome}
            proceeding={trustProceeding}
          />
        ) : (
          <Card>
            <Text style={styles.trustHint}>{TRUST_HOME_NO_PLAN_HINT_JA}</Text>
            <Button label="入金額を入力する" onPress={() => tabNav.navigate('AllocationPlan')} />
          </Card>
        )}

        <Card>
          <Text style={styles.disclaimer}>{INVESTMENT_TRUST_DISCLAIMER_JA}</Text>
        </Card>
      </Screen>
    );
  }

  const beginnerAdvice = useMemo(
    () =>
      buildBeginnerTodayAdvice({
        holdings: isPractice ? state.practice.portfolio : state.portfolio,
        materialReport: materialCtx?.report ?? null,
        strategyBundle: proactive?.strategyBundle ?? null,
        loading: materialCtx?.loading === true && !materialCtx?.report,
      }),
    [
      isPractice,
      state.portfolio,
      state.practice.portfolio,
      materialCtx?.report,
      materialCtx?.loading,
      proactive?.strategyBundle,
    ],
  );

  const beginnerPortfolioSummary = useMemo(() => {
    const holdings = (isPractice ? state.practice.portfolio : state.portfolio).filter(
      (p) => p.shares > 0,
    );
    const holdingsMYR = isPractice
      ? practiceStats.portfolioValueMYR
      : portfolioMarketValueMYR(state) + Math.max(0, buyingPower.buyingPowerMYR);
    return `${holdings.length} 銘柄 · 総資産 RM ${holdingsMYR.toLocaleString('ja-JP', {
      maximumFractionDigits: 0,
    })}`;
  }, [isPractice, state, state.practice.portfolio, practiceStats.portfolioValueMYR, buyingPower.buyingPowerMYR]);

  if (isBeginnerMode) {
    return (
      <Screen
        ref={scrollRef}
        title="今日のポートフォリオ"
        subtitle="今日の方針をやさしく整理します"
      >
        {isPractice ? <PracticeModeBadge /> : null}
        <BeginnerTodayAdviceCard
          data={beginnerAdvice}
          onPressDetail={() => tabNav.navigate('MaterialAnalysis')}
        />
        <Text style={styles.portfolioSummary}>{beginnerPortfolioSummary}</Text>
        <View style={styles.ctaRow}>
          <Button label="保有を確認" onPress={() => tabNav.navigate('Portfolio')} />
          <Button
            label="AIに相談する"
            onPress={() => tabNav.navigate('ConciergeConsult')}
            variant="ghost"
          />
        </View>
        <View style={styles.ctaRow}>
          <Button
            label="おすすめ配分を見る"
            onPress={() => tabNav.navigate('AllocationPlan')}
            variant="ghost"
          />
          <Button
            label="はじめての使い方"
            onPress={() => tabNav.navigate('BeginnerGuide')}
            variant="ghost"
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      ref={scrollRef}
      title={isPractice ? APP_MODE_PRACTICE_LABEL : PLATFORM_POSITIONING_TITLE_JA}
      subtitle={isPractice ? PRACTICE_SUBTITLE : PLATFORM_POSITIONING_SUBTITLE_JA}
    >
      <DegradedModeBanner />
      <BursaConciergeHomeCard />
      <BursaMaterialHomeCard />
      {!DISABLE_AI_CONCIERGE_FOR_TOUCH_TEST ? <ProactiveSuggestionsHomeCard /> : null}
      <CentralIntelligencePanel />
      {isPractice ? (
        <>
          <PracticeModeBadge />
          <PracticeSummaryCard stats={practiceStats} />
          <Button label="おすすめ配分プラン" onPress={() => tabNav.navigate('AllocationPlan')} />
          <Button label="仮想買付・仮想売却" onPress={() => stackNav.navigate('AddTrade')} variant="ghost" />
          <Button label="仮想資金・仮想入金" onPress={() => stackNav.navigate('Capital')} variant="ghost" />
          <Button label="銘柄検索" onPress={() => tabNav.navigate('Screener')} variant="ghost" />
          <Button label="成績を見る" onPress={() => stackNav.navigate('Performance')} variant="ghost" />
        </>
      ) : (
        <>
          <BuyingPowerCard result={buyingPower} />
          <Card>
            <Text style={styles.value}>
              {state.settings.totalCapitalMYR > 0
                ? `RM${state.settings.totalCapitalMYR.toLocaleString('ja-JP')}`
                : '未設定'}
            </Text>
            <Text style={styles.meta}>
              市場: {MARKET_LABEL[state.settings.selectedMarket]} · 現金一括
            </Text>
          </Card>
          <Button label="おすすめ配分プラン" onPress={() => tabNav.navigate('AllocationPlan')} />
          <Button label="投資金額・入金計画" onPress={() => stackNav.navigate('Capital')} />
          <Button label="手動注文リスト" onPress={() => stackNav.navigate('ManualOrderList')} variant="ghost" />
          <Button label="銘柄検索" onPress={() => tabNav.navigate('Screener')} variant="ghost" />
          <Button label="売買を記録" onPress={() => stackNav.navigate('AddTrade')} variant="ghost" />
          <Button label="成績を見る" onPress={() => stackNav.navigate('Performance')} variant="ghost" />
        </>
      )}
      <MarketSessionPanel mode="all" />
      <MarketRegimeCard regime={marketRegime} compact />
      <CrossAssetFlowCard flow={crossAssetFlow} compact />
      <AiTradeQueueSection marketRegime={marketRegime} scrollRef={scrollRef} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  gearBtn: {
    marginRight: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  gearBtnPressed: { opacity: 0.7 },
  portfolioSummary: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
    marginVertical: theme.spacing.sm,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  trustHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  disclaimer: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  value: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700', marginTop: 4 },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
});
