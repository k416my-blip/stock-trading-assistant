/** App cold-start mark (module load). Used for [APP PERF] startupMs. */
const STARTUP_MARK_MS = Date.now();

export function getStartupMs(): number {
  return Date.now() - STARTUP_MARK_MS;
}
