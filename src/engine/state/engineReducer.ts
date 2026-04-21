import { applyPetDecay, applyPetFeed, applyPetClean, applyPetPlay, applyMoodBoost } from '../systems/PetNeedSystem';
import { evaluatePetMood } from '../systems/MoodSystem';
import { addItem, removeItem } from '../systems/InventorySystem';
import { placeItem, removeRoomItem, changeBackground, calculateRoomMoodBonus } from '../systems/RoomSystem';
import { checkAchievements } from '../systems/AchievementSystem';
import { initBattle, initBattleWithSpecies, initPvPBattle, executePlayerMove, executeEnemyTurn, resolveRound, executeFocus, executeDefendAction, attemptFlee, applyMathBuffsToBattle, applyPowerForgeToBattle } from '../systems/BattleSystem';
import { EMPTY_MATH_BUFFS } from '../../config/mathBuffConfig';
import { BATTLE_CONSTANTS } from '../../config/battleConfig';
import { checkLoginStreak, updateMathStreak, updateMastery } from '../systems/StreakSystem';
import { generateClassroom, refreshNPCClassmates } from '../systems/ClassroomSimulator';
import { canChallenge, calculateTokenStake, updateMatchupTracker } from '../systems/MatchmakingSystem';
import { shouldMintTrophy, createTrophy } from '../systems/TrophySystem';
import { createTestEngineState } from './createTestEngineState';
import { initMomentum, selectPiece, deselectPiece, beginMove, applyFlashChoice, skipTurn, advanceAfterAnimation } from '../systems/MomentumSystem';
import { selectAIAction } from '../systems/MomentumAI';
import { interactWithEgg, hatchEgg, addXP, evolvePet, checkEvolution } from '../../services/game/evolutionEngine';
import { REWARD_CONFIG } from '../../config/rewardConfig';
import { PVP_CONFIG } from '../../config/pvpConfig';
import { EGG_CONFIG, CARE_ACTIONS, HINT_COST } from '../../config/gameConfig';
import { SHOP_ITEMS } from '../../config/shopConfig';
import { MP_EARN } from '../../config/mpConfig';
import { MATH_BUFF_PER_CORRECT, addMathBuffs } from '../../config/mathBuffConfig';
import { startRun, startRunBattle, handleRunVictory, handleRunDefeat, selectRunReward, endRun, selectMapNode, handleRestLight, handleRestStabilize, handleRestFortify, handleEventChoice } from '../systems/RunSystem';
import { applyTurnStartEffects, applyPostPlayerAttack, applyPostEnemyAttack, applyFortifiedReduction, checkPhaseShift } from '../systems/RunPassiveEffects';
import { createCombatFeelState, afterPlayerAttack as cfAfterPlayerAttack, afterEnemyAttack as cfAfterEnemyAttack, onTurnStart as cfOnTurnStart, afterTrace as cfAfterTrace, shouldTriggerCollapse, triggerCollapse, resolveCollapse, applyReflect } from '../systems/CombatFeelSystem';
import type { EngineState } from '../core/EngineTypes';
import type { ActiveBattleState } from '../../types/battle';
import type { GameEngineAction } from '../core/ActionTypes';
import type { BattleTicket } from '../../types/battleTicket';
import type { MatchResult } from '../../types/matchResult';
import { canInteract as canInteractCheck, applyInteraction as applyInteractionFn, endInteraction as endInteractionFn, resetDailyUsage as resetInteractionUsage, getPetResponseAnim as getPetResponseAnimFn } from '../systems/InteractionSystem';
import { createDefaultInteractionState } from '../../types/interaction';
import { getCareToolById } from '../../config/careToolConfig';
import { rollQuestsIfNeeded, progressOnEvent as questProgressOnEvent, progressOnSnapshot as questProgressOnSnapshot, claimQuest } from '../systems/QuestSystem';
import { claimTier as claimSeasonTier } from '../systems/SeasonSystem';
import { gachaPull, gachaCraftWithShards, equipCosmetic, unequipSlot } from '../systems/GachaSystem';
import { POWER_FORGE_UPGRADES, nextForgeCost, computeForgeBonuses } from '../../config/powerForgeConfig';
import { markSeen as dexMarkSeen, markOwned as dexMarkOwned } from '../systems/DexSystem';
import type { GameEventType } from '../../types/events';

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const deepMerge = <T extends Record<string, unknown>>(target: T, patch: Partial<T>): T => {
  const result: Record<string, unknown> = { ...target };
  for (const [key, patchValue] of Object.entries(patch)) {
    const targetValue = result[key];
    if (isObject(targetValue) && isObject(patchValue)) {
      result[key] = deepMerge(targetValue, patchValue);
    } else {
      result[key] = patchValue;
    }
  }
  return result as T;
};

const moodFromState = (state: import('../../types').PetState): import('../../types').PetMood => {
  if (state === 'happy') return 'playful';
  if (state === 'hungry' || state === 'sick' || state === 'dead') return 'anxious';
  if (state === 'sleeping') return 'calm';
  return 'calm';
};

const deductTokens = (state: EngineState, cost: number): EngineState => ({
  ...state,
  player: {
    ...state.player,
    currencies: {
      ...state.player.currencies,
      tokens: Math.max(0, state.player.currencies.tokens - cost),
    },
  },
});

const canAfford = (state: EngineState, cost: number): boolean =>
  state.player.currencies.tokens >= cost;

const logEvent = (state: EngineState, eventType: string, payload?: Record<string, unknown>): EngineState => {
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: eventType as import('../../types').GameEventType,
    playerId: state.player.id,
    petId: state.pet?.id,
    payload: payload ?? {},
    createdAt: new Date().toISOString(),
  };
  const events = [...state.events, event].slice(-500);
  const withEvent = { ...state, events };
  const afterAchievements = checkAchievements(withEvent).state;
  // Quest progress hook: increment any active quest targeting this event,
  // then re-evaluate snapshot quests (bond/level/streak/distinct-*).
  const afterQuestEvent = questProgressOnEvent(afterAchievements, eventType as GameEventType);
  return questProgressOnSnapshot(afterQuestEvent);
};

const todayISO = (): string => new Date().toISOString().slice(0, 10);

// Goals: 3 math problems + 1 battle win per day
const DAILY_MATH_GOAL = 3;
const DAILY_BATTLE_GOAL = 1;
const DAILY_GOAL_REWARD = 50; // tokens

