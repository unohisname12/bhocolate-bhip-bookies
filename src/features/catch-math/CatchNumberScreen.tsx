import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import type { Pet } from '../../types';
import { defaultCatchConfig, THROW_DURATION_MS } from './config';
import { generateRound } from './problemGenerator';
import { resolveThrow } from './catchResolver';
import { computeReward } from './rewardResolver';
import type {
  CatchChoice,
  CatchConfig,
  CatchDifficulty,
  CatchMode,
  CatchRound,
  EquationStepSession,
} from './types';
import { PromptCard } from './components/PromptCard';
import { ChoiceRow } from './components/ChoiceRow';
import { ThrowToken, type ThrowFlight } from './components/ThrowToken';
import { PetCatchZone, type CatchPhase } from './components/PetCatchZone';
import { FeedbackLayer, type FeedbackEvent } from './components/FeedbackLayer';
import { CatchDevPanel } from './dev/CatchDevPanel';

interface Props {
  dispatch: (action: GameEngineAction) => void;
  onExit: () => void;
  pet?: Pet | null;
  initialMode?: CatchMode;
  initialDifficulty?: CatchDifficulty;
  initialStreak?: number;
  /** Optional override for testing: provide a config and skip the default. */
  configOverride?: Partial<CatchConfig>;
  /** When true, shows the inline dev panel. Defaults to true in dev builds. */
  showDevPanel?: boolean;
}

const KEY_LEFT = ['ArrowLeft', 'a', 'A'];
const KEY_RIGHT = ['ArrowRight', 'd', 'D'];
const KEY_THROW = ['Enter', ' ', 'Space'];

