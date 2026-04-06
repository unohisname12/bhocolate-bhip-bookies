import type React from 'react';
import type { PieceTheme, BoardTheme } from '../theme/MomentumTheme';
import type { PieceRank } from '../../../types/momentum';
import { EnergyAura } from '../effects/EnergyAura';
import { RANK_ENERGY } from '../../../config/momentumConfig';

interface BoardPieceProps {
  team: 'player' | 'enemy';
  rank: PieceRank;
  energy: number;
  isSelected: boolean;
  isTemporaryRank4: boolean;
  pieceTheme: PieceTheme;
  boardTheme: BoardTheme;
  onClick?: () => void;
}

const RANK_SYMBOLS: Record<number, string> = {
  1: '',
  2: '\u2605',       // filled star
  3: '\u2605\u2605', // two filled stars
  4: '\u265B',       // crown (queen chess symbol)
};

export const BoardPiece: React.FC<BoardPieceProps> = ({
  team: _team,
  rank,
  energy,
  isSelected,
  isTemporaryRank4,
  pieceTheme,
  boardTheme,
  onClick,
}) => {
  const size = boardTheme.pieceScales[rank];
  const maxEnergy = RANK_ENERGY[rank]?.max ?? rank * 2;
  const badgeColor = boardTheme.rankBadgeColors[rank];

  return (
    <div
      className={`
        relative flex items-center justify-center cursor-pointer
        transition-all duration-200
        ${isSelected ? 'momentum-piece-selected scale-108' : ''}
      `}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {/* Ground shadow */}
      <div
        className="absolute bottom-0 left-1/2"
        style={{
          width: size * 0.8,
          height: size * 0.25,
          background: `radial-gradient(ellipse, ${pieceTheme.shadowColor} 0%, transparent 70%)`,
          borderRadius: '50%',
          transform: 'translateX(-50%) translateY(40%)',
        }}
      />

      {/* Spirit body with energy aura */}
      <EnergyAura energy={energy} maxEnergy={maxEnergy} glowColor={pieceTheme.glowColor}>
        <div
          className="relative rounded-full flex items-center justify-center"
          style={{
            width: size,
            height: size,
            background: pieceTheme.bodyGradient,
            border: `2px solid ${isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}`,
            boxShadow: isSelected
              ? `0 0 12px ${pieceTheme.glowColor}`
              : '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {/* CSS face -- two dot eyes */}
          <div className="flex gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
          </div>
        </div>
      </EnergyAura>

      {/* Rank badge (top-right) */}
      {rank >= 2 && (
        <div
          className="absolute -top-1 -right-1 text-[8px] font-black leading-none pointer-events-none"
          style={{
            color: badgeColor,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            ...(isTemporaryRank4
              ? { animation: 'momentum-rank4-glow 1.5s ease-in-out infinite' }
              : {}),
          }}
        >
          {RANK_SYMBOLS[rank]}
        </div>
      )}

      {/* Energy count (bottom) */}
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-white pointer-events-none"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
      >
        {energy}
      </div>
    </div>
  );
};
