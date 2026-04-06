import type React from 'react';
import { useState, useEffect } from 'react';
import type { BoardPosition } from '../../../types/momentum';

interface FusionAnimationProps {
  piece1Position: BoardPosition;
  piece2Position: BoardPosition;
  resultPosition: BoardPosition;
  cellSize: number;
  gridGap: number;
  teamColor: string;
  onComplete: () => void;
}

// Convert a board position to pixel coords (top-left of the cell)
function cellToPixel(
  pos: BoardPosition,
  cellSize: number,
  gridGap: number,
): { x: number; y: number } {
  return {
    x: pos.x * (cellSize + gridGap),
    y: pos.y * (cellSize + gridGap),
  };
}

// Center of a cell in pixel coords
function cellCenter(
  pos: BoardPosition,
  cellSize: number,
  gridGap: number,
): { x: number; y: number } {
  const { x, y } = cellToPixel(pos, cellSize, gridGap);
  return { x: x + cellSize / 2, y: y + cellSize / 2 };
}

export const FusionAnimation: React.FC<FusionAnimationProps> = ({
  piece1Position,
  piece2Position,
  resultPosition,
  cellSize,
  gridGap,
  teamColor,
  onComplete,
}) => {
  // Animation states:
  //  'sliding'  — ghost pieces moving toward result position
  //  'flash'    — bright flash circle at result + new piece appearing
  //  'done'     — invisible, triggers onComplete
  const [animPhase, setAnimPhase] = useState<'sliding' | 'flash' | 'done'>('sliding');
  // Whether the CSS transition has been triggered (next RAF after mount)
  const [moved, setMoved] = useState(false);

  const ghost1 = cellCenter(piece1Position, cellSize, gridGap);
  const ghost2 = cellCenter(piece2Position, cellSize, gridGap);
  const target = cellCenter(resultPosition, cellSize, gridGap);
  const resultPx = cellToPixel(resultPosition, cellSize, gridGap);

  const ghostSize = Math.round(cellSize * 0.7);

  useEffect(() => {
    // Trigger slide on next frame
    const rafId = requestAnimationFrame(() => setMoved(true));

    // After slide (300ms) enter flash phase
    const t1 = setTimeout(() => setAnimPhase('flash'), 320);

    // After flash + appear (200ms flash + 400ms appear = 600ms total from mount)
    const t2 = setTimeout(() => {
      setAnimPhase('done');
      onComplete();
    }, 720);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  if (animPhase === 'done') return null;

  // Ghost piece style factory
  const ghostStyle = (
    startX: number,
    startY: number,
  ): React.CSSProperties => ({
    position: 'absolute',
    width: ghostSize,
    height: ghostSize,
    borderRadius: '50%',
    background: `radial-gradient(circle at 40% 35%, ${teamColor}, rgba(0,0,0,0.3))`,
    border: `2px solid ${teamColor}`,
    boxShadow: `0 0 12px ${teamColor}`,
    opacity: animPhase === 'sliding' ? (moved ? 0.85 : 1) : 0,
    left: moved ? target.x - ghostSize / 2 : startX - ghostSize / 2,
    top: moved ? target.y - ghostSize / 2 : startY - ghostSize / 2,
    transition: moved
      ? 'left 300ms cubic-bezier(0.5, 0, 1, 0.5), top 300ms cubic-bezier(0.5, 0, 1, 0.5), opacity 100ms ease'
      : 'none',
    zIndex: 55,
    pointerEvents: 'none',
  });

  const flashSize = cellSize * 2.5;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 54 }}
    >
      {/* Ghost piece 1 */}
      {animPhase === 'sliding' && (
        <div style={ghostStyle(ghost1.x, ghost1.y)} />
      )}

      {/* Ghost piece 2 */}
      {animPhase === 'sliding' && (
        <div style={ghostStyle(ghost2.x, ghost2.y)} />
      )}

      {/* Flash circle at result position */}
      {animPhase === 'flash' && (
        <div
          className="absolute momentum-flash-burst"
          style={{
            left: target.x - flashSize / 2,
            top: target.y - flashSize / 2,
            width: flashSize,
            height: flashSize,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 25%, rgba(255,255,255,0.2) 55%, transparent 75%)',
            zIndex: 57,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* New fused piece appearing */}
      {animPhase === 'flash' && (
        <div
          className="absolute momentum-fusion-appear"
          style={{
            left: resultPx.x + cellSize / 2 - ghostSize * 0.75,
            top: resultPx.y + cellSize / 2 - ghostSize * 0.75,
            width: ghostSize * 1.5,
            height: ghostSize * 1.5,
            borderRadius: '50%',
            background: `radial-gradient(circle at 40% 35%, ${teamColor}, rgba(0,0,0,0.4))`,
            border: `3px solid ${teamColor}`,
            boxShadow: `0 0 20px ${teamColor}, 0 0 40px rgba(255,255,255,0.2)`,
            zIndex: 58,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};