export const CatchNumberScreen: React.FC<Props> = ({
  dispatch,
  onExit,
  pet,
  initialMode = 'missing_number',
  initialDifficulty = 'easy',
  initialStreak = 0,
  configOverride,
  showDevPanel,
}) => {
  const [mode, setMode] = useState<CatchMode>(initialMode);
  const [difficulty, setDifficulty] = useState<CatchDifficulty>(initialDifficulty);
  const config: CatchConfig = useMemo(() => {
    const base = defaultCatchConfig(mode, difficulty);
    return configOverride ? { ...base, ...configOverride, mode, difficulty } : base;
  }, [mode, difficulty, configOverride]);

  // Round + equation-step session state.
  const [round, setRound] = useState<CatchRound>(() => generateRound(config).round);
  const [session, setSession] = useState<EquationStepSession | null>(() =>
    mode === 'equation_step' ? generateRound(config).session ?? null : null,
  );

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [phase, setPhase] = useState<CatchPhase>('idle');
  const [flight, setFlight] = useState<ThrowFlight | null>(null);
  const [feedback, setFeedback] = useState<FeedbackEvent | null>(null);
  const [streak, setStreak] = useState(initialStreak);
  const [totalRewarded, setTotalRewarded] = useState(0);

  const choiceRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const petRef = useRef<HTMLDivElement | null>(null);

  // Re-generate when mode/difficulty changes.
  useEffect(() => {
    const { round: nextRound, session: nextSession } = generateRound(config);
    setRound(nextRound);
    setSession(nextSession);
    setSelectedIdx(0);
    setPhase('idle');
    setFlight(null);
  }, [config]);

  // Clamp selection when the choice count shrinks.
  useEffect(() => {
    if (selectedIdx >= round.choices.length) setSelectedIdx(0);
  }, [round.choices.length, selectedIdx]);

  const assignRef = useCallback((idx: number, el: HTMLButtonElement | null) => {
    choiceRefs.current[idx] = el;
  }, []);

  const canThrow = !flight && phase !== 'anticipation' && round.choices.length > 0;

  const resetSession = useCallback(() => {
    const { round: nextRound, session: nextSession } = generateRound(config);
    setRound(nextRound);
    setSession(nextSession);
    setSelectedIdx(0);
    setPhase('idle');
    setFlight(null);
    setFeedback(null);
    setStreak(0);
  }, [config]);

  const doThrow = useCallback(
    (targetChoice?: CatchChoice) => {
      if (!canThrow) return;
      const choice = targetChoice ?? round.choices[selectedIdx];
      const srcEl = choiceRefs.current[round.choices.indexOf(choice)] ?? choiceRefs.current[selectedIdx];
      const tgtEl = petRef.current;
      if (!srcEl || !tgtEl) return;
      const sr = srcEl.getBoundingClientRect();
      const tr = tgtEl.getBoundingClientRect();
      const durationMs = THROW_DURATION_MS[difficulty];
      const nextFlight: ThrowFlight = {
        choice,
        from: { x: sr.left + sr.width / 2, y: sr.top + sr.height / 2 },
        to: { x: tr.left + tr.width / 2, y: tr.top + tr.height * 0.45 },
        durationMs,
        seq: Date.now(),
      };
      setPhase('anticipation');
      setFlight(nextFlight);
    },
    [canThrow, round.choices, selectedIdx, difficulty],
  );

  const handleArrive = useCallback(() => {
    const choice = flight?.choice;
    setFlight(null);
    if (!choice) {
      setPhase('idle');
      return;
    }
    const { resolution, nextSession } = resolveThrow({
      round,
      choice,
      config,
      session,
    });

    const newStreak = resolution.correct ? streak + 1 : 0;
    setStreak(newStreak);

    const reward = computeReward(round, resolution.correct, newStreak);
    dispatch({
      type: 'SOLVE_MATH',
      difficulty: reward.solveMathDifficulty,
      correct: reward.correct,
      reward: reward.reward,
    });
    if (resolution.correct) setTotalRewarded((n) => n + reward.reward);

    setPhase(resolution.correct ? 'catch' : 'miss');
    setFeedback({
      key: Date.now(),
      kind: resolution.correct ? 'correct' : 'wrong',
      text: resolution.correct
        ? `+${reward.reward} MP · Nice!`
        : resolution.explanation ?? 'Try again!',
    });

    window.setTimeout(() => {
      setPhase('idle');
      if (resolution.correct && resolution.nextRound) {
        setRound(resolution.nextRound);
        setSession(nextSession);
        setSelectedIdx(0);
      } else if (!resolution.correct) {
        // Leave the same round on screen; just re-enable controls.
      }
    }, 650);
  }, [flight, round, config, session, streak, dispatch]);

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (KEY_LEFT.includes(e.key)) {
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + round.choices.length) % Math.max(1, round.choices.length));
      } else if (KEY_RIGHT.includes(e.key)) {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % Math.max(1, round.choices.length));
      } else if (KEY_THROW.includes(e.key)) {
        e.preventDefault();
        doThrow();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [round.choices.length, doThrow, onExit]);

  const handleForceCorrect = useCallback(() => {
    doThrow(round.correct);
  }, [doThrow, round.correct]);

  const handleForceWrong = useCallback(() => {
    const wrong = round.choices.find((c) => c.id !== round.correct.id) ?? round.choices[0];
    doThrow(wrong);
  }, [doThrow, round.choices, round.correct]);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden select-none"
      data-testid="catch-math-screen"
      style={{
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 70%, #020617 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Top bar — title + back + streak */}
      <div className="flex items-center justify-between px-3 pt-3">
        <button
          type="button"
          onClick={onExit}
          data-testid="catch-back"
          className="font-black uppercase tracking-[0.1em] text-[11px] px-3 py-1.5 rounded-lg"
          style={{
            color: '#fde68a',
            background: 'linear-gradient(180deg,#334155,#0f172a)',
            border: '2px solid #64748b',
            boxShadow: '0 3px 0 rgba(0,0,0,0.6)',
          }}
        >
          ← Back
        </button>
        <div className="text-center">
          <div className="font-black uppercase text-white text-[13px] tracking-[0.2em]">
            Catch the Missing Number
          </div>
          <div className="font-bold text-[9px] tracking-widest text-cyan-300/80 uppercase">
            Streak {streak} · +{totalRewarded} MP
          </div>
        </div>
        <div style={{ width: 70 }} />
      </div>

      {/* Prompt */}
      <PromptCard round={round} />

      {/* Pet */}
      <div className="flex-1 flex items-center justify-center mt-2">
        <PetCatchZone
          ref={petRef}
          speciesId={pet?.speciesId ?? 'koala_sprite'}
          phase={phase}
        />
      </div>

      {/* Feedback floats above pet */}
      <FeedbackLayer event={feedback} />

      {/* Choices + throw button */}
      <div className="pb-4 pt-2 px-3">
        <ChoiceRow
          choices={round.choices}
          selectedIndex={selectedIdx}
          disabled={!canThrow}
          onSelect={(idx) => {
            setSelectedIdx(idx);
          }}
          assignRef={assignRef}
        />
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            type="button"
            data-testid="catch-cycle-left"
            onClick={() => setSelectedIdx((i) => (i - 1 + round.choices.length) % Math.max(1, round.choices.length))}
            disabled={!canThrow}
            className="font-black rounded-lg px-3 py-2 disabled:opacity-40"
            style={{
              color: '#fde68a',
              background: 'linear-gradient(180deg,#334155,#1e293b)',
              border: '2px solid #475569',
              boxShadow: '0 3px 0 rgba(0,0,0,0.6)',
            }}
          >
            ◀
          </button>
          <button
            type="button"
            data-testid="catch-throw"
            onClick={() => doThrow()}
            disabled={!canThrow}
            className="font-black uppercase tracking-[0.15em] rounded-xl px-6 py-3 text-[14px] disabled:opacity-40"
            style={{
              color: '#0a0604',
              background: 'linear-gradient(180deg,#fde68a,#fbbf24)',
              border: '2px solid #fbbf24',
              boxShadow: '0 4px 0 rgba(0,0,0,0.6), 0 0 18px rgba(251,191,36,0.5)',
            }}
          >
            Throw!
          </button>
          <button
            type="button"
            data-testid="catch-cycle-right"
            onClick={() => setSelectedIdx((i) => (i + 1) % Math.max(1, round.choices.length))}
            disabled={!canThrow}
            className="font-black rounded-lg px-3 py-2 disabled:opacity-40"
            style={{
              color: '#fde68a',
              background: 'linear-gradient(180deg,#334155,#1e293b)',
              border: '2px solid #475569',
              boxShadow: '0 3px 0 rgba(0,0,0,0.6)',
            }}
          >
            ▶
          </button>
        </div>
      </div>

      {/* Flying token */}
      <ThrowToken flight={flight} onArrive={handleArrive} />

      {/* Dev panel */}
      {(showDevPanel ?? true) && (
        <CatchDevPanel
          mode={mode}
          difficulty={difficulty}
          onModeChange={setMode}
          onDifficultyChange={setDifficulty}
          onForceCorrect={handleForceCorrect}
          onForceWrong={handleForceWrong}
          onResetSession={resetSession}
        />
      )}
    </div>
  );
};
