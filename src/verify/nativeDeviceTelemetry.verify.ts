import { NATIVE_DEVICE_TELEMETRY_VERSION } from '../constants/nativeDeviceTelemetry';

if (!NATIVE_DEVICE_TELEMETRY_VERSION) {
  throw new Error('native device telemetry version missing');
}
console.log(`nativeDeviceTelemetry.verify: OK (v${NATIVE_DEVICE_TELEMETRY_VERSION})`);
console.log('Full tests: npm run verify:native-telemetry');
