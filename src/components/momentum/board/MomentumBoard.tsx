import {MATH_POWERS} from '../../../engine/systems/MomentumPowers';
import { ENERGY_STATIONS } from '../../../config/momentumConfig';
import type React from 'react';
import type { ActiveMomentumState } from '../../../types/momentum';
import type { BoardTheme } from '../theme/MomentumTheme';
import { DEFAULT_THEME } from '../theme/MomentumTheme';
import { BoardCell } from './BoardCell';
import { BoardPiece } from './BoardPiece';

interface MomentumBoardProps {
  state: ActiveMomentumState;
  boardSize?: number;
  theme?: BoardTheme;
  onCellClick: (x: number, y: number) => void;
  onPieceClick: (pieceId: string) => void;
  /** Signals a one-shot promotion burst on the piece with this id. */
  promoteFx?: { pieceId: string; key: number } | null;
  /** Cells that are threatened by the enemy on its upcoming turn. */
  threatenedPieceIds?: Set<string>;
}

export const MomentumBoard: React.FC<MomentumBoardProps> = ({
  state,
  boardSize = 320,
  theme = DEFAULT_THEME,
  onCellClick,
  onPieceClick,
  promoteFx = null,
  threatenedPieceIds,
}) => {
  const { pieces, board, selectedPieceId, validMoves, phase, clutchTile } = state;
  const size = board.length;
  const isInteractive = phase === 'player_select' || phase === 'player_move';

  return (
    <div
      className="momentum-board-frame relative"
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
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
          gap: `${theme.gridGap}px`,
          width: boardSize,
          height: boardSize,
        }}
      >
        {Array.from({ length: size * size }, (_, idx) => {
          const y = Math.floor(idx / size);
          const x = idx % size;
          const station = state.mode === 'advanced' && ENERGY_STATIONS.some(t => t.x === x && t.y === y);
          const tileType = theme.tileLayout[y]?.[x] ?? 'grass';
          const tileTheme = theme.tileTypes[station ? 'crystal' : tileType] ?? theme.tileTypes.grass;

          const pieceId = board[y]?.[x];
          const piece = pieceId ? pieces.find(p => p.id === pieceId) : null;
          const isValidMove = validMoves.some(
            m => m.destination.x === x && m.destination.y === y && !m.isAttack
          );
          const isAttackTarget = validMoves.some(
            m => m.destination.x === x && m.destination.y === y && m.isAttack
          );
          const move = validMoves.find(m => m.destination.x === x && m.destination.y === y);
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

          const isThreatened = piece != null && threatenedPieceIds?.has(piece.id) === true;

          return (
            <BoardCell
              key={`${x}-${y}`}
              position={`${x},${y}`}
              label={`${piece ? `${piece.team === 'player' ? 'Your' : 'Opponent'} ${piece.mathPower?MATH_POWERS[piece.mathPower].name:`rank ${piece.rank} piece`}, energy ${piece.energy}` : 'Empty square'}, row ${y + 1}, column ${x + 1}${isValidMove ? ', available move' : isAttackTarget ? ', available capture' : ''}${move ? `, costs ${move.energyCost} energy` : ''}${station ? ', energy station' : ''}${piece?.guarded ? ', guarded' : ''}`}
              tileTheme={tileTheme}
              isValidMove={isValidMove}
              isAttackTarget={isAttackTarget}
              isSelected={isSelected}
              isClutchTile={isClutchTile}
              isThreatened={isThreatened}
              onClick={isInteractive ? handleClick : undefined}
            >
              {station && <span className="absolute top-0 left-0 text-sm z-10" aria-hidden="true">⚡</span>}
              {piece?.guarded && <span className="absolute top-0 right-0 text-xs z-10" aria-hidden="true">🛡</span>}
              {move && <span className="absolute bottom-0 right-0 rounded bg-slate-950 text-white text-xs px-1 z-20" aria-hidden="true">{move.isAttack ? '× ' : ''}{move.energyCost}</span>}
              
              {piece && <div style={{transform: `scale(${Math.min(1,(boardSize / size - 9)/58)})`}}>
                <BoardPiece
                  mathPower={piece.mathPower}
                  team={piece.team}
                  rank={piece.rank}
                  energy={piece.energy}
                  isSelected={isSelected}
                  isTemporaryRank4={piece.isTemporaryRank4}
                  pieceTheme={
                    piece.team === 'player' ? theme.playerPiece : theme.enemyPiece
                  }
                  boardTheme={theme}
                  promoteKey={promoteFx?.pieceId === piece.id ? promoteFx.key : null}
                />
              </div>}
            </BoardCell>
          );
        })}
      </div>
    </div>
  );
};
