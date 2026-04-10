import React, { useEffect, useMemo, useState } from 'react';
import { ASSETS } from '../config/assetManifest';
import { SPECIES_CONFIG } from '../config/speciesConfig';
import { NumberMergeBoard } from '../features/number-merge/NumberMergeBoard';
import {
  DEFAULT_NUMBER_MERGE_DIFFICULTY,
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
  onWin?: (tokenReward: number) => void;
}

const OVERSEER_PORTRAIT = '/assets/generated/final/number-merge/overseer-portrait.png';
const OVERSEER_METER_ICON = '/assets/generated/final/number-merge/overseer-meter-eye.png';

const HEART_FILLED = '♥';
const HEART_EMPTY = '♡';
const STAR_FILLED = '★';
const STAR_EMPTY = '☆';

const formatGoalStars = (value: number, max: number): string => {
  const fullStars = Math.floor(value);
  const hasHalf = value % 1 >= 0.5;
  const emptyStars = Math.max(0, max - fullStars - (hasHalf ? 1 : 0));
  return `${STAR_FILLED.repeat(fullStars)}${hasHalf ? '⯨' : ''}${STAR_EMPTY.repeat(emptyStars)}`;
};

export const NumberMergeScreen: React.FC<NumberMergeScreenProps> = ({
  petSpeciesId,
  onExit,
  onWin,
}) => {
  const [difficulty, setDifficulty] = useState<NumberMergeDifficulty>(DEFAULT_NUMBER_MERGE_DIFFICULTY);
  const preset = getNumberMergeDifficultyPreset(difficulty);
  const {
    state,
    select,
    playMove,
    reset,
    acknowledgeOverseerEvent,
  } = useNumberMergeGame(petSpeciesId, difficulty);
  const [strikeFlash, setStrikeFlash] = useState(false);
  // Ensure onWin fires only once per victory, even across re-renders.
  const [winAwarded, setWinAwarded] = useState(false);

  useEffect(() => {
    if (state.phase === 'won' && !winAwarded) {
      setWinAwarded(true);
      onWin?.(preset.winTokenReward);
    }
    if (state.phase !== 'won' && state.phase !== 'lost' && winAwarded) {
      // New run started (e.g., after Reset) — re-arm the award gate.
      setWinAwarded(false);
    }
  }, [state.phase, winAwarded, onWin, preset.winTokenReward]);

  const petConfig = petSpeciesId ? SPECIES_CONFIG[petSpeciesId] : null;
  const petPortrait = petSpeciesId ? ASSETS.petPortraits[petSpeciesId] : '';
  const lastMove = state.lastMove;
  const corruptionPercent = Math.min(100, Math.round((state.corruption / NUMBER_MERGE_MAX_CORRUPTION) * 100));
  const livesDisplay = Array.from({ length: state.maxLives }, (_, index) =>
    index < state.lives ? HEART_FILLED : HEART_EMPTY).join(' ');
  const goalStarsDisplay = formatGoalStars(state.goalStars, state.maxGoalStars);

  useEffect(() => {
    if (!state.lastOverseerEvent) {
      return;
    }

    setStrikeFlash(true);
    const timer = window.setTimeout(() => {
      setStrikeFlash(false);
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

  const feedbackToneStyles = useMemo(() => {
    if (state.feedback?.tone === 'success') {
      return {
        border: '1px solid rgba(74,222,128,0.35)',
        background: 'linear-gradient(180deg, rgba(20,83,45,0.7) 0%, rgba(5,46,22,0.82) 100%)',
        text: 'text-green-100',
        label: 'Good',
      };
    }

    if (state.feedback?.tone === 'warning') {
      return {
        border: '1px solid rgba(251,191,36,0.35)',
        background: 'linear-gradient(180deg, rgba(120,53,15,0.68) 0%, rgba(68,26,3,0.82) 100%)',
        text: 'text-amber-100',
        label: 'Warning',
      };
    }

    if (state.feedback?.tone === 'danger') {
      return {
        border: '1px solid rgba(248,113,113,0.35)',
        background: 'linear-gradient(180deg, rgba(127,29,29,0.7) 0%, rgba(69,10,10,0.84) 100%)',
        text: 'text-red-100',
        label: 'Danger',
      };
    }

    return {
      border: '1px solid rgba(103,232,249,0.2)',
      background: 'linear-gradient(180deg, rgba(15,23,42,0.65) 0%, rgba(2,6,23,0.82) 100%)',
      text: 'text-slate-100',
      label: 'Info',
    };
  }, [state.feedback?.tone]);

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
      const applied = playMove(state.selected, position);
      if (applied) {
        return;
      }
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

    playMove(state.selected, position);
  };

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6 lg:px-8"
      style={{
        background: strikeFlash
          ? 'radial-gradient(circle at top, rgba(248,113,113,0.35) 0%, rgba(15,23,42,0.98) 45%), linear-gradient(180deg, #3f0d12 0%, #0f172a 50%, #111827 100%)'
          : 'radial-gradient(circle at top, rgba(103,232,249,0.12) 0%, rgba(15,23,42,0.96) 45%), linear-gradient(180deg, #082f49 0%, #0f172a 45%, #111827 100%)',
        transition: 'background 180ms ease',
      }}
    >
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 w-[min(calc(100vw-1.5rem),28rem)] -translate-x-1/2 lg:bottom-6 lg:left-auto lg:right-6 lg:w-80 lg:translate-x-0">
        <div
          className="rounded-[24px] border px-4 py-3 shadow-2xl backdrop-blur"
          style={{
            borderColor: state.turnsRemaining !== null && state.turnsRemaining <= 1
              ? 'rgba(251,191,36,0.5)'
              : 'rgba(103,232,249,0.28)',
            background: state.turnsRemaining !== null && state.turnsRemaining <= 1
              ? 'linear-gradient(180deg, rgba(120,53,15,0.9) 0%, rgba(68,26,3,0.92) 100%)'
              : 'linear-gradient(180deg, rgba(8,47,73,0.88) 0%, rgba(15,23,42,0.94) 100%)',
            boxShadow: state.turnsRemaining !== null && state.turnsRemaining <= 1
              ? '0 18px 40px rgba(120,53,15,0.3)'
              : '0 18px 40px rgba(2,132,199,0.22)',
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-50/70">Goal</div>
              <div className="mt-1 text-3xl font-black leading-none text-white">
                Make {state.searchTarget}
              </div>
            </div>
            <div className="text-right">
              {state.turnsRemaining !== null ? (
                <>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-50/70">Turns</div>
                  <div className={`text-2xl font-black ${state.turnsRemaining <= 1 ? 'text-amber-200' : 'text-white'}`}>
                    {state.turnsRemaining}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-pink-50/70">Hearts</div>
                  <div className="text-2xl font-black text-pink-200">{state.lives}</div>
                </>
              )}
            </div>
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-100/90">
            {state.turnsRemaining !== null
              ? `Miss the target when this hits 0 and you lose a heart.`
              : `Keep building until you land exactly on ${state.searchTarget}.`}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 pt-2">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-200/65">Goal Stars</div>
            <div className="text-sm font-black text-yellow-200">
              {goalStarsDisplay} <span className="text-yellow-50/70">{state.goalStars.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200/80">Pet Assist Puzzle</p>
            <h1
              className="text-3xl font-black text-white sm:text-4xl"
              style={{ fontFamily: '"Trebuchet MS", "Verdana", sans-serif' }}
            >
              Number Merge: Overseer Breach
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-200/82 sm:text-base">
              Same core game in every mode: slide or merge numbers, hit the target value, and protect your hearts.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950"
              style={{
                background: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 100%)',
                boxShadow: '0 12px 30px rgba(245,158,11,0.25)',
              }}
            >
              Reset Run
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white"
              style={{ background: 'rgba(15,23,42,0.45)' }}
            >
              Back Home
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/70">Difficulty</p>
              <p className="mt-1 text-sm text-slate-300/85">{preset.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(NUMBER_MERGE_DIFFICULTY_PRESETS) as NumberMergeDifficulty[]).map((option) => {
                const optionPreset = NUMBER_MERGE_DIFFICULTY_PRESETS[option];
                const active = option === difficulty;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDifficulty(option)}
                    className="rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.18em] transition-all duration-150"
                    style={{
                      background: active
                        ? 'linear-gradient(180deg, #67e8f9 0%, #0ea5e9 100%)'
                        : 'rgba(15,23,42,0.55)',
                      color: active ? '#082f49' : '#e2e8f0',
                      border: active ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.14)',
                    }}
                  >
                    {optionPreset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-[32px] border border-white/10 bg-slate-950/35 p-4 shadow-2xl shadow-slate-950/25 backdrop-blur sm:p-6">
            <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
              <div
                className="rounded-[24px] border px-4 py-4 sm:px-5"
                style={{
                  borderColor: state.turnsRemaining !== null && state.turnsRemaining <= 1
                    ? 'rgba(251,191,36,0.35)'
                    : 'rgba(103,232,249,0.18)',
                  background: state.turnsRemaining !== null && state.turnsRemaining <= 1
                    ? 'linear-gradient(180deg, rgba(120,53,15,0.7) 0%, rgba(68,26,3,0.84) 100%)'
                    : 'linear-gradient(180deg, rgba(8,47,73,0.78) 0%, rgba(15,23,42,0.88) 100%)',
                }}
              >
                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/75">Current Goal</div>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-cyan-100/80">Make exactly</div>
                    <div className="text-4xl font-black text-white sm:text-5xl">{state.searchTarget}</div>
                  </div>
                  {state.turnsRemaining !== null ? (
                    <div className="text-right">
                      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-100/70">Turns Left</div>
                      <div className={`text-3xl font-black ${state.turnsRemaining <= 1 ? 'text-amber-200' : 'text-white'}`}>
                        {state.turnsRemaining}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-100/88">
                  {state.turnsRemaining !== null
                    ? `Hit ${state.searchTarget} within ${state.turnsRemaining} turn${state.turnsRemaining === 1 ? '' : 's'} or lose a heart.`
                    : `Build a merge that lands exactly on ${state.searchTarget}.`}
                </div>
              </div>
              <div
                className="rounded-2xl border border-white/10 px-4 py-3"
                style={{ background: 'linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.85) 100%)' }}
              >
                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-pink-200/75">Hearts</div>
                <div className="mt-2 text-xl font-black text-pink-200" style={{ letterSpacing: '0.12em' }}>{livesDisplay}</div>
              </div>
              <div
                className="rounded-2xl border border-white/10 px-4 py-3"
                style={{ background: 'linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.85) 100%)' }}
              >
                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/75">Score</div>
                <div className="mt-1 text-2xl font-black text-white">{state.score}</div>
              </div>
              <div
                className="rounded-2xl border border-white/10 px-4 py-3"
                style={{ background: 'linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.85) 100%)' }}
              >
                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-yellow-200/75">Goal Stars</div>
                <div className="mt-1 text-xl font-black text-yellow-200">{goalStarsDisplay}</div>
                <div className="mt-1 text-xs font-bold text-slate-300/80">{state.goalStars.toFixed(1)} left</div>
              </div>
            </div>

            <div
              className={`mb-4 rounded-2xl px-4 py-4 ${feedbackToneStyles.text}`}
              style={{
                border: feedbackToneStyles.border,
                background: feedbackToneStyles.background,
              }}
            >
              <div className="text-[11px] font-black uppercase tracking-[0.28em] opacity-80">
                {feedbackToneStyles.label}
              </div>
              <div className="mt-1 text-base font-bold">
                {moveSummary}
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-4">
              {state.turnsRemaining !== null && (
                <div className="rounded-2xl border border-amber-300/15 bg-slate-950/40 px-4 py-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-200/70">Search Window</div>
                  <div className={`mt-1 text-xl font-black ${state.turnsRemaining <= 1 ? 'text-amber-200' : 'text-white'}`}>
                    {state.turnsRemaining} turn{state.turnsRemaining === 1 ? '' : 's'} left
                  </div>
                </div>
              )}

              {preset.enableChainWindow && (
                <div className="min-w-[220px] rounded-2xl border border-amber-300/15 bg-slate-950/40 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-200/70">Gap Window</div>
                    <div className="text-sm font-black text-amber-200">
                      {state.phase === 'chain_window' ? `${(state.chainTimeLeftMs / 1000).toFixed(1)}s` : '--'}
                    </div>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-900/70">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{
                        width: `${state.phase === 'chain_window'
                          ? Math.max(4, (state.chainTimeLeftMs / Math.max(1, state.chainDurationMs)) * 100)
                          : 0}%`,
                        background: 'linear-gradient(90deg, #fde68a 0%, #f97316 100%)',
                      }}
                    />
                  </div>
                </div>
              )}

              {preset.enableCorruption && (
                <div className="min-w-[220px] rounded-2xl border border-red-300/15 bg-slate-950/40 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={OVERSEER_METER_ICON} alt="" className="h-7 w-7" style={{ imageRendering: 'pixelated' }} />
                      <div className="text-[11px] font-black uppercase tracking-[0.28em] text-red-200/70">Corruption</div>
                    </div>
                    <div className="text-sm font-black text-red-200">{corruptionPercent}%</div>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-900/70">
                    <div
                      className="h-full rounded-full transition-all duration-150"
                      style={{
                        width: `${corruptionPercent}%`,
                        background: 'linear-gradient(90deg, #fb7185 0%, #dc2626 55%, #7f1d1d 100%)',
                      }}
                    />
                  </div>
                </div>
              )}

              {difficulty === 'hard' || difficulty === 'expert' ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/70">Pressure</div>
                  <div className="mt-1 text-xl font-black text-white">Lv {state.pressureLevel}</div>
                </div>
              ) : null}
            </div>

            <div className="relative pt-20 sm:pt-24">
              {state.lastOverseerEvent && (
                <div className="pointer-events-none absolute inset-0 z-10 rounded-[28px] border-2 border-red-400/70 bg-red-500/10 animate-pulse" />
              )}

              <NumberMergeOverseerEntity
                phase={state.phase}
                chainTimeLeftMs={state.chainTimeLeftMs}
                lastOverseerEvent={state.lastOverseerEvent}
                corruption={state.corruption}
                attackAnimationLevel={preset.attackAnimationLevel}
              />

              <NumberMergeBoard
                board={state.board}
                selected={state.selected}
                unstableCells={preset.enableChainWindow ? state.unstableCells : []}
                lastCreatedTileId={lastMove?.createdTileId ?? null}
                petBonusTileId={lastMove?.petBonus?.affectedTileId ?? null}
                lastOverseerPositions={state.lastOverseerEvent?.positions ?? []}
                onTileActivate={tryActivate}
                onArrowMerge={handleArrowMerge}
              />
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div
              className="rounded-[28px] border p-5 backdrop-blur"
              style={{
                borderColor: strikeFlash ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)',
                background: strikeFlash ? 'rgba(69,10,10,0.55)' : 'rgba(2,6,23,0.45)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-red-200/20 bg-red-300/10">
                  <img src={OVERSEER_PORTRAIT} alt="The Overseer" className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-200/70">Overseer</p>
                  <h2 className="text-xl font-black text-white">{preset.label} Threat</h2>
                  <p className="mt-1 text-sm text-slate-300/85">
                    {difficulty === 'easy' && 'Mostly watching. It warns you before it takes a heart.'}
                    {difficulty === 'normal' && 'It starts enforcing short search windows and punishes missed goals.'}
                    {difficulty === 'hard' && 'It reacts to hesitation and starts spreading corruption.'}
                    {difficulty === 'expert' && 'It attacks aggressively and punishes slow stabilization.'}
                  </p>
                </div>
              </div>
              {state.lastOverseerEvent && (
                <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-950/35 px-3 py-2 text-sm text-red-100">
                  {state.lastOverseerEvent.description}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-sky-200/20 bg-sky-300/10">
                  {petPortrait ? (
                    <img src={petPortrait} alt={petConfig?.name ?? 'Pet'} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl">?</span>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-200/70">Companion</p>
                  <h2 className="text-xl font-black text-white">{petConfig?.name ?? 'House Pet'}</h2>
                  <p className="mt-1 text-sm text-slate-300/85">
                    {petSpeciesId === 'koala_sprite'
                      ? 'Blue Koala still rewards exact 10s by nudging a low tile upward.'
                      : 'Pet passives stay subtle while the difficulty presets tune the pressure loop.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/70">Mode Rules</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-200/90">
                <li>All modes use the same core: hold a tile, move into an adjacent space, and chase the target number.</li>
                <li>Hearts are your life system. Run out, and the mode ends.</li>
                <li>Every merge leaves the moved-from cell empty, so space is something you create and protect.</li>
                <li>Sliding into an empty spot uses a turn and helps you line up a better merge.</li>
                <li>Easy keeps the goal readable. Harder modes layer gap pressure and corruption on top.</li>
                <li>Broken cells are a controlled penalty. Corruption only shows up in higher difficulties.</li>
              </ul>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/70">Current Loadout</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-200/90">
                <li>{preset.warningBeforePenalty ? 'Warnings happen before hearts are lost.' : 'Mistakes immediately cost hearts.'}</li>
                <li>{state.turnsRemaining !== null ? `Search window active: ${preset.variableSearchWindow ? 'variable turns' : `${preset.fixedSearchWindowTurns} turns`}.` : 'No search turn window in this mode.'}</li>
                <li>{preset.enableCorruption ? 'Corruption is active.' : 'Corruption is disabled.'}</li>
                <li>{preset.enableChainWindow ? 'Open gaps create Overseer pressure.' : 'Gaps refill immediately for cleaner play.'}</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {state.phase === 'won' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div
            className="w-full max-w-sm rounded-3xl border p-7 text-center text-white"
            style={{
              borderColor: 'rgba(250,204,21,0.4)',
              background: 'linear-gradient(180deg, rgba(30,22,8,0.97) 0%, rgba(15,10,3,0.98) 100%)',
              boxShadow: '0 20px 60px rgba(250,204,21,0.25)',
            }}
          >
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300/80 mb-1">
              Number Merge
            </div>
            <h2 className="text-3xl font-black tracking-wider text-yellow-200 mb-2">VICTORY!</h2>
            <p className="text-sm text-slate-300 mb-5 leading-snug">
              You hit the {preset.label.toLowerCase()} score target of{' '}
              <span className="font-black text-yellow-200">{preset.winScore}</span>.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5 text-left">
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Final Score</div>
                <div className="text-xl font-black text-white">{state.score}</div>
              </div>
              <div className="rounded-xl border border-yellow-500/25 bg-yellow-950/40 p-3">
                <div className="text-[10px] font-black uppercase text-yellow-500/80 tracking-wider">Reward</div>
                <div className="text-xl font-black text-yellow-200">+{preset.winTokenReward} tokens</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="flex-1 rounded-full py-3 text-xs font-black uppercase tracking-widest text-slate-900"
                style={{ background: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 100%)' }}
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex-1 rounded-full border border-white/20 py-3 text-xs font-black uppercase tracking-widest text-white"
                style={{ background: 'rgba(15,23,42,0.6)' }}
              >
                Back Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
