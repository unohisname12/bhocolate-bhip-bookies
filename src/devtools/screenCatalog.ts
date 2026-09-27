import type { ScreenName } from '../types/session';
import type { EngineState } from '../types/engine';
import { createTestEngineState } from '../engine/state/createTestEngineState';
import { engineReducer } from '../engine/state/engineReducer';
import { startRun, selectMapNode } from '../engine/systems/RunSystem';
import { GROWING_PETS, DAY_MS, type GrowingPetId } from '../config/companionConfig';
import { careDate } from '../services/game/petGrowth';
import type { PetStage } from '../types/pet';
import { createEggDiscovery } from '../services/game/eggDiscovery';
import { ADVENTURE_STYLES, STYLE_KEYS } from '../config/discoveryConfig';
import { FURNITURE, HOME_ROOMS } from '../features/home-base/catalog';
import { createHomeBase, emptyRoom } from '../features/home-base/model';
import { prizeProgress } from '../features/clash/rewards';

/** Record enforces that every ScreenName has a developer entry. */
export const SCREEN_CATALOG = {
  math_stack: ['Math Stack', 'Games'],
  pet_arena: ['Pet Battle RPG', 'games'],
  arcade: ['Woodland Arcade', 'Games'],
  first_adventure: ['First Adventure goals', 'Adventure'],
  home_builder: ['Home Base building', 'Home'],
  woodland: ['Woodland bridge adventure', 'Adventure'],
  discovery: ['Discovery week & quiz', 'Home'],
  growth: ['Nursery & evolution', 'Home'],
  incubation: ['Egg & hatching', 'Home'], home: ['Pet home', 'Home'], feeding: ['Feeding', 'Home'], pet_care: ['Care activities', 'Home'], shop: ['Shop', 'Home'],
  play: ['Play menu', 'Games'], math: ['Math Practice', 'Games'], catch_math: ['Catch Math', 'Games'], momentum: ['Momentum', 'Games'], number_merge: ['Number Merge', 'Games'], battle: ['Battle & tracing', 'Games'],
  run_start: ['Adventure start', 'Adventure'], run_map: ['Adventure map', 'Adventure'], run_encounter: ['Encounter preview', 'Adventure'], run_reward: ['Reward selection', 'Adventure'], run_rest: ['Rest stop', 'Adventure'], run_event: ['Story event', 'Adventure'], run_over: ['Adventure victory', 'Adventure'],
  class_roster: ['Class roster', 'Collection'], challenger_preview: ['Challenger preview', 'Collection'], match_result: ['Match results', 'Collection'], quest_log: ['Quest journal', 'Collection'], season_pass: ['Season rewards', 'Collection'], gacha: ['Cosmetic eggs', 'Collection'], power_forge: ['Power Forge', 'Collection'], coming_soon: ['Roadmap', 'Collection'],
  test: ['Animation playground', 'Art & tools'], asset_review: ['Asset review', 'Art & tools'], animation_review: ['Animation review', 'Art & tools'], warm_preview: ['Warm home concept', 'Art & tools'],
} satisfies Record<ScreenName, readonly [string, string]>;

