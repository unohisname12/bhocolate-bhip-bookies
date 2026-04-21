import React, { useState, useEffect, useRef } from 'react';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { getMPTier, MP_TIERS } from '../../config/mpConfig';
import { hasAnyMathBuffs } from '../../config/mathBuffConfig';
import type { Pet } from '../../types';
import type { MathBuffs } from '../../types/player';

interface TopHUDProps {
  pet: Pet;
  playerTokens: number;
  mp: number;
  mpLifetime: number;
  mathBuffs?: MathBuffs;
}

export const TopHUD: React.FC<TopHUDProps> = ({ pet, playerTokens, mp, mpLifetime, mathBuffs }) => {
  const tierName = getMPTier(mpLifetime);
  const tierConfig = MP_TIERS.find(t => t.name === tierName)!;

  // Tier-up banner — detect tier change via useEffect to avoid setState during render
  const prevTierRef = useRef(tierName);
  const [showTierUp, setShowTierUp] = useState(false);
  const [tierUpExiting, setTierUpExiting] = useState(false);

  useEffect(() => {
    if (prevTierRef.current !== tierName) {
      const wasBronze = prevTierRef.current === 'bronze';
      prevTierRef.current = tierName;
      if (wasBronze && tierName === 'silver') {
        setShowTierUp(true);
        setTierUpExiting(false);
        const t1 = setTimeout(() => setTierUpExiting(true), 1500);
        const t2 = setTimeout(() => setShowTierUp(false), 1900);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
    }
  }, [tierName]);

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
          {mathBuffs && hasAnyMathBuffs(mathBuffs) && (
            <div
              className="mt-1 rounded-lg border-2 border-amber-400/60 px-2.5 py-1 shadow-[0_0_14px_rgba(251,191,36,0.45)]"
              style={{
                background: 'linear-gradient(180deg, rgba(120,53,15,0.92) 0%, rgba(69,26,3,0.92) 100%)',
              }}
            >
              <div className="text-[9px] font-black uppercase tracking-widest text-amber-200">
                ⚔️ Math Prep
              </div>
              <div className="flex gap-2 text-[11px] font-black text-amber-100 mt-0.5">
                {mathBuffs.atk > 0 && <span>+{mathBuffs.atk} ATK</span>}
                {mathBuffs.def > 0 && <span>+{mathBuffs.def} DEF</span>}
                {mathBuffs.hp > 0 && <span>+{mathBuffs.hp} HP</span>}
              </div>
              <div className="text-[8px] font-semibold text-amber-300/80 mt-0.5 tracking-wide">
                applied next battle
              </div>
            </div>
          )}
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
