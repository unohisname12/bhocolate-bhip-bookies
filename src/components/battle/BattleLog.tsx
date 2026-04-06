import React, { useEffect, useRef } from 'react';
import type { BattleLogEntry } from '../../types/battle';

interface BattleLogProps {
  entries: BattleLogEntry[];
}

export const BattleLog: React.FC<BattleLogProps> = ({ entries }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="h-36 overflow-y-auto rounded bg-slate-800 p-2 text-xs">
      {entries.map((entry, i) => (
        <p
          key={i}
          className={`mb-0.5 ${entry.actor === 'player' ? 'text-cyan-300' : 'text-red-300'}`}
        >
          {entry.message}
        </p>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
