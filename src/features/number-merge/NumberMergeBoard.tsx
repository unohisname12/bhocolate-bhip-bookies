import type React from 'react';
import { isAdjacent } from './game';
import type {
  NumberMergeBoard as BoardState,
  NumberMergePosition,
} from './types';

interface NumberMergeBoardProps {
  board: BoardState;
  selected: NumberMergePosition | null;
  unstableCells: NumberMergePosition[];
  lastCreatedTileId: string | null;
  petBonusTileId: string | null;
  lastOverseerPositions: NumberMergePosition[];
  onTileActivate: (position: NumberMergePosition) => void;
  onArrowMerge: (position: NumberMergePosition) => void;
}

const ARROW_DIRECTIONS = [
  { id: 'up', label: 'Up', glyph: '↑', rowOffset: -1, colOffset: 0, style: { top: 6, left: '50%', transform: 'translateX(-50%)' } },
  { id: 'right', label: 'Right', glyph: '→', rowOffset: 0, colOffset: 1, style: { top: '50%', right: 6, transform: 'translateY(-50%)' } },
  { id: 'down', label: 'Down', glyph: '↓', rowOffset: 1, colOffset: 0, style: { bottom: 6, left: '50%', transform: 'translateX(-50%)' } },
  { id: 'left', label: 'Left', glyph: '←', rowOffset: 0, colOffset: -1, style: { top: '50%', left: 6, transform: 'translateY(-50%)' } },
] as const;

const includesPosition = (positions: NumberMergePosition[], target: NumberMergePosition): boolean =>
  positions.some((position) => position.row === target.row && position.col === target.col);

const getTileTone = (value: number): { background: string; shadow: string; text: string } => {
  if (value <= 2) {
    return {
      background: 'linear-gradient(180deg, #fef3c7 0%, #f59e0b 100%)',
      shadow: '0 10px 24px rgba(245,158,11,0.28)',
      text: '#422006',
    };
  }

  if (value <= 5) {
    return {
      background: 'linear-gradient(180deg, #dbeafe 0%, #3b82f6 100%)',
      shadow: '0 10px 24px rgba(59,130,246,0.3)',
      text: '#eff6ff',
    };
  }

  if (value <= 10) {
    return {
      background: 'linear-gradient(180deg, #dcfce7 0%, #16a34a 100%)',
      shadow: '0 10px 26px rgba(22,163,74,0.3)',
      text: '#f0fdf4',
    };
  }

  return {
    background: 'linear-gradient(180deg, #fde68a 0%, #ea580c 100%)',
    shadow: '0 10px 28px rgba(234,88,12,0.32)',
    text: '#fff7ed',
  };
};

