import React from 'react';
import { GameIcon } from './GameIcon';

interface IconBadgeProps {
  icon: string;
  label: string;
  value?: string | number;
  color?: string;
  onClick?: () => void;
  className?: string;
}

export const IconBadge: React.FC<IconBadgeProps> = ({
  icon,
  label,
  value,
  color = 'bg-slate-700 text-slate-200 border-slate-600',
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center p-3 rounded-2xl
        border-b-4 transition-all duration-200
        ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:brightness-110 active:translate-y-0 active:border-b-0 mt-1 mb-0' : 'border-b-4'}
        ${color}
        ${className}
      `}
      style={onClick ? { marginBottom: '4px' } : undefined}
    >
      <GameIcon icon={icon} size="w-8 h-8" className="text-3xl drop-shadow-md mb-1" />
      <span className="text-xs font-bold uppercase tracking-wide opacity-90">{label}</span>
      {value !== undefined && (
        <span className="text-sm font-black mt-1 bg-black/20 px-2 py-0.5 rounded-md">
          {value}
        </span>
      )}
    </div>
  );
};
