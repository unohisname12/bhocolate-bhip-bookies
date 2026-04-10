import React, { useState, useEffect, useRef } from 'react';
import { SHOP_ITEMS, isShopItemUnlocked, describeUnlockRule } from '../config/shopConfig';
import type { ShopItemCategory, PlayerProgressSnapshot } from '../config/shopConfig';
import { GameButton } from '../components/ui/GameButton';
import { GameIcon } from '../components/ui/GameIcon';
import { getMPTier } from '../config/mpConfig';
import type { GameEngineAction } from '../engine/core/ActionTypes';

interface ShopScreenProps {
  tokens: number;
  coins: number;
  mpLifetime: number;
  /** Current pet level; used for level-gated item unlocks. */
  level: number;
  /** Lifetime PvP+wild wins; used for battle-count unlocks. */
  battlesWon: number;
  dispatch: (action: GameEngineAction) => void;
  onClose: () => void;
}

const CATEGORIES: { id: ShopItemCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'food', label: '🍎 Food' },
  { id: 'toy', label: '⚽ Toys' },
  { id: 'medicine', label: '💊 Medicine' },
  { id: 'cosmetic', label: '✨ Cosmetic' },
];

const SEEN_KEY = 'mp_shop_seen';

export const ShopScreen: React.FC<ShopScreenProps> = ({ tokens, coins, mpLifetime, level, battlesWon, dispatch, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<ShopItemCategory | 'all'>('all');
  const playerTier = getMPTier(mpLifetime);
  const progress: PlayerProgressSnapshot = { level, battlesWon, mpTier: playerTier };

  // Track which tier-gated items the player has seen
  const [seenItems, setSeenItems] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')); } catch { return new Set(); }
  });
  const newlyUnlocked = SHOP_ITEMS.filter(i => (i.unlockRule || i.requiredMPTier) && isShopItemUnlocked(i, progress));
  const hasNewRef = useRef(false);
  hasNewRef.current = newlyUnlocked.some(i => !seenItems.has(i.id));

  // Mark unlocked items as seen after a short delay so the "NEW" badge is visible on first open
  useEffect(() => {
    if (!hasNewRef.current) return;
    const timer = setTimeout(() => {
      const updated = new Set(seenItems);
      newlyUnlocked.forEach(i => updated.add(i.id));
      setSeenItems(updated);
      localStorage.setItem(SEEN_KEY, JSON.stringify([...updated]));
    }, 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show all items (locked ones render greyed out so players see a progression curve)
  const filtered = activeCategory === 'all'
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter((i) => i.category === activeCategory);

  const handleBuy = (itemId: string, tokenCost: number, coinCost: number) => {
    dispatch({ type: 'PURCHASE_ITEM', itemId, tokenCost, coinCost });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 w-full max-w-lg mx-auto p-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-slate-100 uppercase tracking-widest">Shop</h1>
        <div className="flex items-center gap-4">
          <span className="text-amber-400 font-black text-lg flex items-center gap-1">{tokens} <img src="/assets/generated/final/icon_token.png" alt="" className="w-5 h-5 inline" style={{ imageRendering: 'pixelated' }} /></span>
          <span className="text-cyan-400 font-black text-lg flex items-center gap-1">{coins} <img src="/assets/generated/final/icon_coin.png" alt="" className="w-5 h-5 inline" style={{ imageRendering: 'pixelated' }} /></span>
          <GameButton variant="secondary" size="sm" onClick={onClose}>✕</GameButton>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((item) => {
          const tokenCost = item.cost.tokens ?? 0;
          const coinCost = item.cost.coins ?? 0;
          const unlocked = isShopItemUnlocked(item, progress);
          const canAfford = unlocked && (tokenCost > 0 ? tokens >= tokenCost : coins >= coinCost);
          const isNew = unlocked && (item.unlockRule || item.requiredMPTier) && !seenItems.has(item.id);
          const unlockHint = !unlocked ? describeUnlockRule(item) : null;

          return (
            <div
              key={item.id}
              className={`relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${
                !unlocked
                  ? 'bg-slate-900/70 border-slate-800 opacity-60 cursor-not-allowed'
                  : isNew
                    ? 'animate-shop-new-glow bg-slate-700/60'
                    : canAfford
                      ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600 hover:-translate-y-0.5 cursor-pointer'
                      : 'bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed'
              } ${unlocked && !isNew && canAfford ? 'cursor-pointer' : ''}`}
              onClick={() => unlocked && canAfford && handleBuy(item.id, tokenCost, coinCost)}
            >
              {isNew && (
                <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                  New
                </span>
              )}
              {!unlocked && (
                <span className="absolute -top-2 -right-2 bg-slate-600 text-slate-200 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                  🔒 Locked
                </span>
              )}
              <GameIcon
                icon={item.icon}
                size="w-12 h-12"
                className={`text-4xl mb-2 drop-shadow-md ${!unlocked ? 'grayscale' : ''}`}
                alt={item.name}
              />
              <span className={`font-bold text-sm mb-1 ${unlocked ? 'text-slate-200' : 'text-slate-500'}`}>
                {item.name}
              </span>
              <p className={`text-xs text-center mb-2 ${unlocked ? 'text-slate-400' : 'text-slate-600'}`}>
                {unlocked ? item.description : unlockHint}
              </p>
              <div className="flex gap-2 text-xs font-black">
                {tokenCost > 0 && (
                  <span className={`flex items-center gap-0.5 ${unlocked && canAfford ? 'text-amber-400' : 'text-slate-500'}`}>
                    {tokenCost} <img src="/assets/generated/final/icon_token.png" alt="" className="w-3 h-3 inline" style={{ imageRendering: 'pixelated' }} />
                  </span>
                )}
                {coinCost > 0 && (
                  <span className={`flex items-center gap-0.5 ${unlocked && canAfford ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {coinCost} <img src="/assets/generated/final/icon_coin.png" alt="" className="w-3 h-3 inline" style={{ imageRendering: 'pixelated' }} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
