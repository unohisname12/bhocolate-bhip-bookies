import React from 'react';

interface CareStatBarProps {
  label: string;
  value: number;
  max?: number;
  /** Override bar color. If omitted, auto-thresholds: green ≥60, yellow 30–59, red <30. */
  color?: string;
  /** If true, invert thresholds (low = good, high = bad) — used for Stress. */
  invertThreshold?: boolean;
  icon?: string;
}

const getAutoColor = (value: number, max: number, invert: boolean): string => {
  const pct = (value / max) * 100;
  if (invert) {
    if (pct < 30) return '#4ade80'; // green — low stress is good
    if (pct < 60) return '#fbbf24'; // yellow
    return '#f87171';               // red — high stress is bad
  }
  if (pct >= 60) return '#4ade80';
  if (pct >= 30) return '#fbbf24';
  return '#f87171';
};

export const CareStatBar: React.FC<CareStatBarProps> = ({
  label, value, max = 100, color, invertThreshold = false, icon,
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = color ?? getAutoColor(value, max, invertThreshold);

  return (
    <div className="flex items-center gap-2 w-full">
      {icon && (
        <img
          src={icon}
          alt=""
          className="w-4 h-4 flex-shrink-0"
          style={{ imageRendering: 'pixelated' }}
        />
      )}
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-20 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(30,25,50,0.8)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: barColor,
            boxShadow: `0 0 6px ${barColor}40`,
            transition: 'width 0.5s ease, background 0.3s ease',
          }}
        />
      </div>
      <span
        className="text-[10px] font-black w-8 text-right flex-shrink-0"
        style={{ color: barColor }}
      >
        {Math.round(value)}
      </span>
    </div>
  );
};
