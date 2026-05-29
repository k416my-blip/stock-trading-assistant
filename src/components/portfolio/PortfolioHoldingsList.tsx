import { memo, useCallback, useEffect, useMemo } from 'react';
import type { ListRenderItem } from 'react-native';
import { Alert } from 'react-native';
import { HoldingCard } from '../HoldingCard';
import { usePriceSyncState } from '../../context/PriceSyncContext';
import type { HoldingDetail, Market, PortfolioPosition } from '../../types';
import type { PriceSyncFailure } from '../../types/marketData';
import { positionDisplayPrice } from '../../utils/positionPrice';
import { positionKey } from '../../utils/reactKeys';
import { confirmDestructiveAction } from '../../utils/confirmDestructive';
import {
  logCardRender,
  logMemoHit,
  logMemoMiss,
} from '../../utils/renderDiagnostics';

export type PortfolioHoldingActionsRef = {
  sellPractice: (position: PortfolioPosition, name: string, price: number) => void;
  addSellChecklist: (position: PortfolioPosition, name: string, price: number) => void;
  updateHoldingCurrentPrice: (positionId: string, price: number) => { ok: boolean; error?: string };
  updateHoldingSymbol: (positionId: string, symbol: string) => { ok: boolean; error?: string };
  updateHoldingMarket: (positionId: string, market: Market) => { ok: boolean; error?: string };
  removeHolding: (positionId: string) => Promise<{ ok: boolean; error?: string; canUndo?: boolean }>;
  undoLastHoldingRemoval: () => void;
  onRetryFailedPrices: (targets?: PriceSyncFailure[]) => void;
};

type RowHandlers = {
  onPracticeSell: () => void;
  onManualSellChecklist: () => void;
  onUpdateCurrentPrice: (price: number) => { ok: boolean; error?: string };
  onUpdateSymbol: (symbol: string) => { ok: boolean; error?: string };
  onUpdateMarket: (market: Market) => { ok: boolean; error?: string };
  onDeleteHolding?: () => void;
  onRetryPrice?: () => void;
};

type RowProps = {
  holding: HoldingDetail;
  position: PortfolioPosition;
  isPractice: boolean;
  readOnly?: boolean;
  priceExploring?: boolean;
  resolvedYahooSymbol?: string;
  priceFailure?: PriceSyncFailure;
  priceRetrying?: boolean;
  handlers: RowHandlers;
};

function holdingRowPropsEqual(prev: RowProps, next: RowProps): boolean {
  const same =
    prev.holding === next.holding &&
    prev.position === next.position &&
    prev.isPractice === next.isPractice &&
    prev.readOnly === next.readOnly &&
    prev.priceExploring === next.priceExploring &&
    prev.resolvedYahooSymbol === next.resolvedYahooSymbol &&
    prev.priceFailure === next.priceFailure &&
    prev.priceRetrying === next.priceRetrying &&
    prev.handlers === next.handlers;
  if (same) {
    logMemoHit('HoldingCardRow', { positionId: prev.holding.positionId });
  } else {
    logMemoMiss('HoldingCardRow', 'props_changed', { positionId: next.holding.positionId });
  }
  return same;
}

const HoldingCardRow = memo(function HoldingCardRow({
  holding,
  position,
  isPractice,
  readOnly,
  priceExploring,
  resolvedYahooSymbol,
  priceFailure,
  priceRetrying,
  handlers,
}: RowProps) {
  useEffect(() => {
    logCardRender(holding.positionId);
  });
  return (
    <HoldingCard
      holding={holding}
      position={position}
      isPractice={isPractice}
      readOnly={readOnly}
      priceExploring={priceExploring}
      resolvedYahooSymbol={resolvedYahooSymbol}
      priceFailure={priceFailure}
      priceRetrying={priceRetrying}
      onRetryPrice={handlers.onRetryPrice}
      onPracticeSell={handlers.onPracticeSell}
      onManualSellChecklist={handlers.onManualSellChecklist}
      onUpdateCurrentPrice={handlers.onUpdateCurrentPrice}
      onUpdateSymbol={handlers.onUpdateSymbol}
      onUpdateMarket={handlers.onUpdateMarket}
      onDeleteHolding={handlers.onDeleteHolding}
    />
  );
}, holdingRowPropsEqual);

