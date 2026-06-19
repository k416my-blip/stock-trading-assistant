export type AppUxMode = 'beginner' | 'standard' | 'pro';

export const APP_UX_MODES: readonly AppUxMode[] = ['beginner', 'standard', 'pro'] as const;

export function isAppUxMode(value: unknown): value is AppUxMode {
  return value === 'beginner' || value === 'standard' || value === 'pro';
}
