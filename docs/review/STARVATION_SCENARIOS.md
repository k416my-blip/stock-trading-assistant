# Async Starvation Scenario Matrix

| Scenario | Detection | Kernel / Effect | Residual risk |
|----------|-----------|-----------------|---------------|
| High queue depth | `asyncQueueDepth ≥ 42` | `STABILITY_ASYNC_STARVATION_WARN` + `QUEUE_COMPACTION` | Coordinator still accepts tasks |
| Executor lag | `asyncQueueLatencyMs ≥ 280` | Same | Long tasks not preempted |
| Reconnect burst | `reconnect/min ≥ 4` | `STABILITY_RECONNECT_GUARD` | WS timers compete with async queue |
| Hydration overlap | `overlapCount ≥ 2` | `STABILITY_HYDRATION_ENFORCE` | `scheduleDelayedWebsocketRestore` not lock-aware |
| Memory cleanup race | cleanup during hydration | `MEMORY_PRESSURE_CLEANUP` 30s cooldown | cancelAsyncTasksByLabel may drop legit tasks |
| Unresolved promises | heuristic `queueDepth * 0.35` | Warning only | No hard cap on promises |
| MIUI resume | resume latency + queue spike | MIUI diagnostic + survival policy | Real device untested |

## Validation hooks

- `RuntimeAsyncQueueTracker.observeAsyncQueue`
- `isAsyncStarvation(queueThreshold, lagThresholdMs)`
- Unit: `tests/unit/runtimeStability/asyncStarvation.test.ts`

## Reconnect burst × starvation

When reconnect storm fires, multiple `scheduleDedupedTimer` callbacks queue behind hydration and telemetry. Mitigation: budget block + defer phases recorded in `reconnectSequenceTrace` before execute.
