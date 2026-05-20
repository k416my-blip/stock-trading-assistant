import { useAiConcierge } from '../../context/AiConciergeContext';
import { AiConciergeFab } from './AiConciergeFab';
import { AiConciergeSheet } from './AiConciergeSheet';

/** Global floating AI + bottom sheet — mount once at app root. */
export function AiConciergeOverlay() {
  const { panelOpen, openPanel, closePanel } = useAiConcierge();

  return (
    <>
      {!panelOpen ? <AiConciergeFab onPress={openPanel} /> : null}
      <AiConciergeSheet visible={panelOpen} onClose={closePanel} />
    </>
  );
}
