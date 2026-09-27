import { rewardMath } from '../../services/game/economy';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../core/ActionTypes';
import { COMPANIONS, isCompanion, isGrowingPet, stageIndex } from '../../config/companionConfig';
import { checkEvolution, evolvePet, addXP } from '../../services/game/evolutionEngine';
import { answerMatches, generateLearningProblem } from '../../services/game/curriculum';
import { careDate, getGrowth } from '../../services/game/petGrowth';

/** All evolution requirements, answers, collection changes and daily claims are
 * validated here, never trusted to disabled UI buttons or a submitted reward. */
export function reduceGrowth(state: EngineState, action: GameEngineAction, now = Date.now()): EngineState | null {
  const pet = state.pet;
  switch (action.type) {
    case 'CHOOSE_COMPANION_EGG':
      if (!state.devPreview && state.eggDiscovery) return state;
      if (pet || !state.egg || !isCompanion(action.speciesId)) return state;
      if ((state.companionRoster ?? []).some(p => p.speciesId === action.speciesId)) return state;
      return { ...state, egg: { ...state.egg, type: COMPANIONS[action.speciesId].egg } };
    case 'ADOPT_COMPANION': {
      if (!state.devPreview && state.mode !== 'test') return state;
      if (!isCompanion(action.speciesId) || state.egg || state.battle.active || state.run.active || state.momentum.active) return state;
      const owned = [...(state.companionRoster ?? []), ...(pet ? [pet] : [])];
      if (owned.some(p => p.speciesId === action.speciesId)) return state;
      return { ...state, companionRoster: owned, pet: null, growthTrial: null, player: { ...state.player, activePetId: null },
        egg: { id: `egg_${now}`, type: COMPANIONS[action.speciesId].egg, progress: 0, state: 'incubating', createdAt: new Date(now).toISOString() }, screen: 'incubation' };
    }
    case 'SWITCH_COMPANION': {
      if (state.egg || state.battle.active || state.run.active || state.momentum.active) return state;
      const roster = state.companionRoster ?? [], target = roster.find(p => p.id === action.petId);
      if (!target) return state;
      return { ...state, pet: target, companionRoster: [...roster.filter(p => p.id !== target.id), ...(pet ? [pet] : [])],
        player: { ...state.player, activePetId: target.id }, growthTrial: null, screen: 'home' };
    }
    case 'START_GROWTH_TRIAL': {
      if (!pet || pet.state === 'dead' || state.battle.active || state.run.active || state.momentum.active) return state;
      if (state.growthTrial && !state.growthTrial.complete && state.growthTrial.petId === pet.id) return { ...state, screen: 'growth' };
      if (action.kind === 'evolution' && !checkEvolution(pet, state.player.lifetimeMathCorrect, now).canEvolve) return state;
      if (action.kind === 'expedition' && (stageIndex(pet.stage) < 2 || getGrowth(pet, now).lastExpeditionDay === careDate(now))) return state;
      const count = action.kind === 'expedition' ? 5 : pet.stage === 'baby' ? 3 : 5;
      return { ...state, screen: 'growth', growthTrial: { petId: pet.id, stage: pet.stage, kind: action.kind, index: 0, complete: false, feedback: '',
        problems: Array.from({ length: count }, () => generateLearningProblem(state.learning)) } };
    }
    case 'ANSWER_GROWTH_TRIAL': {
      const trial = state.growthTrial;
      if (!pet || pet.state === 'dead' || !trial || trial.complete || trial.petId !== pet.id || trial.stage !== pet.stage) return state;
      if (state.battle.active || state.run.active || state.momentum.active) return state;
      const problem = trial.problems[trial.index];
      if (!problem || problem.id !== action.questionId) return state;
      state = rewardMath(state, problem, answerMatches(action.answer, problem.answer, problem.question), trial.kind);
      if (!answerMatches(action.answer, problem.answer, problem.question)) return { ...state, growthTrial: { ...trial, feedback: 'Try again. Your lit stars are safe. Take your time.' } };
      const index = trial.index + 1, complete = index === trial.problems.length;
      if (!complete) return { ...state, growthTrial: { ...trial, index, feedback: 'One more spark of growth!' } };
      if (trial.kind === 'evolution') {
        const evolved = evolvePet(state.pet!, state.player.lifetimeMathCorrect, now);
        if (evolved === state.pet) return { ...state, growthTrial: null };
        return { ...state, pet: evolved, growthTrial: { ...trial, index, complete: true, feedback: `${pet.name} evolved to ${evolved.stage}!` },
          notifications: [...state.notifications, { id: `evolution_${pet.id}_${evolved.stage}`, message: `${pet.name} evolved! New power and activity unlocked.`, icon: '/assets/woodland-v1/icon-heart.png', timestamp: now }] };
      }
      const growth = getGrowth(pet, now);
      if (stageIndex(pet.stage) < 2 || growth.lastExpeditionDay === careDate(now)) return { ...state, growthTrial: null };
      return { ...state, pet: { ...state.pet!, growth: { ...growth, lastExpeditionDay: careDate(now) } },
        growthTrial: { ...trial, index, complete: true, feedback: 'Expedition complete! Your math tokens, MP and pet growth are saved.' } };
    }
    case 'CLOSE_GROWTH_TRIAL': return { ...state, growthTrial: null };
    case 'USE_COMPANION_GIFT': {
      if (!pet || pet.state === 'dead' || stageIndex(pet.stage) < 1 || !isGrowingPet(pet.speciesId)) return state;
      if (state.battle.active || state.run.active || state.momentum.active) return state;
      const growth = getGrowth(pet, now);
      if (growth.lastGiftDay === careDate(now)) return state;
      return { ...state, pet: { ...addXP(pet, 25), needs: { ...pet.needs, happiness: Math.min(100, pet.needs.happiness + 20), health: Math.min(100, pet.needs.health + 15) }, growth: { ...growth, lastGiftDay: careDate(now) } } };
    }
    default: return null;
  }
}
