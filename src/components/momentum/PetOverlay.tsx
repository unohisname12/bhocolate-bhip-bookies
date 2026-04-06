import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import type { MomentumGameEvent } from '../../types/momentum';
// Import PetSprite — DO NOT modify PetSprite.tsx
import { PetSprite } from '../pet/PetSprite';

interface PetOverlayProps {
  speciesId: string;
  lastEvent: MomentumGameEvent | null;
}

// Map game events to pet animation names
const EVENT_ANIMATION_MAP: Partial<Record<MomentumGameEvent['type'], string>> = {
  piece_attacked: 'attack',
  piece_captured: 'happy',
  flash_triggered: 'special',
  flash_upgrade: 'happy',
  flash_fusion: 'special',
  rank4_expired: 'idle',
  game_won: 'happy',
  game_lost: 'hurt',
  turn_skipped: 'idle',
  piece_moved: 'idle',
  piece_promoted: 'happy',
};

export const PetOverlay: React.FC<PetOverlayProps> = ({ speciesId, lastEvent }) => {
  const [animationName, setAnimationName] = useState('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!lastEvent) return;

    const targetAnim = EVENT_ANIMATION_MAP[lastEvent.type] ?? 'idle';

    // 500ms delay so the game event plays first, then pet reacts
    timerRef.current = setTimeout(() => {
      setAnimationName(targetAnim);

      // Revert to idle after 2 seconds (unless it's a terminal state)
      if (lastEvent.type !== 'game_won' && lastEvent.type !== 'game_lost') {
        timerRef.current = setTimeout(() => setAnimationName('idle'), 2000);
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lastEvent]);

  return (
    <div
      className="fixed bottom-16 left-2 z-30"
      style={{
        background: 'linear-gradient(180deg, rgba(15,23,42,0.7) 0%, rgba(15,23,42,0.5) 100%)',
        borderRadius: '12px',
        padding: '6px',
        border: '1px solid rgba(100,120,180,0.15)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="w-20 h-20">
        {/* PetSprite has its own SpriteFallback mechanism for missing animations/sheets */}
        <PetSprite
          speciesId={speciesId}
          animationName={animationName}
          scale={0.6}
        />
      </div>
    </div>
  );
};
