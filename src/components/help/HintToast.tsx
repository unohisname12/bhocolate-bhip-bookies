import React, { useEffect, useState } from 'react';

interface HintToastProps {
  text: string;
  duration?: number;
  onDone: () => void;
}

export const HintToast: React.FC<HintToastProps> = ({
  text,
  duration = 4000,
  onDone,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDone]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[65] anim-pop">
      <div className="flex items-center gap-3 bg-slate-800/95 backdrop-blur-md border border-blue-500/40 rounded-xl px-4 py-3 shadow-lg">
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-blue-400 text-xs font-bold">?</span>
        </div>
        <p className="text-sm text-slate-200">{text}</p>
      </div>
    </div>
  );
};
