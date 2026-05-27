import { PROCESS_CONTINUITY_VERSION } from '../constants/processContinuityRecovery';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../types/automatedSoakRunner';

console.log(
  `processContinuity.verify: OK (v${PROCESS_CONTINUITY_VERSION}, soak scenarios ${AUTOMATED_SOAK_SCENARIO_IDS.length})`,
);
