import type { Pet } from '../../types';
import type {
  HandMode,
  InteractionState,
} from '../../types/interaction';
import { INTERACTION_DEFS, STREAK_BONUSES, SPAM_DIMINISH_THRESHOLD } from '../../config/interactionConfig';

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

// ── Validation ───────────────────────────────────────────────────────

export interface CanInteractResult {
  allowed: boolean;
  reason?: string;
}

export function canInteract(
  pet: Pet,
  mode: HandMode,
  state: InteractionState,
  playerTokens: number,
): CanInteractResult {
  if (mode === 'idle') return { allowed: false, reason: 'No tool selected' };

  const def = INTERACTION_DEFS[mode];

  // Pet state checks
  if (pet.state === 'dead') return { allowed: false, reason: 'Pet has passed away' };
  if (pet.state === 'sleeping' && mode !== 'comfort') {
    return { allowed: false, reason: 'Pet is sleeping' };
  }
  if (pet.state === 'sick' && mode !== 'comfort') {
    return { allowed: false, reason: 'Pet is too sick — try comforting' };
  }

  // Unlock check
  if (!state.unlockedTools.includes(mode)) {
    return { allowed: false, reason: `${def.name} is locked` };
  }

  // Economy check
  if (def.economyCost > 0 && playerTokens < def.economyCost) {
    return { allowed: false, reason: `Need ${def.economyCost} tokens` };
  }

  // Cooldown check
  const lastUsed = state.cooldowns[mode];
  if (lastUsed > 0 && Date.now() - lastUsed < def.cooldownMs) {
    const remaining = Math.ceil((def.cooldownMs - (Date.now() - lastUsed)) / 1000);
    return { allowed: false, reason: `Cooldown: ${remaining}s` };
  }

  // Spam check
  if (state.usageCounts[mode] >= def.spamProtection.maxPerMinute) {
    return { allowed: false, reason: 'Too many uses — slow down!' };
  }

  return { allowed: true };
}

// ── Mood multiplier ──────────────────────────────────────────────────

export function calculateMoodMultiplier(pet: Pet, mode: HandMode): number {
  if (mode === 'idle') return 1;
  const def = INTERACTION_DEFS[mode];
  return def.moodModifiers[pet.mood] ?? 1.0;
}

// ── Streak ───────────────────────────────────────────────────────────

export function getStreakMultiplier(streak: InteractionState['streak']): number {
  let mult = 1.0;
  for (const { threshold, multiplier } of STREAK_BONUSES) {
    if (streak.count >= threshold) mult = multiplier;
  }
  return mult;
}

export function updateStreak(
  state: InteractionState,
  mode: HandMode,
): InteractionState['streak'] {
  const now = Date.now();
  const timeSinceLast = now - state.streak.lastInteractionTime;
  const sameMode = state.streak.lastMode === mode;

  // Streak continues if same mode within 10 seconds
  if (sameMode && timeSinceLast < 10_000) {
    return { count: state.streak.count + 1, lastInteractionTime: now, lastMode: mode };
  }

  // Reset streak
  return { count: 1, lastInteractionTime: now, lastMode: mode };
}

// ── Apply interaction ────────────────────────────────────────────────

export interface InteractionResult {
  pet: Pet;
  interactionState: InteractionState;
  tokenCost: number;
  reactionText: string;
  quality: 'success' | 'neutral' | 'fail';
}

