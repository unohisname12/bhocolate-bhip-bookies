import React from 'react';
import { GameCard } from '../ui/GameCard';

interface MathPromptCardProps {
  question: string;
  difficulty?: number;
  reward?: number;
  className?: string;
}

export const MathPromptCard: React.FC<MathPromptCardProps> = ({
  question,
  difficulty = 1,
  reward = 10,
  className = '',
}) => {
  return (
    <GameCard className={`text-center p-8 border-4 border-slate-600 shadow-2xl relative overflow-hidden ${className}`}>
      {/* Decorative background grid */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
      
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
          <span>Level {difficulty}</span>
          <span className="flex items-center gap-1 text-yellow-400">
            Reward: {reward} <img src="/assets/generated/final/icon_token.png" alt="" className="w-4 h-4 inline" style={{ imageRendering: 'pixelated' }} />
          </span>
        </div>
        
        <div className="py-6">
          <h2 className="text-5xl font-black text-white drop-shadow-md tracking-wider font-mono">
            {question} = ?
          </h2>
        </div>
      </div>
    </GameCard>
  );
};
