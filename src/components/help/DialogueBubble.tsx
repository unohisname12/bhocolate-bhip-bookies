import React from 'react';

interface DialogueBubbleProps {
  text: string;
  speaker?: 'guide' | 'narrator';
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Anchor point (center of target element) for positioning. */
  anchorX?: number;
  anchorY?: number;
  onNext?: () => void;
  onSkip?: () => void;
  isLastStep?: boolean;
}

export const DialogueBubble: React.FC<DialogueBubbleProps> = ({
  text,
  speaker = 'guide',
  position = 'bottom',
  anchorX,
  anchorY,
  onNext,
  onSkip,
  isLastStep = false,
}) => {
  // Position the bubble relative to anchor or center of screen
  const style: React.CSSProperties = {};
  if (anchorX !== undefined && anchorY !== undefined) {
    if (position === 'bottom') {
      style.top = anchorY + 60;
      style.left = Math.max(16, Math.min(anchorX - 160, window.innerWidth - 336));
    } else if (position === 'top') {
      style.bottom = window.innerHeight - anchorY + 60;
      style.left = Math.max(16, Math.min(anchorX - 160, window.innerWidth - 336));
    } else if (position === 'left') {
      style.top = Math.max(16, anchorY - 40);
      style.right = window.innerWidth - anchorX + 60;
    } else {
      style.top = Math.max(16, anchorY - 40);
      style.left = anchorX + 60;
    }
  } else {
    // No anchor — center bottom of screen
    style.bottom = 80;
    style.left = '50%';
    style.transform = 'translateX(-50%)';
  }

  return (
    <div
      className="fixed z-[72] w-80 anim-pop"
      style={style}
    >
      <div className="bg-slate-800/95 backdrop-blur-md border-2 border-blue-500/60 rounded-2xl p-4 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
        {/* Speaker label */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${speaker === 'guide' ? 'bg-blue-400' : 'bg-purple-400'}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {speaker === 'guide' ? 'Helper' : 'Narrator'}
          </span>
        </div>

        {/* Text */}
        <p className="text-sm text-slate-100 leading-relaxed mb-3">{text}</p>

        {/* Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={onSkip}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Skip all
          </button>
          <button
            onClick={onNext}
            className="px-4 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold rounded-lg shadow-[0_2px_0_0] shadow-blue-700 active:shadow-none active:translate-y-0.5 transition-all"
          >
            {isLastStep ? 'Got it!' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
