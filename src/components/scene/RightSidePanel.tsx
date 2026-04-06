import React, { useState, useEffect } from 'react';
import { getRoomConfig } from '../../config/roomConfig';
import { CARE_ACTIONS } from '../../config/gameConfig';
import { getPetReadiness } from '../../engine/systems/BattleSystem';
import type { RoomId } from '../../types/room';
import type { Pet } from '../../types';
import type { ActionId } from '../../config/roomConfig';

interface RightSidePanelProps {
  currentRoom: RoomId;
  pet: Pet;
  ticketCount: number;
  onFeed: () => void;
  onPlay: () => void;
  onHeal: () => void;
  onClean: () => void;
  onTrain: () => void;
  onShop: () => void;
  onBattle: () => void;
  onArena: () => void;
  onNumberMerge: () => void;
  onDungeon: () => void;
}

const ACTION_CONFIG: Record<ActionId, {
  icon: string;
  label: string;
  glowColor: string;
  getValue?: (props: RightSidePanelProps) => string;
  getOnClick: (props: RightSidePanelProps) => (() => void) | undefined;
}> = {
  feed: {
    icon: '/assets/generated/final/icon_hunger.png',
    label: 'Feed',
    glowColor: 'hover:shadow-orange-500/40',
    getValue: () => `${CARE_ACTIONS.feed.cost}`,
    getOnClick: (p) => p.pet.state === 'sleeping' ? undefined : p.onFeed,
  },
  play: {
    icon: '/assets/generated/final/item_teddy_bear.png',
    label: 'Play',
    glowColor: 'hover:shadow-blue-500/40',
    getValue: () => `${CARE_ACTIONS.play.cost}`,
    getOnClick: (p) => p.pet.state === 'sleeping' ? undefined : p.onPlay,
  },
  clean: {
    icon: '/assets/generated/final/icon_clean.png',
    label: 'Clean',
    glowColor: 'hover:shadow-cyan-500/40',
    getValue: () => `${CARE_ACTIONS.clean.cost}`,
    getOnClick: (p) => p.onClean,
  },
  heal: {
    icon: '/assets/generated/final/item_pill.png',
    label: 'Heal',
    glowColor: 'hover:shadow-red-500/40',
    getValue: () => `${CARE_ACTIONS.heal.cost}`,
    getOnClick: (p) => p.pet.state === 'dead' ? undefined : p.onHeal,
  },
  train: {
    icon: '/assets/generated/final/icon_energy.png',
    label: 'Train',
    glowColor: 'hover:shadow-purple-500/40',
    getValue: () => '',
    getOnClick: (p) => p.onTrain,
  },
  shop: {
    icon: '/assets/generated/final/reward_coin_stack.png',
    label: 'Shop',
    glowColor: 'hover:shadow-emerald-500/40',
    getValue: () => '',
    getOnClick: (p) => p.onShop,
  },
  arena: {
    icon: '/assets/generated/final/icon_ticket.png',
    label: 'Arena',
    glowColor: 'hover:shadow-rose-500/40',
    getValue: (p) => `${p.ticketCount}`,
    getOnClick: (p) => p.onArena,
  },
  practice: {
    icon: '/assets/generated/final/effect_hit.png',
    label: 'Battle',
    glowColor: 'hover:shadow-amber-500/40',
    getValue: () => '',
    getOnClick: (p) => {
      if (p.pet.state === 'sick' || p.pet.state === 'dead') return undefined;
      return p.onBattle;
    },
  },
  dungeon: {
    icon: '/assets/generated/final/effect_energy_burst.png',
    label: 'Dungeon',
    glowColor: 'hover:shadow-violet-500/40',
    getValue: () => '',
    getOnClick: (p) => {
      if (p.pet.state === 'sick' || p.pet.state === 'dead') return undefined;
      return p.onDungeon;
    },
  },
};

/**
 * Right-side slide-out panel replacing the bottom hotbar.
 * - Default: closed (only a small tab handle visible on right edge)
 * - Click tab: panel slides out from right (~300px)
 * - Expand button: panel goes full-width as an overlay
 */
