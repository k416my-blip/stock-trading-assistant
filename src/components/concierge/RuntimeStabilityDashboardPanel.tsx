import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STABILITY_UI_LABELS_JA } from '../../constants/runtimeStability';
import { selectRuntimeStabilitySnapshot } from '../../runtime/stability/runtimeStabilitySelectors';
import { buildNativeBoundaryValidationReport } from '../../native/runtime/nativeBoundaryValidation';
import { buildRedmiLongSoakDashboardReport, isRedmiLongSoakActive } from '../../native/runtime/redmiLongSoakValidation';
import { getLastMetabolismBundle } from '../../runtime/metabolism/runtimeMetabolismIntegration';
import { getLastCuriosityBundle } from '../../runtime/curiosity/runtimeCuriosityIntegration';
import { getLastUnifiedOrchestratorBundle, shouldAllowUnifiedDashboardUpdate } from '../../runtime/unified/runtimeUnifiedOrchestratorIntegration';
import { getLastLongevityBundle } from '../../runtime/longevity/runtimeLongevityIntegration';
import { getNativeDeviceTelemetryDashboard } from '../../native/telemetry';
import { NATIVE_TELEMETRY_UI_LABELS_JA } from '../../constants/nativeDeviceTelemetry';
import { getAutomatedSoakDashboard } from '../../native/soak';
import { SOAK_UI_LABELS_JA, AUTOMATED_SOAK_SCENARIO_LABELS_JA } from '../../constants/automatedSoakRunner';
import { getTelemetryOverheadDashboard, beginTelemetryDashboardRender, consumeTelemetryDashboardRow } from '../../native/telemetry/overhead';
import { TELEMETRY_OVERHEAD_UI_JA } from '../../constants/telemetryOverhead';
import { getJsThreadStabilizationDashboard } from '../../scheduler/jsThreadStabilization';
import { JS_STABILIZATION_UI_JA } from '../../constants/jsThreadSchedulerStabilization';
import { getRnBridgeSurvivabilityDashboard } from '../../rn/bridgeSurvivability';
import { RN_SURVIVABILITY_UI_JA } from '../../constants/rnBridgeSurvivability';
import { getFailureRecoveryDashboard } from '../../recovery/failureRecovery';
import { FAILURE_RECOVERY_UI_JA } from '../../constants/failureRecoveryOrchestrator';
import { theme } from '../../theme';

