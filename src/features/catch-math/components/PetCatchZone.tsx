import React, { forwardRef, useEffect, useState } from 'react';
import { PetSprite } from '../../../components/pet/PetSprite';
import { ReactionBurst } from '../../../components/pet/ReactionBurst';

export type CatchPhase = 'idle' | 'anticipation' | 'catch' | 'miss';

interface Props {
  speciesId: string;
  phase: CatchPhase;
  /** Species animation name override (optional). */
  animationName?: string;
}

/** Pet + its catch point, forwarded ref so parent can measure the incoming
 *  throw target. Also renders a short burst on correct catches. */
export const PetCatchZone = forwardRef<HTMLDivElement, Props>(
  ({ speciesId, phase, animationName }, ref) => {
    const [burst, setBurst] = useState(0);

    useEffect(() => {
      if (phase === 'catch') setBurst((n) => n + 1);
    }, [phase]);

    const reactionPhaseMap = {
      idle: 'idle' as const,
      anticipation: 'anticipation' as const,
      catch: 'reacting' as const,
      miss: 'reacting' as const,
    };

    const animName =
      animationName ??
      (phase === 'catch' ? 'happy' : phase === 'miss' ? 'hungry' : 'idle');

    return (
      <div className="relative flex flex-col items-center justify-end select-none">
        <div
          ref={ref}
          data-testid="catch-pet-zone"
          className={
            'relative ' +
            (phase === 'catch'
              ? 'anim-pop'
              : phase === 'miss'
              ? 'anim-wobble'
              : 'anim-breathe')
          }
          style={{
            transition: 'transform 150ms ease',
            transform:
              phase === 'anticipation'
                ? 'translateY(-2px) scale(1.02)'
                : phase === 'catch'
                ? 'translateY(-6px) scale(1.06)'
                : 'translateY(0) scale(1)',
          }}
        >
          <PetSprite
            speciesId={speciesId}
            animationName={animName}
            scale={1.35}
            reactionPhase={reactionPhaseMap[phase]}
            paused={false}
          />
          {burst > 0 && phase === 'catch' && (
            <ReactionBurst key={burst} emoji="⭐" count={10} duration={700} />
          )}
          {phase === 'miss' && (
            <div
              aria-hidden
              className="absolute inset-0 flex items-center justify-center"
              style={{ pointerEvents: 'none' }}
            >
              <span className="text-4xl" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.6))' }}>
                ❓
              </span>
            </div>
          )}
        </div>
      </div>
    );
  },
);
PetCatchZone.displayName = 'PetCatchZone';
