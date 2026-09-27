import React from 'react';
import { GameCard } from '../ui/GameCard';
import { useLearningSettings } from '../LearningContext';
import { gradeLabel } from '../../services/game/curriculum';

interface MathPromptCardProps {
  question: string;
  difficulty?: number;
  reward?: number;
  className?: string;
  focusView?: boolean;
}

export const MathPromptCard: React.FC<MathPromptCardProps> = ({
  question,
  reward = 10,
  className = '',
  focusView = false,
}) => {
  const learning = useLearningSettings();
  return (
    <GameCard className={`text-center p-4 border-2 border-slate-600 relative overflow-hidden ${className}`}>
      {/* Decorative background grid */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
      
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
          <span>{focusView ? 'Your practice question' : gradeLabel(learning.grade)}</span>
          {!focusView && <span className="flex items-center gap-1 text-yellow-400">
            Reward: {reward} <img src="/assets/generated/final/icon_token.png" alt="" className="w-4 h-4 inline" style={{ imageRendering: 'pixelated' }} />
          </span>}
        </div>
        
        <div className="py-3">
          <h2 className={`${question.length > 25 ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl'} font-bold text-white leading-snug`}>
            {question}{/^[\d\s+−×÷.]+$/.test(question) ? ' = ?' : ''}
          </h2>
        </div>
      </div>
    </GameCard>
  );
};
