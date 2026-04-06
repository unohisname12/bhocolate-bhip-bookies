import React, { useState, useRef, useCallback, useEffect } from 'react';
import type {
  ActiveMomentumState,
  BoardPosition,
  FlashChoice,
  MomentumDifficulty,
  MomentumGameEvent,
  MomentumPiece,
  MomentumPhase,
} from '../types/momentum';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { DIFFICULTY_SETTINGS } from '../config/momentumConfig';
import {
  MomentumBoard,
  MomentumHUD,
  MomentumActionBar,
  MomentumLog,
  MomentumResultOverlay,
  PetOverlay,
  PieceMoveAnimator,
  AttackImpact,
  FlashSequence,
  FusionAnimation,
  DEFAULT_THEME,
} from '../components/momentum';
import '../components/momentum/effects/MomentumAnimations.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MomentumScreenProps {
  state: ActiveMomentumState;
  petSpeciesId: string | null;
  dispatch: (action: GameEngineAction) => void;
}

interface AnimationMeta {
  movingPieceId: string | null;
  movingPiece: MomentumPiece | null;
  moveFrom: BoardPosition | null;
  moveTo: BoardPosition | null;
  attackPosition: BoardPosition | null;
  isAttack: boolean;
  flashChoice: FlashChoice | null;
  fusionPiece1Pos: BoardPosition | null;
  fusionPiece2Pos: BoardPosition | null;
  fusionResultPos: BoardPosition | null;
}

const EMPTY_META: AnimationMeta = {
  movingPieceId: null,
  movingPiece: null,
  moveFrom: null,
  moveTo: null,
  attackPosition: null,
  isAttack: false,
  flashChoice: null,
  fusionPiece1Pos: null,
  fusionPiece2Pos: null,
  fusionResultPos: null,
};

// ─── Layout Constants ────────────────────────────────────────────────────────

