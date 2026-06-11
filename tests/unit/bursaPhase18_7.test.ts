import { describe, expect, it } from 'vitest';
import {
  classifyExpansionEvent,
  EXPANSION_EVENT_DEFINITIONS,
  getExpansionEventDirection,
  tryExpandOtherEvent,
} from '../../src/services/bursa/bursaNewsEventExpansionEngine';
import { classifyValidatedNewsEvent } from '../../src/services/bursa/bursaNewsImpactEngine';
import { buildNewsArticles } from '../../src/services/bursa/bursaNewsIntelligenceService';

describe('bursaNewsEventExpansionEngine Phase18.7', () => {
  it('defines 10 expansion events with required keywords', () => {
    const types = EXPANSION_EVENT_DEFINITIONS.map((d) => d.type);
    expect(types).toContain('Management Change');
    expect(types).toContain('Product Launch');
    expect(types).toContain('M&A');
    expect(types).toContain('Analyst Upgrade');
    expect(types).toContain('Share Buyback');
    expect(types.length).toBe(10);
  });

  it('classifies expansion events from Other candidates', () => {
    expect(classifyExpansionEvent('Analyst upgrade lifts price target')).toBe('Analyst Upgrade');
    expect(classifyExpansionEvent('Board approves share buyback program')).toBe('Share Buyback');
    expect(classifyExpansionEvent('Company announces rights issue capital raising')).toBe(
      'Capital Raising',
    );
    expect(classifyExpansionEvent('Strategic partnership with tech firm')).toBe('Partnership');
    expect(classifyExpansionEvent('Random market headline')).toBeNull();
  });

  it('assigns bullish/bearish direction per event', () => {
    expect(getExpansionEventDirection('Analyst Upgrade')).toBe('Bullish');
    expect(getExpansionEventDirection('Analyst Downgrade')).toBe('Bearish');
    expect(getExpansionEventDirection('Capital Raising')).toBe('Bearish');
    expect(getExpansionEventDirection('Management Change')).toBe('Neutral');
  });

  it('expands Other via tryExpandOtherEvent', () => {
    const expanded = tryExpandOtherEvent(
      'Maybank unveils new product launch in digital banking',
      'Other',
      'Other',
    );
    expect(expanded?.eventType).toBe('Product Launch');
    expect(expanded?.eventConfidence).toBeGreaterThanOrEqual(74);
  });

  it('classifyValidatedNewsEvent records preExpansionEventType', () => {
    const v = classifyValidatedNewsEvent('CIMB announces share buyback of RM500m');
    expect(v.preExpansionEventType).toBe('Other');
    expect(v.eventType).toBe('Share Buyback');
  });

  it('buildNewsArticles reduces Other count', () => {
    const rows = [
      {
        headline: 'Maybank stock steady on Bursa trade',
        publishedAt: new Date().toISOString(),
        source: 'news_api' as const,
        sourceLabel: 'NewsAPI',
        url: null,
      },
      {
        headline: 'Maybank announces share buyback program',
        publishedAt: new Date().toISOString(),
        source: 'news_api' as const,
        sourceLabel: 'NewsAPI',
        url: null,
      },
      {
        headline: 'Analyst upgrade raises price target',
        publishedAt: new Date().toISOString(),
        source: 'news_api' as const,
        sourceLabel: 'NewsAPI',
        url: null,
      },
    ];
    const articles = buildNewsArticles(rows);
    const otherBefore = articles.filter((a) => a.preExpansionEventType === 'Other').length;
    const otherAfter = articles.filter((a) => a.eventType === 'Other').length;
    expect(otherBefore).toBeGreaterThan(otherAfter);
  });
});
