import React, { useMemo, useState } from 'react';
import type { EngineState } from '../engine/core/EngineTypes';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import type { PetState } from '../types';
import type { ScreenName } from '../types/session';
import type { RoomId } from '../types/room';
import { ROOM_ORDER } from '../config/roomConfig';
import { NeedSliders } from './NeedSliders';

interface StateInspectorProps {
  state: EngineState;
  dispatch: (action: GameEngineAction) => void;
}

const GOD_MODE_CURRENCIES = { tokens: 99999, coins: 9999, mp: 9999, mpLifetime: 9999 };
const NORMAL_CURRENCIES = { tokens: 100, coins: 0, mp: 0, mpLifetime: 0 };

export const StateInspector: React.FC<StateInspectorProps> = ({ state, dispatch }) => {
  const [jsonDraft, setJsonDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isGodMode = state.player.currencies.tokens >= 99999;

  const toggleGodMode = () => {
    dispatch({
      type: 'DEV_SET_STATE',
      payload: { player: { ...state.player, currencies: isGodMode ? NORMAL_CURRENCIES : GOD_MODE_CURRENCIES } },
    });
  };

  const stateJson = useMemo(() => JSON.stringify(state, null, 2), [state]);

  const applyJsonPatch = () => {
    if (!jsonDraft.trim()) return;
    try {
      const payload = JSON.parse(jsonDraft) as Partial<EngineState>;
      dispatch({ type: 'DEV_SET_STATE', payload });
      setError(null);
      setJsonDraft('');
    } catch {
      setError('Invalid JSON patch payload');
    }
  };

  const onForceState = (value: string) => {
    dispatch({ type: 'DEV_FORCE_PET_STATE', payload: { state: value as PetState } });
  };

  const onJumpScreen = (value: string) => {
    dispatch({ type: 'DEV_JUMP_SCREEN', payload: value as ScreenName });
  };

  const onChangeRoom = (value: string) => {
    dispatch({ type: 'CHANGE_ROOM', roomId: value as RoomId });
  };

  return (
    <div className="space-y-3 text-xs">
      {/* God Mode toggle */}
      <button
        type="button"
        onClick={toggleGodMode}
        className={`w-full rounded px-3 py-2 font-black text-sm uppercase tracking-wider transition-all ${
          isGodMode
            ? 'bg-yellow-500 text-slate-900 shadow-[0_0_12px_rgba(234,179,8,0.5)]'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        {isGodMode ? 'GOD MODE ON — Click to Reset' : 'GOD MODE — Max All Currencies'}
      </button>

      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-slate-300">Force Pet State</span>
          <select
            className="w-full rounded bg-slate-800 px-2 py-1"
            value={state.pet?.state ?? 'idle'}
            onChange={(event) => onForceState(event.target.value)}
          >
            {['idle', 'sleeping', 'hungry', 'happy', 'sick', 'dead'].map((petState) => (
              <option key={petState} value={petState}>{petState}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-slate-300">Jump Screen</span>
          <select
            className="w-full rounded bg-slate-800 px-2 py-1"
            value={state.screen}
            onChange={(event) => onJumpScreen(event.target.value)}
          >
            {['incubation', 'home', 'math', 'feeding', 'battle', 'test'].map((screen) => (
              <option key={screen} value={screen}>{screen}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-slate-300">Current Room</span>
          <select
            className="w-full rounded bg-slate-800 px-2 py-1"
            value={state.currentRoom}
            onChange={(event) => onChangeRoom(event.target.value)}
          >
            {ROOM_ORDER.map((roomId) => (
              <option key={roomId} value={roomId}>{roomId}</option>
            ))}
          </select>
        </label>
      </div>

      <NeedSliders needs={state.pet?.needs ?? null} dispatch={dispatch} />

      <div className="space-y-1">
        <p className="text-slate-300">Deep Patch JSON (merged into EngineState)</p>
        <textarea
          value={jsonDraft}
          onChange={(event) => setJsonDraft(event.target.value)}
          placeholder='{"player":{"currencies":{"tokens":999}}}'
          className="h-20 w-full rounded bg-slate-800 p-2 font-mono text-[11px]"
        />
        <button
          type="button"
          onClick={applyJsonPatch}
          className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600"
        >
          Apply DEV_SET_STATE
        </button>
        {error && <p className="text-rose-300">{error}</p>}
      </div>

      <details>
        <summary className="cursor-pointer text-slate-300">Current EngineState JSON</summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-800 p-2 font-mono text-[10px]">{stateJson}</pre>
      </details>
    </div>
  );
};
