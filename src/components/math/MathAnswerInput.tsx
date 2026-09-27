import React, { useState } from 'react';
import { GameButton } from '../ui/GameButton';
import { parseMathAnswer } from '../../services/game/curriculum';

interface MathAnswerInputProps {
  onSubmit: (answer: number) => void;
  compact?: boolean;
  className?: string;
  isCorrect?: boolean | null; // null means no answer yet
  disabled?: boolean;
}

export const MathAnswerInput: React.FC<MathAnswerInputProps> = ({
  onSubmit,
  className = '',
  compact = false,
  isCorrect = null,
  disabled = false,
}) => {
  const [value, setValue] = useState('');

  // Reset input when new question appears via key
  // No useEffect needed here if we rely on the parent changing the key of this component when a new question arrives
  // OR we can clear it in a parent handler.
  // For now, we will clear it when isCorrect becomes null via a parent effect or via key change.
  // The simplest way to clear state when a prop changes without useEffect is key prop.
  // But to fix the lint error simply, we can just remove this effect and assume the parent will handle reset via `key` prop,
  // or handle the value reset internally on submit.

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() !== '' && !disabled) {
      const answer = parseMathAnswer(value);
      if (Number.isFinite(answer)) onSubmit(answer);
    }
  };

  const handleNumpadClick = (num: string) => {
    if (disabled) return;
    setValue((prev) => prev + num);
  };

  const handleBackspace = () => {
    if (disabled) return;
    setValue((prev) => prev.slice(0, -1));
  };

  const inputStyle = isCorrect === true 
    ? 'border-green-500 bg-green-900/50 text-green-300' 
    : isCorrect === false 
      ? 'border-amber-400 bg-slate-800 text-amber-100'
      : 'border-slate-600 bg-slate-800 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)]';

  return (
    <form onSubmit={handleSubmit} className={`math-answer-form ${compact ? 'math-answer-compact' : ''} flex flex-col gap-4 w-full max-w-sm mx-auto ${className}`}>
      <input
        type="text"
        inputMode="decimal"
        aria-label="Your answer"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Enter answer"
        className={`w-full text-center text-4xl font-black p-4 rounded-2xl border-4 transition-all duration-300 outline-none font-mono ${inputStyle}`}
        autoFocus
      />
      
      {/* Numpad for mobile ease */}
      <div className="grid grid-cols-3 gap-2">
        {(compact ? [7, 8, 9, '⌫', 4, 5, 6, '-', 1, 2, 3, '/', 0, '.'] : [1, 2, 3, 4, 5, 6, 7, 8, 9, '-', 0, '.', '/']).map((num) => (
          <GameButton
            key={num}
            type="button"
            variant="secondary"
            onClick={() => num === '⌫' ? handleBackspace() : handleNumpadClick(num.toString())}
            aria-label={num === '⌫' ? 'Delete last digit' : undefined}
            disabled={disabled}
            className={`text-2xl py-3 font-mono ${compact && (num === 0 || num === '.') ? 'col-span-2' : ''}`}
          >
            {num}
          </GameButton>
        ))}
        {!compact && <GameButton
          type="button"
          variant="secondary"
          onClick={handleBackspace}
          disabled={disabled}
          className="text-2xl py-3 bg-slate-700"
        >
          ⌫
        </GameButton>}
      </div>

      <GameButton 
        type="submit" 
        variant="primary"
        size="lg" 
        fullWidth 
        disabled={disabled || value.trim() === ''}
        className="mt-2 text-2xl font-black tracking-wider uppercase"
      >
        Submit
      </GameButton>
    </form>
  );
};
