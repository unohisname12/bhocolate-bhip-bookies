import { useGameCheck } from '../quick-check/context';
import { nextPractice } from '../learning/review';
import { SkillReviewContext } from '../../components/LearningContext';
import { GameRules } from '../../components/game/GameRules';
import { useNextQuestionSettings } from '../../pilot/NextQuestionContext';
import React, { useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { LearningHelp } from '../../components/math/LearningHelp';
import { useLearningSettings } from '../../components/LearningContext';

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
  const learning = useLearningSettings();
  const nextSettings = useNextQuestionSettings();
  const reviews=useContext(SkillReviewContext), reviewsRef=useRef(reviews);
  useEffect(()=>{reviewsRef.current=reviews;},[reviews]);
  const [mode, setMode] = useState<CatchMode>(initialMode);
  const [difficulty, setDifficulty] = useState<CatchDifficulty>(configOverride ? initialDifficulty : learning.challenge === 'support' ? 'easy' : learning.challenge === 'stretch' ? 'hard' : 'medium');
  const config: CatchConfig = useMemo(() => {
    const base = defaultCatchConfig(mode, difficulty);
    return configOverride ? { ...base, ...configOverride, mode, difficulty } : { ...base, learning };
  }, [mode, difficulty, configOverride, learning]);

  // Round + equation-step session state.
  const [initialRound] = useState(() => generateRound(config,undefined,undefined,config.learning?nextPractice(config.learning,reviews):undefined));
  const [round, setRound] = useState<CatchRound>(initialRound.round);
  const [session, setSession] = useState<EquationStepSession | null>(initialRound.session);
  const previousConfig = useRef(config);
  const previousMode = useRef(mode), previousDifficulty = useRef(difficulty);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [phase, setPhase] = useState<CatchPhase>('idle');
  const [flight, setFlight] = useState<ThrowFlight | null>(null);
  const [needsHelp, setNeedsHelp] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackEvent | null>(null);
  const [streak, setStreak] = useState(initialStreak);
  const [totalRewarded, setTotalRewarded] = useState(0);
  const [caught, setCaught] = useState(0);

  const choiceRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const petRef = useRef<HTMLDivElement | null>(null);

  // Re-generate when mode/difficulty changes.
  useEffect(() => {
    if (previousConfig.current === config) return;
    previousConfig.current = config;
    // Teacher updates only affect the next round; explicit player mode changes restart.
    if (!configOverride && previousMode.current === mode && previousDifficulty.current === difficulty) return;
    previousMode.current = mode; previousDifficulty.current = difficulty;
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNeedsHelp(false);
    const { round: nextRound, session: nextSession } = generateRound(config);
    setRound(nextRound);
    setSession(nextSession);
    setSelectedIdx(0);
    setPhase('idle');
    setFlight(null);
  }, [config, configOverride, mode, difficulty]);

  // Clamp selection when the choice count shrinks.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Clamp after a round's choices change.
    if (selectedIdx >= round.choices.length) setSelectedIdx(0);
  }, [round.choices.length, selectedIdx]);

  const assignRef = useCallback((idx: number, el: HTMLButtonElement | null) => {
    choiceRefs.current[idx] = el;
  }, []);

  const canThrow = caught < 5 && !flight && phase === 'idle' && round.choices.length > 0;

  const ensureCheck = useGameCheck();
  const resetRef = useRef<() => void>(() => {});
  const resetSession = useCallback(async () => {
    if (!await ensureCheck('catch_math', () => resetRef.current())) return;
    const settings = !configOverride ? await nextSettings() : null;
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setNeedsHelp(false);
    const { round: nextRound, session: nextSession } = generateRound(settings ? { ...config, learning: settings } : config,undefined,undefined,settings?nextPractice(settings,reviewsRef.current):undefined);
    setRound(nextRound);
    setSession(nextSession);
    setSelectedIdx(0);
    setPhase('idle');
    setFlight(null);
    setFeedback(null);
    setCaught(0);
    setTotalRewarded(0);
  }, [config, configOverride, nextSettings, ensureCheck]);
  useEffect(() => { resetRef.current = () => void resetSession(); }, [resetSession]);

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

    setNeedsHelp(!resolution.correct);
    const newStreak = resolution.correct ? streak + 1 : 0;
    setStreak(newStreak);

    const reward = computeReward(round, resolution.correct, newStreak);
    dispatch({
      type: 'SOLVE_MATH',
      difficulty: reward.solveMathDifficulty,
      correct: reward.correct,
      reward: reward.reward,
      problem: round.learningProblem ?? { id: round.id, question: round.prompt, answer: round.correct.kind === 'number' ? round.correct.value : 0, difficulty: reward.solveMathDifficulty, reward: reward.reward, topic: 'Legacy Catch', grade: learning.grade },
      source: 'catch',
    });
    if (resolution.correct) { setTotalRewarded((n) => n + reward.reward); setCaught(n => n + 1); }

    setPhase(resolution.correct ? 'catch' : 'miss');
    setFeedback({
      key: Date.now(),
      kind: resolution.correct ? 'correct' : 'wrong',
      text: resolution.correct
        ? `+${reward.reward} tokens · Nice!`
        : resolution.explanation ?? 'Try again!',
    });

    feedbackTimer.current = setTimeout(async () => {
      const fresh = !configOverride && resolution.correct ? await nextSettings() : null;
      setPhase('idle');
      if (resolution.correct && resolution.nextRound && caught + 1 < 5) {
        const next = fresh ? generateRound({ ...config, learning: fresh },undefined,undefined,nextPractice(fresh,reviewsRef.current,round.learningProblem)) : { round: resolution.nextRound, session: nextSession };
        setRound(next.round);
        setSession(next.session);
        setSelectedIdx(0);
      } else if (!resolution.correct) {
        // Leave the same round on screen; just re-enable controls.
      }
    }, 1000);
  }, [flight, round, config, session, streak, dispatch, learning.grade, caught, nextSettings, configOverride]);

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        if (e.target.closest('input, select, textarea, .learning-help')) return;
        // Preserve arrow/throw shortcuts on choices, but let other buttons use native keys.
        if (e.target.closest('button') && !e.target.closest('[data-testid="catch-choices"]')) return;
      }
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
      className="fixed inset-0 flex flex-col overflow-y-auto"
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
            Catch Math
          </div>
          <div className="font-bold text-[9px] tracking-widest text-cyan-300/80 uppercase">
            Streak {streak} · +{totalRewarded} tokens
          </div>
        </div>
        <div style={{ width: 70 }} />
      </div>

      <section className="text-center text-sm text-slate-200 px-4 pt-3" aria-label="Catch session"><p>{Math.min(caught, 5)} / 5 catches</p><GameRules name="Catch Math"><p>Choose an answer, then press Throw. No timer—misses get another try. Arrow keys choose; Enter throws.</p></GameRules>{!pet && <p className="text-xs text-teal-200">Pip is your club guide while your mystery egg grows.</p>}</section>
      {caught >= 5 && <section className="mx-auto my-3 rounded-xl border border-teal-400 bg-slate-900 p-5 text-center text-white" aria-label="Catch session complete"><h2 className="text-xl font-bold">Five catches complete!</h2><p className="my-3">You earned {totalRewarded} tokens. Your rewards are kept.</p><button className="rounded-lg bg-teal-700 p-3 m-1" onClick={onExit}>Finish catching</button><button className="rounded-lg bg-slate-700 p-3 m-1" onClick={resetSession}>Catch five more</button></section>}
      <div className="catch-play-stage">
      {/* Prompt */}
      <PromptCard round={round} />
      {needsHelp && round.learningProblem && <div className="px-3 w-full max-w-xl mx-auto shrink-0"><LearningHelp key={round.id} problem={round.learningProblem} onRetry={() => { setNeedsHelp(false); choiceRefs.current[selectedIdx]?.focus(); }} /></div>}

      {/* Pet */}
      <div className="flex-1 flex items-center justify-center mt-2">
        <PetCatchZone
          ref={petRef}
          speciesId={pet?.speciesId ?? 'koala_sprite'}
          phase={phase}
        />
      </div>

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
      {(showDevPanel ?? false) && (
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
