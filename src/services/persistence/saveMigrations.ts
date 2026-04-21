import type { EngineState } from '../../types/engine';
import type { SaveData } from './saveValidation';

// Each migration takes the raw state from the previous version and returns the next shape.
// Use `any` here intentionally — migrations deal with unknown historical shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Migration = (state: any) => any;

const migrations: Record<number, Migration> = {
  // v0 → v1: add inventory, room, events, achievements, notifications
  0: (state) => ({
    ...state,
    inventory: state.inventory ?? { items: [], maxSlots: 20 },
    room: state.room ?? { backgroundId: 'default', items: [], moodBonus: 0 },
    events: state.events ?? [],
    achievements: state.achievements ?? [],
    notifications: state.notifications ?? [],
  }),
  // v1 → v2: add classroom PvP, battle tickets, match history, trophies
  1: (state) => ({
    ...state,
    classroom: state.classroom ?? {
      classroom: null,
      classmates: [],
      selectedOpponentId: null,
      lastRosterRefresh: '',
    },
    battleTickets: state.battleTickets ?? {
      tickets: [],
      maxTickets: 5,
      todayEarned: 0,
      todayUsed: 0,
      mathForNextTicket: 0,
      careActionsToday: { fed: false, cleaned: false, played: false },
    },
    matchHistory: state.matchHistory ?? [],
    matchupTrackers: state.matchupTrackers ?? [],
    trophyCase: state.trophyCase ?? {
      trophies: [],
      displayedInRoom: [],
      maxDisplay: 5,
    },
    dailyGoals: state.dailyGoals ?? { date: '', mathSolved: 0, battlesWon: 0, rewardClaimed: false },
  }),
  // v2 → v3: add house room navigation
  2: (state) => ({
    ...state,
    currentRoom: state.currentRoom ?? 'home',
  }),
  // v3 → v4: consolidate 4 rooms into 2 (outside + inside)
  3: (state) => ({
    ...state,
    currentRoom: state.currentRoom === 'outside' ? 'outside' : 'inside',
  }),
  // v4 → v5: add mailbox state
  4: (state) => ({
    ...state,
    mailbox: state.mailbox ?? { lastClaimedDate: '', totalClaimed: 0 },
  }),
  // v5 → v6: add momentum board state
  5: (state) => ({
    ...state,
    momentum: state.momentum ?? { active: false },
  }),
  // v6 → v7: add roguelike run state
  6: (state) => ({
    ...state,
    run: state.run ?? { active: false },
  }),
  // v7 → v8: add MP (Math Points) to currencies
  7: (state) => ({
    ...state,
    player: {
      ...state.player,
      currencies: {
        ...state.player?.currencies,
        mp: state.player?.currencies?.mp ?? 0,
        mpLifetime: state.player?.currencies?.mpLifetime ?? 0,
      },
    },
  }),
  // v8 → v9: extend run state with V2 fields (map, instability, fracture modifiers, etc.)
  8: (state) => ({
    ...state,
    run: state.run?.active
      ? {
          ...state.run,
          map: state.run.map ?? { nodes: [], currentPath: [] },
          currentNodeId: state.run.currentNodeId ?? null,
          seed: state.run.seed ?? Date.now(),
          instability: state.run.instability ?? 0,
          fractureModifier: state.run.fractureModifier ?? 'volatile',
          mpEarnedThisRun: state.run.mpEarnedThisRun ?? 0,
          bossState: state.run.bossState ?? {},
          bonuses: {
            ...state.run.bonuses,
            energyRegenBonus: state.run.bonuses?.energyRegenBonus ?? 0,
            traceRadiusBonus: state.run.bonuses?.traceRadiusBonus ?? 1.0,
            comboGrowthBonus: state.run.bonuses?.comboGrowthBonus ?? 1.0,
            regenPerTurn: state.run.bonuses?.regenPerTurn ?? 0,
            thornsFraction: state.run.bonuses?.thornsFraction ?? 0,
            glassCannon: state.run.bonuses?.glassCannon ?? false,
            echoStrikeCounter: state.run.bonuses?.echoStrikeCounter ?? 0,
            desperatePower: state.run.bonuses?.desperatePower ?? false,
            overchargeActive: state.run.bonuses?.overchargeActive ?? false,
            focusMastery: state.run.bonuses?.focusMastery ?? false,
            adaptiveShieldUsed: state.run.bonuses?.adaptiveShieldUsed ?? false,
            fractureDrain: state.run.bonuses?.fractureDrain ?? false,
            nextFightDefenseBuff: state.run.bonuses?.nextFightDefenseBuff ?? 0,
            nextFightEnergyBonus: state.run.bonuses?.nextFightEnergyBonus ?? 0,
          },
        }
      : state.run ?? { active: false },
  }),
  // v9 → v10: add pet interaction system state
  9: (state) => ({
    ...state,
    interaction: state.interaction ?? {
      activeMode: 'idle',
      isInteracting: false,
      currentInteractionStart: null,
      streak: { count: 0, lastInteractionTime: 0, lastMode: 'idle' },
      cooldowns: { idle: 0, pet: 0, wash: 0, brush: 0, comfort: 0, train: 0, play: 0 },
      usageCounts: { idle: 0, pet: 0, wash: 0, brush: 0, comfort: 0, train: 0, play: 0 },
      unlockedTools: ['pet', 'comfort', 'play'],
      equippedToolTiers: { idle: 0, pet: 0, wash: 0, brush: 0, comfort: 0, train: 0, play: 0 },
      lastReactionText: null,
      petResponseAnim: null,
    },
  }),
  // v10 → v11: add quests, season pass, cosmetics, dex, campaign, events
  // + new currencies (seasonPoints, shards)
  10: (state) => ({
    ...state,
    player: {
      ...state.player,
      currencies: {
        ...state.player.currencies,
        seasonPoints: state.player?.currencies?.seasonPoints ?? 0,
        shards: state.player?.currencies?.shards ?? 0,
      },
    },
    quests: state.quests ?? {
      lastDailyRollDate: '',
      lastWeeklyRollWeek: '',
      daily: [],
      weekly: [],
    },
    season: state.season ?? {
      activeSeasonId: 'season_1_cozy',
      points: 0,
      claimedTiers: [],
      titles: [],
    },
    cosmetics: state.cosmetics ?? {
      owned: [],
      equipped: {},
      gachaPullsSinceRare: 0,
      gachaPullsSinceEpic: 0,
    },
    dex: state.dex ?? { species: [], classmateIds: [] },
    campaign: state.campaign ?? { activeChapterId: null, completedChapters: [] },
    seasonalEvents: state.seasonalEvents ?? { participated: [], progress: [] },
  }),
  // v11 → v12: add mathBuffs + lifetimeMathCorrect (math-to-battle prep loop)
  11: (state) => ({
    ...state,
    player: {
      ...state.player,
      mathBuffs: state.player?.mathBuffs ?? { atk: 0, def: 0, hp: 0 },
      lifetimeMathCorrect: state.player?.lifetimeMathCorrect ?? 0,
    },
  }),
  // v12 → v13: add hasOnboarded (first-run tutorial flag). Existing saves
  // already played, so default true to skip onboarding.
  12: (state) => ({
    ...state,
    player: {
      ...state.player,
      hasOnboarded: state.player?.hasOnboarded ?? true,
    },
  }),
};

export const CURRENT_SAVE_VERSION = 13;

export const migrate = (data: SaveData): EngineState => {
  let { state, version } = data;
  while (version < CURRENT_SAVE_VERSION) {
    const migration = migrations[version];
    if (migration) state = migration(state);
    version++;
  }
  return state as EngineState;
};
