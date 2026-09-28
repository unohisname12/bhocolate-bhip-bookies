import {CAPTURE_DURATION} from '../components/momentum/effects/CaptureSequence';
import { Modal } from '../components/ui/Modal';
import {MomentumPowerVideo,MomentumPowerCards} from '../components/momentum/ui/MomentumPowerGuide';
import {PetSprite} from '../components/pet/PetSprite';
import { usePrediction } from '../features/learning/usePrediction';
import { quantityDecision } from '../features/learning/decisions';
import { useLearningSettings } from '../components/LearningContext';
import { GameRules } from '../components/game/GameRules';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type {
  ActiveMomentumState,
  BoardPosition,
  FlashChoice,
  MomentumDifficulty, MomentumMode,
  MomentumGameEvent,
  MomentumPiece,
  MomentumPhase,
} from '../types/momentum';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { DIFFICULTY_SETTINGS, momentumTurnLimit } from '../config/momentumConfig';
import {
  MomentumBoard,
  MomentumHUD,
  MomentumActionBar,
  MomentumLog,
  MomentumResultOverlay,
  PieceMoveAnimator,
  FlashSequence,
  FusionAnimation,
  DEFAULT_THEME,
} from '../components/momentum';
import '../components/momentum/effects/MomentumAnimations.css';
import { MomentumCoach, MomentumRules } from '../components/momentum/ui/MomentumGuide';
import './MomentumScreen.css';

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
  const [guideOpen,setGuideOpen]=useState(false);
  const learning=useLearningSettings();
  const prediction=usePrediction(JSON.stringify([state.turnCount,state.phase,state.pieces,state.selectedPieceId]));
  const [boardSize, setBoardSize] = useState(320);
  const boardFrame = useRef<HTMLDivElement>(null);
  const cellSize = (boardSize - (state.board.length - 1) * GRID_GAP) / state.board.length;
  const [mode, setMode] = useState<MomentumMode>(state.mode ?? 'classic');
  useEffect(() => {
    const frame = boardFrame.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => setBoardSize(Math.max(200, entry.contentRect.width - 20)));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Difficulty picker — shown on first mount
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(state.turnCount === 1 && state.log.length === 0);

  // Previous state tracking for detecting phase transitions
  const prevStateRef = useRef<ActiveMomentumState>(state);
  const prevPhaseRef = useRef<MomentumPhase>(state.phase);

  // Animation metadata captured on phase transition
  const [animMeta, setAnimMeta] = useState<AnimationMeta>(EMPTY_META);

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
        if(state.mode==='powers'){dispatch({type:'MOMENTUM_EXECUTE_MOVE',moveIndex});return;}
        const piece=state.pieces.find(p=>p.id===state.selectedPieceId),move=state.validMoves[moveIndex];
        const task=piece?quantityDecision(learning,`momentum-plan:${crypto.randomUUID()}`,'momentum',piece.energy,move.energyCost,'energy',`Move to column ${x+1}, row ${y+1}. Predict energy after the move cost, before station or capture effects.`):null;
        prediction.attempt(task,()=>dispatch({ type: 'MOMENTUM_EXECUTE_MOVE', moveIndex }));
      }
    },
    [state.mode, state.validMoves, state.pieces, state.selectedPieceId, learning, prediction, dispatch],
  );

  const animationKey = `${state.turnCount}:${state.phase}:${JSON.stringify(state.lastEvent)}`;
  const completedAnimation = useRef<string|null>(null);
  const handleAnimationDone = useCallback(() => {
    if (completedAnimation.current === animationKey) return;
    completedAnimation.current = animationKey;
    dispatch({ type: 'MOMENTUM_ANIMATION_DONE' });
  }, [dispatch, animationKey]);
  // Attacks retain both pieces in engine state until their cinematic completes.
  const attack = (state.phase === 'animating_attack' || state.phase === 'animating_ai') && state.lastEvent?.type === 'piece_attacked' ? state.lastEvent : null;
  const attacker = attack ? state.pieces.find(piece => piece.id === attack.attackerId) : null;
  const defender = attack ? state.pieces.find(piece => piece.id === attack.defenderId) : null;

  // ─── Phase transition detection ──────────────────────────────────────

  useEffect(() => {
    let upgradeTimer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
    const prevPhase = prevPhaseRef.current;
    const prevState = prevStateRef.current;
    const currentPhase = state.phase;

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
        break;
      }

      case 'animating_attack':
      case 'animating_ai': {
        setAnimMeta(meta);
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
          upgradeTimer = setTimeout(() => {
            dispatch({ type: 'MOMENTUM_ANIMATION_DONE' });
          }, 500);

        }
        break;
      }

      default:
        // Reset animation state on non-animation phases
        setAnimMeta(EMPTY_META);
        break;
    }
    });
    return () => { cancelAnimationFrame(frame); if (upgradeTimer) clearTimeout(upgradeTimer); };
  }, [state, dispatch]);

  // A resumed save or a rank-up event may not have a previous animation frame.
  useEffect(() => {
    if (!state.phase.startsWith('animating')) return;
    const timer = setTimeout(handleAnimationDone, attack ? CAPTURE_DURATION + 1200 : 1800);
    return () => clearTimeout(timer);
  }, [state.phase, handleAnimationDone, attack, guideOpen]);

  // ─── AI turn pacing — a short pause to follow each move ────────

  useEffect(() => {
    if (state.phase !== 'ai_turn' || guideOpen) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'MOMENTUM_AI_EXECUTE' });
    }, 2000);
    return () => clearTimeout(timer);
  }, [state.phase, dispatch, guideOpen]);

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
          handleAnimationDone();
        } else if (state.phase === 'ai_turn' && !guideOpen) {
          dispatch({ type: 'MOMENTUM_AI_EXECUTE' });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [state.phase, dispatch, guideOpen, handleAnimationDone]);

  // ─── Cleanup timers ─────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (skipFxTimerRef.current) clearTimeout(skipFxTimerRef.current);
      if (promoteFxTimerRef.current) clearTimeout(promoteFxTimerRef.current);
    };
  }, []);

  // ─── Animation overlay rendering helpers ────────────────────────────

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
    !animMeta.isAttack;

  // AI "thinking" dim — enemy is acting and the board is not player-interactive
  const aiThinking =
    state.phase === 'ai_turn' ||
    (state.phase === 'animating_ai' && state.activeTeam === 'enemy');

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div
      className="momentum-screen min-h-screen relative overflow-hidden"
      style={{ background: theme.backdrop }}
    >
      <header className="momentum-titlebar"><div><span>AURALITH TACTICS</span><h1>Momentum<span>{state.mode==='powers'?'POWER CLASH':'THE GUARDIAN BOARD'}</span></h1></div><MomentumPowerVideo onOpenChange={setGuideOpen}/></header>
      {/* Backdrop: strategy chamber scene, full screen */}
      <img
        src="/assets/generated/final/scene_strategy_chamber.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Dark vignette for focus on the board */}
      <div
        className="momentum-vignette absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%)' }}
      />

      {/* ===== HUD — floats at top like a hanging banner ===== */}
      <div className="momentum-hud relative z-20">
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

      <div className="relative z-20 momentum-coach-wrap"><MomentumCoach state={state} dispatch={dispatch}/></div>

      {state.mode!=='powers'&&<div className="relative z-20 momentum-coach-wrap momentum-planning">{prediction.toggle}{prediction.panel}</div>}
      {/* ===== BOARD — sits on the altar with a perspective tilt ===== */}
      <div
        ref={boardFrame}
        data-help="momentum-board"
        className="momentum-board-wrap relative z-10"
        style={{
          width: '100%',
          filter: 'drop-shadow(0 20px 24px rgba(0,0,0,0.6))',
        }}
      >
        {/* Board shake + AI-thinking + entrance wrapper */}
        <div
          className={[
            aiThinking && !attack ? 'momentum-ai-thinking' : '',
            boardEntered || attack ? '' : 'momentum-board-entrance',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <MomentumBoard
            state={state}
            boardSize={boardSize}
            onCellClick={handleCellClick}
            onPieceClick={handlePieceClick}
            promoteFx={promoteFx}
            capture={attacker && defender ? {attacker,defender,onComplete:handleAnimationDone,sequenceKey:animationKey} : null}
          />
        </div>

        {/* Animation overlays aligned to the board's grid */}
        <div
          className="absolute pointer-events-none"
          style={{ top: 8, left: 8, width: boardSize, height: boardSize }}
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
              onComplete={handleAnimationDone}
            />
          )}
        </div>
      </div>

      {/* ===== Action log — carved stone tablet on the left ===== */}
      <div className="momentum-log-wrap relative z-10">
        <div
          className="p-2 rounded-lg border-2 border-cyan-400/30 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
          style={{
            background: 'linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(30,41,59,0.85) 100%)',
            backdropFilter: 'blur(3px)',
          }}
        >
          {petSpeciesId&&<div className="momentum-companion"><PetSprite speciesId={petSpeciesId} animationName="idle" scale={.65}/><span>Your companion is cheering you on</span></div>}
          <p className="momentum-win-note">Capture every red guardian.<br/>Win before turn {momentumTurnLimit(state.difficulty,state.mode)}.</p>
          {state.mode==='powers'&&<p className="momentum-win-note">+ add energy · − drain energy<br/>× double stride · ÷ share power</p>}
          <details><summary>Recent moves</summary><MomentumLog log={state.log} /></details>
        </div>
      </div>

      {/* ===== Action bar — bottom center ===== */}
      <div className="momentum-actions relative z-20">
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
        <Modal isOpen onClose={() => dispatch({ type: 'END_MOMENTUM' })} title="Choose your Momentum game" panelClassName="!max-w-2xl">
        <div className="momentum-picker flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-3" aria-label="Board mode">{(['classic','advanced','powers'] as MomentumMode[]).map(m=><button key={m} aria-pressed={mode===m} className="px-4 py-3 rounded border border-cyan-300 text-white aria-pressed:bg-cyan-800" onClick={()=>setMode(m)}>{m==='classic'?'Classic · 5×5':m==='advanced'?'Advanced · 7×7':'Power Clash · Hard'}</button>)}</div>
          <p className="max-w-md px-5 text-slate-200">{mode==='powers'?'Four guardians. Four math powers. No questions to answer. A tougher 7×7 battle against an opponent with the same abilities.':mode==='advanced'?'Five pieces per side. Guard, transfer energy, and control three energy stations.':'Three pieces per side. Learn movement, captures and upgrades.'}</p>
          {mode==='powers'?<div className="momentum-picker-powers"><MomentumPowerVideo/><MomentumPowerCards/></div>:<div className="max-w-lg px-5 text-slate-200"><GameRules name="Momentum setup"><section aria-label="Momentum quick start"><p>Start with Easy. Skip Turn stores energy but gives your opponent a turn too.</p></section><MomentumRules advanced={mode==='advanced'}/></GameRules></div>}
          <div className="flex gap-3">
            {(mode==='powers'?['hard']:['easy', 'medium', 'hard'] as MomentumDifficulty[]).map(value => {
              const d=value as MomentumDifficulty;
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
                    dispatch({ type: 'MOMENTUM_SET_DIFFICULTY', difficulty: d, mode });
                    setShowDifficultyPicker(false);
                  }}
                >
                  <div>{s.label}</div>
                  <div className="text-xs font-normal opacity-80">{momentumTurnLimit(d,mode)} turns</div>
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
        </Modal>
      )}
    </div>
  );
};
