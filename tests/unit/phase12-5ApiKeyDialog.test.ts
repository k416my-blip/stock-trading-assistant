import { describe, expect, it } from 'vitest';
import {
  countApiKeyDialogSignals,
  isApiKeyMissingDialogVisible,
} from '../../scripts/lib/phase12-5-api-key-dialog.mjs';

describe('phase12-5 api key dialog detection', () => {
  it('isApiKeyMissingDialogVisible detects AlertDialog with 了解', () => {
    const xml =
      '<node class="android.app.AlertDialog" text="APIキー未設定" />' +
      '<node text="Twelve Data APIキーが未設定です" />' +
      '<node text="了解" bounds="[0,0][1,1]" />';
    expect(isApiKeyMissingDialogVisible(xml)).toBe(true);
  });

  it('isApiKeyMissingDialogVisible returns false for normal portfolio screen', () => {
    const xml =
      '<node text="株価を自動更新" bounds="[0,0][1,1]" />' +
      '<node text="保有銘柄" />';
    expect(isApiKeyMissingDialogVisible(xml)).toBe(false);
  });

  it('countApiKeyDialogSignals supports audit API-key dialog appeared: 0', () => {
    expect(countApiKeyDialogSignals('')).toBe(0);
    expect(
      countApiKeyDialogSignals('<node text="APIキー未設定" /><node text="了解" />'),
    ).toBeGreaterThan(0);
  });
});