const GRID_GAP = DEFAULT_THEME.gridGap; // 2
const BOARD_SIZE = 320;
const CELL_SIZE = (BOARD_SIZE - 4 * GRID_GAP) / 5; // (320 - 8) / 5 = 62.4

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract animation metadata from a game event and previous state */
function extractMeta(
  event: MomentumGameEvent | null,
  prevPieces: MomentumPiece[],
  prevEvent: MomentumGameEvent | null,
): AnimationMeta {
  if (!event) return EMPTY_META;

  if (event.type === 'piece_moved') {
    const piece = prevPieces.find(p => p.id === event.pieceId) ?? null;
    return {
      ...EMPTY_META,
      movingPieceId: event.pieceId,
      movingPiece: piece,
      moveFrom: event.from,
      moveTo: event.to,
      isAttack: false,
    };
  }

  if (event.type === 'piece_attacked') {
    // Attacker's "from" position is its position in the previous state
    const attacker = prevPieces.find(p => p.id === event.attackerId) ?? null;
    const fromPos = attacker?.position ?? null;
    return {
      ...EMPTY_META,
      movingPieceId: event.attackerId,
      movingPiece: attacker,
      moveFrom: fromPos,
      moveTo: event.position,
      attackPosition: event.position,
      isAttack: true,
    };
  }

  if (event.type === 'piece_captured') {
    // piece_captured usually follows piece_attacked — reuse prevEvent data
    if (prevEvent && prevEvent.type === 'piece_attacked') {
      const attacker = prevPieces.find(p => p.id === prevEvent.attackerId) ?? null;
      const fromPos = attacker?.position ?? null;
      return {
        ...EMPTY_META,
        movingPieceId: prevEvent.attackerId,
        movingPiece: attacker,
        moveFrom: fromPos,
        moveTo: prevEvent.position,
        attackPosition: prevEvent.position,
        isAttack: true,
      };
    }
  }

  if (event.type === 'flash_fusion') {
    const p1 = prevPieces.find(p => p.id === event.consumed[0]);
    const p2 = prevPieces.find(p => p.id === event.consumed[1]);
    return {
      ...EMPTY_META,
      flashChoice: 'fusion',
      fusionPiece1Pos: p1?.position ?? null,
      fusionPiece2Pos: p2?.position ?? null,
      fusionResultPos: event.position,
    };
  }

  if (event.type === 'flash_upgrade') {
    return {
      ...EMPTY_META,
      flashChoice: 'upgrade',
    };
  }

  return EMPTY_META;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const MomentumScreen: React.FC<MomentumScreenProps> = ({
  state,
  petSpeciesId,
  dispatch,
}) => {
  const theme = DEFAULT_THEME;
  const cellSize = CELL_SIZE;

  // Difficulty picker — shown on first mount
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(true);

  // Previous state tracking for detecting phase transitions
  const prevStateRef = useRef<ActiveMomentumState>(state);
  const prevPhaseRef = useRef<MomentumPhase>(state.phase);

  // Animation metadata captured on phase transition
  const [animMeta, setAnimMeta] = useState<AnimationMeta>(EMPTY_META);

  // Board shake
  const [shakeActive, setShakeActive] = useState(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Attack sub-phase: for animating_attack / animating_ai that are attacks,
  // we show move first, then impact
  const [attackSubPhase, setAttackSubPhase] = useState<'lunge' | 'impact' | null>(null);

  // ─── Event handlers ──────────────────────────────────────────────────

  const handlePieceClick = useCallback(
    (pieceId: string) => {
      if (state.selectedPieceId === pieceId) {
        dispatch({ type: 'MOMENTUM_DESELECT_PIECE' });
      } else {
        dispatch({ type: 'MOMENTUM_SELECT_PIECE', pieceId });
      }
    },
    [state.selectedPieceId, dispatch],
  );

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      const moveIndex = state.validMoves.findIndex(
        m => m.destination.x === x && m.destination.y === y,
      );
      if (moveIndex >= 0) {
        dispatch({ type: 'MOMENTUM_EXECUTE_MOVE', moveIndex });
      }
    },
    [state.validMoves, dispatch],
  );

  const handleAnimationDone = useCallback(() => {
    setAttackSubPhase(null);
    dispatch({ type: 'MOMENTUM_ANIMATION_DONE' });
  }, [dispatch]);

  // ─── Phase transition detection ──────────────────────────────────────

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const prevState = prevStateRef.current;
    const currentPhase = state.phase;

    // Update refs
    prevPhaseRef.current = currentPhase;
    prevStateRef.current = state;

    // Only act on phase transitions
    if (prevPhase === currentPhase) return;

    // Extract meta from the event that triggered this phase
    const meta = extractMeta(state.lastEvent, prevState.pieces, prevState.lastEvent);

    switch (currentPhase) {
      case 'animating_move': {
        setAnimMeta(meta);
        setAttackSubPhase(null);
        break;
      }

      case 'animating_attack': {
        setAnimMeta(meta);
        setAttackSubPhase('lunge');
        // Activate board shake
        setShakeActive(true);
        if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = setTimeout(() => setShakeActive(false), 300);
        break;
      }

      case 'animating_ai': {
        // AI moves work the same — check if it's an attack via lastEvent
        setAnimMeta(meta);
        if (meta.isAttack) {
          setAttackSubPhase('lunge');
          setShakeActive(true);
          if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
          shakeTimerRef.current = setTimeout(() => setShakeActive(false), 300);
        } else {
          setAttackSubPhase(null);
        }
        break;
      }

      case 'flash_sequence':
      case 'flash_choice': {
        // FlashSequence component handles its own multi-phase cinematic
        // Capture attack position from the last event for the burst effect
        const attackPos = state.lastEvent?.type === 'flash_triggered'
          ? state.lastEvent.position
          : (meta.attackPosition ?? { x: 2, y: 2 });
        setAnimMeta(prev => ({ ...prev, attackPosition: attackPos }));
        break;
      }

      case 'animating_flash': {
        // Determine what choice was made from the last event
        const flashMeta = extractMeta(state.lastEvent, prevState.pieces, prevState.lastEvent);
        setAnimMeta(flashMeta);

        // If upgrade (not fusion), dispatch done after brief timeout
        // since there's no separate upgrade animation component
        if (state.lastEvent?.type === 'flash_upgrade') {
          const timer = setTimeout(() => {
            dispatch({ type: 'MOMENTUM_ANIMATION_DONE' });
          }, 500);
          return () => clearTimeout(timer);
        }
        break;
      }

      default:
        // Reset animation state on non-animation phases
        setAnimMeta(EMPTY_META);
        setAttackSubPhase(null);
        break;
    }
  }, [state, dispatch]);

  // ─── Visibility change handler — prevent animation phase stuck ──────

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        const animPhases: MomentumPhase[] = [
          'animating_move',
          'animating_attack',
          'animating_flash',
          'animating_ai',
        ];
        if (animPhases.includes(state.phase)) {
          dispatch({ type: 'MOMENTUM_ANIMATION_DONE' });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [state.phase, dispatch]);

  // ─── Cleanup shake timer ────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  // ─── Animation overlay rendering helpers ────────────────────────────

  const handleMoveLungeComplete = useCallback(() => {
    if (attackSubPhase === 'lunge') {
      // Transition to impact sub-phase
      setAttackSubPhase('impact');
    } else {
      // Non-attack move — we're done
      handleAnimationDone();
    }
  }, [attackSubPhase, handleAnimationDone]);

  // Determine what to show
  const isMovingPhase =
    state.phase === 'animating_move' ||
    state.phase === 'animating_attack' ||
    state.phase === 'animating_ai';

  const showMoveAnim =
    isMovingPhase &&
    animMeta.movingPiece &&
    animMeta.moveFrom &&
    animMeta.moveTo &&
    (attackSubPhase === 'lunge' || (!animMeta.isAttack && attackSubPhase === null));

  const showAttackImpact =
    isMovingPhase && animMeta.isAttack && attackSubPhase === 'impact' && animMeta.attackPosition;

  // Determine team color for attack impact
  const attackTeamColor =
    animMeta.movingPiece?.team === 'player'
      ? 'rgba(103, 232, 249, 0.8)'
      : 'rgba(252, 165, 165, 0.8)';

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: theme.backdrop }}
    >
      {/* Backdrop: full screen themed gradient */}
      <div className="absolute inset-0" style={{ background: theme.backdrop }} />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 gap-3">
        {/* HUD */}
        <MomentumHUD state={state} />

        {/* Board area with shake wrapper and effect overlays */}
        <div data-help="momentum-board" className="relative">
          {/* Board shake wrapper */}
          <div className={shakeActive ? 'momentum-board-shake' : ''}>
            <MomentumBoard
              state={state}
              onCellClick={handleCellClick}
              onPieceClick={handlePieceClick}
            />
          </div>

          {/* Animation overlays positioned relative to board's inner area */}
          {/* Offset by board padding (8px) so pixel coords align with grid cells */}
          <div
            className="absolute pointer-events-none"
            style={{ top: 8, left: 8, width: BOARD_SIZE, height: BOARD_SIZE }}
          >
            {/* Piece move animator */}
            {showMoveAnim && animMeta.movingPiece && animMeta.moveFrom && animMeta.moveTo && (
              <PieceMoveAnimator
                key={`${animMeta.movingPieceId}-${animMeta.moveFrom.x},${animMeta.moveFrom.y}-${animMeta.moveTo.x},${animMeta.moveTo.y}`}
                piece={animMeta.movingPiece}
                from={animMeta.moveFrom}
                to={animMeta.moveTo}
                theme={theme}
                cellSize={cellSize}
                gridGap={GRID_GAP}
                onComplete={handleMoveLungeComplete}
              />
            )}

            {/* Attack impact */}
            {showAttackImpact && animMeta.attackPosition && (
              <AttackImpact
                position={animMeta.attackPosition}
                cellSize={cellSize}
                gridGap={GRID_GAP}
                teamColor={attackTeamColor}
                onComplete={handleAnimationDone}
              />
            )}
          </div>
        </div>

        {/* Action log */}
        <MomentumLog log={state.log} />

        {/* Action bar */}
        <MomentumActionBar
          phase={state.phase}
          onSkip={() => dispatch({ type: 'MOMENTUM_SKIP_TURN' })}
          onForfeit={() => dispatch({ type: 'END_MOMENTUM' })}
        />
      </div>

      {/* Pet overlay — bottom-left, z-30 */}
      {petSpeciesId && (
        <PetOverlay speciesId={petSpeciesId} lastEvent={state.lastEvent} />
      )}

      {/* Flash sequence overlay — full screen, z-40+ */}
      {(state.phase === 'flash_sequence' || state.phase === 'flash_choice') &&
        state.flashPending && (
          <FlashSequence
            triggerReason={state.flashPending.triggerReason}
            attackPosition={animMeta.attackPosition ?? { x: 2, y: 2 }}
            fusionEligible={state.flashEligibleForFusion}
            playerPieces={state.pieces.filter(p => p.team === 'player')}
            cellSize={cellSize}
            gridGap={GRID_GAP}
            onChoice={(choice, fusionTarget) => {
              dispatch({ type: 'MOMENTUM_FLASH_CHOICE', choice, fusionTarget });
            }}
          />
        )}

      {/* Fusion animation overlay */}
      {state.phase === 'animating_flash' &&
        animMeta.flashChoice === 'fusion' &&
        animMeta.fusionPiece1Pos &&
        animMeta.fusionPiece2Pos &&
        animMeta.fusionResultPos && (
          <FusionAnimation
            piece1Position={animMeta.fusionPiece1Pos}
            piece2Position={animMeta.fusionPiece2Pos}
            resultPosition={animMeta.fusionResultPos}
            cellSize={cellSize}
            gridGap={GRID_GAP}
            teamColor="rgba(103, 232, 249, 0.8)"
            onComplete={handleAnimationDone}
          />
        )}

      {/* Victory/Defeat overlay */}
      {(state.phase === 'victory' || state.phase === 'defeat') && (
        <MomentumResultOverlay
          state={state}
          onExit={() => dispatch({ type: 'END_MOMENTUM' })}
        />
      )}

      {/* Difficulty picker — shown on game start */}
      {showDifficultyPicker && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 flex flex-col items-center justify-center gap-6">
          <h2 className="text-2xl font-black text-white tracking-wide">Choose Difficulty</h2>
          <div className="flex gap-3">
            {(['easy', 'medium', 'hard'] as MomentumDifficulty[]).map(d => {
              const s = DIFFICULTY_SETTINGS[d];
              const colors = d === 'easy'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : d === 'medium'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                  : 'bg-red-600 hover:bg-red-500 text-white';
              return (
                <button
                  key={d}
                  className={`px-5 py-3 rounded-xl font-bold text-lg ${colors} transition-colors`}
                  onClick={() => {
                    dispatch({ type: 'MOMENTUM_SET_DIFFICULTY', difficulty: d });
                    setShowDifficultyPicker(false);
                  }}
                >
                  <div>{s.label}</div>
                  <div className="text-xs font-normal opacity-80">{s.maxTurns} turns</div>
                </button>
              );
            })}
          </div>
          <button
            className="text-slate-500 hover:text-slate-300 text-sm mt-2 transition-colors"
            onClick={() => dispatch({ type: 'END_MOMENTUM' })}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};
