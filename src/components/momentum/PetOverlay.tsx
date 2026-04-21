import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import type { MomentumGameEvent } from '../../types/momentum';
// Import PetSprite — DO NOT modify PetSprite.tsx
import { PetSprite } from '../pet/PetSprite';

interface PetOverlayProps {
  speciesId: string;
  lastEvent: MomentumGameEvent | null;
}

type EventReaction = { anim: string; bubble: string | null; hold?: boolean };

const EVENT_REACTIONS: Partial<Record<MomentumGameEvent['type'], EventReaction>> = {
  piece_attacked: { anim: 'attack', bubble: '⚔️' },
  piece_captured: { anim: 'happy', bubble: '🔥' },
  flash_triggered: { anim: 'special', bubble: '✨' },
  flash_upgrade: { anim: 'happy', bubble: '⬆️' },
  flash_fusion: { anim: 'special', bubble: '⚡' },
  piece_promoted: { anim: 'happy', bubble: '🌟' },
  game_won: { anim: 'happy', bubble: '🎉', hold: true },
  game_lost: { anim: 'hurt', bubble: '💔', hold: true },
  turn_skipped: { anim: 'idle', bubble: '😴' },
  piece_moved: { anim: 'idle', bubble: null },
  rank4_expired: { anim: 'idle', bubble: null },
};

export const PetOverlay: React.FC<PetOverlayProps> = ({ speciesId, lastEvent }) => {
  const [animationName, setAnimationName] = useState('idle');
  const [bubble, setBubble] = useState<{ emoji: string; key: number } | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lastEvent) return;
    const reaction = EVENT_REACTIONS[lastEvent.type];
    if (!reaction) return;

    // Clear pending timers
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);

    // Delay so the board event reads first
    animTimerRef.current = setTimeout(() => {
      setAnimationName(reaction.anim);
      if (reaction.bubble) {
        setBubble({ emoji: reaction.bubble, key: Date.now() });
        bubbleTimerRef.current = setTimeout(() => setBubble(null), 1800);
      }
      if (!reaction.hold) {
        animTimerRef.current = setTimeout(() => setAnimationName('idle'), 2000);
      }
    }, 400);

    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, [lastEvent]);

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-center pointer-events-none select-none">
      {/* Thought bubble — pops above the pet */}
      {bubble && (
        <div
          key={bubble.key}
          className="relative mb-1 anim-pop"
        >
          <div
            className="px-3 py-1.5 rounded-2xl text-2xl border-2 border-cyan-300/60 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
            style={{
              background: 'linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.92) 100%)',
            }}
          >
            {bubble.emoji}
          </div>
          {/* Bubble tail */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 border-b-2 border-r-2 border-cyan-300/60"
            style={{ background: 'rgba(30,41,59,0.92)' }}
          />
        </div>
      )}

      {/* Pet sprite + rune frame */}
      <div
        className="relative"
        style={{
          background:
            'linear-gradient(180deg, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.55) 100%)',
          borderRadius: '14px',
          padding: '8px 10px',
          border: '2px solid rgba(34,211,238,0.35)',
          boxShadow:
            '0 0 24px rgba(34,211,238,0.2), inset 0 0 12px rgba(34,211,238,0.08)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* Corner rune accents */}
        <span className="absolute -top-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
        <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
        <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)]" />

        <div className="w-24 h-24">
          <PetSprite speciesId={speciesId} animationName={animationName} scale={0.7} />
        </div>

        {/* Pedestal base glow */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-20 h-2 rounded-[50%] blur-sm"
          style={{ background: 'rgba(34,211,238,0.35)' }}
        />
      </div>

      {/* Ground shadow */}
      <div className="w-20 h-2 bg-black/40 rounded-[100%] blur-md mt-1" />
    </div>
  );
};
