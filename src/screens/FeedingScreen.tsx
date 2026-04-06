import React from 'react';
import { Modal } from '../components/ui/Modal';
import { GameButton } from '../components/ui/GameButton';
import { GameIcon } from '../components/ui/GameIcon';
import { FOOD_ITEMS } from '../config/gameConfig';

interface FeedingScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onFeed: (foodId: string, energyCost: number, nutrition: number) => void;
  currentTokens: number;
}

export const FeedingScreen: React.FC<FeedingScreenProps> = ({
  isOpen,
  onClose,
  onFeed,
  currentTokens,
}) => {
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
      <div className="flex justify-between items-center mb-6">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-sm">Available Energy:</span>
        <span className="text-amber-400 font-black text-xl flex items-center gap-1">
          {currentTokens} <img src="/assets/generated/final/icon_token.png" alt="" className="w-5 h-5 inline" style={{ imageRendering: 'pixelated' }} />
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {FOOD_ITEMS.map((food) => {
          const canAfford = currentTokens >= food.cost;
          
          return (
            <div 
              key={food.id}
              onClick={() => {
                if (canAfford) {
                  onFeed(food.id, food.cost, food.nutrition);
                  onClose();
                }
              }}
              className={`
                flex flex-col items-center justify-center p-4 rounded-2xl
                border-2 transition-all duration-200
                ${canAfford 
                  ? 'bg-slate-700/50 border-slate-600 cursor-pointer hover:bg-slate-600 hover:-translate-y-1 active:translate-y-0 shadow-lg' 
                  : 'bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed grayscale'}
              `}
            >
              <GameIcon icon={food.icon} size="w-12 h-12" className="text-4xl drop-shadow-md mb-2" alt={food.label} />
              <span className="font-bold text-slate-200 mb-1">{food.label}</span>
              <div className="flex gap-2 text-xs font-black">
                <span className={`flex items-center gap-0.5 ${canAfford ? 'text-amber-400' : 'text-slate-500'}`}>
                  -{food.cost}<img src="/assets/generated/final/icon_token.png" alt="" className="w-3 h-3 inline" style={{ imageRendering: 'pixelated' }} />
                </span>
                <span className="flex items-center gap-0.5 text-green-400">
                  +{food.nutrition}<img src="/assets/generated/final/icon_hunger.png" alt="" className="w-3 h-3 inline" style={{ imageRendering: 'pixelated' }} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
