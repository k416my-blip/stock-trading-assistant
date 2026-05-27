# Runtime Telemetry Entropy Reduction & Signal Governance

## Entropy model

observe-only レイヤーが Civilization stack 自身の telemetry 肥大化を定量化します。

| Metric | 意味 |
|--------|------|
| `signalEntropyScore` | signal 多様性・重複・カスケードの合成エントロピー |
| `telemetryDuplicationRisk` | 同一 telemetry の重複蓄積リスク |
| `replayAmplificationRisk` | replay / soak hook による増幅 |
| `metricCascadeRisk` | async / snapshot / reconnect の連鎖 |
| `dashboardSaturationRisk` | dashboard 行数の飽和 |
| `exportPayloadRisk` | export 推定バイトの飽和 |
| `timelineFragmentationRisk` | timeline イベントの断片化 |

## Signal lifecycle

1. **observe** — runtime metrics + telemetry overhead から入力合成  
2. **score** — 7 系 entropy metric + aging metric  
3. **govern** — dedup / compression / replay throttling / export aggregation **suggestion のみ記録**  
4. **visualize** — heatmap / duplication graph / replay timeline / saturation radar / export histogram  
5. **export** — 5 レポートセクション + governance suggestions  

禁止: block, export cancel, runtime throttle, auto cleanup, mutation.

## Telemetry aging (120min+)

| Metric | 意味 |
|--------|------|
| `staleTelemetryRatio` | 長時間セッションでの stale 比率 |
| `orphanMetricCount` | 参照元の薄い orphan metric 推定 |
| `zombieReplayHookCount` | 活性 replay hook の残存推定 |
| `unusedExportChainCount` | 低圧縮・大 payload export chain 推定 |

## Replay amplification analysis

- `replayAmplificationTimeline` — 時系列レベル記録（observe-only）  
- `replayAmplificationReport` export セクション  
- soak replay: burst / duplication / export storm  

## Export saturation analysis

- `exportPayloadHistogram` — バケット別推定  
- `exportPayloadAnalysis` export セクション  
- `dashboardSaturationAnalysis` — radar 軸（rows / samples / render / async）  

## Dashboard

`RuntimeStabilityDashboardPanel` に entropy セクション + Collapse Radar 要約。

## Soak

**Scenario ID:** `runtime_telemetry_entropy`

Replay hooks（checkpoint のみ）:

- recursive signal duplication  
- export storm  
- replay amplification burst  
- dashboard saturation flood  
- telemetry orphan accumulation  
- timeline fragmentation  
- stale metric persistence  
- compression failure cascade  

## Exports

- `buildRuntimeTelemetryEntropyExportBundle()`  
- `formatRuntimeTelemetryEntropyExportJson()`  

Sections: telemetry entropy, replay amplification, signal duplication topology, export payload analysis, dashboard saturation analysis.

## observe-only 保証

- signal block / export cancellation / runtime throttling / auto cleanup / state mutation **なし**  
- governance は `SignalGovernanceSuggestion` として telemetry/timeline に **記録のみ**  

## runtime 非干渉保証

- `nativeRuntimeIntegration.observeNativeDeviceTelemetryFromMetrics` は throttle 付き観測のみ  
- recommendation / 売買 execution / AI reasoning / policy semantics **未変更**  

## Verify

```bash
npm run typecheck
npm run verify:runtime-telemetry-entropy
npm run verify:soak-runner
npm run verify:all-runtime-stacks
```
