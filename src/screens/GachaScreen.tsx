import React, { useState } from 'react';
import type { EngineState } from '../engine/core/EngineTypes';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import type { CosmeticRarity } from '../types/cosmetic';
import {
  COSMETICS,
  GACHA_PULL_COST,
  GACHA_PULL_MP_COST,
  SHARD_CRAFT_OPTIONS,
} from '../config/cosmeticConfig';

interface GachaScreenProps {
  state: EngineState;
  dispatch: (action: GameEngineAction) => void;
  onClose: () => void;
}

const RARITY_STYLE: Record<CosmeticRarity, { bg: string; border: string; text: string; label: string }> = {
  common:    { bg: 'rgba(120,140,180,0.25)', border: 'rgba(160,180,220,0.5)',  text: '#cbd5e1', label: 'Common' },
  rare:      { bg: 'rgba(59,130,246,0.25)',  border: 'rgba(96,165,250,0.6)',   text: '#93c5fd', label: 'Rare' },
  epic:      { bg: 'rgba(168,85,247,0.3)',   border: 'rgba(192,132,252,0.7)',  text: '#d8b4fe', label: 'Epic' },
  legendary: { bg: 'rgba(245,158,11,0.35)',  border: 'rgba(251,191,36,0.9)',   text: '#fcd34d', label: 'Legendary' },
};

type Tab = 'pull' | 'forge';

export const GachaScreen: React.FC<GachaScreenProps> = ({ state, dispatch, onClose }) => {
  const [tab, setTab] = useState<Tab>('pull');
  const [pulling, setPulling] = useState(false);

  const tokens = state.player.currencies.tokens;
  const mp = state.player.currencies.mp;
  const shards = state.player.currencies.shards;

  const canAffordTokens = tokens >= GACHA_PULL_COST;
  const canAffordMP = mp >= GACHA_PULL_MP_COST;
  const canPull = canAffordTokens && canAffordMP;

  const activePet = state.pet;
  const equipped = activePet ? state.cosmetics.equipped[activePet.id] ?? {} : {};
  const owned = new Set(state.cosmetics.owned.map((c) => c.cosmeticId));
  const ownedCount = owned.size;

  const doPull = () => {
    if (!canPull || pulling) return;
    setPulling(true);
    dispatch({ type: 'GACHA_PULL' });
    setTimeout(() => setPulling(false), 650);
  };

  const doCraft = (craftId: string) => {
    if (pulling) return;
    setPulling(true);
    dispatch({ type: 'GACHA_CRAFT', craftId });
    setTimeout(() => setPulling(false), 650);
  };

  return (
    <div
      className="min-h-screen text-white p-4 pb-20"
      style={{ background: 'linear-gradient(180deg, #050817 0%, #1a0a30 100%)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-bold"
        >
          ← Back
        </button>
        <h1 className="text-lg font-black">🥚 Mystery Egg</h1>
        <div className="text-[11px] text-slate-400">
          🪙 {tokens} · 🧠 {mp} · 💎 {shards}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['pull', 'forge'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${
              tab === t ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {t === 'pull' ? 'Pull' : 'Forge (Shards)'}
          </button>
        ))}
      </div>

      {tab === 'pull' && (
        <div
          className="rounded-2xl p-4 mb-4 text-center"
          style={{
            background: 'radial-gradient(circle at center, rgba(168,85,247,0.3) 0%, rgba(15,10,40,0.95) 70%)',
            border: '1px solid rgba(192,132,252,0.4)',
          }}
        >
          <div className={`text-7xl my-2 ${pulling ? 'animate-bounce' : ''}`}>🥚</div>
          <div className="text-sm font-bold">Mystery Cosmetic Egg</div>
          <div className="text-[11px] text-slate-300 mb-3">
            A random cosmetic for your pet. Costs tokens + MP (math gates new pets).
          </div>
          <button
            disabled={!canPull || pulling}
            onClick={doPull}
            className={`px-6 py-2.5 rounded-xl font-black text-sm ${
              canPull
                ? 'bg-gradient-to-b from-purple-500 to-purple-700 hover:from-purple-400 text-white shadow-lg shadow-purple-900/50'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {pulling ? 'Hatching...' : `Pull · ${GACHA_PULL_COST} 🪙 + ${GACHA_PULL_MP_COST} 🧠`}
          </button>
          {!canAffordMP && (
            <div className="mt-2 text-[11px] text-cyan-300">
              Not enough MP — train in the Math Arena to earn more.
            </div>
          )}
          <div className="mt-2 text-[10px] text-slate-500">
            Pity: Rare in {Math.max(0, 8 - state.cosmetics.gachaPullsSinceRare)} · Epic in {Math.max(0, 30 - state.cosmetics.gachaPullsSinceEpic)}
          </div>
        </div>
      )}

      {tab === 'forge' && (
        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: 'radial-gradient(circle at center, rgba(34,211,238,0.15) 0%, rgba(10,20,40,0.95) 70%)',
            border: '1px solid rgba(34,211,238,0.35)',
          }}
        >
          <div className="text-xs text-slate-300 mb-3 text-center">
            Trade duplicate-pull shards 💎 for a guaranteed-rarity pull. No tokens, no MP — pure shard alchemy.
          </div>
          <div className="space-y-2">
            {SHARD_CRAFT_OPTIONS.map((opt) => {
              const afford = shards >= opt.shardCost;
              return (
                <div
                  key={opt.id}
                  className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-100 text-sm">{opt.label}</div>
                    <p className="text-[11px] text-slate-400">{opt.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!afford || pulling}
                    onClick={() => doCraft(opt.id)}
                    className={`px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider ${
                      afford && !pulling
                        ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {opt.shardCost} 💎
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
        Collection ({ownedCount}/{COSMETICS.length})
      </h2>
      <div className="grid grid-cols-4 gap-2">
        {COSMETICS.map((c) => {
          const have = owned.has(c.id);
          const style = RARITY_STYLE[c.rarity];
          const equippedHere = activePet ? equipped[c.slot] === c.id : false;
          return (
            <button
              key={c.id}
              disabled={!have || !activePet}
              onClick={() => {
                if (!have || !activePet) return;
                if (equippedHere) {
                  dispatch({ type: 'UNEQUIP_COSMETIC_SLOT', petId: activePet.id, slot: c.slot });
                } else {
                  dispatch({ type: 'EQUIP_COSMETIC', petId: activePet.id, cosmeticId: c.id });
                }
              }}
              className="aspect-square rounded-lg flex flex-col items-center justify-center p-1 transition-transform active:scale-95"
              style={{
                background: have ? style.bg : 'rgba(20,25,40,0.8)',
                border: `1px solid ${have ? style.border : 'rgba(60,70,100,0.3)'}`,
                opacity: have ? 1 : 0.4,
                outline: equippedHere ? '2px solid #fbbf24' : undefined,
              }}
            >
              <span className="text-3xl">{have ? c.icon : '❓'}</span>
              <span className="text-[8px] font-bold mt-0.5 truncate w-full text-center" style={{ color: have ? style.text : '#475569' }}>
                {have ? c.name : '???'}
              </span>
              <span className="text-[7px]" style={{ color: have ? style.text : '#334155' }}>
                {style.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
