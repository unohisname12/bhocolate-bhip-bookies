import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  TraceEventType,
  TracePathDef,
  TracePoint,
  TraceResult,
  TraceSession,
} from '../types/trace';
import { buildSegments, updateSegmentProgress, calcCompletion, determineTier } from '../services/game/traceEngine';
import { TRACE_EVENT_CONFIGS } from '../config/traceConfig';

interface UseTraceInteractionOptions {
  eventType: TraceEventType;
  paths: TracePathDef[];
  onComplete: (result: TraceResult) => void;
  onExpired: () => void;
}

interface UseTraceInteractionReturn {
  session: TraceSession;
  handlePointerDown: (point: TracePoint) => void;
  handlePointerMove: (point: TracePoint) => void;
  handlePointerUp: () => void;
}

export function useTraceInteraction(options: UseTraceInteractionOptions): UseTraceInteractionReturn {
  const { eventType, paths, onComplete, onExpired } = options;
  const config = TRACE_EVENT_CONFIGS[eventType];

  const [session, setSession] = useState<TraceSession>(() => {
    const segments = paths.length > 0
      ? buildSegments(paths[0], config.hitRadiusMultiplier)
      : [];
    return {
      eventType,
      paths,
      currentPathIndex: 0,
      segments,
      playerStroke: [],
      completionPct: 0,
      accuracySum: 0,
      accuracyCount: 0,
      startedAt: Date.now(),
      timeLimitMs: config.timeLimitMs,
      phase: 'ready',
      result: null,
    };
  });

  const isTracingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onExpiredRef.current = onExpired;
  });

  // Timer — countdown to expiration
  useEffect(() => {
    if (session.phase === 'result' || session.phase === 'evaluating') return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - session.startedAt;
      if (elapsed >= session.timeLimitMs) {
        clearInterval(timer);

        // Evaluate what we have
        const completion = calcCompletion(session.segments);
        const avgAccuracy = session.accuracyCount > 0
          ? Math.max(0, 100 - (session.accuracySum / session.accuracyCount) * 500)
          : 0;
        const tier = determineTier(completion, config.thresholds);

        if (tier === 'miss') {
          onExpiredRef.current();
        } else {
          const result: TraceResult = {
            eventType,
            tier,
            completionPct: completion,
            accuracyPct: Math.round(avgAccuracy),
            timeElapsedMs: elapsed,
          };
          onCompleteRef.current(result);
        }

        setSession((prev) => ({ ...prev, phase: 'result' }));
      }
    }, 100);

    return () => clearInterval(timer);
  }, [session.startedAt, session.timeLimitMs, session.phase, session.segments, session.accuracySum, session.accuracyCount, eventType, config.thresholds]);

  const handlePointerDown = useCallback((point: TracePoint) => {
    if (session.phase === 'result' || session.phase === 'evaluating') return;
    isTracingRef.current = true;
    setSession((prev) => ({
      ...prev,
      phase: 'tracing',
      playerStroke: [point],
    }));
  }, [session.phase]);

  const handlePointerMove = useCallback((point: TracePoint) => {
    if (!isTracingRef.current) return;

    setSession((prev) => {
      if (prev.phase !== 'tracing') return prev;

      const { segments: updated, newVisits, distanceSum } = updateSegmentProgress(
        prev.segments,
        point,
      );

      const completion = calcCompletion(updated);

      return {
        ...prev,
        segments: updated,
        playerStroke: [...prev.playerStroke, point],
        completionPct: completion,
        accuracySum: prev.accuracySum + distanceSum,
        accuracyCount: prev.accuracyCount + newVisits,
      };
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isTracingRef.current) return;
    isTracingRef.current = false;

    setSession((prev) => {
      if (prev.phase !== 'tracing') return prev;

      const completion = calcCompletion(prev.segments);
      const tier = determineTier(completion, config.thresholds);

      // If we hit at least basic tier, check if there are more paths
      if (tier !== 'miss' && prev.currentPathIndex < prev.paths.length - 1) {
        // Advance to next path
        const nextIdx = prev.currentPathIndex + 1;
        const nextSegments = buildSegments(prev.paths[nextIdx], config.hitRadiusMultiplier);
        return {
          ...prev,
          currentPathIndex: nextIdx,
          segments: nextSegments,
          playerStroke: [],
          completionPct: 0,
        };
      }

      // Final evaluation
      if (tier !== 'miss') {
        const elapsed = Date.now() - prev.startedAt;
        const avgAccuracy = prev.accuracyCount > 0
          ? Math.max(0, 100 - (prev.accuracySum / prev.accuracyCount) * 500)
          : 50;

        const result: TraceResult = {
          eventType,
          tier,
          completionPct: completion,
          accuracyPct: Math.round(avgAccuracy),
          timeElapsedMs: elapsed,
        };

        // Defer callback to avoid setState-in-render
        setTimeout(() => onCompleteRef.current(result), 0);
        return { ...prev, phase: 'result', result };
      }

      // Below threshold — allow retry (reset stroke, keep segment progress)
      return { ...prev, playerStroke: [] };
    });
  }, [config.hitRadiusMultiplier, config.thresholds, eventType]);

  return { session, handlePointerDown, handlePointerMove, handlePointerUp };
}
