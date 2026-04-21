import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  /** Pet bond level; used for bond-gated unlocks. */
  bond: number;
  dispatch: (action: GameEngineAction) => void;
  onClose: () => void;
}

interface PurchaseFloat {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

const CATEGORIES: { id: ShopItemCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'food', label: '🍎 Food' },
  { id: 'toy', label: '⚽ Toys' },
  { id: 'medicine', label: '💊 Medicine' },
  { id: 'cosmetic', label: '✨ Cosmetic' },
  { id: 'care_tool', label: '🧼 Care' },
];

const SEEN_KEY = 'mp_shop_seen';

let floatIdCounter = 0;

export const ShopScreen: React.FC<ShopScreenProps> = ({ tokens, coins, mpLifetime, level, battlesWon, bond, dispatch, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<ShopItemCategory | 'all'>('all');
  const playerTier = getMPTier(mpLifetime);
  const progress: PlayerProgressSnapshot = { level, battlesWon, mpTier: playerTier, bond };

  // Purchase feedback
  const [floats, setFloats] = useState<PurchaseFloat[]>([]);
  const [currencyPulse, setCurrencyPulse] = useState<'tokens' | 'coins' | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Cleanup pulse timer
  useEffect(() => {
    return () => { if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current); };
  }, []);

  // Show all items (locked ones render greyed out so players see a progression curve)
  const filtered = activeCategory === 'all'
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter((i) => i.category === activeCategory);

  const handleBuy = useCallback((itemId: string, tokenCost: number, coinCost: number, e: React.MouseEvent) => {
    dispatch({ type: 'PURCHASE_ITEM', itemId, tokenCost, coinCost });

    // Spawn floating cost text at click position
    const cost = tokenCost > 0 ? tokenCost : coinCost;
    const currency = tokenCost > 0 ? 'tokens' : 'coins';
    const id = ++floatIdCounter;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFloats(prev => [...prev, {
      id,
      text: `-${cost}`,
      color: currency === 'tokens' ? '#fbbf24' : '#22d3ee',
      x: rect.left + rect.width / 2,
      y: rect.top,
    }]);
    // Remove after animation
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1000);

    // Pulse the currency counter
    setCurrencyPulse(currency);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setCurrencyPulse(null), 500);
  }, [dispatch]);

  return (
    <div
      className="relative flex flex-col min-h-screen w-full max-w-lg mx-auto bg-slate-900"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.92)), url('/assets/generated/final/scene_shop_interior.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Sticky header — always visible while scrolling */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm px-4 pt-4 pb-2 border-b border-slate-800/50">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-black text-slate-100 uppercase tracking-widest">Shop</h1>
          <div className="flex items-center gap-4">
            <span className={`text-amber-400 font-black text-lg flex items-center gap-1 transition-transform ${currencyPulse === 'tokens' ? 'animate-shop-spend' : ''}`}>
              {tokens} <img src="/assets/generated/final/icon_token.png" alt="" className="w-5 h-5 inline" style={{ imageRendering: 'pixelated' }} />
            </span>
            <span className={`text-cyan-400 font-black text-lg flex items-center gap-1 transition-transform ${currencyPulse === 'coins' ? 'animate-shop-spend' : ''}`}>
              {coins} <img src="/assets/generated/final/icon_coin.png" alt="" className="w-5 h-5 inline" style={{ imageRendering: 'pixelated' }} />
            </span>
            <GameButton variant="secondary" size="sm" onClick={onClose}>✕</GameButton>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
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
      </div>

      {/* Item grid */}
      <div className="grid grid-cols-2 gap-3 p-4 pb-20">
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
              onClick={(e) => unlocked && canAfford && handleBuy(item.id, tokenCost, coinCost, e)}
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

      {/* Floating purchase cost text */}
      {floats.map((f) => (
        <div
          key={f.id}
          className="fixed pointer-events-none z-50 animate-shop-cost-float"
          style={{
            left: f.x,
            top: f.y,
            color: f.color,
            fontWeight: 900,
            fontSize: 22,
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            transform: 'translateX(-50%)',
          }}
        >
          {f.text}
        </div>
      ))}
    </div>
  );
};
