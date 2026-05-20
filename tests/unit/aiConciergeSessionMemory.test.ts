import { describe, expect, it } from 'vitest';
import {
  createEmptyConciergeSessionMemory,
  detectStrategyPreference,
  extractDiscussedSymbols,
  recordConciergeAssistantTurn,
  updateConciergeSessionMemory,
} from '../../src/services/aiConciergeSessionMemory';

describe('aiConciergeSessionMemory', () => {
  it('tracks recent questions and symbols', () => {
    let memory = createEmptyConciergeSessionMemory('general');
    memory = updateConciergeSessionMemory(memory, '1155はどう？', 'general');
    memory = updateConciergeSessionMemory(memory, 'リスクオフって何？', 'general');

    expect(memory.recentQuestions).toEqual(['1155はどう？', 'リスクオフって何？']);
    expect(memory.discussedSymbols).toContain('1155');
  });

  it('detects strategy preference from user text', () => {
    expect(detectStrategyPreference('バリュー株を長期で見たい')).toBe('バリュー重視');
    expect(extractDiscussedSymbols('NVDAと1155')).toEqual(expect.arrayContaining(['NVDA', '1155']));
  });

  it('records assistant entities and last snippet', () => {
    let memory = createEmptyConciergeSessionMemory('general');
    memory = recordConciergeAssistantTurn(
      memory,
      'NVIDIAとTSMCをウォッチしています。',
    );
    expect(memory.entities.companyNames).toContain('NVIDIA');
    expect(memory.entities.companyNames).toContain('TSMC');
    expect(memory.lastAssistantSnippet).toContain('NVIDIA');
  });
});
