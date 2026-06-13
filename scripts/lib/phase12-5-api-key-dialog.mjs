/**
 * Phase12.5 — detect API key missing dialog in UI dumps (runner-side audit).
 */

/** @param {string} xml */
export function isApiKeyMissingDialogVisible(xml) {
  if (!xml) return false;
  const hasApiKeyText =
    /APIキー未設定|APIキー設定|Twelve Data APIキー|APIキーが未設定/.test(xml);
  const hasDismissControl = /了解|AlertDialog|android\.app\.AlertDialog/.test(xml);
  return hasApiKeyText && hasDismissControl;
}

/** @param {string} xml */
export function countApiKeyDialogSignals(xml) {
  if (!xml) return 0;
  let count = 0;
  if (/APIキー未設定/.test(xml)) count += 1;
  if (/APIキー設定/.test(xml) && /了解/.test(xml)) count += 1;
  return count;
}
