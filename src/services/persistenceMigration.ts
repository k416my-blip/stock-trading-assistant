import type { AppState } from '../types';
import {
  APP_STATE_PERSISTENCE_VERSION,
  isPersistedAppStateEnvelope,
  wrapAppStateForPersistence,
} from './appStatePersistence';
import { secureWarn } from './secureLogger';

export type PersistenceMigrationResult = {
  state: AppState;
  migrated: boolean;
  fromVersion: number | 'legacy';
  warnings: string[];
};

/** 生の永続化 JSON を現在スキーマへ安全に移行 */
export function migratePersistedAppStateRaw(
  parsed: unknown,
  migrateStateFn: (raw: Record<string, unknown>) => AppState,
  defaultState: AppState,
): PersistenceMigrationResult {
  const warnings: string[] = [];

  if (!parsed || typeof parsed !== 'object') {
    return { state: defaultState, migrated: false, fromVersion: 'legacy', warnings: ['empty payload'] };
  }

  if (isPersistedAppStateEnvelope(parsed)) {
    const version = parsed.version;
    if (version === APP_STATE_PERSISTENCE_VERSION) {
      return {
        state: migrateStateFn(parsed.state as unknown as Record<string, unknown>),
        migrated: false,
        fromVersion: version,
        warnings,
      };
    }
    warnings.push(`downgrade envelope v${version} to v${APP_STATE_PERSISTENCE_VERSION}`);
    const state = migrateStateFn(parsed.state as unknown as Record<string, unknown>);
    return { state, migrated: true, fromVersion: version, warnings };
  }

  warnings.push('legacy unwrapped app state');
  secureWarn('[persistence] migrating legacy unwrapped app state');
  return {
    state: migrateStateFn(parsed as Record<string, unknown>),
    migrated: true,
    fromVersion: 'legacy',
    warnings,
  };
}

export function serializeAppStateForStorage(state: AppState): string {
  return JSON.stringify(wrapAppStateForPersistence(state));
}
