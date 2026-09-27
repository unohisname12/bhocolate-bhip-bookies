import type { EngineState } from '../src/types/engine';
import { discoveryDays, matchCompanion, validEggDiscovery } from '../src/services/game/eggDiscovery';
import { DISCOVERY_DAYS } from '../src/config/discoveryConfig';
import { careDate } from '../src/services/game/petGrowth';
import { ApiError } from './security';
import { companionForEgg } from '../src/config/companionConfig';

export function checkDiscoveryCheckpoint(previous: EngineState, next: EngineState, now = Date.now()) {
  const before = previous.eggDiscovery, after = next.eggDiscovery;
  const oldPasses=previous.prizes?.earlyHatchPasses??0,newPasses=next.prizes?.earlyHatchPasses??0;
  if(!Number.isSafeInteger(newPasses)||newPasses<0||newPasses>oldPasses)throw new ApiError(403,'Only your teacher can grant early-hatch passes.');
  const bonusAdded=(after?.bonusDays??0)-(before?.bonusDays??0);
  if(after?.startedAt===before?.startedAt && bonusAdded!==0 && !(before?.status==='collecting'&&bonusAdded===1&&oldPasses>0&&newPasses===oldPasses-1))throw new ApiError(403,'Use a teacher-granted pass for an early activity day.');
  if(after?.startedAt!==before?.startedAt && after?.bonusDays)throw new ApiError(403,'Start a new egg without bonus days.');
  const oldPetIds = new Set([previous.pet, ...(previous.companionRoster ?? [])].filter(p => !!p).map(p => p!.id));
  const newPets = [next.pet, ...(next.companionRoster ?? [])].filter(p => p && !oldPetIds.has(p.id));
  if (after && (!validEggDiscovery(after) || after.startedAt > now || after.stamps.some(s => s.day > careDate(now)))) {
    throw new ApiError(422, 'Egg activity days must be real completed days.');
  }
  // Legacy pets stay usable; a new discovery journey still starts without stamps.
  const newJourney = !before || (before.status === 'claimed' && after?.startedAt !== before.startedAt);
  if (newJourney) {
    if (after && (after.status !== 'collecting' || after.stamps.some(s => s.day !== careDate(now)))) throw new ApiError(422, 'Start a new egg journey with today’s activity.');
    if (before && ((!previous.egg && next.egg) || newPets.length)) throw new ApiError(409, 'Complete the next egg journey before adding another companion.', 'conflict');
    return;
  }
  if (!after || after.startedAt !== before.startedAt || after.tieBreak !== before.tieBreak || after.matchingVersion !== before.matchingVersion || JSON.stringify(after.candidates) !== JSON.stringify(before.candidates)
    || before.stamps.some(stamp => !after.stamps.some(s => s.day === stamp.day && s.style === stamp.style && s.source === stamp.source))
    || after.stamps.some(stamp => !before.stamps.some(s => s.day === stamp.day) && stamp.day !== careDate(now))) {
    throw new ApiError(409, 'Keep your saved egg journey. Only today’s activity can add a new day.', 'conflict');
  }
  if (before.status !== 'collecting' && (after.companion !== before.companion || JSON.stringify(after.answers) !== JSON.stringify(before.answers))) throw new ApiError(409, 'Your revealed companion match is already saved.', 'conflict');
  if (after.status !== 'collecting' || (!previous.egg && next.egg) || newPets.length) {
    if (discoveryDays(after, now) < DISCOVERY_DAYS || after.companion !== matchCompanion(after)) {
      throw new ApiError(409, 'Your egg needs five separate activity days before it can hatch.', 'conflict');
    }
    if ((!previous.egg && next.egg && companionForEgg(next.egg.type) !== after.companion) || newPets.some(p => p!.speciesId !== after.companion)) throw new ApiError(409, 'Hatch the companion matched by your saved egg activities.', 'conflict');
  }
}
