import React, { useRef, useCallback, useState, useEffect } from 'react';
import type { TraceEventType, TracePathDef, TracePoint, TraceResult, TraceTier } from '../../types/trace';
import { useTraceInteraction } from '../../hooks/useTraceInteraction';
import { TraceTargetPath } from './TraceTargetPath';
import { TracePlayerStroke } from './TracePlayerStroke';
import { TraceHUD } from './TraceHUD';
import { TraceResultFlash } from './TraceResultFlash';
import { TRACE_EVENT_CONFIGS } from '../../config/traceConfig';

interface TraceOverlayProps {
  eventType: TraceEventType;
  paths: TracePathDef[];
  promptText: string;
  onComplete: (result: TraceResult) => void;
  onExpired: () => void;
  onDismiss: () => void;
}

export const TraceOverlay: React.FC<TraceOverlayProps> = ({
  eventType,
  paths,
  promptText,
  onComplete,
  onExpired,
  onDismiss,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const config = TRACE_EVENT_CONFIGS[eventType];

  const [resultTier, setResultTier] = useState<TraceTier | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const handleComplete = useCallback((result: TraceResult) => {
    setResultTier(result.tier);
    onComplete(result);
  }, [onComplete]);

  const handleExpired = useCallback(() => {
    setResultTier('miss');
    onExpired();
  }, [onExpired]);

  const { session, handlePointerDown, handlePointerMove, handlePointerUp } = useTraceInteraction({
    eventType,
    paths,
    onComplete: handleComplete,
    onExpired: handleExpired,
  });

  // Track elapsed time for HUD
  useEffect(() => {
    if (session.phase === 'result') return;
    const timer = setInterval(() => {
      setElapsed(Date.now() - session.startedAt);
    }, 50);
    return () => clearInterval(timer);
  }, [session.startedAt, session.phase]);

  const timeRemainingPct = Math.max(0, 100 - (elapsed / config.timeLimitMs) * 100);

  // Convert screen coords to normalised SVG coords
  const toNormalized = useCallback((clientX: number, clientY: number): TracePoint | null => {
    const rect = rectRef.current;
    if (!rect) return null;
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (session.phase === 'result') return;
    rectRef.current = containerRef.current?.getBoundingClientRect() ?? null;
    const pt = toNormalized(e.clientX, e.clientY);
    if (pt) handlePointerDown(pt);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [handlePointerDown, toNormalized, session.phase]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const pt = toNormalized(e.clientX, e.clientY);
    if (pt) handlePointerMove(pt);
  }, [handlePointerMove, toNormalized]);

  const onPointerUp = useCallback(() => {
    handlePointerUp();
  }, [handlePointerUp]);

  const currentPath = paths[session.currentPathIndex];

  return (
    <div
      className="absolute inset-0 z-40 rounded-2xl overflow-hidden anim-trace-enter"
      style={{ touchAction: 'none', background: 'rgba(15,23,42,0.85)' }}
    >
      <TraceHUD
        promptText={promptText}
        completionPct={session.completionPct}
        timeRemainingPct={timeRemainingPct}
      />

      <div
        ref={containerRef}
        className="absolute inset-0"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: 'crosshair' }}
      >
        <svg
          viewBox="0 0 1 1"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id="trace-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.015" />
            </filter>
          </defs>

          {currentPath && (
            <TraceTargetPath
              pathDef={currentPath}
              segments={session.segments}
            />
          )}

          <TracePlayerStroke
            stroke={session.playerStroke}
            completionPct={session.completionPct}
          />
        </svg>
      </div>

      {resultTier && (
        <TraceResultFlash tier={resultTier} onDone={onDismiss} />
      )}
    </div>
  );
};
