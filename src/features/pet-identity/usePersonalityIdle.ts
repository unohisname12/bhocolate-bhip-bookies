import { useEffect, useState } from 'react';
import type { Personality } from './model';

const FLOURISH: Record<Personality, string> = { playful: 'happy', sleepy: 'sleeping', proud: 'being_trained' };
// Long enough between flourishes that idle still reads as idle; short enough that kids notice the personality.
const EVERY_MS = 9000, FOR_MS = 2400;

/** While idling, occasionally swap in the personality's flourish animation. Any other requested animation wins. */
export function usePersonalityIdle(requested: string, personality: Personality | undefined, enabled: boolean): string {
  const [flourish, setFlourish] = useState(false);
  const active = enabled && requested === 'idle' && !!personality;
  useEffect(() => {
    if (!active) return;
    let off: ReturnType<typeof setTimeout> | undefined;
    const on = setInterval(() => { setFlourish(true); off = setTimeout(() => setFlourish(false), FOR_MS); }, EVERY_MS);
    return () => { clearInterval(on); clearTimeout(off); setFlourish(false); };
  }, [active]);
  return active && flourish ? FLOURISH[personality!] : requested;
}