function RuntimeStabilityDashboardPanelInner() {
  const snap = selectRuntimeStabilitySnapshot();
  if (!snap) {
    return (
      <View style={styles.wrap} testID="runtime-stability-dashboard-panel">
        <Text style={styles.title}>{STABILITY_UI_LABELS_JA.panelTitle}</Text>
        <Text style={styles.hint}>{STABILITY_UI_LABELS_JA.readonlyHint}</Text>
        <Text style={styles.muted}>観測待ち</Text>
      </View>
    );
  }

  const m = snap.metrics;
  const boundary = buildNativeBoundaryValidationReport();
  const soak = isRedmiLongSoakActive() ? buildRedmiLongSoakDashboardReport() : null;
  const metabolism = getLastMetabolismBundle()?.dashboard;
  const curiosity = getLastCuriosityBundle()?.dashboard;
  const unified = getLastUnifiedOrchestratorBundle()?.dashboard;
  const longevity = getLastLongevityBundle()?.dashboard;
  const nativeTelemetry = getNativeDeviceTelemetryDashboard();
  const soakRunner = getAutomatedSoakDashboard();
  const telemetryOverhead = getTelemetryOverheadDashboard();
  const jsStabilization = getJsThreadStabilizationDashboard();
  const rnBridge = getRnBridgeSurvivabilityDashboard();
  const selfHealing = getFailureRecoveryDashboard();
  beginTelemetryDashboardRender();
  const showHeavyDashboard = shouldAllowUnifiedDashboardUpdate();
  return (
    <View style={styles.wrap} testID="runtime-stability-dashboard-panel">
      <Text style={styles.title}>{STABILITY_UI_LABELS_JA.panelTitle}</Text>
      <Text style={styles.hint}>{STABILITY_UI_LABELS_JA.readonlyHint}</Text>
      <Row label={STABILITY_UI_LABELS_JA.healthScore} value={`${snap.healthScore} (${snap.healthLabelJa})`} />
      <Row label={STABILITY_UI_LABELS_JA.reconnectCount} value={`${m.reconnectPerMin}/min · dup ${m.wsDuplicateCount}`} />
      <Row
        label={STABILITY_UI_LABELS_JA.hydrationState}
        value={snap.hydrationLockActive ? `LOCK · overlap ${m.hydrationOverlapCount}` : 'idle'}
      />
      <Row
        label={STABILITY_UI_LABELS_JA.asyncPressure}
        value={`queue ${m.queuedTaskCount} · lag ${m.asyncQueueLagMs}ms`}
      />
      <Row label={STABILITY_UI_LABELS_JA.thermalPressure} value={m.thermalLevel} />
      <Row label={STABILITY_UI_LABELS_JA.websocketStatus} value={snap.websocketStatusJa} />
      <Row label={STABILITY_UI_LABELS_JA.heartbeatAge} value={`${m.heartbeatAgeMs}ms`} />
      <Row
        label="Native boundary"
        value={
          boundary.bypassDetected
            ? `BYPASS · ${boundary.bypassDetailJa}`
            : `ok · js ${boundary.comparison.jsScheduleCount}/${boundary.comparison.jsExecuteCount}`
        }
      />
      {soak ? (
        <>
          <Row
            label="Redmi soak"
            value={`${soak.elapsedHours.toFixed(1)}h/${soak.targetHours}h · ${soak.soakProgressPct}%`}
          />
          <Row
            label="Soak failures"
            value={`${soak.failuresCount} · scenarios ${soak.scenariosCount}/14`}
          />
        </>
      ) : null}
      {snap.anomalies.length > 0 ? (
        <Text style={styles.anomaly}>
          {STABILITY_UI_LABELS_JA.anomalies}: {snap.anomalies.map((a) => a.summaryJa).join(' · ')}
        </Text>
      ) : null}
      {selfHealing && consumeTelemetryDashboardRow() ? (
        <>
          <Text style={styles.subTitle}>{FAILURE_RECOVERY_UI_JA.sectionTitle}</Text>
          <Text style={styles.muted}>{selfHealing.safetyBannerJa}</Text>
          <Row
            label={FAILURE_RECOVERY_UI_JA.degradationState}
            value={selfHealing.profile.degradationState}
          />
          <Row
            label={FAILURE_RECOVERY_UI_JA.recoverySuccess}
            value={String(selfHealing.profile.recoverySuccessRate)}
          />
          <Row
            label={FAILURE_RECOVERY_UI_JA.continuousScore}
            value={`${selfHealing.profile.continuousRecoveryScore}/100`}
          />
          <Row
            label={FAILURE_RECOVERY_UI_JA.bridgeRecovery}
            value={String(selfHealing.profile.bridgeRecoveryCount)}
          />
          <Row
            label={FAILURE_RECOVERY_UI_JA.freezeRecovery}
            value={`${selfHealing.profile.freezeRecoveryLatency}ms`}
          />
          <Row
            label={FAILURE_RECOVERY_UI_JA.thermalRecovery}
            value={`${selfHealing.profile.thermalRecoveryTime}ms`}
          />
          <Row
            label={FAILURE_RECOVERY_UI_JA.websocketRecovery}
            value={String(selfHealing.profile.websocketRecoveryRate)}
          />
          <Row
            label={FAILURE_RECOVERY_UI_JA.quarantine}
            value={`${selfHealing.profile.runtimeQuarantineDuration}ms`}
          />
          {selfHealing.timelineRecent.length > 0 ? (
            <Text style={styles.muted}>
              {FAILURE_RECOVERY_UI_JA.timeline}:{' '}
              {selfHealing.timelineRecent
                .map((e) => `${e.flow}→${e.to}`)
                .join(' · ')}
            </Text>
          ) : null}
        </>
      ) : null}
      {rnBridge && consumeTelemetryDashboardRow() ? (
        <>
          <Text style={styles.subTitle}>{RN_SURVIVABILITY_UI_JA.sectionTitle}</Text>
          <Text style={styles.muted}>{rnBridge.safetyBannerJa}</Text>
          <Row label={RN_SURVIVABILITY_UI_JA.survival} value={`${rnBridge.profile.survivalScore}/100`} />
          <Row label={RN_SURVIVABILITY_UI_JA.bridgeTraffic} value={`${rnBridge.profile.bridgeTrafficRate}/s`} />
          <Row label={RN_SURVIVABILITY_UI_JA.renderStorm} value={String(rnBridge.profile.renderStormRisk)} />
          <Row label={RN_SURVIVABILITY_UI_JA.listenerLeak} value={String(rnBridge.profile.listenerLeakRisk)} />
          <Row label="rerender/min" value={String(rnBridge.profile.rerenderPerMinute)} />
          <Row label="immutable reuse" value={String(rnBridge.profile.immutableReuseRatio)} />
          <Row label="mode" value={rnBridge.profile.mode} />
        </>
      ) : null}
      {jsStabilization && consumeTelemetryDashboardRow() ? (
        <>
          <Text style={styles.subTitle}>{JS_STABILIZATION_UI_JA.sectionTitle}</Text>
          <Text style={styles.muted}>{jsStabilization.safetyBannerJa}</Text>
          <Row label={JS_STABILIZATION_UI_JA.survival} value={`${jsStabilization.profile.survivalScore}/100`} />
          <Row label={JS_STABILIZATION_UI_JA.eventLoopLag} value={`${jsStabilization.profile.eventLoopLagMs}ms`} />
          <Row label={JS_STABILIZATION_UI_JA.schedulerDrift} value={`${jsStabilization.profile.schedulerDriftMs}ms`} />
          <Row label={JS_STABILIZATION_UI_JA.gcSpike} value={`${jsStabilization.profile.gcSpikeMs}ms`} />
          <Row label={JS_STABILIZATION_UI_JA.framePressure} value={String(jsStabilization.profile.jsFramePressure)} />
          <Row label="mode" value={jsStabilization.profile.mode} />
          <Row label="timer skew" value={`${jsStabilization.profile.timerSkew}ms`} />
          <Row label="yield count" value={String(jsStabilization.profile.cooperativeYieldCount)} />
        </>
      ) : null}
      {telemetryOverhead && consumeTelemetryDashboardRow() ? (
        <>
          <Text style={styles.subTitle}>{TELEMETRY_OVERHEAD_UI_JA.sectionTitle}</Text>
          <Text style={styles.muted}>{telemetryOverhead.safetyBannerJa}</Text>
          <Row label={TELEMETRY_OVERHEAD_UI_JA.mode} value={telemetryOverhead.profile.mode} />
          <Row label={TELEMETRY_OVERHEAD_UI_JA.cpuCost} value={`${telemetryOverhead.profile.telemetryCpuCost}ms`} />
          <Row label={TELEMETRY_OVERHEAD_UI_JA.memoryCost} value={`${telemetryOverhead.profile.telemetryMemoryCost}KB`} />
          <Row label={TELEMETRY_OVERHEAD_UI_JA.dashboardCost} value={`${telemetryOverhead.profile.dashboardRenderCost}%`} />
          <Row label={TELEMETRY_OVERHEAD_UI_JA.writeRate} value={`${telemetryOverhead.profile.snapshotWriteRate}/s`} />
          <Row label={TELEMETRY_OVERHEAD_UI_JA.storagePressure} value={String(telemetryOverhead.profile.asyncStoragePressure)} />
          <Row label={TELEMETRY_OVERHEAD_UI_JA.compression} value={String(telemetryOverhead.profile.compressionRatio)} />
          <Row label="ring buffer" value={`${telemetryOverhead.ringBufferFillPct}%`} />
          {telemetryOverhead.exportPaused ? (
            <Text style={styles.muted}>export paused (thermal)</Text>
          ) : null}
        </>
      ) : null}
      {soakRunner && consumeTelemetryDashboardRow() ? (
        <>
          <Text style={styles.subTitle}>{SOAK_UI_LABELS_JA.sectionTitle}</Text>
          <Text style={styles.muted}>{soakRunner.safetyBannerJa}</Text>
          <Row
            label={SOAK_UI_LABELS_JA.survival}
            value={`${soakRunner.survivalScore}/100 · ${soakRunner.elapsedHours.toFixed(1)}h/${soakRunner.targetHours}h`}
          />
          <Row label={SOAK_UI_LABELS_JA.scheduling} value={soakRunner.schedulingMode} />
          <Row
            label={SOAK_UI_LABELS_JA.scenario}
            value={
              soakRunner.currentScenario
                ? AUTOMATED_SOAK_SCENARIO_LABELS_JA[soakRunner.currentScenario] ?? soakRunner.currentScenario
                : '—'
            }
          />
          <Row label={SOAK_UI_LABELS_JA.recovery} value={`${soakRunner.measurements.averageRecoveryMs}ms`} />
          <Row label={SOAK_UI_LABELS_JA.freeze} value={`${soakRunner.measurements.freezeDurationMsTotal}ms`} />
          <Row label={SOAK_UI_LABELS_JA.memoryDrift} value={`${soakRunner.measurements.memoryDriftPerHourMb} MB`} />
          <Row label={SOAK_UI_LABELS_JA.replayDrift} value={String(soakRunner.measurements.replayDriftPerHour)} />
          <Row label="memory graph" value={soakRunner.graphs.memoryDriftSparkline} />
          <Row label="replay graph" value={soakRunner.graphs.replayGrowthSparkline} />
          <Row label="thermal graph" value={soakRunner.graphs.thermalSparkline} />
          <Row label="ws reconnect graph" value={soakRunner.graphs.wsReconnectSparkline} />
          {soakRunner.recoveryRecent.length > 0 ? (
            <Text style={styles.muted}>
              recovery: {soakRunner.recoveryRecent.map((r) => `${r.kind} ${r.durationMs}ms`).join(' · ')}
            </Text>
          ) : null}
          {soakRunner.freezeRecent.length > 0 ? (
            <Text style={styles.anomaly}>
              freeze: {soakRunner.freezeRecent.map((f) => `${f.durationMs}ms`).join(' · ')}
            </Text>
          ) : null}
        </>
      ) : null}
      {nativeTelemetry ? (
        <>
          <Text style={styles.subTitle}>{NATIVE_TELEMETRY_UI_LABELS_JA.sectionTitle}</Text>
          <Text style={styles.muted}>{nativeTelemetry.safetyBannerJa}</Text>
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.samplingMode} value={nativeTelemetry.snapshot.samplingMode} />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.jsHeap} value={`${nativeTelemetry.snapshot.jsHeapMb} MB`} />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.nativeHeap} value={`${nativeTelemetry.snapshot.nativeHeapMb} MB`} />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.gcPerSec} value={String(nativeTelemetry.snapshot.hermesGcPerSec)} />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.jsStall} value={`${nativeTelemetry.snapshot.jsThreadStallMs}ms`} />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.droppedFrames} value={String(nativeTelemetry.snapshot.droppedFrames)} />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.tickAvg} value={`${nativeTelemetry.snapshot.averageTickMs}ms`} />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.tickMax} value={`${nativeTelemetry.snapshot.maxTickMs}ms`} />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.replayGrowth} value={String(nativeTelemetry.snapshot.replayGrowthPerMin)} />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.renderPerSec} value={String(nativeTelemetry.snapshot.renderCountPerSec)} />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.wsReconnect} value={String(nativeTelemetry.snapshot.websocketReconnectCount)} />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.asyncDepth} value={String(nativeTelemetry.snapshot.asyncQueueDepth)} />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.batteryDelta} value={`${nativeTelemetry.snapshot.batteryDeltaPerHourPct}%/h`} />
          <Row
            label={NATIVE_TELEMETRY_UI_LABELS_JA.thermalDuration}
            value={`${nativeTelemetry.snapshot.thermalStateDurationSec}s · ${nativeTelemetry.snapshot.thermalState.thermalStatus}`}
          />
          <Row label={NATIVE_TELEMETRY_UI_LABELS_JA.bridgePressure} value={String(nativeTelemetry.snapshot.bridgeQueuePressure)} />
          {nativeTelemetry.snapshot.dashboardRender.samplingThrottled ? (
            <Text style={styles.muted}>dashboard profiler throttled (bg/thermal)</Text>
          ) : null}
        </>
      ) : null}
      {unified ? (
        <>
          <Text style={styles.subTitle}>Unified Runtime Orchestrator</Text>
          <Row label="orchestratorState" value={unified.orchestratorState} />
          <Row label="currentTickPhase" value={unified.currentTickPhase} />
          <Row label="runtimePressure" value={String(unified.runtimePressure)} />
          <Row label="thermalAuthority" value={unified.thermalAuthority} />
          <Row label="replayQueue" value={String(unified.replayQueue)} />
          <Row label="asyncPressure" value={String(unified.asyncPressure)} />
          <Row label="layerBudgetUsage" value={String(unified.layerBudgetUsage)} />
          <Row label="deterministicHealth" value={`${unified.deterministicHealth}/100`} />
          <Row label="cascadeRisk" value={String(unified.cascadeRisk)} />
          <Row label="safeMode" value={unified.safeMode ? 'on' : 'off'} />
          <Row label="emergencyBrake" value={unified.emergencyBrake ? 'on' : 'off'} />
          <Row label="governanceLock" value={unified.governanceLock ? 'locked' : 'off'} />
          <Row label="snapshotLatency" value={`${unified.snapshotLatency}ms`} />
          <Row label="tickDrift" value={`${unified.tickDrift}ms`} />
          <Row label="replayRaceRisk" value={String(unified.replayRaceRisk)} />
          <Row label="deadlockRisk" value={String(unified.deadlockRisk)} />
          {!showHeavyDashboard ? (
            <Text style={styles.muted}>dashboard throttled (async starvation / safe mode)</Text>
          ) : null}
        </>
      ) : null}
      {metabolism && showHeavyDashboard ? (
        <>
          <Text style={styles.subTitle}>Runtime Metabolism</Text>
          <Row label="metabolicHealth" value={`${metabolism.metabolicHealth}/100`} />
          <Row label="memoryNutritionScore" value={String(metabolism.memoryNutritionScore)} />
          <Row label="obsoleteReplayCount" value={String(metabolism.obsoleteReplayCount)} />
          <Row label="staleEdgeCount" value={String(metabolism.staleEdgeCount)} />
          <Row label="buriedGraphNodes" value={String(metabolism.buriedGraphNodes)} />
          <Row label="replayCemeterySize" value={String(metabolism.replayCemeterySize)} />
          <Row label="entropyDetoxScore" value={String(metabolism.entropyDetoxScore)} />
          <Row label="fossilizedRollbackRisk" value={String(metabolism.fossilizedRollbackRisk)} />
          <Row label="selfHealingAddictionRisk" value={String(metabolism.selfHealingAddictionRisk)} />
          <Row label="runtimeCalorieUsed" value={String(metabolism.runtimeCalorieUsed)} />
          <Row label="heapEcologyScore" value={String(metabolism.heapEcologyScore)} />
          <Row label="toxicMemoryCount" value={String(metabolism.toxicMemoryCount)} />
          <Row label="lastGcAt" value={metabolism.lastGcAt ?? '—'} />
          <Row label="nextGcReason" value={metabolism.nextGcReason} />
          <Row label="gcMode" value={metabolism.gcMode} />
        </>
      ) : null}
      {curiosity && showHeavyDashboard ? (
        <>
          <Text style={styles.subTitle}>Runtime Curiosity</Text>
          <Row label="curiosityHealth" value={`${curiosity.curiosityHealth}/100`} />
          <Row label="noveltyPressure" value={String(curiosity.noveltyPressure)} />
          <Row label="replayMonocultureRisk" value={String(curiosity.replayMonocultureRisk)} />
          <Row label="rollbackAddictionRisk" value={String(curiosity.rollbackAddictionRisk)} />
          <Row label="minorityEdgeCount" value={String(curiosity.minorityEdgeCount)} />
          <Row label="dormantRevivalCount" value={String(curiosity.dormantRevivalCount)} />
          <Row label="explorationBudget" value={String(curiosity.explorationBudget)} />
          <Row label="mutationSandboxCount" value={String(curiosity.mutationSandboxCount)} />
          <Row label="consensusBiasRisk" value={String(curiosity.consensusBiasRisk)} />
          <Row label="innovationScore" value={String(curiosity.innovationScore)} />
          <Row label="diversityRetention" value={String(curiosity.diversityRetention)} />
          <Row label="fossilizationRisk" value={String(curiosity.fossilizationRisk)} />
          <Row label="entropyBalance" value={String(curiosity.entropyBalance)} />
          <Row label="curiosityCooldown" value={curiosity.curiosityCooldown ? 'active' : 'off'} />
          <Row label="sandboxFailureRate" value={String(curiosity.sandboxFailureRate)} />
          <Row label="syntheticScenarioCount" value={String(curiosity.syntheticScenarioCount)} />
          <Row label="curiosityMode" value={curiosity.curiosityMode} />
        </>
      ) : null}
      {longevity && showHeavyDashboard ? (
        <>
          <Text style={styles.subTitle}>Runtime Longevity</Text>
          <Row label="entropyHealth" value={`${longevity.entropyHealth}/100`} />
          <Row label="replayCivilizationRisk" value={String(longevity.replayCivilizationRisk)} />
          <Row label="fossilizationRisk" value={String(longevity.fossilizationRisk)} />
          <Row label="curiosityFatigue" value={String(longevity.curiosityFatigue)} />
          <Row label="heapEcology" value={String(longevity.heapEcology)} />
          <Row label="entropyPulse" value={longevity.entropyPulse ? 'on' : 'off'} />
          <Row label="deterministicDrift" value={String(longevity.deterministicDrift)} />
          <Row label="mutationDiversity" value={String(longevity.mutationDiversity)} />
          <Row label="replayEcology" value={String(longevity.replayEcology)} />
          <Row label="runtimeImmunity" value={String(longevity.runtimeImmunity)} />
          <Row label="zombieCacheRatio" value={String(longevity.zombieCacheRatio)} />
          <Row label="cognitivePlaque" value={String(longevity.cognitivePlaque)} />
          <Row label="thermalAging" value={String(longevity.thermalAging)} />
          <Row label="longTermSurvival" value={String(longevity.longTermSurvival)} />
          <Row label="entropySafeZone" value={longevity.entropySafeZone ? 'in zone' : 'out'} />
          <Row label="ecologyPressure" value={String(longevity.ecologyPressure)} />
          <Row label="longevityState" value={longevity.longevityState} />
          <Row label="longevityMode" value={longevity.longevityMode} />
        </>
      ) : null}
    </View>
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

export const RuntimeStabilityDashboardPanel = memo(RuntimeStabilityDashboardPanelInner);

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    gap: 4,
  },
  title: { fontWeight: '600', fontSize: 14, color: theme.colors.text },
  subTitle: { fontWeight: '600', fontSize: 13, color: theme.colors.text, marginTop: 10 },
  hint: { fontSize: 11, color: theme.colors.textMuted },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  label: { fontSize: 12, color: theme.colors.textMuted, flex: 1 },
  value: { fontSize: 12, color: theme.colors.text, flex: 1, textAlign: 'right' },
  anomaly: { fontSize: 11, color: theme.colors.warning, marginTop: 4 },
});
