import { StyleSheet, Text } from 'react-native';
import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PortfolioConstructionPanel } from '../PortfolioConstructionPanel';
import { InstitutionalRiskPanel } from '../InstitutionalRiskPanel';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { computePortfolioDrawdownPct } from '../../services/crossAssetLiquidityFlowEngine';
import {
  buildInstitutionalRiskInputFromApp,
  buildInstitutionalRiskReport,
} from '../../services/institutionalRiskControlEngine';
import { analyzePortfolioConstruction } from '../../services/portfolioConstructionEngine';
import type { RootStackParamList } from '../../navigation/types';
import { calculateBuyingPower } from '../../services/buyingPower';
import type { AppState, PortfolioPosition, PracticeStats } from '../../types';
import type { MarketRegimeResult } from '../../types/marketRegime';
import { theme } from '../../theme';

type Props = {
  portfolio: PortfolioPosition[];
  holdingsCount: number;
  totalPortfolioValueMYR: number;
  isPractice: boolean;
  state: AppState;
  practiceStats: PracticeStats;
  buyingPower: ReturnType<typeof calculateBuyingPower>;
  marketRegime: MarketRegimeResult;
};

export default function PortfolioAnalyticsSection({
  portfolio,
  holdingsCount,
  totalPortfolioValueMYR,
  isPractice,
  state,
  practiceStats,
  buyingPower,
  marketRegime,
}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const portfolioDrawdownPct = useMemo(() => {
    if (isPractice) {
      return computePortfolioDrawdownPct(
        state.practice.performanceHistory,
        practiceStats.portfolioValueMYR,
      );
    }
    const capital = state.settings.totalCapitalMYR;
    if (capital > 0 && totalPortfolioValueMYR < capital) {
      return ((capital - totalPortfolioValueMYR) / capital) * 100;
    }
    return 0;
  }, [
    isPractice,
    state.practice.performanceHistory,
    state.settings.totalCapitalMYR,
    practiceStats.portfolioValueMYR,
    totalPortfolioValueMYR,
  ]);

  const constructionReport = useMemo(
    () =>
      analyzePortfolioConstruction({
        portfolio,
        totalPortfolioValueMYR,
        regime: marketRegime,
        portfolioDrawdownPct,
      }),
    [portfolio, totalPortfolioValueMYR, marketRegime, portfolioDrawdownPct],
  );

  const institutionalRisk = useMemo(() => {
    if (holdingsCount === 0) return null;
    const base = buildInstitutionalRiskInputFromApp({
      state,
      isPractice,
      practiceStats,
      buyingPower,
      regime: marketRegime,
      portfolioDrawdownPct,
      constructionReport,
    });
    return buildInstitutionalRiskReport(base);
  }, [
    holdingsCount,
    state,
    isPractice,
    practiceStats,
    buyingPower,
    marketRegime,
    portfolioDrawdownPct,
    constructionReport,
  ]);

  if (holdingsCount === 0) return null;

  return (
    <>
      <PortfolioConstructionPanel report={constructionReport} />
      {institutionalRisk ? <InstitutionalRiskPanel report={institutionalRisk} compact /> : null}
      <Card style={styles.optimizeCard}>
        <Text style={styles.optimizeTitle}>機関ポートフォリオ最適化</Text>
        <Text style={styles.optimizeHint}>
          収縮共分散 · リスクパリティ · CVaR · Kelly · レジーム · ターンオーバー制約
        </Text>
        <Button
          label="最適化レポートを開く"
          onPress={() => navigation.navigate('PortfolioOptimization')}
          variant="ghost"
        />
        <Button
          label="ベイズ動的配分"
          onPress={() => navigation.navigate('BayesianAllocation')}
          variant="ghost"
        />
        <Button
          label="メタ配分・アンサンブル"
          onPress={() => navigation.navigate('MetaAllocation')}
          variant="ghost"
        />
        <Button
          label="ガバナンス・説明"
          onPress={() => navigation.navigate('Governance')}
          variant="ghost"
        />
        <Button
          label="可視化・モニタリング"
          onPress={() => navigation.navigate('Monitoring')}
          variant="ghost"
        />
        <Button
          label="適応執行・アルファ"
          onPress={() => navigation.navigate('AdaptiveExecution')}
          variant="ghost"
        />
        <Button
          label="マーケット・インテリジェンス"
          onPress={() => navigation.navigate('MarketIntelligence')}
          variant="ghost"
        />
        <Button
          label="ストレス・テールリスク"
          onPress={() => navigation.navigate('PortfolioStress')}
          variant="ghost"
        />
        <Button
          label="行動・オペレーターリスク"
          onPress={() => navigation.navigate('BehavioralRisk')}
          variant="ghost"
        />
        <Button
          label="モデル安定性"
          onPress={() => navigation.navigate('ModelStability')}
          variant="ghost"
        />
        <Button
          label="メタ資本配分"
          onPress={() => navigation.navigate('MetaCapital')}
          variant="ghost"
        />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  optimizeCard: { marginTop: theme.spacing.sm },
  optimizeTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  optimizeHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
    marginBottom: theme.spacing.sm,
  },
});
