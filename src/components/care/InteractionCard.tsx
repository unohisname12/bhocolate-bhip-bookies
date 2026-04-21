import React, { useState, useEffect } from 'react';
import { INTERACTION_DEFS } from '../../config/interactionConfig';
import { getCooldownRemaining } from '../../engine/systems/InteractionSystem';
import type { HandMode, InteractionState } from '../../types/interaction';

interface InteractionCardProps {
  mode: Exclude<HandMode, 'idle'>;
  interaction: InteractionState;
  /** Called when the player taps "Start" on a ready card. */
  onStart?: (mode: Exclude<HandMode, 'idle'>) => void;
}

const EFFECT_LABELS: Record<string, string> = {
  bond: 'Bond',
  happiness: 'Happy',
  cleanliness: 'Clean',
  trust: 'Trust',
  discipline: 'Disc',
  stress: 'Stress',
  groomingScore: 'Groom',
  xp: 'XP',
};

export const InteractionCard: React.FC<InteractionCardProps> = ({ mode, interaction, onStart }) => {
  const def = INTERACTION_DEFS[mode];
  const isUnlocked = interaction.unlockedTools.includes(mode);
  const tier = interaction.equippedToolTiers[mode];
  const [showEffects, setShowEffects] = useState(false);
  const [, setTick] = useState(0);
  const cooldownMs = getCooldownRemaining(interaction, mode);
  const onCooldown = cooldownMs > 0;

  // Tick for live cooldown — only runs while actually on cooldown
  useEffect(() => {
    if (!onCooldown) return;
    const iv = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(iv);
  }, [onCooldown]);

  const statusLabel = !isUnlocked
    ? getUnlockHint(def)
    : onCooldown
      ? `${Math.ceil(cooldownMs / 1000)}s`
      : 'RDY';

  const statusColor = !isUnlocked
    ? '#94a3b8'
    : onCooldown
      ? '#f87171'
      : '#4ade80';

  const effects = Object.entries(def.statEffects).filter(([, v]) => v !== 0 && v != null);

  return (
    <div
      className="relative flex flex-col items-center rounded-xl p-2 cursor-pointer transition-all duration-150"
      style={{
        width: 90,
        minHeight: 100,
        background: isUnlocked ? 'rgba(30,25,55,0.8)' : 'rgba(20,18,35,0.6)',
        border: `1px solid ${isUnlocked ? 'rgba(100,80,200,0.3)' : 'rgba(50,45,80,0.3)'}`,
        opacity: isUnlocked ? 1 : 0.5,
        filter: isUnlocked ? 'none' : 'grayscale(0.6)',
      }}
      onClick={() => isUnlocked && setShowEffects(!showEffects)}
    >
      {/* Tier badge */}
      {tier > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 text-[8px] font-black px-1 py-0.5 rounded-full"
          style={{
            background: 'rgba(140,100,255,0.9)',
            color: '#fff',
            boxShadow: '0 0 6px rgba(140,100,255,0.4)',
          }}
        >
          T{tier}
        </span>
      )}

      {/* Icon */}
      <img
        src={def.icon}
        alt={def.name}
        className="w-8 h-8 mb-1"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Name */}
      <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider text-center leading-tight">
        {def.name.split('/')[0].trim()}
      </span>

      {/* Status */}
      <span
        className="text-[9px] font-black mt-1"
        style={{ color: statusColor }}
      >
        {!isUnlocked && '🔒 '}{statusLabel}
      </span>

      {/* Start button — shown when unlocked & off cooldown */}
      {isUnlocked && !onCooldown && onStart && (
        <button
          type="button"
          className="mt-1.5 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all hover:brightness-125 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(100,80,220,0.9), rgba(140,100,255,0.9))',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(100,80,220,0.4)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onStart(mode);
          }}
        >
          Start
        </button>
      )}

      {/* Effects tooltip */}
      {showEffects && effects.length > 0 && (
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full rounded-lg p-1.5"
          style={{
            zIndex: 50,
            background: 'rgba(10,8,25,0.95)',
            border: '1px solid rgba(100,80,200,0.3)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            minWidth: 100,
          }}
        >
          {effects.map(([key, val]) => (
            <div key={key} className="flex justify-between gap-2 text-[9px]">
              <span className="text-slate-400">{EFFECT_LABELS[key] ?? key}</span>
              <span style={{ color: (val as number) > 0 ? '#4ade80' : '#f87171' }}>
                {(val as number) > 0 ? '+' : ''}{val}
              </span>
            </div>
          ))}
          {def.economyCost > 0 && (
            <div className="flex justify-between gap-2 text-[9px] mt-0.5 pt-0.5 border-t border-slate-700/50">
              <span className="text-slate-400">Cost</span>
              <span className="text-yellow-400">{def.economyCost}T</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function getUnlockHint(def: typeof INTERACTION_DEFS[keyof typeof INTERACTION_DEFS]): string {
  if (!def.unlockRequirement) return 'Locked';
  switch (def.unlockRequirement.kind) {
    case 'free': return 'Free';
    case 'level': return `Lv${def.unlockRequirement.threshold}`;
    case 'bond': return `Bond ${def.unlockRequirement.threshold}`;
    case 'purchase': return 'Shop';
  }
}
