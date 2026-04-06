import React from 'react';
import { ProgressBar } from '../ui/ProgressBar';

interface IncubationPanelProps {
  progress: number;
  className?: string;
}

export const IncubationPanel: React.FC<IncubationPanelProps> = ({
  progress,
  className = '',
}) => {
  const isReady = progress >= 100;

  return (
    <div className={`bg-slate-800/90 backdrop-blur-md p-6 rounded-3xl border-4 ${isReady ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]' : 'border-slate-600'} w-full max-w-sm mx-auto text-center transition-all duration-300 ${className}`}>
      <h3 className="text-xl font-black text-slate-100 uppercase tracking-widest mb-4">
        {isReady ? 'Ready to Hatch!' : 'Incubating...'}
      </h3>
      
      <ProgressBar 
        value={progress} 
        max={100} 
        color={isReady ? 'bg-yellow-400' : 'bg-blue-500'} 
        label="Growth" 
        showValue={true} 
      />
      
      {!isReady && (
        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-wide">
          Tap egg to warm it up
        </p>
      )}
    </div>
  );
};
