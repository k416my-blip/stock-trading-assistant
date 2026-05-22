import { Ionicons } from '@expo/vector-icons';
import { useLayoutEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HeaderUrgencyBadge } from '../components/HeaderUrgencyBadge';
import { HeaderProactiveBadge } from '../components/proactive/HeaderProactiveBadge';
import { ProactiveSuggestionsHomeCard } from '../components/proactive/ProactiveSuggestionsHomeCard';
import { CentralIntelligencePanel } from '../components/CentralIntelligencePanel';
import { AiTradeQueueSection } from '../components/AiTradeQueueSection';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CrossAssetFlowCard } from '../components/CrossAssetFlowCard';
import { MarketRegimeCard } from '../components/MarketRegimeCard';
import { MarketSessionPanel } from '../components/MarketSessionPanel';
import { BuyingPowerCard } from '../components/BuyingPowerCard';
import { DegradedModeBanner } from '../components/DegradedModeBanner';
import { PracticeModeBadge } from '../components/PracticeModeBadge';
import { PracticeSummaryCard } from '../components/PracticeSummaryCard';
import { TermHint } from '../components/TermHint';
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
import { useApp } from '../context/AppContext';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

export function HomeScreen() {
  const { state, buyingPower, isPractice, practiceStats, marketRegime, crossAssetFlow } = useApp();
  const tabNav = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Home'>>();
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);

  useLayoutEffect(() => {
    tabNav.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <HeaderProactiveBadge />
          <HeaderUrgencyBadge />
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
  }, [tabNav, stackNav]);

  return (
    <Screen
      ref={scrollRef}
      title={isPractice ? APP_MODE_PRACTICE_LABEL : PLATFORM_POSITIONING_TITLE_JA}
      subtitle={isPractice ? PRACTICE_SUBTITLE : PLATFORM_POSITIONING_SUBTITLE_JA}
    >
      <DegradedModeBanner />
      <ProactiveSuggestionsHomeCard />
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
            <TermHint term="investmentAmount" />
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
  value: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700', marginTop: 4 },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
});
