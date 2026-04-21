import { useState, useEffect, useRef, useCallback } from 'react';
import type { InteractionState, HandMode } from '../types/interaction';
import type { Pet } from '../types';
import { getPetResponseAnim } from '../engine/systems/InteractionSystem';

type ReactionPhase = 'idle' | 'anticipation' | 'reacting' | 'afterglow';

interface UsePetReactionReturn {
  reactionAnim: string | null;
  reactionText: string | null;
  vfxType: string | null;
  isReacting: boolean;
  anticipation: boolean;
  phase: ReactionPhase;
}

const VFX_BY_MODE: Record<Exclude<HandMode, 'idle'>, string> = {
  pet: 'hearts',
  wash: 'bubbles',
  brush: 'fluff',
  comfort: 'glow',
  train: 'energy',
  play: 'confetti',
};

const AFTERGLOW_MS = 1500;

export function usePetReaction(
  interaction: InteractionState | undefined,
  _pet: Pet | null,
  isOverPet: boolean,
): UsePetReactionReturn {
  const [phase, setPhase] = useState<ReactionPhase>('idle');
  const [reactionText, setReactionText] = useState<string | null>(null);
  const phaseRef = useRef<ReactionPhase>('idle');
  const afterglowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync so callbacks never see stale phase
  const updatePhase = useCallback((next: ReactionPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const mode = interaction?.activeMode ?? 'idle';
  const isInteracting = interaction?.isInteracting ?? false;
  const lastReactionText = interaction?.lastReactionText ?? null;

  // Phase transitions — use phaseRef.current to avoid stale reads
  useEffect(() => {
    const current = phaseRef.current;

    if (isInteracting && mode !== 'idle') {
      updatePhase('reacting');
      if (lastReactionText) setReactionText(lastReactionText);

      // Clear any pending afterglow
      if (afterglowTimer.current) {
        clearTimeout(afterglowTimer.current);
        afterglowTimer.current = null;
      }
    } else if (current === 'reacting' && !isInteracting) {
      // Interaction just ended — enter afterglow
      updatePhase('afterglow');
      afterglowTimer.current = setTimeout(() => {
        updatePhase('idle');
        setReactionText(null);
      }, AFTERGLOW_MS);
    } else if (!isInteracting && isOverPet && mode !== 'idle' && current === 'idle') {
      updatePhase('anticipation');
    } else if (current === 'anticipation' && (!isOverPet || mode === 'idle')) {
      updatePhase('idle');
      setReactionText(null);
    }
  }, [isInteracting, isOverPet, mode, lastReactionText, updatePhase]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (afterglowTimer.current) clearTimeout(afterglowTimer.current);
    };
  }, []);

  const reactionAnim = phase === 'reacting' && mode !== 'idle'
    ? getPetResponseAnim(mode)
    : null;

  const vfxType = phase === 'reacting' && mode !== 'idle'
    ? VFX_BY_MODE[mode]
    : null;

  return {
    reactionAnim,
    reactionText: phase === 'reacting' || phase === 'afterglow' ? reactionText : null,
    vfxType,
    isReacting: phase !== 'idle',
    anticipation: phase === 'anticipation',
    phase,
  };
}