export type PortfolioHoldingsListModelProps = {
  holdings: HoldingDetail[];
  portfolioById: Map<string, PortfolioPosition>;
  isPractice: boolean;
  readOnly?: boolean;
  actionsRef: React.MutableRefObject<PortfolioHoldingActionsRef>;
};

/** 親 FlatList 用: renderItem / keyExtractor / extraData */
export function usePortfolioHoldingsListModel({
  holdings,
  portfolioById,
  isPractice,
  readOnly,
  actionsRef,
}: PortfolioHoldingsListModelProps) {
  const { priceSync } = usePriceSyncState();

  const failureByPositionId = useMemo(() => {
    const map = new Map<string, PriceSyncFailure>();
    for (const f of priceSync.lastResult?.failures ?? []) {
      map.set(f.positionId, f);
    }
    return map;
  }, [priceSync.lastResult]);

  const priceOverlay = useMemo(
    () => ({
      loading: priceSync.loading,
      phase: priceSync.connectionPhase,
      currentSymbol: priceSync.currentSymbol,
      resolvedSymbol: priceSync.resolvedSymbol,
    }),
    [
      priceSync.loading,
      priceSync.connectionPhase,
      priceSync.currentSymbol,
      priceSync.resolvedSymbol,
    ],
  );

  const handlerMap = useMemo(() => {
    const map = new Map<string, RowHandlers>();
    for (const h of holdings) {
      const position = portfolioById.get(h.positionId);
      if (!position) continue;
      const failure = failureByPositionId.get(h.positionId);
      map.set(h.positionId, {
        onPracticeSell: () =>
          actionsRef.current.sellPractice(position, h.name, positionDisplayPrice(position)),
        onManualSellChecklist: () =>
          actionsRef.current.addSellChecklist(position, h.name, positionDisplayPrice(position)),
        onUpdateCurrentPrice: (price) => actionsRef.current.updateHoldingCurrentPrice(h.positionId, price),
        onUpdateSymbol: (symbol) => actionsRef.current.updateHoldingSymbol(h.positionId, symbol),
        onUpdateMarket: (market) => actionsRef.current.updateHoldingMarket(h.positionId, market),
        onDeleteHolding: () =>
          confirmDestructiveAction({
            title: '保有を削除',
            message: `${h.symbol} を保有一覧から削除します。売買履歴は残ります。`,
            confirmLabel: '削除',
            onConfirm: () => {
              void actionsRef.current.removeHolding(h.positionId).then((r) => {
                if (!r.ok) {
                  Alert.alert('削除できません', r.error ?? '');
                  return;
                }
                if (r.canUndo) {
                  Alert.alert('削除しました', undefined, [
                    { text: '元に戻す', onPress: () => actionsRef.current.undoLastHoldingRemoval() },
                    { text: '了解' },
                  ]);
                }
              });
            },
          }),
        onRetryPrice: failure
          ? () => actionsRef.current.onRetryFailedPrices([failure])
          : undefined,
      });
    }
    return map;
  }, [actionsRef, failureByPositionId, holdings, portfolioById]);

  const extraData = useMemo(
    () => ({
      priceOverlay,
      failureSize: failureByPositionId.size,
      handlerMap,
    }),
    [failureByPositionId.size, handlerMap, priceOverlay],
  );

  const renderItem: ListRenderItem<HoldingDetail> = useCallback(
    ({ item: h }) => {
      const position = portfolioById.get(h.positionId);
      if (!position) return null;
      const handlers = handlerMap.get(h.positionId);
      if (!handlers) return null;
      const priceExploring =
        priceOverlay.loading &&
        priceOverlay.phase === 'symbol_exploring' &&
        priceOverlay.currentSymbol === h.symbol;
      return (
        <HoldingCardRow
          holding={h}
          position={position}
          isPractice={isPractice}
          readOnly={readOnly}
          priceExploring={priceExploring}
          resolvedYahooSymbol={priceOverlay.resolvedSymbol}
          priceFailure={failureByPositionId.get(h.positionId)}
          priceRetrying={priceOverlay.loading}
          handlers={handlers}
        />
      );
    },
    [failureByPositionId, handlerMap, isPractice, portfolioById, priceOverlay, readOnly],
  );

  const keyExtractor = useCallback((h: HoldingDetail) => positionKey(h.positionId), []);

  return { renderItem, keyExtractor, extraData };
}
