import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BattleHPBar } from '../components/battle/BattleHPBar';
import { BattleLog } from '../components/battle/BattleLog';
import { BattleActionBar } from '../components/battle/BattleActionBar';
import { BattleMoveSubmenu } from '../components/battle/BattleMoveSubmenu';
import { EnemyIntentDisplay } from '../components/battle/EnemyIntentDisplay';
import { ComboMeter } from '../components/battle/ComboMeter';
import { CombatFeelComboMeter } from '../components/battle/CombatFeelComboMeter';
import { GlitchMeter } from '../components/battle/GlitchMeter';
import { WeakPointIndicator } from '../components/battle/WeakPointIndicator';
import { CollapseOverlay } from '../components/battle/CollapseOverlay';
import { TraceFocusDisplay } from '../components/battle/TraceFocusDisplay';
import { ActiveEffectsBar } from '../components/battle/ActiveEffectsBar';
import { CombatPhaseIndicator } from '../components/battle/CombatPhaseIndicator';
import type { CombatPhase } from '../components/battle/CombatPhaseIndicator';
import { COMBAT_TIMINGS } from '../components/battle/combatTimings';
import {
  FloatingDamageNumber,
  ImpactBurst,
  BattlePetSprite,
  ScreenShake,
} from '../components/battle/BattleEffects';
import { useBattleSequence } from '../components/battle/useBattleSequence';
import { AnimatedEffect, COMBAT_ANIMS } from '../components/battle/AnimatedEffect';
import { GameButton } from '../components/ui/GameButton';
import { TraceEventController } from '../components/battle/TraceEventController';
import { RUNE_ENERGY_THRESHOLD } from '../config/traceConfig';
import { MOVE_CATEGORIES } from '../config/battleConfig';
import { ASSETS } from '../config/assetManifest';
import { generateMathProblem, checkAnswer } from '../services/game/mathEngine';
import type { MathProblem } from '../types';
import type { ActiveBattleState, BattleLogEntry } from '../types/battle';
import type { TraceEventType } from '../types/trace';
import type { MatchResult } from '../types/matchResult';
import type { TrophyCase } from '../types/trophy';
import type { GameEngineAction } from '../engine/core/ActionTypes';

interface BattleScreenProps {
  battle: ActiveBattleState;
  dispatch: (action: GameEngineAction) => void;
  matchHistory?: MatchResult[];
  trophyCase?: TrophyCase;
}

/** Derive the combat phase from engine state + animation state. */
function deriveCombatPhase(
  enginePhase: string,
  isAnimating: boolean,
): CombatPhase {
  if (enginePhase === 'enemy_turn') return 'ENEMY_TURN';
  if (enginePhase === 'resolve') return 'RESOLVING';
  if (isAnimating) return 'PLAYER_ANIMATING';
  if (enginePhase === 'player_turn') return 'PLAYER_INPUT';
  return 'RESOLVING';
}

