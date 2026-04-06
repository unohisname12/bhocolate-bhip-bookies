import React, { useState } from 'react';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { getMPTier, MP_TIERS } from '../../config/mpConfig';
import type { Pet } from '../../types';

interface TopHUDProps {
  pet: Pet;
  playerTokens: number;
  mp: number;
  mpLifetime: number;
}

export const TopHUD: React.FC<TopHUDProps> = ({ pet, playerTokens, mp, mpLifetime }) => {
  const tierName = getMPTier(mpLifetime);
  const tierConfig = MP_TIERS.find(t => t.name === tierName)!;

  // Tier-up banner — track previous tier in state, schedule dismiss via setTimeout
  const [prevTier, setPrevTier] = useState(tierName);
  const [showTierUp, setShowTierUp] = useState(false);
  const [tierUpExiting, setTierUpExiting] = useState(false);
  if (prevTier !== tierName) {
    setPrevTier(tierName);
    if (prevTier === 'bronze' && tierName === 'silver') {
      setShowTierUp(true);
      setTierUpExiting(false);
      setTimeout(() => setTierUpExiting(true), 1500);
      setTimeout(() => setShowTierUp(false), 1900);
    }
  }

  return (
    <div className="fixed top-0 inset-x-0 z-30 pointer-events-none">
      <div className="max-w-lg mx-auto flex justify-between items-start px-3 py-2">
        {/* Pet identity — top-left */}
        <div className="pointer-events-auto">
          <div className="text-sm font-black text-white uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {pet.name}
            <span className="text-purple-300 ml-1.5 text-xs">Lv.{pet.progression.level}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-300/80 uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {pet.state}
          </div>
        </div>

        {/* Currencies — top-right */}
        <div className="pointer-events-auto flex flex-col gap-1 items-end">
          <CurrencyDisplay amount={playerTokens} type="energy" />
          <div key={mp} className="flex items-center gap-1.5 animate-mp-pulse">
            <CurrencyDisplay amount={mp} type="mp" />
            <span className={`text-xs font-black uppercase tracking-wider ${tierConfig.color} drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]`}>
              {tierConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Tier-up banner */}
      {showTierUp && (
        <div className={`flex justify-center mt-4 ${tierUpExiting ? 'animate-tier-up-out' : 'animate-tier-up-in'}`}>
          <div className="bg-slate-800/95 border-2 border-slate-300 rounded-xl px-6 py-3 text-center shadow-[0_0_20px_rgba(148,163,184,0.4)]">
            <div className="text-slate-200 font-black text-lg uppercase tracking-widest">Silver Tier Reached</div>
            <div className="text-slate-400 text-xs mt-1">New items unlocked!</div>
          </div>
        </div>
      )}
    </div>
  );
};