export const NumberMergeBoard: React.FC<NumberMergeBoardProps> = ({
  board,
  selected,
  unstableCells,
  lastCreatedTileId,
  petBonusTileId,
  lastOverseerPositions,
  onTileActivate,
  onArrowMerge,
}) => (
  <div
    className="grid gap-2 rounded-[28px] p-3 sm:p-4"
    style={{
      gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
      background: 'linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(30,41,59,0.92) 100%)',
      border: '1px solid rgba(148,163,184,0.18)',
      boxShadow: '0 20px 70px rgba(15,23,42,0.38), inset 0 1px 0 rgba(255,255,255,0.06)',
    }}
  >
    {board.map((row, rowIndex) =>
      row.map((tile, colIndex) => {
        const position = { row: rowIndex, col: colIndex };
        const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
        const canTargetTile = tile === null || (tile.kind !== 'broken' && (tile.kind !== 'corrupt' || tile.lockedTurns === 0));
        const isValidTarget = selected !== null && !isSelected && isAdjacent(selected, position) && canTargetTile;
        const canSelectAsOrigin = tile?.kind === 'number';
        const isCreated = tile?.id === lastCreatedTileId;
        const isPetBonus = tile?.id === petBonusTileId;
        const isUnstable = includesPosition(unstableCells, position);
        const wasOverseerHit = includesPosition(lastOverseerPositions, position);
        const tone = tile?.kind === 'number' ? getTileTone(tile.value) : null;
        const arrowTargets = isSelected
          ? ARROW_DIRECTIONS.map((direction) => ({
              ...direction,
              target: {
                row: rowIndex + direction.rowOffset,
                col: colIndex + direction.colOffset,
              },
            })).filter(({ target }) => {
              const targetTile = board[target.row]?.[target.col];
              return targetTile === null
                || Boolean(targetTile && targetTile.kind !== 'broken' && (targetTile.kind !== 'corrupt' || targetTile.lockedTurns === 0));
            })
          : [];

        return (
          <div
            key={`${rowIndex}-${colIndex}`}
            role={canSelectAsOrigin || isValidTarget ? 'button' : undefined}
            tabIndex={canSelectAsOrigin || isValidTarget ? 0 : -1}
            onClick={() => (canSelectAsOrigin || isValidTarget) && onTileActivate(position)}
            onKeyDown={(event) => {
              if (!canSelectAsOrigin && !isValidTarget) {
                return;
              }

              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onTileActivate(position);
              }
            }}
            className="relative aspect-square rounded-2xl transition-all duration-150"
            style={{
              background: tile
                ? tile.kind === 'corrupt'
                  ? 'linear-gradient(180deg, rgba(152,15,28,0.95) 0%, rgba(63,0,18,0.98) 100%)'
                  : tone?.background
                : isUnstable
                ? 'radial-gradient(circle, rgba(251,191,36,0.2) 0%, rgba(127,29,29,0.6) 100%)'
                : 'linear-gradient(180deg, rgba(51,65,85,0.4) 0%, rgba(15,23,42,0.78) 100%)',
              boxShadow: tile
                ? tile.kind === 'corrupt'
                  ? '0 12px 26px rgba(153,27,27,0.4)'
                  : tone?.shadow
                : isUnstable
                ? '0 0 0 2px rgba(251,191,36,0.35) inset, 0 0 18px rgba(248,113,113,0.28)'
                : 'inset 0 1px 0 rgba(255,255,255,0.04)',
              border: isSelected
                ? '3px solid rgba(34,211,238,0.95)'
                : isValidTarget
                ? '3px solid rgba(253,224,71,0.9)'
                : wasOverseerHit
                ? '3px solid rgba(248,113,113,0.9)'
                : isPetBonus
                ? '3px solid rgba(125,211,252,0.8)'
                : isUnstable
                ? '2px dashed rgba(251,191,36,0.8)'
                : '1px solid rgba(255,255,255,0.08)',
              transform: isSelected ? 'translateY(-2px) scale(1.03)' : 'scale(1)',
            }}
          >
            {!tile && isUnstable && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-amber-300/5">
                <img
                  src="/assets/generated/final/number-merge/overseer-warning-sigil.png"
                  alt=""
                  className="h-10 w-10 opacity-80 animate-pulse"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            )}

            {!tile && !isUnstable && isValidTarget && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
                <span className="h-4 w-4 rounded-full bg-amber-200/90 shadow-[0_0_16px_rgba(253,224,71,0.45)]" />
              </div>
            )}

            {tile && tile.kind === 'number' && (
              <>
                <span
                  className="block pt-5 text-center font-black leading-none select-none"
                  style={{
                    color: tone?.text,
                    fontSize: tile.value >= 100 ? '1.25rem' : tile.value >= 10 ? '1.6rem' : '1.95rem',
                    textShadow: '0 3px 10px rgba(15,23,42,0.25)',
                  }}
                >
                  {tile.value}
                </span>
                {isCreated && <span className="absolute inset-0 rounded-2xl border-2 border-white/70 animate-pulse" />}
                {isPetBonus && (
                  <span className="absolute right-2 top-2 rounded-full bg-sky-200 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-900">
                    Paw
                  </span>
                )}
                {isSelected && arrowTargets.map(({ id, label, glyph, target, style }) => (
                  <button
                    key={id}
                    type="button"
                    aria-label={`Merge ${label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onArrowMerge(target);
                    }}
                    className="absolute z-10 flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-slate-900 transition-transform duration-150 hover:scale-110"
                    style={{
                      ...style,
                      background: 'rgba(253,224,71,0.96)',
                      boxShadow: '0 6px 14px rgba(15,23,42,0.28)',
                      border: '1px solid rgba(255,255,255,0.7)',
                    }}
                  >
                    {glyph}
                  </button>
                ))}
              </>
            )}

            {tile && tile.kind === 'corrupt' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl">
                <img
                  src="/assets/generated/final/number-merge/corruption-tile.png"
                  alt="Corrupt tile"
                  className="h-10 w-10"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100">
                  {tile.lockedTurns && tile.lockedTurns > 0 ? 'Sealed' : 'Corrupt'}
                </span>
              </div>
            )}

            {tile && tile.kind === 'broken' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-950/45">
                <img
                  src="/assets/generated/final/number-merge/overseer-warning-sigil.png"
                  alt="Broken tile"
                  className="h-10 w-10 opacity-70"
                  style={{ imageRendering: 'pixelated', filter: 'grayscale(1)' }}
                />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">
                  Broken
                </span>
              </div>
            )}
          </div>
        );
      }),
    )}
  </div>
);
