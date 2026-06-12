/**
 * Phase12.5 runtime mode — dev (Metro) vs apk (standalone preview APK).
 * Step 3: design + minimal resolver for invalid-detector flags.
 */
export const PHASE12_5_RUNTIME_MODES = ['dev', 'apk'];

/**
 * @param {Record<string, string|undefined>|NodeJS.ProcessEnv} [env]
 * @param {boolean} [checkWatch]
 * @param {boolean} [checkMetro]
 * @param {boolean} [checkBundle]
 * @param {boolean} [checkPid]
 * @param {string} [runtimeMode]
 * @returns {'dev'|'apk'}
 */
export function resolvePhase125RuntimeMode(env = process.env) {
  const raw = String(env.PHASE12_5_RUNTIME_MODE ?? 'dev')
    .trim()
    .toLowerCase();
  if (raw === 'apk') return 'apk';
  return 'dev';
}

/**
 * Invalid detector configuration per runtime mode.
 * @param {'dev'|'apk'} [mode]
 */
export function getInvalidDetectorConfig(mode = 'dev') {
  if (mode === 'apk') {
    return {
      mode: 'apk',
      checkMetro: false,
      checkBundle: true,
      bundleErrorSeverity: 'warn',
      checkPid: true,
      checkWatch: true,
      primarySignals: [
        'app_pid_changed',
        'app_pid_lost',
        'watch_dead',
        'heartbeat_stall',
        'price_update_stall',
        'fatal_crash',
        'anr',
      ],
    };
  }
  return {
    mode: 'dev',
    checkMetro: true,
    checkBundle: true,
    bundleErrorSeverity: 'invalid',
    checkPid: true,
    checkWatch: true,
    primarySignals: [
      'metro_down',
      'bundle_error',
      'app_pid_changed',
      'app_pid_lost',
      'watch_dead',
      'heartbeat_stall',
      'price_update_stall',
      'fatal_crash',
      'anr',
    ],
  };
}

/**
 * Merge explicit overrides with mode defaults.
 * @param {{ runtimeMode?: string, checkMetro?: boolean, checkBundle?: boolean, checkPid?: boolean, checkWatch?: boolean }} input
 */
export function resolveInvalidDetectorFlags(input = {}) {
  const mode = resolvePhase125RuntimeMode(
    input.runtimeMode != null ? { PHASE12_5_RUNTIME_MODE: input.runtimeMode } : process.env,
  );
  const defaults = getInvalidDetectorConfig(mode);
  return {
    runtimeMode: mode,
    checkMetro: input.checkMetro ?? defaults.checkMetro,
    checkBundle: input.checkBundle ?? defaults.checkBundle,
    checkPid: input.checkPid ?? defaults.checkPid,
    checkWatch: input.checkWatch ?? defaults.checkWatch,
    bundleErrorSeverity: defaults.bundleErrorSeverity,
    primarySignals: defaults.primarySignals,
  };
}
