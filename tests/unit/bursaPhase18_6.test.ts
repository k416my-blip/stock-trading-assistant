import { describe, expect, it } from 'vitest';
import {
  CONTRACT_AWARD_REQUIRED,
  EARNINGS_REQUIRED,
  GUIDANCE_RAISE_REQUIRED,
  validateNewsEventClassification,
} from '../../src/services/bursa/bursaNewsEventValidationEngine';
import {
  classifyNewsImpactEvent,
  classifyNewsImpactEventStage1,
  classifyValidatedNewsEvent,
} from '../../src/services/bursa/bursaNewsImpactEngine';
import { buildNewsArticles } from '../../src/services/bursa/bursaNewsIntelligenceService';

describe('bursaNewsEventValidationEngine Phase18.6', () => {
  it('rejects Guidance Raise without required phrases', () => {
    const stage1 = classifyNewsImpactEventStage1('Company raises full-year guidance outlook');
    expect(stage1).toBe('Guidance Raise');

    const validated = validateNewsEventClassification(stage1, 'Company raises full-year guidance outlook');
    expect(validated.eventType).not.toBe('Guidance Raise');
    expect(validated.rejectionReason).toContain('required phrase missing');
    expect(validated.eventConfidence).toBeLessThan(50);
  });

  it('accepts Guidance Raise only with explicit required phrases', () => {
    for (const phrase of [
      'Bank to raise guidance for FY2026',
      'Firm to increase forecast for revenue',
      'Analyst sees higher outlook for sector',
      'Company announces earnings upgrade',
      'Profit forecast raised after strong quarter',
    ]) {
      const v = classifyValidatedNewsEvent(phrase);
      expect(v.eventType).toBe('Guidance Raise');
      expect(v.eventConfidence).toBeGreaterThanOrEqual(78);
      expect(v.eventValidated).toBe(true);
    }
  });

  it('validates Earnings with required phrases', () => {
    expect(classifyValidatedNewsEvent('Q3 earnings report shows growth').eventType).toBe('Earnings');
    expect(classifyValidatedNewsEvent('Quarterly result beats street').eventType).toBe('Earnings');
    expect(classifyValidatedNewsEvent('Net profit rises on revenue').eventType).not.toBe('Earnings');
  });

  it('validates Contract Award with required phrases', () => {
    expect(classifyValidatedNewsEvent('Wins contract award worth RM1bn').eventType).toBe(
      'Contract Award',
    );
    expect(classifyValidatedNewsEvent('Secures new project in Johor').eventType).toBe('Contract Award');
    expect(classifyValidatedNewsEvent('Awarded major contract win').eventType).not.toBe(
      'Contract Award',
    );
  });

  it('exports required phrase patterns for audit', () => {
    expect(GUIDANCE_RAISE_REQUIRED.length).toBe(5);
    expect(EARNINGS_REQUIRED.length).toBe(3);
    expect(CONTRACT_AWARD_REQUIRED.length).toBe(4);
  });

  it('buildNewsArticles includes confidence fields', () => {
    const articles = buildNewsArticles([
      {
        headline: 'Maybank to raise guidance for FY2026',
        publishedAt: new Date().toISOString(),
        source: 'news_api',
        sourceLabel: 'NewsAPI',
        url: null,
      },
    ]);
    expect(articles[0]?.eventConfidence).toBeGreaterThan(0);
    expect(articles[0]?.stage1EventType).toBeTruthy();
    expect(articles[0]?.eventType).toBe('Guidance Raise');
  });

  it('reduces false Guidance Raise from broad headlines', () => {
    const headlines = [
      'Maybank stock rises on market optimism',
      'Analyst maintains outlook for banking sector',
      'CIMB shares higher on Bursa trade',
      'Public Bank dividend news in focus',
    ];
    const raises = headlines.filter((h) => classifyNewsImpactEvent(h) === 'Guidance Raise');
    expect(raises).toHaveLength(0);
  });
});
