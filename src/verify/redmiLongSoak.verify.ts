/**
 * Validates Redmi long soak export shape (CI — no React Native imports).
 */
import { REDMI_SOAK_CRITICAL_CHECKS, REDMI_SOAK_VALIDATION_VERSION } from '../constants/redmiLongSoakValidation';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export function runRedmiLongSoakVerify(): void {
  assert(REDMI_SOAK_VALIDATION_VERSION.length > 0, 'version constant');
  assert(REDMI_SOAK_CRITICAL_CHECKS.length === 8, '8 critical checks A–H');
  console.log('redmiLongSoak.verify: OK (constants + shape contract)');
}

runRedmiLongSoakVerify();
