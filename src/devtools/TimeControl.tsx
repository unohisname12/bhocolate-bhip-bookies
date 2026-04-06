import React from 'react';
import type { EngineState } from '../engine/core/EngineTypes';
import type { GameEngine } from '../engine/core/GameEngine';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { TICK_INTERVAL_MS } from '../config/gameConfig';

interface TimeControlProps {
  engine: GameEngine;
  state: EngineState;
  dispatch: (action: GameEngineAction) => void;
}

export const TimeControl: React.FC<TimeControlProps> = ({ engine, state, dispatch }) => {
  const setSpeed = (multiplier: number) => {
    const nextTick = Math.max(1, Math.floor(TICK_INTERVAL_MS / multiplier));
    engine.setTickInterval(nextTick);
    engine.resume(nextTick);
    dispatch({ type: 'DEV_SET_SPEED', payload: { tickIntervalMs: nextTick } });
  };

  const handlePause = () => engine.pause();
  const handlePlay = () => engine.resume(TICK_INTERVAL_MS);
  const handleStep = () => {
    engine.pause();
    engine.tick(TICK_INTERVAL_MS);
  };

  return (
    <div className="space-y-2 text-xs text-slate-100">
      <div className="grid grid-cols-5 gap-1">
        <button type="button" onClick={handlePause} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">Pause</button>
        <button type="button" onClick={handlePlay} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">Play</button>
        <button type="button" onClick={handleStep} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">Step</button>
        <button type="button" onClick={() => setSpeed(2)} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">2x</button>
        <button type="button" onClick={() => setSpeed(10)} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">10x</button>
      </div>

      <div className="rounded bg-slate-800 p-2 font-mono text-[11px]">
        <div>tickCount: {state.tickCount}</div>
        <div>elapsedMs: {Math.floor(state.elapsedMs)}</div>
        <div>deltaMs per step: {TICK_INTERVAL_MS}</div>
      </div>
    </div>
  );
};
