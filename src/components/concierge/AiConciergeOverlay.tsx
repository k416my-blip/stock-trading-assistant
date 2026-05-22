import { useProactiveConciergeOptional } from '../../context/ProactiveConciergeContext';
import { useAiConcierge } from '../../context/AiConciergeContext';
import { AiConciergeFab } from './AiConciergeFab';
import { AiConciergeSheet } from './AiConciergeSheet';

/** Global floating AI + bottom sheet — mount once at app root. */
export function AiConciergeOverlay() {
  const { panelOpen, openPanel, closePanel, panelOptions } = useAiConcierge();
  const proactive = useProactiveConciergeOptional();
  const unread = proactive?.unreadCount ?? 0;

  return (
    <>
      {!panelOpen ? (
        <AiConciergeFab onPress={() => openPanel()} unreadCount={unread} />
      ) : null}
      <AiConciergeSheet visible={panelOpen} onClose={closePanel} panelOptions={panelOptions} />
    </>
  );
}
