/**
 * Constants contract for runtime stress harness (no RN imports).
 */
import { RUNTIME_LONG_SESSION_STRESS_VERSION } from '../constants/runtimeLongSessionStress';
import { STRESS_SCENARIO_IDS } from '../types/runtimeLongSessionStress';

if (STRESS_SCENARIO_IDS.length !== 20) {
  throw new Error(`expected 20 stress scenarios, got ${STRESS_SCENARIO_IDS.length}`);
}
console.log(`runtimeLongSessionStress.verify: OK (v${RUNTIME_LONG_SESSION_STRESS_VERSION}, ${STRESS_SCENARIO_IDS.length} scenarios)`);
console.log('Run full suite: npm run verify:runtime-stress');
