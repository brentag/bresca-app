import { useEffect, useState } from 'react';

export const DESKTOP_BP = 1024;

export function useIsDesktop(): boolean {
  const [v, setV] = useState(() => typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BP);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BP}px)`);
    const h = (e: MediaQueryListEvent) => setV(e.matches);
    setV(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return v;
}
