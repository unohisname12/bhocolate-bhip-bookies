import React from 'react';
import { POWER_FORGE_UPGRADES, nextForgeCost } from '../config/powerForgeConfig';
import type { PowerForgeUpgradeId } from '../config/powerForgeConfig';
import { GameButton } from '../components/ui/GameButton';
import { getMPTier, MP_TIERS } from '../config/mpConfig';
import type { GameEngineAction } from '../engine/core/ActionTypes';

interface PowerForgeScreenProps {
  mp: number;
  mpLifetime: number;
  forge: Partial<Record<PowerForgeUpgradeId, number>> | undefined;
  dispatch: (action: GameEngineAction) => void;
  onClose: () => void;
}

export const PowerForgeScreen: React.FC<PowerForgeScreenProps> = ({
  mp,
  mpLifetime,
  forge,
  dispatch,
  onClose,
}) => {
  const tier = getMPTier(mpLifetime);
  const tierLabel = MP_TIERS.find((t) => t.name === tier)?.label ?? 'Bronze';

  return (
    <div className="min-h-screen w-full max-w-lg mx-auto bg-slate-900 text-white p-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <GameButton variant="secondary" size="sm" onClick={onClose}>← Back</GameButton>
        <h1 className="text-lg font-black uppercase tracking-wider">🧠 Power Forge</h1>
        <span className="text-xs text-slate-400">{tierLabel} tier</span>
      </div>

      <div className="rounded-2xl bg-slate-800/70 border border-slate-700 p-3 mb-5 text-center">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Math Points</div>
        <div className="text-2xl font-black text-cyan-300">{mp}</div>
        <p className="text-[11px] text-slate-500 mt-1">
          MP earned from every math question. Spend it here on permanent pet buffs.
        </p>
      </div>

      <div className="space-y-3">
        {POWER_FORGE_UPGRADES.map((upgrade) => {
          const currentLevel = forge?.[upgrade.id] ?? 0;
          const maxLevel = upgrade.costs.length;
          const cost = nextForgeCost(upgrade, currentLevel);
          const maxed = cost === null;
          const canAfford = !maxed && mp >= cost!;

          return (
            <div
              key={upgrade.id}
              className="rounded-2xl border-2 border-slate-700 bg-slate-800/60 p-3 flex items-center gap-3"
            >
              <div className="text-3xl w-10 text-center">{upgrade.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-slate-100 text-sm">{upgrade.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    L{currentLevel} / {maxLevel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{upgrade.description}</p>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${(currentLevel / maxLevel) * 100}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={maxed || !canAfford}
                onClick={() => dispatch({ type: 'BUY_FORGE_UPGRADE', upgradeId: upgrade.id })}
                className={`px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition ${
                  maxed
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : canAfford
                      ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {maxed ? 'Maxed' : `${cost} MP`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
