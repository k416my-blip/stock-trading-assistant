import type { AiPreferences } from '../types/aiStrategy';
import { resolveInvestmentDisplayMode } from './beginnerDisplayMapper';

/** 実機検証用: 起動時の投資表示モードを logcat へ常時出力 */
export function logInvestmentDisplayModeForDeviceVerify(prefs: AiPreferences): void {
  const mode = resolveInvestmentDisplayMode(prefs);
  console.warn('[INVESTMENT_DISPLAY_MODE] 現在モード', mode);
}
