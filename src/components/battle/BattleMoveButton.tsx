import React from 'react';
import { GameIcon } from '../ui/GameIcon';
import type { BattleMove } from '../../types/battle';

interface BattleMoveButtonProps {
  move: BattleMove;
  energy: number;
  onClick: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  attack: 'bg-red-700 border-red-900 hover:bg-red-600',
  defend: 'bg-blue-700 border-blue-900 hover:bg-blue-600',
  heal: 'bg-green-700 border-green-900 hover:bg-green-600',
  special: 'bg-purple-700 border-purple-900 hover:bg-purple-600',
};

const TYPE_ICONS: Record<string, string> = {
  attack: '/assets/generated/final/effect_hit.png',
  defend: '🛡️',
  heal: '/assets/generated/final/effect_heal.png',
  special: '/assets/generated/final/effect_sparkle.png',
};

export const BattleMoveButton: React.FC<BattleMoveButtonProps> = ({ move, energy, onClick }) => {
  const canAfford = energy >= move.cost;
  const colorClass = TYPE_COLORS[move.type] ?? TYPE_COLORS.attack;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canAfford}
      className={`flex flex-col items-start p-2 rounded-xl border-2 text-left transition-all active:scale-95 ${
        canAfford ? colorClass : 'bg-slate-800 border-slate-700 opacity-40 cursor-not-allowed'
      }`}
    >
      <div className="flex items-center gap-1 font-bold text-sm text-white">
        <GameIcon icon={TYPE_ICONS[move.type]} size="w-4 h-4" />
        <span>{move.name}</span>
      </div>
      <div className="flex gap-2 text-xs text-slate-300 mt-0.5">
        {move.power > 0 && <span>PWR {move.power}</span>}
        <span className="flex items-center gap-0.5">{move.cost}<img src="/assets/generated/final/icon_token.png" alt="" className="w-3 h-3 inline" style={{ imageRendering: 'pixelated' }} /></span>
      </div>
    </button>
  );
};
