import React from 'react';
import type { CombatPhase } from './CombatPhaseIndicator';

interface BattleActionBarProps {
  onAttack: () => void;
  onDefend: () => void;
  onSkill: () => void;
  onFocus: () => void;
  onFlee: () => void;
  combatPhase: CombatPhase;
  focusUsed: boolean;
}

const ACTION_BUTTONS = [
  { id: 'attack', label: 'ATTACK', sub: 'Deal Damage', icon: '/assets/generated/final/effect_hit.png', bg: 'from-red-700 to-red-900', border: 'border-red-500/30', glow: 'shadow-red-500/20', glowColor: 'rgba(239,68,68,0.25)' },
  { id: 'defend', label: 'DEFEND', sub: 'Reduce Damage', icon: '/assets/generated/final/icon_shield.png', bg: 'from-blue-700 to-blue-900', border: 'border-blue-500/30', glow: 'shadow-blue-500/20', glowColor: 'rgba(59,130,246,0.25)' },
  { id: 'skill', label: 'SKILL', sub: 'Use Ability', icon: '/assets/generated/final/icon_energy.png', bg: 'from-purple-700 to-purple-900', border: 'border-purple-500/30', glow: 'shadow-purple-500/20', glowColor: 'rgba(168,85,247,0.25)' },
  { id: 'focus', label: 'FOCUS', sub: 'Restore Energy', icon: '/assets/generated/final/icon_play_button.png', bg: 'from-emerald-700 to-emerald-900', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20', glowColor: 'rgba(16,185,129,0.25)' },
  { id: 'flee', label: 'ESCAPE', sub: 'Leave Combat', icon: '', bg: 'from-slate-600 to-slate-800', border: 'border-slate-500/30', glow: '', glowColor: '' },
] as const;

export const BattleActionBar: React.FC<BattleActionBarProps> = ({
  onAttack, onDefend, onSkill, onFocus, onFlee, combatPhase, focusUsed,
}) => {
  const isLocked = combatPhase !== 'PLAYER_INPUT';

  const handlers: Record<string, (() => void) | undefined> = {
    attack: onAttack,
    defend: onDefend,
    skill: onSkill,
    focus: focusUsed ? undefined : onFocus,
    flee: onFlee,
  };

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {ACTION_BUTTONS.map((btn) => {
        const handler = handlers[btn.id];
        const isDisabled = isLocked || !handler;

        return (
          <button
            key={btn.id}
            onClick={isDisabled ? undefined : handler}
            disabled={isDisabled}
            className={`
              relative flex flex-col items-center justify-center rounded-xl py-3 px-2
              bg-gradient-to-b ${btn.bg} border ${btn.border}
              transition-all duration-150 overflow-hidden
              ${isLocked
                ? 'cursor-default grayscale-[40%] opacity-40'
                : isDisabled
                  ? 'opacity-30 cursor-not-allowed'
                  : 'cursor-pointer hover:brightness-125 active:scale-[0.92] shadow-lg anim-hotbar-breathe'
              }
              ${!isDisabled && btn.glow ? btn.glow : ''}
            `}
            style={!isDisabled && btn.glowColor ? {
              '--breathe-glow': btn.glowColor,
            } as React.CSSProperties : undefined}
          >
            {/* Locked shimmer overlay */}
            {isLocked && (
              <div className="absolute inset-0 anim-hotbar-locked-shimmer pointer-events-none" />
            )}

            {btn.icon && (
              <img
                src={btn.icon}
                alt=""
                className="w-8 h-8 mb-0.5 drop-shadow-sm"
                style={{ imageRendering: 'pixelated' }}
              />
            )}
            {!btn.icon && (
              <span className="text-lg mb-0.5">🏃</span>
            )}
            <span className="text-xs font-black text-white uppercase tracking-wider leading-none">
              {btn.label}
            </span>
            <span className="text-[9px] text-white/50 mt-0.5 leading-none">
              {btn.id === 'focus' && focusUsed ? 'Used' : btn.sub}
            </span>
          </button>
        );
      })}
    </div>
  );
};