const earnTicket = (state: EngineState, source: BattleTicket['source']): EngineState => {
  const ts = state.battleTickets;
  if (ts.tickets.length >= ts.maxTickets || ts.todayEarned >= PVP_CONFIG.maxTicketsPerDay) return state;
  const ticket: BattleTicket = {
    id: `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    earnedAt: Date.now(),
    source,
  };
  const result: EngineState = {
    ...state,
    battleTickets: {
      ...ts,
      tickets: [...ts.tickets, ticket],
      todayEarned: ts.todayEarned + 1,
    },
    notifications: [
      ...state.notifications,
      { id: `ticket_${Date.now()}`, message: `Battle ticket earned! (${source})`, icon: '/assets/generated/final/icon_ticket.png', timestamp: Date.now() },
    ],
  };
  return logEvent(result, 'ticket_earned', { source });
};

// Pet is "battle ready" if core needs are above 40
const isPetBattleReady = (pet: import('../../types').Pet): boolean =>
  pet.needs.hunger >= 40 && pet.needs.happiness >= 40 && pet.needs.health >= 40;

export const engineReducer = (state: EngineState, action: GameEngineAction): EngineState => {
  switch (action.type) {
    case 'START_ENGINE':
      return { ...state, initialized: true };
    case 'STOP_ENGINE':
      return { ...state, initialized: false };
    case 'PAUSE_ENGINE':
      return { ...state, initialized: false };
    case 'RESUME_ENGINE':
      return { ...state, initialized: true };
    case 'TICK': {
      const elapsedMs = state.elapsedMs + action.deltaMs;
      let pet = state.pet ? applyPetDecay(state.pet, action.deltaMs) : state.pet;
      if (pet) {
        pet = evaluatePetMood(pet);
        // Passive XP: 1 XP per minute alive
        const passiveXP = action.deltaMs / 60000;
        if (passiveXP >= 1) {
          pet = addXP(pet, Math.floor(passiveXP));
        }
      }
      return {
        ...state,
        elapsedMs,
        engineTime: state.engineTime + action.deltaMs,
        tickCount: state.tickCount + 1,
        lastUpdate: Date.now(),
        pet,
      };
    }
    case 'ENTER_TEST_MODE':
      return createTestEngineState();
    case 'EXIT_TEST_MODE':
      return {
        ...state,
        mode: 'normal',
        test: { active: false, label: 'Normal Mode' },
      };
    case 'RESET_TEST_STATE':
      return createTestEngineState();
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };
    case 'SET_PET_STATE':
      return { ...state, pet: action.pet };
    case 'SET_PET_ANIM':
      return { ...state, animation: { ...state.animation, animationName: action.animationName, frameIndex: 0, elapsedMs: 0, isFinished: false } };
    case 'NEXT_FRAME':
      return {
        ...state,
        animation: {
          ...state.animation,
          frameIndex: (state.animation.frameIndex + 1) % state.animation.frameCount,
          elapsedMs: 0,
        },
      };
    case 'TOGGLE_AUTOPLAY':
      return { ...state, animation: { ...state.animation, autoplay: !state.animation.autoplay } };
    case 'SET_EGG':
      return { ...state, egg: action.egg };
    case 'SET_PLAYER':
      return { ...state, player: action.player };
    case 'SET_SESSION':
      return { ...state, session: action.session };
    case 'TAP_EGG':
      if (!state.egg) return state;
      return {
        ...state,
        egg: interactWithEgg(state.egg, EGG_CONFIG.tapIncrement),
      };
    case 'HATCH_EGG': {
      if (!state.egg || state.egg.state !== 'ready') return state;
      const pet = hatchEgg(state.egg);
      if (!pet) return state;
      const hatchResult: EngineState = {
        ...state,
        egg: null,
        pet: pet,
        player: { ...state.player, activePetId: pet.id },
        screen: 'home',
      };
      return logEvent(hatchResult, 'pet_hatched');
    }
    case 'FEED_PET': {
      if (!state.pet || !canAfford(state, action.food.cost)) return state;
      const afterDeduct = deductTokens(state, action.food.cost);
      let pet = evaluatePetMood(applyPetFeed(state.pet, action.food.nutrition));
      pet = { ...pet, bond: pet.bond + REWARD_CONFIG.careAction.bondIncrease };
      const { canEvolve } = checkEvolution(pet, state.player.lifetimeMathCorrect);
      if (canEvolve) pet = evolvePet(pet, state.player.lifetimeMathCorrect);
      let result: EngineState = { ...afterDeduct, pet };
      // Track care-toward-ticket
      const feedCare = { ...result.battleTickets.careActionsToday, fed: true };
      result = { ...result, battleTickets: { ...result.battleTickets, careActionsToday: feedCare } };
      if (feedCare.fed && feedCare.cleaned && feedCare.played) result = earnTicket(result, 'care');
      result = logEvent(result, 'pet_fed', { foodId: action.food.id });
      if (canEvolve) result = logEvent(result, 'pet_evolved');
      return result;
    }
    case 'CLEAN_PET': {
      if (!state.pet || !canAfford(state, CARE_ACTIONS.clean.cost)) return state;
      const afterDeduct = deductTokens(state, CARE_ACTIONS.clean.cost);
      let pet = evaluatePetMood(applyPetClean(state.pet, CARE_ACTIONS.clean.impact));
      pet = { ...pet, bond: pet.bond + REWARD_CONFIG.careAction.bondIncrease };
      const { canEvolve } = checkEvolution(pet, state.player.lifetimeMathCorrect);
      if (canEvolve) pet = evolvePet(pet, state.player.lifetimeMathCorrect);
      let result: EngineState = { ...afterDeduct, pet };
      const cleanCare = { ...result.battleTickets.careActionsToday, cleaned: true };
      result = { ...result, battleTickets: { ...result.battleTickets, careActionsToday: cleanCare } };
      if (cleanCare.fed && cleanCare.cleaned && cleanCare.played) result = earnTicket(result, 'care');
      result = logEvent(result, 'pet_cleaned');
      if (canEvolve) result = logEvent(result, 'pet_evolved');
      return result;
    }
    case 'PLAY_PET': {
      if (!state.pet || !canAfford(state, CARE_ACTIONS.play.cost)) return state;
      const afterDeduct = deductTokens(state, CARE_ACTIONS.play.cost);
      let pet = evaluatePetMood(applyPetPlay(state.pet, CARE_ACTIONS.play.impact));
      pet = { ...pet, bond: pet.bond + REWARD_CONFIG.careAction.bondIncrease };
      const { canEvolve } = checkEvolution(pet, state.player.lifetimeMathCorrect);
      if (canEvolve) pet = evolvePet(pet, state.player.lifetimeMathCorrect);
      let result: EngineState = { ...afterDeduct, pet };
      const playCare = { ...result.battleTickets.careActionsToday, played: true };
      result = { ...result, battleTickets: { ...result.battleTickets, careActionsToday: playCare } };
      if (playCare.fed && playCare.cleaned && playCare.played) result = earnTicket(result, 'care');
      result = logEvent(result, 'pet_played_with');
      if (canEvolve) result = logEvent(result, 'pet_evolved');
      return result;
    }
    case 'BOOST_MOOD': {
      if (!state.pet || !canAfford(state, CARE_ACTIONS.heal.cost)) return state;
      const afterDeduct = deductTokens(state, CARE_ACTIONS.heal.cost);
      let pet = evaluatePetMood(applyMoodBoost(state.pet, CARE_ACTIONS.heal.impact));
      pet = { ...pet, bond: pet.bond + REWARD_CONFIG.careAction.bondIncrease };
      const { canEvolve } = checkEvolution(pet, state.player.lifetimeMathCorrect);
      if (canEvolve) pet = evolvePet(pet, state.player.lifetimeMathCorrect);
      let result: EngineState = { ...afterDeduct, pet };
      result = logEvent(result, 'pet_healed');
      if (canEvolve) result = logEvent(result, 'pet_evolved');
      return result;
    }
    case 'AWARD_TOKENS':
      return {
        ...state,
        player: {
          ...state.player,
          currencies: {
            ...state.player.currencies,
            tokens: state.player.currencies.tokens + action.amount,
          },
        },
      };
    case 'SOLVE_MATH': {
      const playerAfterStreak = updateMathStreak(state.player, action.correct);
      const playerAfterMastery = updateMastery(playerAfterStreak, 'arithmetic', action.correct);
      const mpEarned = action.correct ? MP_EARN.correct : MP_EARN.wrong;
      const playerWithMP = {
        ...playerAfterMastery,
        currencies: {
          ...playerAfterMastery.currencies,
          mp: playerAfterMastery.currencies.mp + mpEarned,
          mpLifetime: playerAfterMastery.currencies.mpLifetime + mpEarned,
        },
      };
      if (!action.correct) return { ...state, player: playerWithMP };
      // Correct answer — accumulate battle-prep buffs + lifetime counter
      const playerWithBuffs = {
        ...playerWithMP,
        mathBuffs: addMathBuffs(playerWithMP.mathBuffs, MATH_BUFF_PER_CORRECT),
        lifetimeMathCorrect: playerWithMP.lifetimeMathCorrect + 1,
      };
      const xpGain = action.difficulty * 5;
      let petWithXP = state.pet ? addXP(state.pet, xpGain) : state.pet;
      // Math-to-bond link: every correct answer grows the pet's bond (+1).
      if (petWithXP) {
        petWithXP = { ...petWithXP, bond: petWithXP.bond + 1 };
      }
      const newMathSolved = state.dailyGoals.mathSolved + 1;
      const mathGoalJustMet = newMathSolved === DAILY_MATH_GOAL;
      // Track math-toward-ticket
      const mathForTicket = state.battleTickets.mathForNextTicket + 1;
      const ticketEarned = mathForTicket >= PVP_CONFIG.mathProblemsPerTicket;
      const forgeMathMult = computeForgeBonuses(state.player.powerForge).mathRewardMult;
      const forgedReward = Math.round(action.reward * forgeMathMult);
      let solveResult: EngineState = {
        ...state,
        pet: petWithXP,
        player: {
          ...playerWithBuffs,
          currencies: {
            ...playerWithBuffs.currencies,
            tokens: playerWithBuffs.currencies.tokens + forgedReward,
          },
        },
        dailyGoals: { ...state.dailyGoals, mathSolved: newMathSolved },
        battleTickets: {
          ...state.battleTickets,
          mathForNextTicket: ticketEarned ? 0 : mathForTicket,
        },
        notifications: mathGoalJustMet
          ? [...state.notifications, { id: `goal_math_${Date.now()}`, message: '🎯 Math goal done! Beat a battle for a bonus!', icon: '🎯', timestamp: Date.now() }]
          : state.notifications,
      };
      if (ticketEarned) solveResult = earnTicket(solveResult, 'math');
      return logEvent(solveResult, 'math_solved');
    }
    case 'CHECK_LOGIN_STREAK': {
      const { streak, isNewDay, reward } = checkLoginStreak(state.player, Date.now());
      if (!isNewDay) return state;
      const todayStr = new Date().toISOString().slice(0, 10);
      return {
        ...state,
        player: {
          ...state.player,
          lastLoginDate: todayStr,
          streaks: { ...state.player.streaks, login: streak },
          currencies: {
            ...state.player.currencies,
            tokens: state.player.currencies.tokens + reward,
          },
        },
        notifications: [
          ...state.notifications,
          { id: `login_${Date.now()}`, message: `Day ${streak} streak! +${reward} tokens`, icon: '/assets/generated/final/icon_streak_flame.png', timestamp: Date.now() },
        ],
        // Reveal the Power Path modal once per new day — only if onboarding
        // is complete (don't stack it on top of the first-run tutorial).
        showDailyRitual: state.player.hasOnboarded ? true : state.showDailyRitual,
      };
    }
    case 'CHECK_DAILY_GOALS': {
      const today = todayISO();
      if (state.dailyGoals.date === today) return state; // already today's goals
      // Math-absence penalty: if yesterday had real play (date was set) but zero math, pet sulks.
      const missedMath = !!state.dailyGoals.date
        && state.dailyGoals.date !== today
        && state.dailyGoals.mathSolved === 0;
      let pet = state.pet;
      let notifications = state.notifications;
      if (missedMath && pet) {
        pet = {
          ...pet,
          bond: Math.max(0, pet.bond - 1),
          needs: {
            ...pet.needs,
            happiness: Math.max(0, pet.needs.happiness - 5),
          },
        };
        notifications = [
          ...notifications,
          {
            id: `miss_math_${Date.now()}`,
            message: 'Your pet missed you — do some math today.',
            icon: '/assets/generated/final/icon_math_generic.png',
            timestamp: Date.now(),
          },
        ];
      }
      // Reset daily ticket counters and refresh NPC classmates
      const daysSinceRefresh = state.classroom.lastRosterRefresh
        ? Math.max(0, Math.floor((Date.now() - new Date(state.classroom.lastRosterRefresh).getTime()) / 86400000))
        : 0;
      const refreshedClassmates = daysSinceRefresh > 0 && state.classroom.classmates.length > 0
        ? refreshNPCClassmates(state.classroom.classmates, pet?.progression.level ?? 1, daysSinceRefresh)
        : state.classroom.classmates;
      return {
        ...state,
        pet,
        notifications,
        dailyGoals: { date: today, mathSolved: 0, battlesWon: 0, rewardClaimed: false },
        battleTickets: {
          ...state.battleTickets,
          todayEarned: 0,
          todayUsed: 0,
          mathForNextTicket: 0,
          careActionsToday: { fed: false, cleaned: false, played: false },
        },
        classroom: {
          ...state.classroom,
          classmates: refreshedClassmates,
          lastRosterRefresh: refreshedClassmates !== state.classroom.classmates
            ? new Date().toISOString()
            : state.classroom.lastRosterRefresh,
        },
        interaction: state.interaction ? resetInteractionUsage(state.interaction) : state.interaction,
      };
    }
    case 'USE_HINT':
      return deductTokens(state, HINT_COST);
    case 'PURCHASE_ITEM': {
      if (action.tokenCost > 0 && !canAfford(state, action.tokenCost)) return state;
      if (action.coinCost > 0 && state.player.currencies.coins < action.coinCost) return state;
      let afterPurchase: EngineState = {
        ...state,
        player: {
          ...state.player,
          currencies: {
            ...state.player.currencies,
            tokens: Math.max(0, state.player.currencies.tokens - action.tokenCost),
            coins: Math.max(0, state.player.currencies.coins - action.coinCost),
          },
        },
        inventory: addItem(state.inventory, action.itemId, 1),
      };
      // If this is a care tool, also unlock/upgrade the corresponding interaction
      const careTool = getCareToolById(action.itemId);
      if (careTool) {
        const interaction = afterPurchase.interaction ?? createDefaultInteractionState();
        if (careTool.toolType === 'unlock' && !interaction.unlockedTools.includes(careTool.targetMode)) {
          afterPurchase = {
            ...afterPurchase,
            interaction: { ...interaction, unlockedTools: [...interaction.unlockedTools, careTool.targetMode] },
          };
        } else if (careTool.toolType === 'upgrade' && careTool.upgradeTier != null) {
          afterPurchase = {
            ...afterPurchase,
            interaction: {
              ...interaction,
              equippedToolTiers: { ...interaction.equippedToolTiers, [careTool.targetMode]: careTool.upgradeTier },
            },
          };
        }
      }
      return afterPurchase;
    }
    case 'USE_ITEM': {
      if (!state.pet) return state;
      const shopItem = SHOP_ITEMS.find((i) => i.id === action.itemId);
      if (!shopItem) return state;
      const afterUse = removeItem(state.inventory, action.itemId, 1);
      let pet = state.pet;
      const { type, value } = shopItem.effect;
      if (type === 'feed') pet = evaluatePetMood(applyPetFeed(pet, value));
      else if (type === 'play') pet = evaluatePetMood(applyPetPlay(pet, value));
      else if (type === 'heal') pet = evaluatePetMood(applyMoodBoost(pet, value));
      else if (type === 'clean') pet = evaluatePetMood(applyPetClean(pet, value));
      return { ...state, inventory: afterUse, pet };
    }
    case 'ADD_XP':
      return state.pet ? { ...state, pet: addXP(state.pet, action.amount) } : state;
    case 'EVOLVE_PET':
      return state.pet
        ? { ...state, pet: evolvePet(state.pet, state.player.lifetimeMathCorrect) }
        : state;
    case 'PLACE_ROOM_ITEM': {
      const updatedRoom = placeItem(state.room, action.itemId, action.position);
      return { ...state, room: { ...updatedRoom, moodBonus: calculateRoomMoodBonus(updatedRoom) } };
    }
    case 'REMOVE_ROOM_ITEM': {
      const updatedRoom = removeRoomItem(state.room, action.itemId);
      return { ...state, room: { ...updatedRoom, moodBonus: calculateRoomMoodBonus(updatedRoom) } };
    }
    case 'CHANGE_BACKGROUND':
      return { ...state, room: changeBackground(state.room, action.backgroundId) };
    case 'CHANGE_ROOM':
      return { ...state, currentRoom: action.roomId };
    case 'CLAIM_MAILBOX': {
      const today = todayISO();
      if (state.mailbox.lastClaimedDate === today) return state; // already claimed today
      const streak = state.mailbox.totalClaimed;
      // Reward scales slightly with streak: base 15, +2 per previous claim, cap at 50
      const reward = Math.min(50, 15 + streak * 2);
      return {
        ...state,
        mailbox: { lastClaimedDate: today, totalClaimed: streak + 1 },
        player: {
          ...state.player,
          currencies: {
            ...state.player.currencies,
            tokens: state.player.currencies.tokens + reward,
          },
        },
        notifications: [
          ...state.notifications,
          {
            id: `mailbox_${Date.now()}`,
            message: `Mail claimed! +${reward} tokens`,
            icon: '📬',
            timestamp: Date.now(),
          },
        ],
      };
    }
    case 'LOG_EVENT':
      return logEvent(state, action.eventType, action.payload);
    case 'DISMISS_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.id) };
    case 'START_BATTLE': {
      if (!state.pet || state.pet.state === 'sick' || state.pet.state === 'dead') return state;
      // Math-gate #2: queue a warmup question before the wild battle begins.
      return { ...state, pendingBattleWarmup: { kind: 'wild' } };
    }
    // DEV: Start battle with a specific species (pre-combat character picker)
    case 'START_BATTLE_WITH_CHARACTER': {
      return {
        ...state,
        pendingBattleWarmup: { kind: 'character', speciesId: action.speciesId },
      };
    }
    case 'RESOLVE_WARMUP': {
      const pending = state.pendingBattleWarmup;
      if (!pending) return state;
      const warmupBonus = action.correct && !action.skipped ? 3 : 0;
      let baseBattle: ActiveBattleState | null = null;
      if (pending.kind === 'wild') {
        if (!state.pet) return { ...state, pendingBattleWarmup: null };
        const ready = isPetBattleReady(state.pet);
        baseBattle = initBattle(state.pet, ready ? 0 : 2);
      } else {
        const level = state.pet?.progression.level ?? 5;
        baseBattle = initBattleWithSpecies(pending.speciesId ?? 'default', level);
      }
      if (warmupBonus > 0) {
        baseBattle = {
          ...baseBattle,
          playerPet: {
            ...baseBattle.playerPet,
            strength: baseBattle.playerPet.strength + warmupBonus,
          },
          warmupAtkBonus: warmupBonus,
          log: [
            ...baseBattle.log,
            {
              turn: 0,
              actor: 'player',
              action: 'math_prep',
              message: `Warmup correct! +${warmupBonus} ATK for this fight.`,
            },
          ],
        };
      }
      const forged = applyPowerForgeToBattle(baseBattle, state.player.powerForge);
      const battle = applyMathBuffsToBattle(forged, state.player.mathBuffs);
      return {
        ...state,
        pendingBattleWarmup: null,
        player: { ...state.player, mathBuffs: EMPTY_MATH_BUFFS },
        battle: { ...battle, combatFeel: createCombatFeelState() },
        screen: 'battle',
      };
    }
    case 'PLAYER_MOVE': {
      if (!state.battle.active || state.battle.phase !== 'player_turn') return state;
      const inRun = state.run.active && state.run.phase === 'in_battle';

      // Run: turn-start passives (scaling, regen, glitch, void_pulse, etc.)
      let s = inRun ? applyTurnStartEffects(state) : state;
      if (!s.battle.active) return s;

      // Combat Feel: turn-start (glitch passive decay)
      s = { ...s, battle: cfOnTurnStart(s.battle as ActiveBattleState) };

      // Run: phase shift dodge
      if (inRun && checkPhaseShift(s)) {
        const ab = s.battle as ActiveBattleState;
        let b: ActiveBattleState = {
          ...ab,
          log: [...ab.log, { turn: ab.turnCount, actor: 'enemy' as const, action: 'passive' as const, message: 'Phase shift! Attack passes through!' }],
        };
        const hp0 = b.playerPet.currentHP;
        b = executeEnemyTurn(b);
        b = resolveRound(b);
        s = { ...s, battle: b };
        const eDmg = Math.max(0, hp0 - b.playerPet.currentHP);
        if (eDmg > 0) {
          s = inRun ? applyPostEnemyAttack(s, eDmg) : s;
          // Combat Feel: after enemy attack (glitch, combo reset, weak point)
          s = { ...s, battle: cfAfterEnemyAttack(s.battle as ActiveBattleState, eDmg, Math.random()) };
        }
        // Combat Feel: collapse check
        if (s.battle.active && shouldTriggerCollapse(s.battle as ActiveBattleState)) {
          s = { ...s, battle: triggerCollapse(s.battle as ActiveBattleState) };
        }
        return s;
      }

      const eHP0 = (s.battle as ActiveBattleState).enemyPet.currentHP;
      let battle = executePlayerMove(s.battle as ActiveBattleState, action.moveId);

      // Run: fortified/shell damage reduction (post-hoc adjustment)
      if (inRun) {
        const raw = eHP0 - battle.enemyPet.currentHP;
        if (raw > 0) {
          const adj = applyFortifiedReduction(s, raw);
          if (adj < raw) {
            battle = { ...battle, enemyPet: { ...battle.enemyPet, currentHP: Math.min(battle.enemyPet.maxHP, battle.enemyPet.currentHP + (raw - adj)) } };
          }
        }
      }

      const pDmg = eHP0 - battle.enemyPet.currentHP;

      // Combat Feel: after player attack (combo, weak point, big hit)
      if (pDmg > 0) {
        const cfResult = cfAfterPlayerAttack(battle, pDmg);
        battle = cfResult.battle;
        // Apply extra multiplier as bonus damage
        if (cfResult.extraMultiplier > 1.0) {
          const bonusDmg = Math.floor(pDmg * (cfResult.extraMultiplier - 1.0));
          battle = { ...battle, enemyPet: { ...battle.enemyPet, currentHP: Math.max(0, battle.enemyPet.currentHP - bonusDmg) } };
        }
      }

      if (battle.enemyPet.currentHP > 0) {
        const pHP0 = battle.playerPet.currentHP;
        battle = executeEnemyTurn(battle);
        battle = resolveRound(battle);
        s = { ...s, battle };
        const eDmg = Math.max(0, pHP0 - battle.playerPet.currentHP);
        if (inRun) {
          if (pDmg > 0) s = applyPostPlayerAttack(s, pDmg);
          if (eDmg > 0) s = applyPostEnemyAttack(s, eDmg);
        }
        // Combat Feel: after enemy attack
        if (eDmg > 0 && s.battle.active) {
          s = { ...s, battle: cfAfterEnemyAttack(s.battle as ActiveBattleState, eDmg, Math.random()) };
        }
        // Combat Feel: collapse check
        if (s.battle.active && shouldTriggerCollapse(s.battle as ActiveBattleState)) {
          s = { ...s, battle: triggerCollapse(s.battle as ActiveBattleState) };
        }
      } else {
        battle = resolveRound(battle);
        s = { ...s, battle };
        if (inRun && pDmg > 0) s = applyPostPlayerAttack(s, pDmg);
      }
      return s;
    }
    case 'MATH_BONUS_CORRECT':
      if (!state.battle.active) return state;
      return {
        ...state,
        battle: {
          ...state.battle,
          mathBuffActive: true,
          playerPet: {
            ...state.battle.playerPet,
            energy: Math.min(
              state.battle.playerPet.maxEnergy,
              state.battle.playerPet.energy + BATTLE_CONSTANTS.mathBonusEnergy,
            ),
          },
        },
      };
    case 'PLAYER_FOCUS': {
      if (!state.battle.active || state.battle.phase !== 'player_turn' || state.battle.focusUsedThisTurn) return state;
      const inRunF = state.run.active && state.run.phase === 'in_battle';
      let sf = inRunF ? applyTurnStartEffects(state) : state;
      if (!sf.battle.active) return sf;

      // Combat Feel: turn-start
      sf = { ...sf, battle: cfOnTurnStart(sf.battle as ActiveBattleState) };

      const pHP0f = (sf.battle as ActiveBattleState).playerPet.currentHP;
      let focusBattle = executeFocus(sf.battle as ActiveBattleState);
      focusBattle = executeEnemyTurn(focusBattle);
      focusBattle = resolveRound(focusBattle);
      sf = { ...sf, battle: focusBattle };
      if (inRunF) {
        const eDmg = Math.max(0, pHP0f - focusBattle.playerPet.currentHP);
        if (eDmg > 0) sf = applyPostEnemyAttack(sf, eDmg);
      }
      // Combat Feel: after enemy attack
      const eDmgF = Math.max(0, pHP0f - focusBattle.playerPet.currentHP);
      if (eDmgF > 0 && sf.battle.active) {
        sf = { ...sf, battle: cfAfterEnemyAttack(sf.battle as ActiveBattleState, eDmgF, Math.random()) };
      }
      // Combat Feel: collapse check
      if (sf.battle.active && shouldTriggerCollapse(sf.battle as ActiveBattleState)) {
        sf = { ...sf, battle: triggerCollapse(sf.battle as ActiveBattleState) };
      }
      return sf;
    }
    case 'PLAYER_DEFEND_ACTION': {
      if (!state.battle.active || state.battle.phase !== 'player_turn') return state;
      const inRunD = state.run.active && state.run.phase === 'in_battle';
      let sd = inRunD ? applyTurnStartEffects(state) : state;
      if (!sd.battle.active) return sd;

      // Combat Feel: turn-start
      sd = { ...sd, battle: cfOnTurnStart(sd.battle as ActiveBattleState) };

      const eHP0d = (sd.battle as ActiveBattleState).enemyPet.currentHP;
      let defendBattle = executeDefendAction(sd.battle as ActiveBattleState);

      if (defendBattle.enemyPet.currentHP > 0) {
        const pHP0d = defendBattle.playerPet.currentHP;
        defendBattle = executeEnemyTurn(defendBattle);
        defendBattle = resolveRound(defendBattle);
        sd = { ...sd, battle: defendBattle };
        if (inRunD) {
          const pDmgD = Math.max(0, eHP0d - defendBattle.enemyPet.currentHP);
          const eDmgD = Math.max(0, pHP0d - defendBattle.playerPet.currentHP);
          if (pDmgD > 0) sd = applyPostPlayerAttack(sd, pDmgD);
          if (eDmgD > 0) sd = applyPostEnemyAttack(sd, eDmgD);
        }
        // Combat Feel: after enemy attack
        const eDmgDcf = Math.max(0, pHP0d - defendBattle.playerPet.currentHP);
        if (eDmgDcf > 0 && sd.battle.active) {
          sd = { ...sd, battle: cfAfterEnemyAttack(sd.battle as ActiveBattleState, eDmgDcf, Math.random()) };
        }
        // Combat Feel: collapse check
        if (sd.battle.active && shouldTriggerCollapse(sd.battle as ActiveBattleState)) {
          sd = { ...sd, battle: triggerCollapse(sd.battle as ActiveBattleState) };
        }
      } else {
        defendBattle = resolveRound(defendBattle);
        sd = { ...sd, battle: defendBattle };
        if (inRunD) {
          const pDmgD = Math.max(0, eHP0d - defendBattle.enemyPet.currentHP);
          if (pDmgD > 0) sd = applyPostPlayerAttack(sd, pDmgD);
        }
      }
      return sd;
    }
    case 'PLAYER_FLEE_ATTEMPT': {
      if (!state.battle.active || state.battle.phase !== 'player_turn') return state;
      const fleeResult = attemptFlee(state.battle);
      if (fleeResult.success) {
        // In a run, successful flee ends the run as defeat
        if (state.run.active && state.run.phase === 'in_battle') {
          return handleRunDefeat({ ...state, battle: { active: false } });
        }
        return { ...state, battle: { active: false }, screen: 'home' };
      }
      const inRunFl = state.run.active && state.run.phase === 'in_battle';
      let sfl: EngineState = { ...state, battle: fleeResult.battle };
      if (inRunFl) sfl = applyTurnStartEffects(sfl);
      if (!sfl.battle.active) return sfl;

      const pHP0fl = (sfl.battle as ActiveBattleState).playerPet.currentHP;
      let fleeBattle = executeEnemyTurn(sfl.battle as ActiveBattleState);
      fleeBattle = resolveRound(fleeBattle);
      sfl = { ...sfl, battle: fleeBattle };
      if (inRunFl) {
        const eDmgFl = Math.max(0, pHP0fl - fleeBattle.playerPet.currentHP);
        if (eDmgFl > 0) sfl = applyPostEnemyAttack(sfl, eDmgFl);
      }
      // Combat Feel: after enemy attack
      const eDmgFlCf = Math.max(0, pHP0fl - fleeBattle.playerPet.currentHP);
      if (eDmgFlCf > 0 && sfl.battle.active) {
        sfl = { ...sfl, battle: cfAfterEnemyAttack(sfl.battle as ActiveBattleState, eDmgFlCf, Math.random()) };
      }
      // Combat Feel: collapse check
      if (sfl.battle.active && shouldTriggerCollapse(sfl.battle as ActiveBattleState)) {
        sfl = { ...sfl, battle: triggerCollapse(sfl.battle as ActiveBattleState) };
      }
      return sfl;
    }
    // --- Trace event actions ---
    case 'TRACE_MATH_COMPLETE': {
      if (!state.battle.active) return state;
      const tierLabel = action.tier === 'perfect' ? 'PERFECT' : action.tier === 'good' ? 'Great' : 'Basic';
      let mathBattle: ActiveBattleState = {
        ...state.battle,
        mathBuffActive: true,
        traceBuffs: { ...state.battle.traceBuffs, mathTraceTier: action.tier },
        playerPet: {
          ...state.battle.playerPet,
          energy: Math.min(
            state.battle.playerPet.maxEnergy,
            state.battle.playerPet.energy + BATTLE_CONSTANTS.mathBonusEnergy,
          ),
        },
        log: [...state.battle.log, {
          turn: state.battle.turnCount, actor: 'player' as const,
          action: 'trace_math', message: `${tierLabel} trace! Next attack powered up! +${BATTLE_CONSTANTS.mathBonusEnergy} EN`,
        }].slice(-50),
      };
      // Combat Feel: afterTrace (glitch + focus regain)
      mathBattle = cfAfterTrace(mathBattle, action.tier);
      return { ...state, battle: mathBattle };
    }
    case 'TRACE_SHIELD_COMPLETE': {
      if (!state.battle.active) return state;
      const restored = Math.min(
        state.battle.playerPet.maxHP,
        state.battle.playerPet.currentHP + action.damageToRestore,
      );
      const shieldLabel = action.tier === 'perfect' ? 'PERFECT' : action.tier === 'good' ? 'Great' : 'Basic';
      let shieldBattle: ActiveBattleState = {
        ...state.battle,
        playerPet: { ...state.battle.playerPet, currentHP: restored },
        traceBuffs: { ...state.battle.traceBuffs, shieldTier: action.tier },
        log: [...state.battle.log, {
          turn: state.battle.turnCount, actor: 'player' as const,
          action: 'trace_shield', message: `${shieldLabel} shield! Restored ${action.damageToRestore} HP!`,
        }].slice(-50),
      };
      // Combat Feel: afterTrace (glitch + focus regain)
      shieldBattle = cfAfterTrace(shieldBattle, action.tier);
      // Combat Feel: reflect on perfect shield
      if (action.tier === 'perfect' && action.damageToRestore > 0) {
        shieldBattle = applyReflect(shieldBattle, action.damageToRestore);
      }
      return { ...state, battle: shieldBattle };
    }
    case 'TRACE_RUNE_COMPLETE': {
      if (!state.battle.active) return state;
      const runeLabel = action.tier === 'perfect' ? 'PERFECT' : action.tier === 'good' ? 'Great' : 'Basic';
      let runeBattle: ActiveBattleState = {
        ...state.battle,
        traceBuffs: { ...state.battle.traceBuffs, runeBoostTier: action.tier },
        log: [...state.battle.log, {
          turn: state.battle.turnCount, actor: 'player' as const,
          action: 'trace_rune', message: `${runeLabel} rune! Next attack empowered!`,
        }].slice(-50),
      };
      // Combat Feel: afterTrace (glitch + focus regain)
      runeBattle = cfAfterTrace(runeBattle, action.tier);
      return { ...state, battle: runeBattle };
    }
    case 'TRACE_EVENT_FAILED': {
      if (!state.battle.active) return state;
      let failBattle: ActiveBattleState = {
        ...state.battle,
        log: [...state.battle.log, {
          turn: state.battle.turnCount, actor: 'player' as const,
          action: 'trace_fail', message: 'Trace fizzled...',
        }].slice(-50),
      };
      // Combat Feel: afterTrace with 'miss' tier (glitch increases)
      failBattle = cfAfterTrace(failBattle, 'miss');
      return { ...state, battle: failBattle };
    }
    case 'COLLAPSE_TRACE_COMPLETE': {
      if (!state.battle.active) return state;
      const collapseBattle = resolveCollapse(state.battle, action.tier);
      return { ...state, battle: collapseBattle };
    }
    case 'END_BATTLE': {
      // If in a run, route through run system instead of going home
      if (state.run.active && state.run.phase === 'in_battle') {
        if (state.battle.active && state.battle.phase === 'victory') {
          return handleRunVictory(state);
        }
        if (state.battle.active && (state.battle.phase === 'defeat' || state.battle.playerPet.currentHP <= 0)) {
          return handleRunDefeat(state);
        }
      }
      if (!state.battle.active || state.battle.phase !== 'victory') return { ...state, battle: { active: false }, screen: 'home' };
      const rewards = state.battle.rewards;
      const petWithXP = rewards && state.pet ? addXP(state.pet, rewards.xp) : state.pet;

      // Daily goal: track battle win
      const newBattlesWon = state.dailyGoals.battlesWon + 1;
      const bothGoalsMet =
        !state.dailyGoals.rewardClaimed &&
        state.dailyGoals.mathSolved >= DAILY_MATH_GOAL &&
        newBattlesWon >= DAILY_BATTLE_GOAL;
      const goalBonus = bothGoalsMet ? DAILY_GOAL_REWARD : 0;

      const battleResult: EngineState = {
        ...state,
        battle: { active: false },
        screen: 'home',
        pet: petWithXP
          ? {
              ...petWithXP,
              needs: {
                ...petWithXP.needs,
                happiness: Math.min(100, petWithXP.needs.happiness + 20),
              },
            }
          : petWithXP,
        player: {
          ...(rewards
            ? {
                ...state.player,
                currencies: {
                  ...state.player.currencies,
                  tokens: state.player.currencies.tokens + (rewards.tokens ?? 0) + goalBonus,
                  coins: state.player.currencies.coins + (rewards.coins ?? 0),
                },
              }
            : state.player),
        },
        dailyGoals: {
          ...state.dailyGoals,
          battlesWon: newBattlesWon,
          rewardClaimed: state.dailyGoals.rewardClaimed || bothGoalsMet,
        },
        notifications: bothGoalsMet
          ? [...state.notifications, { id: `goal_done_${Date.now()}`, message: `Daily goals complete! +${DAILY_GOAL_REWARD} tokens`, icon: '/assets/generated/final/reward_trophy_gold.png', timestamp: Date.now() }]
          : state.notifications,
      };
      return logEvent(battleResult, 'battle_won');
    }
    case 'FLEE_BATTLE': {
      // In a run, fleeing counts as defeat
      if (state.run.active && state.run.phase === 'in_battle') {
        return handleRunDefeat(state);
      }
      // PvP flee costs 50% of stake
      if (state.battle.active && state.battle.pvpMeta) {
        const fleeCost = Math.floor(state.battle.pvpMeta.tokenStake * PVP_CONFIG.fleePenaltyPercent);
        const actualCost = Math.min(fleeCost, Math.max(0, state.player.currencies.tokens - PVP_CONFIG.tokenFloor));
        const updatedTrackers = updateMatchupTracker(state.matchupTrackers, state.battle.pvpMeta.opponentId, 'fled', Date.now());
        const matchResult: MatchResult = {
          id: `match_${Date.now()}`,
          date: new Date().toISOString(),
          playerPetId: state.pet?.id ?? '',
          opponentId: state.battle.pvpMeta.opponentId,
          opponentPetName: state.battle.enemyPet.name,
          outcome: 'fled',
          turnsPlayed: state.battle.turnCount,
          tokensTransferred: -actualCost,
          xpEarned: 0,
          mathBonusUsed: false,
        };
        return {
          ...state,
          battle: { active: false },
          screen: 'home',
          player: {
            ...state.player,
            currencies: {
              ...state.player.currencies,
              tokens: Math.max(PVP_CONFIG.tokenFloor, state.player.currencies.tokens - actualCost),
            },
          },
          matchHistory: [...state.matchHistory, matchResult].slice(-100),
          matchupTrackers: updatedTrackers,
        };
      }
      return { ...state, battle: { active: false }, screen: 'home' };
    }
    // --- Roguelike Run actions ---
    case 'START_RUN':
      return startRun(state);
    case 'SELECT_RUN_ENCOUNTER':
      return state;
    case 'START_RUN_BATTLE':
      return startRunBattle(state);
    case 'RUN_ENCOUNTER_VICTORY':
      return handleRunVictory(state);
    case 'RUN_ENCOUNTER_DEFEAT':
      return handleRunDefeat(state);
    case 'SELECT_RUN_REWARD':
      return selectRunReward(state, action.rewardId);
    case 'END_RUN':
      return endRun(state);
    case 'SELECT_MAP_NODE':
      return selectMapNode(state, action.nodeId);
    case 'REST_LIGHT':
      return handleRestLight(state);
    case 'REST_STABILIZE':
      // Tier is passed via trace completion action, for now treat as basic
      return handleRestStabilize(state, 'basic');
    case 'REST_FORTIFY':
      return handleRestFortify(state);
    case 'EVENT_CHOOSE':
      return handleEventChoice(state, action.choiceIndex);
    // --- Classroom PvP actions ---
    case 'GENERATE_CLASSROOM': {
      if (state.classroom.classroom) return state;
      if (!state.pet) return state;
      const { classroom, classmates } = generateClassroom(state.player, state.pet);
      return {
        ...state,
        classroom: {
          classroom,
          classmates,
          selectedOpponentId: null,
          lastRosterRefresh: new Date().toISOString(),
        },
      };
    }
    case 'REFRESH_CLASSMATES': {
      if (!state.classroom.classroom) return state;
      const daysSince = Math.max(0, Math.floor((Date.now() - new Date(state.classroom.lastRosterRefresh).getTime()) / 86400000));
      const refreshed = refreshNPCClassmates(state.classroom.classmates, state.pet?.progression.level ?? 1, Math.max(1, daysSince));
      return {
        ...state,
        classroom: {
          ...state.classroom,
          classmates: refreshed,
          lastRosterRefresh: new Date().toISOString(),
        },
      };
    }
    case 'SELECT_OPPONENT': {
      const opponent = state.classroom.classmates.find(c => c.id === action.opponentId);
      if (!opponent) return state;
      return {
        ...state,
        classroom: { ...state.classroom, selectedOpponentId: action.opponentId },
        screen: 'challenger_preview',
      };
    }
    case 'CLEAR_OPPONENT_SELECTION':
      return {
        ...state,
        classroom: { ...state.classroom, selectedOpponentId: null },
        screen: 'class_roster',
      };
    case 'START_PVP_BATTLE': {
      if (!state.pet || state.pet.state === 'sick' || state.pet.state === 'dead') return state;
      const opponent = state.classroom.classmates.find(c => c.id === action.opponentId);
      if (!opponent) return state;
      if (state.battleTickets.tickets.length === 0) return state;
      if (state.battleTickets.todayUsed >= PVP_CONFIG.maxTicketsUsedPerDay) return state;
      const { allowed } = canChallenge(state.matchupTrackers, action.opponentId, Date.now());
      if (!allowed) return state;
      const tokenStake = calculateTokenStake(
        state.pet.progression.level,
        opponent.petSnapshot.level,
        state.player.currencies.tokens,
      );
      if (state.player.currencies.tokens < tokenStake + PVP_CONFIG.tokenFloor) return state;
      const [consumedTicket, ...remainingTickets] = state.battleTickets.tickets;
      const battle = initPvPBattle(state.pet, opponent, consumedTicket.id, tokenStake);
      let result: EngineState = {
        ...state,
        battle: { ...battle, combatFeel: createCombatFeelState() },
        screen: 'battle',
        battleTickets: {
          ...state.battleTickets,
          tickets: remainingTickets,
          todayUsed: state.battleTickets.todayUsed + 1,
        },
      };
      result = logEvent(result, 'ticket_used', { opponentId: action.opponentId });
      return result;
    }
    case 'END_PVP_BATTLE': {
      if (!state.battle.active || !state.battle.pvpMeta) return state;
      const { pvpMeta, phase } = state.battle;
      const isWin = phase === 'victory';
      const isLoss = phase === 'defeat';
      // Build match result
      const pvpMatchResult: MatchResult = {
        id: `match_${Date.now()}`,
        date: new Date().toISOString(),
        playerPetId: state.pet?.id ?? '',
        opponentId: pvpMeta.opponentId,
        opponentPetName: state.battle.enemyPet.name,
        outcome: isWin ? 'win' : isLoss ? 'loss' : 'draw',
        turnsPlayed: state.battle.turnCount,
        tokensTransferred: isWin ? pvpMeta.tokenStake : isLoss ? -pvpMeta.tokenStake : 0,
        xpEarned: state.battle.enemyPet.level * (isWin ? PVP_CONFIG.winXPMultiplier : isLoss ? PVP_CONFIG.lossXPMultiplier : PVP_CONFIG.drawXPMultiplier),
        mathBonusUsed: state.battle.log.some(l => l.message.includes('Math Bonus')),
      };
      // Token transfer
      let tokenDelta = 0;
      if (isWin) tokenDelta = pvpMeta.tokenStake;
      else if (isLoss) tokenDelta = -Math.min(pvpMeta.tokenStake, Math.max(0, state.player.currencies.tokens - PVP_CONFIG.tokenFloor));
      // XP
      const pvpXP = pvpMatchResult.xpEarned;
      const pvpPetWithXP = state.pet ? addXP(state.pet, pvpXP) : state.pet;
      // Happiness
      const happDelta = isWin ? PVP_CONFIG.winHappinessBonus : isLoss ? -PVP_CONFIG.lossHappinessPenalty : 0;
      // Win streak
      const currentStreak = isWin ? (state.player.pvpRecord?.currentWinStreak ?? 0) + 1 : 0;
      const bestStreak = Math.max(currentStreak, state.player.pvpRecord?.bestWinStreak ?? 0);
      // Trophy check
      const isFirstPvPWin = isWin && (state.player.pvpRecord?.totalWins ?? 0) === 0;
      const trophyCheck = shouldMintTrophy(pvpMatchResult, currentStreak, state.battle.enemyPet.level, state.pet?.progression.level ?? 1, isFirstPvPWin);
      let updatedTrophyCase = state.trophyCase;
      if (trophyCheck) {
        const trophy = createTrophy(trophyCheck, pvpMatchResult, pvpMeta.opponentDisplayName);
        updatedTrophyCase = { ...updatedTrophyCase, trophies: [...updatedTrophyCase.trophies, trophy] };
        pvpMatchResult.trophyMinted = trophy.id;
      }
      // Update matchup tracker
      const pvpUpdatedTrackers = updateMatchupTracker(state.matchupTrackers, pvpMeta.opponentId, pvpMatchResult.outcome, Date.now());
      // Update classmate match history
      const pvpUpdatedClassmates = state.classroom.classmates.map(c =>
        c.id === pvpMeta.opponentId
          ? { ...c, matchHistory: [...c.matchHistory, { matchId: pvpMatchResult.id, date: pvpMatchResult.date, outcome: pvpMatchResult.outcome, turnsPlayed: pvpMatchResult.turnsPlayed }].slice(-20) }
          : c
      );
      // Daily goals: PvP wins count
      const pvpBattlesWon = isWin ? state.dailyGoals.battlesWon + 1 : state.dailyGoals.battlesWon;
      const pvpGoalsMet = !state.dailyGoals.rewardClaimed
        && state.dailyGoals.mathSolved >= DAILY_MATH_GOAL
        && pvpBattlesWon >= DAILY_BATTLE_GOAL;
      const pvpGoalBonus = pvpGoalsMet ? DAILY_GOAL_REWARD : 0;
      let pvpResult: EngineState = {
        ...state,
        battle: { active: false },
        screen: 'match_result',
        pet: pvpPetWithXP ? {
          ...pvpPetWithXP,
          needs: {
            ...pvpPetWithXP.needs,
            happiness: Math.max(0, Math.min(100, pvpPetWithXP.needs.happiness + happDelta)),
          },
        } : pvpPetWithXP,
        player: {
          ...state.player,
          currencies: {
            ...state.player.currencies,
            tokens: Math.max(PVP_CONFIG.tokenFloor, state.player.currencies.tokens + tokenDelta + pvpGoalBonus),
          },
          pvpRecord: {
            totalWins: (state.player.pvpRecord?.totalWins ?? 0) + (isWin ? 1 : 0),
            totalLosses: (state.player.pvpRecord?.totalLosses ?? 0) + (isLoss ? 1 : 0),
            currentWinStreak: currentStreak,
            bestWinStreak: bestStreak,
            totalTokensWon: (state.player.pvpRecord?.totalTokensWon ?? 0) + (isWin ? pvpMeta.tokenStake : 0),
            totalTokensLost: (state.player.pvpRecord?.totalTokensLost ?? 0) + (isLoss ? pvpMeta.tokenStake : 0),
          },
        },
        matchHistory: [...state.matchHistory, pvpMatchResult].slice(-100),
        matchupTrackers: pvpUpdatedTrackers,
        trophyCase: updatedTrophyCase,
        classroom: { ...state.classroom, classmates: pvpUpdatedClassmates },
        dailyGoals: {
          ...state.dailyGoals,
          battlesWon: pvpBattlesWon,
          rewardClaimed: state.dailyGoals.rewardClaimed || pvpGoalsMet,
        },
      };
      pvpResult = logEvent(pvpResult, isWin ? 'pvp_battle_won' : isLoss ? 'pvp_battle_lost' : 'battle_lost');
      if (trophyCheck) pvpResult = logEvent(pvpResult, 'trophy_earned');
      if (pvpGoalsMet) {
        pvpResult = { ...pvpResult, notifications: [...pvpResult.notifications, { id: `goal_done_${Date.now()}`, message: `Daily goals complete! +${DAILY_GOAL_REWARD} tokens`, icon: '/assets/generated/final/reward_trophy_gold.png', timestamp: Date.now() }] };
      }
      return pvpResult;
    }
    case 'EARN_TICKET':
      return earnTicket(state, action.source);
    case 'RESET_DAILY_TICKETS':
      return {
        ...state,
        battleTickets: {
          ...state.battleTickets,
          todayEarned: 0,
          todayUsed: 0,
          mathForNextTicket: 0,
          careActionsToday: { fed: false, cleaned: false, played: false },
        },
      };
    case 'PLACE_TROPHY': {
      const trophy = state.trophyCase.trophies.find(t => t.id === action.trophyId);
      if (!trophy || !trophy.displayableInRoom) return state;
      if (state.trophyCase.displayedInRoom.length >= state.trophyCase.maxDisplay) return state;
      if (state.trophyCase.displayedInRoom.includes(action.trophyId)) return state;
      return {
        ...state,
        trophyCase: {
          ...state.trophyCase,
          displayedInRoom: [...state.trophyCase.displayedInRoom, action.trophyId],
        },
      };
    }
    case 'REMOVE_TROPHY':
      return {
        ...state,
        trophyCase: {
          ...state.trophyCase,
          displayedInRoom: state.trophyCase.displayedInRoom.filter(id => id !== action.trophyId),
        },
      };
    // --- Momentum Board actions ---
    case 'START_MOMENTUM': {
      const momentum = initMomentum(action.difficulty ?? 'medium');
      return { ...state, momentum, screen: 'momentum' };
    }
    case 'MOMENTUM_SET_DIFFICULTY': {
      const momentum = initMomentum(action.difficulty);
      return { ...state, momentum };
    }
    case 'MOMENTUM_SELECT_PIECE': {
      if (!state.momentum.active) return state;
      return { ...state, momentum: selectPiece(state.momentum, action.pieceId) };
    }
    case 'MOMENTUM_DESELECT_PIECE': {
      if (!state.momentum.active) return state;
      return { ...state, momentum: deselectPiece(state.momentum) };
    }
    case 'MOMENTUM_EXECUTE_MOVE': {
      if (!state.momentum.active) return state;
      return { ...state, momentum: beginMove(state.momentum, action.moveIndex) };
    }
    case 'MOMENTUM_SKIP_TURN': {
      if (!state.momentum.active) return state;
      return { ...state, momentum: skipTurn(state.momentum) };
    }
    case 'MOMENTUM_FLASH_CHOICE': {
      if (!state.momentum.active) return state;
      return { ...state, momentum: applyFlashChoice(state.momentum, action.choice, action.fusionTarget) };
    }
    case 'MOMENTUM_ANIMATION_DONE': {
      if (!state.momentum.active) return state;
      const momentum = advanceAfterAnimation(state.momentum);
      // Leave the UI on `ai_turn` — MomentumScreen will dispatch
      // MOMENTUM_AI_EXECUTE after a short delay so the "Enemy Turn" banner
      // can land before the enemy moves.
      return { ...state, momentum };
    }
    case 'MOMENTUM_AI_EXECUTE': {
      if (!state.momentum.active) return state;
      if (state.momentum.phase !== 'ai_turn') return state;

      // resolveCombat may leave activeTeam stale — ensure it's 'enemy'
      // so selectPiece accepts enemy pieces
      let momentum = { ...state.momentum, activeTeam: 'enemy' as const };
      const aiAction = selectAIAction(momentum);
      if (aiAction) {
        momentum = selectPiece(momentum, aiAction.pieceId);
        momentum = beginMove(momentum, aiAction.moveIndex);
        momentum = { ...momentum, phase: 'animating_ai' };
      } else {
        momentum = skipTurn(momentum);
      }
      return { ...state, momentum };
    }
    case 'END_MOMENTUM': {
      if (!state.momentum.active) return { ...state, momentum: { active: false }, screen: 'home' };
      const mRewards = state.momentum.rewards;
      const mPetWithXP = mRewards && state.pet ? addXP(state.pet, mRewards.xp) : state.pet;
      return {
        ...state,
        momentum: { active: false },
        screen: 'home',
        pet: mPetWithXP,
        player: mRewards ? {
          ...state.player,
          currencies: {
            ...state.player.currencies,
            tokens: state.player.currencies.tokens + mRewards.tokens,
            shards: state.player.currencies.shards + (mRewards.shards ?? 0),
          },
        } : state.player,
      };
    }
    // --- Help system actions ---
    case 'HELP_START_TUTORIAL': {
      if (state.help.completedTutorials.includes(action.featureId)) return state;
      const encountered = state.help.encounteredFeatures.includes(action.featureId)
        ? state.help.encounteredFeatures
        : [...state.help.encounteredFeatures, action.featureId];
      return { ...state, help: { ...state.help, encounteredFeatures: encountered } };
    }
    case 'HELP_ADVANCE_STEP':
      return state; // Step tracking is handled in React state, not engine state
    case 'HELP_COMPLETE_TUTORIAL': {
      if (state.help.completedTutorials.includes(action.featureId)) return state;
      return {
        ...state,
        help: {
          ...state.help,
          completedTutorials: [...state.help.completedTutorials, action.featureId],
        },
      };
    }
    case 'HELP_SKIP_TUTORIAL': {
      if (state.help.completedTutorials.includes(action.featureId)) return state;
      return {
        ...state,
        help: {
          ...state.help,
          completedTutorials: [...state.help.completedTutorials, action.featureId],
        },
      };
    }
    case 'HELP_ENCOUNTER_FEATURE': {
      if (state.help.encounteredFeatures.includes(action.featureId)) return state;
      return {
        ...state,
        help: {
          ...state.help,
          encounteredFeatures: [...state.help.encounteredFeatures, action.featureId],
        },
      };
    }
    case 'HELP_SHOW_HINT': {
      const count = (state.help.hintCounts[action.hintId] ?? 0) + 1;
      return {
        ...state,
        help: {
          ...state.help,
          hintCounts: { ...state.help.hintCounts, [action.hintId]: count },
          hintTimestamps: { ...state.help.hintTimestamps, [action.hintId]: Date.now() },
        },
      };
    }
    case 'COMPLETE_ONBOARDING': {
      const alreadyCompleted = state.player.hasOnboarded && !state.showOnboarding;
      if (alreadyCompleted) return state;
      const firstTime = !state.player.hasOnboarded;
      return {
        ...state,
        showOnboarding: false,
        player: {
          ...state.player,
          hasOnboarded: true,
          currencies: firstTime
            ? { ...state.player.currencies, tokens: state.player.currencies.tokens + 50 }
            : state.player.currencies,
        },
      };
    }
    case 'SHOW_ONBOARDING': {
      const ONBOARDING_ID = 'first-run-onboarding';
      return {
        ...state,
        showOnboarding: true,
        player: { ...state.player, hasOnboarded: false },
        help: {
          ...state.help,
          completedTutorials: state.help.completedTutorials.filter((id) => id !== ONBOARDING_ID),
        },
      };
    }
    case 'SHOW_DAILY_RITUAL':
      return { ...state, showDailyRitual: true };
    case 'DISMISS_DAILY_RITUAL':
      return { ...state, showDailyRitual: false };
    case 'DEV_SET_NEEDS':
      return state.pet
        ? {
            ...state,
            pet: {
              ...state.pet,
              needs: {
                ...state.pet.needs,
                ...action.payload,
              },
            },
          }
        : state;
    case 'DEV_FORCE_PET_STATE':
      return state.pet
        ? {
            ...state,
            pet: {
              ...state.pet,
              state: action.payload.state,
              mood: moodFromState(action.payload.state),
            },
          }
        : state;
    case 'DEV_JUMP_SCREEN':
      return {
        ...state,
        screen: action.payload,
      };
    case 'DEV_SET_STATE':
      return deepMerge(state as unknown as Record<string, unknown>, action.payload as unknown as Record<string, unknown>) as unknown as EngineState;
    case 'DEV_SET_SPEED':
    case 'DEV_SNAPSHOT_SAVE':
    case 'DEV_SNAPSHOT_LOAD':
      return state;

    // ── Pet Interaction System ──────────────────────────────────────
    case 'SET_HAND_MODE': {
      const interaction = state.interaction ?? createDefaultInteractionState();
      return { ...state, interaction: { ...interaction, activeMode: action.mode } };
    }
    case 'START_PET_INTERACTION': {
      if (!state.pet) return state;
      const interaction = state.interaction ?? createDefaultInteractionState();
      const check = canInteractCheck(state.pet, action.mode, interaction, state.player.currencies.tokens);
      if (!check.allowed) return state;
      // Don't apply stats yet — the care mini-game will do that via CARE_GAME_COMPLETE.
      // Just mark interaction as active so the game overlay mounts.
      return {
        ...state,
        interaction: {
          ...interaction,
          isInteracting: true,
          careGameActive: true,
          currentInteractionStart: Date.now(),
          activeMode: action.mode,
          petResponseAnim: action.mode !== 'idle' ? getPetResponseAnimFn(action.mode) : null,
        },
      };
    }
    case 'END_PET_INTERACTION': {
      const interaction = state.interaction ?? createDefaultInteractionState();
      // Don't end if a care game is still active — CARE_GAME_COMPLETE handles cleanup.
      if (interaction.careGameActive) return state;
      return { ...state, interaction: endInteractionFn(interaction) };
    }
    case 'CARE_GAME_COMPLETE': {
      if (!state.pet) return state;
      const interaction = state.interaction ?? createDefaultInteractionState();
      const check = canInteractCheck(state.pet, action.mode, interaction, state.player.currencies.tokens);
      if (!check.allowed) {
        return { ...state, interaction: endInteractionFn(interaction) };
      }
      const result = applyInteractionFn(state.pet, action.mode, interaction);
      const q = Math.max(0.1, action.quality);
      const scaledPet: typeof result.pet = {
        ...result.pet,
        bond: state.pet.bond + (result.pet.bond - state.pet.bond) * q,
        trust: (state.pet.trust ?? 20) + ((result.pet.trust ?? 20) - (state.pet.trust ?? 20)) * q,
        discipline: (state.pet.discipline ?? 0) + ((result.pet.discipline ?? 0) - (state.pet.discipline ?? 0)) * q,
        groomingScore: (state.pet.groomingScore ?? 50) + ((result.pet.groomingScore ?? 50) - (state.pet.groomingScore ?? 50)) * q,
        stress: (state.pet.stress ?? 0) + ((result.pet.stress ?? 0) - (state.pet.stress ?? 0)) * q,
        needs: {
          ...result.pet.needs,
          happiness: state.pet.needs.happiness + (result.pet.needs.happiness - state.pet.needs.happiness) * q,
          cleanliness: state.pet.needs.cleanliness + (result.pet.needs.cleanliness - state.pet.needs.cleanliness) * q,
        },
      };
      let next: EngineState = {
        ...state,
        pet: scaledPet,
        interaction: endInteractionFn(result.interactionState),
      };
      const scaledCost = Math.ceil(result.tokenCost * q);
      if (scaledCost > 0) next = deductTokens(next, scaledCost);
      next = logEvent(next, 'care_game_complete', { mode: action.mode, quality: action.quality });
      return next;
    }
    case 'UNLOCK_INTERACTION': {
      const interaction = state.interaction ?? createDefaultInteractionState();
      if (interaction.unlockedTools.includes(action.mode)) return state;
      return {
        ...state,
        interaction: {
          ...interaction,
          unlockedTools: [...interaction.unlockedTools, action.mode],
        },
      };
    }
    case 'UPGRADE_TOOL_TIER': {
      const interaction = state.interaction ?? createDefaultInteractionState();
      return {
        ...state,
        interaction: {
          ...interaction,
          equippedToolTiers: { ...interaction.equippedToolTiers, [action.mode]: action.tier },
        },
      };
    }

    // ---------- Quests ----------
    case 'REFRESH_QUESTS':
      return rollQuestsIfNeeded(state);
    case 'CLAIM_QUEST':
      return claimQuest(state, action.templateId);

    // ---------- Season Pass ----------
    case 'CLAIM_SEASON_TIER':
      return claimSeasonTier(state, action.tier);

    // ---------- Gacha / Cosmetics ----------
    case 'GACHA_PULL':
      return gachaPull(state).state;
    case 'GACHA_CRAFT':
      return gachaCraftWithShards(state, action.craftId).state;
    case 'EQUIP_COSMETIC':
      return equipCosmetic(state, action.petId, action.cosmeticId);
    case 'UNEQUIP_COSMETIC_SLOT':
      return unequipSlot(state, action.petId, action.slot);

    // ---------- Power Forge (MP sink) ----------
    case 'BUY_FORGE_UPGRADE': {
      const upgrade = POWER_FORGE_UPGRADES.find((u) => u.id === action.upgradeId);
      if (!upgrade) return state;
      const forge = state.player.powerForge ?? {};
      const currentLevel = forge[upgrade.id] ?? 0;
      const cost = nextForgeCost(upgrade, currentLevel);
      if (cost === null || state.player.currencies.mp < cost) return state;
      return {
        ...state,
        player: {
          ...state.player,
          currencies: { ...state.player.currencies, mp: state.player.currencies.mp - cost },
          powerForge: { ...forge, [upgrade.id]: currentLevel + 1 },
        },
        notifications: [
          ...state.notifications,
          {
            id: `forge_${upgrade.id}_${Date.now()}`,
            message: `Forged ${upgrade.label} L${currentLevel + 1}!`,
            icon: upgrade.icon,
            timestamp: Date.now(),
          },
        ],
      };
    }

    // ---------- Dex (foundation) ----------
    case 'DEX_MARK_SEEN':
      return dexMarkSeen(state, action.speciesId);
    case 'DEX_MARK_OWNED':
      return dexMarkOwned(state, action.speciesId);

    default:
      return state;
  }
};
