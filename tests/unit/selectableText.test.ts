import { describe, expect, it } from 'vitest';
import { SELECTABLE_TEXT_PROP } from '../../src/constants/aiConciergeLayout';

describe('SelectableText', () => {
  it('exports selectable prop for copy support', () => {
    expect(SELECTABLE_TEXT_PROP).toEqual({ selectable: true });
  });
});
