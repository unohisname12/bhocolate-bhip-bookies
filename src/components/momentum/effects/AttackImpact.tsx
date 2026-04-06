import type React from 'react';
import { useState, useEffect } from 'react';
import type { BoardPosition } from '../../../types/momentum';

interface AttackImpactProps {
  position: BoardPosition;
  cellSize: number;
  gridGap: number;
  teamColor: string;       // color for floating text and burst
  onComplete: () => void;
}

export const AttackImpact: React.FC<AttackImpactProps> = ({
  position,
  cellSize,
  gridGap,
  teamColor,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'burst' | 'text' | 'done'>('burst');

  useEffect(() => {
    const burstTimer = setTimeout(() => setPhase('text'), 400);
    const doneTimer = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 1200);
    return () => {
      clearTimeout(burstTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  if (phase === 'done') return null;

  const x = position.x * (cellSize + gridGap);
  const y = position.y * (cellSize + gridGap);

  return (
    <>
      {/* Impact burst */}
      {phase === 'burst' && (
        <div
          className="absolute z-20 pointer-events-none momentum-impact-burst"
          style={{
            left: x + cellSize / 2 - 20,
            top: y + cellSize / 2 - 20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${teamColor} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Floating "CAPTURED!" text */}
      <div
        className="absolute z-30 pointer-events-none momentum-float-text"
        style={{
          left: x,
          top: y - 10,
          width: cellSize,
          textAlign: 'center',
        }}
      >
        <span
          className="text-xs font-black uppercase"
          style={{
            color: teamColor,
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          }}
        >
          Captured!
        </span>
      </div>
    </>
  );
};
