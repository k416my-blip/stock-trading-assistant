import type { ReactNode } from 'react';
import { useProactiveConciergeOptional } from '../../context/ProactiveConciergeContext';
import { ConciergePanelSlot } from './ConciergePanelErrorBoundary';
import { AiActionCenterAwaitingBundle, AiActionCenterPanel } from './AiActionCenterPanel';

type ProactiveCtx = NonNullable<ReturnType<typeof useProactiveConciergeOptional>>;

function Panel({ name, children }: { name: string; children: ReactNode }) {
  return <ConciergePanelSlot panelName={name}>{children}</ConciergePanelSlot>;
}

/** 軽量モード: Portfolio Score + 接続テストのみ（他ダッシュボードは import しない） */
export function ConciergeProactiveDashboardPanelsLite({ proactive }: { proactive: ProactiveCtx }) {
  return (
    <Panel name="AI Action Center (Lite)">
      {proactive.strategyBundle ? (
        <AiActionCenterPanel bundle={proactive.strategyBundle} liteMode />
      ) : (
        <AiActionCenterAwaitingBundle />
      )}
    </Panel>
  );
}
