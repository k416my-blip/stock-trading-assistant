import { StyleSheet, Text } from 'react-native';
import { CLOSED_TRADE_WARNING } from '../constants/marketSession';
import { useAllMarketSessions, useMarketSession } from '../hooks/useMarketSession';
import type { Market } from '../types';
import { MarketSessionCard } from './MarketSessionCard';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props =
  | { mode: 'all' }
  | { mode: 'single'; market: Market; showTradeWarning?: boolean };

export function MarketSessionPanel(props: Props) {
  if (props.mode === 'all') {
    const sessions = useAllMarketSessions();
    return (
      <Card>
        <Text style={styles.title}>市場の開閉状況（MYT）</Text>
        <Text style={styles.hint}>マレーシア時間で表示しています。祝日は未反映の目安です。</Text>
        {sessions.map((s, index) => (
          <MarketSessionCard key={`session-${s.market}-${index}`} session={s} compact />
        ))}
      </Card>
    );
  }

  const session = useMarketSession(props.market);
  return (
    <Card>
      <Text style={styles.title}>市場セッション</Text>
      <MarketSessionCard session={session} />
      {props.showTradeWarning && session.blockVirtualBuy ? (
        <Text style={styles.warn}>{CLOSED_TRADE_WARNING}</Text>
      ) : null}
      {props.showTradeWarning && session.showExtendedHoursWarning ? (
        <Text style={styles.warnExt}>{session.beginnerTip}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md, marginBottom: theme.spacing.xs },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm, lineHeight: 18 },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm, fontWeight: '600', lineHeight: 20 },
  warnExt: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.xs, lineHeight: 18 },
});
