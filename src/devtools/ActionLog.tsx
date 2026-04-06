import React, { useEffect, useMemo, useState } from 'react';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import type { GameEngine } from '../engine/core/GameEngine';

interface ActionLogProps {
  engine: GameEngine;
}

interface ActionEntry {
  timestamp: number;
  action: GameEngineAction;
}

export const ActionLog: React.FC<ActionLogProps> = ({ engine }) => {
  const [filter, setFilter] = useState('');
  const [entries, setEntries] = useState<ActionEntry[]>(() => {
    const log = engine.getActionLog();
    const now = Date.now();
    return log.map((action, idx) => ({
      action,
      timestamp: now - (log.length - idx),
    }));
  });

  useEffect(() => {
    const unsubscribe = engine.onAction((action) => {
      setEntries((prev) => {
        const next = [...prev, { action, timestamp: Date.now() }];
        return next.length > 100 ? next.slice(next.length - 100) : next;
      });
    });
    return () => unsubscribe();
  }, [engine]);

  const filteredEntries = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => entry.action.type.toLowerCase().includes(needle));
  }, [entries, filter]);

  return (
    <div className="space-y-2 text-xs">
      <div className="flex gap-2">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter by action type"
          className="w-full rounded bg-slate-800 px-2 py-1"
        />
        <button
          type="button"
          onClick={() => setEntries([])}
          className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600"
        >
          Clear
        </button>
      </div>

      <div className="max-h-64 overflow-auto rounded bg-slate-800 p-2">
        {filteredEntries.map((entry, index) => (
          <details key={`${entry.timestamp}_${index}`} className="mb-1">
            <summary className="cursor-pointer font-mono text-[11px]">
              {new Date(entry.timestamp).toLocaleTimeString()} - {entry.action.type}
            </summary>
            <pre className="mt-1 overflow-auto rounded bg-slate-900 p-2 text-[10px]">
              {JSON.stringify(entry.action, null, 2)}
            </pre>
          </details>
        ))}
      </div>
    </div>
  );
};
