import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ForwardAdxAuditPanel } from '../components/ForwardAdxAuditPanel';
import { ForwardMacdAuditPanel } from '../components/ForwardMacdAuditPanel';
import { ForwardRegimeStandaloneAuditPanel } from '../components/ForwardRegimeStandaloneAuditPanel';
import { ForwardDist52StandaloneAuditPanel } from '../components/ForwardDist52StandaloneAuditPanel';
import { ForwardConditionSplitAuditPanel } from '../components/ForwardConditionSplitAuditPanel';
import { ForwardStandalonePeriodAuditPanel } from '../components/ForwardStandalonePeriodAuditPanel';
import { ForwardMacdDist52PeriodAuditPanel } from '../components/ForwardMacdDist52PeriodAuditPanel';
import { ForwardMacdDist52EtfAuditPanel } from '../components/ForwardMacdDist52EtfAuditPanel';
import { ForwardMacdDist52DedupDayAuditPanel } from '../components/ForwardMacdDist52DedupDayAuditPanel';
import { ForwardMacdDist52DedupTimelineAuditPanel } from '../components/ForwardMacdDist52DedupTimelineAuditPanel';
import { ForwardMacdDist52DedupExclSpringAuditPanel } from '../components/ForwardMacdDist52DedupExclSpringAuditPanel';
import { ForwardMacdDist52ClusterMacroAuditPanel } from '../components/ForwardMacdDist52ClusterMacroAuditPanel';
import { ForwardVixSpyBucketAuditPanel } from '../components/ForwardVixSpyBucketAuditPanel';
import { ForwardVixSpyCrossAuditPanel } from '../components/ForwardVixSpyCrossAuditPanel';
import { ForwardVixSpyFourGroupAuditPanel } from '../components/ForwardVixSpyFourGroupAuditPanel';
import { ForwardSpyVixDist52ComboAuditPanel } from '../components/ForwardSpyVixDist52ComboAuditPanel';
import { ForwardVix25SubBucketAuditPanel } from '../components/ForwardVix25SubBucketAuditPanel';
import { ForwardVix25MacdDistAuditPanel } from '../components/ForwardVix25MacdDistAuditPanel';
import { ForwardVix25Dist52AuditPanel } from '../components/ForwardVix25Dist52AuditPanel';
import { ForwardVix25WinnerHoldAuditPanel } from '../components/ForwardVix25WinnerHoldAuditPanel';
import { ForwardVix25ForwardReturnAuditPanel } from '../components/ForwardVix25ForwardReturnAuditPanel';
import { ForwardVix25MaeMfeAuditPanel } from '../components/ForwardVix25MaeMfeAuditPanel';
import { ForwardVix25MaeWorst10AuditPanel } from '../components/ForwardVix25MaeWorst10AuditPanel';
import { ForwardVix25SpyEtfForwardReturnAuditPanel } from '../components/ForwardVix25SpyEtfForwardReturnAuditPanel';
import { ForwardVix25SpyGapAuditPanel } from '../components/ForwardVix25SpyGapAuditPanel';
import { ForwardFiveFactorSweepAuditPanel } from '../components/ForwardFiveFactorSweepAuditPanel';
import { ForwardVixThresholdSweepAuditPanel } from '../components/ForwardVixThresholdSweepAuditPanel';
import { ForwardVix24StackAuditPanel } from '../components/ForwardVix24StackAuditPanel';
import { ForwardVix24ExitCompareAuditPanel } from '../components/ForwardVix24ExitCompareAuditPanel';
import { ForwardVixBandAuditPanel } from '../components/ForwardVixBandAuditPanel';
import { ForwardVix24StreakAuditPanel } from '../components/ForwardVix24StreakAuditPanel';
import { ForwardVix24EffectivenessAuditPanel } from '../components/ForwardVix24EffectivenessAuditPanel';
import { ForwardVix24OpenEntryAuditPanel } from '../components/ForwardVix24OpenEntryAuditPanel';
import { ForwardVix24PeriodConcentrationAuditPanel } from '../components/ForwardVix24PeriodConcentrationAuditPanel';
import { ForwardSixLossRootCauseAuditPanel } from '../components/ForwardSixLossRootCauseAuditPanel';
import { ForwardVix24WinnerStrengthAuditPanel } from '../components/ForwardVix24WinnerStrengthAuditPanel';
import { ForwardVix24ExtendedHistoryAuditPanel } from '../components/ForwardVix24ExtendedHistoryAuditPanel';
import { ForwardBacktestQualityAuditPanel } from '../components/ForwardBacktestQualityAuditPanel';
import { ForwardOperationalRebacktestAuditPanel } from '../components/ForwardOperationalRebacktestAuditPanel';
import { ForwardOperationalAllocationAuditPanel } from '../components/ForwardOperationalAllocationAuditPanel';
import { ForwardOosValidationAuditPanel } from '../components/ForwardOosValidationAuditPanel';
import { ForwardWalkForwardAuditPanel } from '../components/ForwardWalkForwardAuditPanel';
import { ForwardVixSensitivityAuditPanel } from '../components/ForwardVixSensitivityAuditPanel';
import { ForwardSurvivorshipAuditPanel } from '../components/ForwardSurvivorshipAuditPanel';
import { ForwardMarketDependencyAuditPanel } from '../components/ForwardMarketDependencyAuditPanel';
import { ForwardTpTargetSensitivityAuditPanel } from '../components/ForwardTpTargetSensitivityAuditPanel';
import { ForwardHoldPeriodSensitivityAuditPanel } from '../components/ForwardHoldPeriodSensitivityAuditPanel';
import { ForwardRuleContributionAuditPanel } from '../components/ForwardRuleContributionAuditPanel';
import { ForwardAdxSensitivityAuditPanel } from '../components/ForwardAdxSensitivityAuditPanel';
import { ForwardAdx20ValidationAuditPanel } from '../components/ForwardAdx20ValidationAuditPanel';
import { ForwardDgroLowAdxAuditPanel } from '../components/ForwardDgroLowAdxAuditPanel';
import { ForwardAdx20IndependenceAuditPanel } from '../components/ForwardAdx20IndependenceAuditPanel';
import { ForwardAdxYearlyOptimalAuditPanel } from '../components/ForwardAdxYearlyOptimalAuditPanel';
import { ForwardAdx20WalkForwardAuditPanel } from '../components/ForwardAdx20WalkForwardAuditPanel';
import { ForwardDist52Adx20AuditPanel } from '../components/ForwardDist52Adx20AuditPanel';
import { ForwardVixAdx20AuditPanel } from '../components/ForwardVixAdx20AuditPanel';
import { ForwardSpy63Adx20AuditPanel } from '../components/ForwardSpy63Adx20AuditPanel';
import { ForwardFinalRulesAblationAuditPanel } from '../components/ForwardFinalRulesAblationAuditPanel';
import { ForwardPositionSizingAuditPanel } from '../components/ForwardPositionSizingAuditPanel';
import { ForwardExitStrategyAuditPanel } from '../components/ForwardExitStrategyAuditPanel';
import { ForwardEtfUniverseAuditPanel } from '../components/ForwardEtfUniverseAuditPanel';
import { ForwardRobustnessAuditPanel } from '../components/ForwardRobustnessAuditPanel';
import { ForwardWalkForward31AuditPanel } from '../components/ForwardWalkForward31AuditPanel';
import { ForwardMonteCarloAuditPanel } from '../components/ForwardMonteCarloAuditPanel';
import { ForwardBearStressAuditPanel } from '../components/ForwardBearStressAuditPanel';
import { ForwardEquityCurveAuditPanel } from '../components/ForwardEquityCurveAuditPanel';
import { ForwardLotSizeAuditPanel } from '../components/ForwardLotSizeAuditPanel';
import { ForwardCompoundingAuditPanel } from '../components/ForwardCompoundingAuditPanel';
import { ForwardSymbolContributionAuditPanel } from '../components/ForwardSymbolContributionAuditPanel';
import { ForwardSymbolWeightAuditPanel } from '../components/ForwardSymbolWeightAuditPanel';
import { ForwardRegimeEnvironmentAuditPanel } from '../components/ForwardRegimeEnvironmentAuditPanel';
import { ForwardMaxDrawdownCauseAuditPanel } from '../components/ForwardMaxDrawdownCauseAuditPanel';
import { ForwardQqqNecessityAuditPanel } from '../components/ForwardQqqNecessityAuditPanel';
import { ForwardLosingStreakAuditPanel } from '../components/ForwardLosingStreakAuditPanel';
import { ForwardDangerEnvFilterAuditPanel } from '../components/ForwardDangerEnvFilterAuditPanel';
import { ForwardSpySidewaysValidityAuditPanel } from '../components/ForwardSpySidewaysValidityAuditPanel';
import { ForwardRateHike2022QqqClusterAuditPanel } from '../components/ForwardRateHike2022QqqClusterAuditPanel';
import { ForwardVix2430BandValidityAuditPanel } from '../components/ForwardVix2430BandValidityAuditPanel';
import { ForwardRateHikePhaseAuditPanel } from '../components/ForwardRateHikePhaseAuditPanel';
import { ForwardQqqIntrinsicRiskAuditPanel } from '../components/ForwardQqqIntrinsicRiskAuditPanel';
import { ForwardReproducibilityAuditPanel } from '../components/ForwardReproducibilityAuditPanel';
import { Forward2022RootCauseAuditPanel } from '../components/Forward2022RootCauseAuditPanel';
import { ForwardOverfitAuditPanel } from '../components/ForwardOverfitAuditPanel';
import { ForwardWinFactorAuditPanel } from '../components/ForwardWinFactorAuditPanel';
import { ForwardDurabilityAuditPanel } from '../components/ForwardDurabilityAuditPanel';
import { ForwardCompleteOosAuditPanel } from '../components/ForwardCompleteOosAuditPanel';
import { ForwardAnomalyResilienceAuditPanel } from '../components/ForwardAnomalyResilienceAuditPanel';
import { ForwardMarketChangeAuditPanel } from '../components/ForwardMarketChangeAuditPanel';
import { ForwardLehmanBreakdownAuditPanel } from '../components/ForwardLehmanBreakdownAuditPanel';
import { ForwardLehmanLotAuditPanel } from '../components/ForwardLehmanLotAuditPanel';
import { ForwardDynamicLotAuditPanel } from '../components/ForwardDynamicLotAuditPanel';
import { ForwardKellyTriggerAuditPanel } from '../components/ForwardKellyTriggerAuditPanel';
import { ForwardMcDurabilityAuditPanel } from '../components/ForwardMcDurabilityAuditPanel';
import { ForwardBootstrapMcAuditPanel } from '../components/ForwardBootstrapMcAuditPanel';
import { ForwardWf7030OosAuditPanel } from '../components/ForwardWf7030OosAuditPanel';
import { ForwardMalaysiaV1AuditPanel } from '../components/ForwardMalaysiaV1AuditPanel';
import { ForwardMalaysiaV2AuditPanel } from '../components/ForwardMalaysiaV2AuditPanel';
import { ForwardMalaysiaV2DurabilityAuditPanel } from '../components/ForwardMalaysiaV2DurabilityAuditPanel';
import { ForwardMalaysiaV2DiversificationAuditPanel } from '../components/ForwardMalaysiaV2DiversificationAuditPanel';
import { ForwardMalaysiaV2WeightAuditPanel } from '../components/ForwardMalaysiaV2WeightAuditPanel';
import { ForwardMalaysiaV21FourthSymbolAuditPanel } from '../components/ForwardMalaysiaV21FourthSymbolAuditPanel';
import { ForwardMalaysiaV3DcaAuditPanel } from '../components/ForwardMalaysiaV3DcaAuditPanel';
import { ForwardMalaysiaV3CrashAuditPanel } from '../components/ForwardMalaysiaV3CrashAuditPanel';
import { ForwardMalaysiaV3GamudaCapAuditPanel } from '../components/ForwardMalaysiaV3GamudaCapAuditPanel';
import { ForwardMalaysiaV3Cap15AuditPanel } from '../components/ForwardMalaysiaV3Cap15AuditPanel';
import { ForwardMalaysiaV3YtlDependencyAuditPanel } from '../components/ForwardMalaysiaV3YtlDependencyAuditPanel';
import { ForwardMalaysiaV3YtlVerifyAuditPanel } from '../components/ForwardMalaysiaV3YtlVerifyAuditPanel';
import { ForwardMalaysiaV4CandidateAuditPanel } from '../components/ForwardMalaysiaV4CandidateAuditPanel';
import { ForwardMalaysiaV4AttributionAuditPanel } from '../components/ForwardMalaysiaV4AttributionAuditPanel';
import { ForwardMalaysiaV4IjmOosAuditPanel } from '../components/ForwardMalaysiaV4IjmOosAuditPanel';
import { ForwardMalaysiaV4FinalCompareAuditPanel } from '../components/ForwardMalaysiaV4FinalCompareAuditPanel';
import { ForwardMalaysiaV4OpsMonitorAuditPanel } from '../components/ForwardMalaysiaV4OpsMonitorAuditPanel';
import { ForwardMalaysiaV4YahooQualityAuditPanel } from '../components/ForwardMalaysiaV4YahooQualityAuditPanel';
import { ForwardMalaysiaV4RebalanceAuditPanel } from '../components/ForwardMalaysiaV4RebalanceAuditPanel';
import { ForwardMalaysiaV4TwelveBursaAuditPanel } from '../components/ForwardMalaysiaV4TwelveBursaAuditPanel';
import { ForwardMacdCumulativeAuditPanel } from '../components/ForwardMacdCumulativeAuditPanel';
import { ForwardMacdExclSpringAuditPanel } from '../components/ForwardMacdExclSpringAuditPanel';
import { ForwardEightCellAuditPanel } from '../components/ForwardEightCellAuditPanel';
import { ForwardStrongCellMonthlyAuditPanel } from '../components/ForwardStrongCellMonthlyAuditPanel';
import { ForwardStrongCellFilterAuditPanel } from '../components/ForwardStrongCellFilterAuditPanel';
import { ForwardStrongCellExclListingAuditPanel } from '../components/ForwardStrongCellExclListingAuditPanel';
import { ForwardTakeProfitSensitivityAuditPanel } from '../components/ForwardTakeProfitSensitivityAuditPanel';
import { ForwardTrailingStopAuditPanel } from '../components/ForwardTrailingStopAuditPanel';
import { ForwardMaxHoldAuditPanel } from '../components/ForwardMaxHoldAuditPanel';
import { ForwardLoserCompleteAuditPanel } from '../components/ForwardLoserCompleteAuditPanel';
import { ForwardLoserFeatureAuditPanel } from '../components/ForwardLoserFeatureAuditPanel';
import { ForwardApril2025ExcludeAuditPanel } from '../components/ForwardApril2025ExcludeAuditPanel';
import { ForwardApril2025ClusterExplainerAuditPanel } from '../components/ForwardApril2025ClusterExplainerAuditPanel';
import { ForwardSpyDownClusterAuditPanel } from '../components/ForwardSpyDownClusterAuditPanel';
import { ForwardStrongCellReproAuditPanel } from '../components/ForwardStrongCellReproAuditPanel';
import { ForwardDownDist10ReproAuditPanel } from '../components/ForwardDownDist10ReproAuditPanel';
import { ForwardDownDist10WalkForwardAuditPanel } from '../components/ForwardDownDist10WalkForwardAuditPanel';
import { ForwardFourFactorComboAuditPanel } from '../components/ForwardFourFactorComboAuditPanel';
import { ForwardReturnCorrelationAuditPanel } from '../components/ForwardReturnCorrelationAuditPanel';
import { ForwardRegimeDist52CrossAuditPanel } from '../components/ForwardRegimeDist52CrossAuditPanel';
import { ForwardRegimePerformanceAuditPanel } from '../components/ForwardRegimePerformanceAuditPanel';
import { ForwardAdxDist52CrossAuditPanel } from '../components/ForwardAdxDist52CrossAuditPanel';
import { ForwardDist52AuditPanel } from '../components/ForwardDist52AuditPanel';
import { ForwardWinLossAuditPanel } from '../components/ForwardWinLossAuditPanel';
import { ForwardPassedTradesAuditPanel } from '../components/ForwardPassedTradesAuditPanel';
import { ForwardConditionBlockAuditPanel } from '../components/ForwardConditionBlockAuditPanel';
import { ForwardOperationalMonitorPanel } from '../components/ForwardOperationalMonitorPanel';
import { ForwardSignalGapAuditPanel } from '../components/ForwardSignalGapAuditPanel';
import { ForwardValidationPanel } from '../components/ForwardValidationPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { FORWARD_ETF_UNIVERSE } from '../constants/forwardValidation';
import type { RootStackParamList } from '../navigation/types';
import { auditForwardValidation } from '../services/forwardValidation/forwardValidationAudit';
import {
  buildForwardValidationCsv,
  buildLatestSignalsCsv,
  LATEST_SIGNALS_CSV_LIMIT,
} from '../services/forwardValidation/forwardValidationCsv';
import {
  computeForwardMetrics,
  compareWithBacktestBaseline,
  runForwardValidation,
  type ForwardOhlcvBundle,
} from '../services/forwardValidation/forwardValidationEngine';
import { buildOperationalSnapshot } from '../services/forwardValidation/forwardValidationMonitoring';
import {
  auditRegimeStandalone,
  formatRegimeStandaloneCsv,
} from '../services/forwardValidation/forwardValidationRegimeStandaloneAudit';
import {
  auditDist52Standalone,
  formatDist52StandaloneCsv,
} from '../services/forwardValidation/forwardValidationDist52StandaloneAudit';
import {
  auditConditionSplit,
  formatConditionSplitCsv,
} from '../services/forwardValidation/forwardValidationConditionSplitAudit';
import {
  auditStandalonePeriod,
  formatStandalonePeriodCsv,
} from '../services/forwardValidation/forwardValidationStandalonePeriodAudit';
import {
  auditMacdDist52Period,
  formatMacdDist52PeriodCsv,
} from '../services/forwardValidation/forwardValidationMacdDist52PeriodAudit';
import {
  auditMacdDist52Etf,
  formatMacdDist52EtfCsv,
} from '../services/forwardValidation/forwardValidationMacdDist52EtfAudit';
import {
  auditMacdDist52DedupDay,
  formatMacdDist52DedupDayCsv,
} from '../services/forwardValidation/forwardValidationMacdDist52DedupDayAudit';
import {
  auditMacdDist52DedupTimeline,
  formatMacdDist52DedupTimelineCsv,
} from '../services/forwardValidation/forwardValidationMacdDist52DedupTimelineAudit';
import {
  auditMacdDist52DedupExclSpring,
  formatMacdDist52DedupExclSpringCsv,
} from '../services/forwardValidation/forwardValidationMacdDist52DedupExclSpringAudit';
import {
  auditMacdDist52ClusterMacro,
  formatMacdDist52ClusterMacroCsv,
} from '../services/forwardValidation/forwardValidationMacdDist52ClusterMacroAudit';
import {
  auditVixSpyBuckets,
  formatVixSpyBucketCsv,
} from '../services/forwardValidation/forwardValidationVixSpyBucketAudit';
import {
  auditVixSpyCross,
  formatVixSpyCrossCsv,
} from '../services/forwardValidation/forwardValidationVixSpyCrossAudit';
import {
  auditVixSpyFourGroups,
  formatVixSpyFourGroupCsv,
} from '../services/forwardValidation/forwardValidationVixSpyFourGroupAudit';
import {
  auditSpyVixDist52Combo,
  formatSpyVixDist52ComboCsv,
} from '../services/forwardValidation/forwardValidationSpyVixDist52ComboAudit';
import {
  auditVix25SubBuckets,
  formatVix25SubBucketCsv,
} from '../services/forwardValidation/forwardValidationVix25SubBucketAudit';
import {
  auditVix25MacdDist,
  formatVix25MacdDistCsv,
} from '../services/forwardValidation/forwardValidationVix25MacdDistAudit';
import {
  auditVix25Dist52,
  formatVix25Dist52Csv,
} from '../services/forwardValidation/forwardValidationVix25Dist52Audit';
import {
  auditVix25WinnerHold,
  formatVix25WinnerHoldCsv,
} from '../services/forwardValidation/forwardValidationVix25WinnerHoldAudit';
import {
  auditVix25ForwardReturns,
  formatVix25ForwardReturnCsv,
} from '../services/forwardValidation/forwardValidationVix25ForwardReturnAudit';
import {
  auditVix25MaeMfe,
  formatVix25MaeMfeCsv,
} from '../services/forwardValidation/forwardValidationVix25MaeMfeAudit';
import {
  auditVix25MaeWorst10,
  formatVix25MaeWorst10Csv,
} from '../services/forwardValidation/forwardValidationVix25MaeWorst10Audit';
import {
  auditVix25SpyEtfForwardReturns,
  formatVix25SpyEtfForwardReturnCsv,
} from '../services/forwardValidation/forwardValidationVix25SpyEtfForwardReturnAudit';
import {
  auditVix25SpyGap,
  formatVix25SpyGapCsv,
} from '../services/forwardValidation/forwardValidationVix25SpyGapAudit';
import {
  auditFiveFactorSweep,
  formatFiveFactorSweepCsv,
} from '../services/forwardValidation/forwardValidationFiveFactorSweepAudit';
import {
  auditVixThresholdSweep,
  formatVixThresholdSweepCsv,
} from '../services/forwardValidation/forwardValidationVixThresholdSweepAudit';
import {
  auditVix24Stack,
  formatVix24StackCsv,
} from '../services/forwardValidation/forwardValidationVix24StackAudit';
import {
  auditVix24ExitCompare,
  formatVix24ExitCompareCsv,
} from '../services/forwardValidation/forwardValidationVix24ExitCompareAudit';
import {
  auditVixBands,
  formatVixBandCsv,
} from '../services/forwardValidation/forwardValidationVixBandAudit';
import {
  auditVix24Streak,
  formatVix24StreakCsv,
} from '../services/forwardValidation/forwardValidationVix24StreakAudit';
import {
  auditVix24Effectiveness,
  formatVix24EffectivenessCsv,
} from '../services/forwardValidation/forwardValidationVix24EffectivenessAudit';
import {
  auditVix24OpenEntry,
  formatVix24OpenEntryCsv,
} from '../services/forwardValidation/forwardValidationVix24OpenEntryAudit';
import {
  auditVix24PeriodConcentration,
  formatVix24PeriodConcentrationCsv,
} from '../services/forwardValidation/forwardValidationVix24PeriodConcentrationAudit';
import {
  auditSixLossRootCause,
  formatSixLossRootCauseCsv,
} from '../services/forwardValidation/forwardValidationSixLossRootCauseAudit';
import {
  auditVix24WinnerStrength,
  formatVix24WinnerStrengthCsv,
} from '../services/forwardValidation/forwardValidationVix24WinnerStrengthAudit';
import {
  formatVix24ExtendedHistoryCsv,
  runVix24ExtendedHistoryAudit,
} from '../services/forwardValidation/forwardValidationVix24ExtendedHistoryAudit';
import type {
  ForwardBacktestQualityAuditReport,
  ForwardOperationalRebacktestAuditReport,
  ForwardVix24ExtendedHistoryAuditReport,
} from '../types/forwardValidation';
import {
  formatBacktestQualityCsv,
  runBacktestQualityAudit,
} from '../services/forwardValidation/forwardValidationBacktestQualityAudit';
import {
  formatOperationalRebacktestCsv,
  runOperationalRebacktestAudit,
} from '../services/forwardValidation/forwardValidationOperationalRebacktestAudit';
import type { ForwardOperationalAllocationAuditReport } from '../types/forwardValidation';
import {
  formatOperationalAllocationCsv,
  runOperationalAllocationAudit,
} from '../services/forwardValidation/forwardValidationOperationalAllocationAudit';
import type { ForwardOosValidationAuditReport } from '../types/forwardValidation';
import {
  formatOosValidationCsv,
  runOosValidationAudit,
} from '../services/forwardValidation/forwardValidationOosValidationAudit';
import type { ForwardWalkForwardAuditReport } from '../types/forwardValidation';
import {
  formatWalkForwardCsv,
  runWalkForwardAudit,
} from '../services/forwardValidation/forwardValidationWalkForwardAudit';
import type { ForwardVixSensitivityAuditReport } from '../types/forwardValidation';
import {
  formatVixSensitivityCsv,
  runVixSensitivityAudit,
} from '../services/forwardValidation/forwardValidationVixSensitivityAudit';
import type {
  ForwardMarketDependencyAuditReport,
  ForwardSurvivorshipAuditReport,
  ForwardTpTargetSensitivityAuditReport,
  ForwardHoldPeriodSensitivityAuditReport,
  ForwardRuleContributionAuditReport,
  ForwardAdxSensitivityAuditReport,
  ForwardAdx20ValidationAuditReport,
  ForwardDgroLowAdxAuditReport,
  ForwardAdx20IndependenceAuditReport,
  ForwardAdxYearlyOptimalAuditReport,
  ForwardAdx20WalkForwardAuditReport,
  ForwardDist52Adx20AuditReport,
  ForwardVixAdx20AuditReport,
  ForwardSpy63Adx20AuditReport,
  ForwardFinalRulesAblationAuditReport,
  ForwardPositionSizingAuditReport,
  ForwardExitStrategyAuditReport,
  ForwardEtfUniverseAuditReport,
  ForwardRobustnessAuditReport,
  ForwardWalkForward31AuditReport,
  ForwardMonteCarloAuditReport,
  ForwardBearStressAuditReport,
  ForwardEquityCurveAuditReport,
  ForwardLotSizeAuditReport,
  ForwardCompoundingAuditReport,
  ForwardSymbolContributionAuditReport,
  ForwardSymbolWeightAuditReport,
  ForwardRegimeEnvironmentAuditReport,
  ForwardMaxDrawdownAuditReport,
  ForwardQqqNecessityAuditReport,
  ForwardLosingStreakAuditReport,
  ForwardDangerEnvFilterAuditReport,
  ForwardSpySidewaysValidityAuditReport,
  ForwardRateHike2022QqqAuditReport,
  ForwardVix2430BandValidityAuditReport,
  ForwardRateHikePhaseAuditReport,
  ForwardQqqIntrinsicRiskAuditReport,
  ForwardReproducibilityAuditReport,
  Forward2022RootCauseAuditReport,
  ForwardOverfitAuditReport,
  ForwardWinFactorAuditReport,
  ForwardDurabilityAuditReport,
  ForwardCompleteOosAuditReport,
  ForwardAnomalyResilienceAuditReport,
  ForwardMarketChangeAuditReport,
  ForwardLehmanBreakdownAuditReport,
  ForwardLehmanLotAuditReport,
  ForwardDynamicLotAuditReport,
  ForwardKellyTriggerAuditReport,
  ForwardMcDurabilityAuditReport,
  ForwardBootstrapMcAuditReport,
  ForwardWf7030OosAuditReport,
  ForwardMalaysiaV1AuditReport,
  ForwardMalaysiaV2AuditReport,
  ForwardMalaysiaV2DurabilityAuditReport,
  ForwardMalaysiaV2DiversificationAuditReport,
  ForwardMalaysiaV2WeightAuditReport,
  ForwardMalaysiaV21FourthSymbolAuditReport,
  ForwardMalaysiaV3DcaAuditReport,
  ForwardMalaysiaV3CrashAuditReport,
  ForwardMalaysiaV3GamudaCapAuditReport,
  ForwardMalaysiaV3Cap15AuditReport,
  ForwardMalaysiaV3YtlDependencyAuditReport,
  ForwardMalaysiaV3YtlVerifyAuditReport,
  ForwardMalaysiaV4CandidateAuditReport,
  ForwardMalaysiaV4AttributionAuditReport,
  ForwardMalaysiaV4IjmOosAuditReport,
  ForwardMalaysiaV4FinalCompareAuditReport,
  ForwardMalaysiaV4OpsMonitorAuditReport,
  ForwardMalaysiaV4YahooQualityAuditReport,
  ForwardMalaysiaV4RebalanceAuditReport,
  ForwardMalaysiaV4TwelveBursaAuditReport,
} from '../types/forwardValidation';
import {
  formatSurvivorshipCsv,
  runSurvivorshipAudit,
} from '../services/forwardValidation/forwardValidationSurvivorshipAudit';
import {
  formatMarketDependencyCsv,
  runMarketDependencyAudit,
} from '../services/forwardValidation/forwardValidationMarketDependencyAudit';
import {
  formatTpTargetSensitivityCsv,
  runTpTargetSensitivityAudit,
} from '../services/forwardValidation/forwardValidationTpTargetSensitivityAudit';
import {
  formatHoldPeriodSensitivityCsv,
  runHoldPeriodSensitivityAudit,
} from '../services/forwardValidation/forwardValidationHoldPeriodSensitivityAudit';
import {
  formatRuleContributionCsv,
  runRuleContributionAudit,
} from '../services/forwardValidation/forwardValidationRuleContributionAudit';
import {
  formatAdxSensitivityCsv,
  runAdxSensitivityAudit,
} from '../services/forwardValidation/forwardValidationAdxSensitivityAudit';
import {
  formatAdx20ValidationCsv,
  runAdx20ValidationAudit,
} from '../services/forwardValidation/forwardValidationAdx20ValidationAudit';
import {
  formatDgroLowAdxCsv,
  runDgroLowAdxAudit,
} from '../services/forwardValidation/forwardValidationDgroLowAdxAudit';
import {
  formatAdx20IndependenceCsv,
  runAdx20IndependenceAudit,
} from '../services/forwardValidation/forwardValidationAdx20IndependenceAudit';
import {
  formatAdxYearlyOptimalCsv,
  runAdxYearlyOptimalAudit,
} from '../services/forwardValidation/forwardValidationAdxYearlyOptimalAudit';
import {
  formatAdx20WalkForwardCsv,
  runAdx20WalkForwardAudit,
} from '../services/forwardValidation/forwardValidationAdx20WalkForwardAudit';
import {
  formatDist52Adx20Csv,
  runDist52Adx20Audit,
} from '../services/forwardValidation/forwardValidationDist52Adx20Audit';
import {
  formatVixAdx20Csv,
  runVixAdx20Audit,
} from '../services/forwardValidation/forwardValidationVixAdx20Audit';
import {
  formatSpy63Adx20Csv,
  runSpy63Adx20Audit,
} from '../services/forwardValidation/forwardValidationSpy63Adx20Audit';
import {
  formatFinalRulesAblationCsv,
  runFinalRulesAblationAudit,
} from '../services/forwardValidation/forwardValidationFinalRulesAblationAudit';
import {
  formatPositionSizingCsv,
  runPositionSizingAudit,
} from '../services/forwardValidation/forwardValidationPositionSizingAudit';
import {
  formatExitStrategyCsv,
  runExitStrategyAudit,
} from '../services/forwardValidation/forwardValidationExitStrategyAudit';
import {
  formatEtfUniverseCsv,
  runEtfUniverseAudit,
} from '../services/forwardValidation/forwardValidationEtfUniverseAudit';
import {
  formatRobustnessCsv,
  runRobustnessAudit,
} from '../services/forwardValidation/forwardValidationRobustnessAudit';
import {
  formatWalkForward31Csv,
  runWalkForward31Audit,
} from '../services/forwardValidation/forwardValidationWalkForward31Audit';
import {
  formatMonteCarloCsv,
  runMonteCarloAudit,
} from '../services/forwardValidation/forwardValidationMonteCarloAudit';
import {
  formatBearStressCsv,
  runBearStressAudit,
} from '../services/forwardValidation/forwardValidationBearStressAudit';
import {
  formatEquityCurveCsv,
  runEquityCurveAudit,
} from '../services/forwardValidation/forwardValidationEquityCurveAudit';
import {
  formatLotSizeCsv,
  runLotSizeAudit,
} from '../services/forwardValidation/forwardValidationLotSizeAudit';
import {
  formatCompoundingCsv,
  runCompoundingAudit,
} from '../services/forwardValidation/forwardValidationCompoundingAudit';
import {
  formatSymbolContributionCsv,
  runSymbolContributionAudit,
} from '../services/forwardValidation/forwardValidationSymbolContributionAudit';
import {
  formatSymbolWeightCsv,
  runSymbolWeightAudit,
} from '../services/forwardValidation/forwardValidationSymbolWeightAudit';
import {
  formatRegimeEnvironmentCsv,
  runRegimeEnvironmentAudit,
} from '../services/forwardValidation/forwardValidationRegimeEnvironmentAudit';
import {
  formatMaxDrawdownCauseCsv,
  runMaxDrawdownCauseAudit,
} from '../services/forwardValidation/forwardValidationMaxDrawdownCauseAudit';
import {
  formatQqqNecessityCsv,
  runQqqNecessityAudit,
} from '../services/forwardValidation/forwardValidationQqqNecessityAudit';
import {
  formatLosingStreakCsv,
  runLosingStreakAudit,
} from '../services/forwardValidation/forwardValidationLosingStreakAudit';
import {
  formatDangerEnvFilterCsv,
  runDangerEnvFilterAudit,
} from '../services/forwardValidation/forwardValidationDangerousEnvironmentFilterAudit';
import {
  formatSpySidewaysValidityCsv,
  runSpySidewaysValidityAudit,
} from '../services/forwardValidation/forwardValidationSpySidewaysValidityAudit';
import {
  formatRateHike2022QqqClusterCsv,
  runRateHike2022QqqClusterAudit,
} from '../services/forwardValidation/forwardValidationRateHike2022QqqClusterAudit';
import {
  formatVix2430BandValidityCsv,
  runVix2430BandValidityAudit,
} from '../services/forwardValidation/forwardValidationVix2430BandValidityAudit';
import {
  formatRateHikePhaseCsv,
  runRateHikePhaseAudit,
} from '../services/forwardValidation/forwardValidationRateHikePhaseAudit';
import {
  formatQqqIntrinsicRiskCsv,
  runQqqIntrinsicRiskAudit,
} from '../services/forwardValidation/forwardValidationQqqIntrinsicRiskAudit';
import {
  formatReproducibilityCsv,
  runReproducibilityAudit,
} from '../services/forwardValidation/forwardValidationReproducibilityAudit';
import {
  format2022RootCauseCsv,
  run2022RootCauseAudit,
} from '../services/forwardValidation/forwardValidation2022RootCauseAudit';
import {
  formatOverfitCsv,
  runOverfitAudit,
} from '../services/forwardValidation/forwardValidationOverfitAudit';
import {
  formatWinFactorCsv,
  runWinFactorAudit,
} from '../services/forwardValidation/forwardValidationWinFactorAudit';
import {
  formatDurabilityCsv,
  runDurabilityAudit,
} from '../services/forwardValidation/forwardValidationDurabilityAudit';
import {
  formatCompleteOosCsv,
  runCompleteOosAudit,
} from '../services/forwardValidation/forwardValidationCompleteOosAudit';
import {
  formatAnomalyResilienceCsv,
  runAnomalyResilienceAudit,
} from '../services/forwardValidation/forwardValidationAnomalyResilienceAudit';
import {
  formatMarketChangeCsv,
  runMarketChangeAudit,
} from '../services/forwardValidation/forwardValidationMarketChangeAudit';
import {
  formatLehmanBreakdownCsv,
  runLehmanBreakdownAudit,
} from '../services/forwardValidation/forwardValidationLehmanBreakdownAudit';
import {
  formatLehmanLotCsv,
  runLehmanLotAudit,
} from '../services/forwardValidation/forwardValidationLehmanLotAudit';
import {
  formatDynamicLotCsv,
  runDynamicLotAudit,
} from '../services/forwardValidation/forwardValidationDynamicLotAudit';
import {
  formatKellyTriggerCsv,
  runKellyTriggerAudit,
} from '../services/forwardValidation/forwardValidationKellyTriggerAudit';
import {
  formatMcDurabilityCsv,
  runMcDurabilityAudit,
} from '../services/forwardValidation/forwardValidationMcDurabilityAudit';
import {
  formatBootstrapMcCsv,
  runBootstrapMcAudit,
} from '../services/forwardValidation/forwardValidationBootstrapMcAudit';
import {
  formatWf7030OosCsv,
  runWf7030OosAudit,
} from '../services/forwardValidation/forwardValidationWf7030OosAudit';
import {
  formatMalaysiaV1Csv,
  runMalaysiaV1Audit,
} from '../services/forwardValidation/forwardValidationMalaysiaV1Audit';
import {
  formatMalaysiaV2Csv,
  runMalaysiaV2Audit,
} from '../services/forwardValidation/forwardValidationMalaysiaV2Audit';
import {
  formatMalaysiaV2DurabilityCsv,
  runMalaysiaV2DurabilityAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV2DurabilityAudit';
import {
  formatMalaysiaV2DiversificationCsv,
  runMalaysiaV2DiversificationAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV2DiversificationAudit';
import {
  formatMalaysiaV2WeightCsv,
  runMalaysiaV2WeightAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV2WeightAudit';
import {
  formatMalaysiaV21FourthSymbolCsv,
  runMalaysiaV21FourthSymbolAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV21FourthSymbolAudit';
import {
  formatMalaysiaV3DcaCsv,
  runMalaysiaV3DcaAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV3DcaAudit';
import {
  formatMalaysiaV3CrashCsv,
  runMalaysiaV3CrashAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV3CrashAudit';
import {
  formatMalaysiaV3GamudaCapCsv,
  runMalaysiaV3GamudaCapAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV3GamudaCapAudit';
import {
  formatMalaysiaV3Cap15Csv,
  runMalaysiaV3Cap15Audit,
} from '../services/forwardValidation/forwardValidationMalaysiaV3Cap15Audit';
import {
  formatMalaysiaV3YtlDependencyCsv,
  runMalaysiaV3YtlDependencyAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV3YtlDependencyAudit';
import {
  formatMalaysiaV3YtlVerifyCsv,
  runMalaysiaV3YtlVerifyAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV3YtlVerifyAudit';
import {
  formatMalaysiaV4CandidateCsv,
  runMalaysiaV4CandidateAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV4CandidateAudit';
import {
  formatMalaysiaV4AttributionCsv,
  runMalaysiaV4AttributionAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV4AttributionAudit';
import {
  formatMalaysiaV4IjmOosCsv,
  runMalaysiaV4IjmOosAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV4IjmOosAudit';
import {
  formatMalaysiaV4FinalCompareCsv,
  runMalaysiaV4FinalCompareAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV4FinalCompareAudit';
import {
  formatMalaysiaV4OpsMonitorCsv,
  runMalaysiaV4OpsMonitorAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV4OpsMonitorAudit';
import {
  formatMalaysiaV4YahooQualityCsv,
  runMalaysiaV4YahooQualityAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV4YahooQualityAudit';
import {
  formatMalaysiaV4RebalanceCsv,
  runMalaysiaV4RebalanceAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV4RebalanceAudit';
import {
  formatMalaysiaV4TwelveBursaCsv,
  runMalaysiaV4TwelveBursaAudit,
} from '../services/forwardValidation/forwardValidationMalaysiaV4TwelveBursaAudit';
import { useApp } from '../context/AppContext';
import { isMalaysiaMarket } from '../utils/normalizeBursaSymbol';
import {
  auditMacdCumulative,
  formatMacdCumulativeCsv,
} from '../services/forwardValidation/forwardValidationMacdCumulativeAudit';
import {
  auditMacdExclSpring,
  formatMacdExclSpringCsv,
} from '../services/forwardValidation/forwardValidationMacdExclSpringAudit';
import {
  auditEightCell,
  formatEightCellCsv,
} from '../services/forwardValidation/forwardValidationEightCellAudit';
import {
  auditStrongCellMonthly,
  formatStrongCellMonthlyCsv,
} from '../services/forwardValidation/forwardValidationStrongCellMonthlyAudit';
import {
  auditStrongCellFilter,
  formatStrongCellFilterCsv,
} from '../services/forwardValidation/forwardValidationStrongCellFilterAudit';
import {
  auditStrongCellExclListing,
  formatStrongCellExclListingCsv,
} from '../services/forwardValidation/forwardValidationStrongCellExclListingAudit';
import {
  auditTakeProfitSensitivity,
  formatTakeProfitSensitivityCsv,
} from '../services/forwardValidation/forwardValidationTakeProfitSensitivityAudit';
import {
  auditTrailingStopCompare,
  formatTrailingStopAuditCsv,
} from '../services/forwardValidation/forwardValidationTrailingStopAudit';
import {
  auditMaxHoldTrades,
  formatMaxHoldAuditCsv,
} from '../services/forwardValidation/forwardValidationMaxHoldAudit';
import {
  auditLoserComplete,
  formatLoserCompleteCsv,
} from '../services/forwardValidation/forwardValidationLoserCompleteAudit';
import {
  auditLoserFeatures,
  formatLoserFeatureAuditCsv,
} from '../services/forwardValidation/forwardValidationLoserFeatureAudit';
import {
  auditApril2025Exclusion,
  formatApril2025ExcludeCsv,
} from '../services/forwardValidation/forwardValidationApril2025ExcludeAudit';
import {
  auditApril2025ClusterExplainer,
  formatApril2025ClusterExplainerCsv,
} from '../services/forwardValidation/forwardValidationApril2025ClusterExplainerAudit';
import {
  auditSpyDownCluster,
  formatSpyDownClusterCsv,
} from '../services/forwardValidation/forwardValidationSpyDownClusterAudit';
import {
  auditStrongCellReproducibility,
  formatStrongCellReproCsv,
} from '../services/forwardValidation/forwardValidationStrongCellReproAudit';
import {
  auditDownDist10Repro,
  formatDownDist10ReproCsv,
} from '../services/forwardValidation/forwardValidationDownDist10ReproAudit';
import {
  auditDownDist10WalkForward,
  formatDownDist10WalkForwardCsv,
} from '../services/forwardValidation/forwardValidationDownDist10WalkForwardAudit';
import {
  auditFourFactorCombo,
  formatFourFactorComboCsv,
} from '../services/forwardValidation/forwardValidationFourFactorComboAudit';
import {
  auditReturnCorrelation,
  formatReturnCorrelationCsv,
} from '../services/forwardValidation/forwardValidationReturnCorrelationAudit';
import {
  auditRegimeDist52Cross,
  formatRegimeDist52CrossCsv,
} from '../services/forwardValidation/forwardValidationRegimeDist52CrossAudit';
import {
  auditRegimePerformance,
  formatRegimePerformanceCsv,
} from '../services/forwardValidation/forwardValidationRegimePerformanceAudit';
import {
  auditAdxDist52Cross,
  formatAdxDist52CrossCsv,
} from '../services/forwardValidation/forwardValidationAdxDist52CrossAudit';
import {
  auditDist52Performance,
  formatDist52AuditCsv,
} from '../services/forwardValidation/forwardValidationDist52Audit';
import {
  auditWinLossComparison,
  formatWinLossAuditCsv,
} from '../services/forwardValidation/forwardValidationWinLossAudit';
import {
  auditPassedTrades,
  formatPassedTradesAuditCsv,
} from '../services/forwardValidation/forwardValidationPassedTradesAudit';
import {
  auditMacdDetail,
  formatMacdAuditCsv,
} from '../services/forwardValidation/forwardValidationMacdAudit';
import {
  auditAdxDetail,
  formatAdxAuditCsv,
} from '../services/forwardValidation/forwardValidationAdxAudit';
import {
  auditConditionBlockRates,
  formatConditionBlockAuditCsv,
} from '../services/forwardValidation/forwardValidationConditionBlockAudit';
import {
  auditSignalGapSince,
  formatSignalGapReportCsv,
} from '../services/forwardValidation/forwardValidationSignalGapAudit';
import {
  loadForwardValidationState,
  resetForwardValidationState,
} from '../services/forwardValidation/forwardValidationStorage';
import type { ForwardValidationPersisted, ForwardYahooFetchLog } from '../types/forwardValidation';
import { theme } from '../theme';

export function ForwardValidationScreen() {
  const { state: appState, isPractice } = useApp();
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [state, setState] = useState<ForwardValidationPersisted | null>(null);
  const [bundle, setBundle] = useState<ForwardOhlcvBundle | null>(null);
  const [fetchLog, setFetchLog] = useState<ForwardYahooFetchLog | null>(null);
  const [processedDates, setProcessedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayNow, setDisplayNow] = useState(() => new Date().toISOString());

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    setDisplayNow(new Date().toISOString());
    try {
      const result = await runForwardValidation({ force });
      if (!result) {
        const cached = await loadForwardValidationState();
        setState(cached);
        setBundle(null);
        setFetchLog(cached.yahooFetchLog);
        setProcessedDates([]);
        const failLog = cached.yahooFetchLog;
        const failDetail = failLog?.symbols
          .filter((s) => !s.ok)
          .map((s) => `${s.symbol}: ${s.error}`)
          .join('\n');
        setError(
          ['Yahoo Finance から OHLCV を取得できませんでした。', failDetail].filter(Boolean).join('\n'),
        );
        return;
      }
      setState(result.state);
      setBundle(result.bundle);
      setFetchLog(result.fetchLog);
      setProcessedDates(result.processedDates);
    } catch (e) {
      setError(e instanceof Error ? e.message : '前向き検証の実行に失敗しました');
      const cached = await loadForwardValidationState();
      setState(cached);
      setFetchLog(cached.yahooFetchLog);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh(false);
    }, [refresh]),
  );

  const empty = useMemo(() => defaultEmpty(), []);
  const persisted = state ?? empty;

  const metrics = computeForwardMetrics(persisted);
  const comparison = compareWithBacktestBaseline(metrics);
  const operational = useMemo(
    () =>
      buildOperationalSnapshot({
        state: persisted,
        bundle,
        fetchLog: fetchLog ?? persisted.yahooFetchLog,
      }),
    [persisted, bundle, fetchLog],
  );
  const signalGapReport = useMemo(
    () => (state && bundle ? auditSignalGapSince({ state, bundle }) : null),
    [state, bundle],
  );
  const conditionBlockReport = useMemo(
    () => (bundle ? auditConditionBlockRates({ bundle }) : null),
    [bundle],
  );
  const adxAuditReport = useMemo(
    () => (bundle ? auditAdxDetail({ bundle }) : null),
    [bundle],
  );
  const macdAuditReport = useMemo(
    () => (bundle ? auditMacdDetail({ bundle }) : null),
    [bundle],
  );
  const passedTradesReport = useMemo(
    () => (bundle ? auditPassedTrades({ bundle }) : null),
    [bundle],
  );
  const winLossReport = useMemo(
    () => (bundle ? auditWinLossComparison({ bundle }) : null),
    [bundle],
  );
  const dist52Report = useMemo(
    () => (bundle ? auditDist52Performance({ bundle }) : null),
    [bundle],
  );
  const adxDist52CrossReport = useMemo(
    () => (bundle ? auditAdxDist52Cross({ bundle }) : null),
    [bundle],
  );
  const regimePerformanceReport = useMemo(
    () => (bundle ? auditRegimePerformance({ bundle }) : null),
    [bundle],
  );
  const regimeDist52CrossReport = useMemo(
    () => (bundle ? auditRegimeDist52Cross({ bundle }) : null),
    [bundle],
  );
  const returnCorrelationReport = useMemo(
    () => (bundle ? auditReturnCorrelation({ bundle }) : null),
    [bundle],
  );
  const fourFactorComboReport = useMemo(
    () => (bundle ? auditFourFactorCombo({ bundle }) : null),
    [bundle],
  );
  const strongCellReproReport = useMemo(
    () => (bundle ? auditStrongCellReproducibility({ bundle }) : null),
    [bundle],
  );
  const downDist10ReproReport = useMemo(
    () => (bundle ? auditDownDist10Repro({ bundle }) : null),
    [bundle],
  );
  const downDist10WalkForwardReport = useMemo(
    () => (bundle ? auditDownDist10WalkForward({ bundle }) : null),
    [bundle],
  );
  const spyDownClusterReport = useMemo(
    () => (bundle ? auditSpyDownCluster({ bundle }) : null),
    [bundle],
  );
  const april2025ExcludeReport = useMemo(
    () => (bundle ? auditApril2025Exclusion({ bundle }) : null),
    [bundle],
  );
  const april2025ClusterExplainerReport = useMemo(
    () => (bundle ? auditApril2025ClusterExplainer({ bundle }) : null),
    [bundle],
  );
  const loserCompleteReport = useMemo(
    () => (bundle ? auditLoserComplete({ bundle }) : null),
    [bundle],
  );
  const loserFeatureReport = useMemo(
    () => (bundle ? auditLoserFeatures({ bundle }) : null),
    [bundle],
  );
  const maxHoldReport = useMemo(
    () => (bundle ? auditMaxHoldTrades({ bundle }) : null),
    [bundle],
  );
  const takeProfitSensitivityReport = useMemo(
    () => (bundle ? auditTakeProfitSensitivity({ bundle }) : null),
    [bundle],
  );
  const conditionSplitReport = useMemo(
    () => (bundle ? auditConditionSplit({ bundle }) : null),
    [bundle],
  );
  const standalonePeriodReport = useMemo(
    () => (bundle ? auditStandalonePeriod({ bundle }) : null),
    [bundle],
  );
  const macdDist52PeriodReport = useMemo(
    () => (bundle ? auditMacdDist52Period({ bundle }) : null),
    [bundle],
  );
  const macdDist52EtfReport = useMemo(
    () => (bundle ? auditMacdDist52Etf({ bundle }) : null),
    [bundle],
  );
  const macdDist52DedupDayReport = useMemo(
    () => (bundle ? auditMacdDist52DedupDay({ bundle }) : null),
    [bundle],
  );
  const macdDist52DedupTimelineReport = useMemo(
    () => (bundle ? auditMacdDist52DedupTimeline({ bundle }) : null),
    [bundle],
  );
  const macdDist52DedupExclSpringReport = useMemo(
    () => (bundle ? auditMacdDist52DedupExclSpring({ bundle }) : null),
    [bundle],
  );
  const macdDist52ClusterMacroReport = useMemo(
    () => (bundle ? auditMacdDist52ClusterMacro({ bundle }) : null),
    [bundle],
  );
  const vixSpyBucketReport = useMemo(
    () => (bundle ? auditVixSpyBuckets({ bundle }) : null),
    [bundle],
  );
  const vixSpyCrossReport = useMemo(
    () => (bundle ? auditVixSpyCross({ bundle }) : null),
    [bundle],
  );
  const vixSpyFourGroupReport = useMemo(
    () => (bundle ? auditVixSpyFourGroups({ bundle }) : null),
    [bundle],
  );
  const spyVixDist52ComboReport = useMemo(
    () => (bundle ? auditSpyVixDist52Combo({ bundle }) : null),
    [bundle],
  );
  const vix25SubBucketReport = useMemo(
    () => (bundle ? auditVix25SubBuckets({ bundle }) : null),
    [bundle],
  );
  const vix25MacdDistReport = useMemo(
    () => (bundle ? auditVix25MacdDist({ bundle }) : null),
    [bundle],
  );
  const vix25Dist52Report = useMemo(
    () => (bundle ? auditVix25Dist52({ bundle }) : null),
    [bundle],
  );
  const vix25WinnerHoldReport = useMemo(
    () => (bundle ? auditVix25WinnerHold({ bundle }) : null),
    [bundle],
  );
  const vix25ForwardReturnReport = useMemo(
    () => (bundle ? auditVix25ForwardReturns({ bundle }) : null),
    [bundle],
  );
  const vix25MaeMfeReport = useMemo(
    () => (bundle ? auditVix25MaeMfe({ bundle }) : null),
    [bundle],
  );
  const vix25MaeWorst10Report = useMemo(
    () => (bundle ? auditVix25MaeWorst10({ bundle }) : null),
    [bundle],
  );
  const vix25SpyEtfForwardReturnReport = useMemo(
    () => (bundle ? auditVix25SpyEtfForwardReturns({ bundle }) : null),
    [bundle],
  );
  const vix25SpyGapReport = useMemo(
    () => (bundle ? auditVix25SpyGap({ bundle }) : null),
    [bundle],
  );
  const fiveFactorSweepReport = useMemo(
    () => (bundle ? auditFiveFactorSweep({ bundle }) : null),
    [bundle],
  );
  const vixThresholdSweepReport = useMemo(
    () => (bundle ? auditVixThresholdSweep({ bundle }) : null),
    [bundle],
  );
  const vix24StackReport = useMemo(
    () => (bundle ? auditVix24Stack({ bundle }) : null),
    [bundle],
  );
  const vix24ExitCompareReport = useMemo(
    () => (bundle ? auditVix24ExitCompare({ bundle }) : null),
    [bundle],
  );
  const vixBandReport = useMemo(
    () => (bundle ? auditVixBands({ bundle }) : null),
    [bundle],
  );
  const vix24StreakReport = useMemo(
    () => (bundle ? auditVix24Streak({ bundle }) : null),
    [bundle],
  );
  const vix24EffectivenessReport = useMemo(
    () => (bundle ? auditVix24Effectiveness({ bundle }) : null),
    [bundle],
  );
  const vix24OpenEntryReport = useMemo(
    () => (bundle ? auditVix24OpenEntry({ bundle }) : null),
    [bundle],
  );
  const vix24PeriodConcentrationReport = useMemo(
    () => (bundle ? auditVix24PeriodConcentration({ bundle }) : null),
    [bundle],
  );
  const sixLossRootCauseReport = useMemo(
    () => (bundle ? auditSixLossRootCause({ bundle }) : null),
    [bundle],
  );
  const vix24WinnerStrengthReport = useMemo(
    () => (bundle ? auditVix24WinnerStrength({ bundle }) : null),
    [bundle],
  );
  const [vix24ExtendedHistoryReport, setVix24ExtendedHistoryReport] =
    useState<ForwardVix24ExtendedHistoryAuditReport | null>(null);
  const [extendedHistoryLoading, setExtendedHistoryLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setExtendedHistoryLoading(true);
    void runVix24ExtendedHistoryAudit()
      .then((r) => {
        if (!cancelled) setVix24ExtendedHistoryReport(r);
      })
      .finally(() => {
        if (!cancelled) setExtendedHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [backtestQualityReport, setBacktestQualityReport] =
    useState<ForwardBacktestQualityAuditReport | null>(null);
  const [backtestQualityLoading, setBacktestQualityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBacktestQualityLoading(true);
    void runBacktestQualityAudit()
      .then((r) => {
        if (!cancelled) setBacktestQualityReport(r);
      })
      .finally(() => {
        if (!cancelled) setBacktestQualityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [operationalRebacktestReport, setOperationalRebacktestReport] =
    useState<ForwardOperationalRebacktestAuditReport | null>(null);
  const [operationalRebacktestLoading, setOperationalRebacktestLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOperationalRebacktestLoading(true);
    void runOperationalRebacktestAudit()
      .then((r) => {
        if (!cancelled) setOperationalRebacktestReport(r);
      })
      .finally(() => {
        if (!cancelled) setOperationalRebacktestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [operationalAllocationReport, setOperationalAllocationReport] =
    useState<ForwardOperationalAllocationAuditReport | null>(null);
  const [operationalAllocationLoading, setOperationalAllocationLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOperationalAllocationLoading(true);
    void runOperationalAllocationAudit()
      .then((r) => {
        if (!cancelled) setOperationalAllocationReport(r);
      })
      .finally(() => {
        if (!cancelled) setOperationalAllocationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [oosValidationReport, setOosValidationReport] =
    useState<ForwardOosValidationAuditReport | null>(null);
  const [oosValidationLoading, setOosValidationLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOosValidationLoading(true);
    void runOosValidationAudit()
      .then((r) => {
        if (!cancelled) setOosValidationReport(r);
      })
      .finally(() => {
        if (!cancelled) setOosValidationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [walkForwardReport, setWalkForwardReport] = useState<ForwardWalkForwardAuditReport | null>(
    null,
  );
  const [walkForwardLoading, setWalkForwardLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setWalkForwardLoading(true);
    void runWalkForwardAudit()
      .then((r) => {
        if (!cancelled) setWalkForwardReport(r);
      })
      .finally(() => {
        if (!cancelled) setWalkForwardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [vixSensitivityReport, setVixSensitivityReport] =
    useState<ForwardVixSensitivityAuditReport | null>(null);
  const [vixSensitivityLoading, setVixSensitivityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setVixSensitivityLoading(true);
    void runVixSensitivityAudit()
      .then((r) => {
        if (!cancelled) setVixSensitivityReport(r);
      })
      .finally(() => {
        if (!cancelled) setVixSensitivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [survivorshipReport, setSurvivorshipReport] =
    useState<ForwardSurvivorshipAuditReport | null>(null);
  const [survivorshipLoading, setSurvivorshipLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSurvivorshipLoading(true);
    void runSurvivorshipAudit()
      .then((r) => {
        if (!cancelled) setSurvivorshipReport(r);
      })
      .finally(() => {
        if (!cancelled) setSurvivorshipLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [marketDependencyReport, setMarketDependencyReport] =
    useState<ForwardMarketDependencyAuditReport | null>(null);
  const [marketDependencyLoading, setMarketDependencyLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMarketDependencyLoading(true);
    void runMarketDependencyAudit()
      .then((r) => {
        if (!cancelled) setMarketDependencyReport(r);
      })
      .finally(() => {
        if (!cancelled) setMarketDependencyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [tpTargetSensitivityReport, setTpTargetSensitivityReport] =
    useState<ForwardTpTargetSensitivityAuditReport | null>(null);
  const [tpTargetSensitivityLoading, setTpTargetSensitivityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTpTargetSensitivityLoading(true);
    void runTpTargetSensitivityAudit()
      .then((r) => {
        if (!cancelled) setTpTargetSensitivityReport(r);
      })
      .finally(() => {
        if (!cancelled) setTpTargetSensitivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [holdPeriodSensitivityReport, setHoldPeriodSensitivityReport] =
    useState<ForwardHoldPeriodSensitivityAuditReport | null>(null);
  const [holdPeriodSensitivityLoading, setHoldPeriodSensitivityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHoldPeriodSensitivityLoading(true);
    void runHoldPeriodSensitivityAudit()
      .then((r) => {
        if (!cancelled) setHoldPeriodSensitivityReport(r);
      })
      .finally(() => {
        if (!cancelled) setHoldPeriodSensitivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [ruleContributionReport, setRuleContributionReport] =
    useState<ForwardRuleContributionAuditReport | null>(null);
  const [ruleContributionLoading, setRuleContributionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRuleContributionLoading(true);
    void runRuleContributionAudit()
      .then((r) => {
        if (!cancelled) setRuleContributionReport(r);
      })
      .finally(() => {
        if (!cancelled) setRuleContributionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [adxSensitivityReport, setAdxSensitivityReport] =
    useState<ForwardAdxSensitivityAuditReport | null>(null);
  const [adxSensitivityLoading, setAdxSensitivityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAdxSensitivityLoading(true);
    void runAdxSensitivityAudit()
      .then((r) => {
        if (!cancelled) setAdxSensitivityReport(r);
      })
      .finally(() => {
        if (!cancelled) setAdxSensitivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [adx20ValidationReport, setAdx20ValidationReport] =
    useState<ForwardAdx20ValidationAuditReport | null>(null);
  const [adx20ValidationLoading, setAdx20ValidationLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAdx20ValidationLoading(true);
    void runAdx20ValidationAudit()
      .then((r) => {
        if (!cancelled) setAdx20ValidationReport(r);
      })
      .finally(() => {
        if (!cancelled) setAdx20ValidationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [dgroLowAdxReport, setDgroLowAdxReport] = useState<ForwardDgroLowAdxAuditReport | null>(
    null,
  );
  const [dgroLowAdxLoading, setDgroLowAdxLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDgroLowAdxLoading(true);
    void runDgroLowAdxAudit()
      .then((r) => {
        if (!cancelled) setDgroLowAdxReport(r);
      })
      .finally(() => {
        if (!cancelled) setDgroLowAdxLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [adx20IndependenceReport, setAdx20IndependenceReport] =
    useState<ForwardAdx20IndependenceAuditReport | null>(null);
  const [adx20IndependenceLoading, setAdx20IndependenceLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAdx20IndependenceLoading(true);
    void runAdx20IndependenceAudit()
      .then((r) => {
        if (!cancelled) setAdx20IndependenceReport(r);
      })
      .finally(() => {
        if (!cancelled) setAdx20IndependenceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [adxYearlyOptimalReport, setAdxYearlyOptimalReport] =
    useState<ForwardAdxYearlyOptimalAuditReport | null>(null);
  const [adxYearlyOptimalLoading, setAdxYearlyOptimalLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAdxYearlyOptimalLoading(true);
    void runAdxYearlyOptimalAudit()
      .then((r) => {
        if (!cancelled) setAdxYearlyOptimalReport(r);
      })
      .finally(() => {
        if (!cancelled) setAdxYearlyOptimalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [adx20WalkForwardReport, setAdx20WalkForwardReport] =
    useState<ForwardAdx20WalkForwardAuditReport | null>(null);
  const [adx20WalkForwardLoading, setAdx20WalkForwardLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAdx20WalkForwardLoading(true);
    void runAdx20WalkForwardAudit()
      .then((r) => {
        if (!cancelled) setAdx20WalkForwardReport(r);
      })
      .finally(() => {
        if (!cancelled) setAdx20WalkForwardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [dist52Adx20Report, setDist52Adx20Report] = useState<ForwardDist52Adx20AuditReport | null>(
    null,
  );
  const [dist52Adx20Loading, setDist52Adx20Loading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDist52Adx20Loading(true);
    void runDist52Adx20Audit()
      .then((r) => {
        if (!cancelled) setDist52Adx20Report(r);
      })
      .finally(() => {
        if (!cancelled) setDist52Adx20Loading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [vixAdx20Report, setVixAdx20Report] = useState<ForwardVixAdx20AuditReport | null>(null);
  const [vixAdx20Loading, setVixAdx20Loading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setVixAdx20Loading(true);
    void runVixAdx20Audit()
      .then((r) => {
        if (!cancelled) setVixAdx20Report(r);
      })
      .finally(() => {
        if (!cancelled) setVixAdx20Loading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [spy63Adx20Report, setSpy63Adx20Report] = useState<ForwardSpy63Adx20AuditReport | null>(null);
  const [spy63Adx20Loading, setSpy63Adx20Loading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSpy63Adx20Loading(true);
    void runSpy63Adx20Audit()
      .then((r) => {
        if (!cancelled) setSpy63Adx20Report(r);
      })
      .finally(() => {
        if (!cancelled) setSpy63Adx20Loading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [finalRulesAblationReport, setFinalRulesAblationReport] =
    useState<ForwardFinalRulesAblationAuditReport | null>(null);
  const [finalRulesAblationLoading, setFinalRulesAblationLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFinalRulesAblationLoading(true);
    void runFinalRulesAblationAudit()
      .then((r) => {
        if (!cancelled) setFinalRulesAblationReport(r);
      })
      .finally(() => {
        if (!cancelled) setFinalRulesAblationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [positionSizingReport, setPositionSizingReport] =
    useState<ForwardPositionSizingAuditReport | null>(null);
  const [positionSizingLoading, setPositionSizingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPositionSizingLoading(true);
    void runPositionSizingAudit()
      .then((r) => {
        if (!cancelled) setPositionSizingReport(r);
      })
      .finally(() => {
        if (!cancelled) setPositionSizingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [exitStrategyReport, setExitStrategyReport] =
    useState<ForwardExitStrategyAuditReport | null>(null);
  const [exitStrategyLoading, setExitStrategyLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setExitStrategyLoading(true);
    void runExitStrategyAudit()
      .then((r) => {
        if (!cancelled) setExitStrategyReport(r);
      })
      .finally(() => {
        if (!cancelled) setExitStrategyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [etfUniverseReport, setEtfUniverseReport] =
    useState<ForwardEtfUniverseAuditReport | null>(null);
  const [etfUniverseLoading, setEtfUniverseLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEtfUniverseLoading(true);
    void runEtfUniverseAudit()
      .then((r) => {
        if (!cancelled) setEtfUniverseReport(r);
      })
      .finally(() => {
        if (!cancelled) setEtfUniverseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [robustnessReport, setRobustnessReport] =
    useState<ForwardRobustnessAuditReport | null>(null);
  const [robustnessLoading, setRobustnessLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRobustnessLoading(true);
    void runRobustnessAudit()
      .then((r) => {
        if (!cancelled) setRobustnessReport(r);
      })
      .finally(() => {
        if (!cancelled) setRobustnessLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [walkForward31Report, setWalkForward31Report] =
    useState<ForwardWalkForward31AuditReport | null>(null);
  const [walkForward31Loading, setWalkForward31Loading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setWalkForward31Loading(true);
    void runWalkForward31Audit()
      .then((r) => {
        if (!cancelled) setWalkForward31Report(r);
      })
      .finally(() => {
        if (!cancelled) setWalkForward31Loading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [monteCarloReport, setMonteCarloReport] =
    useState<ForwardMonteCarloAuditReport | null>(null);
  const [monteCarloLoading, setMonteCarloLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMonteCarloLoading(true);
    void runMonteCarloAudit()
      .then((r) => {
        if (!cancelled) setMonteCarloReport(r);
      })
      .finally(() => {
        if (!cancelled) setMonteCarloLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [bearStressReport, setBearStressReport] =
    useState<ForwardBearStressAuditReport | null>(null);
  const [bearStressLoading, setBearStressLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBearStressLoading(true);
    void runBearStressAudit()
      .then((r) => {
        if (!cancelled) setBearStressReport(r);
      })
      .finally(() => {
        if (!cancelled) setBearStressLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [equityCurveReport, setEquityCurveReport] =
    useState<ForwardEquityCurveAuditReport | null>(null);
  const [equityCurveLoading, setEquityCurveLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEquityCurveLoading(true);
    void runEquityCurveAudit()
      .then((r) => {
        if (!cancelled) setEquityCurveReport(r);
      })
      .finally(() => {
        if (!cancelled) setEquityCurveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [lotSizeReport, setLotSizeReport] = useState<ForwardLotSizeAuditReport | null>(null);
  const [lotSizeLoading, setLotSizeLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLotSizeLoading(true);
    void runLotSizeAudit()
      .then((r) => {
        if (!cancelled) setLotSizeReport(r);
      })
      .finally(() => {
        if (!cancelled) setLotSizeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [compoundingReport, setCompoundingReport] =
    useState<ForwardCompoundingAuditReport | null>(null);
  const [compoundingLoading, setCompoundingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCompoundingLoading(true);
    void runCompoundingAudit()
      .then((r) => {
        if (!cancelled) setCompoundingReport(r);
      })
      .finally(() => {
        if (!cancelled) setCompoundingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [symbolContributionReport, setSymbolContributionReport] =
    useState<ForwardSymbolContributionAuditReport | null>(null);
  const [symbolContributionLoading, setSymbolContributionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSymbolContributionLoading(true);
    void runSymbolContributionAudit()
      .then((r) => {
        if (!cancelled) setSymbolContributionReport(r);
      })
      .finally(() => {
        if (!cancelled) setSymbolContributionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [symbolWeightReport, setSymbolWeightReport] =
    useState<ForwardSymbolWeightAuditReport | null>(null);
  const [symbolWeightLoading, setSymbolWeightLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSymbolWeightLoading(true);
    void runSymbolWeightAudit()
      .then((r) => {
        if (!cancelled) setSymbolWeightReport(r);
      })
      .finally(() => {
        if (!cancelled) setSymbolWeightLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [regimeEnvironmentReport, setRegimeEnvironmentReport] =
    useState<ForwardRegimeEnvironmentAuditReport | null>(null);
  const [regimeEnvironmentLoading, setRegimeEnvironmentLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRegimeEnvironmentLoading(true);
    void runRegimeEnvironmentAudit()
      .then((r) => {
        if (!cancelled) setRegimeEnvironmentReport(r);
      })
      .finally(() => {
        if (!cancelled) setRegimeEnvironmentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [maxDrawdownCauseReport, setMaxDrawdownCauseReport] =
    useState<ForwardMaxDrawdownAuditReport | null>(null);
  const [maxDrawdownCauseLoading, setMaxDrawdownCauseLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMaxDrawdownCauseLoading(true);
    void runMaxDrawdownCauseAudit()
      .then((r) => {
        if (!cancelled) setMaxDrawdownCauseReport(r);
      })
      .finally(() => {
        if (!cancelled) setMaxDrawdownCauseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [qqqNecessityReport, setQqqNecessityReport] =
    useState<ForwardQqqNecessityAuditReport | null>(null);
  const [qqqNecessityLoading, setQqqNecessityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setQqqNecessityLoading(true);
    void runQqqNecessityAudit()
      .then((r) => {
        if (!cancelled) setQqqNecessityReport(r);
      })
      .finally(() => {
        if (!cancelled) setQqqNecessityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [losingStreakReport, setLosingStreakReport] =
    useState<ForwardLosingStreakAuditReport | null>(null);
  const [losingStreakLoading, setLosingStreakLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLosingStreakLoading(true);
    void runLosingStreakAudit()
      .then((r) => {
        if (!cancelled) setLosingStreakReport(r);
      })
      .finally(() => {
        if (!cancelled) setLosingStreakLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [dangerEnvFilterReport, setDangerEnvFilterReport] =
    useState<ForwardDangerEnvFilterAuditReport | null>(null);
  const [dangerEnvFilterLoading, setDangerEnvFilterLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDangerEnvFilterLoading(true);
    void runDangerEnvFilterAudit()
      .then((r) => {
        if (!cancelled) setDangerEnvFilterReport(r);
      })
      .finally(() => {
        if (!cancelled) setDangerEnvFilterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [spySidewaysValidityReport, setSpySidewaysValidityReport] =
    useState<ForwardSpySidewaysValidityAuditReport | null>(null);
  const [spySidewaysValidityLoading, setSpySidewaysValidityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSpySidewaysValidityLoading(true);
    void runSpySidewaysValidityAudit()
      .then((r) => {
        if (!cancelled) setSpySidewaysValidityReport(r);
      })
      .finally(() => {
        if (!cancelled) setSpySidewaysValidityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [rateHike2022QqqReport, setRateHike2022QqqReport] =
    useState<ForwardRateHike2022QqqAuditReport | null>(null);
  const [rateHike2022QqqLoading, setRateHike2022QqqLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRateHike2022QqqLoading(true);
    void runRateHike2022QqqClusterAudit()
      .then((r) => {
        if (!cancelled) setRateHike2022QqqReport(r);
      })
      .finally(() => {
        if (!cancelled) setRateHike2022QqqLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [vix2430BandReport, setVix2430BandReport] =
    useState<ForwardVix2430BandValidityAuditReport | null>(null);
  const [vix2430BandLoading, setVix2430BandLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setVix2430BandLoading(true);
    void runVix2430BandValidityAudit()
      .then((r) => {
        if (!cancelled) setVix2430BandReport(r);
      })
      .finally(() => {
        if (!cancelled) setVix2430BandLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [rateHikePhaseReport, setRateHikePhaseReport] =
    useState<ForwardRateHikePhaseAuditReport | null>(null);
  const [rateHikePhaseLoading, setRateHikePhaseLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRateHikePhaseLoading(true);
    void runRateHikePhaseAudit()
      .then((r) => {
        if (!cancelled) setRateHikePhaseReport(r);
      })
      .finally(() => {
        if (!cancelled) setRateHikePhaseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [qqqIntrinsicRiskReport, setQqqIntrinsicRiskReport] =
    useState<ForwardQqqIntrinsicRiskAuditReport | null>(null);
  const [qqqIntrinsicRiskLoading, setQqqIntrinsicRiskLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setQqqIntrinsicRiskLoading(true);
    void runQqqIntrinsicRiskAudit()
      .then((r) => {
        if (!cancelled) setQqqIntrinsicRiskReport(r);
      })
      .finally(() => {
        if (!cancelled) setQqqIntrinsicRiskLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [reproducibilityReport, setReproducibilityReport] =
    useState<ForwardReproducibilityAuditReport | null>(null);
  const [reproducibilityLoading, setReproducibilityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReproducibilityLoading(true);
    void runReproducibilityAudit()
      .then((r) => {
        if (!cancelled) setReproducibilityReport(r);
      })
      .finally(() => {
        if (!cancelled) setReproducibilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [rootCause2022Report, setRootCause2022Report] =
    useState<Forward2022RootCauseAuditReport | null>(null);
  const [rootCause2022Loading, setRootCause2022Loading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRootCause2022Loading(true);
    void run2022RootCauseAudit()
      .then((r) => {
        if (!cancelled) setRootCause2022Report(r);
      })
      .finally(() => {
        if (!cancelled) setRootCause2022Loading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [overfitReport, setOverfitReport] = useState<ForwardOverfitAuditReport | null>(null);
  const [overfitLoading, setOverfitLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOverfitLoading(true);
    void runOverfitAudit()
      .then((r) => {
        if (!cancelled) setOverfitReport(r);
      })
      .finally(() => {
        if (!cancelled) setOverfitLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [winFactorReport, setWinFactorReport] = useState<ForwardWinFactorAuditReport | null>(null);
  const [winFactorLoading, setWinFactorLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setWinFactorLoading(true);
    void runWinFactorAudit()
      .then((r) => {
        if (!cancelled) setWinFactorReport(r);
      })
      .finally(() => {
        if (!cancelled) setWinFactorLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [durabilityReport, setDurabilityReport] =
    useState<ForwardDurabilityAuditReport | null>(null);
  const [durabilityLoading, setDurabilityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDurabilityLoading(true);
    void runDurabilityAudit()
      .then((r) => {
        if (!cancelled) setDurabilityReport(r);
      })
      .finally(() => {
        if (!cancelled) setDurabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [completeOosReport, setCompleteOosReport] =
    useState<ForwardCompleteOosAuditReport | null>(null);
  const [completeOosLoading, setCompleteOosLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCompleteOosLoading(true);
    void runCompleteOosAudit()
      .then((r) => {
        if (!cancelled) setCompleteOosReport(r);
      })
      .finally(() => {
        if (!cancelled) setCompleteOosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [anomalyReport, setAnomalyReport] = useState<ForwardAnomalyResilienceAuditReport | null>(
    null,
  );
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAnomalyLoading(true);
    void runAnomalyResilienceAudit()
      .then((r) => {
        if (!cancelled) setAnomalyReport(r);
      })
      .finally(() => {
        if (!cancelled) setAnomalyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [marketChangeReport, setMarketChangeReport] =
    useState<ForwardMarketChangeAuditReport | null>(null);
  const [marketChangeLoading, setMarketChangeLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMarketChangeLoading(true);
    void runMarketChangeAudit()
      .then((r) => {
        if (!cancelled) setMarketChangeReport(r);
      })
      .finally(() => {
        if (!cancelled) setMarketChangeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [lehmanReport, setLehmanReport] = useState<ForwardLehmanBreakdownAuditReport | null>(null);
  const [lehmanLoading, setLehmanLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLehmanLoading(true);
    void runLehmanBreakdownAudit()
      .then((r) => {
        if (!cancelled) setLehmanReport(r);
      })
      .finally(() => {
        if (!cancelled) setLehmanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [lehmanLotReport, setLehmanLotReport] = useState<ForwardLehmanLotAuditReport | null>(null);
  const [lehmanLotLoading, setLehmanLotLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLehmanLotLoading(true);
    void runLehmanLotAudit()
      .then((r) => {
        if (!cancelled) setLehmanLotReport(r);
      })
      .finally(() => {
        if (!cancelled) setLehmanLotLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [dynamicLotReport, setDynamicLotReport] = useState<ForwardDynamicLotAuditReport | null>(null);
  const [dynamicLotLoading, setDynamicLotLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDynamicLotLoading(true);
    void runDynamicLotAudit()
      .then((r) => {
        if (!cancelled) setDynamicLotReport(r);
      })
      .finally(() => {
        if (!cancelled) setDynamicLotLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [kellyTriggerReport, setKellyTriggerReport] = useState<ForwardKellyTriggerAuditReport | null>(null);
  const [kellyTriggerLoading, setKellyTriggerLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setKellyTriggerLoading(true);
    void runKellyTriggerAudit()
      .then((r) => {
        if (!cancelled) setKellyTriggerReport(r);
      })
      .finally(() => {
        if (!cancelled) setKellyTriggerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [mcDurabilityReport, setMcDurabilityReport] = useState<ForwardMcDurabilityAuditReport | null>(null);
  const [mcDurabilityLoading, setMcDurabilityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMcDurabilityLoading(true);
    void runMcDurabilityAudit()
      .then((r) => {
        if (!cancelled) setMcDurabilityReport(r);
      })
      .finally(() => {
        if (!cancelled) setMcDurabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [bootstrapMcReport, setBootstrapMcReport] = useState<ForwardBootstrapMcAuditReport | null>(null);
  const [bootstrapMcLoading, setBootstrapMcLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBootstrapMcLoading(true);
    void runBootstrapMcAudit()
      .then((r) => {
        if (!cancelled) setBootstrapMcReport(r);
      })
      .finally(() => {
        if (!cancelled) setBootstrapMcLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [wf7030OosReport, setWf7030OosReport] = useState<ForwardWf7030OosAuditReport | null>(null);
  const [wf7030OosLoading, setWf7030OosLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setWf7030OosLoading(true);
    void runWf7030OosAudit()
      .then((r) => {
        if (!cancelled) setWf7030OosReport(r);
      })
      .finally(() => {
        if (!cancelled) setWf7030OosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV1Report, setMalaysiaV1Report] = useState<ForwardMalaysiaV1AuditReport | null>(null);
  const [malaysiaV1Loading, setMalaysiaV1Loading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV1Loading(true);
    void runMalaysiaV1Audit()
      .then((r) => {
        if (!cancelled) setMalaysiaV1Report(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV1Loading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV2Report, setMalaysiaV2Report] = useState<ForwardMalaysiaV2AuditReport | null>(null);
  const [malaysiaV2Loading, setMalaysiaV2Loading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV2Loading(true);
    void runMalaysiaV2Audit()
      .then((r) => {
        if (!cancelled) setMalaysiaV2Report(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV2Loading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV2DurabilityReport, setMalaysiaV2DurabilityReport] =
    useState<ForwardMalaysiaV2DurabilityAuditReport | null>(null);
  const [malaysiaV2DurabilityLoading, setMalaysiaV2DurabilityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV2DurabilityLoading(true);
    void runMalaysiaV2DurabilityAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV2DurabilityReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV2DurabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV2DiversificationReport, setMalaysiaV2DiversificationReport] =
    useState<ForwardMalaysiaV2DiversificationAuditReport | null>(null);
  const [malaysiaV2DiversificationLoading, setMalaysiaV2DiversificationLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV2DiversificationLoading(true);
    void runMalaysiaV2DiversificationAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV2DiversificationReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV2DiversificationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV2WeightReport, setMalaysiaV2WeightReport] =
    useState<ForwardMalaysiaV2WeightAuditReport | null>(null);
  const [malaysiaV2WeightLoading, setMalaysiaV2WeightLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV2WeightLoading(true);
    void runMalaysiaV2WeightAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV2WeightReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV2WeightLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV21FourthReport, setMalaysiaV21FourthReport] =
    useState<ForwardMalaysiaV21FourthSymbolAuditReport | null>(null);
  const [malaysiaV21FourthLoading, setMalaysiaV21FourthLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV21FourthLoading(true);
    void runMalaysiaV21FourthSymbolAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV21FourthReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV21FourthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV3DcaReport, setMalaysiaV3DcaReport] =
    useState<ForwardMalaysiaV3DcaAuditReport | null>(null);
  const [malaysiaV3DcaLoading, setMalaysiaV3DcaLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV3DcaLoading(true);
    void runMalaysiaV3DcaAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV3DcaReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV3DcaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV3CrashReport, setMalaysiaV3CrashReport] =
    useState<ForwardMalaysiaV3CrashAuditReport | null>(null);
  const [malaysiaV3CrashLoading, setMalaysiaV3CrashLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV3CrashLoading(true);
    void runMalaysiaV3CrashAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV3CrashReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV3CrashLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV3GamudaCapReport, setMalaysiaV3GamudaCapReport] =
    useState<ForwardMalaysiaV3GamudaCapAuditReport | null>(null);
  const [malaysiaV3GamudaCapLoading, setMalaysiaV3GamudaCapLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV3GamudaCapLoading(true);
    void runMalaysiaV3GamudaCapAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV3GamudaCapReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV3GamudaCapLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV3Cap15Report, setMalaysiaV3Cap15Report] =
    useState<ForwardMalaysiaV3Cap15AuditReport | null>(null);
  const [malaysiaV3Cap15Loading, setMalaysiaV3Cap15Loading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV3Cap15Loading(true);
    void runMalaysiaV3Cap15Audit()
      .then((r) => {
        if (!cancelled) setMalaysiaV3Cap15Report(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV3Cap15Loading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV3YtlDepReport, setMalaysiaV3YtlDepReport] =
    useState<ForwardMalaysiaV3YtlDependencyAuditReport | null>(null);
  const [malaysiaV3YtlDepLoading, setMalaysiaV3YtlDepLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV3YtlDepLoading(true);
    void runMalaysiaV3YtlDependencyAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV3YtlDepReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV3YtlDepLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV3YtlVerifyReport, setMalaysiaV3YtlVerifyReport] =
    useState<ForwardMalaysiaV3YtlVerifyAuditReport | null>(null);
  const [malaysiaV3YtlVerifyLoading, setMalaysiaV3YtlVerifyLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV3YtlVerifyLoading(true);
    void runMalaysiaV3YtlVerifyAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV3YtlVerifyReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV3YtlVerifyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV4CandidateReport, setMalaysiaV4CandidateReport] =
    useState<ForwardMalaysiaV4CandidateAuditReport | null>(null);
  const [malaysiaV4CandidateLoading, setMalaysiaV4CandidateLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV4CandidateLoading(true);
    void runMalaysiaV4CandidateAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV4CandidateReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV4CandidateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV4AttribReport, setMalaysiaV4AttribReport] =
    useState<ForwardMalaysiaV4AttributionAuditReport | null>(null);
  const [malaysiaV4AttribLoading, setMalaysiaV4AttribLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV4AttribLoading(true);
    void runMalaysiaV4AttributionAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV4AttribReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV4AttribLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [malaysiaV4IjmOosReport, setMalaysiaV4IjmOosReport] =
    useState<ForwardMalaysiaV4IjmOosAuditReport | null>(null);
  const [malaysiaV4IjmOosLoading, setMalaysiaV4IjmOosLoading] = useState(false);
  const [malaysiaV4FinalCompareReport, setMalaysiaV4FinalCompareReport] =
    useState<ForwardMalaysiaV4FinalCompareAuditReport | null>(null);
  const [malaysiaV4FinalCompareLoading, setMalaysiaV4FinalCompareLoading] = useState(false);
  const [malaysiaV4OpsMonitorReport, setMalaysiaV4OpsMonitorReport] =
    useState<ForwardMalaysiaV4OpsMonitorAuditReport | null>(null);
  const [malaysiaV4OpsMonitorLoading, setMalaysiaV4OpsMonitorLoading] = useState(false);
  const [malaysiaV4YahooQualityReport, setMalaysiaV4YahooQualityReport] =
    useState<ForwardMalaysiaV4YahooQualityAuditReport | null>(null);
  const [malaysiaV4YahooQualityLoading, setMalaysiaV4YahooQualityLoading] = useState(false);
  const [malaysiaV4RebalanceReport, setMalaysiaV4RebalanceReport] =
    useState<ForwardMalaysiaV4RebalanceAuditReport | null>(null);
  const [malaysiaV4RebalanceLoading, setMalaysiaV4RebalanceLoading] = useState(false);
  const [malaysiaV4TwelveBursaReport, setMalaysiaV4TwelveBursaReport] =
    useState<ForwardMalaysiaV4TwelveBursaAuditReport | null>(null);
  const [malaysiaV4TwelveBursaLoading, setMalaysiaV4TwelveBursaLoading] = useState(false);

  const malaysiaHoldings = useMemo(() => {
    const raw = isPractice ? appState.practice.portfolio : appState.portfolio;
    return raw.filter((p) => isMalaysiaMarket(p.market) && (p.shares ?? 0) > 0);
  }, [isPractice, appState.portfolio, appState.practice.portfolio]);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV4IjmOosLoading(true);
    void runMalaysiaV4IjmOosAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV4IjmOosReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV4IjmOosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV4FinalCompareLoading(true);
    void runMalaysiaV4FinalCompareAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV4FinalCompareReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV4FinalCompareLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV4OpsMonitorLoading(true);
    void runMalaysiaV4OpsMonitorAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV4OpsMonitorReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV4OpsMonitorLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV4YahooQualityLoading(true);
    void runMalaysiaV4YahooQualityAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV4YahooQualityReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV4YahooQualityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV4RebalanceLoading(true);
    void runMalaysiaV4RebalanceAudit(malaysiaHoldings)
      .then((r) => {
        if (!cancelled) setMalaysiaV4RebalanceReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV4RebalanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [malaysiaHoldings]);

  useEffect(() => {
    let cancelled = false;
    setMalaysiaV4TwelveBursaLoading(true);
    void runMalaysiaV4TwelveBursaAudit()
      .then((r) => {
        if (!cancelled) setMalaysiaV4TwelveBursaReport(r);
      })
      .finally(() => {
        if (!cancelled) setMalaysiaV4TwelveBursaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const macdCumulativeReport = useMemo(
    () => (bundle ? auditMacdCumulative({ bundle }) : null),
    [bundle],
  );
  const macdExclSpringReport = useMemo(
    () => (bundle ? auditMacdExclSpring({ bundle }) : null),
    [bundle],
  );
  const eightCellReport = useMemo(
    () => (bundle ? auditEightCell({ bundle }) : null),
    [bundle],
  );
  const strongCellMonthlyReport = useMemo(
    () => (bundle ? auditStrongCellMonthly({ bundle }) : null),
    [bundle],
  );
  const strongCellFilterReport = useMemo(
    () => (bundle ? auditStrongCellFilter({ bundle }) : null),
    [bundle],
  );
  const strongCellExclListingReport = useMemo(
    () => (bundle ? auditStrongCellExclListing({ bundle }) : null),
    [bundle],
  );
  const trailingStopReport = useMemo(
    () => (bundle ? auditTrailingStopCompare({ bundle }) : null),
    [bundle],
  );
  const regimeStandaloneReport = useMemo(
    () => (bundle ? auditRegimeStandalone({ bundle }) : null),
    [bundle],
  );
  const dist52StandaloneReport = useMemo(
    () => (bundle ? auditDist52Standalone({ bundle }) : null),
    [bundle],
  );
  const recentSignals = [...persisted.signals]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);
  const audit = useMemo(
    () =>
      state
        ? auditForwardValidation({
            state,
            bundle,
            fetchLog: fetchLog ?? state.yahooFetchLog,
            processedDates,
          })
        : null,
    [state, bundle, fetchLog, processedDates],
  );

  const onReset = () => {
    Alert.alert(
      '前向き検証をリセット',
      'シグナル履歴・仮想ポートフォリオ・レポートを削除します。よろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await resetForwardValidationState();
              await refresh(true);
            })();
          },
        },
      ],
    );
  };

  const onExportFullCsv = async () => {
    if (!state) return;
    try {
      await Share.share({
        message: buildForwardValidationCsv(state),
        title: 'forward_validation_export.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportLatestSignalsCsv = async () => {
    if (!state) return;
    try {
      await Share.share({
        message: buildLatestSignalsCsv(state, LATEST_SIGNALS_CSV_LIMIT),
        title: `forward_validation_signals_${LATEST_SIGNALS_CSV_LIMIT}.csv`,
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportDist52StandaloneCsv = async () => {
    if (!dist52StandaloneReport) return;
    try {
      await Share.share({
        message: formatDist52StandaloneCsv(dist52StandaloneReport),
        title: 'forward_validation_dist52_standalone.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportRegimeStandaloneCsv = async () => {
    if (!regimeStandaloneReport) return;
    try {
      await Share.share({
        message: formatRegimeStandaloneCsv(regimeStandaloneReport),
        title: 'forward_validation_regime_standalone.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportTrailingStopCsv = async () => {
    if (!trailingStopReport) return;
    try {
      await Share.share({
        message: formatTrailingStopAuditCsv(trailingStopReport),
        title: 'forward_validation_trailing_stop.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportEightCellCsv = async () => {
    if (!eightCellReport) return;
    try {
      await Share.share({
        message: formatEightCellCsv(eightCellReport),
        title: 'forward_validation_eight_cell.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportStrongCellMonthlyCsv = async () => {
    if (!strongCellMonthlyReport) return;
    try {
      await Share.share({
        message: formatStrongCellMonthlyCsv(strongCellMonthlyReport),
        title: 'forward_validation_strong_cell_monthly.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportStrongCellFilterCsv = async () => {
    if (!strongCellFilterReport) return;
    try {
      await Share.share({
        message: formatStrongCellFilterCsv(strongCellFilterReport),
        title: 'forward_validation_strong_cell_filter.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportStrongCellExclListingCsv = async () => {
    if (!strongCellExclListingReport) return;
    try {
      await Share.share({
        message: formatStrongCellExclListingCsv(strongCellExclListingReport),
        title: 'forward_validation_strong_cell_excl_listing.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportConditionSplitCsv = async () => {
    if (!conditionSplitReport) return;
    try {
      await Share.share({
        message: formatConditionSplitCsv(conditionSplitReport),
        title: 'forward_validation_condition_split.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportStandalonePeriodCsv = async () => {
    if (!standalonePeriodReport) return;
    try {
      await Share.share({
        message: formatStandalonePeriodCsv(standalonePeriodReport),
        title: 'forward_validation_standalone_period.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMacdDist52PeriodCsv = async () => {
    if (!macdDist52PeriodReport) return;
    try {
      await Share.share({
        message: formatMacdDist52PeriodCsv(macdDist52PeriodReport),
        title: 'forward_validation_macd_dist52_period.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMacdDist52EtfCsv = async () => {
    if (!macdDist52EtfReport) return;
    try {
      await Share.share({
        message: formatMacdDist52EtfCsv(macdDist52EtfReport),
        title: 'forward_validation_macd_dist52_etf.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMacdDist52DedupDayCsv = async () => {
    if (!macdDist52DedupDayReport) return;
    try {
      await Share.share({
        message: formatMacdDist52DedupDayCsv(macdDist52DedupDayReport),
        title: 'forward_validation_macd_dist52_dedup_day.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMacdDist52DedupTimelineCsv = async () => {
    if (!macdDist52DedupTimelineReport) return;
    try {
      await Share.share({
        message: formatMacdDist52DedupTimelineCsv(macdDist52DedupTimelineReport),
        title: 'forward_validation_macd_dist52_dedup_timeline.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMacdDist52DedupExclSpringCsv = async () => {
    if (!macdDist52DedupExclSpringReport) return;
    try {
      await Share.share({
        message: formatMacdDist52DedupExclSpringCsv(macdDist52DedupExclSpringReport),
        title: 'forward_validation_macd_dist52_dedup_excl_spring.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMacdDist52ClusterMacroCsv = async () => {
    if (!macdDist52ClusterMacroReport) return;
    try {
      await Share.share({
        message: formatMacdDist52ClusterMacroCsv(macdDist52ClusterMacroReport),
        title: 'forward_validation_macd_dist52_cluster_macro.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVixSpyBucketCsv = async () => {
    if (!vixSpyBucketReport) return;
    try {
      await Share.share({
        message: formatVixSpyBucketCsv(vixSpyBucketReport),
        title: 'forward_validation_vix_spy_bucket.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVixSpyCrossCsv = async () => {
    if (!vixSpyCrossReport) return;
    try {
      await Share.share({
        message: formatVixSpyCrossCsv(vixSpyCrossReport),
        title: 'forward_validation_vix_spy_cross.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVixSpyFourGroupCsv = async () => {
    if (!vixSpyFourGroupReport) return;
    try {
      await Share.share({
        message: formatVixSpyFourGroupCsv(vixSpyFourGroupReport),
        title: 'forward_validation_vix_spy_four_group.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportSpyVixDist52ComboCsv = async () => {
    if (!spyVixDist52ComboReport) return;
    try {
      await Share.share({
        message: formatSpyVixDist52ComboCsv(spyVixDist52ComboReport),
        title: 'forward_validation_spy_vix_dist52_combo.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix25SubBucketCsv = async () => {
    if (!vix25SubBucketReport) return;
    try {
      await Share.share({
        message: formatVix25SubBucketCsv(vix25SubBucketReport),
        title: 'forward_validation_vix25_sub_bucket.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix25MacdDistCsv = async () => {
    if (!vix25MacdDistReport) return;
    try {
      await Share.share({
        message: formatVix25MacdDistCsv(vix25MacdDistReport),
        title: 'forward_validation_vix25_macd_dist.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix25Dist52Csv = async () => {
    if (!vix25Dist52Report) return;
    try {
      await Share.share({
        message: formatVix25Dist52Csv(vix25Dist52Report),
        title: 'forward_validation_vix25_dist52.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix25WinnerHoldCsv = async () => {
    if (!vix25WinnerHoldReport) return;
    try {
      await Share.share({
        message: formatVix25WinnerHoldCsv(vix25WinnerHoldReport),
        title: 'forward_validation_vix25_winner_hold.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix25ForwardReturnCsv = async () => {
    if (!vix25ForwardReturnReport) return;
    try {
      await Share.share({
        message: formatVix25ForwardReturnCsv(vix25ForwardReturnReport),
        title: 'forward_validation_vix25_forward_return.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix25MaeMfeCsv = async () => {
    if (!vix25MaeMfeReport) return;
    try {
      await Share.share({
        message: formatVix25MaeMfeCsv(vix25MaeMfeReport),
        title: 'forward_validation_vix25_mae_mfe.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix25MaeWorst10Csv = async () => {
    if (!vix25MaeWorst10Report) return;
    try {
      await Share.share({
        message: formatVix25MaeWorst10Csv(vix25MaeWorst10Report),
        title: 'forward_validation_vix25_mae_worst10.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix25SpyEtfForwardReturnCsv = async () => {
    if (!vix25SpyEtfForwardReturnReport) return;
    try {
      await Share.share({
        message: formatVix25SpyEtfForwardReturnCsv(vix25SpyEtfForwardReturnReport),
        title: 'forward_validation_vix25_spy_etf_forward_return.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix25SpyGapCsv = async () => {
    if (!vix25SpyGapReport) return;
    try {
      await Share.share({
        message: formatVix25SpyGapCsv(vix25SpyGapReport),
        title: 'forward_validation_vix25_spy_gap.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportFiveFactorSweepCsv = async () => {
    if (!fiveFactorSweepReport) return;
    try {
      await Share.share({
        message: formatFiveFactorSweepCsv(fiveFactorSweepReport),
        title: 'forward_validation_five_factor_sweep.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVixThresholdSweepCsv = async () => {
    if (!vixThresholdSweepReport) return;
    try {
      await Share.share({
        message: formatVixThresholdSweepCsv(vixThresholdSweepReport),
        title: 'forward_validation_vix_threshold_sweep.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix24StackCsv = async () => {
    if (!vix24StackReport) return;
    try {
      await Share.share({
        message: formatVix24StackCsv(vix24StackReport),
        title: 'forward_validation_vix24_stack.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix24ExitCompareCsv = async () => {
    if (!vix24ExitCompareReport) return;
    try {
      await Share.share({
        message: formatVix24ExitCompareCsv(vix24ExitCompareReport),
        title: 'forward_validation_vix24_exit_compare.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVixBandCsv = async () => {
    if (!vixBandReport) return;
    try {
      await Share.share({
        message: formatVixBandCsv(vixBandReport),
        title: 'forward_validation_vix_band.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix24StreakCsv = async () => {
    if (!vix24StreakReport) return;
    try {
      await Share.share({
        message: formatVix24StreakCsv(vix24StreakReport),
        title: 'forward_validation_vix24_streak.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix24EffectivenessCsv = async () => {
    if (!vix24EffectivenessReport) return;
    try {
      await Share.share({
        message: formatVix24EffectivenessCsv(vix24EffectivenessReport),
        title: 'forward_validation_vix24_effectiveness.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix24OpenEntryCsv = async () => {
    if (!vix24OpenEntryReport) return;
    try {
      await Share.share({
        message: formatVix24OpenEntryCsv(vix24OpenEntryReport),
        title: 'forward_validation_vix24_open_entry.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix24PeriodConcentrationCsv = async () => {
    if (!vix24PeriodConcentrationReport) return;
    try {
      await Share.share({
        message: formatVix24PeriodConcentrationCsv(vix24PeriodConcentrationReport),
        title: 'forward_validation_vix24_period_concentration.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportSixLossRootCauseCsv = async () => {
    if (!sixLossRootCauseReport) return;
    try {
      await Share.share({
        message: formatSixLossRootCauseCsv(sixLossRootCauseReport),
        title: 'forward_validation_six_loss_root_cause.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix24WinnerStrengthCsv = async () => {
    if (!vix24WinnerStrengthReport) return;
    try {
      await Share.share({
        message: formatVix24WinnerStrengthCsv(vix24WinnerStrengthReport),
        title: 'forward_validation_vix24_winner_strength.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix24ExtendedHistoryCsv = async () => {
    if (!vix24ExtendedHistoryReport) return;
    try {
      await Share.share({
        message: formatVix24ExtendedHistoryCsv(vix24ExtendedHistoryReport),
        title: 'forward_validation_vix24_extended_history.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportBacktestQualityCsv = async () => {
    if (!backtestQualityReport) return;
    try {
      await Share.share({
        message: formatBacktestQualityCsv(backtestQualityReport),
        title: 'forward_validation_backtest_quality_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportOperationalRebacktestCsv = async () => {
    if (!operationalRebacktestReport) return;
    try {
      await Share.share({
        message: formatOperationalRebacktestCsv(operationalRebacktestReport),
        title: 'forward_validation_operational_rebacktest_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportOperationalAllocationCsv = async () => {
    if (!operationalAllocationReport) return;
    try {
      await Share.share({
        message: formatOperationalAllocationCsv(operationalAllocationReport),
        title: 'forward_validation_operational_allocation_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportOosValidationCsv = async () => {
    if (!oosValidationReport) return;
    try {
      await Share.share({
        message: formatOosValidationCsv(oosValidationReport),
        title: 'forward_validation_oos_validation_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportWalkForwardCsv = async () => {
    if (!walkForwardReport) return;
    try {
      await Share.share({
        message: formatWalkForwardCsv(walkForwardReport),
        title: 'forward_validation_walk_forward_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVixSensitivityCsv = async () => {
    if (!vixSensitivityReport) return;
    try {
      await Share.share({
        message: formatVixSensitivityCsv(vixSensitivityReport),
        title: 'forward_validation_vix_sensitivity_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportSurvivorshipCsv = async () => {
    if (!survivorshipReport) return;
    try {
      await Share.share({
        message: formatSurvivorshipCsv(survivorshipReport),
        title: 'forward_validation_survivorship_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMarketDependencyCsv = async () => {
    if (!marketDependencyReport) return;
    try {
      await Share.share({
        message: formatMarketDependencyCsv(marketDependencyReport),
        title: 'forward_validation_market_dependency_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportTpTargetSensitivityCsv = async () => {
    if (!tpTargetSensitivityReport) return;
    try {
      await Share.share({
        message: formatTpTargetSensitivityCsv(tpTargetSensitivityReport),
        title: 'forward_validation_tp_target_sensitivity_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportHoldPeriodSensitivityCsv = async () => {
    if (!holdPeriodSensitivityReport) return;
    try {
      await Share.share({
        message: formatHoldPeriodSensitivityCsv(holdPeriodSensitivityReport),
        title: 'forward_validation_hold_period_sensitivity_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportRuleContributionCsv = async () => {
    if (!ruleContributionReport) return;
    try {
      await Share.share({
        message: formatRuleContributionCsv(ruleContributionReport),
        title: 'forward_validation_rule_contribution_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportAdxSensitivityCsv = async () => {
    if (!adxSensitivityReport) return;
    try {
      await Share.share({
        message: formatAdxSensitivityCsv(adxSensitivityReport),
        title: 'forward_validation_adx_sensitivity_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportAdx20ValidationCsv = async () => {
    if (!adx20ValidationReport) return;
    try {
      await Share.share({
        message: formatAdx20ValidationCsv(adx20ValidationReport),
        title: 'forward_validation_adx20_validation_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportDgroLowAdxCsv = async () => {
    if (!dgroLowAdxReport) return;
    try {
      await Share.share({
        message: formatDgroLowAdxCsv(dgroLowAdxReport),
        title: 'forward_validation_dgro_low_adx_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportAdx20IndependenceCsv = async () => {
    if (!adx20IndependenceReport) return;
    try {
      await Share.share({
        message: formatAdx20IndependenceCsv(adx20IndependenceReport),
        title: 'forward_validation_adx20_independence_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportAdxYearlyOptimalCsv = async () => {
    if (!adxYearlyOptimalReport) return;
    try {
      await Share.share({
        message: formatAdxYearlyOptimalCsv(adxYearlyOptimalReport),
        title: 'forward_validation_adx_yearly_optimal_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportAdx20WalkForwardCsv = async () => {
    if (!adx20WalkForwardReport) return;
    try {
      await Share.share({
        message: formatAdx20WalkForwardCsv(adx20WalkForwardReport),
        title: 'forward_validation_adx20_walk_forward_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportDist52Adx20Csv = async () => {
    if (!dist52Adx20Report) return;
    try {
      await Share.share({
        message: formatDist52Adx20Csv(dist52Adx20Report),
        title: 'forward_validation_dist52_adx20_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVixAdx20Csv = async () => {
    if (!vixAdx20Report) return;
    try {
      await Share.share({
        message: formatVixAdx20Csv(vixAdx20Report),
        title: 'forward_validation_vix_adx20_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportSpy63Adx20Csv = async () => {
    if (!spy63Adx20Report) return;
    try {
      await Share.share({
        message: formatSpy63Adx20Csv(spy63Adx20Report),
        title: 'forward_validation_spy63_adx20_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportFinalRulesAblationCsv = async () => {
    if (!finalRulesAblationReport) return;
    try {
      await Share.share({
        message: formatFinalRulesAblationCsv(finalRulesAblationReport),
        title: 'forward_validation_final_rules_ablation_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportPositionSizingCsv = async () => {
    if (!positionSizingReport) return;
    try {
      await Share.share({
        message: formatPositionSizingCsv(positionSizingReport),
        title: 'forward_validation_position_sizing_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportExitStrategyCsv = async () => {
    if (!exitStrategyReport) return;
    try {
      await Share.share({
        message: formatExitStrategyCsv(exitStrategyReport),
        title: 'forward_validation_exit_strategy_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportEtfUniverseCsv = async () => {
    if (!etfUniverseReport) return;
    try {
      await Share.share({
        message: formatEtfUniverseCsv(etfUniverseReport),
        title: 'forward_validation_etf_universe_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportRobustnessCsv = async () => {
    if (!robustnessReport) return;
    try {
      await Share.share({
        message: formatRobustnessCsv(robustnessReport),
        title: 'forward_validation_robustness_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportWalkForward31Csv = async () => {
    if (!walkForward31Report) return;
    try {
      await Share.share({
        message: formatWalkForward31Csv(walkForward31Report),
        title: 'forward_validation_walk_forward_31_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMonteCarloCsv = async () => {
    if (!monteCarloReport) return;
    try {
      await Share.share({
        message: formatMonteCarloCsv(monteCarloReport),
        title: 'forward_validation_monte_carlo_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportBearStressCsv = async () => {
    if (!bearStressReport) return;
    try {
      await Share.share({
        message: formatBearStressCsv(bearStressReport),
        title: 'forward_validation_bear_stress_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportEquityCurveCsv = async () => {
    if (!equityCurveReport) return;
    try {
      await Share.share({
        message: formatEquityCurveCsv(equityCurveReport),
        title: 'forward_validation_equity_curve_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportLotSizeCsv = async () => {
    if (!lotSizeReport) return;
    try {
      await Share.share({
        message: formatLotSizeCsv(lotSizeReport),
        title: 'forward_validation_lot_size_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportCompoundingCsv = async () => {
    if (!compoundingReport) return;
    try {
      await Share.share({
        message: formatCompoundingCsv(compoundingReport),
        title: 'forward_validation_compounding_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportSymbolContributionCsv = async () => {
    if (!symbolContributionReport) return;
    try {
      await Share.share({
        message: formatSymbolContributionCsv(symbolContributionReport),
        title: 'forward_validation_symbol_contribution_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportSymbolWeightCsv = async () => {
    if (!symbolWeightReport) return;
    try {
      await Share.share({
        message: formatSymbolWeightCsv(symbolWeightReport),
        title: 'forward_validation_symbol_weight_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportRegimeEnvironmentCsv = async () => {
    if (!regimeEnvironmentReport) return;
    try {
      await Share.share({
        message: formatRegimeEnvironmentCsv(regimeEnvironmentReport),
        title: 'forward_validation_regime_environment_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMaxDrawdownCauseCsv = async () => {
    if (!maxDrawdownCauseReport) return;
    try {
      await Share.share({
        message: formatMaxDrawdownCauseCsv(maxDrawdownCauseReport),
        title: 'forward_validation_max_drawdown_cause_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportQqqNecessityCsv = async () => {
    if (!qqqNecessityReport) return;
    try {
      await Share.share({
        message: formatQqqNecessityCsv(qqqNecessityReport),
        title: 'forward_validation_qqq_necessity_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportLosingStreakCsv = async () => {
    if (!losingStreakReport) return;
    try {
      await Share.share({
        message: formatLosingStreakCsv(losingStreakReport),
        title: 'forward_validation_losing_streak_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportDangerEnvFilterCsv = async () => {
    if (!dangerEnvFilterReport) return;
    try {
      await Share.share({
        message: formatDangerEnvFilterCsv(dangerEnvFilterReport),
        title: 'forward_validation_dangerous_environment_filter_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportSpySidewaysValidityCsv = async () => {
    if (!spySidewaysValidityReport) return;
    try {
      await Share.share({
        message: formatSpySidewaysValidityCsv(spySidewaysValidityReport),
        title: 'forward_validation_spy_sideways_validity_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportRateHike2022QqqCsv = async () => {
    if (!rateHike2022QqqReport) return;
    try {
      await Share.share({
        message: formatRateHike2022QqqClusterCsv(rateHike2022QqqReport),
        title: 'forward_validation_rate_hike_2022_qqq_cluster_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportVix2430BandCsv = async () => {
    if (!vix2430BandReport) return;
    try {
      await Share.share({
        message: formatVix2430BandValidityCsv(vix2430BandReport),
        title: 'forward_validation_vix2430_band_validity_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportRateHikePhaseCsv = async () => {
    if (!rateHikePhaseReport) return;
    try {
      await Share.share({
        message: formatRateHikePhaseCsv(rateHikePhaseReport),
        title: 'forward_validation_rate_hike_phase_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportQqqIntrinsicRiskCsv = async () => {
    if (!qqqIntrinsicRiskReport) return;
    try {
      await Share.share({
        message: formatQqqIntrinsicRiskCsv(qqqIntrinsicRiskReport),
        title: 'forward_validation_qqq_intrinsic_risk_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportReproducibilityCsv = async () => {
    if (!reproducibilityReport) return;
    try {
      await Share.share({
        message: formatReproducibilityCsv(reproducibilityReport),
        title: 'forward_validation_reproducibility_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExport2022RootCauseCsv = async () => {
    if (!rootCause2022Report) return;
    try {
      await Share.share({
        message: format2022RootCauseCsv(rootCause2022Report),
        title: 'forward_validation_2022_root_cause_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportOverfitCsv = async () => {
    if (!overfitReport) return;
    try {
      await Share.share({
        message: formatOverfitCsv(overfitReport),
        title: 'forward_validation_overfit_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportWinFactorCsv = async () => {
    if (!winFactorReport) return;
    try {
      await Share.share({
        message: formatWinFactorCsv(winFactorReport),
        title: 'forward_validation_win_factor_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportDurabilityCsv = async () => {
    if (!durabilityReport) return;
    try {
      await Share.share({
        message: formatDurabilityCsv(durabilityReport),
        title: 'forward_validation_durability_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportCompleteOosCsv = async () => {
    if (!completeOosReport) return;
    try {
      await Share.share({
        message: formatCompleteOosCsv(completeOosReport),
        title: 'forward_validation_complete_oos_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportAnomalyCsv = async () => {
    if (!anomalyReport) return;
    try {
      await Share.share({
        message: formatAnomalyResilienceCsv(anomalyReport),
        title: 'forward_validation_anomaly_resilience_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMarketChangeCsv = async () => {
    if (!marketChangeReport) return;
    try {
      await Share.share({
        message: formatMarketChangeCsv(marketChangeReport),
        title: 'forward_validation_market_change_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportLehmanCsv = async () => {
    if (!lehmanReport) return;
    try {
      await Share.share({
        message: formatLehmanBreakdownCsv(lehmanReport),
        title: 'forward_validation_lehman_breakdown_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportLehmanLotCsv = async () => {
    if (!lehmanLotReport) return;
    try {
      await Share.share({
        message: formatLehmanLotCsv(lehmanLotReport),
        title: 'forward_validation_lehman_lot_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportDynamicLotCsv = async () => {
    if (!dynamicLotReport) return;
    try {
      await Share.share({
        message: formatDynamicLotCsv(dynamicLotReport),
        title: 'forward_validation_dynamic_lot_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportKellyTriggerCsv = async () => {
    if (!kellyTriggerReport) return;
    try {
      await Share.share({
        message: formatKellyTriggerCsv(kellyTriggerReport),
        title: 'forward_validation_kelly_trigger_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMcDurabilityCsv = async () => {
    if (!mcDurabilityReport) return;
    try {
      await Share.share({
        message: formatMcDurabilityCsv(mcDurabilityReport),
        title: 'forward_validation_mc_durability_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportBootstrapMcCsv = async () => {
    if (!bootstrapMcReport) return;
    try {
      await Share.share({
        message: formatBootstrapMcCsv(bootstrapMcReport),
        title: 'forward_validation_bootstrap_mc_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportWf7030OosCsv = async () => {
    if (!wf7030OosReport) return;
    try {
      await Share.share({
        message: formatWf7030OosCsv(wf7030OosReport),
        title: 'forward_validation_wf7030_oos_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV1Csv = async () => {
    if (!malaysiaV1Report) return;
    try {
      await Share.share({
        message: formatMalaysiaV1Csv(malaysiaV1Report),
        title: 'forward_validation_malaysia_v1_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV2Csv = async () => {
    if (!malaysiaV2Report) return;
    try {
      await Share.share({
        message: formatMalaysiaV2Csv(malaysiaV2Report),
        title: 'forward_validation_malaysia_v2_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV2DurabilityCsv = async () => {
    if (!malaysiaV2DurabilityReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV2DurabilityCsv(malaysiaV2DurabilityReport),
        title: 'forward_validation_malaysia_v2_durability_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV2DiversificationCsv = async () => {
    if (!malaysiaV2DiversificationReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV2DiversificationCsv(malaysiaV2DiversificationReport),
        title: 'forward_validation_malaysia_v2_diversification_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV2WeightCsv = async () => {
    if (!malaysiaV2WeightReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV2WeightCsv(malaysiaV2WeightReport),
        title: 'forward_validation_malaysia_v2_weight_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV21FourthCsv = async () => {
    if (!malaysiaV21FourthReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV21FourthSymbolCsv(malaysiaV21FourthReport),
        title: 'forward_validation_malaysia_v21_fourth_symbol_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV3DcaCsv = async () => {
    if (!malaysiaV3DcaReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV3DcaCsv(malaysiaV3DcaReport),
        title: 'forward_validation_malaysia_v3_dca_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV3CrashCsv = async () => {
    if (!malaysiaV3CrashReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV3CrashCsv(malaysiaV3CrashReport),
        title: 'forward_validation_malaysia_v3_crash_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV3GamudaCapCsv = async () => {
    if (!malaysiaV3GamudaCapReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV3GamudaCapCsv(malaysiaV3GamudaCapReport),
        title: 'forward_validation_malaysia_v3_gamuda_cap_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV3Cap15Csv = async () => {
    if (!malaysiaV3Cap15Report) return;
    try {
      await Share.share({
        message: formatMalaysiaV3Cap15Csv(malaysiaV3Cap15Report),
        title: 'forward_validation_malaysia_v3_cap15_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV3YtlDepCsv = async () => {
    if (!malaysiaV3YtlDepReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV3YtlDependencyCsv(malaysiaV3YtlDepReport),
        title: 'forward_validation_malaysia_v3_ytl_dependency_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV3YtlVerifyCsv = async () => {
    if (!malaysiaV3YtlVerifyReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV3YtlVerifyCsv(malaysiaV3YtlVerifyReport),
        title: 'forward_validation_malaysia_v3_ytl_verify_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV4CandidateCsv = async () => {
    if (!malaysiaV4CandidateReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV4CandidateCsv(malaysiaV4CandidateReport),
        title: 'forward_validation_malaysia_v4_candidate_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV4AttribCsv = async () => {
    if (!malaysiaV4AttribReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV4AttributionCsv(malaysiaV4AttribReport),
        title: 'forward_validation_malaysia_v4_attribution_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV4IjmOosCsv = async () => {
    if (!malaysiaV4IjmOosReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV4IjmOosCsv(malaysiaV4IjmOosReport),
        title: 'forward_validation_malaysia_v4_ijm_oos_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV4FinalCompareCsv = async () => {
    if (!malaysiaV4FinalCompareReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV4FinalCompareCsv(malaysiaV4FinalCompareReport),
        title: 'forward_validation_malaysia_v4_final_compare_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV4OpsMonitorCsv = async () => {
    if (!malaysiaV4OpsMonitorReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV4OpsMonitorCsv(malaysiaV4OpsMonitorReport),
        title: 'forward_validation_malaysia_v4_ops_monitor_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV4OpsMonitorJson = async () => {
    if (!malaysiaV4OpsMonitorReport) return;
    try {
      await Share.share({
        message: malaysiaV4OpsMonitorReport.jsonPayload,
        title: 'forward_validation_malaysia_v4_ops_monitor_audit.json',
      });
    } catch (e) {
      Alert.alert('JSON出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV4YahooQualityCsv = async () => {
    if (!malaysiaV4YahooQualityReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV4YahooQualityCsv(malaysiaV4YahooQualityReport),
        title: 'forward_validation_malaysia_v4_yahoo_quality_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV4RebalanceCsv = async () => {
    if (!malaysiaV4RebalanceReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV4RebalanceCsv(malaysiaV4RebalanceReport),
        title: 'forward_validation_malaysia_v4_rebalance_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMalaysiaV4TwelveBursaCsv = async () => {
    if (!malaysiaV4TwelveBursaReport) return;
    try {
      await Share.share({
        message: formatMalaysiaV4TwelveBursaCsv(malaysiaV4TwelveBursaReport),
        title: 'forward_validation_malaysia_v4_twelve_bursa_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMacdCumulativeCsv = async () => {
    if (!macdCumulativeReport) return;
    try {
      await Share.share({
        message: formatMacdCumulativeCsv(macdCumulativeReport),
        title: 'forward_validation_macd_cumulative.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMacdExclSpringCsv = async () => {
    if (!macdExclSpringReport) return;
    try {
      await Share.share({
        message: formatMacdExclSpringCsv(macdExclSpringReport),
        title: 'forward_validation_macd_excl_spring.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportTakeProfitSensitivityCsv = async () => {
    if (!takeProfitSensitivityReport) return;
    try {
      await Share.share({
        message: formatTakeProfitSensitivityCsv(takeProfitSensitivityReport),
        title: 'forward_validation_take_profit_sensitivity.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMaxHoldCsv = async () => {
    if (!maxHoldReport) return;
    try {
      await Share.share({
        message: formatMaxHoldAuditCsv(maxHoldReport),
        title: 'forward_validation_max_hold.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportLoserFeatureCsv = async () => {
    if (!loserFeatureReport) return;
    try {
      await Share.share({
        message: formatLoserFeatureAuditCsv(loserFeatureReport),
        title: 'forward_validation_loser_feature.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportLoserCompleteCsv = async () => {
    if (!loserCompleteReport) return;
    try {
      await Share.share({
        message: formatLoserCompleteCsv(loserCompleteReport),
        title: 'forward_validation_loser_complete.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportApril2025ClusterExplainerCsv = async () => {
    if (!april2025ClusterExplainerReport) return;
    try {
      await Share.share({
        message: formatApril2025ClusterExplainerCsv(april2025ClusterExplainerReport),
        title: 'forward_validation_april2025_cluster_explainer.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportApril2025ExcludeCsv = async () => {
    if (!april2025ExcludeReport) return;
    try {
      await Share.share({
        message: formatApril2025ExcludeCsv(april2025ExcludeReport),
        title: 'forward_validation_april2025_exclude.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportSpyDownClusterCsv = async () => {
    if (!spyDownClusterReport) return;
    try {
      await Share.share({
        message: formatSpyDownClusterCsv(spyDownClusterReport),
        title: 'forward_validation_spy_down_cluster.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportDownDist10WalkForwardCsv = async () => {
    if (!downDist10WalkForwardReport) return;
    try {
      await Share.share({
        message: formatDownDist10WalkForwardCsv(downDist10WalkForwardReport),
        title: 'forward_validation_down_dist10_walkforward.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportDownDist10ReproCsv = async () => {
    if (!downDist10ReproReport) return;
    try {
      await Share.share({
        message: formatDownDist10ReproCsv(downDist10ReproReport),
        title: 'forward_validation_down_dist10_repro.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportStrongCellReproCsv = async () => {
    if (!strongCellReproReport) return;
    try {
      await Share.share({
        message: formatStrongCellReproCsv(strongCellReproReport),
        title: 'forward_validation_strong_cell_repro.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportFourFactorComboCsv = async () => {
    if (!fourFactorComboReport) return;
    try {
      await Share.share({
        message: formatFourFactorComboCsv(fourFactorComboReport),
        title: 'forward_validation_four_factor_combo.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportReturnCorrelationCsv = async () => {
    if (!returnCorrelationReport) return;
    try {
      await Share.share({
        message: formatReturnCorrelationCsv(returnCorrelationReport),
        title: 'forward_validation_return_correlation.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportRegimeDist52CrossCsv = async () => {
    if (!regimeDist52CrossReport) return;
    try {
      await Share.share({
        message: formatRegimeDist52CrossCsv(regimeDist52CrossReport),
        title: 'forward_validation_regime_dist52_cross.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportRegimePerformanceCsv = async () => {
    if (!regimePerformanceReport) return;
    try {
      await Share.share({
        message: formatRegimePerformanceCsv(regimePerformanceReport),
        title: 'forward_validation_regime_performance.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportAdxDist52CrossCsv = async () => {
    if (!adxDist52CrossReport) return;
    try {
      await Share.share({
        message: formatAdxDist52CrossCsv(adxDist52CrossReport),
        title: 'forward_validation_adx_dist52_cross.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportDist52Csv = async () => {
    if (!dist52Report) return;
    try {
      await Share.share({
        message: formatDist52AuditCsv(dist52Report),
        title: 'forward_validation_dist52.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportWinLossCsv = async () => {
    if (!winLossReport) return;
    try {
      await Share.share({
        message: formatWinLossAuditCsv(winLossReport),
        title: 'forward_validation_win_loss.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportPassedTradesCsv = async () => {
    if (!passedTradesReport) return;
    try {
      await Share.share({
        message: formatPassedTradesAuditCsv(passedTradesReport),
        title: 'forward_validation_passed_trades.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportMacdAuditCsv = async () => {
    if (!macdAuditReport) return;
    try {
      await Share.share({
        message: formatMacdAuditCsv(macdAuditReport),
        title: 'forward_validation_macd_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportAdxAuditCsv = async () => {
    if (!adxAuditReport) return;
    try {
      await Share.share({
        message: formatAdxAuditCsv(adxAuditReport),
        title: 'forward_validation_adx_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportConditionBlockCsv = async () => {
    if (!conditionBlockReport) return;
    try {
      await Share.share({
        message: formatConditionBlockAuditCsv(conditionBlockReport),
        title: 'forward_validation_condition_block_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  const onExportGapAuditCsv = async () => {
    if (!signalGapReport) return;
    try {
      await Share.share({
        message: formatSignalGapReportCsv(signalGapReport),
        title: 'forward_validation_signal_gap_audit.csv',
      });
    } catch (e) {
      Alert.alert('CSV出力', e instanceof Error ? e.message : '共有に失敗しました');
    }
  };

  return (
    <Screen
      title="リアルタイム前向き検証"
      subtitle="実運用監視 · 4ETF · 仮想$10,000"
    >
      <Card>
        <Text style={styles.note}>
          {FORWARD_ETF_UNIVERSE.join(', ')} · 確定ルール · 監視専用（最適化なし）
        </Text>
      </Card>

      <ForwardOperationalMonitorPanel snapshot={operational} loading={loading} />

      <ForwardSignalGapAuditPanel report={signalGapReport} loading={loading} />

      <ForwardConditionBlockAuditPanel report={conditionBlockReport} loading={loading} />

      <ForwardAdxAuditPanel report={adxAuditReport} loading={loading} />

      <ForwardMacdAuditPanel report={macdAuditReport} loading={loading} />

      <ForwardPassedTradesAuditPanel report={passedTradesReport} loading={loading} />

      <ForwardVixSpyBucketAuditPanel report={vixSpyBucketReport} loading={loading} />

      <ForwardVixSpyCrossAuditPanel report={vixSpyCrossReport} loading={loading} />

      <ForwardVixSpyFourGroupAuditPanel report={vixSpyFourGroupReport} loading={loading} />

      <ForwardSpyVixDist52ComboAuditPanel report={spyVixDist52ComboReport} loading={loading} />

      <ForwardVix25SubBucketAuditPanel report={vix25SubBucketReport} loading={loading} />

      <ForwardVix25MacdDistAuditPanel report={vix25MacdDistReport} loading={loading} />

      <ForwardVix25Dist52AuditPanel report={vix25Dist52Report} loading={loading} />

      <ForwardVix25WinnerHoldAuditPanel report={vix25WinnerHoldReport} loading={loading} />

      <ForwardVix25ForwardReturnAuditPanel report={vix25ForwardReturnReport} loading={loading} />

      <ForwardVix25MaeMfeAuditPanel report={vix25MaeMfeReport} loading={loading} />

      <ForwardVix25MaeWorst10AuditPanel report={vix25MaeWorst10Report} loading={loading} />

      <ForwardVix25SpyEtfForwardReturnAuditPanel report={vix25SpyEtfForwardReturnReport} loading={loading} />

      <ForwardVix25SpyGapAuditPanel report={vix25SpyGapReport} loading={loading} />

      <ForwardFiveFactorSweepAuditPanel report={fiveFactorSweepReport} loading={loading} />

      <ForwardVixThresholdSweepAuditPanel report={vixThresholdSweepReport} loading={loading} />

      <ForwardVix24StackAuditPanel report={vix24StackReport} loading={loading} />

      <ForwardVix24ExitCompareAuditPanel report={vix24ExitCompareReport} loading={loading} />

      <ForwardVixBandAuditPanel report={vixBandReport} loading={loading} />

      <ForwardVix24StreakAuditPanel report={vix24StreakReport} loading={loading} />

      <ForwardVix24EffectivenessAuditPanel report={vix24EffectivenessReport} loading={loading} />

      <ForwardVix24OpenEntryAuditPanel report={vix24OpenEntryReport} loading={loading} />

      <ForwardVix24PeriodConcentrationAuditPanel
        report={vix24PeriodConcentrationReport}
        loading={loading}
      />

      <ForwardSixLossRootCauseAuditPanel report={sixLossRootCauseReport} loading={loading} />

      <ForwardVix24WinnerStrengthAuditPanel report={vix24WinnerStrengthReport} loading={loading} />

      <ForwardVix24ExtendedHistoryAuditPanel
        report={vix24ExtendedHistoryReport}
        loading={extendedHistoryLoading}
      />

      <ForwardBacktestQualityAuditPanel
        report={backtestQualityReport}
        loading={backtestQualityLoading}
      />

      <ForwardOperationalRebacktestAuditPanel
        report={operationalRebacktestReport}
        loading={operationalRebacktestLoading}
      />

      <ForwardOperationalAllocationAuditPanel
        report={operationalAllocationReport}
        loading={operationalAllocationLoading}
      />

      <ForwardOosValidationAuditPanel
        report={oosValidationReport}
        loading={oosValidationLoading}
      />

      <ForwardWalkForwardAuditPanel report={walkForwardReport} loading={walkForwardLoading} />

      <ForwardVixSensitivityAuditPanel
        report={vixSensitivityReport}
        loading={vixSensitivityLoading}
      />

      <ForwardSurvivorshipAuditPanel
        report={survivorshipReport}
        loading={survivorshipLoading}
      />

      <ForwardMarketDependencyAuditPanel
        report={marketDependencyReport}
        loading={marketDependencyLoading}
      />

      <ForwardTpTargetSensitivityAuditPanel
        report={tpTargetSensitivityReport}
        loading={tpTargetSensitivityLoading}
      />

      <ForwardHoldPeriodSensitivityAuditPanel
        report={holdPeriodSensitivityReport}
        loading={holdPeriodSensitivityLoading}
      />

      <ForwardRuleContributionAuditPanel
        report={ruleContributionReport}
        loading={ruleContributionLoading}
      />

      <ForwardAdxSensitivityAuditPanel
        report={adxSensitivityReport}
        loading={adxSensitivityLoading}
      />

      <ForwardAdx20ValidationAuditPanel
        report={adx20ValidationReport}
        loading={adx20ValidationLoading}
      />

      <ForwardDgroLowAdxAuditPanel report={dgroLowAdxReport} loading={dgroLowAdxLoading} />

      <ForwardAdx20IndependenceAuditPanel
        report={adx20IndependenceReport}
        loading={adx20IndependenceLoading}
      />

      <ForwardAdxYearlyOptimalAuditPanel
        report={adxYearlyOptimalReport}
        loading={adxYearlyOptimalLoading}
      />

      <ForwardAdx20WalkForwardAuditPanel
        report={adx20WalkForwardReport}
        loading={adx20WalkForwardLoading}
      />

      <ForwardDist52Adx20AuditPanel report={dist52Adx20Report} loading={dist52Adx20Loading} />

      <ForwardVixAdx20AuditPanel report={vixAdx20Report} loading={vixAdx20Loading} />

      <ForwardSpy63Adx20AuditPanel report={spy63Adx20Report} loading={spy63Adx20Loading} />

      <ForwardFinalRulesAblationAuditPanel
        report={finalRulesAblationReport}
        loading={finalRulesAblationLoading}
      />

      <ForwardPositionSizingAuditPanel
        report={positionSizingReport}
        loading={positionSizingLoading}
      />

      <ForwardExitStrategyAuditPanel report={exitStrategyReport} loading={exitStrategyLoading} />

      <ForwardEtfUniverseAuditPanel report={etfUniverseReport} loading={etfUniverseLoading} />

      <ForwardRobustnessAuditPanel report={robustnessReport} loading={robustnessLoading} />

      <ForwardWalkForward31AuditPanel report={walkForward31Report} loading={walkForward31Loading} />

      <ForwardMonteCarloAuditPanel report={monteCarloReport} loading={monteCarloLoading} />

      <ForwardBearStressAuditPanel report={bearStressReport} loading={bearStressLoading} />

      <ForwardEquityCurveAuditPanel report={equityCurveReport} loading={equityCurveLoading} />

      <ForwardLotSizeAuditPanel report={lotSizeReport} loading={lotSizeLoading} />

      <ForwardCompoundingAuditPanel report={compoundingReport} loading={compoundingLoading} />

      <ForwardSymbolContributionAuditPanel
        report={symbolContributionReport}
        loading={symbolContributionLoading}
      />

      <ForwardSymbolWeightAuditPanel
        report={symbolWeightReport}
        loading={symbolWeightLoading}
      />

      <ForwardRegimeEnvironmentAuditPanel
        report={regimeEnvironmentReport}
        loading={regimeEnvironmentLoading}
      />

      <ForwardMaxDrawdownCauseAuditPanel
        report={maxDrawdownCauseReport}
        loading={maxDrawdownCauseLoading}
      />

      <ForwardQqqNecessityAuditPanel
        report={qqqNecessityReport}
        loading={qqqNecessityLoading}
      />

      <ForwardLosingStreakAuditPanel
        report={losingStreakReport}
        loading={losingStreakLoading}
      />

      <ForwardDangerEnvFilterAuditPanel
        report={dangerEnvFilterReport}
        loading={dangerEnvFilterLoading}
      />

      <ForwardSpySidewaysValidityAuditPanel
        report={spySidewaysValidityReport}
        loading={spySidewaysValidityLoading}
      />

      <ForwardRateHike2022QqqClusterAuditPanel
        report={rateHike2022QqqReport}
        loading={rateHike2022QqqLoading}
      />

      <ForwardVix2430BandValidityAuditPanel
        report={vix2430BandReport}
        loading={vix2430BandLoading}
      />

      <ForwardRateHikePhaseAuditPanel
        report={rateHikePhaseReport}
        loading={rateHikePhaseLoading}
      />

      <ForwardQqqIntrinsicRiskAuditPanel
        report={qqqIntrinsicRiskReport}
        loading={qqqIntrinsicRiskLoading}
      />

      <ForwardReproducibilityAuditPanel
        report={reproducibilityReport}
        loading={reproducibilityLoading}
      />

      <Forward2022RootCauseAuditPanel
        report={rootCause2022Report}
        loading={rootCause2022Loading}
      />

      <ForwardOverfitAuditPanel report={overfitReport} loading={overfitLoading} />

      <ForwardWinFactorAuditPanel report={winFactorReport} loading={winFactorLoading} />

      <ForwardDurabilityAuditPanel
        report={durabilityReport}
        loading={durabilityLoading}
      />

      <ForwardCompleteOosAuditPanel
        report={completeOosReport}
        loading={completeOosLoading}
      />

      <ForwardAnomalyResilienceAuditPanel report={anomalyReport} loading={anomalyLoading} />

      <ForwardMarketChangeAuditPanel
        report={marketChangeReport}
        loading={marketChangeLoading}
      />

      <ForwardLehmanBreakdownAuditPanel report={lehmanReport} loading={lehmanLoading} />

      <ForwardLehmanLotAuditPanel report={lehmanLotReport} loading={lehmanLotLoading} />

      <ForwardDynamicLotAuditPanel report={dynamicLotReport} loading={dynamicLotLoading} />

      <ForwardKellyTriggerAuditPanel report={kellyTriggerReport} loading={kellyTriggerLoading} />

      <ForwardMcDurabilityAuditPanel report={mcDurabilityReport} loading={mcDurabilityLoading} />

      <ForwardBootstrapMcAuditPanel report={bootstrapMcReport} loading={bootstrapMcLoading} />

      <ForwardWf7030OosAuditPanel report={wf7030OosReport} loading={wf7030OosLoading} />

      <ForwardMalaysiaV1AuditPanel report={malaysiaV1Report} loading={malaysiaV1Loading} />

      <ForwardMalaysiaV2AuditPanel report={malaysiaV2Report} loading={malaysiaV2Loading} />

      <ForwardMalaysiaV2DurabilityAuditPanel
        report={malaysiaV2DurabilityReport}
        loading={malaysiaV2DurabilityLoading}
      />

      <ForwardMalaysiaV2DiversificationAuditPanel
        report={malaysiaV2DiversificationReport}
        loading={malaysiaV2DiversificationLoading}
      />

      <ForwardMalaysiaV2WeightAuditPanel
        report={malaysiaV2WeightReport}
        loading={malaysiaV2WeightLoading}
      />

      <ForwardMalaysiaV21FourthSymbolAuditPanel
        report={malaysiaV21FourthReport}
        loading={malaysiaV21FourthLoading}
      />

      <ForwardMalaysiaV3DcaAuditPanel
        report={malaysiaV3DcaReport}
        loading={malaysiaV3DcaLoading}
      />

      <ForwardMalaysiaV3CrashAuditPanel
        report={malaysiaV3CrashReport}
        loading={malaysiaV3CrashLoading}
      />

      <ForwardMalaysiaV3GamudaCapAuditPanel
        report={malaysiaV3GamudaCapReport}
        loading={malaysiaV3GamudaCapLoading}
      />

      <ForwardMalaysiaV3Cap15AuditPanel
        report={malaysiaV3Cap15Report}
        loading={malaysiaV3Cap15Loading}
      />

      <ForwardMalaysiaV3YtlDependencyAuditPanel
        report={malaysiaV3YtlDepReport}
        loading={malaysiaV3YtlDepLoading}
      />

      <ForwardMalaysiaV3YtlVerifyAuditPanel
        report={malaysiaV3YtlVerifyReport}
        loading={malaysiaV3YtlVerifyLoading}
      />

      <ForwardMalaysiaV4CandidateAuditPanel
        report={malaysiaV4CandidateReport}
        loading={malaysiaV4CandidateLoading}
      />

      <ForwardMalaysiaV4AttributionAuditPanel
        report={malaysiaV4AttribReport}
        loading={malaysiaV4AttribLoading}
      />

      <ForwardMalaysiaV4IjmOosAuditPanel
        report={malaysiaV4IjmOosReport}
        loading={malaysiaV4IjmOosLoading}
      />

      <ForwardMalaysiaV4FinalCompareAuditPanel
        report={malaysiaV4FinalCompareReport}
        loading={malaysiaV4FinalCompareLoading}
      />

      <ForwardMalaysiaV4OpsMonitorAuditPanel
        report={malaysiaV4OpsMonitorReport}
        loading={malaysiaV4OpsMonitorLoading}
      />

      <ForwardMalaysiaV4YahooQualityAuditPanel
        report={malaysiaV4YahooQualityReport}
        loading={malaysiaV4YahooQualityLoading}
      />

      <ForwardMalaysiaV4RebalanceAuditPanel
        report={malaysiaV4RebalanceReport}
        loading={malaysiaV4RebalanceLoading}
      />

      <ForwardMalaysiaV4TwelveBursaAuditPanel
        report={malaysiaV4TwelveBursaReport}
        loading={malaysiaV4TwelveBursaLoading}
      />

      <ForwardWinLossAuditPanel report={winLossReport} loading={loading} />

      <ForwardDist52AuditPanel report={dist52Report} loading={loading} />

      <ForwardAdxDist52CrossAuditPanel report={adxDist52CrossReport} loading={loading} />

      <ForwardRegimePerformanceAuditPanel report={regimePerformanceReport} loading={loading} />

      <ForwardRegimeDist52CrossAuditPanel report={regimeDist52CrossReport} loading={loading} />

      <ForwardReturnCorrelationAuditPanel report={returnCorrelationReport} loading={loading} />

      <ForwardFourFactorComboAuditPanel report={fourFactorComboReport} loading={loading} />

      <ForwardStrongCellReproAuditPanel report={strongCellReproReport} loading={loading} />

      <ForwardDownDist10ReproAuditPanel report={downDist10ReproReport} loading={loading} />

      <ForwardDownDist10WalkForwardAuditPanel
        report={downDist10WalkForwardReport}
        loading={loading}
      />

      <ForwardSpyDownClusterAuditPanel report={spyDownClusterReport} loading={loading} />

      <ForwardApril2025ExcludeAuditPanel report={april2025ExcludeReport} loading={loading} />

      <ForwardApril2025ClusterExplainerAuditPanel
        report={april2025ClusterExplainerReport}
        loading={loading}
      />

      <ForwardLoserCompleteAuditPanel report={loserCompleteReport} loading={loading} />

      <ForwardLoserFeatureAuditPanel report={loserFeatureReport} loading={loading} />

      <ForwardMaxHoldAuditPanel report={maxHoldReport} loading={loading} />

      <ForwardTakeProfitSensitivityAuditPanel
        report={takeProfitSensitivityReport}
        loading={loading}
      />

      <ForwardConditionSplitAuditPanel report={conditionSplitReport} loading={loading} />

      <ForwardStandalonePeriodAuditPanel report={standalonePeriodReport} loading={loading} />

      <ForwardMacdDist52PeriodAuditPanel report={macdDist52PeriodReport} loading={loading} />

      <ForwardMacdDist52EtfAuditPanel report={macdDist52EtfReport} loading={loading} />

      <ForwardMacdDist52DedupDayAuditPanel report={macdDist52DedupDayReport} loading={loading} />

      <ForwardMacdDist52DedupTimelineAuditPanel
        report={macdDist52DedupTimelineReport}
        loading={loading}
      />

      <ForwardMacdDist52DedupExclSpringAuditPanel
        report={macdDist52DedupExclSpringReport}
        loading={loading}
      />

      <ForwardMacdDist52ClusterMacroAuditPanel
        report={macdDist52ClusterMacroReport}
        loading={loading}
      />

      <ForwardMacdCumulativeAuditPanel report={macdCumulativeReport} loading={loading} />

      <ForwardMacdExclSpringAuditPanel report={macdExclSpringReport} loading={loading} />

      <ForwardEightCellAuditPanel report={eightCellReport} loading={loading} />

      <ForwardStrongCellMonthlyAuditPanel report={strongCellMonthlyReport} loading={loading} />

      <ForwardStrongCellFilterAuditPanel report={strongCellFilterReport} loading={loading} />

      <ForwardStrongCellExclListingAuditPanel report={strongCellExclListingReport} loading={loading} />

      <ForwardTrailingStopAuditPanel report={trailingStopReport} loading={loading} />

      <ForwardRegimeStandaloneAuditPanel report={regimeStandaloneReport} loading={loading} />

      <ForwardDist52StandaloneAuditPanel report={dist52StandaloneReport} loading={loading} />

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      <ForwardValidationPanel
        metrics={metrics}
        comparison={comparison}
        reports={persisted.reports ?? (persisted.report ? [persisted.report] : [])}
        lastRunDate={persisted.lastRunDate}
        lastRunAt={persisted.lastRunAt}
        lastFetchAt={persisted.lastFetchAt ?? fetchLog?.fetchedAt ?? null}
        yahooLatestDate={persisted.yahooLatestDate ?? bundle?.latestDate ?? null}
        fetchLog={fetchLog ?? persisted.yahooFetchLog}
        symbolLatestDates={bundle?.symbolLatestDates ?? {}}
        recentSignals={recentSignals}
        audit={audit}
        displayNow={displayNow}
        loading={loading}
        compact
      />

      <Button label="手動更新" onPress={() => void refresh(true)} variant="ghost" />
      <Button
        label="52w単独 CSV"
        onPress={() => void onExportDist52StandaloneCsv()}
        variant="ghost"
      />
      <Button
        label="レジーム単独 CSV"
        onPress={() => void onExportRegimeStandaloneCsv()}
        variant="ghost"
      />
      <Button
        label="トレーリング CSV"
        onPress={() => void onExportTrailingStopCsv()}
        variant="ghost"
      />
      <Button
        label="8セル CSV"
        onPress={() => void onExportEightCellCsv()}
        variant="ghost"
      />
      <Button
        label="最強セル月別 CSV"
        onPress={() => void onExportStrongCellMonthlyCsv()}
        variant="ghost"
      />
      <Button
        label="最強セル除外 CSV"
        onPress={() => void onExportStrongCellFilterCsv()}
        variant="ghost"
      />
      <Button
        label="最強セル残存 CSV"
        onPress={() => void onExportStrongCellExclListingCsv()}
        variant="ghost"
      />
      <Button
        label="二元分割 CSV"
        onPress={() => void onExportConditionSplitCsv()}
        variant="ghost"
      />
      <Button
        label="単独期間 CSV"
        onPress={() => void onExportStandalonePeriodCsv()}
        variant="ghost"
      />
      <Button
        label="MACD×52w期間 CSV"
        onPress={() => void onExportMacdDist52PeriodCsv()}
        variant="ghost"
      />
      <Button
        label="MACD×52w ETF CSV"
        onPress={() => void onExportMacdDist52EtfCsv()}
        variant="ghost"
      />
      <Button
        label="日次重複除外 CSV"
        onPress={() => void onExportMacdDist52DedupDayCsv()}
        variant="ghost"
      />
      <Button
        label="18イベント CSV"
        onPress={() => void onExportMacdDist52DedupTimelineCsv()}
        variant="ghost"
      />
      <Button
        label="4-5月除外 CSV"
        onPress={() => void onExportMacdDist52DedupExclSpringCsv()}
        variant="ghost"
      />
      <Button
        label="クラスタマクロ CSV"
        onPress={() => void onExportMacdDist52ClusterMacroCsv()}
        variant="ghost"
      />
      <Button
        label="VIX/SPY区分 CSV"
        onPress={() => void onExportVixSpyBucketCsv()}
        variant="ghost"
      />
      <Button
        label="VIX×SPY交差 CSV"
        onPress={() => void onExportVixSpyCrossCsv()}
        variant="ghost"
      />
      <Button
        label="VIX×SPY 4群 CSV"
        onPress={() => void onExportVixSpyFourGroupCsv()}
        variant="ghost"
      />
      <Button
        label="SPY/VIX/52週 CSV"
        onPress={() => void onExportSpyVixDist52ComboCsv()}
        variant="ghost"
      />
      <Button
        label="VIX≥25区分 CSV"
        onPress={() => void onExportVix25SubBucketCsv()}
        variant="ghost"
      />
      <Button
        label="VIX25 MACD CSV"
        onPress={() => void onExportVix25MacdDistCsv()}
        variant="ghost"
      />
      <Button
        label="VIX25 52週 CSV"
        onPress={() => void onExportVix25Dist52Csv()}
        variant="ghost"
      />
      <Button
        label="VIX25保有 CSV"
        onPress={() => void onExportVix25WinnerHoldCsv()}
        variant="ghost"
      />
      <Button
        label="VIX25先読みR CSV"
        onPress={() => void onExportVix25ForwardReturnCsv()}
        variant="ghost"
      />
      <Button
        label="VIX25 MAE/MFE CSV"
        onPress={() => void onExportVix25MaeMfeCsv()}
        variant="ghost"
      />
      <Button
        label="MAEワースト10 CSV"
        onPress={() => void onExportVix25MaeWorst10Csv()}
        variant="ghost"
      />
      <Button
        label="VIX25×SPY ETF別R CSV"
        onPress={() => void onExportVix25SpyEtfForwardReturnCsv()}
        variant="ghost"
      />
      <Button
        label="VIX25×SPYギャップ CSV"
        onPress={() => void onExportVix25SpyGapCsv()}
        variant="ghost"
      />
      <Button
        label="5条件スイープ CSV"
        onPress={() => void onExportFiveFactorSweepCsv()}
        variant="ghost"
      />
      <Button
        label="VIX閾値スイープ CSV"
        onPress={() => void onExportVixThresholdSweepCsv()}
        variant="ghost"
      />
      <Button
        label="VIX24スタック CSV"
        onPress={() => void onExportVix24StackCsv()}
        variant="ghost"
      />
      <Button
        label="VIX24出口比較 CSV"
        onPress={() => void onExportVix24ExitCompareCsv()}
        variant="ghost"
      />
      <Button
        label="VIX 4区分 CSV"
        onPress={() => void onExportVixBandCsv()}
        variant="ghost"
      />
      <Button
        label="VIX24連敗 CSV"
        onPress={() => void onExportVix24StreakCsv()}
        variant="ghost"
      />
      <Button
        label="VIX24有効性 CSV"
        onPress={() => void onExportVix24EffectivenessCsv()}
        variant="ghost"
      />
      <Button
        label="VIX24寄付き CSV"
        onPress={() => void onExportVix24OpenEntryCsv()}
        variant="ghost"
      />
      <Button
        label="VIX24期間分割 CSV"
        onPress={() => void onExportVix24PeriodConcentrationCsv()}
        variant="ghost"
      />
      <Button
        label="6敗原因 CSV"
        onPress={() => void onExportSixLossRootCauseCsv()}
        variant="ghost"
      />
      <Button
        label="VIX24 38勝 CSV"
        onPress={() => void onExportVix24WinnerStrengthCsv()}
        variant="ghost"
      />
      <Button
        label="VIX24拡張履歴 CSV"
        onPress={() => void onExportVix24ExtendedHistoryCsv()}
        variant="ghost"
      />
      <Button
        label="BT品質監査 CSV"
        onPress={() => void onExportBacktestQualityCsv()}
        variant="ghost"
      />
      <Button
        label="実運用再BT CSV"
        onPress={() => void onExportOperationalRebacktestCsv()}
        variant="ghost"
      />
      <Button
        label="資金配分監査 CSV"
        onPress={() => void onExportOperationalAllocationCsv()}
        variant="ghost"
      />
      <Button
        label="OOS検証 CSV"
        onPress={() => void onExportOosValidationCsv()}
        variant="ghost"
      />
      <Button
        label="WF検証 CSV"
        onPress={() => void onExportWalkForwardCsv()}
        variant="ghost"
      />
      <Button
        label="VIX感度 CSV"
        onPress={() => void onExportVixSensitivityCsv()}
        variant="ghost"
      />
      <Button
        label="生存者監査 CSV"
        onPress={() => void onExportSurvivorshipCsv()}
        variant="ghost"
      />
      <Button
        label="市場依存 CSV"
        onPress={() => void onExportMarketDependencyCsv()}
        variant="ghost"
      />
      <Button
        label="利確感度 CSV"
        onPress={() => void onExportTpTargetSensitivityCsv()}
        variant="ghost"
      />
      <Button
        label="保有期間 CSV"
        onPress={() => void onExportHoldPeriodSensitivityCsv()}
        variant="ghost"
      />
      <Button
        label="ルール寄与 CSV"
        onPress={() => void onExportRuleContributionCsv()}
        variant="ghost"
      />
      <Button
        label="ADX感度 CSV"
        onPress={() => void onExportAdxSensitivityCsv()}
        variant="ghost"
      />
      <Button
        label="ADX20妥当性 CSV"
        onPress={() => void onExportAdx20ValidationCsv()}
        variant="ghost"
      />
      <Button
        label="DGRO低ADX CSV"
        onPress={() => void onExportDgroLowAdxCsv()}
        variant="ghost"
      />
      <Button
        label="ADX20独立性 CSV"
        onPress={() => void onExportAdx20IndependenceCsv()}
        variant="ghost"
      />
      <Button
        label="年度別ADX CSV"
        onPress={() => void onExportAdxYearlyOptimalCsv()}
        variant="ghost"
      />
      <Button
        label="ADX20 WF CSV"
        onPress={() => void onExportAdx20WalkForwardCsv()}
        variant="ghost"
      />
      <Button
        label="52週×ADX20 CSV"
        onPress={() => void onExportDist52Adx20Csv()}
        variant="ghost"
      />
      <Button
        label="VIX×ADX20 CSV"
        onPress={() => void onExportVixAdx20Csv()}
        variant="ghost"
      />
      <Button
        label="SPY63×ADX20 CSV"
        onPress={() => void onExportSpy63Adx20Csv()}
        variant="ghost"
      />
      <Button
        label="総合アブレーション CSV"
        onPress={() => void onExportFinalRulesAblationCsv()}
        variant="ghost"
      />
      <Button
        label="ポジションサイズ CSV"
        onPress={() => void onExportPositionSizingCsv()}
        variant="ghost"
      />
      <Button
        label="出口戦略 CSV"
        onPress={() => void onExportExitStrategyCsv()}
        variant="ghost"
      />
      <Button
        label="ETFユニバース CSV"
        onPress={() => void onExportEtfUniverseCsv()}
        variant="ghost"
      />
      <Button
        label="頑健性 CSV"
        onPress={() => void onExportRobustnessCsv()}
        variant="ghost"
      />
      <Button
        label="WF検証 CSV"
        onPress={() => void onExportWalkForward31Csv()}
        variant="ghost"
      />
      <Button
        label="モンテカルロ CSV"
        onPress={() => void onExportMonteCarloCsv()}
        variant="ghost"
      />
      <Button
        label="暴落ストレス CSV"
        onPress={() => void onExportBearStressCsv()}
        variant="ghost"
      />
      <Button
        label="資金曲線 CSV"
        onPress={() => void onExportEquityCurveCsv()}
        variant="ghost"
      />
      <Button
        label="ロットサイズ CSV"
        onPress={() => void onExportLotSizeCsv()}
        variant="ghost"
      />
      <Button
        label="複利運用 CSV"
        onPress={() => void onExportCompoundingCsv()}
        variant="ghost"
      />
      <Button
        label="銘柄寄与 CSV"
        onPress={() => void onExportSymbolContributionCsv()}
        variant="ghost"
      />
      <Button
        label="銘柄ウェイト CSV"
        onPress={() => void onExportSymbolWeightCsv()}
        variant="ghost"
      />
      <Button
        label="Regime環境 CSV"
        onPress={() => void onExportRegimeEnvironmentCsv()}
        variant="ghost"
      />
      <Button
        label="最大DD原因 CSV"
        onPress={() => void onExportMaxDrawdownCauseCsv()}
        variant="ghost"
      />
      <Button
        label="QQQ必要性 CSV"
        onPress={() => void onExportQqqNecessityCsv()}
        variant="ghost"
      />
      <Button
        label="連敗 CSV"
        onPress={() => void onExportLosingStreakCsv()}
        variant="ghost"
      />
      <Button
        label="危険環境 CSV"
        onPress={() => void onExportDangerEnvFilterCsv()}
        variant="ghost"
      />
      <Button
        label="SPY横ばい CSV"
        onPress={() => void onExportSpySidewaysValidityCsv()}
        variant="ghost"
      />
      <Button
        label="2022QQQ CSV"
        onPress={() => void onExportRateHike2022QqqCsv()}
        variant="ghost"
      />
      <Button
        label="VIX帯 CSV"
        onPress={() => void onExportVix2430BandCsv()}
        variant="ghost"
      />
      <Button
        label="利上げ CSV"
        onPress={() => void onExportRateHikePhaseCsv()}
        variant="ghost"
      />
      <Button
        label="QQQ固有 CSV"
        onPress={() => void onExportQqqIntrinsicRiskCsv()}
        variant="ghost"
      />
      <Button
        label="再現性 CSV"
        onPress={() => void onExportReproducibilityCsv()}
        variant="ghost"
      />
      <Button
        label="2022真因 CSV"
        onPress={() => void onExport2022RootCauseCsv()}
        variant="ghost"
      />
      <Button
        label="過学習 CSV"
        onPress={() => void onExportOverfitCsv()}
        variant="ghost"
      />
      <Button
        label="勝ち因子 CSV"
        onPress={() => void onExportWinFactorCsv()}
        variant="ghost"
      />
      <Button
        label="耐久性 CSV"
        onPress={() => void onExportDurabilityCsv()}
        variant="ghost"
      />
      <Button
        label="完全OOS CSV"
        onPress={() => void onExportCompleteOosCsv()}
        variant="ghost"
      />
      <Button
        label="異常系 CSV"
        onPress={() => void onExportAnomalyCsv()}
        variant="ghost"
      />
      <Button
        label="市場変化 CSV"
        onPress={() => void onExportMarketChangeCsv()}
        variant="ghost"
      />
      <Button
        label="リーマン級 CSV"
        onPress={() => void onExportLehmanCsv()}
        variant="ghost"
      />
      <Button
        label="ロット管理 CSV"
        onPress={() => void onExportLehmanLotCsv()}
        variant="ghost"
      />
      <Button
        label="動的ロット CSV"
        onPress={() => void onExportDynamicLotCsv()}
        variant="ghost"
      />
      <Button
        label="Kelly発火 CSV"
        onPress={() => void onExportKellyTriggerCsv()}
        variant="ghost"
      />
      <Button
        label="MC耐久 CSV"
        onPress={() => void onExportMcDurabilityCsv()}
        variant="ghost"
      />
      <Button
        label="Bootstrap CSV"
        onPress={() => void onExportBootstrapMcCsv()}
        variant="ghost"
      />
      <Button
        label="WF OOS CSV"
        onPress={() => void onExportWf7030OosCsv()}
        variant="ghost"
      />
      <Button
        label="MY v1 CSV"
        onPress={() => void onExportMalaysiaV1Csv()}
        variant="ghost"
      />
      <Button
        label="MY v2 CSV"
        onPress={() => void onExportMalaysiaV2Csv()}
        variant="ghost"
      />
      <Button
        label="MY v2耐久 CSV"
        onPress={() => void onExportMalaysiaV2DurabilityCsv()}
        variant="ghost"
      />
      <Button
        label="MY v2分散 CSV"
        onPress={() => void onExportMalaysiaV2DiversificationCsv()}
        variant="ghost"
      />
      <Button
        label="MY v2.1ウェイト CSV"
        onPress={() => void onExportMalaysiaV2WeightCsv()}
        variant="ghost"
      />
      <Button
        label="MY v2.1第4銘柄 CSV"
        onPress={() => void onExportMalaysiaV21FourthCsv()}
        variant="ghost"
      />
      <Button
        label="MY v3積立 CSV"
        onPress={() => void onExportMalaysiaV3DcaCsv()}
        variant="ghost"
      />
      <Button
        label="MY v3暴落 CSV"
        onPress={() => void onExportMalaysiaV3CrashCsv()}
        variant="ghost"
      />
      <Button
        label="MY v3 GAMUDA CSV"
        onPress={() => void onExportMalaysiaV3GamudaCapCsv()}
        variant="ghost"
      />
      <Button
        label="MY v3 cap15 CSV"
        onPress={() => void onExportMalaysiaV3Cap15Csv()}
        variant="ghost"
      />
      <Button
        label="MY v3 YTL CSV"
        onPress={() => void onExportMalaysiaV3YtlDepCsv()}
        variant="ghost"
      />
      <Button
        label="MY v3 YTL verify CSV"
        onPress={() => void onExportMalaysiaV3YtlVerifyCsv()}
        variant="ghost"
      />
      <Button
        label="MY v4候補 CSV"
        onPress={() => void onExportMalaysiaV4CandidateCsv()}
        variant="ghost"
      />
      <Button
        label="MY v4帰属 CSV"
        onPress={() => void onExportMalaysiaV4AttribCsv()}
        variant="ghost"
      />
      <Button
        label="MY v4 IJM OOS CSV"
        onPress={() => void onExportMalaysiaV4IjmOosCsv()}
        variant="ghost"
      />
      <Button
        label="MY v4最終比較 CSV"
        onPress={() => void onExportMalaysiaV4FinalCompareCsv()}
        variant="ghost"
      />
      <Button
        label="MY v4運用監視 CSV"
        onPress={() => void onExportMalaysiaV4OpsMonitorCsv()}
        variant="ghost"
      />
      <Button
        label="MY v4運用監視 JSON"
        onPress={() => void onExportMalaysiaV4OpsMonitorJson()}
        variant="ghost"
      />
      <Button
        label="MY v4 Yahoo品質 CSV"
        onPress={() => void onExportMalaysiaV4YahooQualityCsv()}
        variant="ghost"
      />
      <Button
        label="MY v4リバランス CSV"
        onPress={() => void onExportMalaysiaV4RebalanceCsv()}
        variant="ghost"
      />
      <Button
        label="MY v4 Twelve Bursa CSV"
        onPress={() => void onExportMalaysiaV4TwelveBursaCsv()}
        variant="ghost"
      />
      <Button
        label="MACD累積 CSV"
        onPress={() => void onExportMacdCumulativeCsv()}
        variant="ghost"
      />
      <Button
        label="MACD4-5月除外 CSV"
        onPress={() => void onExportMacdExclSpringCsv()}
        variant="ghost"
      />
      <Button
        label="利確感度 CSV"
        onPress={() => void onExportTakeProfitSensitivityCsv()}
        variant="ghost"
      />
      <Button
        label="25日満了 CSV"
        onPress={() => void onExportMaxHoldCsv()}
        variant="ghost"
      />
      <Button
        label="負け特徴 CSV"
        onPress={() => void onExportLoserFeatureCsv()}
        variant="ghost"
      />
      <Button
        label="負け完全 CSV"
        onPress={() => void onExportLoserCompleteCsv()}
        variant="ghost"
      />
      <Button
        label="4月説明力 CSV"
        onPress={() => void onExportApril2025ClusterExplainerCsv()}
        variant="ghost"
      />
      <Button
        label="4月除外 CSV"
        onPress={() => void onExportApril2025ExcludeCsv()}
        variant="ghost"
      />
      <Button
        label="SPY down CSV"
        onPress={() => void onExportSpyDownClusterCsv()}
        variant="ghost"
      />
      <Button
        label="down WF CSV"
        onPress={() => void onExportDownDist10WalkForwardCsv()}
        variant="ghost"
      />
      <Button
        label="down×52w再現 CSV"
        onPress={() => void onExportDownDist10ReproCsv()}
        variant="ghost"
      />
      <Button
        label="再現性 CSV"
        onPress={() => void onExportStrongCellReproCsv()}
        variant="ghost"
      />
      <Button
        label="4条件組合 CSV"
        onPress={() => void onExportFourFactorComboCsv()}
        variant="ghost"
      />
      <Button
        label="相関監査 CSV"
        onPress={() => void onExportReturnCorrelationCsv()}
        variant="ghost"
      />
      <Button
        label="レジーム×52w CSV"
        onPress={() => void onExportRegimeDist52CrossCsv()}
        variant="ghost"
      />
      <Button
        label="レジーム別 CSV"
        onPress={() => void onExportRegimePerformanceCsv()}
        variant="ghost"
      />
      <Button
        label="ADX×52w CSV"
        onPress={() => void onExportAdxDist52CrossCsv()}
        variant="ghost"
      />
      <Button
        label="52w乖離帯 CSV"
        onPress={() => void onExportDist52Csv()}
        variant="ghost"
      />
      <Button
        label="勝ち vs 負け CSV"
        onPress={() => void onExportWinLossCsv()}
        variant="ghost"
      />
      <Button
        label="条件適合96件 CSV"
        onPress={() => void onExportPassedTradesCsv()}
        variant="ghost"
      />
      <Button
        label="MACD詳細監査 CSV"
        onPress={() => void onExportMacdAuditCsv()}
        variant="ghost"
      />
      <Button
        label="ADX詳細監査 CSV"
        onPress={() => void onExportAdxAuditCsv()}
        variant="ghost"
      />
      <Button
        label="条件別失格率 CSV"
        onPress={() => void onExportConditionBlockCsv()}
        variant="ghost"
      />
      <Button
        label="シグナルギャップ監査 CSV"
        onPress={() => void onExportGapAuditCsv()}
        variant="ghost"
      />
      <Button
        label={`最新${LATEST_SIGNALS_CSV_LIMIT}件シグナル CSV`}
        onPress={() => void onExportLatestSignalsCsv()}
        variant="ghost"
      />
      <Button label="全データ CSV" onPress={() => void onExportFullCsv()} variant="ghost" />
      <Button label="検証データをリセット" onPress={onReset} variant="ghost" />
      <Button
        label="成績画面へ"
        onPress={() => stackNav.navigate('Performance')}
        variant="ghost"
      />
    </Screen>
  );
}

function defaultEmpty(): ForwardValidationPersisted {
  return {
    version: 1,
    startedAt: '',
    lastRunDate: null,
    lastRunAt: null,
    lastFetchAt: null,
    yahooLatestDate: null,
    yahooFetchLog: null,
    initialCapitalUsd: 10_000,
    signals: [],
    openPositions: [],
    closedTrades: [],
    dailyReturns: [],
    equityUsd: 10_000,
    peakEquityUsd: 10_000,
    report: null,
    reports: [],
    reportGeneratedAt: null,
  };
}

const styles = StyleSheet.create({
  note: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.sm, lineHeight: 18 },
});
