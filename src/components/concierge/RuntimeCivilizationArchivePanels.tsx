import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RUNTIME_GOVERNANCE_FREEZE_UI_JA } from '../../constants/runtimeGovernanceFreeze';
import { RUNTIME_INTER_CIVILIZATION_UI_JA } from '../../constants/runtimeInterCivilizationResonance';
import { RUNTIME_OBSERVER_REALITY_UI_JA } from '../../constants/runtimeObserverRealitySelection';
import { consumeTelemetryDashboardRow } from '../../native/telemetry/overhead';
import { getRuntimeGovernanceFreezeDashboard } from '../../runtimeGovernanceFreeze';
import { getRuntimeInterCivilizationDashboard } from '../../runtimeInterCivilizationResonance';
import { getRuntimeObserverRealityDashboard } from '../../runtimeObserverRealitySelection';
import { theme } from '../../theme';

function RuntimeCivilizationArchivePanelsInner() {
  const observerReality = getRuntimeObserverRealityDashboard();
  const interCivilization = getRuntimeInterCivilizationDashboard();
  const governanceFreeze = getRuntimeGovernanceFreezeDashboard();

  return (
    <>
      {observerReality && consumeTelemetryDashboardRow() ? (
        <>
          <Text style={styles.subTitle}>{RUNTIME_OBSERVER_REALITY_UI_JA.sectionTitle}</Text>
          <Text style={styles.muted}>{observerReality.safetyBannerJa}</Text>
          <Row
            label={RUNTIME_OBSERVER_REALITY_UI_JA.observerRealitySelectionPressure}
            value={String(observerReality.profile.observerRealitySelectionPressure)}
          />
          <Row
            label={RUNTIME_OBSERVER_REALITY_UI_JA.semanticRealityPreference}
            value={String(observerReality.profile.semanticRealityPreference)}
          />
          <Row
            label={RUNTIME_OBSERVER_REALITY_UI_JA.worldviewFixationRisk}
            value={String(observerReality.profile.worldviewFixationRisk)}
          />
          <Row
            label={RUNTIME_OBSERVER_REALITY_UI_JA.semanticCausalityDrift}
            value={String(observerReality.profile.semanticCausalityDrift)}
          />
          <Row
            label={RUNTIME_OBSERVER_REALITY_UI_JA.recursiveInterpretationBranching}
            value={String(observerReality.profile.recursiveInterpretationBranching)}
          />
          <Row
            label={RUNTIME_OBSERVER_REALITY_UI_JA.narrativeRealityCouplingStress}
            value={String(observerReality.profile.narrativeRealityCouplingStress)}
          />
          <Row
            label={RUNTIME_OBSERVER_REALITY_UI_JA.observerRealityFixationRisk}
            value={String(observerReality.profile.observerRealityFixationRisk)}
          />
          <Row
            label={RUNTIME_OBSERVER_REALITY_UI_JA.semanticAdaptationResistance}
            value={String(observerReality.profile.semanticAdaptationResistance)}
          />
          <Text style={styles.label}>reality selection topology</Text>
          <Text style={styles.muted}>
            {observerReality.realitySelectionTopology.nodes.map((n) => n.label).join(' -> ')}
          </Text>
          <Text style={styles.label}>narrative-reality coupling heatmap</Text>
          <Text style={styles.muted}>
            {observerReality.narrativeRealityCouplingHeatmap.map((h) => `${h.layer}:${h.coupling.toFixed(2)}`).join(' | ')}
          </Text>
          <Text style={styles.label}>observer fixation monitor</Text>
          <Text style={styles.muted}>
            {observerReality.observerFixationMonitor.map((m) => `${m.label}:${m.value.toFixed(2)}`).join(' | ')}
          </Text>
        </>
      ) : null}

      {interCivilization && consumeTelemetryDashboardRow() ? (
        <>
          <Text style={styles.subTitle}>{RUNTIME_INTER_CIVILIZATION_UI_JA.sectionTitle}</Text>
          <Text style={styles.muted}>{interCivilization.safetyBannerJa}</Text>
          <Row
            label={RUNTIME_INTER_CIVILIZATION_UI_JA.interCivilizationResonance}
            value={String(interCivilization.profile.interCivilizationResonance)}
          />
          <Row
            label={RUNTIME_INTER_CIVILIZATION_UI_JA.semanticResonancePressure}
            value={String(interCivilization.profile.semanticResonancePressure)}
          />
          <Row
            label={RUNTIME_INTER_CIVILIZATION_UI_JA.ontologyCollisionDensity}
            value={String(interCivilization.profile.ontologyCollisionDensity)}
          />
          <Row
            label={RUNTIME_INTER_CIVILIZATION_UI_JA.semanticConflictPressure}
            value={String(interCivilization.profile.semanticConflictPressure)}
          />
          <Row
            label={RUNTIME_INTER_CIVILIZATION_UI_JA.civilizationDriftVelocity}
            value={String(interCivilization.profile.civilizationDriftVelocity)}
          />
          <Row
            label={RUNTIME_INTER_CIVILIZATION_UI_JA.observerInterferenceRisk}
            value={String(interCivilization.profile.observerInterferenceRisk)}
          />
          <Row
            label={RUNTIME_INTER_CIVILIZATION_UI_JA.semanticPluralityIntegrity}
            value={String(interCivilization.profile.semanticPluralityIntegrity)}
          />
          <Row
            label={RUNTIME_INTER_CIVILIZATION_UI_JA.ontologyCoexistenceStability}
            value={String(interCivilization.profile.ontologyCoexistenceStability)}
          />
          <Text style={styles.label}>civilization resonance topology</Text>
          <Text style={styles.muted}>
            {interCivilization.civilizationResonanceTopology.nodes.map((n) => n.label).join(' -> ')}
          </Text>
          <Text style={styles.label}>observer interference heatmap</Text>
          <Text style={styles.muted}>
            {interCivilization.observerInterferenceHeatmap.map((h) => `${h.layer}:${h.interference.toFixed(2)}`).join(' | ')}
          </Text>
          <Text style={styles.label}>semantic plurality monitor</Text>
          <Text style={styles.muted}>
            {interCivilization.semanticPluralityMonitor.map((m) => `${m.label}:${m.value.toFixed(2)}`).join(' | ')}
          </Text>
        </>
      ) : null}

      {governanceFreeze && consumeTelemetryDashboardRow() ? (
        <>
          <Text style={styles.subTitle}>{RUNTIME_GOVERNANCE_FREEZE_UI_JA.sectionTitle}</Text>
          <Text style={styles.muted}>{governanceFreeze.safetyBannerJa}</Text>
          <Row
            label={RUNTIME_GOVERNANCE_FREEZE_UI_JA.runtimeExpansionEntropy}
            value={String(governanceFreeze.profile.runtimeExpansionEntropy)}
          />
          <Row
            label={RUNTIME_GOVERNANCE_FREEZE_UI_JA.recursiveLayerProliferationRisk}
            value={String(governanceFreeze.profile.recursiveLayerProliferationRisk)}
          />
          <Row
            label={RUNTIME_GOVERNANCE_FREEZE_UI_JA.stackMaintainabilityIndex}
            value={String(governanceFreeze.profile.stackMaintainabilityIndex)}
          />
          <Row
            label={RUNTIME_GOVERNANCE_FREEZE_UI_JA.architectureConvergencePressure}
            value={String(governanceFreeze.profile.architectureConvergencePressure)}
          />
          <Row
            label={RUNTIME_GOVERNANCE_FREEZE_UI_JA.expansionFreezeConfidence}
            value={String(governanceFreeze.profile.expansionFreezeConfidence)}
          />
          <Row
            label={RUNTIME_GOVERNANCE_FREEZE_UI_JA.governanceLockRecommendation}
            value={String(governanceFreeze.profile.governanceLockRecommendation)}
          />
          <Row
            label={RUNTIME_GOVERNANCE_FREEZE_UI_JA.stackFinalizationReadiness}
            value={String(governanceFreeze.profile.stackFinalizationReadiness)}
          />
          <Row
            label={RUNTIME_GOVERNANCE_FREEZE_UI_JA.architectureClosureIntegrity}
            value={String(governanceFreeze.profile.architectureClosureIntegrity)}
          />
          <Text style={styles.label}>governance freeze readiness monitor</Text>
          <Text style={styles.muted}>
            {governanceFreeze.governanceFreezeReadinessMonitor.map((m) => `${m.label}:${m.value.toFixed(2)}`).join(' | ')}
          </Text>
          <Text style={styles.label}>runtime operational pressure heatmap</Text>
          <Text style={styles.muted}>
            {governanceFreeze.runtimeOperationalPressureHeatmap.map((h) => `${h.layer}:${h.pressure.toFixed(2)}`).join(' | ')}
          </Text>
          <Text style={styles.label}>stack saturation dashboard</Text>
          <Text style={styles.muted}>
            {governanceFreeze.stackSaturationDashboard.map((m) => `${m.label}:${m.value.toFixed(2)}`).join(' | ')}
          </Text>
        </>
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export const RuntimeCivilizationArchivePanels = memo(RuntimeCivilizationArchivePanelsInner);

const styles = StyleSheet.create({
  subTitle: { fontWeight: '600', fontSize: 13, color: theme.colors.text, marginTop: 10 },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  label: { fontSize: 12, color: theme.colors.textMuted, flex: 1 },
  value: { fontSize: 12, color: theme.colors.text, flex: 1, textAlign: 'right' },
});
