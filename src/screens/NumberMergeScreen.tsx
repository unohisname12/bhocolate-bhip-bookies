import { useGameCheck } from '../features/quick-check/context';
import { usePrediction } from '../features/learning/usePrediction';
import { additionDecision } from '../features/learning/decisions';
import { useLearningSettings } from '../components/LearningContext';
import { GameRules } from '../components/game/GameRules';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PetSprite } from '../components/pet/PetSprite';
import '../features/number-merge/numberMerge.css';
import { SPECIES_CONFIG } from '../config/speciesConfig';
import { NumberMergeBoard } from '../features/number-merge/NumberMergeBoard';
import {
  NUMBER_MERGE_DIFFICULTY_PRESETS,
  getNumberMergeDifficultyPreset,
} from '../features/number-merge/difficulty';
import { NumberMergeOverseerEntity } from '../features/number-merge/NumberMergeOverseerEntity';
import { isAdjacent } from '../features/number-merge/game';
import { useNumberMergeGame } from '../features/number-merge/useNumberMergeGame';
import {
  NUMBER_MERGE_MAX_CORRUPTION,
  type NumberMergeDifficulty,
  type NumberMergePosition,
} from '../features/number-merge/types';

interface NumberMergeScreenProps {
  petSpeciesId: string | null;
  onExit: () => void;
  /** Invoked once when the player first reaches the `won` phase. */
  onComplete?: () => void;
  onWin?: (tokenReward: number) => void;
}

