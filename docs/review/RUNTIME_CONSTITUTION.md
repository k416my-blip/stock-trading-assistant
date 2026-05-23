# Runtime Constitutional Coordination Layer

Version: `1.0.0` · Constraints: `realTradingEnabled=false`, no strategy mutation, no governance bypass.

## Purpose

Prevent layer-local optimization conflicts, maintain system-wide equilibrium, and arbitrate governance / recovery / exploration / async / observability / survival pressures.

## Constitutional states

`BALANCED` · `TENSION` · `POLARIZED` · `UNSTABLE` · `CONSTITUTIONAL_CRISIS`

## Integration order (stability tick)

1. Observability
2. Self-healing
3. Evolution
4. **Constitution (final arbitration)**

Directives from `getConstitutionalDirectives()` apply on the **next** tick to governance, self-healing, and evolution.

## Verification

```bash
npm run verify:constitution
```

## Redmi report

`buildRedmiNote13ProConstitutionReport(bundle)` — 90-day civilization survivability, equilibrium retention, collapse probability.
