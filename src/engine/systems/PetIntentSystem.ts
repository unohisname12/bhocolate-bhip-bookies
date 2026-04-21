import type { Pet } from '../../types';
import type { AnimationName } from '../animation/types';

/**
 * Pet intents represent what the pet is *doing* right now.
 * Unlike PetState (which is a mood snapshot), intents are action-oriented
 * and drive which animation plays.
 */
export type PetIntent =
  | 'idle'
  | 'sleep'
  | 'eat'
  | 'happy'
  | 'sick'
  | 'dead'
  | 'dirty'
  // Battle intents (set externally when in combat)
  | 'attack'
  | 'defend'
  | 'heal'
  | 'hurt'
  // Future-proof
  | 'play'
  | 'clean'
  // Interaction intents (set by interaction system during touch)
  | 'being_petted'
  | 'being_washed'
  | 'being_brushed'
  | 'being_comforted'
  | 'being_trained'
  | 'playing_with_hand';

/**
 * Maps a PetIntent to the animation key used in sprite sheet configs.
 * This is the single source of truth for intent → visual mapping.
 *
 * When an animation name doesn't exist in a species' sprite config,
 * the fallback system shows a black "MISSING SPRITE" box — this is
 * intentional so artists know what assets to create.
 */
const INTENT_TO_ANIMATION: Record<PetIntent, AnimationName> = {
  idle:    'idle',
  sleep:   'sleeping',
  eat:     'hungry',
  happy:   'happy',
  sick:    'sick',
  dead:    'dead',
  dirty:   'sick',       // no dedicated dirty sprite yet — uses sick as visual placeholder
  attack:  'idle',        // combat sprites handled separately by BattlePetSprite
  defend:  'idle',
  heal:    'idle',
  hurt:    'idle',
  play:    'happy',
  clean:   'idle',
  // Interaction intents — each has a dedicated care sprite sheet per species
  being_petted:       'being_petted',
  being_washed:       'being_washed',
  being_brushed:      'being_brushed',
  being_comforted:    'being_comforted',
  being_trained:      'being_trained',
  playing_with_hand:  'playing_with_hand',
};

/**
 * Derives what the pet is doing based on its current state and needs.
 *
 * Priority (highest first) — designed to feel like a real pet game:
 *   1. Dead      — health gone, overrides everything
 *   2. Sick      — urgent health crisis
 *   3. Sleeping  — pet is asleep, nothing else matters
 *   4. Hungry    — low hunger, pet is begging/sad
 *   5. Dirty     — low cleanliness, pet looks unclean
 *   6. Happy     — needs are satisfied (no urgent problems)
 *   7. Idle      — default, no strong signal either way
 *
 * Battle intents (attack, heal, etc.) are NOT derived here — they're
 * set by the battle system and passed directly to BattlePetSprite.
 */
export function getPetIntent(pet: Pet): PetIntent {
  const { hunger, happiness, health, cleanliness } = pet.needs;

  // ── Critical overrides ──────────────────────────────────
  if (pet.state === 'dead' || health <= 0) return 'dead';
  if (pet.state === 'sick' || health <= 25) return 'sick';

  // ── Sleep overrides everything below ────────────────────
  if (pet.state === 'sleeping') return 'sleep';

  // ── Urgent needs ────────────────────────────────────────
  if (hunger <= 25) return 'eat';
  if (cleanliness <= 25) return 'dirty';

  // ── Positive states ─────────────────────────────────────
  // Happy only when no urgent needs are active
  if (happiness >= 75 && hunger > 50 && cleanliness > 50 && health > 50) return 'happy';

  return 'idle';
}

/**
 * Resolves a PetIntent to the animation name used by SpriteSheetConfig.
 */
export function resolveIntentAnimation(intent: PetIntent): AnimationName {
  return INTENT_TO_ANIMATION[intent];
}
