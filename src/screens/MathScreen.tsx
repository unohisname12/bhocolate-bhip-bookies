import './math-practice-layout.css';
import { ECONOMY } from '../services/game/economy';
import { GameRules } from '../components/game/GameRules';
import {LessonView} from '../features/skill-challenge/LessonView';
import {getSkill} from '../features/skill-challenge/catalog';
import '../features/skill-challenge/challenge.css';
import { useNextQuestionSettings } from '../pilot/NextQuestionContext';
import type { FirstAdventure } from '../features/first-adventure/model';
import { furniture } from '../features/home-base/catalog';
import '../features/first-adventure/first-adventure.css';
import { ActivePetContext } from '../components/ActivePetContext';
import { PetSprite } from '../components/pet/PetSprite';
import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { MathPromptCard } from '../components/math/MathPromptCard';
import { LearningHelp } from '../components/math/LearningHelp';
import { MathAnswerInput } from '../components/math/MathAnswerInput';
import { ReactionBurst } from '../components/pet/ReactionBurst';
import { GameButton } from '../components/ui/GameButton';
import { checkAnswer } from '../services/game/mathEngine';
import { nextPractice } from '../features/learning/review';
import type { SkillReview } from '../types/woodland';
import { useLearningSettings } from '../components/LearningContext';
import { ASSETS } from '../config/assetManifest';
import { STREAK_MILESTONES } from '../config/streakConfig';
import { MP_EARN } from '../config/mpConfig';
import type { MathProblem } from '../types';
import type { GameEngineAction } from '../engine/core/ActionTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map streak → aura level (0-4), matching STREAK_MILESTONES thresholds */
function getAuraLevel(streak: number): number {
  if (streak >= 50) return 4; // Platinum
  if (streak >= 25) return 3; // Gold
  if (streak >= 10) return 2; // Silver
  if (streak >= 5) return 1;  // Bronze
  return 0;
}

/** Radial glow style that intensifies with aura level */
function getAuraStyle(level: number): React.CSSProperties {
  const configs: React.CSSProperties[] = [
    {},
    { background: 'radial-gradient(ellipse at 50% 85%, rgba(251,146,60,0.15) 0%, transparent 60%)' },
    { background: 'radial-gradient(ellipse at 50% 85%, rgba(148,163,184,0.22) 0%, transparent 60%)' },
    { background: 'radial-gradient(ellipse at 50% 85%, rgba(250,204,21,0.28) 0%, transparent 55%)' },
    { background: 'radial-gradient(ellipse at 50% 85%, rgba(34,211,238,0.35) 0%, transparent 50%)' },
  ];
  return configs[level] ?? {};
}

/** Streak badge color based on aura level */
const AURA_COLORS = ['text-white', 'text-orange-400', 'text-slate-300', 'text-yellow-400', 'text-cyan-400'];

