import type React from 'react';
import type { ActiveMomentumState } from '../../../types/momentum';
import type { BoardTheme } from '../theme/MomentumTheme';
import { DEFAULT_THEME } from '../theme/MomentumTheme';
import { BoardCell } from './BoardCell';
import { BoardPiece } from './BoardPiece';

interface MomentumBoardProps {
  state: ActiveMomentumState;
  theme?: BoardTheme;
  onCellClick: (x: number, y: number) => void;
  onPieceClick: (pieceId: string) => void;
}

export const MomentumBoard: React.FC<MomentumBoardProps> = ({
  state,
  theme = DEFAULT_THEME,
  onCellClick,
  onPieceClick,
}) => {
  const { pieces, board, selectedPieceId, validMoves, phase, clutchTile } = state;
  const isInteractive = phase === 'player_select' || phase === 'player_move';

  return (
    <div
      className="relative"
      style={{
        background: theme.boardBg,
        border: theme.boardBorder,
        boxShadow: theme.boardShadow,
        borderRadius: '12px',
        padding: '8px',
      }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridTemplateRows: 'repeat(5, 1fr)',
          gap: `${theme.gridGap}px`,
          width: '320px',
          height: '320px',
        }}
      >
        {Array.from({ length: 25 }, (_, idx) => {
          const y = Math.floor(idx / 5);
          const x = idx % 5;
          const tileType = theme.tileLayout[y]?.[x] ?? 'grass';
          const tileTheme = theme.tileTypes[tileType] ?? theme.tileTypes.grass;

          const pieceId = board[y]?.[x];
          const piece = pieceId ? pieces.find(p => p.id === pieceId) : null;
          const isValidMove = validMoves.some(
            m => m.destination.x === x && m.destination.y === y && !m.isAttack
          );
          const isAttackTarget = validMoves.some(
            m => m.destination.x === x && m.destination.y === y && m.isAttack
          );
          const isSelected = piece?.id === selectedPieceId;
          const isClutchTile = clutchTile !== null && clutchTile.x === x && clutchTile.y === y;

          const handleClick = () => {
            if (!isInteractive) return;
            if (piece && piece.team === state.activeTeam && phase === 'player_select') {
              onPieceClick(piece.id);
            } else if (piece && piece.team === state.activeTeam && phase === 'player_move' && !isSelected) {
              // Switch selection to another friendly piece
              onPieceClick(piece.id);
            } else if (isValidMove || isAttackTarget) {
              onCellClick(x, y);
            } else if (isSelected && piece) {
              // Deselect current piece
              onPieceClick(piece.id);
            }
          };

          return (
            <BoardCell
              key={`${x}-${y}`}
              tileTheme={tileTheme}
              isValidMove={isValidMove}
              isAttackTarget={isAttackTarget}
              isSelected={isSelected}
              isClutchTile={isClutchTile}
              onClick={isInteractive ? handleClick : undefined}
            >
              {piece && (
                <BoardPiece
                  team={piece.team}
                  rank={piece.rank}
                  energy={piece.energy}
                  isSelected={isSelected}
                  isTemporaryRank4={piece.isTemporaryRank4}
                  pieceTheme={
                    piece.team === 'player' ? theme.playerPiece : theme.enemyPiece
                  }
                  boardTheme={theme}
                  onClick={isInteractive ? () => onPieceClick(piece.id) : undefined}
                />
              )}
            </BoardCell>
          );
        })}
      </div>
    </div>
  );
};