export const RightSidePanel: React.FC<RightSidePanelProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const room = getRoomConfig(props.currentRoom);
  const readiness = getPetReadiness(props.pet);

  // Close expanded mode on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExpanded) setIsExpanded(false);
        else if (isOpen) setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isExpanded]);

  const panelWidth = isExpanded ? '100%' : '300px';

  return (
    <>
      {/* Backdrop overlay when expanded full-width */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[39] bg-black/40 transition-opacity duration-300"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Tab handle — "Command Deck" — always visible on right edge */}
      <button
        onClick={() => {
          if (isExpanded) {
            setIsExpanded(false);
            setIsOpen(false);
          } else {
            setIsOpen(!isOpen);
          }
        }}
        className="fixed right-0 top-[35%] -translate-y-1/2 z-[41] pointer-events-auto"
        style={{
          width: 42,
          height: 110,
          borderRadius: '14px 0 0 14px',
          background: 'linear-gradient(180deg, rgba(30,60,120,0.95) 0%, rgba(20,35,80,0.98) 50%, rgba(50,90,180,0.95) 100%)',
          border: '2px solid rgba(100,170,255,0.45)',
          borderRight: 'none',
          boxShadow: '-4px 0 20px rgba(50,120,240,0.3), 0 0 12px rgba(80,160,255,0.15) inset, 0 0 1px rgba(255,255,255,0.2) inset',
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          cursor: 'pointer',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          transform: isOpen ? 'translateX(-300px) translateY(-50%)' : 'translateY(-50%)',
          ...(isExpanded && { transform: 'translateX(-100vw) translateY(-50%)' }),
        }}
      >
        <img
          src="/assets/generated/final/effect_energy_burst.png"
          alt=""
          className="w-6 h-6 drop-shadow-md"
          style={{ imageRendering: 'pixelated', filter: 'brightness(1.3) drop-shadow(0 0 4px rgba(100,180,255,0.6))' }}
        />
        <span
          className="text-[7px] font-black uppercase tracking-widest leading-tight text-center"
          style={{
            color: 'rgba(160,210,255,0.95)',
            textShadow: '0 0 6px rgba(80,160,255,0.5)',
            writingMode: 'vertical-lr',
            letterSpacing: '0.15em',
          }}
        >
          Command Deck
        </span>
      </button>

      {/* Slide-out panel */}
      <div
        data-help="side-panel"
        className="fixed top-0 right-0 h-full z-40 pointer-events-auto"
        style={{
          width: panelWidth,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div
          className="h-full flex flex-col"
          style={{
            background: 'linear-gradient(180deg, rgba(15,18,30,0.96) 0%, rgba(8,10,18,0.98) 100%)',
            backdropFilter: 'blur(16px)',
            borderLeft: '1px solid rgba(100,120,180,0.15)',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
          }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <span className="text-sm font-black text-cyan-300 uppercase tracking-wider" style={{ textShadow: '0 0 8px rgba(80,200,255,0.3)' }}>Command Deck</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-2 py-1 rounded text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                style={{
                  background: 'rgba(45,52,75,0.6)',
                  border: '1px solid rgba(80,90,130,0.25)',
                }}
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
              <button
                onClick={() => { setIsOpen(false); setIsExpanded(false); }}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors text-sm font-bold"
              >
                x
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className={`flex-1 overflow-y-auto p-4 ${isExpanded ? 'grid grid-cols-4 gap-3 content-start' : 'flex flex-col gap-2'}`}>
            {room.primaryActions.map((actionId) => {
              const cfg = ACTION_CONFIG[actionId];
              const onClick = cfg.getOnClick(props);
              const disabled = !onClick;
              const dimmed = actionId === 'practice' && readiness < 40;

              if (isExpanded) {
                // Grid card layout for expanded mode
                return (
                  <button
                    key={actionId}
                    onClick={onClick}
                    disabled={disabled}
                    className={`
                      relative flex flex-col items-center justify-center gap-2
                      rounded-xl p-4 transition-all duration-150
                      ${disabled ? 'opacity-30 cursor-not-allowed' : `cursor-pointer ${cfg.glowColor}`}
                      ${dimmed ? 'opacity-50' : ''}
                    `}
                    style={{
                      background: disabled
                        ? 'rgba(30,35,50,0.6)'
                        : 'linear-gradient(180deg, rgba(45,52,75,0.9) 0%, rgba(28,32,50,0.95) 100%)',
                      boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.4)',
                      border: '1px solid rgba(80,90,130,0.25)',
                    }}
                  >
                    <img
                      src={cfg.icon}
                      alt={cfg.label}
                      className="w-10 h-10 drop-shadow-sm"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                      {cfg.label}
                    </span>
                    {cfg.getValue?.(props) && (
                      <span className="text-[9px] font-black text-yellow-300"
                        style={{ textShadow: '0 0 4px rgba(250,200,50,0.4)' }}
                      >
                        {cfg.getValue(props)}
                      </span>
                    )}
                  </button>
                );
              }

              // Vertical row layout for normal mode
              return (
                <button
                  key={actionId}
                  onClick={onClick}
                  disabled={disabled}
                  className={`
                    relative flex items-center gap-3 w-full
                    rounded-xl px-4 py-3 transition-all duration-150
                    ${disabled ? 'opacity-30 cursor-not-allowed' : `cursor-pointer ${cfg.glowColor}`}
                    ${dimmed ? 'opacity-50' : ''}
                  `}
                  style={{
                    background: disabled
                      ? 'rgba(30,35,50,0.6)'
                      : 'linear-gradient(180deg, rgba(45,52,75,0.9) 0%, rgba(28,32,50,0.95) 100%)',
                    boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.4)',
                    border: '1px solid rgba(80,90,130,0.25)',
                  }}
                >
                  <img
                    src={cfg.icon}
                    alt={cfg.label}
                    className="w-7 h-7 drop-shadow-sm flex-shrink-0"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span className="text-sm font-bold text-slate-300 uppercase tracking-wide flex-1 text-left">
                    {cfg.label}
                  </span>
                  {cfg.getValue?.(props) && (
                    <span
                      className="text-[10px] font-black text-yellow-300 rounded-md px-1.5 py-0.5"
                      style={{
                        background: 'rgba(30,25,10,0.9)',
                        border: '1px solid rgba(200,170,50,0.3)',
                        textShadow: '0 0 4px rgba(250,200,50,0.4)',
                      }}
                    >
                      {cfg.getValue(props)}
                    </span>
                  )}
                </button>
              );
            })}
            {isExpanded ? (
              <button
                onClick={props.onNumberMerge}
                className="relative flex flex-col items-center justify-center gap-2 rounded-xl p-4 transition-all duration-150 cursor-pointer hover:shadow-cyan-500/40"
                style={{
                  background: 'linear-gradient(180deg, rgba(12,74,110,0.92) 0%, rgba(14,116,144,0.88) 100%)',
                  boxShadow: '0 2px 12px rgba(8,145,178,0.26)',
                  border: '1px solid rgba(103,232,249,0.3)',
                }}
              >
                <img
                  src="/assets/generated/final/icon_energy.png"
                  alt="Merge"
                  className="w-10 h-10 drop-shadow-sm"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="text-xs font-bold text-cyan-50 uppercase tracking-wide">
                  Merge
                </span>
                <span className="text-[9px] font-black text-cyan-100">6x6</span>
              </button>
            ) : (
              <button
                onClick={props.onNumberMerge}
                className="relative flex items-center gap-3 w-full rounded-xl px-4 py-3 transition-all duration-150 cursor-pointer hover:shadow-cyan-500/40"
                style={{
                  background: 'linear-gradient(180deg, rgba(12,74,110,0.92) 0%, rgba(14,116,144,0.88) 100%)',
                  boxShadow: '0 2px 12px rgba(8,145,178,0.26)',
                  border: '1px solid rgba(103,232,249,0.3)',
                }}
              >
                <img
                  src="/assets/generated/final/icon_energy.png"
                  alt="Merge"
                  className="w-7 h-7 drop-shadow-sm flex-shrink-0"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="text-sm font-bold text-cyan-50 uppercase tracking-wide flex-1 text-left">
                  Merge
                </span>
                <span
                  className="text-[10px] font-black text-cyan-100 rounded-md px-1.5 py-0.5"
                  style={{
                    background: 'rgba(8,47,73,0.55)',
                    border: '1px solid rgba(125,211,252,0.25)',
                  }}
                >
                  6x6
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
