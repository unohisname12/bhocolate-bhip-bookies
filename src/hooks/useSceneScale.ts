import { useLayoutEffect, useState, type RefObject } from 'react';

/** Fit the authored 400 × 224 world to its own available layout area. */
export function useSceneScale(viewport: RefObject<HTMLDivElement | null>): number {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => setScale(Math.max(0.1, Math.min(
      (element.clientWidth - 16) / 400,
      (element.clientHeight - 16) / 224,
    )));
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [viewport]);
  return scale;
}
