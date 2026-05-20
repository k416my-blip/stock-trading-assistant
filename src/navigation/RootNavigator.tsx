import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { theme } from '../theme';
import { AiSettingsScreen } from '../screens/AiSettingsScreen';
import { ApiKeySettingsScreen } from '../screens/ApiKeySettingsScreen';
import { ApiSetupWizardScreen } from '../screens/ApiSetupWizardScreen';
import { ApiConnectionDiagnosticsScreen } from '../screens/ApiConnectionDiagnosticsScreen';
import { AddDividendScreen } from '../screens/AddDividendScreen';
import { AddTradeScreen } from '../screens/AddTradeScreen';
import { ManualAddHoldingScreen } from '../screens/ManualAddHoldingScreen';
import { CapitalScreen } from '../screens/CapitalScreen';
import { ManualOrderListScreen } from '../screens/ManualOrderListScreen';
import { SellAllResultScreen } from '../screens/SellAllResultScreen';
import { HistoricalValidationScreen } from '../screens/HistoricalValidationScreen';
import { RealQuantValidationScreen } from '../screens/RealQuantValidationScreen';
import { PortfolioOptimizationScreen } from '../screens/PortfolioOptimizationScreen';
import { BayesianAllocationScreen } from '../screens/BayesianAllocationScreen';
import { MetaAllocationScreen } from '../screens/MetaAllocationScreen';
import { GovernanceScreen } from '../screens/GovernanceScreen';
import { ShadowTradingScreen } from '../screens/ShadowTradingScreen';
import { MonitoringScreen } from '../screens/MonitoringScreen';
import { AdaptiveExecutionScreen } from '../screens/AdaptiveExecutionScreen';
import { MarketIntelligenceScreen } from '../screens/MarketIntelligenceScreen';
import { DataIntegrityScreen } from '../screens/DataIntegrityScreen';
import { PortfolioStressScreen } from '../screens/PortfolioStressScreen';
import { BehavioralRiskScreen } from '../screens/BehavioralRiskScreen';
import { ModelStabilityScreen } from '../screens/ModelStabilityScreen';
import { MetaCapitalScreen } from '../screens/MetaCapitalScreen';
import { PerformanceScreen } from '../screens/PerformanceScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CurrencySettingsScreen } from '../screens/settings/CurrencySettingsScreen';
import { MarketSettingsScreen } from '../screens/settings/MarketSettingsScreen';
import { PracticeModeSettingsScreen } from '../screens/settings/PracticeModeSettingsScreen';
import { MarketDataDiagnosticsScreen } from '../screens/settings/MarketDataDiagnosticsScreen';
import { UpdateFrequencySettingsScreen } from '../screens/settings/UpdateFrequencySettingsScreen';
import { ExecutionReconciliationScreen } from '../screens/ExecutionReconciliationScreen';
import { SecuritySettingsScreen } from '../screens/SecuritySettingsScreen';
import { StartupDiagnosticsScreen } from '../screens/StartupDiagnosticsScreen';
import { PersonalProductionScreen } from '../screens/PersonalProductionScreen';
import { RiskWarningScreen } from '../screens/RiskWarningScreen';
import { StockDetailScreen } from '../screens/StockDetailScreen';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    border: theme.colors.border,
    primary: theme.colors.primary,
    text: theme.colors.text,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="StockDetail" component={StockDetailScreen} options={{ title: '銘柄分析' }} />
        <Stack.Screen name="AddTrade" component={AddTradeScreen} options={{ title: '売買記録' }} />
        <Stack.Screen
          name="ManualAddHolding"
          component={ManualAddHoldingScreen}
          options={{ title: '保有銘柄に追加' }}
        />
        <Stack.Screen name="AddDividend" component={AddDividendScreen} options={{ title: '配当記録' }} />
        <Stack.Screen name="RiskWarning" component={RiskWarningScreen} options={{ title: 'リスク告知' }} />
        <Stack.Screen name="ManualOrderList" component={ManualOrderListScreen} options={{ title: '手動注文リスト' }} />
        <Stack.Screen name="SellAllResult" component={SellAllResultScreen} options={{ title: 'すべて売却' }} />
        <Stack.Screen name="Capital" component={CapitalScreen} options={{ title: '投資金額' }} />
        <Stack.Screen name="Performance" component={PerformanceScreen} options={{ title: '成績' }} />
        <Stack.Screen
          name="HistoricalValidation"
          component={HistoricalValidationScreen}
          options={{ title: '歴史検証' }}
        />
        <Stack.Screen
          name="RealQuantValidation"
          component={RealQuantValidationScreen}
          options={{ title: '実市場検証' }}
        />
        <Stack.Screen
          name="PortfolioOptimization"
          component={PortfolioOptimizationScreen}
          options={{ title: '機関最適化' }}
        />
        <Stack.Screen
          name="BayesianAllocation"
          component={BayesianAllocationScreen}
          options={{ title: 'ベイズ動的配分' }}
        />
        <Stack.Screen
          name="MetaAllocation"
          component={MetaAllocationScreen}
          options={{ title: 'メタ配分' }}
        />
        <Stack.Screen
          name="Governance"
          component={GovernanceScreen}
          options={{ title: 'ガバナンス' }}
        />
        <Stack.Screen
          name="ShadowTrading"
          component={ShadowTradingScreen}
          options={{ title: 'シャドー取引' }}
        />
        <Stack.Screen
          name="Monitoring"
          component={MonitoringScreen}
          options={{ title: '可視化・モニタリング' }}
        />
        <Stack.Screen
          name="AdaptiveExecution"
          component={AdaptiveExecutionScreen}
          options={{ title: '適応執行・アルファ' }}
        />
        <Stack.Screen
          name="MarketIntelligence"
          component={MarketIntelligenceScreen}
          options={{ title: 'マーケット・インテリジェンス' }}
        />
        <Stack.Screen
          name="DataIntegrity"
          component={DataIntegrityScreen}
          options={{ title: 'データ整合性' }}
        />
        <Stack.Screen
          name="PortfolioStress"
          component={PortfolioStressScreen}
          options={{ title: 'ストレス・テールリスク' }}
        />
        <Stack.Screen
          name="BehavioralRisk"
          component={BehavioralRiskScreen}
          options={{ title: '行動・オペレーターリスク' }}
        />
        <Stack.Screen
          name="ModelStability"
          component={ModelStabilityScreen}
          options={{ title: 'モデル安定性' }}
        />
        <Stack.Screen
          name="MetaCapital"
          component={MetaCapitalScreen}
          options={{ title: 'メタ資本配分' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
        <Stack.Screen name="ApiKeySettings" component={ApiKeySettingsScreen} options={{ title: 'APIキー設定' }} />
        <Stack.Screen
          name="ApiSetupWizard"
          component={ApiSetupWizardScreen}
          options={{ title: 'API設定ウィザード' }}
        />
        <Stack.Screen
          name="ApiConnectionDiagnostics"
          component={ApiConnectionDiagnosticsScreen}
          options={{ title: 'API接続診断' }}
        />
        <Stack.Screen name="AiSettings" component={AiSettingsScreen} options={{ title: 'AI設定' }} />
        <Stack.Screen
          name="NotificationSettings"
          component={NotificationSettingsScreen}
          options={{ title: '通知設定' }}
        />
        <Stack.Screen name="MarketSettings" component={MarketSettingsScreen} options={{ title: '市場設定' }} />
        <Stack.Screen name="CurrencySettings" component={CurrencySettingsScreen} options={{ title: '通貨設定' }} />
        <Stack.Screen
          name="PracticeModeSettings"
          component={PracticeModeSettingsScreen}
          options={{ title: '練習モード設定' }}
        />
        <Stack.Screen
          name="UpdateFrequencySettings"
          component={UpdateFrequencySettingsScreen}
          options={{ title: '更新頻度設定' }}
        />
        <Stack.Screen
          name="MarketDataDiagnostics"
          component={MarketDataDiagnosticsScreen}
          options={{ title: '市場データ診断' }}
        />
        <Stack.Screen
          name="ExecutionReconciliation"
          component={ExecutionReconciliationScreen}
          options={{ title: '執行照合' }}
        />
        <Stack.Screen
          name="SecuritySettings"
          component={SecuritySettingsScreen}
          options={{ title: 'セキュリティ' }}
        />
        <Stack.Screen
          name="StartupDiagnostics"
          component={StartupDiagnosticsScreen}
          options={{ title: '起動診断' }}
        />
        <Stack.Screen
          name="PersonalProduction"
          component={PersonalProductionScreen}
          options={{ title: '個人用運用' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
