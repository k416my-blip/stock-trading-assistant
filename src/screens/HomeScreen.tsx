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
import { useBeginnerTodayAdviceCardData } from '../hooks/useBeginnerTodayAdviceCardData';
import { portfolioMarketValueMYR } from '../services/portfolio';
import { buildTrustPlanPresentation } from '../services/trustRecommendationSummary';
import { recordTrustOperationStartIfNeeded } from '../services/trustOperatingPerformanceStorage';
import { loadTrustPlanSnapshot } from '../services/trustPlanPreviewStorage';
import type { AllocationPlan } from '../types';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';

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
  const { isBeginnerMode, isStandardMode, isProMode } = useAppUxMode();
  const { t } = useTranslation('home');
  const materialCtx = useBursaMaterialOptional();
  const proactive = useProactiveConciergeOptional();
  const trustMode = isTrustDisplayMode(aiPreferences);
  const simplifiedMode = isSimplifiedInvestmentDisplayMode(aiPreferences);
  const conciergeFirstHome = isStandardMode || isProMode;
  const tabNav = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Home'>>();
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  const [trustPlan, setTrustPlan] = useState<AllocationPlan | null>(null);
  const [trustProceeding, setTrustProceeding] = useState(false);

  const reloadTrustSnapshot = useCallback(async () => {
    const snapshot = await loadTrustPlanSnapshot();
    setTrustPlan(snapshot?.plan ?? null);
  }, []);

  const openDepositRecord = useCallback(() => {
    stackNav.navigate('RakutenImportManualEntry', { kind: 'deposit' });
  }, [stackNav]);

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
    Alert.alert(t('trust.confirmTitle'), t('trust.disclaimer'), [
      { text: t('trust.cancel'), style: 'cancel' },
      {
        text: t('trust.proceed'),
        onPress: () => {
          void (async () => {
            setTrustProceeding(true);
            try {
              if (isPractice) {
                const result = await applyAllocationPractice(trustPlan);
                if (!result.ok) {
                  Alert.alert(t('trust.cannotProceedTitle'), result.error ?? t('trust.processFailed'));
                  return;
                }
                await recordTrustOperationStartIfNeeded();
                Alert.alert(t('trust.approvedTitle'), t('trust.approvedPractice'));
                return;
              }
              const result = addAllocationToManualOrderList(trustPlan);
              if (!result.ok) {
                Alert.alert(t('trust.cannotAddTitle'), result.error ?? t('trust.processFailed'));
                return;
              }
              await recordTrustOperationStartIfNeeded();
              Alert.alert(
                t('trust.approvedTitle'),
                t('trust.approvedManual'),
                [{ text: t('trust.viewList'), onPress: () => stackNav.navigate('ManualOrderList') }, { text: t('trust.ok') }],
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
          {!isStandardMode ? (
            <Pressable
              onPress={() => stackNav.navigate('Settings')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('trust.settingsAccessibility')}
              style={({ pressed }) => [styles.gearBtn, pressed && styles.gearBtnPressed]}
            >
              <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
            </Pressable>
          ) : null}
        </View>
      ),
    });
  }, [tabNav, stackNav, simplifiedMode, isStandardMode]);

  const holdings = isPractice ? state.practice.portfolio : state.portfolio;

  const beginnerAdvice = useBeginnerTodayAdviceCardData({
    holdings,
    materialCtx: materialCtx
      ? {
          report: materialCtx.report,
          loading: materialCtx.loading,
          error: materialCtx.error,
        }
      : null,
    strategyBundle: proactive?.strategyBundle ?? null,
  });

  const beginnerPortfolioSummary = useMemo(() => {
    const holdings = (isPractice ? state.practice.portfolio : state.portfolio).filter(
      (p) => p.shares > 0,
    );
    const holdingsMYR = isPractice
      ? practiceStats.portfolioValueMYR
      : portfolioMarketValueMYR(state) + Math.max(0, buyingPower.buyingPowerMYR);
    return t('portfolioSummary', {
      count: holdings.length,
      amount: holdingsMYR.toLocaleString('ja-JP', { maximumFractionDigits: 0 }),
    });
  }, [isPractice, state, state.practice.portfolio, practiceStats.portfolioValueMYR, buyingPower.buyingPowerMYR]);

  if (trustMode) {
    const trustPresentation = trustPlan ? buildTrustPlanPresentation(trustPlan) : null;
    const depositDefault =
      state.settings.totalCapitalMYR > 0 ? state.settings.totalCapitalMYR : 1000;

    return (
      <Screen
        ref={scrollRef}
        title={isStandardMode ? t('title.todayPortfolio') : t('title.trustHome')}
        subtitle={isStandardMode ? t('subtitle.todayAdvice') : t('subtitle.trustHome')}
      >
        <BeginnerTodayAdviceCard
          data={beginnerAdvice}
          onPressDetail={() => tabNav.navigate('MaterialAnalysis')}
        />
        <Button label={t('cta.askAi')} onPress={() => tabNav.navigate('ConciergeConsult')} />
        <Button label={t('cta.recordDeposit')} onPress={openDepositRecord} variant="ghost" />
        {!isStandardMode ? (
          <TrustConciergeHomeCard fallbackDepositMYR={depositDefault} />
        ) : null}
        {!isStandardMode ? (
          <>
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
          </>
        ) : null}
        {isPractice ? <PracticeModeBadge /> : null}

        {trustPresentation ? (
          <TrustHomeApprovalCard
            presentation={trustPresentation}
            onProceed={confirmTrustPlanFromHome}
            proceeding={trustProceeding}
          />
        ) : (
          <Card>
            <Text style={styles.trustHint}>{t('trustNoPlanHint')}</Text>
            <Button label={t('cta.enterDeposit')} onPress={() => tabNav.navigate('AllocationPlan')} />
          </Card>
        )}

        {!isStandardMode ? (
          <Card>
            <Text style={styles.disclaimer}>{t('trust.disclaimer')}</Text>
          </Card>
        ) : null}
      </Screen>
    );
  }

  if (isBeginnerMode) {
    return (
      <Screen
        ref={scrollRef}
        title={t('title.todayPortfolio')}
        subtitle={t('subtitle.todayAdvice')}
      >
        {isPractice ? <PracticeModeBadge /> : null}
        <BeginnerTodayAdviceCard
          data={beginnerAdvice}
          onPressDetail={() => tabNav.navigate('MaterialAnalysis')}
        />
        <Text style={styles.portfolioSummary}>{beginnerPortfolioSummary}</Text>
        <View style={styles.ctaRow}>
          <Button label={t('cta.askAi')} onPress={() => tabNav.navigate('ConciergeConsult')} />
          <Button
            label={t('cta.checkHoldings')}
            onPress={() => tabNav.navigate('Portfolio')}
            variant="ghost"
          />
        </View>
        <Button label={t('cta.recordDeposit')} onPress={openDepositRecord} />
        <View style={styles.ctaRow}>
          <Button
            label={t('cta.viewAllocation')}
            onPress={() => tabNav.navigate('AllocationPlan')}
            variant="ghost"
          />
          <Button
            label={t('cta.beginnerGuide')}
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
      title={
        conciergeFirstHome
          ? t('title.todayPortfolio')
          : isPractice
            ? t('title.practice')
            : t('title.platformPositioning')
      }
      subtitle={
        conciergeFirstHome
          ? t('subtitle.todayAdvice')
          : isPractice
            ? t('subtitle.practice')
            : t('subtitle.platformPositioning')
      }
    >
      <DegradedModeBanner />
      <BeginnerTodayAdviceCard
        data={beginnerAdvice}
        onPressDetail={() => tabNav.navigate('MaterialAnalysis')}
      />
      <Button label={t('proButtons.askAi')} onPress={() => tabNav.navigate('ConciergeConsult')} />
      <Button label={t('cta.recordDeposit')} onPress={openDepositRecord} />
      {!conciergeFirstHome ? (
        <>
          <BursaConciergeHomeCard />
          <BursaMaterialHomeCard />
          {!DISABLE_AI_CONCIERGE_FOR_TOUCH_TEST ? <ProactiveSuggestionsHomeCard /> : null}
          <CentralIntelligencePanel />
        </>
      ) : null}
      {isPractice ? (
        <>
          <PracticeModeBadge />
          <PracticeSummaryCard stats={practiceStats} />
          <Button label={t('proButtons.allocationPlan')} onPress={() => tabNav.navigate('AllocationPlan')} />
          <Button label={t('proButtons.virtualTrade')} onPress={() => stackNav.navigate('AddTrade')} variant="ghost" />
          <Button label={t('proButtons.virtualCapital')} onPress={() => stackNav.navigate('Capital')} variant="ghost" />
          <Button label={t('proButtons.stockSearch')} onPress={() => tabNav.navigate('Screener')} variant="ghost" />
          <Button label={t('proButtons.performance')} onPress={() => stackNav.navigate('Performance')} variant="ghost" />
        </>
      ) : (
        <>
          <BuyingPowerCard result={buyingPower} />
          <Card>
            <Text style={styles.value}>
              {state.settings.totalCapitalMYR > 0
                ? `RM${state.settings.totalCapitalMYR.toLocaleString('ja-JP')}`
                : t('proButtons.notSet')}
            </Text>
            <Text style={styles.meta}>
              {t('proButtons.marketMeta', { market: MARKET_LABEL[state.settings.selectedMarket] })}
            </Text>
          </Card>
          <Button label={t('proButtons.allocationPlan')} onPress={() => tabNav.navigate('AllocationPlan')} />
          <Button label={t('proButtons.capitalPlan')} onPress={() => stackNav.navigate('Capital')} />
          <Button label={t('proButtons.manualOrderList')} onPress={() => stackNav.navigate('ManualOrderList')} variant="ghost" />
          <Button label={t('proButtons.stockSearch')} onPress={() => tabNav.navigate('Screener')} variant="ghost" />
          <Button label={t('proButtons.recordTrade')} onPress={() => stackNav.navigate('AddTrade')} variant="ghost" />
          <Button label={t('proButtons.performance')} onPress={() => stackNav.navigate('Performance')} variant="ghost" />
        </>
      )}
      <MarketSessionPanel mode="all" />
      <MarketRegimeCard regime={marketRegime} compact />
      <CrossAssetFlowCard flow={crossAssetFlow} compact />
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
