import { Modal } from '../ui/Modal';
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
import { answerToShapeIds } from '../../services/game/traceEngine';
import { generateLearningProblem } from '../../services/game/curriculum';
import { checkAnswer } from '../../services/game/mathEngine';
import { useLearningSettings } from '../LearningContext';
import { LearningHelp } from '../math/LearningHelp';
import { MathAnswerInput } from '../math/MathAnswerInput';
import type { MathProblem } from '../../types';

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
  const learning = useLearningSettings();
  const [mathGate, setMathGate] = useState<{ problem: MathProblem; eventType: TraceEventType } | null>(null);
  const [wrongAnswer, setWrongAnswer] = useState(false);
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
    if (!startRequest || activeTrace || mathGate) return;
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
    } else if (startRequest === 'trace_missing_digit' || startRequest === 'trace_answer') {
      setWrongAnswer(false);
      setMathGate({ problem: generateLearningProblem(learning), eventType: startRequest });
    }
  }, [startRequest, activeTrace, mathGate, onStartHandled, learning]);

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

  if (mathGate) {
    return <Modal isOpen title="Solve before tracing" onClose={() => setMathGate(null)}><div className="max-w-sm mx-auto py-4 text-white"><button className="min-h-11 underline" onClick={() => setMathGate(null)}>Cancel</button><h2 className="text-xl font-bold my-3">Solve first, then trace</h2><p className="text-lg mb-4">{mathGate.problem.question}</p><MathAnswerInput key={mathGate.problem.id} isCorrect={wrongAnswer ? false : null} onSubmit={answer => {
      const correct = checkAnswer(mathGate.problem, answer);
      dispatch({ type: 'RECORD_LEARNING_ATTEMPT', problem: mathGate.problem, source: 'trace', correct });
      if (!correct) { setWrongAnswer(true); return; }
      const numericTrace = Number.isInteger(answer) && answer >= 0 && answer < 1000;
      const paths = numericTrace ? answerToShapeIds(answer).map(id => TRACE_PATHS[id as TraceShapeId]).filter(Boolean) : [TRACE_PATHS.shield_circle];
      setActiveTrace({ eventType: mathGate.eventType, paths, promptText: `Correct! ${answer}. ${numericTrace ? 'Trace your answer' : 'Trace a victory circle'} to power up.` });
      setMathGate(null);
    }}/>{wrongAnswer && <><p role="status" className="text-amber-200 mt-3">Not quite yet. Take your time and try again.</p><LearningHelp key={mathGate.problem.id} problem={mathGate.problem} onRetry={() => { setWrongAnswer(false); document.querySelector<HTMLInputElement>('[aria-label="Your answer"]')?.select(); }} /></>}</div></Modal>;
  }
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
