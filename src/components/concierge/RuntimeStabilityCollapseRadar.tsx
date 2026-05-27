import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getRuntimeObserverRecursionDashboard } from '../../runtimeObserverRecursion';
import { getRuntimeResourceStabilityDashboard } from '../../runtimeResourceStability';
import { getRuntimeCrossStackCompressionDashboard } from '../../runtimeCrossStackCompression';
import { getRuntimeSelfRecursionEnduranceDashboard } from '../../runtimeSelfRecursionEndurance';
import { RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA } from '../../constants/runtimeSelfRecursionEndurance';
import { getRuntimeTelemetryEntropyDashboard } from '../../runtimeTelemetryEntropy';
import { getRuntimeCognitiveGovernanceDashboard } from '../../runtimeCognitiveGovernance';
import { getRuntimeCivilizationTopologyDashboard } from '../../runtimeCivilizationTopology';
import { getRuntimeMetaLimitDashboard } from '../../runtimeMetaLimitGovernance';
import { getRuntimeFederationDashboard } from '../../runtimeFederationGovernance';
import { getRuntimeOntologyDashboard } from '../../runtimeOntologyStabilization';
import { getRuntimeFiniteBoundaryDashboard } from '../../runtimeFiniteBoundary';
import { getRuntimeSemanticCompressionDashboard } from '../../runtimeSemanticCompression';
import { getRuntimeSemanticGravityDashboard } from '../../runtimeSemanticGravity';
import { getRuntimeSemanticThermodynamicsDashboard } from '../../runtimeSemanticThermodynamics';
import { getRuntimeSemanticPhaseDashboard } from '../../runtimeSemanticPhaseTransition';
import { getRuntimeAdaptiveObservationDashboard } from '../../runtimeAdaptiveObservation';
import { getRuntimeObserverRealityDashboard } from '../../runtimeObserverRealitySelection';
import { getRuntimeInterCivilizationDashboard } from '../../runtimeInterCivilizationResonance';
import { getRuntimeGovernanceFreezeDashboard } from '../../runtimeGovernanceFreeze';
import { theme } from '../../theme';

