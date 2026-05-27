# Runtime Market Data Stabilization

Freeze tag: `runtime-freeze-v1`

This phase improves market data reliability without changing recommendation, execution, AI reasoning, trading logic, policy semantics, runtime orchestration, providers, reducers, or state machines.

## Market Data Reliability Audit

Audited paths:

- `src/services/marketDataService.ts`
- `src/services/portfolioPriceUpdate.ts`
- `src/services/portfolioRefreshCoordinator.ts`
- `src/services/quoteCache.ts`

Observed risk classes:

- duplicated same-key requests while an older request is already in flight
- stale cache overwrite when an older fetchedAt is persisted after a newer quote
- retry attempts on non-transient failures
- silent refresh pressure while battery saver/background/offline state is active
- limited request lifecycle observability

## Stale Protection

Implemented:

- invalid cache timestamp rejection
- older `fetchedAt` overwrite rejection
- stale queue result diagnostics
- refresh generation expiry guard before applying live quote success

No recommendation or trading semantics changed. The guards only prevent older/invalid market-data state from overwriting newer valid state.

## Retry Stabilization

Implemented:

- retries are now limited to transient failures: timeout, server error, rate limit, unknown
- non-transient failures such as invalid symbol, unsupported exchange, market closed, or API key errors stop retrying immediately
- retry waits are bounded by remaining portfolio refresh deadline
- retry scheduling is recorded in diagnostics

## Request Deduplication

Implemented:

- same-key pending requests share one queued group
- same-key in-flight requests now share the running response instead of canceling callers and starting a superseding duplicate
- queue removal now only removes the matching generation group, protecting newer queued groups from older completion cleanup

## Cache Stabilization

Implemented:

- invalid fetchedAt cache writes are rejected
- older cache writes are rejected when a newer cache row exists
- invalid cached timestamps are rejected on read
- reliability diagnostics count cache rejection and stale overwrite prevention

## Mobile Runtime Optimization

Implemented:

- background/offline refresh pause now records diagnostics
- silent refresh throttling records diagnostics
- battery saver silent refresh uses longer safe gap and debounce values

## Observability

Added `src/services/marketDataReliabilityDiagnostics.ts` with:

- request lifecycle report
- stale overwrite diagnostics
- retry pressure metrics
- hydration consistency metrics
- mobile refresh diagnostics

Metrics:

- `staleProtectionScore`
- `retryStabilityScore`
- `requestDeduplicationScore`
- `hydrationConsistencyScore`
- `mobileRuntimeReliabilityScore`
- `APIResilienceScore`

## Runtime Freeze Policy

Forbidden and unchanged:

- semantic expansion
- ontology expansion
- civilization stack expansion
- runtime architecture rewrite
- provider rewrite
- reducer rewrite
- execution logic mutation
- recommendation mutation
- AI reasoning mutation
- trading logic mutation
- policy semantic mutation

`runtime-freeze-v1` remains maintained.
