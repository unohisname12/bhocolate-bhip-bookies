import type React from 'react';
import type { TileTheme } from '../theme/MomentumTheme';

interface BoardCellProps {
  tileTheme: TileTheme;
  isValidMove: boolean;
  isAttackTarget: boolean;
  isSelected: boolean;
  isClutchTile?: boolean;
  isThreatened?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

export const BoardCell: React.FC<BoardCellProps> = ({
  tileTheme,
  isValidMove,
  isAttackTarget,
  isSelected,
  isClutchTile = false,
  isThreatened = false,
  onClick,
  children,
}) => {
  // Build highlight overlay based on cell state
  let highlightShadow = '';
  let highlightClass = '';

  if (isClutchTile) {
    highlightShadow = 'inset 0 0 14px rgba(251, 191, 36, 0.6), 0 0 8px rgba(251, 191, 36, 0.5)';
    highlightClass = 'momentum-clutch-pulse';
  } else if (isAttackTarget) {
    highlightShadow = `inset 0 0 12px ${tileTheme.highlightAttack}, 0 0 6px ${tileTheme.highlightAttack}`;
    highlightClass = 'momentum-valid-attack-pulse';
  } else if (isValidMove) {
    highlightShadow = `inset 0 0 10px ${tileTheme.highlightMove}, 0 0 4px ${tileTheme.highlightMove}`;
    highlightClass = 'momentum-valid-move-pulse';
  } else if (isThreatened) {
    highlightClass = 'momentum-incoming-threat';
  }

  if (isSelected) {
    const selectedGlow = 'inset 0 0 14px rgba(255,255,255,0.2)';
    highlightShadow = highlightShadow
      ? `${selectedGlow}, ${highlightShadow}`
      : selectedGlow;
  }

  // Combine base inset shadow with highlight shadows
  const combinedShadow = highlightShadow
    ? `${tileTheme.shadowInset}, ${highlightShadow}`
    : tileTheme.shadowInset;

  return (
    <div
      className={`
        relative flex items-center justify-center
        transition-all duration-150 cursor-pointer
        ${highlightClass}
        ${onClick ? 'hover:brightness-115' : ''}
      `}
      style={{
        background: tileTheme.baseColor,
        border: `1px solid ${tileTheme.borderColor}`,
        boxShadow: combinedShadow,
        aspectRatio: '1',
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
