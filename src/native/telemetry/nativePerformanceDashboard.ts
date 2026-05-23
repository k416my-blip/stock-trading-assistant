import type {
  NativeDeviceTelemetryDashboard,
  NativeDeviceTelemetrySnapshot,
} from '../../types/nativeDeviceTelemetry';
import { NATIVE_TELEMETRY_UI_LABELS_JA } from '../../constants/nativeDeviceTelemetry';

export function buildNativePerformanceDashboard(
  snapshot: NativeDeviceTelemetrySnapshot,
): NativeDeviceTelemetryDashboard {
  return {
    titleJa: NATIVE_TELEMETRY_UI_LABELS_JA.sectionTitle,
    safetyBannerJa: NATIVE_TELEMETRY_UI_LABELS_JA.safety,
    snapshot,
    compact: snapshot.samplingMode !== 'full',
  };
}
