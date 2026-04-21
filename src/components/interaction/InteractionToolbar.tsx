import React, { useState, useEffect, useCallback } from 'react';
import { INTERACTION_DEFS, INTERACTION_ORDER } from '../../config/interactionConfig';
import { getCooldownRemaining } from '../../engine/systems/InteractionSystem';
import { Z } from '../../config/zBands';
import type { HandMode, InteractionState } from '../../types/interaction';
import type { Pet } from '../../types';

interface InteractionToolbarProps {
  activeMode: HandMode;
  interaction: InteractionState;
  pet: Pet;
  playerTokens: number;
  onSelectMode: (mode: HandMode) => void;
}

/**
 * Bottom toolbar with 6 interaction mode buttons.
 *
 * Shows lock/unlock state, cooldown timers, costs, and selection glow.
 * Minimizes to a small toggle handle when closed.
 */
export const InteractionToolbar: React.FC<InteractionToolbarProps> = ({
  activeMode, interaction, pet, playerTokens, onSelectMode,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [, setTick] = useState(0); // force re-render for cooldown timers

  // Tick cooldown display every 500ms
  useEffect(() => {
    if (!isOpen) return;
    const iv = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(iv);
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (isOpen && activeMode !== 'idle') {
      onSelectMode('idle'); // deselect when closing
    }
    setIsOpen(!isOpen);
  }, [isOpen, activeMode, onSelectMode]);

  const handleSelect = useCallback((mode: HandMode) => {
    if (activeMode === mode) {
      onSelectMode('idle'); // deselect on re-click
    } else {
      onSelectMode(mode);
    }
  }, [activeMode, onSelectMode]);

  return (
    <>
      {/* Toggle handle */}
      <button
        onClick={handleToggle}
        className="fixed bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto"
        style={{
          zIndex: Z.UI_HUD + 2,
          width: isOpen ? 44 : 140,
          height: isOpen ? 28 : 36,
          borderRadius: isOpen ? '8px 8px 0 0' : 18,
          background: isOpen
            ? 'rgba(20,25,40,0.9)'
            : 'linear-gradient(180deg, rgba(60,30,120,0.95) 0%, rgba(40,20,90,0.98) 100%)',
          border: `1px solid ${isOpen ? 'rgba(100,80,200,0.3)' : 'rgba(160,130,255,0.5)'}`,
          boxShadow: isOpen ? 'none' : '0 2px 12px rgba(100,60,200,0.4)',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          transform: isOpen ? 'translate(-50%, 0)' : 'translate(-50%, 0)',
          bottom: isOpen ? 72 : 12,
          position: 'fixed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {isOpen ? (
          <span className="text-[10px] font-bold text-slate-400">&darr;</span>
        ) : (
          <>
            <span className="text-[10px] font-black text-purple-200 uppercase tracking-wider"
              style={{ textShadow: '0 0 6px rgba(160,130,255,0.5)' }}>
              Touch
            </span>
          </>
        )}
      </button>

      {/* Toolbar panel */}
      <div
        className="fixed bottom-0 left-0 right-0 pointer-events-auto"
        style={{
          zIndex: Z.UI_HUD + 1,
          height: isOpen ? 72 : 0,
          overflow: 'hidden',
          transition: 'height 0.25s cubic-bezier(0.4,0,0.2,1)',
          background: 'linear-gradient(180deg, rgba(15,12,30,0.95) 0%, rgba(10,8,20,0.98) 100%)',
          borderTop: isOpen ? '1px solid rgba(100,80,200,0.2)' : 'none',
        }}
      >
        <div className="flex items-center justify-center gap-2 h-full px-4">
          {INTERACTION_ORDER.map((mode) => {
            const def = INTERACTION_DEFS[mode];
            const isSelected = activeMode === mode;
            const isUnlocked = interaction.unlockedTools.includes(mode);
            const cooldownMs = getCooldownRemaining(interaction, mode);
            const onCooldown = cooldownMs > 0;
            const canAfford = def.economyCost === 0 || playerTokens >= def.economyCost;
            const disabled = !isUnlocked || onCooldown || !canAfford;

            return (
              <button
                key={mode}
                onClick={() => !disabled && handleSelect(mode)}
                disabled={!isUnlocked}
                className="relative flex flex-col items-center gap-0.5 transition-all duration-150"
                style={{
                  width: 56,
                  opacity: disabled ? 0.4 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
                title={!isUnlocked ? getUnlockHint(def) : def.name}
              >
                {/* Icon circle */}
                <div
                  className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(180deg, rgba(140,100,255,0.9) 0%, rgba(100,60,200,0.95) 100%)'
                      : 'rgba(30,25,50,0.8)',
                    border: `2px solid ${isSelected ? 'rgba(200,170,255,0.8)' : 'rgba(60,50,100,0.4)'}`,
                    boxShadow: isSelected ? '0 0 12px rgba(140,100,255,0.5)' : 'none',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  <img
                    src={def.icon}
                    alt={def.name}
                    className="w-5 h-5"
                    style={{ imageRendering: 'pixelated', filter: disabled ? 'grayscale(1)' : 'none' }}
                  />

                  {/* Lock overlay */}
                  {!isUnlocked && (
                    <div className="absolute inset-0 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <span className="text-xs">🔒</span>
                    </div>
                  )}

                  {/* Cooldown overlay */}
                  {onCooldown && isUnlocked && (
                    <div className="absolute inset-0 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <span className="text-[9px] font-bold text-slate-300">
                        {Math.ceil(cooldownMs / 1000)}s
                      </span>
                    </div>
                  )}
                </div>

                {/* Label */}
                <span className={`text-[8px] font-bold uppercase tracking-wide leading-tight
                  ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                  {def.name.split('/')[0].trim()}
                </span>

                {/* Cost badge */}
                {def.economyCost > 0 && isUnlocked && (
                  <span className="text-[7px] font-black text-yellow-400"
                    style={{ textShadow: '0 0 3px rgba(250,200,50,0.3)' }}>
                    {def.economyCost}T
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

function getUnlockHint(def: typeof INTERACTION_DEFS[keyof typeof INTERACTION_DEFS]): string {
  if (!def.unlockRequirement) return def.name;
  switch (def.unlockRequirement.kind) {
    case 'free': return def.name;
    case 'level': return `Unlock at Level ${def.unlockRequirement.threshold}`;
    case 'bond': return `Unlock at Bond ${def.unlockRequirement.threshold}`;
    case 'purchase': return `Buy from Shop to unlock`;
  }
}
