import { AUTOMATED_SOAK_RUNNER_VERSION } from '../constants/automatedSoakRunner';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../types/automatedSoakRunner';

if (AUTOMATED_SOAK_SCENARIO_IDS.length !== 10) {
  throw new Error(`expected 10 soak scenarios, got ${AUTOMATED_SOAK_SCENARIO_IDS.length}`);
}
console.log(`automatedSoakRunner.verify: OK (v${AUTOMATED_SOAK_RUNNER_VERSION}, ${AUTOMATED_SOAK_SCENARIO_IDS.length} scenarios)`);
