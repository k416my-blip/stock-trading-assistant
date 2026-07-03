import type { AppLanguage } from '../types/appLanguage';
import { normalizeAppLanguage } from '../types/appLanguage';

export type ConfirmInitialLanguageDeps = {
  saveAppLanguage: (language: AppLanguage) => Promise<void>;
  changeAppLanguage: (language: AppLanguage) => Promise<void>;
};

export type ConfirmInitialLanguageResult =
  | { ok: true; language: AppLanguage; languageChanged: boolean }
  | { ok: false; error: 'invalid_language' };

/** Persists first-run language choice even when it matches the device locale. */
export async function confirmInitialAppLanguage(
  language: AppLanguage,
  currentLanguage: AppLanguage,
  deps: ConfirmInitialLanguageDeps,
): Promise<ConfirmInitialLanguageResult> {
  const normalized = normalizeAppLanguage(language);
  if (!normalized) return { ok: false, error: 'invalid_language' };

  await deps.saveAppLanguage(normalized);
  const languageChanged = normalized !== currentLanguage;
  if (languageChanged) {
    await deps.changeAppLanguage(normalized);
  }
  return { ok: true, language: normalized, languageChanged };
}
