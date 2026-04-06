import React from 'react';

interface StakeDisplayProps {
  stake: number;
  playerTokens: number;
  difficulty: 'easier' | 'even' | 'harder';
}

export const StakeDisplay: React.FC<StakeDisplayProps> = ({ stake, playerTokens, difficulty }) => {
  const isReduced = difficulty === 'easier';

  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-300">Token Stake</span>
        <span className="text-lg font-black text-amber-400 flex items-center gap-1">{stake} <img src="/assets/generated/final/icon_token.png" alt="" className="w-5 h-5 inline" style={{ imageRendering: 'pixelated' }} /></span>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1">Win: +{stake} <img src="/assets/generated/final/icon_token.png" alt="" className="w-3 h-3 inline" style={{ imageRendering: 'pixelated' }} /></span>
        <span className="flex items-center gap-1">Lose: -{stake} <img src="/assets/generated/final/icon_token.png" alt="" className="w-3 h-3 inline" style={{ imageRendering: 'pixelated' }} /></span>
      </div>
      <div className="text-xs text-slate-500 flex items-center gap-1">
        Your balance: {playerTokens} <img src="/assets/generated/final/icon_token.png" alt="" className="w-3 h-3 inline" style={{ imageRendering: 'pixelated' }} />
      </div>
      {isReduced && (
        <div className="text-xs text-yellow-500 font-bold mt-1">
          Reduced rewards — opponent is lower level
        </div>
      )}
    </div>
  );
};
