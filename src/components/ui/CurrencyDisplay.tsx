import React from 'react';

const TOKEN_ICON = '/assets/generated/final/icon_token.png';
const COIN_ICON = '/assets/generated/final/icon_coin.png';

interface CurrencyDisplayProps {
  amount: number;
  type?: 'energy' | 'coins' | 'mp';
  label?: string;
  className?: string;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  type = 'energy',
  label,
  className = '',
}) => {
  const colorClass = type === 'mp' ? 'text-blue-400' : type === 'energy' ? 'text-yellow-400' : 'text-amber-300';
  const iconSrc = type === 'mp' ? null : type === 'energy' ? TOKEN_ICON : COIN_ICON;

  return (
    <div className={`flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-full border-2 border-slate-700 shadow-inner ${className}`}>
      {iconSrc ? (
        <img src={iconSrc} alt={type} className="w-6 h-6 drop-shadow-md" style={{ imageRendering: 'pixelated' }} />
      ) : (
        <span className={`font-black text-sm ${colorClass}`}>{label ?? 'MP'}</span>
      )}
      <span className={`font-black text-lg ${colorClass} tracking-wider`}>
        {amount.toLocaleString()}
      </span>
    </div>
  );
};
