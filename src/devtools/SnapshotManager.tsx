import React, { useMemo, useState } from 'react';
import type { EngineState } from '../engine/core/EngineTypes';
import type { GameEngineAction } from '../engine/core/ActionTypes';

interface SnapshotManagerProps {
  state: EngineState;
  dispatch: (action: GameEngineAction) => void;
}

interface SnapshotEntry {
  name: string;
  timestamp: number;
  state: EngineState;
}

const SNAPSHOT_KEY = 'vpet_dev_snapshots';

const readSnapshots = (): SnapshotEntry[] => {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SnapshotEntry[];
  } catch {
    return [];
  }
};

const writeSnapshots = (entries: SnapshotEntry[]): void => {
  sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(entries));
};

export const SnapshotManager: React.FC<SnapshotManagerProps> = ({ state, dispatch }) => {
  const [name, setName] = useState('snapshot-1');
  const [importJson, setImportJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const snapshots = useMemo(() => readSnapshots(), [version]); // eslint-disable-line react-hooks/exhaustive-deps -- version is a manual refresh counter

  const refresh = () => setVersion((v) => v + 1);

  const saveSnapshot = () => {
    const entry: SnapshotEntry = {
      name: name.trim() || `snapshot-${Date.now()}`,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state)) as EngineState,
    };
    const next = [entry, ...snapshots.filter((item) => item.name !== entry.name)].slice(0, 25);
    writeSnapshots(next);
    dispatch({ type: 'DEV_SNAPSHOT_SAVE', payload: { name: entry.name } });
    refresh();
  };

  const loadSnapshot = (entry: SnapshotEntry) => {
    dispatch({ type: 'DEV_SET_STATE', payload: entry.state });
    dispatch({ type: 'DEV_SNAPSHOT_LOAD', payload: { name: entry.name } });
  };

  const deleteSnapshot = (entry: SnapshotEntry) => {
    const next = snapshots.filter((item) => item.name !== entry.name);
    writeSnapshots(next);
    refresh();
  };

  const exportSnapshot = (entry: SnapshotEntry) => {
    setImportJson(JSON.stringify(entry, null, 2));
  };

  const importSnapshot = () => {
    try {
      const parsed = JSON.parse(importJson) as SnapshotEntry;
      if (!parsed || !parsed.state) {
        setError('Invalid snapshot format');
        return;
      }
      const next = [parsed, ...snapshots.filter((item) => item.name !== parsed.name)].slice(0, 25);
      writeSnapshots(next);
      setError(null);
      refresh();
    } catch {
      setError('Invalid JSON');
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded bg-slate-800 px-2 py-1"
          placeholder="Snapshot name"
        />
        <button type="button" onClick={saveSnapshot} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">
          Save
        </button>
      </div>

      <div className="max-h-44 space-y-1 overflow-auto rounded bg-slate-800 p-2">
        {snapshots.map((entry) => (
          <div key={entry.name} className="rounded bg-slate-900 p-2">
            <div className="mb-1 flex items-center justify-between">
              <strong>{entry.name}</strong>
              <span>{new Date(entry.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => loadSnapshot(entry)} className="rounded bg-cyan-700 px-2 py-1">Load</button>
              <button type="button" onClick={() => exportSnapshot(entry)} className="rounded bg-slate-700 px-2 py-1">Export</button>
              <button type="button" onClick={() => deleteSnapshot(entry)} className="rounded bg-rose-700 px-2 py-1">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <textarea
        value={importJson}
        onChange={(event) => setImportJson(event.target.value)}
        className="h-24 w-full rounded bg-slate-800 p-2 font-mono text-[10px]"
        placeholder="Paste exported snapshot JSON here"
      />
      <button type="button" onClick={importSnapshot} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">
        Import JSON
      </button>
      {error && <p className="text-rose-300">{error}</p>}
    </div>
  );
};
