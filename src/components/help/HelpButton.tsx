import React from 'react';

interface HelpButtonProps {
  onClick: () => void;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-4 left-4 z-[50] w-11 h-11 rounded-full bg-blue-500/80 hover:bg-blue-400 border-2 border-blue-400/60 shadow-[0_0_12px_rgba(59,130,246,0.3)] backdrop-blur-sm flex items-center justify-center transition-all active:scale-95"
    aria-label="Help"
  >
    <span className="text-white font-black text-lg">?</span>
  </button>
);
