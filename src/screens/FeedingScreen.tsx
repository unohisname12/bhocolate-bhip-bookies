import React, { useState, useMemo } from 'react';
import { Modal } from '../components/ui/Modal';
import { GameButton } from '../components/ui/GameButton';
import { GameIcon } from '../components/ui/GameIcon';
import { FOOD_ITEMS } from '../config/gameConfig';
import { getMPTier } from '../config/mpConfig';
import type { FoodItem, FoodRarity, FoodMathTier } from '../types';

interface FeedingScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onFeed: (foodId: string, energyCost: number, nutrition: number) => void;
  currentTokens: number;
  mpLifetime: number;
}

const TAB_ORDER: FoodRarity[] = ['common', 'rare', 'medicine'];
const TAB_LABELS: Record<FoodRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  medicine: 'Medicine',
};

const TIER_RANK: Record<FoodMathTier | 'bronze' | 'silver' | 'gold', number> = {
  none: 0,
  bronze: 0,
  silver: 1,
  gold: 2,
};

const tierUnlocked = (required: FoodItem['requiredMathTier'], playerTier: 'bronze' | 'silver' | 'gold'): boolean => {
  if (!required || required === 'none') return true;
  return TIER_RANK[playerTier] >= TIER_RANK[required];
};

const tierLabel = (tier: FoodMathTier): string =>
  tier === 'gold' ? 'gold' : tier === 'silver' ? 'silver' : tier;

export const FeedingScreen: React.FC<FeedingScreenProps> = ({
  isOpen,
  onClose,
  onFeed,
  currentTokens,
  mpLifetime,
}) => {
  const [activeTab, setActiveTab] = useState<FoodRarity>('common');
  const playerTier = getMPTier(mpLifetime);

  const filtered = useMemo(
    () => FOOD_ITEMS.filter((f) => (f.rarity ?? 'common') === activeTab),
    [activeTab],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Feed Pet"
      footer={
        <GameButton variant="secondary" onClick={onClose} fullWidth>
          Cancel
        </GameButton>
      }
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-sm">Available Energy:</span>
        <span className="text-amber-400 font-black text-xl flex items-center gap-1">
          {currentTokens} <img src="/assets/generated/final/icon_token.png" alt="" className="w-5 h-5 inline" style={{ imageRendering: 'pixelated' }} />
        </span>
      </div>

      <div className="flex gap-2 mb-4">
        {TAB_ORDER.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'bg-cyan-600 text-white shadow'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((food) => {
          const unlocked = tierUnlocked(food.requiredMathTier, playerTier);
          const canAfford = currentTokens >= food.cost;
          const clickable = unlocked && canAfford;

          return (
            <div
              key={food.id}
              onClick={() => {
                if (clickable) {
                  onFeed(food.id, food.cost, food.nutrition);
                  onClose();
                }
              }}
              className={`
                relative flex flex-col items-center justify-center p-4 rounded-2xl
                border-2 transition-all duration-200
                ${!unlocked
                  ? 'bg-slate-900/70 border-slate-800 opacity-60 cursor-not-allowed'
                  : clickable
                    ? 'bg-slate-700/50 border-slate-600 cursor-pointer hover:bg-slate-600 hover:-translate-y-1 active:translate-y-0 shadow-lg'
                    : 'bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed grayscale'}
              `}
            >
              {!unlocked && food.requiredMathTier && food.requiredMathTier !== 'none' && (
                <span className="absolute -top-2 -right-2 bg-slate-600 text-slate-100 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                  🔒 {tierLabel(food.requiredMathTier)}
                </span>
              )}
              <GameIcon
                icon={food.icon}
                size="w-12 h-12"
                className={`text-4xl drop-shadow-md mb-2 ${!unlocked ? 'grayscale' : ''}`}
                alt={food.label}
              />
              <span className={`font-bold mb-1 ${unlocked ? 'text-slate-200' : 'text-slate-500'}`}>
                {food.label}
              </span>
              {!unlocked ? (
                <span className="text-[11px] text-slate-500 text-center leading-tight">
                  Reach {tierLabel(food.requiredMathTier!)} math tier
                </span>
              ) : (
                <div className="flex flex-wrap justify-center gap-2 text-xs font-black">
                  <span className={`flex items-center gap-0.5 ${canAfford ? 'text-amber-400' : 'text-slate-500'}`}>
                    -{food.cost}<img src="/assets/generated/final/icon_token.png" alt="" className="w-3 h-3 inline" style={{ imageRendering: 'pixelated' }} />
                  </span>
                  <span className="flex items-center gap-0.5 text-green-400">
                    +{food.nutrition}<img src="/assets/generated/final/icon_hunger.png" alt="" className="w-3 h-3 inline" style={{ imageRendering: 'pixelated' }} />
                  </span>
                  {food.happinessBonus ? (
                    <span className="flex items-center gap-0.5 text-pink-400">
                      +{food.happinessBonus}<img src="/assets/generated/final/icon_happiness.png" alt="" className="w-3 h-3 inline" style={{ imageRendering: 'pixelated' }} />
                    </span>
                  ) : null}
                  {food.bondBonus ? (
                    <span className="flex items-center gap-0.5 text-rose-300">
                      +{food.bondBonus}💖
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center text-slate-500 text-sm italic py-8">
            No items in this category yet.
          </div>
        )}
      </div>
    </Modal>
  );
};
