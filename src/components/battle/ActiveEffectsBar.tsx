import React from 'react';
import type { Buff } from '../../types/battle';
import type { TraceBuffState } from '../../types/trace';

interface ActiveEffectsBarProps {
  buffs: Buff[];
  traceBuffs: TraceBuffState;
  mathBuffActive: boolean;
}

const BUFF_DISPLAY: Record<string, { label: string; color: string }> = {
  defense: { label: 'DEF', color: 'text-blue-300 border-blue-500/40 bg-blue-950/40' },
  strength: { label: 'STR', color: 'text-red-300 border-red-500/40 bg-red-950/40' },
  speed: { label: 'SPD', color: 'text-yellow-300 border-yellow-500/40 bg-yellow-950/40' },
};

export const ActiveEffectsBar: React.FC<ActiveEffectsBarProps> = ({
  buffs, traceBuffs, mathBuffActive,
}) => {
  const items: { key: string; label: string; value: string; color: string }[] = [];

  // Stat buffs
  for (const buff of buffs) {
    const display = BUFF_DISPLAY[buff.stat] ?? { label: buff.stat, color: 'text-slate-300 border-slate-500/40 bg-slate-950/40' };
    items.push({
      key: `buff_${buff.stat}_${buff.turnsRemaining}`,
      label: display.label,
      value: `${buff.multiplier}x · ${buff.turnsRemaining}t`,
      color: display.color,
    });
  }

  // Math buff
  if (mathBuffActive) {
    items.push({
      key: 'math_buff',
      label: '🧠 Math',
      value: '1.5x DMG',
      color: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40',
    });
  }

  // Trace buffs
  if (traceBuffs.runeBoostTier) {
    items.push({
      key: 'rune_boost',
      label: '🔮 Rune',
      value: `${traceBuffs.runeBoostTier}`,
      color: 'text-purple-300 border-purple-500/40 bg-purple-950/40',
    });
  }
  if (traceBuffs.shieldTier) {
    items.push({
      key: 'shield',
      label: '🛡️ Shield',
      value: `${traceBuffs.shieldTier}`,
      color: 'text-blue-300 border-blue-500/40 bg-blue-950/40',
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item.key}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border ${item.color}`}
        >
          {item.label}
          <span className="opacity-70">{item.value}</span>
        </span>
      ))}
    </div>
  );
};
