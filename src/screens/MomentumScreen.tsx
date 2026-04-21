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

  // Turn transition banner
  const [turnBanner, setTurnBanner] = useState<{ team: 'player' | 'enemy'; key: number } | null>(
    null,
  );
  const turnBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Zzz" skip feedback
  const [skipFx, setSkipFx] = useState<{ team: 'player' | 'enemy'; key: number } | null>(null);
  const skipFxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rank promotion burst trigger (piece id + key) — cleared after the anim runs
  const [promoteFx, setPromoteFx] = useState<{ pieceId: string; key: number } | null>(null);
  const promoteFxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show board entrance only on first mount
  const [boardEntered, setBoardEntered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBoardEntered(true), 650);
    return () => clearTimeout(t);
  }, []);

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

    // ── Turn-banner: phase-based so it fires on every transition ────
    // Player attack keeps activeTeam=player even when phase flips to ai_turn,
    // so we key off phase, not team.
    const bannerTeam =
      prevPhase !== 'ai_turn' && currentPhase === 'ai_turn'
        ? 'enemy'
        : (currentPhase === 'player_select' &&
            (prevPhase === 'animating_ai' || prevPhase === 'ai_turn'))
          ? 'player'
          : null;
    if (bannerTeam) {
      if (turnBannerTimerRef.current) clearTimeout(turnBannerTimerRef.current);
      setTurnBanner({ team: bannerTeam, key: Date.now() });
      turnBannerTimerRef.current = setTimeout(() => setTurnBanner(null), 1250);
    }

    // ── Skip event detection ────────────────────────────────────────
    if (
      state.lastEvent &&
      state.lastEvent.type === 'turn_skipped' &&
      prevState.lastEvent !== state.lastEvent
    ) {
      if (skipFxTimerRef.current) clearTimeout(skipFxTimerRef.current);
      setSkipFx({ team: state.lastEvent.team, key: Date.now() });
      skipFxTimerRef.current = setTimeout(() => setSkipFx(null), 1400);
    }

    // ── Piece promotion detection ───────────────────────────────────
    if (
      state.lastEvent &&
      state.lastEvent.type === 'piece_promoted' &&
      prevState.lastEvent !== state.lastEvent
    ) {
      if (promoteFxTimerRef.current) clearTimeout(promoteFxTimerRef.current);
      const pieceId = state.lastEvent.pieceId;
      setPromoteFx({ pieceId, key: Date.now() });
      promoteFxTimerRef.current = setTimeout(() => setPromoteFx(null), 1100);
    }

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

  // ─── AI turn pacing — delay so "Enemy Turn" banner can land ────────

  useEffect(() => {
    if (state.phase !== 'ai_turn') return;
    const timer = setTimeout(() => {
      dispatch({ type: 'MOMENTUM_AI_EXECUTE' });
    }, 2000);
    return () => clearTimeout(timer);
  }, [state.phase, dispatch]);

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
        } else if (state.phase === 'ai_turn') {
          dispatch({ type: 'MOMENTUM_AI_EXECUTE' });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [state.phase, dispatch]);

  // ─── Cleanup timers ─────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      if (turnBannerTimerRef.current) clearTimeout(turnBannerTimerRef.current);
      if (skipFxTimerRef.current) clearTimeout(skipFxTimerRef.current);
      if (promoteFxTimerRef.current) clearTimeout(promoteFxTimerRef.current);
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

  // AI "thinking" dim — enemy is acting and the board is not player-interactive
  const aiThinking =
    state.phase === 'ai_turn' ||
    (state.phase === 'animating_ai' && state.activeTeam === 'enemy');

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: theme.backdrop }}
    >
      {/* Backdrop: strategy chamber scene, full screen */}
      <img
        src="/assets/generated/final/scene_strategy_chamber.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Dark vignette for focus on the board */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%)' }}
      />

      {/* ===== HUD — floats at top like a hanging banner ===== */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
        <div
          className="px-4 py-2 rounded-xl border-2 border-cyan-400/40 shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          style={{
            background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.9) 100%)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <MomentumHUD state={state} />
        </div>
      </div>

      {/* ===== BOARD — sits on the altar with a perspective tilt ===== */}
      <div
        data-help="momentum-board"
        className="absolute left-1/2 z-10"
        style={{
          top: '42%',
          transform: 'translateX(-50%) perspective(1200px) rotateX(12deg)',
          transformOrigin: 'center bottom',
          filter: 'drop-shadow(0 20px 24px rgba(0,0,0,0.6))',
        }}
      >
        {/* Board shake + AI-thinking + entrance wrapper */}
        <div
          className={[
            shakeActive ? 'momentum-board-shake' : '',
            aiThinking ? 'momentum-ai-thinking' : '',
            boardEntered ? '' : 'momentum-board-entrance',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <MomentumBoard
            state={state}
            onCellClick={handleCellClick}
            onPieceClick={handlePieceClick}
            promoteFx={promoteFx}
          />
        </div>

        {/* Animation overlays aligned to the board's grid */}
        <div
          className="absolute pointer-events-none"
          style={{ top: 8, left: 8, width: BOARD_SIZE, height: BOARD_SIZE }}
        >
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

      {/* ===== Action log — carved stone tablet on the left ===== */}
      <div className="absolute left-3 top-24 z-10 max-w-[200px]">
        <div
          className="p-2 rounded-lg border-2 border-cyan-400/30 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
          style={{
            background: 'linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(30,41,59,0.85) 100%)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <MomentumLog log={state.log} />
        </div>
      </div>

      {/* ===== Action bar — bottom center ===== */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div
          className="px-3 py-2 rounded-xl border-2 border-cyan-400/40 shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          style={{
            background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.9) 100%)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <MomentumActionBar
            phase={state.phase}
            onSkip={() => dispatch({ type: 'MOMENTUM_SKIP_TURN' })}
            onForfeit={() => dispatch({ type: 'END_MOMENTUM' })}
          />
        </div>
      </div>

      {/* Pet overlay — bottom-left, z-30 */}
      {petSpeciesId && (
        <PetOverlay speciesId={petSpeciesId} lastEvent={state.lastEvent} />
      )}

      {/* ===== Turn Transition Banner + Flash ===== */}
      {turnBanner && (
        <>
          <div
            key={`flash-${turnBanner.key}`}
            className="absolute inset-0 pointer-events-none z-[35] momentum-turn-flash"
            style={{
              background:
                turnBanner.team === 'player'
                  ? 'radial-gradient(ellipse at center, rgba(103,232,249,0.55) 0%, transparent 70%)'
                  : 'radial-gradient(ellipse at center, rgba(252,165,165,0.55) 0%, transparent 70%)',
            }}
          />
          <div className="absolute inset-0 pointer-events-none z-[36] flex items-center justify-center overflow-hidden">
            <div
              key={`banner-${turnBanner.key}`}
              className="momentum-turn-banner px-10 py-3 border-y-4"
              style={{
                background:
                  turnBanner.team === 'player'
                    ? 'linear-gradient(90deg, rgba(8,47,73,0.95) 0%, rgba(22,78,99,0.95) 50%, rgba(8,47,73,0.95) 100%)'
                    : 'linear-gradient(90deg, rgba(69,10,10,0.95) 0%, rgba(127,29,29,0.95) 50%, rgba(69,10,10,0.95) 100%)',
                borderColor:
                  turnBanner.team === 'player' ? 'rgba(103,232,249,0.8)' : 'rgba(252,165,165,0.8)',
                boxShadow:
                  turnBanner.team === 'player'
                    ? '0 0 40px rgba(34,211,238,0.6)'
                    : '0 0 40px rgba(239,68,68,0.6)',
              }}
            >
              <div
                className="text-3xl font-black tracking-[0.2em] uppercase"
                style={{
                  color: turnBanner.team === 'player' ? '#a5f3fc' : '#fecaca',
                  textShadow:
                    turnBanner.team === 'player'
                      ? '0 0 12px rgba(34,211,238,0.9)'
                      : '0 0 12px rgba(239,68,68,0.9)',
                }}
              >
                {turnBanner.team === 'player' ? 'Your Turn' : 'Enemy Turn'}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== Skip "Zzz" Feedback ===== */}
      {skipFx && (
        <div
          key={`skip-${skipFx.key}`}
          className="absolute z-[32] pointer-events-none momentum-zzz-float"
          style={{
            left: '50%',
            top: '40%',
            transform: 'translate(-50%, -50%)',
            fontSize: '48px',
            color: skipFx.team === 'player' ? '#a5f3fc' : '#fecaca',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            fontWeight: 900,
          }}
        >
          💤
        </div>
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
