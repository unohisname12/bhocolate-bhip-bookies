import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type {
  FlashTriggerReason,
  FlashChoice,
  FusionTarget,
  MomentumPiece,
} from '../../../types/momentum';

type FlashPhase = 'freeze' | 'zoom' | 'burst' | 'title' | 'choice' | 'selecting_fusion';

interface FlashSequenceProps {
  triggerReason: FlashTriggerReason;
  attackPosition: { x: number; y: number };
  fusionEligible: boolean;
  playerPieces: MomentumPiece[];
  cellSize: number;
  gridGap: number;
  onChoice: (choice: FlashChoice, fusionTarget?: FusionTarget) => void;
}

// ─── Burst Effect ────────────────────────────────────────────────────────────

interface BurstEffectProps {
  x: number;
  y: number;
  cellSize: number;
}

const BurstEffect: React.FC<BurstEffectProps> = ({ x, y, cellSize }) => {
  const burstSize = cellSize * 3;
  return (
    <div
      className="absolute pointer-events-none momentum-flash-burst"
      style={{
        left: x + cellSize / 2 - burstSize / 2,
        top: y + cellSize / 2 - burstSize / 2,
        width: burstSize,
        height: burstSize,
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(251,191,36,0.9) 0%, rgba(251,191,36,0.4) 35%, rgba(251,191,36,0.1) 65%, transparent 80%)',
        zIndex: 60,
      }}
    />
  );
};

// ─── Title Display ────────────────────────────────────────────────────────────

interface TitleDisplayProps {
  triggerReason: FlashTriggerReason;
  showPulse: boolean;
}

const TitleDisplay: React.FC<TitleDisplayProps> = ({ triggerReason, showPulse }) => {
  const subtitle =
    triggerReason === 'exact_energy_kill' ? 'EXACT STRIKE!' : 'UNDERDOG VICTORY!';

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
      style={{ zIndex: 65 }}
    >
      <div
        className={showPulse ? 'momentum-flash-title-pulse' : 'momentum-flash-title'}
        style={{
          textAlign: 'center',
          lineHeight: 1,
        }}
      >
        <div
          style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            letterSpacing: '0.08em',
            color: '#fbbf24',
            textShadow:
              '0 0 20px rgba(251,191,36,0.8), 0 0 40px rgba(251,191,36,0.4), 0 2px 4px rgba(0,0,0,0.9)',
            textTransform: 'uppercase',
          }}
        >
          FLASH MOVE
        </div>
        <div
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: 'rgba(253,224,71,0.9)',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            marginTop: '0.4rem',
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
};

// ─── Choice Buttons ───────────────────────────────────────────────────────────

interface ChoiceButtonsProps {
  fusionEligible: boolean;
  onUpgrade: () => void;
  onFusion: () => void;
}

const ChoiceButtons: React.FC<ChoiceButtonsProps> = ({
  fusionEligible,
  onUpgrade,
  onFusion,
}) => {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 70, paddingTop: '18rem' }}
    >
      <div
        className="flex gap-5 pointer-events-auto"
        style={{ animation: 'momentum-flash-title 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both' }}
      >
        {/* UPGRADE button */}
        <button
          onClick={onUpgrade}
          style={{
            background: 'linear-gradient(135deg, rgba(8,145,178,0.15), rgba(6,182,212,0.08))',
            border: '2px solid rgba(6,182,212,0.7)',
            borderRadius: '0.75rem',
            padding: '1rem 1.5rem',
            cursor: 'pointer',
            minWidth: '9rem',
            textAlign: 'center',
            boxShadow:
              '0 0 20px rgba(6,182,212,0.3), 0 0 40px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
            transition: 'all 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.boxShadow =
              '0 0 30px rgba(6,182,212,0.6), 0 0 60px rgba(6,182,212,0.2), inset 0 1px 0 rgba(255,255,255,0.15)';
            el.style.transform = 'translateY(-2px) scale(1.03)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.boxShadow =
              '0 0 20px rgba(6,182,212,0.3), 0 0 40px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.1)';
            el.style.transform = '';
          }}
        >
          <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>↑</span>
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 900,
              letterSpacing: '0.12em',
              color: '#67e8f9',
              textShadow: '0 0 8px rgba(6,182,212,0.6)',
            }}
          >
            UPGRADE
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'rgba(103,232,249,0.7)',
              fontWeight: 500,
            }}
          >
            Power up a piece
          </span>
        </button>

        {/* FUSION button */}
        <button
          onClick={fusionEligible ? onFusion : undefined}
          disabled={!fusionEligible}
          title={fusionEligible ? undefined : 'Need 2 rank-2 pieces'}
          style={{
            background: fusionEligible
              ? 'linear-gradient(135deg, rgba(126,34,206,0.15), rgba(168,85,247,0.08))'
              : 'rgba(30,30,40,0.4)',
            border: `2px solid ${fusionEligible ? 'rgba(168,85,247,0.7)' : 'rgba(80,80,100,0.4)'}`,
            borderRadius: '0.75rem',
            padding: '1rem 1.5rem',
            cursor: fusionEligible ? 'pointer' : 'not-allowed',
            minWidth: '9rem',
            textAlign: 'center',
            boxShadow: fusionEligible
              ? '0 0 20px rgba(168,85,247,0.3), 0 0 40px rgba(168,85,247,0.1), inset 0 1px 0 rgba(255,255,255,0.1)'
              : 'none',
            opacity: fusionEligible ? 1 : 0.45,
            transition: 'all 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
          }}
          onMouseEnter={e => {
            if (!fusionEligible) return;
            const el = e.currentTarget;
            el.style.boxShadow =
              '0 0 30px rgba(168,85,247,0.6), 0 0 60px rgba(168,85,247,0.2), inset 0 1px 0 rgba(255,255,255,0.15)';
            el.style.transform = 'translateY(-2px) scale(1.03)';
          }}
          onMouseLeave={e => {
            if (!fusionEligible) return;
            const el = e.currentTarget;
            el.style.boxShadow =
              '0 0 20px rgba(168,85,247,0.3), 0 0 40px rgba(168,85,247,0.1), inset 0 1px 0 rgba(255,255,255,0.1)';
            el.style.transform = '';
          }}
        >
          <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>⚡</span>
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 900,
              letterSpacing: '0.12em',
              color: fusionEligible ? '#c084fc' : 'rgba(150,150,170,0.6)',
              textShadow: fusionEligible ? '0 0 8px rgba(168,85,247,0.6)' : 'none',
            }}
          >
            FUSION
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              color: fusionEligible ? 'rgba(192,132,252,0.7)' : 'rgba(100,100,120,0.6)',
              fontWeight: 500,
            }}
          >
            {fusionEligible ? 'Merge two ★★ pieces' : 'Need 2 rank-2 pieces'}
          </span>
        </button>
      </div>
    </div>
  );
};

