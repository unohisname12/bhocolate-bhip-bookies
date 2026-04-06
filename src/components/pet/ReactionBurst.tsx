import React, { useEffect, useState } from 'react';

interface ReactionBurstProps {
  emoji: string;
  count?: number;
  duration?: number;
  onComplete?: () => void;
}

export const ReactionBurst: React.FC<ReactionBurstProps> = ({
  emoji,
  count = 10,
  duration = 1000,
  onComplete,
}) => {
  const [particles] = useState(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200 - 100,
        r: (Math.random() - 0.5) * 360,
      }))
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!particles.length) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute text-4xl drop-shadow-xl anim-pop"
          style={{
            transform: `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)`,
            transition: `transform ${duration}ms cubic-bezier(0.25, 1, 0.5, 1), opacity ${duration}ms ease-out`,
            opacity: 0,
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
};