export const BattleScreen: React.FC<BattleScreenProps> = ({ battle, dispatch }) => {
  const { playerPet, enemyPet, phase, rewards, log } = battle;
  const isPvP = !!battle.pvpMeta;
  const [mathChallenge, setMathChallenge] = useState<MathProblem | null>(null);
  const [mathInput, setMathInput] = useState('');
  const [, setPendingMove] = useState<string | null>(null);
  const [traceStartRequest, setTraceStartRequest] = useState<TraceEventType | null>(null);
  const [actionMode, setActionMode] = useState<'main' | 'attack' | 'skill'>('main');

  const { state: seq, playSequence, removeDamageNumber } = useBattleSequence();
  const prevLogLenRef = useRef(log.length);

  // Combat phase: derived from engine phase + animation state
  const combatPhase = deriveCombatPhase(phase, seq.isAnimating);
  const isPlayerInput = combatPhase === 'PLAYER_INPUT' && !mathChallenge;

  // Reset action mode when phase changes
  const [prevPhase, setPrevPhase] = useState(phase);
  if (prevPhase !== phase) {
    setPrevPhase(phase);
    setActionMode('main');
  }

  const handleMathSubmit = () => {
    if (!mathChallenge) return;
    const correct = checkAnswer(mathChallenge, Number(mathInput));
    if (correct) {
      dispatch({ type: 'MATH_BONUS_CORRECT' });
    }
    setMathChallenge(null);
    setMathInput('');
  };

  const handleMove = useCallback((moveId: string) => {
    if (!isPlayerInput) return;
    setPendingMove(moveId);
    dispatch({ type: 'PLAYER_MOVE', moveId });
    setActionMode('main');
  }, [isPlayerInput, dispatch]);

  // --- Animation queue: drain entries one-at-a-time via onComplete ---
  const animQueueRef = useRef<BattleLogEntry[]>([]);
  const drainingRef = useRef(false);
  const drainQueueRef = useRef<() => void>(null);
  const drainTimeoutRef = useRef<number | null>(null);

  const drainQueue = useCallback(() => {
    if (drainingRef.current) return;
    const next = animQueueRef.current.shift();
    if (!next) return;

    drainingRef.current = true;
    const attackerSpecies = next.actor === 'player' ? playerPet.speciesId : enemyPet.speciesId;
    const defenderSpecies = next.actor === 'player' ? enemyPet.speciesId : playerPet.speciesId;

    playSequence(next, () => {
      setPendingMove(null);
      drainingRef.current = false;
      drainTimeoutRef.current = window.setTimeout(() => drainQueueRef.current?.(), COMBAT_TIMINGS.interEntryGap);
    }, attackerSpecies, defenderSpecies);
  }, [playSequence, playerPet.speciesId, enemyPet.speciesId]);

  useEffect(() => {
    drainQueueRef.current = drainQueue;
  }, [drainQueue]);

  // Enqueue new log entries and kick the drain
  useEffect(() => {
    if (log.length > prevLogLenRef.current) {
      const newEntries = log.slice(prevLogLenRef.current);
      prevLogLenRef.current = log.length;

      for (const entry of newEntries) {
        if (entry.action === 'battle_start') continue;
        animQueueRef.current.push(entry);
      }
      drainQueue();
    }
  }, [log.length, log, drainQueue]);

  // Cleanup queue on unmount
  useEffect(() => {
    return () => {
      if (drainTimeoutRef.current !== null) clearTimeout(drainTimeoutRef.current);
      animQueueRef.current = [];
      drainingRef.current = false;
    };
  }, []);

  // PvP battles route to MatchResultScreen on end
  useEffect(() => {
    if (isPvP && (phase === 'victory' || phase === 'defeat')) {
      dispatch({ type: 'SET_SCREEN', screen: 'match_result' });
    }
  }, [isPvP, phase, dispatch]);

  if (isPvP && (phase === 'victory' || phase === 'defeat')) return null;

  if (phase === 'victory') {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 gap-6 text-white">
        <h1 className="text-4xl font-black text-yellow-400 uppercase tracking-widest anim-pop">Victory!</h1>
        <p className="text-slate-300 text-lg">You defeated {enemyPet.name}!</p>
        {rewards && (
          <div className="flex gap-6 text-center anim-pop" style={{ animationDelay: '0.2s' }}>
            <div>
              <div className="text-2xl font-black text-amber-400 flex items-center gap-1">+{rewards.tokens} <img src="/assets/generated/final/icon_token.png" alt="" className="w-6 h-6 inline" style={{ imageRendering: 'pixelated' }} /></div>
              <div className="text-xs text-slate-400">Tokens</div>
            </div>
            <div>
              <div className="text-2xl font-black text-purple-400">+{rewards.xp} XP</div>
              <div className="text-xs text-slate-400">Experience</div>
            </div>
            {rewards.coins && (
              <div>
                <div className="text-2xl font-black text-cyan-400 flex items-center gap-1">+{rewards.coins} <img src="/assets/generated/final/icon_coin.png" alt="" className="w-6 h-6 inline" style={{ imageRendering: 'pixelated' }} /></div>
                <div className="text-xs text-slate-400">Coins</div>
              </div>
            )}
          </div>
        )}
        <GameButton variant="primary" size="lg" onClick={() => dispatch({ type: 'END_BATTLE' })}>
          Continue
        </GameButton>
      </div>
    );
  }

  if (phase === 'defeat') {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 gap-6 text-white">
        <h1 className="text-4xl font-black text-red-400 uppercase tracking-widest anim-shake">Defeated!</h1>
        <p className="text-slate-300">Your pet was exhausted in battle.</p>
        <GameButton variant="secondary" size="lg" onClick={() => dispatch({ type: 'FLEE_BATTLE' })}>
          Retreat
        </GameButton>
      </div>
    );
  }

  // Get animation classes for each pet
  const playerAnimClass = seq.phase !== 'idle'
    ? (seq.attackerSide === 'player' ? seq.attackerAnim : seq.defenderAnim)
    : '';
  const enemyAnimClass = seq.phase !== 'idle'
    ? (seq.attackerSide === 'enemy' ? seq.attackerAnim : seq.defenderAnim)
    : '';

  // Filter moves by category for sub-menus
  const attackMoves = playerPet.moves.filter(m => MOVE_CATEGORIES[m.id] === 'attack');
  const skillMoves = playerPet.moves.filter(m => MOVE_CATEGORIES[m.id] === 'skill');

  const isEnemyTurn = combatPhase === 'ENEMY_TURN';

  return (
      <div className="fixed inset-0 bg-slate-900 text-white flex flex-col overflow-hidden">

        {/* === TOP HUD — Player & Enemy Stats === */}
        <div data-help="hp-bars" className="battle-hud-bar flex-shrink-0 flex items-stretch bg-slate-900/90 border-b border-slate-700/50 z-10">
          {/* Player stats */}
          <div className="flex-1 flex items-center gap-3 px-4 py-2 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-600 flex-shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src={ASSETS.petPortraits[playerPet.speciesId] ?? ''}
                alt={playerPet.name}
                className="w-full h-full object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="font-black text-cyan-300 uppercase tracking-wide text-sm truncate">{playerPet.name}</span>
                <span className="text-[10px] text-slate-400 flex-shrink-0">Lv.{playerPet.level}</span>
                <span className="text-[10px] text-slate-500 flex-shrink-0">+4/turn</span>
                {battle.untrained && (
                  <span
                    className="ml-1 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-amber-600/80 text-amber-50 flex-shrink-0"
                    title="No Math Prep buffs — damage reduced. Train in Math Arena!"
                  >
                    Untrained
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                <BattleHPBar current={playerPet.currentHP} max={playerPet.maxHP} label="HP" />
                <BattleHPBar current={playerPet.energy} max={playerPet.maxEnergy} label="EN" variant="energy" />
              </div>
            </div>
          </div>

          {/* Turn counter + Phase indicator + Combat Feel HUD */}
          <div className="flex flex-col items-center justify-center px-4 flex-shrink-0 gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700/50">
              Turn {battle.turnCount}
            </span>
            <CombatPhaseIndicator phase={combatPhase} />
            <div className="flex items-center gap-2 mt-0.5">
              <GlitchMeter combatFeel={battle.combatFeel} />
              <TraceFocusDisplay combatFeel={battle.combatFeel} />
            </div>
          </div>

          {/* Enemy stats */}
          <div className="flex-1 flex items-center gap-3 px-4 py-2 min-w-0 justify-end">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5 justify-end">
                <span className="text-[10px] text-slate-400 flex-shrink-0">Lv.{enemyPet.level}</span>
                <span className="font-black text-red-300 uppercase tracking-wide text-sm truncate">{enemyPet.name}</span>
              </div>
              <div className="space-y-0.5">
                <BattleHPBar current={enemyPet.currentHP} max={enemyPet.maxHP} label="HP" />
                <BattleHPBar current={enemyPet.energy} max={enemyPet.maxEnergy} label="EN" variant="energy" />
              </div>
            </div>
            <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-600 flex-shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src={ASSETS.petPortraits[enemyPet.speciesId] ?? ''}
                alt={enemyPet.name}
                className="w-full h-full object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>
        </div>

        {/* === BATTLE ARENA — Full Width === */}
        <ScreenShake active={seq.screenShake} className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 overflow-hidden">
            {/* Background */}
            <img
              src={ASSETS.scenes.battleArena}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Enemy turn screen dim overlay */}
            {isEnemyTurn && (
              <div className="absolute inset-0 bg-black/20 anim-enemy-turn-dim pointer-events-none" style={{ zIndex: 15 }} />
            )}

            {/* Enemy sprite — upper right */}
            <div className="absolute top-[15%] right-[22%]">
              <div className="relative">
                <WeakPointIndicator combatFeel={battle.combatFeel} />
                <BattlePetSprite speciesId={enemyPet.speciesId} animClass={enemyAnimClass} combatSheet={seq.attackerSide === 'enemy' ? seq.attackerCombatSheet : seq.attackerSide === 'player' ? seq.defenderCombatSheet : null} flip>
                  {seq.damageNumbers.filter(d => d.target === 'enemy').map(num => (
                    <FloatingDamageNumber key={num.id} num={num} onDone={() => removeDamageNumber(num.id)} />
                  ))}
                  {seq.impactEffect?.target === 'enemy' && (
                    seq.impactEffect.animId && COMBAT_ANIMS[seq.impactEffect.animId]
                      ? <AnimatedEffect config={COMBAT_ANIMS[seq.impactEffect.animId]} displaySize={128} onDone={() => {}} />
                      : <ImpactBurst effectImage={seq.impactEffect.image} animClass={seq.impactEffect.animClass} onDone={() => {}} />
                  )}
                </BattlePetSprite>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-black/40 rounded-[100%] blur-sm" />
              </div>
            </div>

            {/* Player sprite — lower left */}
            <div className="absolute bottom-[15%] left-[22%]">
              <div className="relative">
                <BattlePetSprite speciesId={playerPet.speciesId} animClass={playerAnimClass} combatSheet={seq.attackerSide === 'player' ? seq.attackerCombatSheet : seq.attackerSide === 'enemy' ? seq.defenderCombatSheet : null}>
                  {seq.damageNumbers.filter(d => d.target === 'player').map(num => (
                    <FloatingDamageNumber key={num.id} num={num} onDone={() => removeDamageNumber(num.id)} />
                  ))}
                  {seq.impactEffect?.target === 'player' && (
                    seq.impactEffect.animId && COMBAT_ANIMS[seq.impactEffect.animId]
                      ? <AnimatedEffect config={COMBAT_ANIMS[seq.impactEffect.animId]} displaySize={128} onDone={() => {}} />
                      : <ImpactBurst effectImage={seq.impactEffect.image} animClass={seq.impactEffect.animClass} onDone={() => {}} />
                  )}
                </BattlePetSprite>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-black/40 rounded-[100%] blur-sm" />
              </div>
            </div>

            {/* VS indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <span className="text-5xl font-black text-white/10 uppercase tracking-[0.3em]">VS</span>
            </div>

            {/* Bottom-left overlay: Active Effects + Combo */}
            <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 pointer-events-none max-w-[220px]">
              <div className="bg-slate-900/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-slate-700/30">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Effects</div>
                <ActiveEffectsBar
                  buffs={playerPet.buffs}
                  traceBuffs={battle.traceBuffs}
                  mathBuffActive={battle.mathBuffActive}
                />
              </div>
              <div className="bg-slate-900/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-slate-700/30">
                <ComboMeter combo={battle.combo} />
                <CombatFeelComboMeter combatFeel={battle.combatFeel} />
              </div>
            </div>

            {/* Bottom-right overlay: Enemy Intent + Battle Log */}
            <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 w-60">
              <div className="bg-slate-900/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-slate-700/30">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Enemy Intent</div>
                <EnemyIntentDisplay intent={battle.enemyIntent} />
              </div>
              <div className="bg-slate-900/70 backdrop-blur-sm rounded-lg border border-slate-700/30 overflow-hidden">
                <div className="max-h-20 overflow-y-auto p-1.5">
                  <BattleLog entries={log.slice(-4)} />
                </div>
              </div>
            </div>

            {/* Collapse (Last Stand) overlay */}
            <CollapseOverlay combatFeel={battle.combatFeel} />

            {/* Trace event overlay */}
            <TraceEventController
              battle={battle}
              dispatch={dispatch}
              isAnimating={seq.isAnimating}
              startRequest={traceStartRequest}
              onStartHandled={() => setTraceStartRequest(null)}
            />
          </div>
        </ScreenShake>

        {/* === BOTTOM — PERSISTENT Action Bar (NEVER hidden) === */}
        <div className="flex-shrink-0 border-t border-slate-700/50 bg-slate-900/95 px-4 py-3">
          {/* Math challenge overlay — renders above action bar */}
          {mathChallenge && (
            <div className="rounded-2xl bg-indigo-900/60 border border-indigo-500 p-4 flex flex-col gap-2 mb-3 max-w-xl mx-auto">
              <div className="text-sm font-bold text-indigo-200">Solve for bonus damage + energy!</div>
              <div className="text-lg font-black text-white text-center">{mathChallenge.question}</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={mathInput}
                  onChange={(e) => setMathInput(e.target.value)}
                  className="flex-1 rounded-lg bg-slate-700 border border-slate-500 text-white px-3 py-2 text-center font-bold"
                  placeholder="?"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleMathSubmit()}
                />
                <GameButton variant="primary" size="sm" onClick={handleMathSubmit}>
                  Submit
                </GameButton>
              </div>
            </div>
          )}

          {/* Action bar — ALWAYS visible, locked when not player's input turn */}
          <div data-help="action-bar" className="max-w-5xl mx-auto">
            {actionMode === 'main' && (
              <BattleActionBar
                onAttack={() => setActionMode('attack')}
                onDefend={() => dispatch({ type: 'PLAYER_DEFEND_ACTION' })}
                onSkill={() => setActionMode('skill')}
                onFocus={() => dispatch({ type: 'PLAYER_FOCUS' })}
                onFlee={() => dispatch({ type: 'PLAYER_FLEE_ATTEMPT' })}
                combatPhase={combatPhase}
                focusUsed={battle.focusUsedThisTurn}
              />
            )}

            {actionMode === 'attack' && isPlayerInput && (
              <BattleMoveSubmenu
                moves={attackMoves}
                energy={playerPet.energy}
                category="attack"
                onSelectMove={handleMove}
                onBack={() => setActionMode('main')}
              />
            )}

            {actionMode === 'skill' && isPlayerInput && (
              <BattleMoveSubmenu
                moves={skillMoves}
                energy={playerPet.energy}
                category="skill"
                onSelectMove={handleMove}
                onBack={() => setActionMode('main')}
              />
            )}

            {/* Show locked main bar behind submenus when not in player input */}
            {actionMode !== 'main' && !isPlayerInput && (
              <BattleActionBar
                onAttack={() => {}}
                onDefend={() => {}}
                onSkill={() => {}}
                onFocus={() => {}}
                onFlee={() => {}}
                combatPhase={combatPhase}
                focusUsed={battle.focusUsedThisTurn}
              />
            )}
          </div>

          {/* Power Rune + Brain Boost — always visible during player input so
              beta testers can actually find tracing. Individual buttons
              disable themselves with a hint when the prerequisite isn't met. */}
          {isPlayerInput && actionMode === 'main' && !traceStartRequest && (
            <div className="max-w-5xl mx-auto mt-2 flex gap-2 items-center flex-wrap">
              {(() => {
                const runeReady = playerPet.energy >= RUNE_ENERGY_THRESHOLD && !battle.traceBuffs.runeBoostTier;
                return (
                  <GameButton
                    variant="secondary"
                    size="sm"
                    disabled={!runeReady}
                    onClick={() => runeReady && setTraceStartRequest('trace_rune')}
                  >
                    {battle.traceBuffs.runeBoostTier
                      ? 'Rune Active'
                      : playerPet.energy < RUNE_ENERGY_THRESHOLD
                        ? `Power Rune (${RUNE_ENERGY_THRESHOLD} EN)`
                        : 'Power Rune'}
                  </GameButton>
                );
              })()}

              {(() => {
                const mathReady = !battle.mathBuffActive && !battle.traceBuffs.mathTraceTier;
                return (
                  <>
                    <GameButton
                      variant="primary"
                      size="sm"
                      disabled={!mathReady}
                      onClick={() => mathReady && setMathChallenge(generateMathProblem(1))}
                    >
                      {mathReady ? 'Type Answer' : 'Math Active'}
                    </GameButton>
                    <GameButton
                      variant="primary"
                      size="sm"
                      disabled={!mathReady}
                      onClick={() => mathReady && setTraceStartRequest('trace_missing_digit')}
                    >
                      Trace Digit
                    </GameButton>
                    <GameButton
                      variant="primary"
                      size="sm"
                      disabled={!mathReady}
                      onClick={() => mathReady && setTraceStartRequest('trace_answer')}
                    >
                      Trace Answer
                    </GameButton>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
  );
};
