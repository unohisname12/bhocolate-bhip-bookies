import React, { useEffect, useMemo, useState } from 'react';
import type { EngineState } from '../engine/core/EngineTypes';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import type { GameEngine } from '../engine/core/GameEngine';
import { TimeControl } from './TimeControl';
import { StateInspector } from './StateInspector';
import { SpriteDebugger } from './SpriteDebugger';
import { ActionLog } from './ActionLog';
import { SnapshotManager } from './SnapshotManager';

type Tab = 'State' | 'Time' | 'Sprite' | 'Actions' | 'Snapshots';

interface DevToolsOverlayProps {
  engine: GameEngine;
  state: EngineState;
  dispatch: (action: GameEngineAction) => void;
}

export const DevToolsOverlay: React.FC<DevToolsOverlayProps> = ({ engine, state, dispatch }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('State');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const tabs = useMemo(() => ['State', 'Time', 'Sprite', 'Actions', 'Snapshots'] as Tab[], []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] rounded bg-slate-800/95 px-3 py-2 text-xs text-slate-100 shadow-lg hover:bg-slate-700"
      >
        DevTools (Ctrl+Shift+D)
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[360px] rounded-lg border border-slate-700 bg-slate-900/95 p-3 text-slate-100 shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <strong className="text-sm">Dev Tools</strong>
        <button type="button" onClick={() => setOpen(false)} className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600">
          Close
        </button>
      </div>

      <div className="mb-3 flex gap-1">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded px-2 py-1 text-xs ${tab === item ? 'bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'State' && <StateInspector state={state} dispatch={dispatch} />}
      {tab === 'Time' && <TimeControl engine={engine} state={state} dispatch={dispatch} />}
      {tab === 'Sprite' && <SpriteDebugger state={state} />}
      {tab === 'Actions' && <ActionLog engine={engine} />}
      {tab === 'Snapshots' && <SnapshotManager state={state} dispatch={dispatch} />}
    </div>
  );
};
