import { describe, expect, it } from 'vitest';
import {
  analyzePostsSentiment,
  buildXSearchQuery,
  classifyPostSentiment,
  extractTrendWords,
} from '../../src/services/xSentimentEngine';

describe('xSentimentEngine', () => {
  it('builds company OR ticker query', () => {
    expect(buildXSearchQuery('AAPL', 'Apple')).toBe('Apple OR AAPL -is:retweet lang:en');
    expect(buildXSearchQuery('7103', 'Spritzer')).toContain('Spritzer');
    expect(buildXSearchQuery('7103', 'Spritzer')).toContain('7103');
  });

  it('classifies panic and hype', () => {
    expect(classifyPostSentiment('Market panic selloff crash fear')).toBe('panic');
    expect(classifyPostSentiment('To the moon rocket pump yolo')).toBe('hype');
    expect(classifyPostSentiment('Strong buy upgrade beat estimates')).toBe('bullish');
  });

  it('analyzes posts with sentiment distribution', () => {
    const snapshot = analyzePostsSentiment({
      posts: [
        { text: 'Strong buy breakout upgrade' },
        { text: 'Sell downgrade miss weak' },
        { text: 'Just watching the stock' },
        { text: 'Panic crash selloff' },
        { text: 'Moon rocket pump' },
      ],
      searchQuery: 'Apple OR AAPL -is:retweet lang:en',
      previousPostCount: 2,
      quotaRemainingToday: 35,
      fromCache: false,
      fetchedAt: new Date().toISOString(),
    });
    expect(snapshot.postCount).toBe(5);
    expect(snapshot.sentimentPct.bullish + snapshot.sentimentPct.bearish).toBeGreaterThan(0);
    expect(snapshot.analysisBasis).toBe('fetched_posts');
    expect(snapshot.postSurgeRatePct).toBe(150);
    expect(snapshot.trendWords.length).toBeGreaterThan(0);
  });

  it('detects pump and rumor anomalies', () => {
    const snapshot = analyzePostsSentiment({
      posts: [
        { text: 'Moon pump guaranteed 100x' },
        { text: 'Rocket to the moon yolo' },
        { text: 'Heard rumor unconfirmed sources say' },
        { text: 'Rumor spreading fast' },
      ],
      searchQuery: 'TEST OR 123',
      previousPostCount: null,
      quotaRemainingToday: 10,
      fromCache: false,
      fetchedAt: new Date().toISOString(),
    });
    const ids = snapshot.anomalies.map((a) => a.id);
    expect(ids).toContain('pump_suspect');
    expect(ids).toContain('rumor_spread');
  });

  it('extracts trend words from posts', () => {
    const words = extractTrendWords([
      { text: 'Apple earnings beat expectations strongly' },
      { text: 'Apple revenue growth beat forecasts' },
    ]);
    expect(words.some((w) => w.includes('apple') || w.includes('earnings') || w.includes('beat'))).toBe(
      true,
    );
  });
});
