import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ActiveBattleState, BattleLogEntry } from '../../types/battle';
import type { TraceEventType, TraceResult, TracePathDef, TraceShapeId } from '../../types/trace';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { TraceOverlay } from '../trace/TraceOverlay';
import {
  TRACE_PATHS,
  RUNE_SHAPE_IDS,
  SHIELD_DAMAGE_THRESHOLD,
  TRACE_SHIELD_REDUCTION,
} from '../../config/traceConfig';
import { answerToShapeIds, generateMissingDigitProblem } from '../../services/game/traceEngine';
import { generateMathProblem } from '../../services/game/mathEngine';

interface TraceEventControllerProps {
  battle: ActiveBattleState;
  dispatch: (action: GameEngineAction) => void;
  isAnimating: boolean;
  /** External trigger to start a specific trace type */
  startRequest: TraceEventType | null;
  onStartHandled: () => void;
}

type ActiveTrace = {
  eventType: TraceEventType;
  paths: TracePathDef[];
  promptText: string;
};

function getLastEnemyDamage(log: BattleLogEntry[], playerMaxHP: number): number {
  for (let i = log.length - 1; i >= 0; i--) {
    const entry = log[i];
    if (entry.actor === 'enemy' && entry.damage && entry.damage > 0) {
      if (entry.damage >= playerMaxHP * SHIELD_DAMAGE_THRESHOLD) {
        return entry.damage;
      }
      return 0;
    }
  }
  return 0;
}

export const TraceEventController: React.FC<TraceEventControllerProps> = ({
  battle,
  dispatch,
  // isAnimating reserved for future animation-gating
  startRequest,
  onStartHandled,
}) => {
  const [activeTrace, setActiveTrace] = useState<ActiveTrace | null>(null);
  const [shieldAvailable, setShieldAvailable] = useState(false);
  const [shieldDamage, setShieldDamage] = useState(0);
  const shieldTimerRef = useRef<number | null>(null);
  const prevLogLenRef = useRef(battle.log.length);

  // Detect heavy enemy hit for shield trace offer
  useEffect(() => {
    if (battle.log.length <= prevLogLenRef.current) {
      prevLogLenRef.current = battle.log.length;
      return;
    }
    prevLogLenRef.current = battle.log.length;

    const dmg = getLastEnemyDamage(battle.log, battle.playerPet.maxHP);
    if (dmg > 0 && !battle.traceBuffs.shieldTier) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reactive sync: shield availability derived from battle log changes + timer
      setShieldAvailable(true);
      setShieldDamage(dmg);

      if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
      shieldTimerRef.current = window.setTimeout(() => {
        setShieldAvailable(false);
        setShieldDamage(0);
      }, 3000);
    }
  }, [battle.log, battle.log.length, battle.playerPet.maxHP, battle.traceBuffs.shieldTier]);

  useEffect(() => {
    return () => {
      if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
    };
  }, []);

  // Handle external start requests
  useEffect(() => {
    if (!startRequest || activeTrace) return;
    onStartHandled();

    if (startRequest === 'trace_shield') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- event-driven: responding to external trace start request
      setShieldAvailable(false);
      if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
      setActiveTrace({
        eventType: 'trace_shield',
        paths: [TRACE_PATHS.shield_circle],
        promptText: 'Trace the Shield!',
      });
    } else if (startRequest === 'trace_rune') {
      const shapeId = RUNE_SHAPE_IDS[Math.floor(Math.random() * RUNE_SHAPE_IDS.length)];
      const pathDef = TRACE_PATHS[shapeId];
      setActiveTrace({
        eventType: 'trace_rune',
        paths: [pathDef],
        promptText: `Draw the ${pathDef.displayLabel ?? 'Rune'}!`,
      });
    } else if (startRequest === 'trace_missing_digit') {
      const problem = generateMissingDigitProblem(1);
      const pathDef = TRACE_PATHS[problem.shapeId];
      setActiveTrace({
        eventType: 'trace_missing_digit',
        paths: [pathDef],
        promptText: `${problem.question} — Trace the ${problem.answer}!`,
      });
    } else if (startRequest === 'trace_answer') {
      const problem = generateMathProblem(1);
      const shapeIds = answerToShapeIds(problem.answer);
      const paths = shapeIds.map((id) => TRACE_PATHS[id as TraceShapeId]).filter(Boolean);
      if (paths.length > 0) {
        setActiveTrace({
          eventType: 'trace_answer',
          paths,
          promptText: `${problem.question} = ? — Trace the answer!`,
        });
      }
    }
  }, [startRequest, activeTrace, onStartHandled]);

  const handleComplete = useCallback((result: TraceResult) => {
    if (result.eventType === 'trace_shield') {
      const reduction = TRACE_SHIELD_REDUCTION[result.tier];
      const damageToRestore = Math.floor(shieldDamage * reduction);
      dispatch({ type: 'TRACE_SHIELD_COMPLETE', tier: result.tier, damageToRestore });
    } else if (result.eventType === 'trace_rune') {
      dispatch({ type: 'TRACE_RUNE_COMPLETE', tier: result.tier });
    } else {
      dispatch({ type: 'TRACE_MATH_COMPLETE', tier: result.tier });
    }
  }, [dispatch, shieldDamage]);

  const handleExpired = useCallback(() => {
    dispatch({ type: 'TRACE_EVENT_FAILED' });
  }, [dispatch]);

  const handleDismiss = useCallback(() => {
    setActiveTrace(null);
    setShieldDamage(0);
  }, []);

  const startShieldTrace = useCallback(() => {
    setShieldAvailable(false);
    if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
    setActiveTrace({
      eventType: 'trace_shield',
      paths: [TRACE_PATHS.shield_circle],
      promptText: 'Trace the Shield!',
    });
  }, []);

  if (activeTrace) {
    return (
      <TraceOverlay
        eventType={activeTrace.eventType}
        paths={activeTrace.paths}
        promptText={activeTrace.promptText}
        onComplete={handleComplete}
        onExpired={handleExpired}
        onDismiss={handleDismiss}
      />
    );
  }

  return (
    <>
      {shieldAvailable && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-40 flex justify-center pointer-events-auto">
          <button
            onClick={startShieldTrace}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider rounded-xl border-2 border-blue-400 shadow-lg anim-pop"
          >
            Shield!
          </button>
        </div>
      )}
    </>
  );
};
