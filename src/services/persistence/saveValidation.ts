import {validArena} from '../../features/pet-arena/model';
import { validEconomy } from '../game/economy';
import { validReviews } from '../../features/learning/review';
import { validArcade } from '../../features/arcade/model';
import { validFirstAdventure } from '../../features/first-adventure/model';
import { validMind } from '../../features/pet-mind/memory';
import { validHomeBase } from '../../features/home-base/model';
import type { EngineState } from '../../types/engine';
import { validWoodland, validEvidence } from '../game/validWoodland';
import { validEggDiscovery } from '../game/eggDiscovery';

export interface SaveData {
  version: number;
  timestamp: number;
  checksum: string;
  state: EngineState;
}

const stableStringify = (obj: unknown): string => {
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  if (obj !== null && typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((obj as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(obj);
};

export const computeChecksum = (state: EngineState): string => {
  const str = stableStringify(JSON.parse(JSON.stringify(state)));
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
};

export const validateSave = (data: unknown): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Save data is not an object'] };
  }
  const d = data as Record<string, unknown>;
  if (!Number.isInteger(d.version) || (d.version as number) < 0 || (d.version as number) > 18) errors.push('Unsupported save version');
  if (typeof d.timestamp !== 'number' || !Number.isFinite(d.timestamp)) errors.push('Missing timestamp');
  if (!d.state || typeof d.state !== 'object') errors.push('Missing state');
  else {
    const s = d.state as EngineState;
    if ([s.pet, ...(Array.isArray(s.companionRoster) ? s.companionRoster : [])].some(p => p?.mind !== undefined && !validMind(p.mind))) errors.push('Invalid pet memories');
    if (!validArena(s.petArena)) errors.push('Invalid pet battle progress');
    if (!validEconomy(s.economy)) errors.push('Invalid economy progress');
    if (s.arcade !== undefined && !validArcade(s.arcade)) errors.push('Invalid arcade progress');
    if (s.firstAdventure !== undefined && !validFirstAdventure(s.firstAdventure)) errors.push('Invalid first adventure');
    if (s.homeBase !== undefined && !validHomeBase(s.homeBase)) errors.push('Invalid home layout');
    if (s.woodland !== undefined && !validWoodland(s.woodland)) errors.push('Invalid woodland chapter');
    if (s.skillReviews !== undefined && !validReviews(s.skillReviews)) errors.push('Invalid skill reviews');
    if (s.learningEvidence !== undefined && !validEvidence(s.learningEvidence)) errors.push('Invalid learning evidence');
    if (!s.player || typeof s.player.id !== 'string' || !s.player.currencies || !Number.isFinite(s.player.currencies.tokens)) errors.push('Invalid player');
    if (!s.session || !s.animation || typeof s.screen !== 'string') errors.push('Invalid game state');
    if (s.pet && (!s.pet.needs || !s.pet.progression || !s.pet.stats || !s.pet.timestamps || typeof s.pet.type !== 'string')) errors.push('Invalid pet');
    if (s.egg && (!Number.isFinite(s.egg.progress) || typeof s.egg.type !== 'string')) errors.push('Invalid egg');
    if (s.mode === 'test') errors.push('Test fixtures are not player saves');
    if (s.devPreview) errors.push('Developer previews are not player saves');
    if ((d.version as number) >= 16 && s.eggDiscovery != null && !validEggDiscovery(s.eggDiscovery)) errors.push('Invalid egg discovery');
    if ((d.version as number) >= 15) {
      if (!Array.isArray(s.companionRoster)) errors.push('Invalid companion roster');
      else for (const pet of [...s.companionRoster, ...(s.pet ? [s.pet] : [])]) {
        if (!pet || !pet.needs || !pet.progression || !pet.timestamps || typeof pet.speciesId !== 'string') { errors.push('Invalid nursery pet'); continue; }
        const growth = pet.growth;
        if (growth && (!Number.isFinite(growth.startedAt) || !Number.isFinite(growth.stageStartedAt) || !Array.isArray(growth.careDays) || growth.careDays.some(day => !day || typeof day.day !== 'string' || !Array.isArray(day.tasks)))) errors.push('Invalid care history');
      }
      const trial = s.growthTrial;
      if (trial && (typeof trial.petId !== 'string' || !['baby', 'juvenile', 'adult', 'elder'].includes(trial.stage)
        || !['evolution', 'expedition'].includes(trial.kind) || typeof trial.complete !== 'boolean'
        || typeof trial.feedback !== 'string' || !Array.isArray(trial.problems) || trial.problems.length === 0
        || trial.problems.some(p => !p || typeof p.id !== 'string' || typeof p.question !== 'string' || !Number.isFinite(p.answer))
        || !Number.isInteger(trial.index) || trial.index < 0 || trial.index > trial.problems.length
        || (!trial.complete && trial.index === trial.problems.length))) errors.push('Invalid growth trial');
    }
    if ((d.version as number) >= 14) {
      if (d.checksum !== computeChecksum(s)) errors.push('Save checksum mismatch');
      for (const key of ['learning', 'quests', 'season', 'cosmetics', 'dex', 'campaign', 'seasonalEvents', 'interaction', 'help', 'battle', 'momentum', 'run', 'dailyGoals', 'classroom', 'battleTickets', 'trophyCase'] as const) {
        if (!s[key] || typeof s[key] !== 'object') errors.push(`Missing ${key}`);
      }
      for (const key of ['events', 'achievements', 'notifications', 'matchHistory', 'matchupTrackers'] as const) {
        if (!Array.isArray(s[key])) errors.push(`Invalid ${key}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
};
