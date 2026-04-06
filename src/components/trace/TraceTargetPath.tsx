import React from 'react';
import type { TracePathDef, TraceSegment } from '../../types/trace';

interface TraceTargetPathProps {
  pathDef: TracePathDef;
  segments: TraceSegment[];
}

export const TraceTargetPath: React.FC<TraceTargetPathProps> = ({ pathDef, segments }) => {
  const pointsStr = pathDef.points.map((p) => `${p.x},${p.y}`).join(' ');

  // Find next unvisited segment for pulse effect
  let nextUnvisited = -1;
  for (let i = 0; i < segments.length; i++) {
    if (!segments[i].visited) { nextUnvisited = i; break; }
  }

  return (
    <g>
      {/* Guide path — dashed line */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke="rgba(148,163,184,0.35)"
        strokeWidth="0.025"
        strokeDasharray="0.02 0.015"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Segment dots */}
      {segments.map((seg) => {
        const isNext = seg.index === nextUnvisited;
        return (
          <circle
            key={seg.index}
            cx={seg.center.x}
            cy={seg.center.y}
            r={seg.visited ? 0.015 : isNext ? 0.018 : 0.012}
            fill={seg.visited ? 'rgba(34,197,94,0.8)' : isNext ? 'rgba(99,102,241,0.9)' : 'rgba(148,163,184,0.3)'}
            className={isNext ? 'anim-trace-pulse' : ''}
          />
        );
      })}
    </g>
  );
};