/** Build valid dependencies, not just a route string that falls back to Home. */
export function createScreenPreview(screen: ScreenName, learning: EngineState['learning'], options?: { species: GrowingPetId; stage: PetStage; ready: boolean }): EngineState {
  let state = createTestEngineState();
  state = { ...state, mode: 'normal', test: { active: false, label: 'Preview' }, learning, devPreview: true, screen, egg: null, eggDiscovery: null, notifications: [], showDailyRitual: false, showOnboarding: false,
    player: { ...state.player, currencies: { tokens: 10000, coins: 1000, mp: 10000, mpLifetime: 10000, seasonPoints: 1000, shards: 500 }, lifetimeMathCorrect: 100 },
    pet: state.pet && { ...state.pet, name: 'Pip', bond: 80, state: 'idle', needs: { hunger: 90, happiness: 95, health: 100, cleanliness: 85 }, progression: { ...state.pet.progression, level: 20 } },
    interaction: { ...state.interaction, unlockedTools: ['pet', 'wash', 'brush', 'comfort', 'train', 'play'] },
    battleTickets: { ...state.battleTickets, tickets: Array.from({ length: 5 }, (_, i) => ({ id: `preview-ticket-${i}`, earnedAt: Date.now(), source: 'login_streak' as const })) },
  };
  if (options || screen === 'growth') {
    const species = options?.species ?? 'koala_sprite', stage = options?.stage ?? 'baby', ready = options?.ready ?? true;
    const info = GROWING_PETS[species], now = Date.now(), count = stage === 'baby' ? 7 : 14;
    if (state.pet) state = { ...state, pet: { ...state.pet, speciesId: species, type: species, name: info.name, stage, stats: { ...info.stats },
      timestamps: { ...state.pet.timestamps, createdAt: new Date(now - (ready ? 15 : 0) * DAY_MS).toISOString() },
      growth: { startedAt: now - (ready ? 15 : 0) * DAY_MS, stageStartedAt: now - (ready ? 8 : 0) * DAY_MS,
        careDays: ready ? Array.from({ length: count }, (_, i) => ({ day: careDate(now - (count - i) * DAY_MS), tasks: ['feed', 'clean', 'play'] })) : [] } } };
  }
  state = engineReducer(state, { type: 'CHECK_DAILY_GOALS' });
  state = { ...state,
    player: { ...state.player, unlockedRoomItems: [...new Set([...state.player.unlockedRoomItems, ...FURNITURE.filter(f => f.prize).map(f => f.id)])] },
    prizes: { ...prizeProgress(state), medals: 1000, boosts: { attack: 20, defense: 20 } },
  };
  const home = createHomeBase(state);
  state.homeBase = { ...home, owned: FURNITURE.filter(f => !f.prize && f.cost > 0).map(f => f.id),
    rooms: Object.fromEntries(HOME_ROOMS.map(r => [r.id, home.rooms[r.id] ?? emptyRoom()])) };
  if (screen === 'discovery') {
    const discovery = createEggDiscovery(), style = STYLE_KEYS.find(s => ADVENTURE_STYLES[s].companion === options?.species) ?? 'help';
    state = { ...state, pet: null, eggDiscovery: options?.ready ? { ...discovery, startedAt: Date.now() - 5 * DAY_MS,
      answers: [0, 0, 0, 0].map(() => STYLE_KEYS.indexOf(style)), stamps: Array.from({ length: 5 }, (_, i) => ({ day: careDate(Date.now() - (5 - i) * DAY_MS), style, source: 'mission' as const })) } : discovery };
  }
  if (screen === 'incubation') state = { ...state, pet: null, egg: { id: 'preview-egg', type: options ? GROWING_PETS[options.species].egg : 'koala', state: 'incubating', progress: 70, createdAt: new Date().toISOString() } };
  if (screen === 'test') state = { ...state, mode: 'test' };
  if (screen === 'momentum') state = engineReducer(state, { type: 'START_MOMENTUM', difficulty: 'easy' });
  if (screen === 'battle') {
    state = engineReducer(state, { type: 'START_BATTLE' });
    state = engineReducer(state, { type: 'RESOLVE_WARMUP', correct: true });
  }
  if (['class_roster', 'challenger_preview', 'match_result'].includes(screen)) {
    state = engineReducer(state, { type: 'GENERATE_CLASSROOM' });
    const opponent = state.classroom.classmates[0];
    if (opponent) state = { ...state, classroom: { ...state.classroom, selectedOpponentId: opponent.id }, matchHistory: [{ id: 'preview-match', date: new Date().toISOString(), playerPetId: state.pet!.id, opponentId: opponent.id, opponentPetName: 'Practice rival', outcome: 'win', turnsPlayed: 6, tokensTransferred: 30, xpEarned: 50, mathBonusUsed: true }] };
  }
  if (screen.startsWith('run_') && screen !== 'run_start') {
    state = startRun(state);
    if (state.run.active) {
      const first = state.run.map.nodes.find(node => node.tier === 0 && node.type === 'combat');
      if (first && ['run_encounter', 'run_reward'].includes(screen)) state = selectMapNode(state, first.id);
      if (state.run.active) {
        const run = state.run;
        if (screen === 'run_reward') state = { ...state, run: { ...run, phase: 'reward_pick', encountersWon: 1 } };
        if (screen === 'run_rest') state = { ...state, run: { ...run, phase: 'rest_node', playerHPPercent: 0.6 } };
        if (screen === 'run_event') state = { ...state, run: { ...run, phase: 'event_choice', currentNodeId: 'preview-event', map: { ...run.map, nodes: [...run.map.nodes, { id: 'preview-event', tier: 1, type: 'event', eventId: 'equation_cache', rewardTier: 'common', connections: [], visited: true }] } } };
        if (screen === 'run_over') state = { ...state, run: { ...run, phase: 'run_victory', encountersWon: 4 } };
      }
    }
  }
  return { ...state, screen, devPreview: true, showDailyRitual: false, notifications: [] };
}
