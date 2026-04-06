import React from 'react';
import type { ActiveRunState } from '../types/run';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { getEventById } from '../config/runEventConfig';
import { getNodeById } from '../engine/systems/RunMapGenerator';

interface RunEventScreenProps {
  run: ActiveRunState;
  dispatch: (action: GameEngineAction) => void;
}

export const RunEventScreen: React.FC<RunEventScreenProps> = ({ run, dispatch }) => {
  const currentNode = run.currentNodeId ? getNodeById(run.map, run.currentNodeId) : null;
  const event = currentNode?.eventId ? getEventById(currentNode.eventId) : null;
  const hpPercent = Math.round(run.playerHPPercent * 100);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">
        <p className="text-slate-500">No event found.</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #12081f 40%, #0a0a12 100%)' }}
    >
      {/* Atmospheric glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 35%, rgba(140,100,220,0.08) 0%, transparent 60%)',
      }} />

      {/* Top label */}
      <div className="relative z-10 px-4 pt-4 text-center">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/60">
          Event
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Event icon */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{
          background: 'radial-gradient(circle, rgba(100,70,180,0.25) 0%, rgba(40,25,60,0.4) 100%)',
          border: '1px solid rgba(140,100,220,0.2)',
          boxShadow: '0 0 24px rgba(100,70,180,0.15)',
        }}>
          <span className="text-2xl">?</span>
        </div>

        {/* Title */}
        <h2
          className="text-xl font-black uppercase tracking-wide mb-2 text-center"
          style={{
            textShadow: '0 0 12px rgba(140,100,220,0.4), 0 2px 4px rgba(0,0,0,0.8)',
            color: '#c4b5fd',
          }}
        >
          {event.title}
        </h2>

        {/* Description */}
        <p className="text-slate-400 text-xs mb-8 max-w-[300px] text-center leading-relaxed">
          {event.description}
        </p>

        {/* HP display */}
        <div
          className="w-full max-w-xs rounded-lg p-2.5 mb-6"
          style={{
            background: 'linear-gradient(180deg, rgba(20,15,30,0.9) 0%, rgba(15,10,25,0.95) 100%)',
            border: '1px solid rgba(80,60,120,0.2)',
          }}
        >
          <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            <span>HP</span>
            <span className={hpPercent <= 25 ? 'text-red-400' : hpPercent <= 50 ? 'text-yellow-400' : 'text-green-400'}>
              {hpPercent}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${hpPercent}%`, transition: 'width 0.3s ease' }}
            />
          </div>
        </div>

        {/* Choice buttons */}
        <div className="w-full max-w-xs flex flex-col gap-2.5">
          {event.choices.map((choice, idx) => (
            <button
              key={idx}
              onClick={() => dispatch({ type: 'EVENT_CHOOSE', choiceIndex: idx })}
              className="w-full rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 group"
              style={{
                background: idx === 0
                  ? 'linear-gradient(180deg, rgba(25,15,40,0.95) 0%, rgba(18,10,30,0.98) 100%)'
                  : 'linear-gradient(180deg, rgba(20,20,25,0.95) 0%, rgba(15,15,20,0.98) 100%)',
                border: idx === 0
                  ? '1px solid rgba(140,100,220,0.25)'
                  : '1px solid rgba(80,80,100,0.2)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
              }}
            >
              <div className={`text-sm font-black mb-0.5 ${idx === 0 ? 'text-violet-300' : 'text-slate-300'}`}>
                {choice.label}
              </div>
              <div className="text-[9px] text-slate-500 leading-tight">
                {choice.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
};
