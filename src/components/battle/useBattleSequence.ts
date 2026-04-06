import { useState, useCallback, useRef, useEffect } from 'react';
import type { DamageNumber } from './BattleEffects';
import { createDamageNumber } from './BattleEffects';
import { COMBAT_TIMINGS } from './combatTimings';
import type { BattleLogEntry } from '../../types/battle';
import type { CombatSheetConfig } from '../../config/assetManifest';
import { ASSETS } from '../../config/assetManifest';

export type SequencePhase = 'idle' | 'windup' | 'impact' | 'reaction' | 'resolve';

export interface BattleSequenceState {
  phase: SequencePhase;
  attackerAnim: string;
  defenderAnim: string;
  screenShake: boolean;
  damageNumbers: DamageNumber[];
  impactEffect: { image: string; animClass: string; animId?: string; target: 'player' | 'enemy' } | null;
  /** Combat sprite sheet for the attacker (replaces portrait during attack) */
  attackerCombatSheet: CombatSheetConfig | null;
  /** Combat sprite sheet for the defender (e.g. hurt reaction) */
  defenderCombatSheet: CombatSheetConfig | null;
  /** Which side is attacking — so BattleScreen knows which pet to animate */
  attackerSide: 'player' | 'enemy' | null;
  isAnimating: boolean;
}

const TIMING = {
  windup: COMBAT_TIMINGS.windup,
  impact: COMBAT_TIMINGS.impact,
  reaction: COMBAT_TIMINGS.reaction,
  resolve: COMBAT_TIMINGS.resolve,
};

/** Fallback effect images by move type — animId triggers sprite-sheet playback when set */
const TYPE_EFFECTS: Record<string, { image: string; animClass: string; animId?: string }> = {
  attack:  { image: '/assets/generated/final/effect_hit.png',           animClass: 'anim-battle-impact-burst' },
  special: { image: '/assets/generated/final/effect_fire.png',          animClass: 'anim-battle-impact-burst', animId: 'fire' },
  heal:    { image: '/assets/generated/final/effect_heal.png',          animClass: 'anim-battle-effect-absorb', animId: 'heal' },
  defend:  { image: '/assets/generated/final/effect_energy_burst.png',  animClass: 'anim-battle-effect-shield', animId: 'shield' },
};

/** Per-move effect overrides — keyed by move ID from battleConfig.
 *  animId maps to COMBAT_ANIMS registry for sprite-sheet playback. */
const MOVE_EFFECTS: Record<string, { image: string; animClass: string; animId?: string }> = {
  // koala_sprite
  leaf_whip:     { image: '/assets/generated/final/effect_slash.png',       animClass: 'anim-battle-effect-slash',   animId: 'slash' },
  bubble_guard:  { image: '/assets/generated/final/effect_shield_flash.png', animClass: 'anim-battle-effect-shield', animId: 'shield' },
  nature_heal:   { image: '/assets/generated/final/effect_heal.png',        animClass: 'anim-battle-effect-absorb', animId: 'heal' },
  tidal_splash:  { image: '/assets/generated/final/effect_slam.png',        animClass: 'anim-battle-effect-slam',   animId: 'slam' },
  // slime_baby
  slime_toss:  { image: '/assets/generated/final/effect_slime.png',      animClass: 'anim-battle-effect-splash' },
  absorb:      { image: '/assets/generated/final/effect_absorb.png',     animClass: 'anim-battle-effect-absorb', animId: 'heal' },
  harden:      { image: '/assets/generated/final/effect_shield_flash.png', animClass: 'anim-battle-effect-shield', animId: 'shield' },
  acid_splash: { image: '/assets/generated/final/effect_acid.png',       animClass: 'anim-battle-effect-splash', animId: 'fire' },
  // mech_bot
  laser:      { image: '/assets/generated/final/effect_lightning.png',   animClass: 'anim-battle-effect-zap',    animId: 'lightning' },
  shield:     { image: '/assets/generated/final/effect_shield_flash.png', animClass: 'anim-battle-effect-shield', animId: 'shield' },
  repair:     { image: '/assets/generated/final/effect_repair.png',      animClass: 'anim-battle-effect-repair', animId: 'heal' },
  overcharge: { image: '/assets/generated/final/effect_overcharge.png',  animClass: 'anim-battle-effect-zap',    animId: 'lightning' },
  // default
  tackle:     { image: '/assets/generated/final/effect_tackle.png',      animClass: 'anim-battle-impact-burst' },
  guard:      { image: '/assets/generated/final/effect_shield_flash.png', animClass: 'anim-battle-effect-shield', animId: 'shield' },
  rest:       { image: '/assets/generated/final/effect_heal.png',        animClass: 'anim-battle-effect-absorb', animId: 'heal' },
  burst:      { image: '/assets/generated/final/effect_energy_nova.png', animClass: 'anim-battle-impact-burst',  animId: 'fire' },
};

function getEffectForAction(actionId: string, moveType: string): { image: string; animClass: string; animId?: string } {
  return MOVE_EFFECTS[actionId] ?? TYPE_EFFECTS[moveType] ?? TYPE_EFFECTS.attack;
}

