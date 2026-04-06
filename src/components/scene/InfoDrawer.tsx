import React, { useState } from 'react';
import { PetNeedsPanel } from '../pet/PetNeedsPanel';
import { getPetReadiness } from '../../engine/systems/BattleSystem';
import { getXPForLevel, checkEvolution } from '../../services/game/evolutionEngine';
import type { Pet } from '../../types';
import type { DailyGoals } from '../../types/engine';

const DAILY_MATH_GOAL = 3;
const DAILY_BATTLE_GOAL = 1;

interface InfoDrawerProps {
  pet: Pet;
  dailyGoals: DailyGoals;
}

/**
 * Minimal stat display — small icon+bar pairs in the top-left corner.
 * Tap to expand into a full detail panel. Doesn't block the game view.
 */
export const InfoDrawer: React.FC<InfoDrawerProps> = ({ pet, dailyGoals }) => {
  const [isOpen, setIsOpen] = useState(false);

  const readiness = getPetReadiness(pet);
  const xpNeeded = getXPForLevel(pet.progression.level);
  const xpPercent = Math.min(100, Math.round((pet.progression.xp / xpNeeded) * 100));
  const { canEvolve, nextStage } = checkEvolution(pet);
  const stageLabel = pet.stage.charAt(0).toUpperCase() + pet.stage.slice(1);

  const mathDone = Math.min(dailyGoals.mathSolved, DAILY_MATH_GOAL);
  const battleDone = Math.min(dailyGoals.battlesWon, DAILY_BATTLE_GOAL);
  const allGoalsDone = dailyGoals.rewardClaimed;

  const stats = [
    { icon: '/assets/generated/final/icon_heart.png', value: pet.needs.health, color: 'bg-red-500' },
    { icon: '/assets/generated/final/icon_hunger.png', value: pet.needs.hunger, color: 'bg-orange-500' },
    { icon: '/assets/generated/final/icon_clean.png', value: pet.needs.happiness, color: 'bg-yellow-400' },
    { icon: '/assets/generated/final/icon_clean.png', value: pet.needs.cleanliness, color: 'bg-sky-400' },
  ];

  return (
    <>
      {/* Compact stat bars — top-left, below pet name */}
      <div className="fixed top-[52px] left-0 z-30 pointer-events-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-col gap-0.5 px-3 py-1"
        >
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <img
                src={s.icon}
                alt=""
                className="w-3.5 h-3.5"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="w-14 h-1.5 rounded-full bg-black/40 overflow-hidden">
                <div
                  className={`h-full rounded-full ${s.color}`}
                  style={{ width: `${s.value}%` }}
                />
              </div>
              <span className="text-[9px] font-bold text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] w-6 text-right">
                {Math.round(s.value)}
              </span>
            </div>
          ))}
          {/* XP bar */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-black text-purple-300 w-3.5 text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">XP</span>
            <div className="w-14 h-1.5 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] w-6 text-right">
              {xpPercent}%
            </span>
          </div>
        </button>
      </div>

      {/* Expanded detail panel — overlays from left side */}
      {isOpen && (
        <div className="fixed inset-0 z-[35] pointer-events-auto" onClick={() => setIsOpen(false)}>
          <div
            className="absolute top-[52px] left-2 w-64 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/60 p-3 space-y-3 max-h-[60vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progression */}
            <div className="px-2 py-2 rounded-lg border border-slate-600 bg-slate-800/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-slate-200 uppercase tracking-wide">
                  Lv.{pet.progression.level} {stageLabel}
                </span>
                <span className="text-[10px] font-bold text-purple-400">Bond: {pet.bond}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>{pet.progression.xp}/{xpNeeded} XP</span>
                {canEvolve && nextStage ? (
                  <span className="text-yellow-400 font-bold animate-pulse">Ready to evolve!</span>
                ) : nextStage ? (
                  <span>Next: {nextStage}</span>
                ) : null}
              </div>
            </div>

            {/* Battle Readiness */}
            <div className={`px-2 py-1.5 rounded-lg border flex items-center justify-between text-xs ${readiness >= 40 ? 'border-green-600 bg-green-900/30' : 'border-red-600 bg-red-900/30'}`}>
              <span className="font-bold text-slate-200">Battle Ready</span>
              <span className={`font-black ${readiness >= 70 ? 'text-green-400' : readiness >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {readiness}%
              </span>
            </div>

            {/* Daily Goals */}
            <div className={`px-2 py-1.5 rounded-lg border text-xs ${allGoalsDone ? 'border-yellow-500 bg-yellow-900/20' : 'border-slate-600 bg-slate-800/60'}`}>
              <div className="font-black text-slate-200 uppercase tracking-wide mb-1">Daily Goals</div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Solve {DAILY_MATH_GOAL} math</span>
                  <span className={`font-black ${mathDone >= DAILY_MATH_GOAL ? 'text-green-400' : 'text-slate-400'}`}>
                    {mathDone}/{DAILY_MATH_GOAL}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Win {DAILY_BATTLE_GOAL} battle</span>
                  <span className={`font-black ${battleDone >= DAILY_BATTLE_GOAL ? 'text-green-400' : 'text-slate-400'}`}>
                    {battleDone}/{DAILY_BATTLE_GOAL}
                  </span>
                </div>
              </div>
            </div>

            {/* Full needs panel */}
            <PetNeedsPanel
              health={pet.needs.health}
              hunger={pet.needs.hunger}
              happiness={pet.needs.happiness}
              cleanliness={pet.needs.cleanliness}
            />
          </div>
        </div>
      )}
    </>
  );
};
