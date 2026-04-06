import React, { useEffect, useState, useRef } from 'react';
import { ASSETS } from '../../config/assetManifest';
import { COMBAT_TIMINGS } from './combatTimings';
import type { CombatSheetConfig } from '../../config/assetManifest';
import { computeSpriteStyle } from '../../engine/animation/SpriteRenderer';

/** Floating damage/heal/miss number */
export interface DamageNumber {
  id: number;
  value: number | string;
  type: 'damage' | 'heal' | 'miss' | 'defend';
  target: 'player' | 'enemy';
}

let nextDamageId = 0;
// eslint-disable-next-line react-refresh/only-export-components -- co-located factory/types used alongside battle effect components
export const createDamageNumber = (
  value: number | string,
  type: DamageNumber['type'],
  target: DamageNumber['target'],
): DamageNumber => ({
  id: nextDamageId++,
  value,
  type,
  target,
});

export const FloatingDamageNumber: React.FC<{ num: DamageNumber; onDone: () => void }> = ({ num, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, COMBAT_TIMINGS.damageNumberDuration);
    return () => clearTimeout(t);
  }, [onDone]);

  const colorClass =
    num.type === 'damage' ? 'text-red-400' :
    num.type === 'heal' ? 'text-green-400' :
    num.type === 'miss' ? 'text-slate-400 italic' :
    'text-blue-400';

  const animClass =
    num.type === 'damage' ? 'anim-battle-damage-pop' :
    num.type === 'heal' ? 'anim-battle-heal-pop' :
    'anim-battle-miss-float';

  const prefix = num.type === 'heal' ? '+' : num.type === 'damage' ? '-' : '';
  const displayValue = num.type === 'miss' ? 'MISS' : num.type === 'defend' ? 'BLOCK' : `${prefix}${num.value}`;

  return (
    <div
      className={`absolute pointer-events-none font-black text-2xl ${colorClass} ${animClass}`}
      style={{
        left: '50%',
        top: '30%',
        transform: 'translateX(-50%)',
        textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
        zIndex: 50,
      }}
    >
      {displayValue}
    </div>
  );
};

/** Impact burst effect */
export const ImpactBurst: React.FC<{
  effectImage: string;
  animClass?: string;
  onDone: () => void;
}> = ({ effectImage, animClass = 'anim-battle-impact-burst', onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, COMBAT_TIMINGS.impactBurstDuration);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 40 }}>
      <img
        src={effectImage}
        alt=""
        className={animClass}
        style={{ width: 96, height: 96, imageRendering: 'pixelated' }}
      />
    </div>
  );
};

/** Battle pet sprite with animation states and combat sheet playback */
export const BattlePetSprite: React.FC<{
  speciesId: string;
  animClass?: string;
  combatSheet?: CombatSheetConfig | null;
  flip?: boolean;
  children?: React.ReactNode;
}> = ({ speciesId, animClass = '', combatSheet = null, flip = false, children }) => {
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  // Hold the last sheet + final frame to prevent flash on transition back to portrait
  const lastSheetRef = useRef<CombatSheetConfig | null>(null);
  const [holdover, setHoldover] = useState<{ sheet: CombatSheetConfig; frame: number } | null>(null);

  // Play combat sheet when provided
  useEffect(() => {
    if (!combatSheet) {
      // If we were playing, hold the last frame briefly to prevent jitter
      if (lastSheetRef.current && playing) {
        const held = { sheet: lastSheetRef.current, frame: frameRef.current };
        setHoldover(held);
        const t = setTimeout(() => setHoldover(null), COMBAT_TIMINGS.combatSheetHoldover);
        setPlaying(false);
        setFrame(0);
        frameRef.current = 0;
        return () => clearTimeout(t);
      }
      setPlaying(false);
      setFrame(0);
      frameRef.current = 0;
      return;
    }

    lastSheetRef.current = combatSheet;
    setHoldover(null);
    setPlaying(true);
    frameRef.current = 0;
    setFrame(0);

    const interval = setInterval(() => {
      frameRef.current += 1;
      if (frameRef.current >= combatSheet.frameCount) {
        clearInterval(interval);
        setPlaying(false);
        return;
      }
      setFrame(frameRef.current);
    }, combatSheet.frameDuration);

    return () => clearInterval(interval);
  }, [combatSheet]); // eslint-disable-line react-hooks/exhaustive-deps -- playing is intentionally not a dep

  // Render combat sheet animation (active or holdover)
  const activeSheet = playing && combatSheet ? combatSheet : holdover?.sheet ?? null;
  const activeFrame = playing && combatSheet ? frame : holdover?.frame ?? 0;

  if (activeSheet) {
    const displaySize = 160;
    const scale = displaySize / activeSheet.frameWidth;
    const sheetWidth = activeSheet.frameCount * activeSheet.frameWidth;

    return (
      <div className={`relative ${animClass}`} style={{ transition: 'filter 0.1s' }}>
        <div
          style={{
            width: displaySize,
            height: displaySize,
            backgroundImage: `url(${activeSheet.url})`,
            backgroundPosition: `-${activeFrame * activeSheet.frameWidth * scale}px 0px`,
            backgroundSize: `${sheetWidth * scale}px ${activeSheet.frameHeight * scale}px`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            transform: flip ? 'scaleX(-1)' : undefined,
          }}
        />
        {children}
      </div>
    );
  }

  // Use standalone portrait if available, otherwise fall back to sprite sheet
  const portrait = ASSETS.petPortraits[speciesId];
  if (portrait) {
    return (
      <div className={`relative ${animClass}`} style={{ transition: 'filter 0.1s' }}>
        <img
          src={portrait}
          alt={speciesId}
          style={{
            width: 160,
            height: 160,
            imageRendering: 'pixelated',
            transform: flip ? 'scaleX(-1)' : undefined,
          }}
        />
        {children}
      </div>
    );
  }

  const petAsset = ASSETS.pets[speciesId];

  if (!petAsset) {
    console.warn(`Missing combat asset for ${speciesId}: no sprite sheet or portrait found`);
    return (
      <div className={`relative ${animClass}`} style={{ transition: 'filter 0.1s' }}>
        <div
          style={{
            width: 160,
            height: 160,
            background: 'repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%) 0 0 / 20px 20px',
            border: '2px dashed #f59e0b',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: flip ? 'scaleX(-1)' : undefined,
          }}
        >
          <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAlign: 'center', padding: 8 }}>
            {speciesId}
          </span>
        </div>
        {children}
      </div>
    );
  }

  const spriteStyle = computeSpriteStyle(petAsset, 0, 1.25);

  return (
    <div className={`relative ${animClass}`} style={{ transition: 'filter 0.1s' }}>
      <div
        style={{
          ...spriteStyle,
          transform: flip ? 'scaleX(-1)' : undefined,
        }}
      />
      {children}
    </div>
  );
};

/** Screen shake wrapper */
export const ScreenShake: React.FC<{
  active: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ active, className, children }) => {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- trigger shake animation from prop change
      setShaking(true);
      const t = setTimeout(() => setShaking(false), COMBAT_TIMINGS.screenShakeDuration);
      return () => clearTimeout(t);
    }
  }, [active]);

  return (
    <div className={`${className ?? ''} ${shaking ? 'anim-battle-shake' : ''}`.trim()}>
      {children}
    </div>
  );
};