export const NumberMergeScreen: React.FC<NumberMergeScreenProps> = ({
  petSpeciesId,
  onExit,
  onWin,
  onComplete,
}) => {
  const ensureCheck = useGameCheck();
  const resultDialog = useRef<HTMLDialogElement>(null);
  const [difficulty, setDifficulty] = useState<NumberMergeDifficulty>('easy');
  const preset = getNumberMergeDifficultyPreset(difficulty);
  const {
    state,
    select,
    playMove,
    reset,
    acknowledgeOverseerEvent,
  } = useNumberMergeGame(petSpeciesId, difficulty);
  const learning=useLearningSettings();
  const prediction=usePrediction(JSON.stringify([state.board,state.phase]));
  const planMerge=(from:NumberMergePosition,to:NumberMergePosition)=>{
    const a=state.board[from.row]?.[from.col],b=state.board[to.row]?.[to.col];
    const problem=a?.kind==='number'&&b?.kind==='number'?additionDecision(learning,`merge:${crypto.randomUUID()}`,a.value,b.value):null;
    return prediction.attempt(problem,()=>playMove(from,to));
  };
  const strikeFlash = Boolean(state.lastOverseerEvent);
  // Ensure onWin fires only once per victory, even across re-renders.
  const winAwarded = useRef(false);

  useEffect(() => {
    if (['won', 'lost'].includes(state.phase) && !winAwarded.current) {
      winAwarded.current = true;
      onComplete?.();
      if (state.phase === 'won') onWin?.(preset.winTokenReward);
    }
    if (state.phase !== 'won' && state.phase !== 'lost' && winAwarded.current) {
      // New run started (e.g., after Reset) — re-arm the award gate.
      winAwarded.current = false;
    }
  }, [state.phase, onWin, onComplete, preset.winTokenReward]);

  useEffect(() => {
    if (state.phase === 'won' || state.phase === 'lost') resultDialog.current?.showModal();
    else resultDialog.current?.close();
  }, [state.phase]);

  const petConfig = petSpeciesId ? SPECIES_CONFIG[petSpeciesId] : null;
  const lastMove = state.lastMove;
  const corruptionPercent = Math.min(100, Math.round((state.corruption / NUMBER_MERGE_MAX_CORRUPTION) * 100));

  useEffect(() => {
    if (!state.lastOverseerEvent) {
      return;
    }

    const timer = window.setTimeout(() => {
      acknowledgeOverseerEvent();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [state.lastOverseerEvent, acknowledgeOverseerEvent]);

  const moveSummary = useMemo(() => {
    if (state.phase === 'won') {
      return `Target score reached! You earned ${preset.winTokenReward} tokens.`;
    }
    if (state.phase === 'lost') {
      return 'You ran out of hearts. Lower the difficulty or reset and try again.';
    }

    if (state.feedback) {
      return state.feedback.message;
    }

    if (!lastMove) {
      if (state.turnsRemaining !== null) {
        return `Make ${state.searchTarget} before the turn window runs out. Each missed target costs a heart.`;
      }

      return 'Merge numbers to hit the target value. Harder modes add search pressure and Overseer interference.';
    }

    if (lastMove.petBonus) {
      return lastMove.petBonus.description;
    }

    if (lastMove.action === 'slide') {
      return state.turnsRemaining !== null
        ? `Slide used a turn. You have ${state.turnsRemaining} turn${state.turnsRemaining === 1 ? '' : 's'} left to make ${state.searchTarget}.`
        : `Slide used a turn. Reposition now and set up ${state.searchTarget}.`;
    }

    if (state.turnsRemaining !== null) {
      return `Merged into ${lastMove.createdTileValue}. You now have ${state.turnsRemaining} turn${state.turnsRemaining === 1 ? '' : 's'} to make ${state.searchTarget}.`;
    }

    return `Merged into ${lastMove.createdTileValue}. Keep steering the board toward ${state.searchTarget}.`;
  }, [lastMove, state.feedback, state.phase, state.searchTarget, state.turnsRemaining, preset.winTokenReward]);

  const tryActivate = (position: NumberMergePosition) => {
    if (state.phase === 'lost' || state.phase === 'won') {
      return;
    }

    if (!state.selected) {
      select(position);
      return;
    }

    if (state.selected.row === position.row && state.selected.col === position.col) {
      select(position);
      return;
    }

    if (isAdjacent(state.selected, position)) {
      if(planMerge(state.selected, position))return;
    }

    const tile = state.board[position.row]?.[position.col];
    if (tile?.kind === 'number') {
      select(position);
    }
  };

  const handleArrowMerge = (position: NumberMergePosition) => {
    if (!state.selected || state.phase === 'lost' || state.phase === 'won') {
      return;
    }

    planMerge(state.selected, position);
  };

  const restart = async () => {
    if ((state.turns === 0 || state.phase === 'won' || state.phase === 'lost' || window.confirm('Start a new board? Your current board will end.')) && await ensureCheck('number_merge', reset)) reset();
  };
  const scorePercent = Math.min(100, state.score / preset.winScore * 100);
  const threat = difficulty === 'easy' ? 'Just watching' : difficulty === 'normal' ? 'Stay on target' : state.phase === 'chain_window' ? 'Close the gaps!' : 'Breach active';

  return (
    <main className={`number-merge ${strikeFlash ? 'nm-struck' : ''}`} aria-label="Number Merge arena">
      <div className="nm-shell">
        <header className="nm-header">
          <div className="nm-title"><span className="nm-brand">Auralith arcade <span>✦</span> Pet assist puzzle</span>
            <h1 aria-label="Number Merge: Overseer Breach">Number <em>Merge</em><span>OVERSEER BREACH</span></h1>
          </div>
          <div className="nm-actions"><button className="nm-button" aria-label="Reset Run" onClick={restart}>↻ <span>Reset Run</span></button><button className="nm-button nm-exit" aria-label="Back Home" onClick={onExit}>← <span>Back Home</span></button></div>
        </header>

        <div className="nm-modebar">
          <div className="nm-difficulties" aria-label="Difficulty">{(Object.keys(NUMBER_MERGE_DIFFICULTY_PRESETS) as NumberMergeDifficulty[]).map(option => <button key={option} aria-pressed={difficulty === option} onClick={async () => {
            if (option !== difficulty && (state.turns === 0 || state.phase === 'won' || state.phase === 'lost' || window.confirm('Start a new board at this difficulty? Your current board will end.')) && await ensureCheck('number_merge', () => setDifficulty(option))) setDifficulty(option);
          }}>{NUMBER_MERGE_DIFFICULTY_PRESETS[option].label}</button>)}</div>
          <p>{difficulty === 'easy' ? 'Find your rhythm. No timer. No lost hearts.' : preset.description}</p>
        </div>

        <div className="nm-layout">
          <aside className="nm-companion nm-panel" aria-label="Your companion">
            <span className="nm-eyebrow">Your companion</span>
            <div className="nm-pet-stage"><div className="nm-pedestal"/>{petSpeciesId ? <PetSprite speciesId={petSpeciesId} animationName={lastMove?.petBonus ? 'happy' : 'idle'} scale={0.85}/> : <span className="nm-empty-companion">✦</span>}</div>
            <h2>{petConfig?.name ?? 'Your adventure'}</h2><span className="nm-tag">{petSpeciesId ? 'By your side' : 'A pet awaits at home'}</span>
            <p>{petSpeciesId === 'koala_sprite' ? 'Make exactly 10 to give a low tile a +1 boost. Recharges in 4 turns.' : petSpeciesId ? 'Your companion is here to cheer you on. Plan a path to the next target.' : 'You can play now. Hatch your earned pet to bring a companion along.'}</p>
            <div className="nm-run-stats"><div><span>Moves</span><strong>{state.turns}</strong></div><div><span>Chain</span><strong>×{Math.max(1,state.combo)}</strong></div></div>
            <div className="nm-reward"><span>Victory reward</span><strong>✦ {preset.winTokenReward} <small>tokens</small></strong></div>
          </aside>

          <section className="nm-playfield" aria-label="Puzzle board">
            <div className="nm-objective">
              <div className="nm-target"><span className="nm-target-gem">{state.searchTarget}</span><div><span className="nm-eyebrow">Your next target</span><h2>Make exactly {state.searchTarget}</h2><p>{state.turnsRemaining === null ? 'Add neighboring numbers.' : `${state.turnsRemaining} moves left in this search window.`}</p></div></div>
              <div className={`nm-hearts ${state.turnsRemaining !== null && state.turnsRemaining <= 1 ? 'nm-urgent' : ''}`}><span>{difficulty === 'easy' ? 'NO PRESSURE' : 'HEARTS'}</span><strong aria-label={`${state.lives} of ${state.maxLives} hearts`}>♥ <b>{state.lives}</b><small> / {state.maxLives}</small></strong></div>
            </div>
            <div className="nm-score"><div><span>Run score <strong data-testid="merge-score">{state.score}</strong></span><span>{preset.winScore} to win <i>✦</i></span></div><div className="nm-track" role="progressbar" aria-label="Score toward victory" aria-valuenow={state.score} aria-valuemax={Math.max(preset.winScore,state.score)} aria-valuemin={0}><span style={{width:`${scorePercent}%`}}/></div></div>
            <NumberMergeBoard board={state.board} selected={state.selected} unstableCells={preset.enableChainWindow ? state.unstableCells : []} lastCreatedTileId={lastMove?.createdTileId ?? null} petBonusTileId={lastMove?.petBonus?.affectedTileId ?? null} lastOverseerPositions={state.lastOverseerEvent?.positions ?? []} onTileActivate={tryActivate} onArrowMerge={handleArrowMerge}/>
            <div className={`nm-feedback nm-feedback-${state.feedback?.tone ?? 'neutral'}`} role="status"><span aria-hidden="true">{state.feedback?.tone === 'success' ? '✦' : state.feedback?.tone === 'danger' ? '!' : '→'}</span><p>{state.turns === 0 && state.phase === 'playing' ? 'Tap a number, then a neighbor. Their sum becomes your new tile.' : moveSummary}</p></div>
          </section>

          <aside className="nm-overseer nm-panel" aria-label="Overseer status">
            <div className="nm-overseer-heading"><span className="nm-eyebrow">The Overseer</span><span className={`nm-status-dot ${difficulty === 'easy' ? '' : 'nm-status-active'}`}/></div>
            <NumberMergeOverseerEntity phase={state.phase} chainTimeLeftMs={state.chainTimeLeftMs} lastOverseerEvent={state.lastOverseerEvent} corruption={state.corruption} attackAnimationLevel={preset.attackAnimationLevel}/>
            <h2>{threat}</h2><p>{difficulty === 'easy' ? 'It’s keeping an eye on the board. Take your time and experiment.' : difficulty === 'normal' ? 'Your first missed window is a warning. The next costs a heart.' : 'Empty gaps invite interference. Move quickly to hold off the breach.'}</p>
            <div className="nm-star-meter"><span>Goal stars</span><strong aria-label={`${state.goalStars} of ${state.maxGoalStars} goal stars`}>{Array.from({length:state.maxGoalStars},(_,i)=><span key={i} className={state.goalStars>=i+1?'nm-star-full':state.goalStars>i?'nm-star-half':''}>★</span>)}</strong><small>{state.goalStars.toFixed(1)} / {state.maxGoalStars}</small></div>
            {preset.enableChainWindow && <div className="nm-pressure"><div><span>Gap Window</span><strong>{state.phase === 'chain_window' ? `${(state.chainTimeLeftMs / 1000).toFixed(1)}s` : 'Ready'}</strong></div><div className="nm-track"><span style={{width:`${state.phase === 'chain_window' ? Math.max(0,state.chainTimeLeftMs / Math.max(1,state.chainDurationMs)*100) : 0}%`}}/></div></div>}
            {preset.enableCorruption && <div className="nm-pressure nm-corruption"><div><span>Corruption</span><strong>{corruptionPercent}%</strong></div><div className="nm-track"><span style={{width:`${corruptionPercent}%`}}/></div></div>}
            <span className="nm-threat-label">{difficulty === 'easy' ? 'Safe to explore' : `Threat level · ${preset.label}`}</span>
          </aside>
        </div>

        <footer className="nm-footer"><GameRules name="Number Merge"><h2>A little strategy. A bigger number.</h2><ol><li>Tap a number, then its neighbor above, below, left or right. Any two numbers add together: 2 + 3 makes 5.</li><li>Build the exact target shown above the board. Equal neighboring numbers can continue a chain.</li><li>Reach {preset.winScore} points to win {preset.winTokenReward} tokens. Sliding into an empty space uses a move.</li><li>{difficulty === 'easy' ? 'Practice freely: no hearts or stars are lost.' : preset.description}</li><li>{preset.enableChainWindow ? 'Close empty gaps before the Gap Window expires to avoid Overseer interference.' : 'There is no real-time countdown in this mode.'}</li></ol><p>Keyboard: Tab to a tile, Enter to select, then tap a neighbor or use the Merge direction buttons.</p></GameRules><div className="nm-learning">{prediction.toggle}</div></footer>
        <div className="nm-prediction">{prediction.panel}</div>
        {(state.phase === 'won' || state.phase === 'lost') && <dialog ref={resultDialog} className={`nm-result nm-result-${state.phase}`} aria-label="Round result"><span className="nm-eyebrow">{state.phase === 'won' ? 'Breach cleared' : 'The Overseer wins this round'}</span><h2>{state.phase === 'won' ? 'VICTORY!' : 'Ready for a comeback?'}</h2><p>{state.phase === 'won' ? `You reached ${preset.winScore} points and earned ${preset.winTokenReward} tokens.` : 'Your hearts ran out. Try a fresh board or choose an easier mode.'}</p><strong>{state.score} points · {state.turns} moves</strong><div><button className="nm-button nm-primary" onClick={restart}>Play Again</button><button className="nm-button" onClick={onExit}>Back Home</button></div><button className="nm-review-board" onClick={() => resultDialog.current?.close()}>Review board</button></dialog>}
      </div>
    </main>
  );
};
