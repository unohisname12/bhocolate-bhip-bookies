import React, { useState, useCallback } from 'react';
import type { RoomId } from '../../types/room';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { Z } from '../../config/zBands';

/* ------------------------------------------------------------------ */
/*  Hotspot definitions — native 400×224 coordinates                   */
/* ------------------------------------------------------------------ */

interface SceneHotspot {
  id: string;
  roomId: RoomId;
  /** Native coordinates (400×224 space), bottom-anchored like props */
  x: number;       // left offset
  y: number;       // bottom offset
  w: number;       // width
  h: number;       // height
  label: string;
  icon: string;
  type: 'navigation' | 'interactive';
  action: string;
  tooltipSide?: 'top' | 'bottom';
}

const HOTSPOTS: SceneHotspot[] = [
  /* ---- OUTSIDE ---- */
  {
    id: 'outside-house-door',
    roomId: 'outside',
    x: 260, y: 48, w: 40, h: 76,
    label: 'Enter House',
    icon: '🏠',
    type: 'navigation',
    action: 'enter_house',
    tooltipSide: 'top',
  },
  {
    id: 'outside-mailbox',
    roomId: 'outside',
    x: 42, y: 48, w: 28, h: 48,
    label: 'Mailbox',
    icon: '📬',
    type: 'interactive',
    action: 'open_mailbox',
    tooltipSide: 'top',
  },
  /* ---- INSIDE ---- */
  {
    id: 'inside-door',
    roomId: 'inside',
    x: 302, y: 48, w: 40, h: 80,
    label: 'Go Outside',
    icon: '🚪',
    type: 'navigation',
    action: 'exit_house',
    tooltipSide: 'top',
  },
  {
    id: 'inside-fireplace',
    roomId: 'inside',
    x: 16, y: 48, w: 80, h: 96,
    label: 'Fireplace',
    icon: '🔥',
    type: 'interactive',
    action: 'fireplace',
    tooltipSide: 'top',
  },
  {
    id: 'inside-bookshelf',
    roomId: 'inside',
    x: 122, y: 48, w: 56, h: 96,
    label: 'Bookshelf',
    icon: '📚',
    type: 'interactive',
    action: 'bookshelf',
    tooltipSide: 'top',
  },
  {
    id: 'inside-window',
    roomId: 'inside',
    x: 202, y: 100, w: 56, h: 64,
    label: 'Window',
    icon: '🪟',
    type: 'interactive',
    action: 'window',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface InteractiveObjectsProps {
  currentRoom: RoomId;
  hasMailboxReward: boolean;
  scale: number;
  dispatch: (action: GameEngineAction) => void;
  onMailboxClick: () => void;
  onFireplaceClick?: () => void;
  onBookshelfClick?: () => void;
}

export const InteractiveObjects: React.FC<InteractiveObjectsProps> = ({
  currentRoom,
  hasMailboxReward,
  scale,
  dispatch,
  onMailboxClick,
  onFireplaceClick,
  onBookshelfClick,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);

  const visibleHotspots = HOTSPOTS.filter((h) => h.roomId === currentRoom);

  const handleClick = useCallback(
    (hotspot: SceneHotspot) => {
      setClickedId(hotspot.id);
      setTimeout(() => setClickedId(null), 300);

      switch (hotspot.action) {
        case 'enter_house':
          dispatch({ type: 'CHANGE_ROOM', roomId: 'inside' });
          break;
        case 'exit_house':
          dispatch({ type: 'CHANGE_ROOM', roomId: 'outside' });
          break;
        case 'open_mailbox':
          onMailboxClick();
          break;
        case 'fireplace':
          onFireplaceClick?.();
          break;
        case 'bookshelf':
          onBookshelfClick?.();
          break;
        default:
          break;
      }
    },
    [dispatch, onMailboxClick, onFireplaceClick, onBookshelfClick],
  );

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: Z.HOTSPOTS }}>
      {visibleHotspots.map((hotspot) => {
        const isHovered = hoveredId === hotspot.id;
        const isClicked = clickedId === hotspot.id;
        const isMailbox = hotspot.action === 'open_mailbox';
        const showIndicator = isMailbox && hasMailboxReward;

        return (
          <button
            key={hotspot.id}
            className="scene-hotspot absolute border-0 bg-transparent p-0 outline-none"
            style={{
              left: hotspot.x * scale,
              bottom: hotspot.y * scale,
              width: hotspot.w * scale,
              height: hotspot.h * scale,
              cursor: 'pointer',
              transform: isClicked ? 'scale(0.96)' : isHovered ? 'scale(1.02)' : 'scale(1)',
              transition: 'transform 0.15s ease, filter 0.2s ease',
            }}
            onMouseEnter={() => setHoveredId(hotspot.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => handleClick(hotspot)}
            aria-label={hotspot.label}
          >
            {/* Hover glow overlay */}
            <div
              className="absolute inset-0 rounded-lg transition-opacity duration-200 pointer-events-none"
              style={{
                opacity: isHovered ? 1 : 0,
                background: 'radial-gradient(ellipse, rgba(255,255,200,0.12) 0%, rgba(255,255,200,0.04) 60%, transparent 100%)',
                boxShadow: isHovered
                  ? '0 0 20px rgba(255,255,200,0.15), inset 0 0 20px rgba(255,255,200,0.06)'
                  : 'none',
              }}
            />

            {/* Tooltip label — shown on hover */}
            {isHovered && (
              <div
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap anim-scene-tooltip pointer-events-none"
                style={{
                  ...(hotspot.tooltipSide === 'bottom'
                    ? { top: '100%', marginTop: 6 }
                    : { bottom: '100%', marginBottom: 6 }),
                }}
              >
                <div
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-white/90 flex items-center gap-1.5"
                  style={{
                    background: 'linear-gradient(180deg, rgba(20,25,40,0.92) 0%, rgba(10,12,22,0.96) 100%)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.1) inset',
                    border: '1px solid rgba(100,120,180,0.2)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span className="text-sm">{hotspot.icon}</span>
                  <span>{hotspot.label}</span>
                </div>
              </div>
            )}

            {/* Mailbox reward indicator — pulsing dot */}
            {showIndicator && (
              <div className="absolute -top-1 -right-1 pointer-events-none">
                <div
                  className="w-4 h-4 rounded-full anim-scene-indicator"
                  style={{
                    background: 'radial-gradient(circle, #fbbf24 0%, #f59e0b 60%, #d97706 100%)',
                    boxShadow: '0 0 8px rgba(251,191,36,0.6), 0 0 2px rgba(251,191,36,0.9)',
                  }}
                />
              </div>
            )}

            {/* Navigation arrow hint for doors */}
            {isHovered && hotspot.type === 'navigation' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center anim-scene-door-hint"
                  style={{
                    background: 'rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <span className="text-white/80 text-lg">
                    {hotspot.action === 'enter_house' ? '→' : '←'}
                  </span>
                </div>
              </div>
            )}
          </button>
        );
      })}

      {/* Ambient sparkle near mailbox when reward is available */}
      {currentRoom === 'outside' && hasMailboxReward && (
        <div
          className="absolute pointer-events-none anim-scene-sparkle"
          style={{ left: 56 * scale, bottom: 80 * scale, width: 8, height: 8 }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,200,0.9) 0%, transparent 70%)',
            }}
          />
        </div>
      )}
    </div>
  );
};
