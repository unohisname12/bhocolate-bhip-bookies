import React from 'react';
import type { RoomId } from '../../types/room';
import { Z } from '../../config/zBands';

interface EnvironmentalLifeProps {
  currentRoom: RoomId;
  scale: number;
}

/**
 * Lightweight ambient effects layered on the scene.
 * Positions are in native 400×224 space, scaled to viewport.
 * All purely decorative — no pointer events, no state.
 */
export const EnvironmentalLife: React.FC<EnvironmentalLifeProps> = ({ currentRoom, scale }) => {
  if (currentRoom === 'outside') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: Z.AMBIENT_FX }}>
        {/* Sun rays — very subtle rotating glow near top-left */}
        <div
          className="absolute anim-env-sun-rays"
          style={{
            left: 88 * scale,
            top: -11 * scale,
            width: 180,
            height: 180,
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,200,0.08) 15deg, transparent 30deg, rgba(255,255,200,0.06) 45deg, transparent 60deg, rgba(255,255,200,0.08) 75deg, transparent 90deg, rgba(255,255,200,0.06) 105deg, transparent 120deg, rgba(255,255,200,0.08) 135deg, transparent 150deg, rgba(255,255,200,0.06) 165deg, transparent 180deg, rgba(255,255,200,0.08) 195deg, transparent 210deg, rgba(255,255,200,0.06) 225deg, transparent 240deg, rgba(255,255,200,0.08) 255deg, transparent 270deg, rgba(255,255,200,0.06) 285deg, transparent 300deg, rgba(255,255,200,0.08) 315deg, transparent 330deg, rgba(255,255,200,0.06) 345deg, transparent 360deg)',
            borderRadius: '50%',
          }}
        />

        {/* Left tree subtle sway zone — aligned with tree_large_l prop */}
        <div
          className="absolute anim-env-tree-sway"
          style={{
            left: 0,
            top: 0,
            width: 80 * scale,
            height: '70%',
          }}
        />

        {/* Right tree subtle sway zone — aligned with tree_small_r prop */}
        <div
          className="absolute anim-env-tree-sway"
          style={{
            right: 0,
            top: 0,
            width: 60 * scale,
            height: '70%',
            animationDelay: '-2s',
          }}
        />

        {/* Flower strip sway — bottom area near ground accents */}
        <div
          className="absolute inset-x-0 anim-env-flowers"
          style={{
            bottom: 40 * scale,
            height: 30 * scale,
          }}
        />
      </div>
    );
  }

  // Inside room
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: Z.AMBIENT_FX }}>
      {/* Fireplace warm glow — aligned with fireplace prop at x=24 */}
      <div
        className="absolute anim-env-fireplace"
        style={{
          left: 16 * scale,
          bottom: 48 * scale,
          width: 80 * scale,
          height: 96 * scale,
          background: 'radial-gradient(ellipse at 50% 80%, rgba(255,120,30,0.25) 0%, rgba(255,80,10,0.1) 40%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* Window glow — aligned with window prop at x=210 */}
      <div
        className="absolute anim-env-window"
        style={{
          left: 200 * scale,
          bottom: 100 * scale,
          width: 80 * scale,
          height: 80 * scale,
          background: 'radial-gradient(ellipse, rgba(180,200,255,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Clock pendulum hint — aligned with clock prop at x=380 */}
      <div
        className="absolute anim-env-pendulum"
        style={{
          left: 388 * scale,
          bottom: 110 * scale,
          width: 4,
          height: 16,
          background: 'linear-gradient(180deg, rgba(200,180,120,0.3) 0%, rgba(200,180,120,0.1) 100%)',
          borderRadius: 2,
        }}
      />
    </div>
  );
};
