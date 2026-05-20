/** Progressive text reveal for assistant replies (UI streaming when API stream unavailable). */

export type StreamRevealOptions = {
  chunkMs?: number;
  charsPerTick?: number;
  signal?: AbortSignal;
};

export async function streamRevealText(
  fullText: string,
  onPartial: (visibleText: string) => void,
  options?: StreamRevealOptions,
): Promise<void> {
  const chunkMs = options?.chunkMs ?? 18;
  const charsPerTick = options?.charsPerTick ?? 3;
  const signal = options?.signal;

  if (!fullText) {
    onPartial('');
    return;
  }

  let index = 0;
  onPartial('');

  await new Promise<void>((resolve, reject) => {
    const tick = () => {
      if (signal?.aborted) {
        clearInterval(timer);
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      index = Math.min(fullText.length, index + charsPerTick);
      onPartial(fullText.slice(0, index));
      if (index >= fullText.length) {
        clearInterval(timer);
        resolve();
      }
    };
    const timer = setInterval(tick, chunkMs);
    tick();
  });
}
