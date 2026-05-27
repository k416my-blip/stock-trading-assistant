# Runtime Practical Reduction & Production Slimming

## Production Slimming Strategy

This phase keeps `runtime-freeze-v1` intact while preparing the frozen Runtime Civilization Stack for production operations. It performs registry segmentation, verify tier separation, production-facing scenario slimming, and tooling split. It does not rewrite runtime logic, recommendation logic, execution logic, AI reasoning, trading logic, or policy semantics.

## Operational Runtime Boundaries

Production-facing registries are separated from frozen archival inventories:

- production soak scenarios remain the core runtime survival scenarios
- optional soak scenarios are available through lazy/deferred execution policy
- archived soak scenarios are moved to cold-storage inventory metadata
- full frozen scenario registry remains intact for traceability

Scenario implementation modules remain dynamically imported by the soak rotator. No scenario is deleted.

## Archive Governance

Archive governance is metadata-only unless a human performs a later archival move. The cold-storage inventory records why archived scenarios are no longer production-facing and how they can be run manually or in scheduled diagnostics.

Archive planning forbids forced deletion, automatic cleanup, scenario removal execution, and runtime behavior mutation.

## Verify Tier Policy

Verify tiers:

- `verify:critical`: runtime-light, diagnostics, security
- `verify:standard`: stabilization, economics, operational-core, production-slimming tooling
- `verify:extended`: soak runner, native telemetry, telemetry overhead
- `verify:nightly`: runtime-full, release, full audit
- archive tier: frozen high-expansion runtime verifies retained for manual/full validation

`verify:runtime-light` is now critical + standard registry validation only. Full runtime stack coverage remains available through `verify:runtime-full` and `verify:nightly`.

## Runtime-Light Philosophy

Runtime-light should remain a fast production readiness check. It verifies:

- production and optional scenario segmentation
- archived scenario cold-storage inventory
- critical + standard verify scripts
- deferred registry hydration metadata
- freeze tooling entrypoints

It intentionally excludes archived/experimental scenario execution and full runtime stack verification.

## Dashboard Slimming

Dashboard slimming is prepared through registry segmentation:

- executive dashboard candidates
- engineering dashboard candidates
- archive dashboard candidates
- observability debug panels

This phase does not mutate dashboard runtime behavior. Heavy panels and debug analytics are classified for lazy/collapsed operation in a future UI-specific change.

## Tooling Split

Freeze tooling is separated under tooling/freeze namespaces:

- stabilization optimization reports
- observability economics reports
- operational core extraction reports
- production slimming reports
- archive inventories

These tools stay outside native runtime execution.

## Long-Term Maintainability Policy

Operational slimming metrics:

- `runtimeWeightReduction`
- `registryCompressionGain`
- `verifyExecutionReduction`
- `dashboardRenderReduction`
- `observabilityCostReduction`
- `dependencyLoadReduction`
- `operationalSimplicityGain`

These are production preparation metrics. They quantify expected reduction and do not mutate runtime behavior.

## Prohibitions

Forbidden:

- runtime logic rewrite
- recommendation mutation
- execution mutation
- AI reasoning changes
- trading logic changes
- policy semantic changes
- semantic expansion
- ontology expansion
- civilization expansion
- scenario deletion
- verify removal
- automatic cleanup
