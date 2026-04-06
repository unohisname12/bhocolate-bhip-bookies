import React from 'react';
import { PetChamber } from '../components/pet/PetChamber';
import { PetSprite } from '../components/pet/PetSprite';
import { PetNeedsPanel } from '../components/pet/PetNeedsPanel';
import { IconBadge } from '../components/ui/IconBadge';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';
import { CARE_ACTIONS } from '../config/gameConfig';
import { getPetReadiness } from '../engine/systems/BattleSystem';
import { getXPForLevel, checkEvolution } from '../services/game/evolutionEngine';
import type { Pet } from '../types';
import type { DailyGoals } from '../types/engine';

const DAILY_MATH_GOAL = 3;
const DAILY_BATTLE_GOAL = 1;

interface PetHomeScreenProps {
  pet: Pet;
  playerTokens: number;
  dailyGoals: DailyGoals;
  ticketCount: number;
  onFeed: () => void;
  onPlay: () => void;
  onHeal: () => void;
  onClean: () => void;
  onTrain: () => void;
  onShop: () => void;
  onBattle: () => void;
  onArena: () => void;
}

export const PetHomeScreen: React.FC<PetHomeScreenProps> = ({
  pet,
  playerTokens,
  dailyGoals,
  ticketCount,
  onFeed,
  onPlay,
  onHeal,
  onClean,
  onTrain,
  onShop,
  onBattle,
  onArena,
}) => {
  const readiness = getPetReadiness(pet);
  const isReady = readiness >= 40;
  const readinessColor = readiness >= 70 ? 'text-green-400' : readiness >= 40 ? 'text-yellow-400' : 'text-red-400';
  const readinessLabel = readiness >= 70 ? 'Battle Ready!' : readiness >= 40 ? 'Somewhat Ready' : 'Too Weak!';

  const mathDone = Math.min(dailyGoals.mathSolved, DAILY_MATH_GOAL);
  const battleDone = Math.min(dailyGoals.battlesWon, DAILY_BATTLE_GOAL);
  const allGoalsDone = dailyGoals.rewardClaimed;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 pb-20 bg-slate-900 w-full max-w-lg mx-auto overflow-y-auto">

      {/* Header Info */}
      <div className="w-full flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 uppercase tracking-widest drop-shadow-md">
            {pet.name} <span className="text-lg text-purple-400">Lv.{pet.progression.level}</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {pet.state}
          </p>
        </div>
        <CurrencyDisplay amount={playerTokens} type="energy" />
      </div>

      {/* Main Chamber */}
      <div className="w-full relative z-10">
        <PetChamber variant="chamber">
          <PetSprite speciesId={pet.type} animationName={pet.state} />
        </PetChamber>
      </div>

      {/* Progression Panel */}
      {(() => {
        const xpNeeded = getXPForLevel(pet.progression.level);
        const xpPercent = Math.min(100, Math.round((pet.progression.xp / xpNeeded) * 100));
        const { canEvolve, nextStage } = checkEvolution(pet);
        const stageLabel = pet.stage.charAt(0).toUpperCase() + pet.stage.slice(1);
        return (
          <div className="w-full max-w-sm mx-auto mt-3 px-4 py-3 rounded-xl border-2 border-slate-600 bg-slate-800/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black text-slate-200 uppercase tracking-wide">
                Lv.{pet.progression.level} {stageLabel}
              </span>
              <span className="text-xs font-bold text-purple-400">Bond: {pet.bond}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 mb-1">
              <div
                className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{pet.progression.xp}/{xpNeeded} XP</span>
              {canEvolve && nextStage ? (
                <span className="text-yellow-400 font-bold animate-pulse">Ready to evolve!</span>
              ) : nextStage ? (
                <span>Next: {nextStage}</span>
              ) : null}
            </div>
          </div>
        );
      })()}

      {/* Battle Readiness Badge */}
      <div className={`w-full max-w-sm mx-auto mt-3 px-4 py-2 rounded-xl border-2 flex items-center justify-between ${isReady ? 'border-green-600 bg-green-900/30' : 'border-red-600 bg-red-900/30'}`}>
        <span className="text-sm font-bold text-slate-200 flex items-center gap-1"><img src="/assets/generated/final/effect_hit.png" alt="" className="w-4 h-4 inline" style={{ imageRendering: 'pixelated' }} /> Battle Readiness</span>
        <span className={`text-sm font-black ${readinessColor}`}>{readiness}% — {readinessLabel}</span>
      </div>

      {/* Daily Goals Panel */}
      <div className={`w-full max-w-sm mx-auto mt-3 px-4 py-3 rounded-xl border-2 ${allGoalsDone ? 'border-yellow-500 bg-yellow-900/20' : 'border-slate-600 bg-slate-800/60'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-black text-slate-200 uppercase tracking-wide">Daily Goals</span>
          {allGoalsDone && <span className="text-xs font-bold text-yellow-400 flex items-center gap-1"><img src="/assets/generated/final/icon_confirm_button.png" alt="" className="w-4 h-4 inline" style={{ imageRendering: 'pixelated' }} /> Complete! +50 <img src="/assets/generated/final/icon_token.png" alt="" className="w-3 h-3 inline" style={{ imageRendering: 'pixelated' }} /></span>}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-1"><img src="/assets/generated/final/math_number.png" alt="" className="w-4 h-4 inline" style={{ imageRendering: 'pixelated' }} /> Solve {DAILY_MATH_GOAL} math problems</span>
            <span className={`font-black ${mathDone >= DAILY_MATH_GOAL ? 'text-green-400' : 'text-slate-400'}`}>
              {mathDone}/{DAILY_MATH_GOAL}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-1"><img src="/assets/generated/final/effect_hit.png" alt="" className="w-4 h-4 inline" style={{ imageRendering: 'pixelated' }} /> Win {DAILY_BATTLE_GOAL} battle</span>
            <span className={`font-black ${battleDone >= DAILY_BATTLE_GOAL ? 'text-green-400' : 'text-slate-400'}`}>
              {battleDone}/{DAILY_BATTLE_GOAL}
            </span>
          </div>
        </div>
      </div>

      {/* Needs */}
      <PetNeedsPanel
        health={pet.needs.health}
        hunger={pet.needs.hunger}
        happiness={pet.needs.happiness}
        cleanliness={pet.needs.cleanliness}
      />

      {/* Action Menu */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur-md border-t-2 border-slate-700 z-30">
        <div className="max-w-lg mx-auto flex justify-between gap-2">
          <IconBadge
            icon="/assets/generated/final/icon_hunger.png"
            label="Feed"
            value={`${CARE_ACTIONS.feed.cost}`}
            color="bg-orange-600 text-white border-orange-800"
            onClick={pet.state === 'sleeping' ? undefined : onFeed}
            className="flex-1"
          />
          <IconBadge
            icon="/assets/generated/final/item_teddy_bear.png"
            label="Play"
            value={`${CARE_ACTIONS.play.cost}`}
            color="bg-blue-600 text-white border-blue-800"
            onClick={pet.state === 'sleeping' ? undefined : onPlay}
            className="flex-1"
          />
          <IconBadge
            icon="/assets/generated/final/icon_clean.png"
            label="Clean"
            value={`${CARE_ACTIONS.clean.cost}`}
            color="bg-cyan-600 text-white border-cyan-800"
            onClick={onClean}
            className="flex-1"
          />
          <IconBadge
            icon="/assets/generated/final/item_pill.png"
            label="Heal"
            value={`${CARE_ACTIONS.heal.cost}`}
            color="bg-red-600 text-white border-red-800"
            onClick={pet.state === 'dead' ? undefined : onHeal}
            className="flex-1"
          />
          <IconBadge
            icon="/assets/generated/final/icon_energy.png"
            label="Train"
            value="+"
            color="bg-purple-600 text-white border-purple-800"
            onClick={onTrain}
            className="flex-1"
          />
          <IconBadge
            icon="/assets/generated/final/reward_coin_stack.png"
            label="Shop"
            value=""
            color="bg-emerald-600 text-white border-emerald-800"
            onClick={onShop}
            className="flex-1"
          />
          <IconBadge
            icon="/assets/generated/final/icon_ticket.png"
            label="Arena"
            value={`${ticketCount}`}
            color="bg-rose-600 text-white border-rose-800"
            onClick={onArena}
            className="flex-1"
          />
          <IconBadge
            icon="/assets/generated/final/effect_hit.png"
            label="Practice"
            value=""
            color={`${!isReady ? 'bg-rose-900 text-rose-300 border-rose-950' : 'bg-slate-600 text-white border-slate-800'}`}
            onClick={pet.state === 'sick' || pet.state === 'dead' ? undefined : onBattle}
            className="flex-1"
          />
        </div>
      </div>

    </div>
  );
};
