import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MathPromptCard } from '../components/math/MathPromptCard';
import { MathAnswerInput } from '../components/math/MathAnswerInput';
import { ReactionBurst } from '../components/pet/ReactionBurst';
import { GameButton } from '../components/ui/GameButton';
import { generateMathProblem, checkAnswer } from '../services/game/mathEngine';
import { MP_EARN } from '../config/mpConfig';
import type { MathProblem } from '../types';
import type { GameEngineAction } from '../engine/core/ActionTypes';

interface MathScreenProps {
  dispatch: (action: GameEngineAction) => void;
  onExit: () => void;
  initialStreak?: number;
}

export const MathScreen: React.FC<MathScreenProps> = ({ dispatch, onExit, initialStreak = 0 }) => {
  const [problem, setProblem] = useState<MathProblem | null>(() => generateMathProblem(1));
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showRewardBurst, setShowRewardBurst] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [mpFloat, setMpFloat] = useState<{ amount: number; key: number } | null>(null);

  const loadNewProblem = useCallback(() => {
    // Difficulty increases slightly with streak
    const difficulty = Math.floor(streak / 5) + 1;
    setProblem(generateMathProblem(difficulty));
    setIsCorrect(null);
  }, [streak]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = (answer: number) => {
    if (!problem) return;

    const correct = checkAnswer(problem, answer);
    setIsCorrect(correct);

    if (correct) {
      setStreak((s) => s + 1);
      setShowRewardBurst(true);
      setMpFloat({ amount: MP_EARN.correct, key: Date.now() });
      dispatch({ type: 'SOLVE_MATH', difficulty: problem.difficulty, correct: true, reward: problem.reward });

      // Auto load next question after short delay
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        loadNewProblem();
        timeoutRef.current = null;
      }, 1500);
    } else {
      setStreak(0);
      setMpFloat({ amount: MP_EARN.wrong, key: Date.now() });
      dispatch({ type: 'SOLVE_MATH', difficulty: problem.difficulty, correct: false, reward: 0 });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsCorrect(null);
        timeoutRef.current = null;
      }, 500);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!problem) return <div className="min-h-screen bg-slate-900 flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-900 w-full max-w-lg mx-auto relative overflow-hidden">
      
      {showRewardBurst && (
        <ReactionBurst 
          emoji="⚡" 
          count={15} 
          onComplete={() => setShowRewardBurst(false)} 
        />
      )}

      {/* Top Bar */}
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <GameButton variant="secondary" size="sm" onClick={onExit}>
          ← Back
        </GameButton>
        <div className="text-xl font-black text-amber-400 drop-shadow-md flex items-center gap-1">
          Streak: {streak} <img src="/assets/generated/final/icon_streak_flame.png" alt="streak" className="w-6 h-6 inline" style={{ imageRendering: 'pixelated' }} />
        </div>
      </div>

      <div className="w-full mb-8 relative">
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
          key={problem.id} // forces reset when new problem loads
          onSubmit={handleSubmit} 
          isCorrect={isCorrect}
          disabled={isCorrect === true} // Disable input while loading next question
        />
      </div>

    </div>
  );
};