export function applyInteraction(
  pet: Pet,
  mode: HandMode,
  state: InteractionState,
): InteractionResult {
  if (mode === 'idle') {
    return { pet, interactionState: state, tokenCost: 0, reactionText: '', quality: 'neutral' };
  }

  const def = INTERACTION_DEFS[mode];
  const moodMult = calculateMoodMultiplier(pet, mode);
  const streak = updateStreak(state, mode);
  const streakMult = getStreakMultiplier(streak);

  // Check spam diminishing returns
  const isSpammed = state.usageCounts[mode] >= SPAM_DIMINISH_THRESHOLD;
  const spamMult = isSpammed ? 0.5 : 1.0;

  // Tool tier multiplier
  const tierMult = state.equippedToolTiers[mode] > 0
    ? 1.0 + (state.equippedToolTiers[mode] * 0.5) // tier 1 = 1.5x, tier 2 = 2.0x
    : 1.0;

  // Combined multiplier
  const totalMult = moodMult * streakMult * spamMult * tierMult;

  // Determine quality based on mood multiplier
  const quality: InteractionResult['quality'] =
    moodMult >= 1.0 ? 'success' :
    moodMult >= 0.5 ? 'neutral' : 'fail';

  // Apply stat effects
  const fx = def.statEffects;
  const apply = (base: number | undefined) => (base ?? 0) * totalMult;

  const xpGain = Math.round(apply(fx.xp));

  const updatedPet: Pet = {
    ...pet,
    bond: pet.bond + apply(fx.bond),
    needs: {
      hunger: clamp(pet.needs.hunger - (mode === 'play' ? 3 : 0)), // play costs energy
      happiness: clamp(pet.needs.happiness + apply(fx.happiness)),
      cleanliness: clamp(pet.needs.cleanliness + apply(fx.cleanliness)),
      health: pet.needs.health,
    },
    progression: xpGain > 0 ? {
      ...pet.progression,
      xp: pet.progression.xp + xpGain,
    } : pet.progression,
    // New stats — these use nullish coalescing for save compat
    trust: clamp((pet.trust ?? 20) + apply(fx.trust)),
    discipline: clamp((pet.discipline ?? 0) + apply(fx.discipline)),
    groomingScore: clamp((pet.groomingScore ?? 50) + apply(fx.groomingScore)),
    stress: clamp((pet.stress ?? 0) + apply(fx.stress)),
    timestamps: {
      ...pet.timestamps,
      lastInteraction: new Date().toISOString(),
    },
  };

  // Pick reaction text
  const pool = def.textFeedback[quality];
  const reactionText = pool[Math.floor(Math.random() * pool.length)];

  // Update interaction state
  const now = Date.now();
  const updatedState: InteractionState = {
    ...state,
    isInteracting: true,
    currentInteractionStart: now,
    streak,
    cooldowns: { ...state.cooldowns, [mode]: now },
    usageCounts: { ...state.usageCounts, [mode]: state.usageCounts[mode] + 1 },
    lastReactionText: reactionText,
    petResponseAnim: getPetResponseAnim(mode),
  };

  return {
    pet: updatedPet,
    interactionState: updatedState,
    tokenCost: def.economyCost,
    reactionText,
    quality,
  };
}

// ── Pet response animation ───────────────────────────────────────────

const MODE_TO_PET_ANIM: Record<Exclude<HandMode, 'idle'>, string> = {
  pet: 'being_petted',
  wash: 'being_washed',
  brush: 'being_brushed',
  comfort: 'being_comforted',
  train: 'being_trained',
  play: 'playing_with_hand',
};

export function getPetResponseAnim(mode: HandMode): string | null {
  if (mode === 'idle') return null;
  return MODE_TO_PET_ANIM[mode];
}

// ── Reaction text (standalone, for when you just need text) ──────────

export function getReactionText(
  mode: HandMode,
  quality: 'success' | 'neutral' | 'fail',
): string {
  if (mode === 'idle') return '';
  const pool = INTERACTION_DEFS[mode].textFeedback[quality];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── End interaction ──────────────────────────────────────────────────

export function endInteraction(state: InteractionState): InteractionState {
  return {
    ...state,
    isInteracting: false,
    careGameActive: false,
    currentInteractionStart: null,
    petResponseAnim: null,
  };
}

// ── Reset daily usage counts ─────────────────────────────────────────

export function resetDailyUsage(state: InteractionState): InteractionState {
  const zeroed = Object.fromEntries(
    Object.keys(state.usageCounts).map(k => [k, 0]),
  ) as Record<HandMode, number>;
  return { ...state, usageCounts: zeroed };
}

// ── Cooldown helper ──────────────────────────────────────────────────

export function getCooldownRemaining(state: InteractionState, mode: HandMode): number {
  if (mode === 'idle') return 0;
  const def = INTERACTION_DEFS[mode];
  const lastUsed = state.cooldowns[mode];
  if (lastUsed === 0) return 0;
  const elapsed = Date.now() - lastUsed;
  return Math.max(0, def.cooldownMs - elapsed);
}