function RuntimeStabilityCollapseRadarInner() {
  const observer = getRuntimeObserverRecursionDashboard();
  const resource = getRuntimeResourceStabilityDashboard();
  const compression = getRuntimeCrossStackCompressionDashboard();
  const endurance = getRuntimeSelfRecursionEnduranceDashboard();
  const entropy = getRuntimeTelemetryEntropyDashboard();
  const cognitive = getRuntimeCognitiveGovernanceDashboard();
  const topology = getRuntimeCivilizationTopologyDashboard();
  const metaLimit = getRuntimeMetaLimitDashboard();
  const federation = getRuntimeFederationDashboard();
  const ontology = getRuntimeOntologyDashboard();
  const finiteBoundary = getRuntimeFiniteBoundaryDashboard();
  const semanticCompression = getRuntimeSemanticCompressionDashboard();
  const semanticGravity = getRuntimeSemanticGravityDashboard();
  const semanticThermodynamics = getRuntimeSemanticThermodynamicsDashboard();
  const semanticPhase = getRuntimeSemanticPhaseDashboard();
  const adaptiveObservation = getRuntimeAdaptiveObservationDashboard();
  const observerReality = getRuntimeObserverRealityDashboard();
  const interCivilization = getRuntimeInterCivilizationDashboard();
  const governanceFreeze = getRuntimeGovernanceFreezeDashboard();

  if (!observer && !resource && !compression && !endurance && !entropy && !cognitive && !topology && !metaLimit && !federation && !ontology && !finiteBoundary && !semanticCompression && !semanticGravity && !semanticThermodynamics && !semanticPhase && !adaptiveObservation && !observerReality && !interCivilization && !governanceFreeze) return null;

  return (
    <View style={styles.wrap} testID="runtime-stability-collapse-radar">
      <Text style={styles.subTitle}>Runtime Collapse Radar</Text>
      <Text style={styles.muted}>observe-only — 崩壊点の即時把握（intervention 禁止）</Text>

      {observer ? (
        <>
          <Text style={styles.label}>Recursion heatmap</Text>
          <Text style={styles.muted}>
            {observer.recursionHeatmap.map((h) => `${h.layer}:${h.intensity.toFixed(2)}`).join(' · ')}
          </Text>
          <Text style={styles.label}>Observer graph</Text>
          <Text style={styles.muted}>
            {observer.observeGraph.nodes.map((n) => n.label).join(' → ')}
          </Text>
          <Text style={styles.label}>Telemetry amplification timeline</Text>
          <Text style={styles.muted}>
            {observer.amplificationTimeline
              .slice(-4)
              .map((p) => p.level.toFixed(2))
              .join(' → ')}
          </Text>
        </>
      ) : null}

      {resource ? (
        <>
          <Text style={styles.label}>Resource saturation gauge</Text>
          <Text style={styles.muted}>
            {resource.saturationGauge.map((g) => `${g.label}:${g.level.toFixed(2)}`).join(' · ')}
          </Text>
          <Text style={styles.label}>Runtime drift radar</Text>
          <Text style={styles.muted}>
            {resource.driftRadar.map((d) => `${d.axis}:${d.value.toFixed(2)}`).join(' · ')}
          </Text>
        </>
      ) : null}

      {endurance ? (
        <>
          <Text style={styles.label}>{endurance.titleJa}</Text>
          <Text style={styles.muted}>{endurance.safetyBannerJa}</Text>
          <Text style={styles.muted}>
            {RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA.recursionCircuitRisk}:{' '}
            {endurance.profile.recursionCircuitRisk} ·{' '}
            {RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA.observerEchoRisk}: {endurance.profile.observerEchoRisk}{' '}
            · {RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA.telemetryEchoRisk}:{' '}
            {endurance.profile.telemetryEchoRisk} · {RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA.auditLoopRisk}:{' '}
            {endurance.profile.auditLoopRisk}
          </Text>
          <Text style={styles.muted}>
            {RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA.operationalEnduranceScore}:{' '}
            {endurance.profile.runtimeOperationalEnduranceScore} · band {endurance.enduranceRiskBand} ·{' '}
            {RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA.dashboardPayloadGrowthRisk}:{' '}
            {endurance.profile.dashboardPayloadGrowthRisk} ·{' '}
            {RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA.longSessionDriftRisk}:{' '}
            {endurance.profile.longSessionDriftRisk} ·{' '}
            {RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA.runtimeEnduranceConfidence}:{' '}
            {endurance.profile.runtimeEnduranceConfidence}
          </Text>
          <Text style={styles.muted}>
            circuit timeline{' '}
            {endurance.circuitTimeline
              .slice(-4)
              .map((p) => p.recursionCircuitRisk.toFixed(2))
              .join(' → ')}
          </Text>
        </>
      ) : null}

      {entropy ? (
        <>
          <Text style={styles.label}>{entropy.titleJa}</Text>
          <Text style={styles.muted}>
            entropy {entropy.profile.signalEntropyScore} · dup {entropy.profile.telemetryDuplicationRisk} ·
            replay {entropy.profile.replayAmplificationRisk}
          </Text>
          <Text style={styles.muted}>
            export {entropy.profile.exportPayloadRisk} · saturation {entropy.profile.dashboardSaturationRisk}
          </Text>
        </>
      ) : null}

      {cognitive ? (
        <>
          <Text style={styles.label}>{cognitive.titleJa}</Text>
          <Text style={styles.muted}>
            load {cognitive.profile.dashboardCognitiveLoad} · noise {cognitive.profile.semanticNoiseRatio} ·
            priority drift {cognitive.profile.signalPriorityDrift}
          </Text>
          <Text style={styles.muted}>
            attention {cognitive.profile.observerAttentionFragmentation} · replay{' '}
            {cognitive.profile.replayNarrativeComplexity} · operator{' '}
            {cognitive.profile.operatorDecisionLatencyRisk}
          </Text>
        </>
      ) : null}

      {topology ? (
        <>
          <Text style={styles.label}>{topology.titleJa}</Text>
          <Text style={styles.muted}>
            topology {topology.profile.cognitionTopologyComplexity} · epistemic{' '}
            {topology.profile.epistemicStabilityScore} · collapse {topology.profile.topologyCollapseRisk}
          </Text>
          <Text style={styles.muted}>
            worldview drift {topology.profile.governanceBeliefDrift} · perspective{' '}
            {topology.profile.observerPerspectiveFragmentation} · reality{' '}
            {topology.profile.narrativeRealityCoupling}
          </Text>
        </>
      ) : null}

      {metaLimit ? (
        <>
          <Text style={styles.label}>{metaLimit.titleJa}</Text>
          <Text style={styles.muted}>
            meta depth {metaLimit.profile.metaRecursionDepth} · expansion{' '}
            {metaLimit.profile.monitoringChainExpansionRisk} · infinite{' '}
            {metaLimit.profile.semanticInfiniteLoopRisk}
          </Text>
          <Text style={styles.muted}>
            boundary {metaLimit.profile.recursionBoundaryStability} · finite{' '}
            {metaLimit.profile.finiteObservationScore} · termination{' '}
            {metaLimit.profile.observerTerminationConfidence}
          </Text>
        </>
      ) : null}

      {federation ? (
        <>
          <Text style={styles.label}>{federation.titleJa}</Text>
          <Text style={styles.muted}>
            federation {federation.profile.stackFederationComplexity} · metric explosion{' '}
            {federation.profile.metricExplosionRisk} · dashboard{' '}
            {federation.profile.dashboardSaturationPressure}
          </Text>
          <Text style={styles.muted}>
            compression {federation.profile.federationCompressionRatio} · integrity{' '}
            {federation.profile.federationIntegrityScore} · observer drift{' '}
            {federation.profile.observerFederationDrift}
          </Text>
        </>
      ) : null}

      {ontology ? (
        <>
          <Text style={styles.label}>{ontology.titleJa}</Text>
          <Text style={styles.muted}>
            anchor {ontology.profile.runtimeRealityAnchorScore} · ontology drift{' '}
            {ontology.profile.semanticOntologyDrift} · collapse{' '}
            {ontology.profile.recursiveMeaningCollapseRisk}
          </Text>
          <Text style={styles.muted}>
            grounding {ontology.profile.semanticGroundingStrength} · symbolic instability{' '}
            {ontology.profile.symbolicReferenceInstability} · closed loop{' '}
            {ontology.profile.symbolicClosedLoopRisk}
          </Text>
        </>
      ) : null}

      {finiteBoundary ? (
        <>
          <Text style={styles.label}>{finiteBoundary.titleJa}</Text>
          <Text style={styles.muted}>
            budget {finiteBoundary.profile.observerBudgetConsumption} · recursion{' '}
            {finiteBoundary.profile.recursionBudgetUsage} · mass{' '}
            {finiteBoundary.profile.civilizationStackMassIndex}
          </Text>
          <Text style={styles.muted}>
            boundedness {finiteBoundary.profile.boundednessConfidence} · termination{' '}
            {finiteBoundary.profile.recursionTerminationProbability} · boundary{' '}
            {finiteBoundary.profile.runtimeFiniteBoundaryIndex}
          </Text>
        </>
      ) : null}

      {semanticCompression ? (
        <>
          <Text style={styles.label}>{semanticCompression.titleJa}</Text>
          <Text style={styles.muted}>
            aliases {semanticCompression.profile.semanticAliasClusterCount} · canonical pressure{' '}
            {semanticCompression.profile.metricCanonicalizationPressure} · overlap{' '}
            {semanticCompression.profile.crossLayerSemanticOverlap}
          </Text>
          <Text style={styles.muted}>
            dashboard crowding {semanticCompression.profile.dashboardSemanticCrowding} · loop{' '}
            {semanticCompression.profile.observerDependencyLoopRisk} · deadlock{' '}
            {semanticCompression.profile.canonicalizationDeadlockRisk}
          </Text>
        </>
      ) : null}

      {semanticGravity ? (
        <>
          <Text style={styles.label}>{semanticGravity.titleJa}</Text>
          <Text style={styles.muted}>
            mass {semanticGravity.profile.semanticGravityMass} · singularity{' '}
            {semanticGravity.profile.semanticSingularityRisk} · truth{' '}
            {semanticGravity.profile.canonicalTruthPressure}
          </Text>
          <Text style={styles.muted}>
            divergence {semanticGravity.profile.semanticAnchorDivergence} · monoculture{' '}
            {semanticGravity.profile.semanticMonocultureRisk} · equilibrium{' '}
            {semanticGravity.profile.semanticEquilibriumScore}
          </Text>
        </>
      ) : null}

      {semanticThermodynamics ? (
        <>
          <Text style={styles.label}>{semanticThermodynamics.titleJa}</Text>
          <Text style={styles.muted}>
            heat {semanticThermodynamics.profile.runtimeMeaningHeatIndex} · entropy{' '}
            {semanticThermodynamics.profile.semanticEntropyLevel} · turbulence{' '}
            {semanticThermodynamics.profile.ontologyTurbulenceIntensity}
          </Text>
          <Text style={styles.muted}>
            dissipation {semanticThermodynamics.profile.semanticDissipationEfficiency} · fatigue{' '}
            {semanticThermodynamics.profile.observerThermalFatigue} · heat death{' '}
            {semanticThermodynamics.profile.semanticHeatDeathRisk}
          </Text>
        </>
      ) : null}

      {semanticPhase ? (
        <>
          <Text style={styles.label}>{semanticPhase.titleJa}</Text>
          <Text style={styles.muted}>
            volatility {semanticPhase.profile.semanticPhaseVolatility} · state shift{' '}
            {semanticPhase.profile.ontologyStateShiftRisk} · crystal{' '}
            {semanticPhase.profile.recursiveMeaningCrystalRisk}
          </Text>
          <Text style={styles.muted}>
            fluidity {semanticPhase.profile.semanticFluidityIndex} · phase lock{' '}
            {semanticPhase.profile.observerPhaseLockRisk} · collapse{' '}
            {semanticPhase.profile.semanticStateCollapseRisk}
          </Text>
        </>
      ) : null}

      {adaptiveObservation ? (
        <>
          <Text style={styles.label}>{adaptiveObservation.titleJa}</Text>
          <Text style={styles.muted}>
            load {adaptiveObservation.profile.observerAttentionLoad} · pressure{' '}
            {adaptiveObservation.profile.runtimeObservationPressure} · flood{' '}
            {adaptiveObservation.profile.telemetryFloodRisk}
          </Text>
          <Text style={styles.muted}>
            hot-path {adaptiveObservation.profile.semanticHotPathIntensity} · routing{' '}
            {adaptiveObservation.profile.observationRoutingComplexity} · exhaustion{' '}
            {adaptiveObservation.profile.runtimeAttentionExhaustion}
          </Text>
        </>
      ) : null}

      {observerReality ? (
        <>
          <Text style={styles.label}>{observerReality.titleJa}</Text>
          <Text style={styles.muted}>
            selection {observerReality.profile.observerRealitySelectionPressure} · causality{' '}
            {observerReality.profile.semanticCausalityDrift} · branching{' '}
            {observerReality.profile.recursiveInterpretationBranching}
          </Text>
          <Text style={styles.muted}>
            coupling {observerReality.profile.narrativeRealityCouplingStress} · fixation{' '}
            {observerReality.profile.observerRealityFixationRisk} · resistance{' '}
            {observerReality.profile.semanticAdaptationResistance}
          </Text>
        </>
      ) : null}

      {interCivilization ? (
        <>
          <Text style={styles.label}>{interCivilization.titleJa}</Text>
          <Text style={styles.muted}>
            resonance {interCivilization.profile.interCivilizationResonance} · collision{' '}
            {interCivilization.profile.ontologyCollisionDensity} · drift{' '}
            {interCivilization.profile.civilizationDriftVelocity}
          </Text>
          <Text style={styles.muted}>
            interference {interCivilization.profile.observerInterferenceRisk} · plurality{' '}
            {interCivilization.profile.semanticPluralityIntegrity} · coexistence{' '}
            {interCivilization.profile.ontologyCoexistenceStability}
          </Text>
        </>
      ) : null}

      {governanceFreeze ? (
        <>
          <Text style={styles.label}>{governanceFreeze.titleJa}</Text>
          <Text style={styles.muted}>
            entropy {governanceFreeze.profile.runtimeExpansionEntropy} · maintainability{' '}
            {governanceFreeze.profile.stackMaintainabilityIndex} · freeze{' '}
            {governanceFreeze.profile.expansionFreezeConfidence}
          </Text>
          <Text style={styles.muted}>
            convergence {governanceFreeze.profile.operationalConvergenceScore} · lock{' '}
            {governanceFreeze.profile.governanceLockRecommendation} · closure{' '}
            {governanceFreeze.profile.architectureClosureIntegrity}
          </Text>
        </>
      ) : null}

      {compression ? (
        <>
          <Text style={styles.label}>Stack dependency topology</Text>
          <Text style={styles.muted}>
            {compression.stackTopology.map((n) => n.label).join(' → ')}
          </Text>
          <Text style={styles.label}>Signal compression ratio</Text>
          <Text style={styles.muted}>
            {compression.profile.signalCompressionRatio} · dedup telemetry{' '}
            {compression.profile.telemetryDedupRatio}
          </Text>
          <Text style={styles.label}>Amplification heatmap</Text>
          <Text style={styles.muted}>
            {compression.amplificationHeatmap.map((h) => `${h.stack}:${h.intensity.toFixed(2)}`).join(' · ')}
          </Text>
        </>
      ) : null}
    </View>
  );
}

export const RuntimeStabilityCollapseRadar = memo(RuntimeStabilityCollapseRadarInner);

const styles = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 8 },
  subTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  label: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginTop: 6 },
  muted: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
});
