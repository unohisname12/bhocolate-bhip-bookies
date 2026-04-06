import React from 'react';
import { getRoomConfig } from '../../config/roomConfig';
import { CARE_ACTIONS } from '../../config/gameConfig';
import { getPetReadiness } from '../../engine/systems/BattleSystem';
import type { RoomId } from '../../types/room';
import type { Pet } from '../../types';
import type { ActionId } from '../../config/roomConfig';

interface BottomActionBarProps {
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
  onDungeon: () => void;
}

const ACTION_CONFIG: Record<ActionId, {
  icon: string;
  label: string;
  glowColor: string;
  getValue?: (props: BottomActionBarProps) => string;
  getOnClick: (props: BottomActionBarProps) => (() => void) | undefined;
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
 * Modern game-style hotbar panel. Rounded floating panel at bottom center
 * with elevated icon buttons inside — console UI feel, not a web toolbar.
 */
export const BottomActionBar: React.FC<BottomActionBarProps> = (props) => {
  const room = getRoomConfig(props.currentRoom);
  const readiness = getPetReadiness(props.pet);

  return (
    <div className="fixed bottom-1.5 inset-x-0 z-40 pointer-events-none flex justify-center">
      {/* Panel container — rounded, dark gradient, soft glow border */}
      <div
        className="pointer-events-auto rounded-2xl px-2.5 py-1.5 flex items-center gap-1"
        style={{
          background: 'linear-gradient(180deg, rgba(20,25,40,0.88) 0%, rgba(10,12,22,0.95) 100%)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.08) inset, 0 1px 0 rgba(255,255,255,0.06) inset',
          border: '1px solid rgba(100,120,180,0.15)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {room.primaryActions.map((actionId) => {
          const cfg = ACTION_CONFIG[actionId];
          const onClick = cfg.getOnClick(props);
          const disabled = !onClick;
          const dimmed = actionId === 'practice' && readiness < 40;

          return (
            <button
              key={actionId}
              onClick={onClick}
              disabled={disabled}
              className={`
                hotbar-btn relative flex flex-col items-center justify-center
                w-[44px] h-[44px] rounded-lg
                transition-all duration-150
                ${disabled ? 'opacity-30 cursor-not-allowed' : `cursor-pointer ${cfg.glowColor}`}
                ${dimmed ? 'opacity-50' : ''}
              `}
              style={{
                background: disabled
                  ? 'rgba(30,35,50,0.6)'
                  : 'linear-gradient(180deg, rgba(45,52,75,0.9) 0%, rgba(28,32,50,0.95) 100%)',
                boxShadow: disabled
                  ? 'none'
                  : '0 2px 8px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset',
                border: '1px solid rgba(80,90,130,0.25)',
              }}
            >
              <img
                src={cfg.icon}
                alt={cfg.label}
                className="w-5 h-5 drop-shadow-sm"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="text-[6px] font-bold text-slate-400 uppercase mt-0.5 leading-none tracking-wide">
                {cfg.label}
              </span>
              {cfg.getValue?.(props) && (
                <span
                  className="absolute -top-1.5 -right-1.5 text-[8px] font-black text-yellow-300 rounded-md px-1 min-w-[16px] text-center leading-[15px] pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(30,25,10,0.95) 0%, rgba(15,12,5,0.98) 100%)',
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
      </div>
    </div>
  );
};