function parseLogEntry(entry: BattleLogEntry): {
  type: 'attack' | 'heal' | 'defend' | 'miss' | 'skip';
  damage: number;
} {
  const msg = entry.message;
  const damageMatch = msg.match(/for (\d+) damage/);
  const healMatch = msg.match(/healed for (\d+)/);

  if (msg.includes('missed')) return { type: 'miss', damage: 0 };
  if (msg.includes('struggles and lashes out')) {
    const struggleMatch = msg.match(/for (\d+) damage/);
    return { type: 'attack', damage: struggleMatch ? parseInt(struggleMatch[1]) : 1 };
  }
  if (msg.includes('defensive stance')) return { type: 'defend', damage: 0 };
  if (msg.includes('gathering energy')) return { type: 'skip', damage: 0 };
  if (msg.includes('gathers energy')) return { type: 'skip', damage: 0 };
  if (msg.includes('focuses their energy')) return { type: 'skip', damage: 0 };
  if (msg.includes("couldn't escape")) return { type: 'skip', damage: 0 };
  if (msg.includes('Not enough energy')) return { type: 'skip', damage: 0 };
  if (healMatch) return { type: 'heal', damage: parseInt(healMatch[1]) };
  if (damageMatch) return { type: 'attack', damage: parseInt(damageMatch[1]) };
  return { type: 'skip', damage: 0 };
}

export function useBattleSequence() {
  const [state, setState] = useState<BattleSequenceState>({
    phase: 'idle',
    attackerAnim: '',
    defenderAnim: '',
    screenShake: false,
    damageNumbers: [],
    impactEffect: null,
    attackerCombatSheet: null,
    defenderCombatSheet: null,
    attackerSide: null,
    isAnimating: false,
  });

  const timeoutRef = useRef<number[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  }, []);

  // Clean up all pending timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRef.current.forEach(clearTimeout);
    };
  }, []);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timeoutRef.current.push(id);
    return id;
  }, []);

  const removeDamageNumber = useCallback((id: number) => {
    setState(prev => ({
      ...prev,
      damageNumbers: prev.damageNumbers.filter(d => d.id !== id),
    }));
  }, []);

  const playSequence = useCallback((
    entry: BattleLogEntry,
    onComplete: () => void,
    attackerSpeciesId?: string,
    defenderSpeciesId?: string,
  ) => {
    clearTimeouts();

    const actor = entry.actor; // 'player' or 'enemy'
    const target = actor === 'player' ? 'enemy' : 'player';
    const { type, damage } = parseLogEntry(entry);

    if (type === 'skip') {
      // Ensure isAnimating is cleared for skip actions (focus, flee, gather)
      setState(prev => ({ ...prev, isAnimating: false, phase: 'idle' }));
      onComplete();
      return;
    }

    // Look up combat animation sheet for this species + move type
    const combatType = type === 'attack' ? 'attack'
      : type === 'defend' ? 'defend'
      : type === 'heal' ? 'heal'
      : 'special';
    const combatSheet = (combatType && attackerSpeciesId)
      ? ASSETS.combatAnims[attackerSpeciesId]?.[combatType] ?? null
      : null;

    // Look up hurt sheet for the defender (plays on hit)
    const hurtSheet = (type === 'attack' && defenderSpeciesId)
      ? ASSETS.combatAnims[defenderSpeciesId]?.['hurt'] ?? null
      : null;

    // --- PHASE 1: WINDUP ---
    const lungeClass = actor === 'player' ? 'anim-battle-lunge-right' : 'anim-battle-lunge-left';
    const hasSheet = combatSheet !== null;

    setState(prev => ({
      ...prev,
      phase: 'windup',
      isAnimating: true,
      attackerAnim: type === 'defend' || type === 'heal' ? '' : (hasSheet ? '' : lungeClass),
      defenderAnim: '',
      screenShake: false,
      impactEffect: null,
      attackerCombatSheet: combatSheet,
      defenderCombatSheet: null,
      attackerSide: actor,
    }));

    // --- PHASE 2: IMPACT ---
    addTimeout(() => {
      const knockbackClass = target === 'player'
        ? 'anim-battle-knockback-left'
        : 'anim-battle-knockback-right';

      const isHit = type === 'attack' && damage > 0;
      const effect = getEffectForAction(entry.action, type);

      const dmgNum = type === 'attack' && damage > 0
        ? createDamageNumber(damage, 'damage', target)
        : type === 'miss'
        ? createDamageNumber('MISS', 'miss', target)
        : type === 'heal'
        ? createDamageNumber(damage, 'heal', actor)
        : type === 'defend'
        ? createDamageNumber('BLOCK', 'defend', actor)
        : null;

      const showEffect = isHit || type === 'heal' || type === 'defend';

      setState(prev => ({
        ...prev,
        phase: 'impact',
        attackerAnim: '',
        defenderAnim: isHit && !hurtSheet ? `${knockbackClass} anim-battle-hit-flash` : '',
        defenderCombatSheet: isHit ? hurtSheet : null,
        screenShake: isHit,
        impactEffect: showEffect ? { image: effect.image, animClass: effect.animClass, animId: effect.animId, target: type === 'heal' || type === 'defend' ? actor : target } : null,
        damageNumbers: dmgNum ? [...prev.damageNumbers, dmgNum] : prev.damageNumbers,
      }));

      // --- PHASE 3: REACTION ---
      // If a combat sheet is playing, extend reaction to let it finish
      const sheetDuration = combatSheet ? (combatSheet.frameCount * combatSheet.frameDuration) : 0;
      const reactionDelay = Math.max(TIMING.reaction, sheetDuration - TIMING.windup - TIMING.impact);

      addTimeout(() => {
        setState(prev => ({
          ...prev,
          phase: 'reaction',
          screenShake: false,
          impactEffect: null,
        }));

        // --- PHASE 4: RESOLVE ---
        addTimeout(() => {
          setState(prev => ({
            ...prev,
            phase: 'resolve',
            attackerAnim: '',
            defenderAnim: '',
            attackerCombatSheet: null,
            defenderCombatSheet: null,
            attackerSide: null,
            isAnimating: false,
          }));
          onComplete();
        }, TIMING.resolve);
      }, reactionDelay);
    }, TIMING.windup + TIMING.impact);

  }, [clearTimeouts, addTimeout]);

  return { state, playSequence, removeDamageNumber };
}
