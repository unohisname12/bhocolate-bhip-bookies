import type React from 'react';
import { useState, useEffect } from 'react';
import type { BoardPosition, MomentumPiece } from '../../../types/momentum';
import type { BoardTheme } from '../theme/MomentumTheme';
import { BoardPiece } from '../board/BoardPiece';

interface PieceMoveAnimatorProps {
  piece: MomentumPiece;
  from: BoardPosition;
  to: BoardPosition;
  theme: BoardTheme;
  cellSize: number;        // size of each grid cell in px
  gridGap: number;
  onComplete: () => void;  // called when animation finishes
  durationMs?: number;
}

export const PieceMoveAnimator: React.FC<PieceMoveAnimatorProps> = ({
  piece,
  from,
  to,
  theme,
  cellSize,
  gridGap,
  onComplete,
  durationMs = 300,
}) => {
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    // Trigger CSS transition on next frame (component mounts with hasStarted=false
    // via fresh key from parent, so position starts at "from" coordinates)
    const raf = requestAnimationFrame(() => setHasStarted(true));
    const timer = setTimeout(onComplete, durationMs + 50); // small buffer
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [from.x, from.y, to.x, to.y, piece.id, onComplete, durationMs]);

  const fromX = from.x * (cellSize + gridGap);
  const fromY = from.y * (cellSize + gridGap);
  const toX = to.x * (cellSize + gridGap);
  const toY = to.y * (cellSize + gridGap);

  const currentX = hasStarted ? toX : fromX;
  const currentY = hasStarted ? toY : fromY;

  const pieceTheme = piece.team === 'player' ? theme.playerPiece : theme.enemyPiece;

  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{
        left: currentX,
        top: currentY,
        width: cellSize,
        height: cellSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: hasStarted
          ? `left ${durationMs}ms cubic-bezier(0.25, 1, 0.5, 1), top ${durationMs}ms cubic-bezier(0.25, 1, 0.5, 1)`
          : 'none',
      }}
    >
      <BoardPiece
        team={piece.team}
        rank={piece.rank}
        energy={piece.energy}
        isSelected={false}
        isTemporaryRank4={piece.isTemporaryRank4}
        pieceTheme={pieceTheme}
        boardTheme={theme}
      />
    </div>
  );
};
