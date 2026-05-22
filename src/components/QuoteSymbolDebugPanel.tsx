import { StyleSheet, Text, View } from 'react-native';
import { QUOTE_PROVIDER_LABELS } from '../constants/quoteProviders';
import { SYMBOL_EXPLORING_MESSAGE } from '../constants/yahooFinance';
import type { QuoteFetchDebugInfo } from '../types/quoteFetchDebug';
import { formatQuotePriceDisplay } from '../utils/formatQuotePrice';
import { sanitizeErrorForUi } from '../utils/sanitizeUiError';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  debug?: QuoteFetchDebugInfo;
  resolvedSymbol?: string;
  exploring?: boolean;
  currentSymbol?: string;
};

export function QuoteSymbolDebugPanel({
  debug,
  resolvedSymbol,
  exploring,
  currentSymbol,
}: Props) {
  const show =
    exploring ||
    resolvedSymbol ||
    debug?.price != null ||
    debug?.responseCode != null ||
    (debug?.lastError && !exploring);

  if (!show) return null;

  const formal = resolvedSymbol ?? debug?.resolvedSymbol;
  const providerLabel = debug?.provider ? QUOTE_PROVIDER_LABELS[debug.provider] : undefined;
  const displayName = debug?.shortName ?? debug?.coreSymbol ?? currentSymbol;
  const errorLine =
    debug?.lastError && !exploring ? sanitizeErrorForUi(debug.lastError) : null;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>株価取得</Text>
      {displayName ? <Text style={styles.row}>銘柄名: {displayName}</Text> : null}
      {formal ? <Text style={styles.row}>symbol: {formal}</Text> : null}
      {debug?.price != null ? (
        <Text style={styles.price}>{formatQuotePriceDisplay(debug.price)}</Text>
      ) : null}
      {providerLabel ? <Text style={styles.row}>provider: {providerLabel}</Text> : null}
      {exploring ? (
        <Text style={styles.exploring}>{SYMBOL_EXPLORING_MESSAGE}</Text>
      ) : null}
      {debug?.responseCode != null ? (
        <Text style={styles.rowMuted}>HTTP {debug.responseCode}</Text>
      ) : null}
      {errorLine ? <Text style={styles.error}>{errorLine}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.sm,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  title: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  exploring: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  price: {
    color: '#16a34a',
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    marginTop: 4,
  },
  row: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  rowMuted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  error: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: 4 },
});
