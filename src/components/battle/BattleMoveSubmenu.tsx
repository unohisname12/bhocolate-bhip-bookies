import React from 'react';
import type { BattleMove } from '../../types/battle';

interface BattleMoveSubmenuProps {
  moves: BattleMove[];
  energy: number;
  category: 'attack' | 'skill';
  onSelectMove: (moveId: string) => void;
  onBack: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  attack: 'from-red-700 to-red-900 border-red-500/30',
  special: 'from-purple-700 to-purple-900 border-purple-500/30',
  defend: 'from-blue-700 to-blue-900 border-blue-500/30',
  heal: 'from-emerald-700 to-emerald-900 border-emerald-500/30',
};

const TYPE_ICONS: Record<string, string> = {
  attack: '⚔️',
  special: '✨',
  defend: '🛡️',
  heal: '💚',
};

export const BattleMoveSubmenu: React.FC<BattleMoveSubmenuProps> = ({
  moves, energy, category, onSelectMove, onBack,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded bg-slate-700/50"
        >
          ← Back
        </button>
        <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">
          {category === 'attack' ? 'Attack Moves' : 'Skill Moves'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {moves.map((move) => {
          const canAfford = energy >= move.cost;
          const colors = TYPE_COLORS[move.type] ?? TYPE_COLORS.attack;

          return (
            <button
              key={move.id}
              onClick={() => onSelectMove(move.id)}
              disabled={!canAfford}
              className={`
                relative flex flex-col items-start rounded-xl p-2.5
                bg-gradient-to-b ${colors} border
                transition-all duration-150
                ${!canAfford ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:brightness-125 active:scale-[0.97]'}
              `}
            >
              <div className="flex items-center gap-1.5 w-full">
                <span className="text-sm">{TYPE_ICONS[move.type] ?? '⚔️'}</span>
                <span className="text-xs font-black text-white uppercase tracking-wide flex-1">
                  {move.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 w-full">
                {move.power > 0 && (
                  <span className="text-[9px] text-white/70 font-bold">PWR {move.power}</span>
                )}
                <span className="text-[9px] text-yellow-300/80 font-bold ml-auto">{move.cost} ⚡</span>
              </div>
              <p className="text-[8px] text-white/40 mt-0.5 leading-tight">{move.description}</p>
              {!canAfford && (
                <span className="text-[8px] text-red-400 font-bold mt-0.5">Not enough energy!</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
