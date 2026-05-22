import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export function useAppForeground(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  const prevRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setActive(next === 'active');
      prevRef.current = next;
    });
    return () => sub.remove();
  }, []);

  return active;
}

export function useAppResume(callback: () => void): void {
  const prevRef = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const wasBackground = prevRef.current.match(/inactive|background/);
      if (wasBackground && next === 'active') {
        callback();
      }
      prevRef.current = next;
    });
    return () => sub.remove();
  }, [callback]);
}
