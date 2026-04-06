import React from 'react';
import type { TracePoint } from '../../types/trace';

interface TracePlayerStrokeProps {
  stroke: TracePoint[];
  completionPct: number;
}

export const TracePlayerStroke: React.FC<TracePlayerStrokeProps> = ({ stroke, completionPct }) => {
  if (stroke.length < 2) return null;

  const pointsStr = stroke.map((p) => `${p.x},${p.y}`).join(' ');

  // Color shifts based on progress
  const color = completionPct >= 90
    ? 'rgba(250,204,21,0.9)'   // gold
    : completionPct >= 60
    ? 'rgba(34,197,94,0.85)'   // green
    : 'rgba(56,189,248,0.8)';  // cyan

  return (
    <g>
      {/* Glow layer */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke={color}
        strokeWidth="0.04"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.3}
        filter="url(#trace-glow)"
      />
      {/* Main stroke */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke={color}
        strokeWidth="0.018"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
};
