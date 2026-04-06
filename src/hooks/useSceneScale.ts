import { useState, useEffect } from 'react';

/** Native canvas width the scene is authored at. */
const NATIVE_WIDTH = 400;

/**
 * Returns a scale factor that converts native 400×224 scene coordinates
 * to the current viewport size. Listens for window resize.
 */
export function useSceneScale(): number {
  const [scale, setScale] = useState(() => window.innerWidth / NATIVE_WIDTH);

  useEffect(() => {
    const update = () => setScale(window.innerWidth / NATIVE_WIDTH);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scale;
}
