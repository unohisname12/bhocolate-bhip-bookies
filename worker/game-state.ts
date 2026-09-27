import {validArena} from '../src/features/pet-arena/model';
import { consolidateWallet } from '../src/services/game/wallet';
import { validEconomy } from '../src/services/game/economy';
import { validEvidenceRows } from '../src/features/teacher-insights/model';
import { validReviews } from '../src/features/learning/review';
import { validArcade } from '../src/features/arcade/model';
import { validMind } from '../src/features/pet-mind/memory';
import { checkDiscoveryCheckpoint } from './discovery-checkpoint';
import { validHomeBase } from '../src/features/home-base/model';
import validateEngine from './generated/validate-engine.js';
import type { EngineState } from '../src/types/engine';
import { createInitialEngineState } from '../src/engine/state/createInitialEngineState';
import { COMPANIONS, isCompanion, companionForEgg } from '../src/config/companionConfig';
import { normalizeLearning } from '../src/services/game/curriculum';
import { ApiError } from './security';
import { earnedTitles, resolvePetName } from '../src/features/pet-identity/model';
import { CURRENT_SAVE_VERSION, migrate } from '../src/services/persistence/saveMigrations';

const blockedScreens = new Set(['test', 'test_mode', 'asset_review', 'animation_review', 'coming_soon', 'class_roster', 'classmate_detail', 'challenger_preview']);
export function validateGame(value: unknown): EngineState {
  if (!validateEngine(value)) throw new ApiError(422, 'The save did not pass validation. Your last good server save is unchanged.', 'invalid_save');
  if (!validArena(value.petArena)) throw new ApiError(422, 'Battle progress did not pass validation.');
  if (!validEconomy(value.economy)) throw new ApiError(422, 'Reward progress did not pass validation.');
  if ([value.pet, ...(value.companionRoster ?? [])].some(p => p?.mind !== undefined && !validMind(p.mind))) throw new ApiError(422, 'Pet memories did not pass validation.');
  if (value.arcade !== undefined && !validArcade(value.arcade)) throw new ApiError(422, 'Arcade progress did not pass validation. Your last good save is safe.');
  if(value.learningEvidence && !validEvidenceRows(value.learningEvidence)) throw new ApiError(422,'Practice records did not pass validation. Your saved progress is unchanged.');
  if (value.skillReviews !== undefined && !validReviews(value.skillReviews)) throw new ApiError(422, 'Skill review history did not pass validation.');
  if (value.homeBase !== undefined && !validHomeBase(value.homeBase)) throw new ApiError(422, 'The home layout did not pass validation. Your last saved home is safe.');
  if (value.mode !== 'normal' || value.devPreview || value.test.active || blockedScreens.has(value.screen)) throw new ApiError(403, 'Preview and teacher data cannot be submitted as student progress.');
  if ((value.companionRoster?.length ?? 0) > Object.keys(COMPANIONS).length || value.events.length > 1000 || (value.learningEvidence?.length ?? 0) > 200) throw new ApiError(422, 'The save exceeds the pilot limits.');
  return value;
}
export function freshGame(id: string, alias: string): EngineState {
  const state = createInitialEngineState();
  state.learnerProfileId = id;
  state.player.id = id; state.player.displayName = alias;
  return state;
}
/** `approved` maps pet id → teacher-approved typed name; a save's own name text is never trusted. */
export function privateGame(state: EngineState, id: string, alias: string, approved: Record<string, string> = {}): EngineState {
  const earned = earnedTitles(state.player.lifetimeMathCorrect, state.skillReviews);
  const pet = (p: NonNullable<EngineState['pet']>) => {
    const identity = p.identity?.title && !earned.includes(p.identity.title) ? (({ title: _unearned, ...rest }) => rest)(p.identity) : p.identity;
    return { ...p, ownerId: id, ...(identity ? { identity } : {}), name: resolvePetName(identity, isCompanion(p.speciesId) ? COMPANIONS[p.speciesId].name : 'Companion', approved[p.id]) };
  };
  return { ...state, learnerProfileId: id, player: { ...state.player, id, displayName: alias },
    pet: state.pet ? pet(state.pet) : null, companionRoster: (state.companionRoster ?? []).map(pet),
    classroom: { classroom: null, classmates: [], selectedOpponentId: null, lastRosterRefresh: '' },
    devPreview: false, mode: 'normal', test: { active: false, label: 'Student' } };
}
/** Saves are validated checkpoints, not an anti-cheat/assessment engine. */
export function studentCheckpoint(value: unknown, previous: EngineState, id: string, alias: string, names: Record<string, string> = {}): EngineState {
  const next = validateGame(value);
  if(JSON.stringify(next.petArena??null)!==JSON.stringify(previous.petArena??null)||JSON.stringify(next.prizes?.arenaWinClaims??[])!==JSON.stringify(previous.prizes?.arenaWinClaims??[]))throw new ApiError(409,'Battle progress must be saved through the battle service. Reload your pet.','conflict');
  if (previous.economy && next.economy?.version !== previous.economy.version) throw new ApiError(409, 'Reward rules changed. Reload your saved pet.', 'conflict');
  if (previous.economy && Object.entries(previous.economy.receipts).some(([id, paid]) => (next.economy?.receipts[id] ?? 0) < paid)) throw new ApiError(409, 'Keep your saved reward history. Reload your pet.', 'conflict');
  checkDiscoveryCheckpoint(previous, next);
  if (JSON.stringify(next.prizes?.teacherClaims??[])!==JSON.stringify(previous.prizes?.teacherClaims??[]))throw new ApiError(409,'Teacher prizes changed. Reload your saved pet.','conflict');
  if (next.player.id !== id || next.learnerProfileId !== id) throw new ApiError(403, 'That save belongs to another learner.');
  if (JSON.stringify(normalizeLearning(next.learning)) !== JSON.stringify(normalizeLearning(previous.learning))) throw new ApiError(409, 'Teacher settings changed. Reload the server save.', 'conflict');
  if (previous.eggDiscovery && previous.eggDiscovery.status !== 'claimed' && next.eggDiscovery?.teacherChoice !== previous.eggDiscovery.teacherChoice) throw new ApiError(403, 'Only the teacher can assign a companion.');
  const oldPets = [...(previous.companionRoster ?? []), ...(previous.pet ? [previous.pet] : [])];
  const newPets = [...(next.companionRoster ?? []), ...(next.pet ? [next.pet] : [])];
  if (new Set(newPets.map(p => p.id)).size !== newPets.length || oldPets.some(p => !newPets.some(q => q.id === p.id && q.speciesId === p.speciesId))) throw new ApiError(409, 'This save would lose an existing companion. Ask your teacher to recover it.', 'conflict');
  if (previous.egg && !(next.egg?.id === previous.egg.id && next.egg.type === previous.egg.type && next.egg.progress >= previous.egg.progress)
    && !newPets.some(p => !oldPets.some(old => old.id === p.id) && p.speciesId === companionForEgg(previous.egg!.type))) throw new ApiError(409, 'This save would lose or change the assigned egg. The server copy is safe.', 'conflict');
  if (next.player.lifetimeMathCorrect < previous.player.lifetimeMathCorrect) throw new ApiError(409, 'This appears to be older progress. Reload the server save.', 'conflict');
  if (JSON.stringify(next.prizes?.classClaims ?? []) !== JSON.stringify(previous.prizes?.classClaims ?? [])) throw new ApiError(409, 'Class prizes changed. Reload your saved pet.', 'conflict');
  return privateGame(consolidateWallet(next), id, alias, names);
}
export const packGame = (state: EngineState) => JSON.stringify({ version: CURRENT_SAVE_VERSION, state });
export function parseStored(raw: string): EngineState {
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === 'object' && 'version' in data && 'state' in data) {
      if (!Number.isInteger(data.version) || data.version < 16 || data.version > CURRENT_SAVE_VERSION) throw new Error('Unsupported save version');
      return validateGame(migrate({ version: data.version, timestamp: 0, checksum: '', state: data.state }));
    }
    // Initial local pilot checkpoints used the unwrapped v16 engine shape.
    return validateGame(migrate({ version: 16, timestamp: 0, checksum: '', state: data }));
  }
  catch { throw new ApiError(503, 'The server save needs recovery. Nothing has been reset. Ask your teacher for help.', 'recovery_required'); }
}
