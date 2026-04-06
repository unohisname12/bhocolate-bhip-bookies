import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  label?: string;
  showValue?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  color = 'bg-green-500',
  label,
  showValue = true,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between text-xs font-bold mb-1 text-slate-300 uppercase tracking-wide">
          <span>{label}</span>
          {showValue && <span>{Math.round(value)}/{max}</span>}
        </div>
      )}
      <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border-2 border-slate-700 p-0.5">
        <div
          className={`h-full rounded-full ${color} transition-all duration-300 ease-out shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
