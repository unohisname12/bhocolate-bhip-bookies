import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MathPromptCard } from '../components/math/MathPromptCard';
import { MathAnswerInput } from '../components/math/MathAnswerInput';
import { ReactionBurst } from '../components/pet/ReactionBurst';
import { GameButton } from '../components/ui/GameButton';
import { generateMathProblem, checkAnswer } from '../services/game/mathEngine';
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

/** Math pet sprite sheet config */
const MATH_PET_SHEET = {
  url: '/assets/pets/koala/math_happy_sheet.png',
  frameCount: 9,
  frameWidth: 256,
  frameHeight: 256,
};

/** Simple sprite that shows frame 0 idle, plays the happy sheet when triggered */
const MathPetSprite: React.FC<{ playing: boolean }> = ({ playing }) => {
  const [frame, setFrame] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) {
      setFrame(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    let f = 0;
    setFrame(0);
    intervalRef.current = setInterval(() => {
      f += 1;
      if (f >= MATH_PET_SHEET.frameCount) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setFrame(f);
    }, 80);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing]);

  const displaySize = 192;
  const scale = displaySize / MATH_PET_SHEET.frameWidth;
  const sheetWidth = MATH_PET_SHEET.frameCount * MATH_PET_SHEET.frameWidth;

  return (
    <div
      style={{
        width: displaySize,
        height: displaySize,
        backgroundImage: `url(${MATH_PET_SHEET.url})`,
        backgroundPosition: `-${frame * MATH_PET_SHEET.frameWidth * scale}px 0px`,
        backgroundSize: `${sheetWidth * scale}px ${MATH_PET_SHEET.frameHeight * scale}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MathScreenProps {
  dispatch: (action: GameEngineAction) => void;
  onExit: () => void;
  initialStreak?: number;
  speciesId: string;
}

export const MathScreen: React.FC<MathScreenProps> = ({ dispatch, onExit, initialStreak = 0, speciesId }) => {
  const [problem, setProblem] = useState<MathProblem | null>(() => generateMathProblem(1));
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showRewardBurst, setShowRewardBurst] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [mpFloat, setMpFloat] = useState<{ amount: number; key: number } | null>(null);

  // Power-up state
  const [petCelebrating, setPetCelebrating] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [milestoneFlash, setMilestoneFlash] = useState<{ label: string; color: string } | null>(null);

  const auraLevel = getAuraLevel(streak);

  const loadNewProblem = useCallback(() => {
    const difficulty = Math.floor(streak / 5) + 1;
    setProblem(generateMathProblem(difficulty));
    setIsCorrect(null);
  }, [streak]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const milestoneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = (answer: number) => {
    if (!problem) return;

    const correct = checkAnswer(problem, answer);
    setIsCorrect(correct);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setShowRewardBurst(true);
      setMpFloat({ amount: MP_EARN.correct, key: Date.now() });
      dispatch({ type: 'SOLVE_MATH', difficulty: problem.difficulty, correct: true, reward: problem.reward });

      // Play happy celebration animation
      setPetCelebrating(true);
      setScreenFlash(true);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = setTimeout(() => {
        setPetCelebrating(false);
        setScreenFlash(false);
      }, MATH_PET_SHEET.frameCount * 80);

      // Milestone check
      const milestone = STREAK_MILESTONES.find(m => m.streak === newStreak);
      if (milestone) {
        setMilestoneFlash(milestone);
        if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
        milestoneTimeoutRef.current = setTimeout(() => setMilestoneFlash(null), 2500);
      }

      // Auto load next question
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        loadNewProblem();
        timeoutRef.current = null;
      }, 1500);
    } else {
      setStreak(0);
      setMpFloat({ amount: MP_EARN.wrong, key: Date.now() });
      dispatch({ type: 'SOLVE_MATH', difficulty: problem.difficulty, correct: false, reward: 0 });

      // Brief red flash — pet stays still (no reaction on wrong)
      setWrongFlash(true);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = setTimeout(() => {
        setWrongFlash(false);
      }, 500);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsCorrect(null);
        timeoutRef.current = null;
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
    <div className="relative min-h-screen w-full overflow-hidden bg-black">

      {/* ===== FULL-SCREEN BACKGROUND ===== */}
      <img
        src={ASSETS.scenes.mathTraining ?? ASSETS.scenes.battleArena}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Dark vignette — darkens edges, keeps center bright */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.6) 100%)' }}
      />

      {/* Aura overlay — radial glow matching streak tier */}
      <div
        className="absolute inset-0 transition-all duration-700 pointer-events-none z-[1]"
        style={getAuraStyle(auraLevel)}
      />

      {/* Correct answer white flash */}
      {screenFlash && (
        <div className="absolute inset-0 bg-white/30 pointer-events-none anim-math-correct-flash z-[2]" />
      )}

      {/* Wrong answer red flash */}
      {wrongFlash && (
        <div className="absolute inset-0 bg-red-900/40 pointer-events-none anim-math-wrong-flash z-[2]" />
      )}

      {/* ===== PET SPRITE — right side, sitting on rune pedestal ===== */}
      <div className="absolute right-8 bottom-[38%] z-[5] pointer-events-none">
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
      </div>

      {/* Reaction burst particles */}
      {showRewardBurst && (
        <div className="absolute inset-0 pointer-events-none z-[4]">
          <ReactionBurst
            emoji="⚡"
            count={15}
            onComplete={() => setShowRewardBurst(false)}
          />
        </div>
      )}

      {/* Milestone banner */}
      {milestoneFlash && (
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 z-[5] pointer-events-none animate-tier-up-in">
          <div className={`px-6 py-3 rounded-xl bg-black/80 border-2 border-current ${milestoneFlash.color} text-center`}>
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">Streak Milestone</div>
            <div className="text-3xl font-black drop-shadow-lg">{milestoneFlash.label}!</div>
          </div>
        </div>
      )}

      {/* ===== TOP BAR ===== */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-3 z-10">
        <GameButton variant="secondary" size="sm" onClick={onExit}>
          ← Back
        </GameButton>

        {/* Streak badge */}
        <div className={`flex items-center gap-1.5 font-black text-xl drop-shadow-md ${AURA_COLORS[auraLevel]} ${auraLevel >= 2 ? 'anim-combo-glow' : ''}`}>
          <img
            src="/assets/generated/final/icon_streak_flame.png"
            alt="streak"
            className="w-7 h-7"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className={streak > 0 ? 'anim-combo-pop' : ''} key={streak}>
            {streak}
          </span>
        </div>
      </div>

      {/* ===== BOTTOM: Math Controls — glass panel floating over scene ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center">
        <div className="w-full max-w-lg px-4 pt-5 pb-4 rounded-t-3xl bg-slate-900/75 backdrop-blur-sm border-t border-slate-700/50 shadow-[0_-4px_30px_rgba(0,0,0,0.6)]">
          <div className="w-full mb-4 relative">
            <MathPromptCard
              question={problem.question}
              difficulty={problem.difficulty}
              reward={problem.reward}
              className={isCorrect === true ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : ''}
            />
            {mpFloat && (
              <span
                key={mpFloat.key}
                className="absolute -top-2 right-4 text-blue-400 font-black text-sm pointer-events-none animate-mp-float"
                onAnimationEnd={() => setMpFloat(null)}
              >
                +{mpFloat.amount} MP
              </span>
            )}
          </div>

          <div className="w-full">
            <MathAnswerInput
              key={problem.id}
              onSubmit={handleSubmit}
              isCorrect={isCorrect}
              disabled={isCorrect === true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