/** Use the learner's actual species and growth stage in practice too. */
const MathPetSprite: React.FC<{ playing: boolean }> = ({ playing }) => {
  const pet = useContext(ActivePetContext);
  return <PetSprite speciesId={pet?.speciesId ?? 'koala_sprite'} stage={pet?.stage} animationName={playing ? 'happy' : 'idle'} scale={1.5} />;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MathScreenProps {
  receipts?: { [questionId: string]: number };
  tokens?: number;
  mathReward?: number;
  pendingXP?: number;
  checkpoint?: import('../types/engine').EngineState['practiceCheckpoint'];
  adventure?: FirstAdventure;
  reviews?: SkillReview[];
  dispatch: (action: GameEngineAction) => void;
  onExit: () => void;
  initialStreak?: number;
  speciesId: string;
}

export const MathScreen: React.FC<MathScreenProps> = ({ dispatch, onExit, initialStreak = 0, adventure, reviews = [], checkpoint, tokens = 0, mathReward = 10, pendingXP = 0, receipts = {} }) => {
  const screen = useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const bars = Array.from(document.querySelectorAll('.pilot-savebar, .student-nav, .student-activity-bar'));
    const update = () => screen.current?.style.setProperty('--practice-top', `${Math.max(0, ...bars.map(bar => bar.getBoundingClientRect().bottom))}px`);
    const observer = new ResizeObserver(update);
    bars.forEach(bar => observer.observe(bar));
    window.addEventListener('resize', update);
    update();
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, []);
  const learning = useLearningSettings();
  const [calm,setCalm] = useState(learning.schoolSafe !== false);
  const [exampleFor,setExampleFor] = useState<string|null>(null);
  const nextSettings = useNextQuestionSettings();
  const [problem, setProblem] = useState<MathProblem | null>(() => checkpoint ? (checkpoint.correct === true && checkpoint.completed < 5 ? nextPractice(learning, reviews, checkpoint.problem) : checkpoint.problem) : nextPractice(learning, reviews));
  const [isCorrect, setIsCorrect] = useState<boolean | null>(() => checkpoint?.correct === true && checkpoint.completed >= 5 ? true : null);
  const [showRewardBurst, setShowRewardBurst] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [completed, setCompleted] = useState(checkpoint?.completed ?? 0);
  useEffect(() => { if (problem) dispatch({ type: 'SAVE_PRACTICE_CHECKPOINT', checkpoint: { problem, correct: isCorrect, completed } }); }, [problem, isCorrect, completed, dispatch]);
  const sessionComplete = completed >= 5 && adventure?.phase !== 'learn';
  const [mpFloat, setMpFloat] = useState<{ amount: number; key: number } | null>(null);

  // Power-up state
  const [petCelebrating, setPetCelebrating] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [milestoneFlash, setMilestoneFlash] = useState<{ label: string; color: string } | null>(null);

  const auraLevel = getAuraLevel(streak);

  const reviewRef = useRef(reviews);
  useEffect(()=>{reviewRef.current=reviews;},[reviews]);
  const loadNewProblem = useCallback(async () => {
    setProblem(nextPractice(await nextSettings(), reviewRef.current, problem ?? undefined));
    setIsCorrect(null);
  }, [nextSettings, problem]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const milestoneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = (answer: number) => {
    if (!problem || isCorrect === true || sessionComplete || adventure?.phase === 'reward') return;

    const correct = checkAnswer(problem, answer);
    setIsCorrect(correct);

    if (correct) {
      setCompleted(count => count + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setShowRewardBurst(true);
      setMpFloat({ amount: Math.max(0, MP_EARN.correct - (receipts[problem.id] ?? 0)), key: Date.now() });
      dispatch({ type: 'SOLVE_MATH', difficulty: problem.difficulty, correct: true, reward: problem.reward, problem, source: 'practice' });

      // Play happy celebration animation
      setPetCelebrating(true);
      setScreenFlash(true);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = setTimeout(() => {
        setPetCelebrating(false);
        setScreenFlash(false);
      }, 1600);

      // Milestone check
      const milestone = STREAK_MILESTONES.find(m => m.streak === newStreak);
      if (milestone) {
        setMilestoneFlash(milestone);
        if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
        milestoneTimeoutRef.current = setTimeout(() => setMilestoneFlash(null), 2500);
      }

      // Auto load next question
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (completed + 1 < 5 || adventure?.phase === 'learn') timeoutRef.current = setTimeout(() => {
        loadNewProblem();
        timeoutRef.current = null;
      }, 1500);
    } else {
      setStreak(0);
      setMpFloat(null); // Effort is credited at most once by the engine.
      dispatch({ type: 'SOLVE_MATH', difficulty: problem.difficulty, correct: false, reward: 0, problem, source: 'practice' });

      // Gentle amber feedback; the question stays available for learning.
      setWrongFlash(true);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = setTimeout(() => {
        setWrongFlash(false);
      }, 500);


    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
    };
  }, []);

  if (!problem) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div ref={screen} className="math-practice-screen" data-quiet={calm}>

      {problem.context !== 'practice' && <p className="relative z-10 p-3 bg-slate-900 text-teal-200">{problem.context === 'fresh-check' ? 'New numbers: try the skill again. Help is available.' : 'Time to revisit a skill you practiced earlier.'}</p>}
      {/* ===== FULL-SCREEN BACKGROUND ===== */}
      {!calm && <img
        src={ASSETS.scenes.mathTraining ?? ASSETS.scenes.battleArena}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      />}

      {/* Dark vignette — darkens edges, keeps center bright */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.6) 100%)' }}
      />

      {/* Aura overlay — radial glow matching streak tier */}
      <div
        className="absolute inset-0 transition-all duration-700 pointer-events-none z-[1]"
        style={calm ? {} : getAuraStyle(auraLevel)}
      />

      {/* Correct answer white flash */}
      {!calm && screenFlash && (
        <div className="absolute inset-0 bg-white/30 pointer-events-none anim-math-correct-flash z-[2]" />
      )}

      {/* Wrong answer red flash */}
      {wrongFlash && (
        <div className="absolute inset-0 bg-amber-900/10 pointer-events-none anim-math-wrong-flash z-[2]" />
      )}

      {/* ===== PET SPRITE — right side, sitting on rune pedestal ===== */}
      {!calm && <div className="absolute right-8 bottom-[38%] z-[5] pointer-events-none">
        <div className="relative flex flex-col items-center">
          {/* Pet sits on top — overlaps pedestal top edge */}
          <div className="relative z-[1]" style={{ marginBottom: -62 }}>
            <MathPetSprite playing={petCelebrating} />
          </div>
          {/* Rune pedestal */}
          <img
            src="/assets/generated/final/pedestal_rune_stone.png"
            alt=""
            className="relative z-[0]"
            style={{ imageRendering: 'pixelated', width: 220, height: 138 }}
          />
        </div>
      </div>}

      {/* Reaction burst particles */}
      {!calm && showRewardBurst && (
        <div className="absolute inset-0 pointer-events-none z-[4]">
          <ReactionBurst
            emoji="⚡"
            count={15}
            onComplete={() => setShowRewardBurst(false)}
          />
        </div>
      )}

      {/* Milestone banner */}
      {!calm && milestoneFlash && (
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 z-[5] pointer-events-none animate-tier-up-in">
          <div className={`px-6 py-3 rounded-xl bg-black/80 border-2 border-current ${milestoneFlash.color} text-center`}>
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">Streak Milestone</div>
            <div className="text-3xl font-black drop-shadow-lg">{milestoneFlash.label}!</div>
          </div>
        </div>
      )}

      {/* ===== TOP BAR ===== */}
      <div className="math-practice-toolbar flex justify-between items-center z-30">
        <GameButton variant="secondary" size="sm" onClick={onExit}>
          ← Back
        </GameButton>

        {/* Streak badge */}
        <label className="text-slate-200"><input type="checkbox" checked={calm} onChange={e=>setCalm(e.target.checked)}/> Quiet practice</label>
        {!calm && <div className={`flex items-center gap-1.5 font-black text-xl drop-shadow-md ${AURA_COLORS[auraLevel]} ${auraLevel >= 2 ? 'anim-combo-glow' : ''}`}>
          <img
            src="/assets/generated/final/icon_streak_flame.png"
            alt="streak"
            className="w-7 h-7"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className={streak > 0 ? 'anim-combo-pop' : ''} key={streak}>
            {streak}
          </span>
        </div>}
      </div>

      {/* ===== BOTTOM: Math Controls — glass panel floating over scene ===== */}
      <div className="math-practice-workspace relative z-10">
        <div className="math-practice-panel bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 shadow-xl">
          {adventure?.phase === 'learn' && <section className="adventure-math math-practice-progress" aria-label="Adventure math progress"><strong>Build your little library</strong><p>{adventure.solved}/3 questions completed · No timer. Retries count.</p><progress aria-label="Adventure questions" value={adventure.solved} max={3}/><p>Reward: permanent Adventure Shelf + one defense boost.</p></section>}
          {adventure?.phase !== 'learn' && adventure?.phase !== 'reward' && <section className="math-practice-progress text-slate-200" aria-label="Practice session"><h1 className="font-bold">Five-question practice</h1><p>{Math.min(completed, 5)} / 5 completed</p><progress aria-label="Practice progress" value={Math.min(completed, 5)} max={5}/></section>}
          {sessionComplete && adventure?.phase !== 'reward' ? <section className="math-practice-complete" aria-label="Practice complete"><h2 className="text-xl font-bold text-emerald-200">Five questions complete!</h2><p className="my-3 text-slate-200">You earned {mathReward * 5} base practice tokens. Your balance is {tokens} tokens. Five completed questions also earn the 50-token daily bonus once per day. Hints and corrections keep your rewards.</p><p>{pendingXP > 0 ? `${pendingXP} growth XP is saved for your companion when it hatches.` : "Your math helped your companion grow."}</p><GameButton variant="secondary" onClick={() => dispatch({ type: 'HOME_OPEN' })}>Choose something for my home</GameButton><GameButton onClick={onExit}>Finish practice</GameButton><GameButton variant="secondary" onClick={() => { setCompleted(0); loadNewProblem(); }}>Practice five more</GameButton></section> : adventure?.phase === 'reward' ? <section className="adventure-math math-practice-complete" aria-label="Adventure math complete"><h2>Three questions. A reward that's yours.</h2><img src={furniture('clash_books')!.art} alt="Your Adventure Shelf"/><p role="status">Your effort earned a permanent shelf for your pet's home.</p><button className="adventure-primary" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'first_adventure' })}>See my reward</button></section> : <>
          <div className="math-practice-question relative">
            <MathPromptCard
              question={problem.question}
              difficulty={problem.difficulty}
              reward={problem.reward}
              focusView={calm}
              className={isCorrect === true ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : ''}
            />
            {!calm && mpFloat && mpFloat.amount > 0 && (
              <span
                key={mpFloat.key}
                className="absolute -top-2 right-4 text-blue-400 font-black text-sm pointer-events-none animate-mp-float"
                onAnimationEnd={() => setMpFloat(null)}
              >
                +{ECONOMY.tokens} tokens
              </span>
            )}
          </div>

          <div className="math-practice-support" tabIndex={0} role="region" aria-label="Practice guidance">
            <GameRules name="Math Practice"><p>Type your answer and press Submit. No timer. Retry mistakes with hints; complete five questions to finish the round.</p></GameRules>
            {learning.learningHelp!==false && isCorrect!==true && <>
              <button className="text-teal-200 underline min-h-11" onClick={()=>{setExampleFor(exampleFor===problem.id?null:problem.id);if(exampleFor!==problem.id)dispatch({type:'RECORD_LEARNING_HELP',problem,support:'hint'});}}>Study a worked example</button>
              {exampleFor===problem.id && <div className="skill-challenge"><>{problem.skillId&&getSkill(problem.skillId)?<LessonView id={problem.skillId} level={problem.practiceSettings?.challenge??learning.challenge}/>:<section className="skill-lesson"><h3>Work through this question</h3><p>{problem.question}</p><ol>{(problem.explanation??[problem.hint??'Break the question into smaller steps.']).map((step,i)=><li key={i}>{step}</li>)}</ol></section>}</><p>Using this example is recorded as support. A fresh question will let you try independently.</p></div>}
              {isCorrect===null && <LearningHelp key={problem.id} problem={problem} beforeAttempt onRetry={()=>setExampleFor(null)}/>}
            </>}
            {isCorrect === false && <>
              <p role="status" className="text-amber-200 text-center">Not quite yet. Try again—you can do this.</p>
              <LearningHelp key={problem.id} problem={problem} onRetry={() => { setIsCorrect(null); document.querySelector<HTMLInputElement>('[aria-label="Your answer"]')?.select(); }} />
            </>}
            {isCorrect === true && <p role="status" className="text-emerald-200 text-center mb-3">Your answer is correct. One more question completed.</p>}
          </div>
          <div className="math-practice-answer">

            <MathAnswerInput
              compact
              key={problem.id}
              onSubmit={handleSubmit}
              isCorrect={isCorrect}
              disabled={isCorrect === true}
            />
          </div>
          </>}
        </div>
      </div>
    </div>
  );
};
