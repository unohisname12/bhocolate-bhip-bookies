import { useEffect, useRef } from 'react';

/**
 * PROOF-OF-CONCEPT motion layer.
 *
 * Tiny, no-spring implementation that writes a single `transform` (and
 * optional `filter`) string onto a target DOM node via RAF. Designed to
 * FEEL the difference on Blue Koala with minimal code.
 *
 * Channels:
 *   - Idle bob       (1.4 px vertical sine)
 *   - Random blink   (scaleY dip, every 3–6 s)
 *   - Tilt           (rotate tied to recent dx/dt, clamped ±2.5°)
 *   - Reaction pulse (squash 0.88y / 1.08x on reaction edge, linear decay)
 *   - Anticipation   (translate-up 1.4 px + brightness 1.08 while hovered)
 *
 * Everything is inline constants — no config file, no springs. If it
 * feels good, we graduate it to a reusable system. If it doesn't, we
 * delete this file and nothing else changes.
 */

type ReactionPhase = 'idle' | 'anticipation' | 'reacting' | 'afterglow';

export interface UsePetMotionOpts {
  animationName: string;
  petX: number;
  reactionPhase: ReactionPhase;
  enabled: boolean;
}

// Inline tuning (proof) — all values chosen to feel crisp in pixel art.
const BOB_AMP_PX = 1.4;
const BOB_PERIOD_MS = 2200;
const BLINK_MIN_MS = 3000;
const BLINK_MAX_MS = 6000;
const BLINK_DURATION_MS = 90;
const BLINK_SCALE_Y = 0.88;
const TILT_MAX_DEG = 2.5;
const TILT_VELOCITY_FOR_MAX = 30; // native px/sec → max tilt
const TILT_SMOOTHING = 0.15;
const PULSE_DURATION_MS = 180;
const PULSE_PEAK_SX = 1.08;
const PULSE_PEAK_SY = 0.88;
const ANTICIPATE_LIFT_PX = 1.4;
const ANTICIPATE_BRIGHTNESS = 1.08;

const isBobbingAnim = (name: string) => name === 'idle' || name === 'happy';
const canBlink = (name: string) => name === 'idle' || name === 'happy';

export function usePetMotion(
  ref: React.RefObject<HTMLElement | null>,
  opts: UsePetMotionOpts,
): void {
  // Keep mutable option refs so the RAF closure always sees latest values
  const animRef = useRef(opts.animationName);
  const xRef = useRef(opts.petX);
  const phaseRef = useRef(opts.reactionPhase);
  const enabledRef = useRef(opts.enabled);
  animRef.current = opts.animationName;
  xRef.current = opts.petX;
  phaseRef.current = opts.reactionPhase;
  enabledRef.current = opts.enabled;

  // Pulse trigger — edge-detect on reactionPhase entering 'reacting'
  const lastPhaseRef = useRef<ReactionPhase>(opts.reactionPhase);
  const pulseStartRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = lastPhaseRef.current;
    if (prev !== 'reacting' && opts.reactionPhase === 'reacting') {
      pulseStartRef.current = performance.now();
    }
    lastPhaseRef.current = opts.reactionPhase;
  }, [opts.reactionPhase]);

  useEffect(() => {
    let raf = 0;
    let lastX = xRef.current;
    let lastTime: number | null = null;
    let tilt = 0;
    let nextBlinkAt = performance.now() + 1500;
    let blinkStart: number | null = null;

    const loop = (time: number) => {
      const el = ref.current;
      const prev = lastTime ?? time;
      const dtMs = Math.min(64, time - prev);
      const dt = dtMs / 1000;
      lastTime = time;

      if (!el || !enabledRef.current) {
        raf = requestAnimationFrame(loop);
        return;
      }

      const anim = animRef.current;
      const phase = phaseRef.current;

      // Bob (translateY sine)
      const bobY = isBobbingAnim(anim)
        ? Math.sin((time / BOB_PERIOD_MS) * Math.PI * 2) * BOB_AMP_PX
        : 0;

      // Anticipation lift (overrides zero baseline when hovering)
      const anticipateY = phase === 'anticipation' ? -ANTICIPATE_LIFT_PX : 0;

      // Blink (scaleY dip)
      let blinkSy = 1;
      if (canBlink(anim)) {
        if (blinkStart === null && time >= nextBlinkAt) blinkStart = time;
        if (blinkStart !== null) {
          const blinkT = time - blinkStart;
          if (blinkT >= BLINK_DURATION_MS) {
            blinkStart = null;
            nextBlinkAt = time + BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS);
          } else {
            const t = blinkT / BLINK_DURATION_MS;
            const tri = 1 - Math.abs(0.5 - t) * 2; // 0 → 1 → 0
            blinkSy = 1 - (1 - BLINK_SCALE_Y) * tri;
          }
        }
      } else {
        blinkStart = null;
      }

      // Tilt (rotate from dx/dt)
      const velocity = dt > 0 ? (xRef.current - lastX) / dt : 0;
      lastX = xRef.current;
      const target = Math.max(
        -TILT_MAX_DEG,
        Math.min(TILT_MAX_DEG, (velocity / TILT_VELOCITY_FOR_MAX) * TILT_MAX_DEG),
      );
      tilt += (target - tilt) * TILT_SMOOTHING;

      // Reaction pulse (triangle: peak at trigger → linear decay to 0)
      let pulseSx = 1;
      let pulseSy = 1;
      if (pulseStartRef.current !== null) {
        const elapsed = time - pulseStartRef.current;
        if (elapsed >= PULSE_DURATION_MS) {
          pulseStartRef.current = null;
        } else {
          const t = elapsed / PULSE_DURATION_MS;
          // Fast rise (first 30%) then ease back to rest
          const amount = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
          pulseSx = 1 + (PULSE_PEAK_SX - 1) * amount;
          pulseSy = 1 + (PULSE_PEAK_SY - 1) * amount;
        }
      }

      const sx = pulseSx;
      const sy = pulseSy * blinkSy;
      const y = bobY + anticipateY;

      el.style.transform =
        `translate3d(0, ${y.toFixed(3)}px, 0) `
        + `scale(${sx.toFixed(4)}, ${sy.toFixed(4)}) `
        + `rotate(${tilt.toFixed(3)}deg)`;
      el.style.transformOrigin = 'bottom center';

      // Anticipation brightness (subtle)
      if (phase === 'anticipation') {
        el.style.filter = `brightness(${ANTICIPATE_BRIGHTNESS})`;
      } else if (el.style.filter) {
        el.style.filter = '';
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      const el = ref.current;
      if (el) {
        el.style.transform = '';
        el.style.filter = '';
      }
    };
  }, [ref]);
}
