import React from 'react';

interface GameCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ children, className = '', glow = false }) => {
  return (
    <div
      className={`
        bg-slate-800/80 backdrop-blur-md 
        border-2 border-slate-700 
        rounded-2xl p-4 
        shadow-lg
        ${glow ? 'shadow-[0_0_15px_rgba(59,130,246,0.3)] border-blue-500/50' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
