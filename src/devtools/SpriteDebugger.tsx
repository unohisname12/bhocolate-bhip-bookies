import React, { useEffect, useMemo, useState } from 'react';
import { ASSETS } from '../config/assetManifest';
import type { EngineState } from '../engine/core/EngineTypes';
import type { PetState } from '../types';

interface SpriteDebuggerProps {
  state: EngineState;
}

export const SpriteDebugger: React.FC<SpriteDebuggerProps> = ({ state }) => {
  const petType = state.pet?.speciesId ?? 'koala_sprite';
  const petState = (state.pet?.state ?? 'idle') as PetState;
  const petAsset = ASSETS.pets[petType] ?? ASSETS.pets.koala_sprite;

  const sprite = useMemo(() => {
    if (!('spriteSheet' in petAsset) || !petAsset.spriteSheet) return null;
    return petAsset;
  }, [petAsset]);

  const animation = sprite?.animations[petState] ?? sprite?.animations.idle;
  const minFrame = animation?.startFrame ?? 0;
  const maxFrame = animation?.endFrame ?? Math.max(0, (sprite?.frames ?? 1) - 1);

  // Track raw frame in state; clamp for display so no reset effect is needed
  const [rawFrame, setRawFrame] = useState(minFrame);
  const frame = Math.max(minFrame, Math.min(maxFrame, rawFrame));

  const [playing, setPlaying] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const duration = animation?.frameDuration ?? 180;
    const timer = window.setInterval(() => {
      setRawFrame((prev) => (prev >= maxFrame ? minFrame : prev + 1));
    }, duration);
    return () => window.clearInterval(timer);
  }, [playing, animation?.frameDuration, minFrame, maxFrame]);

  if (!sprite) {
    return <p className="text-xs text-slate-300">Current pet asset is not a sprite sheet.</p>;
  }

  const scale = 4;
  const col = frame % sprite.cols;
  const row = Math.floor(frame / sprite.cols);
  const width = sprite.frameWidth * scale;
  const height = sprite.frameHeight * scale;

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setPlaying((v) => !v)} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">
          {playing ? 'Pause' : 'Play'}
        </button>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />
          Pixel Grid
        </label>
      </div>

      <input
        type="range"
        min={minFrame}
        max={maxFrame}
        value={frame}
        onChange={(event) => setRawFrame(Number(event.target.value))}
        className="w-full"
      />

      <div className="relative overflow-hidden rounded border border-slate-600" style={{ width: `${width}px`, height: `${height}px` }}>
        <div
          style={{
            width: `${width}px`,
            height: `${height}px`,
            backgroundImage: `url(${sprite.url})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${sprite.cols * sprite.frameWidth * scale}px ${sprite.rows * sprite.frameHeight * scale}px`,
            backgroundPosition: `${-col * sprite.frameWidth * scale}px ${-row * sprite.frameHeight * scale}px`,
            imageRendering: 'pixelated',
          }}
        />
        {showGrid && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: `${scale}px ${scale}px`,
            }}
          />
        )}
      </div>

      <div className="rounded bg-slate-800 p-2 font-mono text-[11px]">
        <div>animation: {petState}</div>
        <div>frame: {frame}</div>
        <div>row/col: {row}/{col}</div>
        <div>bg-position: {`${-col * sprite.frameWidth * scale}px ${-row * sprite.frameHeight * scale}px`}</div>
      </div>
    </div>
  );
};