// ─── Fusion Picker ────────────────────────────────────────────────────────────

interface FusionPickerProps {
  playerPieces: MomentumPiece[];
  onConfirm: (fusionTarget: FusionTarget) => void;
  onCancel: () => void;
}

const FusionPicker: React.FC<FusionPickerProps> = ({ playerPieces, onConfirm, onCancel }) => {
  const rank2Pieces = playerPieces.filter(p => p.rank === 2 && p.team === 'player');
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (selected.length !== 2) return;
    const [id1, id2] = selected;
    const p1 = rank2Pieces.find(p => p.id === id1);
    const p2 = rank2Pieces.find(p => p.id === id2);
    if (!p1 || !p2) return;
    // Default result position is the first selected piece's position
    onConfirm({ pieceId1: id1, pieceId2: id2, resultPosition: p1.position });
  }, [selected, rank2Pieces, onConfirm]);

  const selectedCount = selected.length;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ zIndex: 75 }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15,20,40,0.97), rgba(20,15,35,0.97))',
          border: '1px solid rgba(168,85,247,0.4)',
          borderRadius: '1rem',
          padding: '1.5rem',
          minWidth: '20rem',
          maxWidth: '28rem',
          boxShadow: '0 0 40px rgba(168,85,247,0.2), 0 0 80px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            color: '#c084fc',
            letterSpacing: '0.1em',
            textAlign: 'center',
            marginBottom: '0.25rem',
            textShadow: '0 0 10px rgba(168,85,247,0.5)',
          }}
        >
          FUSION — SELECT 2 PIECES
        </div>
        <div
          style={{
            fontSize: '0.75rem',
            color: 'rgba(192,132,252,0.6)',
            textAlign: 'center',
            marginBottom: '1rem',
          }}
        >
          {selectedCount === 0
            ? 'Choose two ★★ pieces to merge'
            : selectedCount === 1
            ? 'Select one more piece'
            : 'Ready — confirm to fuse'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {rank2Pieces.map(piece => {
            const isSelected = selected.includes(piece.id);
            return (
              <button
                key={piece.id}
                onClick={() => toggleSelect(piece.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0.9rem',
                  borderRadius: '0.5rem',
                  border: isSelected
                    ? '2px solid rgba(168,85,247,0.8)'
                    : '2px solid rgba(80,80,110,0.4)',
                  background: isSelected
                    ? 'rgba(126,34,206,0.2)'
                    : 'rgba(30,30,50,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 0 12px rgba(168,85,247,0.3)' : 'none',
                }}
              >
                {/* Piece swatch */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 40% 35%, #67e8f9, #0891b2, #164e63)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: isSelected ? '#e9d5ff' : 'rgba(220,220,240,0.8)',
                    }}
                  >
                    ★★ Piece
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: 'rgba(150,150,180,0.7)',
                      marginLeft: '0.4rem',
                    }}
                  >
                    ({piece.position.x},{piece.position.y}) · E{piece.energy}
                  </span>
                </div>
                {isSelected && (
                  <span style={{ color: '#a78bfa', fontSize: '1rem', fontWeight: 800 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Position picker — shown once 2 are selected */}
        {selectedCount === 2 && (() => {
          const p1 = rank2Pieces.find(p => p.id === selected[0]);
          const p2 = rank2Pieces.find(p => p.id === selected[1]);
          if (!p1 || !p2) return null;
          return (
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(192,132,252,0.7)',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                }}
              >
                RESULT POSITION
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() =>
                    onConfirm({ pieceId1: selected[0], pieceId2: selected[1], resultPosition: p1.position })
                  }
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.4rem',
                    border: '1px solid rgba(168,85,247,0.5)',
                    background: 'rgba(126,34,206,0.15)',
                    color: '#c084fc',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  At ({p1.position.x},{p1.position.y})
                </button>
                <button
                  onClick={() =>
                    onConfirm({ pieceId1: selected[0], pieceId2: selected[1], resultPosition: p2.position })
                  }
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.4rem',
                    border: '1px solid rgba(168,85,247,0.5)',
                    background: 'rgba(126,34,206,0.15)',
                    color: '#c084fc',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  At ({p2.position.x},{p2.position.y})
                </button>
              </div>
            </div>
          );
        })()}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(80,80,110,0.5)',
              background: 'rgba(30,30,50,0.5)',
              color: 'rgba(180,180,200,0.7)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.06em',
            }}
          >
            BACK
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedCount !== 2}
            style={{
              flex: 2,
              padding: '0.6rem',
              borderRadius: '0.5rem',
              border: `1px solid ${selectedCount === 2 ? 'rgba(168,85,247,0.7)' : 'rgba(80,80,110,0.3)'}`,
              background: selectedCount === 2 ? 'rgba(126,34,206,0.3)' : 'rgba(20,20,35,0.4)',
              color: selectedCount === 2 ? '#e9d5ff' : 'rgba(120,120,150,0.5)',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: selectedCount === 2 ? 'pointer' : 'not-allowed',
              letterSpacing: '0.08em',
              boxShadow: selectedCount === 2 ? '0 0 12px rgba(168,85,247,0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            FUSE
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const FlashSequence: React.FC<FlashSequenceProps> = ({
  triggerReason,
  attackPosition,
  fusionEligible,
  playerPieces,
  cellSize,
  gridGap,
  onChoice,
}) => {
  const [phase, setPhase] = useState<FlashPhase>('freeze');

  // Board-relative pixel coords for the burst
  const burstX = attackPosition.x * (cellSize + gridGap);
  const burstY = attackPosition.y * (cellSize + gridGap);

  useEffect(() => {
    // freeze → zoom (200ms)
    const t1 = setTimeout(() => setPhase('zoom'), 200);
    // zoom → burst (300ms)
    const t2 = setTimeout(() => setPhase('burst'), 500);
    // burst → title (400ms)
    const t3 = setTimeout(() => setPhase('title'), 900);
    // title → choice (600ms)
    const t4 = setTimeout(() => setPhase('choice'), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const handleUpgrade = useCallback(() => {
    onChoice('upgrade');
  }, [onChoice]);

  const handleFusionStart = useCallback(() => {
    setPhase('selecting_fusion');
  }, []);

  const handleFusionConfirm = useCallback(
    (fusionTarget: FusionTarget) => {
      onChoice('fusion', fusionTarget);
    },
    [onChoice],
  );

  const handleFusionCancel = useCallback(() => {
    setPhase('choice');
  }, []);

  // Overlay opacity — fully visible once we're past freeze
  const overlayOpacity = phase === 'freeze' ? 0 : 0.55;

  return (
    <div
      className="fixed inset-0 pointer-events-auto"
      style={{ zIndex: 50 }}
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(0,0,0,1)',
          opacity: overlayOpacity,
          transition: 'opacity 300ms ease-in',
          pointerEvents: 'none',
        }}
      />

      {/* Burst */}
      {phase === 'burst' && (
        <BurstEffect x={burstX} y={burstY} cellSize={cellSize} />
      )}

      {/* Title — stays through choice and selecting_fusion */}
      {(phase === 'title' || phase === 'choice' || phase === 'selecting_fusion') && (
        <TitleDisplay
          triggerReason={triggerReason}
          showPulse={phase === 'choice' || phase === 'selecting_fusion'}
        />
      )}

      {/* Choice buttons */}
      {phase === 'choice' && (
        <ChoiceButtons
          fusionEligible={fusionEligible}
          onUpgrade={handleUpgrade}
          onFusion={handleFusionStart}
        />
      )}

      {/* Fusion picker */}
      {phase === 'selecting_fusion' && (
        <FusionPicker
          playerPieces={playerPieces}
          onConfirm={handleFusionConfirm}
          onCancel={handleFusionCancel}
        />
      )}
    </div>
  );
};
