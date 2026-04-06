import type React from 'react';
import type { ActiveMomentumState } from '../../../types/momentum';
import { DIFFICULTY_SETTINGS } from '../../../config/momentumConfig';

interface MomentumHUDProps {
  state: ActiveMomentumState;
}

export const MomentumHUD: React.FC<MomentumHUDProps> = ({ state }) => {
  const settings = DIFFICULTY_SETTINGS[state.difficulty];
  const playerCount = state.pieces.filter(p => p.team === 'player').length;
  const enemyCount = state.pieces.filter(p => p.team === 'enemy').length;
  const isPlayerTurn = state.activeTeam === 'player';
  const isAnimating = state.phase.startsWith('animating');
  const isFlash = state.phase === 'flash_sequence' || state.phase === 'flash_choice';

  const turnLabel = isFlash
    ? 'FLASH!'
    : isAnimating
      ? (isPlayerTurn ? 'Your move...' : 'Enemy moving...')
      : isPlayerTurn
        ? 'YOUR TURN'
        : 'ENEMY TURN';

  const turnColor = isFlash
    ? 'text-yellow-300'
    : isPlayerTurn
      ? 'text-cyan-300'
      : 'text-red-300';

  const turnGlow = isFlash
    ? 'shadow-[0_0_8px_rgba(253,224,71,0.4)]'
    : isPlayerTurn
      ? 'shadow-[0_0_8px_rgba(103,232,249,0.3)]'
      : 'shadow-[0_0_8px_rgba(252,165,165,0.3)]';

  return (
    <div className="w-full max-w-md">
      {/* Turn indicator banner */}
      <div className={`flex items-center justify-center py-1.5 rounded-t-xl ${isPlayerTurn ? 'bg-cyan-900/40' : 'bg-red-900/40'} ${isFlash ? 'bg-yellow-900/40' : ''}`}>
        <span className={`text-xs font-black uppercase tracking-[0.2em] ${turnColor} ${isFlash ? 'animate-pulse' : ''}`}>
          {turnLabel}
        </span>
      </div>

      {/* Stats bar */}
      <div className={`flex items-center justify-between px-4 py-2 bg-slate-900/90 border border-slate-700/50 rounded-b-xl ${turnGlow}`}>
        {/* Player side */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full border-2 transition-all ${isPlayerTurn ? 'bg-cyan-400 border-cyan-300 scale-110' : 'bg-slate-700 border-slate-600'}`} />
          <span className={`font-bold ${isPlayerTurn ? 'text-cyan-300' : 'text-slate-500'}`}>You</span>
          <span className="text-slate-400 text-sm">×{playerCount}</span>
        </div>

        {/* Turn counter + difficulty */}
        <div className="text-slate-400 text-xs text-center">
          <div>
            Turn <span className="text-white font-bold">{state.turnCount}</span>
            <span className="text-slate-600">/{settings.maxTurns}</span>
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">{settings.label}</div>
        </div>

        {/* Enemy side */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">×{enemyCount}</span>
          <span className={`font-bold ${!isPlayerTurn ? 'text-red-300' : 'text-slate-500'}`}>Enemy</span>
          <div className={`w-3 h-3 rounded-full border-2 transition-all ${!isPlayerTurn && !isFlash ? 'bg-red-400 border-red-300 scale-110' : 'bg-slate-700 border-slate-600'}`} />
        </div>
      </div>
    </div>
  );
};
