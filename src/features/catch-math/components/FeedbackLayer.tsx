import React, { useEffect, useState } from 'react';

export interface FeedbackEvent {
  kind: 'correct' | 'wrong';
  text: string;
  key: number;
}

interface Props {
  event: FeedbackEvent | null;
}

export const FeedbackLayer: React.FC<Props> = ({ event }) => {
  const [shown, setShown] = useState<FeedbackEvent | null>(null);

  useEffect(() => {
    if (!event) return;
    setShown(event);
    const t = window.setTimeout(() => setShown(null), 1200);
    return () => window.clearTimeout(t);
  }, [event]);

  if (!shown) return null;

  const color = shown.kind === 'correct' ? '#86efac' : '#fca5a5';

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none anim-pop"
      data-testid="catch-feedback"
      style={{
        top: '42%',
        zIndex: 70,
      }}
    >
      <div
        className="font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full"
        style={{
          color: '#0a0604',
          background: `linear-gradient(180deg, ${color}, ${color}cc)`,
          border: '2px solid rgba(0,0,0,0.5)',
          boxShadow: `0 0 20px ${color}88`,
          fontSize: 14,
        }}
      >
        {shown.text}
      </div>
    </div>
  );
};
